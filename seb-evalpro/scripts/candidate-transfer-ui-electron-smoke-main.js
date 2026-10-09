const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, details) {
  console.error('CANDIDATE_TRANSFER_UI_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state={version:1,sessionStorage:{},localStorage:{},lastPage:'qcmv1.0.html',lastEvaluationPage:'qcmv1.0.html'};
let lastExportOptions=null;
const catalogItems=[
  {candidateId:'CAND-DONE-1',nom:'Candidat',prenom:'Terminé',lieu:'Lorient',groupe:'1',date:'2026-10-09',status:'TERMINE',bilanCount:1,revisionCount:0,hasOriginalBilan:true,replayCount:1,exportCount:1},
  {candidateId:'CAND-DONE-2',nom:'Deuxième',prenom:'Candidat',lieu:'Vannes',groupe:'2',date:'2026-10-09',status:'TERMINE',bilanCount:0,revisionCount:0,hasOriginalBilan:false,replayCount:0,exportCount:0},
  {candidateId:'CAND-ACTIVE-1',nom:'Parcours',prenom:'En cours',lieu:'Auray',groupe:'3',date:'2026-10-09',status:'EN_COURS',bilanCount:0,revisionCount:0,hasOriginalBilan:false,replayCount:0,exportCount:0}
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
ipcMain.handle('candidate-catalog:list',()=>catalogItems);
ipcMain.handle('candidate-catalog:sync',()=>({ok:true}));
ipcMain.handle('candidate-catalog:detail',()=>({ok:false,error:'Détail non utilisé dans ce smoke.'}));
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

    const bar=await win.webContents.executeJavaScript(`(()=>{
      const visible=id=>{const e=document.getElementById(id);if(!e)return false;const c=getComputedStyle(e),r=e.getBoundingClientRect();return !e.hidden&&c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0;};
      return {
        list:visible('seb-evalpro-open-candidate'),
        legacyExport:visible('seb-evalpro-export-candidates'),
        legacyImport:visible('seb-evalpro-import-candidates')
      };
    })()`);
    if(!bar.list||bar.legacyExport||bar.legacyImport)return fail('anciens boutons Import / Export encore visibles dans la barre Admin',bar);

    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-open-candidate').click();true");
    await wait(150);
    const normal=await win.webContents.executeJavaScript(`(()=>{
      const card=document.querySelector('#seb-candidate-catalog .seb-cc-card')?.getBoundingClientRect();
      const foot=document.querySelector('#seb-candidate-catalog .seb-cc-foot')?.getBoundingClientRect();
      const imp=document.getElementById('seb-cc-import')?.getBoundingClientRect();
      const exp=document.getElementById('seb-cc-export-mode')?.getBoundingClientRect();
      const close=document.getElementById('seb-cc-close')?.getBoundingClientRect();
      return {
        rows:document.querySelectorAll('.seb-cc-row').length,
        importText:String(document.getElementById('seb-cc-import')?.textContent||'').trim(),
        exportText:String(document.getElementById('seb-cc-export-mode')?.textContent||'').trim(),
        closeText:String(document.getElementById('seb-cc-close')?.textContent||'').trim(),
        bottomLeft:Boolean(card&&foot&&imp&&exp&&close&&imp.left<close.left&&exp.left<close.left&&imp.top>=foot.top-1&&exp.top>=foot.top-1)
      };
    })()`);
    if(normal.rows!==3||normal.importText!=='Importer candidat'||normal.exportText!=='Exporter candidat'||normal.closeText!=='Fermer'||!normal.bottomLeft){
      return fail('ergonomie normale de la Liste des candidats incorrecte',normal);
    }

    // L'import garde le processus existant.
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-import').click();true");
    await wait(90);
    const importDialog=await win.webContents.executeJavaScript("String(document.querySelector('#seb-evalpro-transfer-password-dialog .seb-transfer-password-title')?.textContent||'').trim()");
    if(importDialog!=='Import USB sécurisé')return fail('Importer candidat ne lance pas le dialogue USB existant',{importDialog});
    await win.webContents.executeJavaScript("document.getElementById('seb-transfer-password-cancel').click();true");
    await wait(70);

    await win.webContents.executeJavaScript("document.getElementById('seb-cc-export-mode').click();true");
    await wait(70);
    const selection=await win.webContents.executeJavaScript(`(()=>({
      normalImportHidden:document.getElementById('seb-cc-import').hidden,
      normalExportHidden:document.getElementById('seb-cc-export-mode').hidden,
      cancelVisible:!document.getElementById('seb-cc-export-cancel').hidden,
      launchVisible:!document.getElementById('seb-cc-export-launch').hidden,
      launchDisabled:document.getElementById('seb-cc-export-launch').disabled,
      choices:[...document.querySelectorAll('.seb-cc-actions button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled}))
    }))()`);
    if(!selection.normalImportHidden||!selection.normalExportHidden||!selection.cancelVisible||!selection.launchVisible||!selection.launchDisabled||
       selection.choices.length!==3||selection.choices[0].text!=='Exporter'||selection.choices[0].disabled||
       selection.choices[1].text!=='Exporter'||selection.choices[1].disabled||
       selection.choices[2].text!=='Parcours en cours'||!selection.choices[2].disabled){
      return fail('mode sélection Export incorrect',selection);
    }

    // Sélectionner précisément le deuxième candidat terminé.
    await win.webContents.executeJavaScript("document.querySelectorAll('.seb-cc-actions button')[1].click();true");
    await wait(70);
    const selected=await win.webContents.executeJavaScript(`(()=>({
      launch:String(document.getElementById('seb-cc-export-launch')?.textContent||'').trim(),
      selected:[...document.querySelectorAll('.seb-cc-actions button')].map(b=>b.textContent.trim())
    }))()`);
    if(selected.launch!=='Lancer l’export (1)'||selected.selected[1]!=='✓ Sélectionné')return fail('sélection individuelle non mémorisée',selected);

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

    if(!lastExportOptions||JSON.stringify(lastExportOptions.candidateIds)!==JSON.stringify(['CAND-DONE-2'])){
      return fail('le moteur ne reçoit pas exactement le candidat choisi',lastExportOptions||{});
    }
    const done=await win.webContents.executeJavaScript("String(document.querySelector('#seb-evalpro-transfer-dialog .seb-transfer-title')?.textContent||'').trim()");
    if(done!=='Export terminé')return fail('message de fin export absent',{done});
    await win.webContents.executeJavaScript("document.getElementById('seb-transfer-ok').click();true");
    await wait(90);

    const restored=await win.webContents.executeJavaScript(`(()=>({
      importVisible:!document.getElementById('seb-cc-import').hidden,
      exportVisible:!document.getElementById('seb-cc-export-mode').hidden,
      launchHidden:document.getElementById('seb-cc-export-launch').hidden,
      selectedRows:document.querySelectorAll('.seb-cc-row.export-selected').length
    }))()`);
    if(!restored.importVisible||!restored.exportVisible||!restored.launchHidden||restored.selectedRows!==0)return fail('retour au mode normal après export incorrect',restored);

    console.log('CANDIDATE_TRANSFER_UI_ELECTRON=OK');
    console.log(JSON.stringify({bar,normal,selection,selected,lastExportOptions,restored}));
    clearTimeout(timeout);win.destroy();app.exit(0);
  }catch(error){fail(String(error?.stack||error));}
});
