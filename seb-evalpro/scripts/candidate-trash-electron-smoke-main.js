const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, details) {
  console.error('CANDIDATE_TRASH_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state={version:1,sessionStorage:{},localStorage:{},lastPage:'qcmv1.0.html',lastEvaluationPage:'qcmv1.0.html'};
const evaluation={
  candidateId:'CAND-TRASH-1',evaluationId:'CAND-TRASH-1',personId:'PERS-TRASH',personIdentifier:'A12B456',
  nom:'TEST',prenom:'CORBEILLE',naissance:'1980-01-01',lieu:'Lorient',groupe:'1',date:'2026-10-09',
  parcours:'Parcours corbeille',status:'TERMINE',bilanCount:1,revisionCount:0,hasOriginalBilan:true,replayCount:1,exportCount:1
};
const person={
  personId:'PERS-TRASH',personIdentifier:'A12B456',nom:'TEST',prenom:'CORBEILLE',naissance:'1980-01-01',
  lieu:'Lorient',groupe:'1',latestDate:'2026-10-09',evaluationCount:1,completedCount:1,activeCount:0,
  bilanCount:1,revisionCount:0,identifierCollision:false,evaluations:[evaluation]
};
let activePersons=[person];
let trash=[];

function trashEntry() {
  return {...evaluation,deletedAt:'2026-10-09T10:00:00.000Z',deletedAs:'person',trashFolderName:'CAND-TRASH-1'};
}

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
ipcMain.handle('candidate-catalog:list',()=>activePersons.length?[evaluation]:[]);
ipcMain.handle('candidate-catalog:list-persons',()=>activePersons);
ipcMain.handle('candidate-catalog:person-detail',(_e,personId)=>{
  const found=activePersons.find(p=>p.personId===String(personId||''));
  return found?{ok:true,person:found}:{ok:false,error:'Candidat introuvable'};
});
ipcMain.handle('candidate-catalog:detail',()=>({ok:true,candidate:evaluation,bilans:[],replays:[],exports:[]}));
ipcMain.handle('candidate-catalog:delete',()=>{
  activePersons=[];
  trash=[trashEntry()];
  return {ok:true,candidateId:evaluation.candidateId,movedToTrash:true};
});
ipcMain.handle('candidate-catalog:delete-person',()=>{
  activePersons=[];
  trash=[trashEntry()];
  return {ok:true,personId:person.personId,movedEvaluations:1,movedToTrash:true};
});
ipcMain.handle('candidate-catalog:trash-list',()=>({ok:true,entries:trash.map(x=>({...x}))}));
ipcMain.handle('candidate-catalog:trash-restore',(_e,candidateId)=>{
  if(!trash.some(x=>x.candidateId===candidateId)) return {ok:false,error:'Introuvable'};
  trash=[];
  activePersons=[person];
  return {ok:true,candidateId};
});
ipcMain.handle('candidate-catalog:trash-empty',()=>{
  const purged=trash.length;
  trash=[];
  return {ok:true,purged};
});
ipcMain.handle('candidate-catalog:sync',()=>({ok:true}));
ipcMain.handle('ai:cancel-current',()=>({ok:true}));
ipcMain.handle('ai:status',()=>({available:false,offline:true,integrated:true}));
ipcMain.handle('ai:rewrite-synthesis',()=>({ok:false}));
ipcMain.handle('replay:capture-page',()=>({ok:true}));
ipcMain.handle('replay:list',()=>[]);
ipcMain.handle('bilan-history:list',()=>[]);
ipcMain.handle('kaloneo-library:selected-runtime',()=>({ok:false}));
ipcMain.handle('kaloneo-library:list-parcours',()=>({ok:true,parcours:[]}));
ipcMain.handle('admin:export-candidates',()=>({ok:true,total:0,added:0,updated:0,skipped:0,verifiedFiles:0}));
ipcMain.handle('admin:import-candidates',()=>({ok:true,total:0,added:0,updated:0,skipped:0,verifiedFiles:0}));

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeout=setTimeout(()=>fail('délai global dépassé'),45000);

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..');
  const target=path.join(root,'app','web','admin-candidats.html');
  if(!fs.existsSync(target)) return fail('admin-candidats.html absent de app/web');

  const win=new BrowserWindow({
    show:true,width:1366,height:768,
    webPreferences:{preload:path.join(root,'src','preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  win.webContents.on('preload-error',(_e,p,error)=>fail('erreur preload '+String(p||''),{error:String(error?.stack||error)}));

  try{
    await win.loadFile(target);
    win.show();win.focus();
    await wait(700);
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-open-candidate').click();true");
    await wait(120);

    const emptyState=await win.webContents.executeJavaScript(`(()=>({
      text:String(document.getElementById('seb-cc-trash')?.textContent||'').trim(),
      state:document.getElementById('seb-cc-trash')?.dataset.state,
      icon:String(document.querySelector('#seb-cc-trash img')?.getAttribute('src')||''),
      title:String(document.getElementById('seb-cc-trash')?.getAttribute('title')||''),
      rows:document.querySelectorAll('.seb-cc-person-wrap>.seb-cc-row').length,
      importLabel:String(document.getElementById('seb-cc-import')?.textContent||'').trim(),
      exportLabel:String(document.getElementById('seb-cc-export-mode')?.textContent||'').trim(),
      footerOrder:[...document.querySelectorAll('.seb-cc-foot button')].map(b=>b.id),
      rightOrder:[...document.querySelectorAll('.seb-cc-foot-right button')].map(b=>b.id),
      heights:[...document.querySelectorAll('.seb-cc-foot button')].filter(b=>!b.hidden).map(b=>Math.round(b.getBoundingClientRect().height)),
      trashWidth:Math.round(document.getElementById('seb-cc-trash')?.getBoundingClientRect().width||0),
      trashIconWidth:Math.round(document.querySelector('#seb-cc-trash img')?.getBoundingClientRect().width||0)
    }))()`);
    if(emptyState.state!=='empty'||emptyState.text!==''||!/candidate-trash-empty-simple\\.svg$/.test(emptyState.icon)||
       emptyState.rows!==1||emptyState.importLabel!=='↓ Importer candidat'||emptyState.exportLabel!=='↑ Exporter candidat'||
       JSON.stringify(emptyState.rightOrder)!==JSON.stringify(['seb-cc-close','seb-cc-trash'])||
       emptyState.heights.some(h=>h!==38)||emptyState.trashWidth!==38||emptyState.trashIconWidth!==26){
      return fail('état Corbeille vide / footer candidat incorrect',emptyState);
    }

    await win.webContents.executeJavaScript("document.querySelector('.seb-cc-person-wrap .seb-cc-actions .danger').click();true");
    await wait(60);
    const confirmText=await win.webContents.executeJavaScript("String(document.querySelector('#seb-candidate-delete-confirm .seb-delete-body')?.innerText||'')");
    if(!/Corbeille/.test(confirmText)||!/restaur/.test(confirmText)) return fail('confirmation de suppression ne parle pas de restauration',{confirmText});
    await win.webContents.executeJavaScript("document.getElementById('seb-delete-confirm').click();true");
    await wait(100);

    const fullState=await win.webContents.executeJavaScript(`(()=>({
      text:String(document.getElementById('seb-cc-trash')?.textContent||'').trim(),
      state:document.getElementById('seb-cc-trash')?.dataset.state,
      icon:String(document.querySelector('#seb-cc-trash img')?.getAttribute('src')||''),
      aria:String(document.getElementById('seb-cc-trash')?.getAttribute('aria-label')||''),
      rows:document.querySelectorAll('.seb-cc-person-wrap>.seb-cc-row').length
    }))()`);
    if(fullState.state!=='full'||fullState.text!==''||!/candidate-trash-full-simple\\.svg$/.test(fullState.icon)||
       !/1 élément/.test(fullState.aria)||fullState.rows!==0) return fail('état Corbeille pleine incorrect',fullState);

    // En mode export : Lancer l’export précède Annuler la sélection, la Corbeille reste à droite après Fermer.
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-export-mode').click();true");
    await wait(60);
    const exportFooter=await win.webContents.executeJavaScript(`(()=>({
      leftVisible:[...document.querySelectorAll('.seb-cc-foot-left button')].filter(b=>!b.hidden).map(b=>b.id),
      rightVisible:[...document.querySelectorAll('.seb-cc-foot-right button')].filter(b=>!b.hidden).map(b=>b.id),
      heights:[...document.querySelectorAll('.seb-cc-foot button')].filter(b=>!b.hidden).map(b=>Math.round(b.getBoundingClientRect().height))
    }))()`);
    if(JSON.stringify(exportFooter.leftVisible)!==JSON.stringify(['seb-cc-export-launch','seb-cc-export-cancel'])||
       JSON.stringify(exportFooter.rightVisible)!==JSON.stringify(['seb-cc-close','seb-cc-trash'])||
       exportFooter.heights.some(h=>h!==38)){
      return fail('ordre des boutons pendant la sélection export incorrect',exportFooter);
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-export-cancel').click();true");
    await wait(50);

    await win.webContents.executeJavaScript("document.getElementById('seb-cc-trash').click();true");
    await wait(80);
    const trashView=await win.webContents.executeJavaScript(`(()=>({
      title:String(document.querySelector('#seb-candidate-trash .seb-cc-title')?.textContent||'').trim(),
      rows:document.querySelectorAll('#seb-candidate-trash .seb-cc-evaluation-row').length,
      restore:String(document.querySelector('#seb-candidate-trash .seb-cc-evaluation-actions button')?.textContent||'').trim(),
      emptyDisabled:document.getElementById('seb-trash-empty')?.disabled
    }))()`);
    if(trashView.title!=='Corbeille'||trashView.rows!==1||trashView.restore!=='Restaurer'||trashView.emptyDisabled) return fail('vue Corbeille pleine incorrecte',trashView);

    await win.webContents.executeJavaScript("document.querySelector('#seb-candidate-trash .seb-cc-evaluation-actions button').click();true");
    await wait(120);
    const restored=await win.webContents.executeJavaScript(`(()=>({
      trashRows:document.querySelectorAll('#seb-candidate-trash .seb-cc-evaluation-row').length,
      emptyMessage:String(document.querySelector('#seb-candidate-trash .seb-cc-empty')?.innerText||'').trim(),
      mainRows:document.querySelectorAll('#seb-candidate-catalog .seb-cc-person-wrap>.seb-cc-row').length,
      trashState:document.getElementById('seb-cc-trash')?.dataset.state
    }))()`);
    if(restored.trashRows!==0||!/corbeille est vide/i.test(restored.emptyMessage)||restored.mainRows!==1||restored.trashState!=='empty') return fail('restauration depuis Corbeille incorrecte',restored);

    await win.webContents.executeJavaScript("document.getElementById('seb-trash-close').click();true");
    await wait(50);
    await win.webContents.executeJavaScript("document.querySelector('.seb-cc-person-wrap .seb-cc-actions .danger').click();true");
    await wait(50);
    await win.webContents.executeJavaScript("document.getElementById('seb-delete-confirm').click();true");
    await wait(100);
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-trash').click();true");
    await wait(70);
    await win.webContents.executeJavaScript("document.getElementById('seb-trash-empty').click();true");
    await wait(50);

    const purgeConfirm=await win.webContents.executeJavaScript(`(()=>({
      head:String(document.querySelector('#seb-candidate-delete-confirm .seb-delete-head')?.textContent||'').trim(),
      body:String(document.querySelector('#seb-candidate-delete-confirm .seb-delete-body')?.innerText||'').trim(),
      confirm:String(document.getElementById('seb-delete-confirm')?.textContent||'').trim()
    }))()`);
    if(!/Vider définitivement/.test(purgeConfirm.head)||!/irréversible/i.test(purgeConfirm.body)||!/Vider définitivement/.test(purgeConfirm.confirm)) return fail('confirmation de vidage définitif incorrecte',purgeConfirm);

    await win.webContents.executeJavaScript("document.getElementById('seb-delete-confirm').click();true");
    await wait(100);
    const purged=await win.webContents.executeJavaScript(`(()=>({
      message:String(document.querySelector('#seb-candidate-trash .seb-cc-empty')?.innerText||'').trim(),
      emptyDisabled:document.getElementById('seb-trash-empty')?.disabled,
      mainTrashState:document.getElementById('seb-cc-trash')?.dataset.state
    }))()`);
    if(!/corbeille est vide/i.test(purged.message)||!purged.emptyDisabled||purged.mainTrashState!=='empty') return fail('vidage définitif de la Corbeille incorrect',purged);

    console.log('CANDIDATE_TRASH_ELECTRON=OK');
    console.log(JSON.stringify({emptyState,fullState,trashView,restored,purgeConfirm,purged}));
    clearTimeout(timeout);win.destroy();app.exit(0);
  }catch(error){fail(String(error?.stack||error));}
});
