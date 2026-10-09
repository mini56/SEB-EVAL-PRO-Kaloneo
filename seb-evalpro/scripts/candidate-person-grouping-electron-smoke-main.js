const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, details) {
  console.error('CANDIDATE_PERSON_GROUPING_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state={version:1,sessionStorage:{},localStorage:{},lastPage:'qcmv1.0.html',lastEvaluationPage:'qcmv1.0.html'};
let lastExportOptions=null;

const evalA1={
  candidateId:'CAND-A-1',evaluationId:'CAND-A-1',personId:'PERS-A',personIdentifier:'0123456',
  nom:'DUPONT',prenom:'Jean',naissance:'1980-01-01',lieu:'Lorient',groupe:'1',date:'2026-10-01',
  parcours:'Parcours de base',status:'TERMINE',bilanCount:1,revisionCount:0,hasOriginalBilan:true,replayCount:1,exportCount:1
};
const evalA2={
  ...evalA1,candidateId:'CAND-A-2',evaluationId:'CAND-A-2',date:'2026-10-09',groupe:'2',
  parcours:'Parcours mathématiques',bilanCount:0,hasOriginalBilan:false,replayCount:0,exportCount:0
};
const evalB={
  candidateId:'CAND-B-1',evaluationId:'CAND-B-1',personId:'PERS-B',personIdentifier:'0123456',
  nom:'MARTIN',prenom:'Claire',naissance:'1990-02-02',lieu:'Vannes',groupe:'3',date:'2026-10-09',
  parcours:'Parcours long',status:'EN_COURS',bilanCount:0,revisionCount:0,hasOriginalBilan:false,replayCount:0,exportCount:0
};
const persons=[
  {
    personId:'PERS-A',personIdentifier:'0123456',nom:'DUPONT',prenom:'Jean',naissance:'1980-01-01',
    lieu:'Lorient',groupe:'2',latestDate:'2026-10-09',evaluationCount:2,completedCount:2,activeCount:0,
    bilanCount:1,revisionCount:0,identifierCollision:true,evaluations:[evalA2,evalA1]
  },
  {
    personId:'PERS-B',personIdentifier:'0123456',nom:'MARTIN',prenom:'Claire',naissance:'1990-02-02',
    lieu:'Vannes',groupe:'3',latestDate:'2026-10-09',evaluationCount:1,completedCount:0,activeCount:1,
    bilanCount:0,revisionCount:0,identifierCollision:true,evaluations:[evalB]
  }
];

ipcMain.on('app:edition-sync',e=>{e.returnValue={edition:'unified',label:'SEB EvalPro',canBilan:true,canAi:true,canImport:true,canExport:true,canCatalog:true,canReplay:true,canResults:true};});
ipcMain.on('state:load-sync',e=>{e.returnValue=state;});
ipcMain.on('state:save-sync',(e,p)=>{state={...state,...(p||{})};e.returnValue={ok:true,state};});
ipcMain.on('candidate-catalog:workspace-load-sync',e=>{e.returnValue={ok:false};});
ipcMain.on('candidate-catalog:workspace-save-sync',e=>{e.returnValue={ok:true};});
ipcMain.on('candidate-catalog:results-workspace-load-sync',e=>{e.returnValue={ok:false};});
ipcMain.on('kaloneo-library:selected-runtime-sync',e=>{e.returnValue={ok:false};});

ipcMain.handle('state:save',(_e,p)=>{state={...state,...(p||{})};return {ok:true,state};});
ipcMain.handle('candidate-catalog:workspace-save',()=>({ok:true}));
ipcMain.handle('candidate:active',()=>null);
ipcMain.handle('admin:status',()=>true);
ipcMain.handle('admin:verify',()=>true);
ipcMain.handle('admin:verify-password',()=>false);
ipcMain.handle('admin:lock',()=>true);
for(const name of [
  'admin:open-candidate-browser','admin:return-candidate-browser','admin:open-tests-parcours','admin:close-tests-parcours',
  'admin:open-bilan','admin:open-candidate-results','admin:return-evaluation','admin:close-session','admin:quit-application',
  'candidate:set-admin-export-context','candidate-catalog:end-bilan','candidate-catalog:end-results'
]) ipcMain.handle(name,()=>true);
ipcMain.handle('candidate:complete-active',()=>({ok:true}));
ipcMain.handle('candidate-catalog:list',()=>[evalA1,evalA2,evalB]);
ipcMain.handle('candidate-catalog:list-persons',()=>persons);
ipcMain.handle('candidate-catalog:person-detail',(_e,personId)=>{
  const person=persons.find(p=>p.personId===String(personId||''));
  return person?{ok:true,person}:{ok:false,error:'Candidat introuvable'};
});
ipcMain.handle('candidate-catalog:detail',(_e,candidateId)=>{
  const evaluation=[evalA1,evalA2,evalB].find(x=>x.candidateId===String(candidateId||''));
  return evaluation?{ok:true,candidate:evaluation,bilans:[],replays:[],exports:[]}:{ok:false,error:'Évaluation introuvable'};
});
ipcMain.handle('candidate-catalog:delete',()=>({ok:true}));
ipcMain.handle('candidate-catalog:delete-person',()=>({ok:true,removedEvaluations:2}));
ipcMain.handle('candidate-catalog:sync',()=>({ok:true}));
ipcMain.handle('ai:cancel-current',()=>({ok:true}));
ipcMain.handle('ai:status',()=>({available:false,offline:true,integrated:true}));
ipcMain.handle('ai:rewrite-synthesis',()=>({ok:false}));
ipcMain.handle('replay:capture-page',()=>({ok:true}));
ipcMain.handle('replay:list',()=>[]);
ipcMain.handle('bilan-history:list',()=>[]);
ipcMain.handle('kaloneo-library:selected-runtime',()=>({ok:false}));
ipcMain.handle('kaloneo-library:list-parcours',()=>({ok:true,parcours:[]}));

ipcMain.handle('admin:export-candidates',(_event,_password,options={})=>{
  lastExportOptions=JSON.parse(JSON.stringify(options||{}));
  const count=Array.isArray(options.candidateIds)?options.candidateIds.length:0;
  return {ok:true,total:count,added:count,updated:0,skipped:0,verifiedFiles:count,invalidSkipped:0,destinationRoot:'USB-SMOKE'};
});
ipcMain.handle('admin:import-candidates',()=>({ok:true,total:1,added:1,updated:0,skipped:0,verifiedFiles:5,destinationRoot:'ADMIN-SMOKE'}));

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stripIcon=value=>String(value||'').trim().replace(/^[^A-Za-zÀ-ÿ0-9✓]+\s*/u,'');
const timeout=setTimeout(()=>fail('délai global dépassé'),45000);

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..');
  const web=path.join(root,'app','web');
  const target=path.join(web,'admin-candidats.html');
  if(!fs.existsSync(target)) return fail('admin-candidats.html absent de app/web');

  const win=new BrowserWindow({
    show:true,width:1366,height:768,
    webPreferences:{preload:path.join(root,'src','preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  win.webContents.on('preload-error',(_e,p,error)=>fail('erreur preload '+String(p||''),{error:String(error?.stack||error)}));

  try{
    await win.loadFile(target);
    win.show();win.focus();
    await wait(850);

    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-open-candidate').click();true");
    await wait(150);

    const normal=await win.webContents.executeJavaScript(`(()=>({
      personRows:document.querySelectorAll('.seb-cc-person-wrap>.seb-cc-row').length,
      names:[...document.querySelectorAll('.seb-cc-person-wrap>.seb-cc-row strong')].map(x=>x.textContent.trim()),
      identifiers:[...document.querySelectorAll('.seb-cc-person-identifier')].map(x=>x.textContent.trim()),
      warnings:document.querySelectorAll('.seb-cc-identifier-warning').length,
      summary:[...document.querySelectorAll('.seb-cc-person-wrap>.seb-cc-row .seb-cc-bilan')].map(x=>x.innerText.trim())
    }))()`);
    if(normal.personRows!==2||normal.warnings!==2||!normal.names.includes('DUPONT Jean')||!normal.names.includes('MARTIN Claire')){
      return fail('regroupement visuel des personnes incorrect',normal);
    }
    if(!normal.identifiers.every(x=>/0123456/.test(x))) return fail('N° identifiant non affiché avec le nom',normal);

    // Ouvrir la personne DUPONT : deux évaluations distinctes doivent être visibles.
    await win.webContents.executeJavaScript("document.querySelector('.seb-cc-person-wrap .seb-cc-actions button').click();true");
    await wait(100);
    const personDetail=await win.webContents.executeJavaScript(`(()=>({
      title:String(document.querySelector('#seb-candidate-person-detail .seb-cc-title')?.textContent||'').trim(),
      meta:String(document.querySelector('#seb-candidate-person-detail .seb-cc-meta')?.innerText||'').trim(),
      evaluations:document.querySelectorAll('#seb-cc-person-evaluations .seb-cc-evaluation-row').length,
      deleteButtons:[...document.querySelectorAll('#seb-cc-person-evaluations .seb-cc-evaluation-actions .danger')].map(b=>b.textContent.trim())
    }))()`);
    if(personDetail.title!=='DUPONT Jean'||personDetail.evaluations!==2||!/0123456/.test(personDetail.meta)||personDetail.deleteButtons.length!==2){
      return fail('fiche personne / évaluations incorrecte',personDetail);
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-person-close').click();true");
    await wait(70);

    // Import reste le processus USB existant.
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-import').click();true");
    await wait(90);
    const importDialog=await win.webContents.executeJavaScript("String(document.querySelector('#seb-evalpro-transfer-password-dialog .seb-transfer-password-title')?.textContent||'').trim()");
    if(importDialog!=='Import USB sécurisé')return fail('Importer candidat ne lance pas le dialogue USB existant',{importDialog});
    await win.webContents.executeJavaScript("document.getElementById('seb-transfer-password-cancel').click();true");
    await wait(70);

    // Export : les personnes restent regroupées mais chaque évaluation est sélectionnable.
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-export-mode').click();true");
    await wait(80);
    const exportMode=await win.webContents.executeJavaScript(`(()=>({
      personRows:document.querySelectorAll('.seb-cc-person-wrap>.seb-cc-row').length,
      evalRows:document.querySelectorAll('.seb-cc-export-evaluations .seb-cc-evaluation-row').length,
      evalButtons:[...document.querySelectorAll('.seb-cc-export-evaluations .seb-cc-evaluation-actions button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled})),
      launch:String(document.getElementById('seb-cc-export-launch')?.textContent||'').trim(),
      launchDisabled:document.getElementById('seb-cc-export-launch')?.disabled
    }))()`);
    if(exportMode.personRows!==2||exportMode.evalRows!==3||exportMode.evalButtons.filter(x=>!x.disabled).length!==2||
       exportMode.evalButtons.filter(x=>x.disabled).length!==1||!exportMode.launchDisabled){
      return fail('sélection des évaluations dans le mode Export incorrecte',exportMode);
    }

    // Choisir uniquement l’évaluation la plus récente de DUPONT (CAND-A-2).
    await win.webContents.executeJavaScript("document.querySelector('.seb-cc-export-evaluations .seb-cc-evaluation-actions button:not(:disabled)').click();true");
    await wait(70);
    const selected=await win.webContents.executeJavaScript(`(()=>({
      launch:String(document.getElementById('seb-cc-export-launch')?.textContent||'').trim(),
      selected:[...document.querySelectorAll('.seb-cc-export-evaluations .seb-cc-evaluation-actions button')].map(b=>b.textContent.trim())
    }))()`);
    if(selected.launch!=='Lancer l’export (1)'||!selected.selected.some(x=>/Sélectionné/.test(x)))return fail('sélection d’une évaluation non mémorisée',selected);

    await win.webContents.executeJavaScript("document.getElementById('seb-cc-export-launch').click();true");
    await wait(90);
    await win.webContents.executeJavaScript(`(()=>{
      document.getElementById('seb-transfer-password').value='USB-Test-2026!';
      document.getElementById('seb-transfer-password-confirm').value='USB-Test-2026!';
      document.getElementById('seb-transfer-password-ok').click();
      return true;
    })()`);
    await wait(90);
    await win.webContents.executeJavaScript("document.getElementById('seb-export-existing').click();true");
    await wait(140);

    if(!lastExportOptions||JSON.stringify(lastExportOptions.candidateIds)!==JSON.stringify(['CAND-A-2'])){
      return fail('l’export ne reçoit pas exactement l’évaluation choisie',lastExportOptions||{});
    }

    console.log('CANDIDATE_PERSON_GROUPING_ELECTRON=OK');
    console.log(JSON.stringify({normal,personDetail,exportMode,selected,lastExportOptions}));
    clearTimeout(timeout);win.destroy();app.exit(0);
  }catch(error){fail(String(error?.stack||error));}
});
