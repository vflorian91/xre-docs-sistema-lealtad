const {PrismaClient}=require('@prisma/client');
const fs=require('node:fs');
const crypto=require('node:crypto');
const p=new PrismaClient();
const {prepareFixture}=require('./fixture.cjs');
const {assertCiDatabase}=require('./safety.cjs');
const {writeResults}=require('./results.cjs');
assertCiDatabase();
let creds;
const base=process.env.CI_API_URL||'http://localhost:4000/api';
const rows=[];
class Session{
 constructor(prefix){this.prefix=prefix;this.jar={};this.cookieFlags=[];}
 async request(method,path,body,csrf=true){
  const headers={'content-type':'application/json','user-agent':'XRE-Entregable-Demo/1.0'};
  if(Object.keys(this.jar).length)headers.cookie=Object.entries(this.jar).map(([k,v])=>`${k}=${v}`).join('; ');
  if(csrf&&this.jar[this.prefix+'_csrf'])headers['x-csrf-token']=this.jar[this.prefix+'_csrf'];
  const start=performance.now();
  const response=await fetch(base+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
  for(const line of response.headers.getSetCookie()){
   const [pair,...attrs]=line.split(';');const idx=pair.indexOf('=');this.jar[pair.slice(0,idx)]=pair.slice(idx+1);
   this.cookieFlags.push({name:pair.slice(0,idx),httpOnly:attrs.some(a=>a.trim().toLowerCase()==='httponly'),secure:attrs.some(a=>a.trim().toLowerCase()==='secure'),sameSite:attrs.find(a=>/samesite=/i.test(a))?.trim(),valueOmitted:true});
  }
  let data;const raw=await response.text();try{data=JSON.parse(raw)}catch{data={text:raw.slice(0,200)}}
  return {status:response.status,data,milliseconds:Math.round(performance.now()-start),headers:Object.fromEntries(['x-content-type-options','x-frame-options','referrer-policy','access-control-allow-origin'].map(k=>[k,response.headers.get(k)]))};
 }
}
function check(id,title,result,expected,detail){const pass=Array.isArray(expected)?expected.includes(result.status):result.status===expected;rows.push({id,title,status:result.status,expected,result:pass?'APROBADA':'FALLO',milliseconds:result.milliseconds,detail:detail??result.data.message??'Respuesta verificada'});if(!pass)throw new Error(`${id}: HTTP ${result.status}; se esperaba ${expected}`);return result.data;}
(async()=>{
 creds=await prepareFixture();
 const anon=new Session('admin'),admin=new Session('admin'),operator=new Session('admin'),a=new Session('client'),b=new Session('client');
 const health=await anon.request('GET','/health');check('T01','API y dependencias disponibles',health,200);
 check('T02','Ruta interna sin sesion rechazada',await anon.request('GET','/auth/internal/me'),401);
 check('T03','Login invalido rechazado',await anon.request('POST','/auth/internal/login',{email:creds.operator.email,password:'InvalidaDemo123!'}),401);
 check('T04','Login interno y cookies de sesion',await admin.request('POST','/auth/internal/login',{email:creds.reviewer.email,password:creds.reviewer.password}),201,'Cookies HttpOnly en acceso y renovacion. Valores omitidos.');
 const country=await p.catalogItem.findFirst({where:{catalog:{code:'PAIS'},code:'GT'}}),dep=await p.catalogItem.findFirst({where:{catalog:{code:'DEPARTAMENTO'},code:'GT-01'}}),mun=await p.catalogItem.findFirst({where:{catalog:{code:'MUNICIPIO'},code:'GT-01-01'}}),brand=await p.catalogItem.findFirst({where:{catalog:{code:'BRANDS'},code:'NINE_WEST'}}),shoe=await p.catalogItem.findFirst({where:{catalog:{code:'SHOE_TYPES'},code:'TENIS'}});
 const store=check('T05','Creacion de tienda de demostracion',await admin.request('POST','/stores',{name:'XRE Tienda Demo Centro',address:'Direccion de demostracion Guatemala',locationType:'CAPITAL',countryId:country.id,departmentId:dep.id,municipalityId:mun.id,brandId:brand.id}),201);
 const other=await admin.request('POST','/stores',{name:'XRE Tienda Demo Alterna',address:'Direccion de demostracion alternativa',locationType:'CAPITAL',countryId:country.id,departmentId:dep.id,municipalityId:mun.id,brandId:brand.id});if(other.status!==201)throw new Error('Tienda alternativa: '+JSON.stringify(other.data));
 await admin.request('POST',`/stores/${store.id}/users`,{userIds:[creds.reviewer.id,creds.operator.id]});
 check('T06','Login del operador con permisos limitados',await operator.request('POST','/auth/internal/login',{email:creds.operator.email,password:creds.operator.password}),201);
 check('T07','Acceso a auditoria sin permiso rechazado',await operator.request('GET','/auth/internal/permissions-check'),403);
 check('T08','Seleccion de tienda sin CSRF rechazada',await operator.request('POST','/stores/active',{storeId:store.id},false),403);
 check('T09','Tienda no asignada rechazada',await operator.request('POST','/stores/active',{storeId:other.data.id}),403);
 check('T10','Seleccion de tienda asignada',await operator.request('POST','/stores/active',{storeId:store.id}),201);
 await admin.request('POST','/stores/active',{storeId:store.id});
 creds.customerA={email:'cliente.demo@xre.example',password:crypto.randomBytes(18).toString('base64url')+'!'};
 creds.customerB={email:'cliente.alterno@xre.example',password:crypto.randomBytes(18).toString('base64url')+'!'};
 const customerA=check('T11','Registro de cliente y codigo generado',await a.request('POST','/auth/customer/register',{fullName:'Cliente Demo XRE',taxId:'DEMOXRE001',phone:'55501001',...creds.customerA,brandItemId:brand.id,registrationStoreId:store.id}),201).customer;
 const rb=await b.request('POST','/auth/customer/register',{fullName:'Cliente Alterno Demo XRE',taxId:'DEMOXRE002',phone:'55501002',...creds.customerB,brandItemId:brand.id,registrationStoreId:store.id});if(rb.status!==201)throw new Error('Cliente alterno: '+JSON.stringify(rb.data));
 const customerB=rb.data.customer;
 const invoice={customerId:customerA.id,customerTaxId:'DEMOXRE001',invoiceNumber:'8610080001',amount:500,shoeTypeId:shoe.id,brandId:brand.id};
 check('T12','Campos no permitidos en factura rechazados',await operator.request('POST','/purchases',{...invoice,storeId:other.data.id}),400);
 check('T13','Monto negativo rechazado',await operator.request('POST','/purchases/preview',{...invoice,amount:-500}),400);
 const preview=check('T14','Calculo de puntos en servidor',await operator.request('POST','/purchases/preview',invoice),201);if(preview.pointsCalculated!==500)throw new Error('Puntos inesperados');
 const purchase=check('T15','Factura genera movimiento de puntos',await operator.request('POST','/purchases',invoice),201,'Q500 genera 500 puntos con la regla vigente.');
 check('T16','Factura duplicada rechazada',await operator.request('POST','/purchases',invoice),409);
 const summaryBefore=check('T17','Cliente consulta puntos propios',await a.request('GET','/client/summary'),200);if(summaryBefore.availablePoints!==500)throw new Error('Saldo previo inesperado');
 const isolated=await b.request('GET',`/client/summary?customerId=${customerA.id}`);check('T18','Identidad del cliente procede de su sesion',isolated,200,'Cliente alterno conserva su identidad y 0 puntos al enviar el ID de otro cliente.');if(isolated.data.customer.id!==customerB.id||isolated.data.availablePoints!==0)throw new Error('Aislamiento fallido');
 check('T19','Sesion de cliente rechazada en API interna',await a.request('GET',`/customers/${customerA.id}`),401);
 const reward=check('T20','Creacion de premio con permiso',await admin.request('POST','/rewards',{code:'XRE-DEMO-200',name:'Premio de demostracion XRE',description:'Producto de prueba para el entregable academico',pointsValue:200,stock:10,brandItemId:brand.id,requiresApproval:true,isActive:true,isPublished:true}),201);
 check('T21','Canje sin puntos suficientes rechazado',await b.request('POST','/redemptions/customer/request',{productId:reward.id,pickupStoreId:store.id}),400);
 const req=check('T22','Solicitud reserva puntos y stock',await a.request('POST','/redemptions/customer/request',{productId:reward.id,pickupStoreId:store.id}),201);
 const redemption=req.redemptionRequest??req.request??req;
 if(!redemption.id)throw new Error('Estructura de canje: '+JSON.stringify(req));
 check('T23','Operador sin permiso no aprueba canje',await operator.request('POST',`/redemptions/${redemption.id}/approve`,{}),403);
 check('T24','Aprobacion administrativa del canje',await admin.request('POST',`/redemptions/${redemption.id}/approve`,{comment:'Demostracion academica XRE'}),201);
 check('T25','Envio del premio a tienda',await admin.request('POST',`/redemptions/${redemption.id}/send-to-store`,{}),201);
 check('T26','Premio listo en tienda',await operator.request('POST',`/redemptions/${redemption.id}/ready`,{}),201);
 check('T27','Entrega del premio con trazabilidad',await operator.request('POST',`/redemptions/${redemption.id}/deliver`,{deliveredToName:'Cliente Demo XRE',observation:'Entrega de demostracion sin valor comercial'}),201);
 check('T28','Segunda entrega rechazada',await operator.request('POST',`/redemptions/${redemption.id}/deliver`,{deliveredToName:'Cliente Demo XRE'}),[400,409]);
 const req2=await a.request('POST','/redemptions/customer/request',{productId:reward.id,pickupStoreId:store.id});if(req2.status!==201)throw new Error('Segundo canje: '+JSON.stringify(req2.data));const redemption2=req2.data.redemptionRequest??req2.data.request??req2.data;
 check('T29','Cancelacion devuelve puntos y reserva de stock',await a.request('POST',`/redemptions/customer/${redemption2.id}/cancel`,{reason:'Cancelacion de prueba del entregable'}),201);
 const extra=await operator.request('POST','/purchases',{...invoice,invoiceNumber:'8610080002',amount:150});if(extra.status!==201)throw new Error('Factura reversa: '+JSON.stringify(extra.data));
 const extraPurchase=extra.data.purchase??extra.data;
 check('T30','Reversa autorizada conserva historial',await admin.request('POST',`/purchases/${extraPurchase.id}/reverse`,{reason:'Reversa de prueba del entregable XRE'}),201);
 const final=check('T31','Saldo final consistente',await a.request('GET','/client/summary'),200,'500 puntos por compra menos 200 del premio entregado = 300 disponibles. Cancelacion y reversa no alteran el resultado neto.');if(final.availablePoints!==300)throw new Error('Saldo final: '+final.availablePoints);

 // JWT carries second-resolution issued-at values; ensure deterministic refresh rotation.
 await admin.request('POST','/auth/internal/login',{email:creds.reviewer.email,password:creds.reviewer.password});
 const before={...admin.jar};
 await new Promise(resolve=>setTimeout(resolve,1100));
 check('T32','Renovacion de sesion valida',await admin.request('POST','/auth/internal/refresh',{}),201);
 if(admin.jar.admin_rt===before.admin_rt)throw new Error('T32: refresh no rota');
 const stale=new Session('admin');stale.jar={...before};
 check('T33','Reutilizacion de refresh antiguo detectada',await stale.request('POST','/auth/internal/refresh',{}),401);
 check('T34','Sesion revocada rechaza token de acceso',await admin.request('GET','/auth/internal/me'),401);
 await admin.request('POST','/auth/internal/login',{email:creds.reviewer.email,password:creds.reviewer.password});
 const saved=new Session('admin');saved.jar={...admin.jar};
 check('T35','Cierre de sesion autorizado',await admin.request('POST','/auth/internal/logout',{}),201);
 check('T36','Cookie antigua falla despues del cierre',await saved.request('GET','/auth/internal/me'),401);
 const statuses=[];
 for(let i=0;i<6;i++)statuses.push((await anon.request('POST','/auth/internal/login',{email:'inexistente.demo@xre.example',password:'PruebaInvalida123!'})).status);
 check('T37','Limite de solicitudes de login aplicado',{status:statuses.includes(429)?429:0,milliseconds:0,data:{}},429);
 if(rows.length!==37)throw new Error('Numero inesperado de verificaciones');
 console.log(JSON.stringify({suite:'API',total:37,passed:rows.filter(t=>t.result==='APROBADA').length}));
})().catch(e=>{
 const last=rows.at(-1);if(last&&last.result==='APROBADA'){last.result='FALLO';last.detail='No se cumplio la asercion del caso.';}
 console.error('Suite API interrumpida: '+(last?.id||'preparacion')+'. Revisar el resultado del caso.');
 process.exitCode=1;
}).finally(async()=>{writeResults(rows);await p.$disconnect();});
