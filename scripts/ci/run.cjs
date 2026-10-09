const {spawnSync}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const project='xre-ci-'+Date.now().toString(36)+'-'+crypto.randomBytes(3).toString('hex');
if(!/^xre-ci-[a-z0-9-]+$/.test(project))throw new Error('Nombre CI no permitido');
const env={...process.env,CI_POSTGRES_PASSWORD:crypto.randomBytes(32).toString('hex'),CI_JWT_ACCESS_SECRET:crypto.randomBytes(48).toString('hex'),CI_JWT_REFRESH_SECRET:crypto.randomBytes(48).toString('hex')};
const args=['compose','--project-name',project,'-f','docker-compose.ci.yml'];
function command(tail,options={}){return spawnSync('docker',[...args,...tail],{cwd:root,env,stdio:'inherit',...options}).status??1;}
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
let status=0;
try{
  status=command(['up','-d','--build','--wait','--wait-timeout','180']);
  if(!status){
    const unit=command(['exec','-T','api','npm','run','test:unit:ci']);
    const api=command(['exec','-T','api','npm','run','test:api:ci']);
    const types=command(['exec','-T','api','npm','run','typecheck','-w','@lealtad/api']);
    status=unit||api||types;
  }
  if(status)command(['logs','--no-color','--tail','100','api']);
}finally{
  // Only the randomly named CI project created above is removed. The application project is separate.
  const cleanup=command(['down','--volumes','--remove-orphans']);
  status=status||cleanup;
}
process.exitCode=status;
