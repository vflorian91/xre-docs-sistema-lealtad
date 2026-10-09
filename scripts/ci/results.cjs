const fs=require('node:fs');
const path=require('node:path');
const cases=require('../../tests/test-cases.json').filter(t=>t.suite==='API');
const escape=value=>String(value).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function writeResults(actual){
  const directory=process.env.CI_RESULTS_DIR||'/results';fs.mkdirSync(directory,{recursive:true});
  const rows=cases.map(c=>{
    const found=actual.find(t=>t.id===c.id);
    return {id:c.id,name:c.name,expected:c.expected,status:found?.status??null,
      result:found?.result??'NO_EJECUTADA',milliseconds:found?.milliseconds??0};
  });
  const failed=rows.filter(t=>t.result==='FALLO').length,skipped=rows.filter(t=>t.result==='NO_EJECUTADA').length;
  const nodes=rows.map(t=>`<testcase classname="XRE.API" name="${escape(t.id+' '+t.name)}" time="${t.milliseconds/1000}">${t.result==='FALLO'?'<failure message="No se cumplio la respuesta o asercion esperada"/>':t.result==='NO_EJECUTADA'?'<skipped message="El flujo previo no pudo completarse"/>':''}</testcase>`);
  fs.writeFileSync(path.join(directory,'api.xml'),`<?xml version="1.0" encoding="UTF-8"?><testsuites><testsuite name="XRE API - 37 comprobaciones" tests="37" failures="${failed}" skipped="${skipped}" time="${rows.reduce((n,t)=>n+t.milliseconds,0)/1000}">${nodes.join('')}</testsuite></testsuites>`);
  fs.writeFileSync(path.join(directory,'api-results.json'),JSON.stringify({executedAt:new Date().toISOString(),environment:'Docker CI aislado',total:37,passed:rows.filter(t=>t.result==='APROBADA').length,failed,skipped,tests:rows},null,2));
}
module.exports={writeResults};
