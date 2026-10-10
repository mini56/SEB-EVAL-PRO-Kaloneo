'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {
 loadOfficialOverrides,writeOfficialSeedOverrides
}=require('./kaloneo-testsv1');

const root=fs.mkdtempSync(path.join(os.tmpdir(),'kaloneo-testsv1-'));
try{
 const seed=path.join(root,'source','kaltest','tests');
 const official=path.join(root,'TESTS_V1');
 const output=path.join(root,'app','web','kaltest','tests');
 const id='test_lambda', version='1.0.0';
 const seedFile=path.join(seed,'lambda','1.0.0','test.json');
 fs.mkdirSync(path.dirname(seedFile),{recursive:true});
 fs.mkdirSync(official,{recursive:true});
 const original={kaltestFormat:1,id,version,title:'Lambda ORIGINAL',questions:[{id:'q1',answer:'10'}]};
 fs.writeFileSync(seedFile,JSON.stringify(original));
 assert.equal(loadOfficialOverrides(root,seed).overrides.size,0);
 let result=writeOfficialSeedOverrides({repoRoot:root,sourceTestsDir:seed,outputTestsDir:output});
 assert.equal(result.length,0);
 assert.deepEqual(JSON.parse(fs.readFileSync(seedFile)),original);
 assert.equal(fs.existsSync(path.join(output,'lambda','1.0.0','test.json')),false);

 const replacement={...original,title:'Lambda CORRIGÉ',questions:[{id:'q1',answer:'10'}]};
 fs.writeFileSync(path.join(official,id+'.json'),JSON.stringify(replacement));
 const loaded=loadOfficialOverrides(root,seed);
 assert.equal(loaded.overrides.get(id).definition.title,'Lambda CORRIGÉ');
 result=writeOfficialSeedOverrides({repoRoot:root,sourceTestsDir:seed,outputTestsDir:output});
 assert.equal(result.length,1);
 assert.equal(JSON.parse(fs.readFileSync(path.join(output,'lambda','1.0.0','test.json'))).title,'Lambda CORRIGÉ');
 assert.equal(JSON.parse(fs.readFileSync(seedFile)).title,'Lambda ORIGINAL');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'app','web','kaltest','TESTS_V1-manifest.json')));
 assert.deepEqual(manifest.tests.map(t=>t.id),[id]);
 assert.match(manifest.tests[0].sha256,/^[0-9a-f]{64}$/);
 // Reject IDs, invalid versions, malformed content instead of silently
 // compiling the wrong test or a renamed V1.
 for(const broken of [{...replacement,id:'other'},{...replacement,version:'2.0.0'},{...replacement,kaltestFormat:2}]){
   fs.writeFileSync(path.join(official,id+'.json'),JSON.stringify(broken));
   assert.throws(()=>loadOfficialOverrides(root,seed),/TESTS_V1/);
 }
 console.log('TESTS_V1_CANONICAL_SMOKE: OK empty, override, unchanged original, invalid rejected');
}finally{fs.rmSync(root,{recursive:true,force:true});}
