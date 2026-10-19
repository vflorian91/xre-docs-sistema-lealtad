// Additive demo activity, isolated by prefix. Re-running verifies instead of duplicating.
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const assert = require('node:assert/strict');
if (process.env.XDOC_LOAD_DEMO !== 'true') throw new Error('Carga opcional: define XDOC_LOAD_DEMO=true.');
const db = new PrismaClient();
const outputDir = require('node:path').resolve(process.cwd(), 'tmp/xdoc-demo');
fs.mkdirSync(outputDir, {recursive:true});
const prefix = 'XDOC-DASH-202610';
const note = 'Registro de actividad.';
const id = (kind, n) => `${prefix}-${kind}-${String(n).padStart(3, '0')}`;
const date = (month, day, hour = 15) => new Date(Date.UTC(2026, month - 1, day, hour));
const later = (d, hours) => new Date(d.getTime() + hours * 3600000);
const cents = n => Math.round(Number(n) * 100);
const money = n => (n / 100).toFixed(2);
const methods = ['EFECTIVO_CONTRA_ENTREGA', 'TRANSFERENCIA_BANCARIA', 'VISA_LINK_MANUAL', 'DEPOSITO_BANCARIO'];

async function validate(tx) {
  const orders = await tx.storeOrder.findMany({ where: { orderNumber: { startsWith: prefix } }, include: { items: true, payments: true, timeline: true } });
  assert.equal(orders.length, 108);
  for (const o of orders) {
    assert.equal(o.items.reduce((s, i) => s + cents(i.subtotal), 0), cents(o.subtotalAmount));
    assert.equal(cents(o.subtotalAmount) + cents(o.shippingAmount), cents(o.totalAmount));
    assert.equal(o.payments.length, 1);
    assert.equal(cents(o.payments[0].amount), cents(o.totalAmount));
    assert.equal(o.payments[0].paymentStatus, o.clientPaymentStatus);
    assert.equal(Boolean(o.payments[0].paidAt), o.clientPaymentStatus === 'PAGO_CONFIRMADO');
    assert(o.createdAt <= new Date());
    for (const e of o.timeline) assert(e.createdAt <= new Date());
    assert.equal(o.loyaltyPointsAwarded, o.orderStatus === 'ENTREGADO');
  }
  const customers = await tx.customer.findMany({ where: { code: { startsWith: prefix } }, include: { purchases: true, pointMovements: true } });
  assert.equal(customers.length, 12);
  for (const c of customers) {
    assert.equal(c.purchasesCount, c.purchases.filter(p => p.status === 'APPROVED').length);
    const moves = [...c.pointMovements].sort((a,b) => a.createdAt - b.createdAt);
    let balance = 0;
    for (const m of moves) { balance += m.points; assert(balance >= 0, `Negative historical balance: ${c.code}`); }
    assert(c.createdAt <= (c.purchases[0]?.purchasedAt || new Date()));
  }
  const products = await tx.storeProduct.findMany({ where: { sku: { startsWith: 'XDOC-DEMO-' } }, include: { variants: true } });
  for (const p of products) {
    assert(p.stockQuantity >= 0);
    assert.equal(p.stockQuantity, p.variants.reduce((s,v) => s + v.stockQuantity, 0));
    for (const v of p.variants) assert(v.stockQuantity >= 0);
  }
  assert.equal(await tx.purchase.count({ where: { externalSource: prefix } }), 48);
  assert.equal(await tx.redemptionRequest.count({ where: { requestCode: { startsWith: prefix } } }), 14);
  const result = {};
  for (const month of [9,10]) {
    const from = date(month,1,0), to = date(month+1,1,0);
    const selected = orders.filter(o => o.createdAt >= from && o.createdAt < to);
    const paid = selected.filter(o => o.clientPaymentStatus === 'PAGO_CONFIRMADO');
    const purchases = await tx.purchase.aggregate({ where: { externalSource: prefix, purchasedAt: { gte: from, lt: to } }, _count: true, _sum: { amount: true, pointsCalculated: true } });
    result[`2026-${month}`] = { orders: selected.length, confirmedSales: money(paid.reduce((s,o) => s+cents(o.totalAmount),0)), delivered: selected.filter(o => o.orderStatus === 'ENTREGADO').length, pendingPayments: selected.filter(o => o.clientPaymentStatus === 'PENDIENTE_PAGO').length, purchases: purchases._count, purchaseAmount: String(purchases._sum.amount), purchasePoints: purchases._sum.pointsCalculated };
  }
  return { prefix, customers: customers.length, orders: orders.length, purchases: 48, redemptions: 14, monthly: result };
}

