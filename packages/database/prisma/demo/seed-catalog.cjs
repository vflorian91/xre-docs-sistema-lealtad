// Optional fictional catalogue. Existing products and stock are preserved on re-runs.
const {PrismaClient}=require('@prisma/client');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
if(process.env.XDOC_LOAD_DEMO!=='true')throw new Error('Carga opcional: define XDOC_LOAD_DEMO=true.');
const db=new PrismaClient();const fixture=require('./catalog.json');
async function main(){
 const mediaRoot=path.resolve(process.env.MEDIA_STORAGE_DIR||'/var/lealtad/media');
 for(const asset of fixture.assets){
  const source=path.resolve(__dirname,'media',asset.storageKey),target=path.resolve(mediaRoot,asset.storageKey);
  assert(source.startsWith(path.resolve(__dirname,'media')+path.sep));assert(target.startsWith(mediaRoot+path.sep));
  assert.equal(fs.statSync(source).size,asset.sizeBytes);
  if(fs.existsSync(target))assert(fs.readFileSync(source).equals(fs.readFileSync(target)),`Asset conflict: ${asset.id}`);
  else {fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}
 }
 const result=await db.$transaction(async tx=>{
  let created=0;const brandIds=new Map();
  for(const asset of fixture.assets)await tx.mediaAsset.upsert({where:{id:asset.id},update:{},create:asset});
  for(const brand of fixture.brands){const saved=await tx.storeBrand.upsert({where:{code:brand.code},update:{},create:brand});brandIds.set(brand.id,saved.id);}
  for(const product of fixture.products){
   if(await tx.storeProduct.findUnique({where:{sku:product.sku}}))continue;
   const {variants,images,...data}=product;
   await tx.storeProduct.create({data:{...data,brandId:brandIds.get(data.brandId),variants:{create:variants},images:{create:images}}});created++;
   for(const variant of variants)await tx.storeProductStockMovement.create({data:{productId:data.id,variantId:variant.id,movementType:'INITIAL_STOCK',quantity:variant.stockQuantity,previousStock:0,newStock:variant.stockQuantity,referenceType:'XDOC_DEMO_CATALOG',referenceId:data.id}});
  }
  return {productsCreated:created,catalogueProducts:fixture.products.length,mediaAssets:fixture.assets.length};
 },{timeout:120000,isolationLevel:'Serializable'});
 console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
