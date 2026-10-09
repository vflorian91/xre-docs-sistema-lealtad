const path=require('node:path');
function assertCiDatabase(){
  const url=new URL(process.env.DATABASE_URL||'');
  if(process.env.CI!=='true'||url.pathname!=='/xre_ci'||url.hostname!=='postgres'){
    throw new Error('Las fixtures solo se permiten en la base efimera xre_ci del contenedor postgres con CI=true.');
  }
}
module.exports={assertCiDatabase};
