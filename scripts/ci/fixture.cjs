const {PrismaClient}=require('@prisma/client');
const argon2=require('argon2');
const crypto=require('node:crypto');
const { assertCiDatabase }=require('./safety.cjs');
assertCiDatabase();
const p=new PrismaClient();
async function prepareFixture(){
  const credentials={};
  for (const [code,name,parent] of [['GT','Guatemala',null],['GT-01','Guatemala','GT'],['GT-01-01','Guatemala','GT-01']]) {
    const catalogCode=parent===null?'PAIS':parent==='GT'?'DEPARTAMENTO':'MUNICIPIO';
    const catalog=await p.catalog.findUniqueOrThrow({where:{code:catalogCode}});
    const parentItem=parent?await p.catalogItem.findFirst({where:{code:parent}}):null;
    await p.catalogItem.upsert({where:{catalogId_code:{catalogId:catalog.id,code}},update:{isActive:true},create:{catalogId:catalog.id,code,name,parentItemId:parentItem?.id??null,isActive:true}});
  }
  const roles=await p.role.findMany();
  const definitions=[
    ['operator','operador.demo@xre.example','Operador Demo XRE','Vendedora',['purchases.create','purchases.read','customers.read','customers.view_profile','redemption_requests.read','redemption_requests.mark_ready','redemption_requests.mark_delivered']],
    ['reviewer','revision.demo@xre.example','Revisor Demo XRE','Admin',['purchases.create','purchases.read','purchases.review','purchases.reverse','customers.read','customers.create','customers.view_profile','stores.read','stores.create','stores.assign_users','redeemable_products.read','redeemable_products.create','redemption_requests.read','redemption_requests.approve','redemption_requests.mark_sent_to_store','redemption_requests.mark_ready','redemption_requests.mark_delivered','redemption_requests.cancel','audit.read','reports.read']]
  ];
  for(const [key,email,fullName,roleName,codes] of definitions){
    let u=await p.internalUser.findUnique({where:{email}});
    if(u)throw new Error('Los usuarios demo ya existen. No se sobrescriben credenciales.');
    const password=crypto.randomBytes(18).toString('base64url')+'!';
    u=await p.internalUser.create({data:{email,fullName,passwordHash:await argon2.hash(password),mustChangePassword:false}});
    const role=roles.find(r=>r.name===roleName);
    if(role)await p.internalUserRole.create({data:{userId:u.id,roleId:role.id}});
    for(const code of codes){const [module,action]=code.split('.');await p.permission.upsert({where:{code},update:{},create:{code,module,action}});}
    const permissions=await p.permission.findMany({where:{code:{in:codes}}});
    if(permissions.length!==codes.length)throw new Error('Permiso de demostracion ausente.');
    await p.internalUserPermission.createMany({data:permissions.map(q=>({userId:u.id,permissionId:q.id}))});
    credentials[key]={id:u.id,email,password};
    await p.auditLog.create({data:{actorType:'INTERNAL_USER',actorInternalUserId:u.id,action:'entregable.demo_fixture_created',module:'entregable',entityType:'InternalUser',entityId:u.id,metadata:{demonstration:true,permissionCodes:codes}}});
  }
  await p.$disconnect();
  return credentials;

}
module.exports={prepareFixture};