async function main() {
  if (await db.storeOrder.count({ where: { orderNumber: { startsWith: prefix } } })) {
    console.log(JSON.stringify({ alreadyLoaded: true, ...await validate(db) }, null, 2));
    return;
  }
  const [admin, stores, products, rule, levels] = await Promise.all([
    db.internalUser.findFirstOrThrow({ where: process.env.SEED_SUPER_ADMIN_EMAIL ? { email: process.env.SEED_SUPER_ADMIN_EMAIL } : { status: 'ACTIVE' }, orderBy: {createdAt:'asc'} }),
    (async () => { const rows = await db.store.findMany({ where: {status:'ACTIVE'}, orderBy:{code:'asc'} }); if (rows.length) return rows; return Promise.all(['Centro','Alterna'].map((name,index) => db.store.create({data:{code:`XDOC-DEMO-STORE-${index+1}`,name:`Zapateria XDOC ${name}`,address:'Guatemala',status:'ACTIVE'}}))); })(),
    db.storeProduct.findMany({ where: { sku: { startsWith: 'XDOC-DEMO-' }, isActive: true }, include: { brand: true, variants: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } } }, orderBy: { sku: 'asc' } }),
    db.pointRule.findFirstOrThrow({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }),
    db.loyaltyLevelRule.findFirstOrThrow({ where: { isActive: true, brandItemId: null }, include: { tiers: { where: { isActive: true }, orderBy: { minPurchases: 'desc' } } } }),
  ]);
  assert(products.length >= 50 && stores.length >= 1);
  const before = { capturedAt: new Date(), products: products.map(p => ({ id: p.id, stock: p.stockQuantity, variants: p.variants.map(v => ({ id: v.id, stock: v.stockQuantity })) })), existingCustomers: await db.customer.findMany({ select: { id: true, code: true, purchasesCount: true, loyaltyLevel: true } }), existingOrders: await db.storeOrder.count() };
  fs.writeFileSync(require('node:path').join(outputDir,'dashboard-before.json'), JSON.stringify(before, null, 2));
  const pointsFor = amount => Number(amount) < Number(rule.minimumAmount) ? 0 : Math.max(0, Math.min(Math.floor(Number(amount)/Number(rule.amountPerPoint)), rule.maxPointsPerPurchase || Infinity));
  const pointSnapshot = { id: rule.id, name: rule.name, amountPerPoint: String(rule.amountPerPoint), demo: true };
  const result = await db.$transaction(async tx => {
    const names = ['Ana Morales','Carlos Méndez','Sofía Castillo','Diego Herrera','Valeria Pérez','Luis García','Mariana López','Andrés Ramírez','Camila Flores','Pablo Díaz','Isabella Gómez','Daniel Rivera'];
    const customers = [];
    for (let n=0; n<12; n++) customers.push(await tx.customer.create({ data: {
      id: id('CLIENT',n+1), code: id('C',n+1), fullName: `${names[n]}`, phone: `540100${String(n+1).padStart(2,'0')}`, email: `xdoc.dashboard.${n+1}@example.com`, registrationSource: 'DASHBOARD_DEMO', registrationStoreId: stores[n%stores.length].id, createdByInternalUserId: admin.id, address: `${n+1} avenida 10-20, zona ${n%12+1}`, city: 'Guatemala', department: 'Guatemala', country: 'Guatemala', createdAt: date(n<8 ? 9:10,1,12), updatedAt: date(n<8 ? 9:10,1,12),
    } }));
    const drivers = [];
    for (let n=0; n<3; n++) drivers.push(await tx.storeDriver.create({ data: { id: id('DRIVER',n+1), fullName: `${['Miguel Santos','Andrea Ríos','José Aguilar'][n]}`, phone: `5502000${n+1}`, email: `xdoc.driver.${n+1}@example.com`, code: id('M',n+1), notes: note, createdAt: date(9,1,12), updatedAt: date(9,1,12) } }));

    const purchaseCounts = [12,8,7,5,4,3,2,2,2,1,1,1];
    const septemberCounts = [7,4,4,3,2,2,1,1,0,0,0,0];
    let purchaseIndex = 0;
    for (let n=0; n<12; n++) {
      for (let k=0; k<purchaseCounts[n]; k++) {
        purchaseIndex++;
        const month = k<septemberCounts[n] ? 9:10;
        const day = month===9 ? 2 + (k*3+n)%22 : 2+(k*2+n)%15;
        const when = date(month,day,16);
        const amount = 299 + ((purchaseIndex*137)%950) + .99;
        const points = pointsFor(amount);
        const purchase = await tx.purchase.create({ data: { id: id('PURCHASE',purchaseIndex), customerId: customers[n].id, storeId: stores[n%stores.length].id, internalUserId: admin.id, invoiceNumber: id('FACT',purchaseIndex), externalSource: prefix, externalInvoiceId: String(purchaseIndex), externalPayload: { demo: true, purpose: note }, amount: amount.toFixed(2), pointsCalculated: points, status: 'APPROVED', purchasedAt: when, createdAt: when, updatedAt: when } });
        await tx.pointMovement.create({ data: { customerId: customers[n].id, purchaseId: purchase.id, pointRuleId: rule.id, type: 'PURCHASE_EARNED', status: 'AVAILABLE', points, basePointsCalculated: points, pointsBeforePromotion: points, pointRuleSnapshot: pointSnapshot, description: `${note} Factura ${purchase.invoiceNumber}`, createdAt: when, expiresAt: rule.pointsExpirationDays ? later(when,rule.pointsExpirationDays*24) : null } });
      }
      const tier = levels.tiers.find(t => purchaseCounts[n] >= t.minPurchases && (t.maxPurchases==null || purchaseCounts[n]<=t.maxPurchases));
      assert(tier);
      await tx.customer.update({ where: { id: customers[n].id }, data: { purchasesCount: purchaseCounts[n], loyaltyLevel: tier.name } });
    }

    const slots = [];
    for (const month of [9,10]) {
      const current=[];
      for (let day=1; day<=(month===9?30:18); day++) for (let k=0;k<2;k++) current.push(date(month,day,14+k*2));
      if (month===10) for (let day=13;day<=18;day++) for (let k=0;k<2;k++) current.push(date(month,day,18+k));
      current.sort((a,b)=>a-b);
      current.forEach((when,n)=>slots.push({when,month,n}));
    }
    const settledCash=[];
    for (let index=0;index<slots.length;index++) {
      const {when,month,n} = slots[index];
      let state = month===9 ? (n%10===9?'CANCELADO':'ENTREGADO') : n<30?'ENTREGADO':n<32?'CANCELADO':n<36?'PEDIDO_SOLICITADO':n<39?'PREPARANDO_PEDIDO':n<42?'ASIGNADO_MOTORISTA':n<45?'EN_RUTA':n<47?'REPROGRAMADO':'NO_ENTREGADO';
      const delivered=state==='ENTREGADO', cancelled=state==='CANCELADO', requested=state==='PEDIDO_SOLICITADO';
      const method=methods[index%4];
      const paymentStatus=cancelled?'ANULADO':requested?(method==='VISA_LINK_MANUAL'?'PENDIENTE_LINK':'PENDIENTE_PAGO'):(method==='EFECTIVO_CONTRA_ENTREGA'&&!delivered?'PENDIENTE_PAGO':'PAGO_CONFIRMADO');
      const paid=paymentStatus==='PAGO_CONFIRMADO';
      const deliveryStatus=({ENTREGADO:'ENTREGADA',CANCELADO:'CANCELADA',PEDIDO_SOLICITADO:'PENDIENTE_PROGRAMACION',PREPARANDO_PEDIDO:'PREPARANDO_PEDIDO',ASIGNADO_MOTORISTA:'ASIGNADA',EN_RUTA:'EN_RUTA',REPROGRAMADO:'REPROGRAMADA',NO_ENTREGADO:'NO_ENTREGADA'})[state];
      const customer=customers[index%(month===9?8:12)], driver=!requested&&!cancelled&&state!=='PREPARANDO_PEDIDO'?drivers[index%3]:null;
      const items=[];
      for (let k=0;k<(index%3===0?2:1);k++) {
        const p=products[(index*3+k*7)%products.length];
        const v=p.variants[(Math.floor(index/products.length)+k)%p.variants.length];
        const unit=cents(v.promotionalPrice??v.price), quantity=index%7===0&&k===0?2:1;
        items.push({p,v,unit,quantity});
      }
      const subtotal=items.reduce((s,i)=>s+i.unit*i.quantity,0), shipping=index%5===0?0:2500, total=subtotal+shipping;
      const orderId=id('ORDER',index+1), orderNumber=id('PED',index+1), end=later(when,4);
      const eligible=items.filter(i=>i.p.generatesLoyaltyPoints).reduce((s,i)=>s+i.unit*i.quantity,0);
      const earned=delivered?pointsFor(money(eligible)):null;
      await tx.storeOrder.create({ data: { id: orderId, orderNumber, customerId: customer.id, subtotalAmount: money(subtotal), shippingAmount: money(shipping), totalAmount: money(total), paymentMethodRequested: method, clientPaymentStatus: paymentStatus, orderStatus: state, deliveryStatus, suggestedDeliveryDate: end, confirmedDeliveryDate: requested||cancelled?null:end, deliveryTimeRange: '14:00 - 18:00', deliveryAddress: customer.address, deliveryPhone: customer.phone, deliveryReference: note, receiverName: customer.fullName, assignedDriverId: driver?.id, cancelledAt: cancelled?end:null, cancelReason: cancelled?'Cliente desistió antes de confirmar el pedido.':null, loyaltyPointsAwarded: delivered, loyaltyPointsAwardedValue: earned, createdAt: when, updatedAt: end } });
      for (const {p,v,unit,quantity} of items) {
        const picked=driver&&['ENTREGADO','EN_RUTA','REPROGRAMADO','NO_ENTREGADO'].includes(state);
        await tx.storeOrderItem.create({ data: { orderId, productId: p.id, variantId: v.id, brandId: p.brandId, productNameSnapshot: p.name, variantLabelSnapshot: v.optionLabel, variantOptionsSnapshot: v.optionValues, skuSnapshot: v.sku, brandNameSnapshot: p.brand.name, productImageSnapshot: v.imageUrl||p.mainImageUrl, unitPrice: money(unit), quantity, subtotal: money(unit*quantity), originStoreId: requested?null:stores[index%stores.length].id, originStoreSnapshot: { demo: true, name: stores[index%stores.length].name }, pickupStatus: picked?'RECOLECTADO':requested?'PENDIENTE_ASIGNAR_TIENDA':'TIENDA_ASIGNADA', pickedUpAt: picked?later(when,2):null, pickedUpByDriverId: picked?driver.id:null, pickupNote: note, createdAt: when, updatedAt: end } });
        if (!requested&&!cancelled) {
          assert(v.stockQuantity>=quantity, `Stock insuficiente ${v.sku}`);
          await tx.storeProductStockMovement.create({ data: { productId:p.id,variantId:v.id,movementType:'ORDER_CONFIRMED',quantity:-quantity,previousStock:v.stockQuantity,newStock:v.stockQuantity-quantity,referenceType:'STORE_ORDER',referenceId:orderId,comment:note,createdByInternalUserId:admin.id,createdAt:later(when,1) } });
          v.stockQuantity-=quantity;p.stockQuantity-=quantity;
          await tx.storeProductVariant.update({where:{id:v.id},data:{stockQuantity:v.stockQuantity}});
          await tx.storeProduct.update({where:{id:p.id},data:{stockQuantity:p.stockQuantity}});
        }
      }
      const payment=await tx.storeOrderPayment.create({ data: { orderId, paymentMethod:method,paymentStatus,amount:money(total),currency:'GTQ',referenceNumber:paid?id('REF',index+1):null,authorizationCode:paid&&method==='VISA_LINK_MANUAL'?id('AUTH',index+1):null,paidAt:paid?(method==='EFECTIVO_CONTRA_ENTREGA'?end:later(when,1)):null,confirmedByInternalUserId:paid?admin.id:null,receivedByDriverId:paid&&method==='EFECTIVO_CONTRA_ENTREGA'?driver?.id:null,notes:note,settlementStatus:paid&&method==='EFECTIVO_CONTRA_ENTREGA'?'PENDIENTE_LIQUIDAR':'NO_APLICA',createdAt:when,updatedAt:end } });
      if (paid&&method==='EFECTIVO_CONTRA_ENTREGA'&&month===9) settledCash.push(payment);
      if (driver) await tx.storeDeliveryAssignmentHistory.create({data:{orderId,newDriverId:driver.id,reasonCode:'ASIGNACION_INICIAL',comment:note,createdByInternalUserId:admin.id,createdAt:later(when,1)}});
      const timeline=[{statusType:'ORDER_STATUS',newStatus:'PEDIDO_SOLICITADO',createdAt:when}];
      if (!requested&&!cancelled) timeline.push({statusType:'ORDER_STATUS',previousStatus:'PEDIDO_SOLICITADO',newStatus:'CONFIRMADO_ADMIN',createdAt:later(when,1)});
      if (!requested) timeline.push({statusType:'ORDER_STATUS',previousStatus:cancelled?'PEDIDO_SOLICITADO':'CONFIRMADO_ADMIN',newStatus:state,createdAt:end});
      timeline.push({statusType:'DELIVERY_STATUS',newStatus:deliveryStatus,createdAt:end},{statusType:'PAYMENT_STATUS',newStatus:paymentStatus,createdAt:paid?payment.paidAt:end});
      await tx.storeOrderTimeline.createMany({data:timeline.map(t=>({...t,orderId,comment:note,createdByRole:'SYSTEM'}))});
      if (delivered&&earned>0) await tx.pointMovement.create({data:{customerId:customer.id,pointRuleId:rule.id,type:'PURCHASE_EARNED',status:'AVAILABLE',points:earned,basePointsCalculated:earned,pointsBeforePromotion:earned,pointRuleSnapshot:{...pointSnapshot,source:'store_order',orderId,orderNumber,eligibleAmount:money(eligible)},description:`Puntos por compra en línea ${orderNumber}`,createdAt:end,expiresAt:rule.pointsExpirationDays?later(end,rule.pointsExpirationDays*24):null}});
    }
    if (settledCash.length) {
      const settlement=await tx.storePaymentSettlement.create({data:{settlementNumber:id('LIQ',1),settlementDate:date(9,30,22),paymentMethod:'EFECTIVO_CONTRA_ENTREGA',totalPayments:settledCash.length,totalAmount:money(settledCash.reduce((s,p)=>s+cents(p.amount),0)),reference:id('CAJA',1),comment:note,createdByInternalUserId:admin.id,createdAt:date(9,30,22),updatedAt:date(9,30,22)}});
      for (const p of settledCash) {
        await tx.storePaymentSettlementItem.create({data:{settlementId:settlement.id,paymentId:p.id,orderId:p.orderId,amount:p.amount,paymentMethod:p.paymentMethod,referenceNumber:p.referenceNumber,paidAt:p.paidAt,createdAt:settlement.createdAt}});
        await tx.storeOrderPayment.update({where:{id:p.id},data:{settlementId:settlement.id,settlementStatus:'LIQUIDADO',settledAt:settlement.settlementDate,settledByInternalUserId:admin.id}});
      }
    }
    const reward=await tx.redeemableProduct.create({data:{id:id('REWARD',1),code:id('PREMIO',1),name:'Kit de cuidado para calzado XDOC',description:note,pointsValue:200,stock:18,reservedStock:2,requiresApproval:true,isPublished:false,createdByInternalUserId:admin.id,createdAt:date(9,1,12),updatedAt:date(10,18,18)}});
    for (let n=0;n<14;n++) {
      const pending=n>=12, customer=customers[n%6],when=pending?date(10,18,18):n<6?date(9,25+n,15):date(10,10+n-6,15);
      const movement=await tx.pointMovement.create({data:{customerId:customer.id,type:pending?'REDEMPTION_RESERVED':'REDEMPTION_USED',status:'AVAILABLE',points:-200,description:`Canje ${id('CANJE',n+1)}: ${reward.name}`,createdAt:when}});
      await tx.redemptionRequest.create({data:{requestCode:id('CANJE',n+1),customerId:customer.id,productId:reward.id,productNameSnapshot:reward.name,productDescriptionSnapshot:note,productPointsSnapshot:200,pickupStoreId:stores[n%stores.length].id,pointMovementId:movement.id,status:pending?'PENDING_APPROVAL':'DELIVERED',pointsReserved:200,requestedAt:when,approvedAt:pending?null:later(when,1),sentToStoreAt:pending?null:later(when,2),readyAt:pending?null:later(when,3),deliveredAt:pending?null:later(when,4),approvedByInternalUserId:pending?null:admin.id,sentToStoreByInternalUserId:pending?null:admin.id,preparedByInternalUserId:pending?null:admin.id,deliveredByInternalUserId:pending?null:admin.id,deliveryObservation:pending?null:note,deliveredToName:pending?null:customer.fullName,createdAt:when,updatedAt:pending?when:later(when,4)}});
    }
    for (const old of before.existingCustomers) assert.deepEqual(await tx.customer.findUnique({where:{id:old.id},select:{id:true,code:true,purchasesCount:true,loyaltyLevel:true}}),old);
    const summary=await validate(tx);
    await tx.auditLog.create({data:{actorType:'INTERNAL_USER',actorInternalUserId:admin.id,action:'dashboard.demo_seed',module:'dashboard',entityType:'DashboardDemoBatch',entityId:prefix,metadata:{...summary,note}}});
    return summary;
  },{timeout:120000,isolationLevel:'Serializable'});
  fs.writeFileSync(require('node:path').join(outputDir,'dashboard-result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
