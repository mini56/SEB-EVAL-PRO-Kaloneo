const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, details) {
  console.error('KALONEO_BUILDER_PREVIEW_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state = {version:1,sessionStorage:{},localStorage:{},lastPage:'kaltest-pilot2.html',lastEvaluationPage:'kaltest-pilot2.html'};
let previewDefinition = null;
let win = null;

ipcMain.on('app:edition-sync', event => {
  event.returnValue = {edition:'unified',canBilan:true,canAi:true,canImport:true,canExport:true};
});
ipcMain.on('state:load-sync', event => { event.returnValue = state; });
ipcMain.on('state:save-sync', (event,payload) => {
  state={...state,...(payload||{})};
  event.returnValue={ok:true,state};
});
ipcMain.on('candidate-catalog:workspace-load-sync', event => { event.returnValue={ok:false}; });
ipcMain.on('candidate-catalog:workspace-save-sync', event => { event.returnValue={ok:true}; });
ipcMain.on('candidate-catalog:results-workspace-load-sync', event => { event.returnValue={ok:false}; });

ipcMain.handle('state:save', (_event,payload)=>{state={...state,...(payload||{})};return {ok:true,state};});
ipcMain.handle('admin:status',()=>true);
ipcMain.handle('admin:verify',()=>true);
ipcMain.handle('admin:verify-password',()=>true);
ipcMain.handle('admin:lock',()=>true);
ipcMain.handle('candidate:active',()=>null);
ipcMain.handle('candidate:set-admin-export-context',()=>true);
ipcMain.handle('candidate-catalog:workspace-save',()=>({ok:true}));
ipcMain.handle('candidate-catalog:end-bilan',()=>true);
ipcMain.handle('admin:open-candidate-browser',()=>true);
ipcMain.handle('admin:return-candidate-browser',()=>true);
ipcMain.handle('admin:open-tests-parcours',()=>true);
ipcMain.handle('admin:close-tests-parcours',()=>true);
ipcMain.handle('admin:open-bilan',()=>true);
ipcMain.handle('admin:open-candidate-results',()=>true);
ipcMain.handle('admin:return-evaluation',()=>true);
ipcMain.handle('admin:close-session',()=>true);
ipcMain.handle('admin:quit-application',()=>true);
ipcMain.handle('candidate:complete-active',()=>({ok:true}));
ipcMain.handle('ai:cancel-current',()=>({ok:true}));
ipcMain.handle('ai:status',()=>({available:true,offline:true,integrated:true}));
ipcMain.handle('ai:rewrite-synthesis',()=>({ok:false}));
ipcMain.handle('replay:capture-page',()=>({ok:true}));
ipcMain.handle('replay:list',()=>[]);
ipcMain.handle('bilan-history:list',()=>[]);
ipcMain.handle('candidate-catalog:list',()=>[]);
ipcMain.handle('candidate-catalog:sync',()=>({ok:true}));
ipcMain.handle('candidate-catalog:detail',()=>({ok:false}));
ipcMain.handle('kaloneo-library:list-tests',()=>({ok:true,tests:[]}));
ipcMain.handle('kaloneo-library:list-parcours',()=>({ok:true,parcours:[]}));
ipcMain.handle('kaloneo-library:save-parcours',()=>({ok:true}));

const timeout=setTimeout(()=>fail('délai global dépassé'),45000);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..');
  const web=path.join(root,'app','web');
  const builder=path.join(web,'kaloneo-builder','test-builder.html');
  const preview=path.join(web,'kaloneo-builder','test-preview.html');
  if(!fs.existsSync(builder)||!fs.existsSync(preview)) return fail('Builder ou page aperçu absent de app/web');

  ipcMain.handle('kaloneo-builder:open-preview',async(_event,definition)=>{
    previewDefinition=JSON.parse(JSON.stringify(definition||{}));
    await win.loadFile(preview);
    return {ok:true};
  });
  ipcMain.handle('kaloneo-builder:get-preview',()=>previewDefinition?{ok:true,definition:previewDefinition}:{ok:false,error:'absent'});
  ipcMain.handle('kaloneo-builder:close-preview',async()=>{
    await win.loadFile(builder);
    return true;
  });

  win=new BrowserWindow({
    show:false,width:1366,height:768,
    webPreferences:{
      preload:path.join(root,'src','preload.js'),
      contextIsolation:true,nodeIntegration:false,sandbox:false
    }
  });
  win.webContents.on('preload-error',(_event,badPath,error)=>fail('erreur preload '+String(badPath||''),{error:String(error&&error.stack||error)}));

  try{
    await win.loadFile(builder);
    await wait(900);

    const setup=await win.webContents.executeJavaScript(`(()=>{
      localStorage.removeItem('kaloneo_test_builder_v2');
      document.getElementById('test-title').value='Aperçu Electron Smoke';
      document.getElementById('test-title').dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('test-scenario').value='Scénario plein écran';
      document.getElementById('test-scenario').dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('test-instruction').value='Consigne plein écran';
      document.getElementById('test-instruction').dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('calculator-compatible').checked=true;
      document.getElementById('calculator-compatible').dispatchEvent(new Event('change',{bubbles:true}));
      document.getElementById('chrono-enabled').checked=true;
      document.getElementById('chrono-enabled').dispatchEvent(new Event('change',{bubbles:true}));
      return {
        button:String(document.getElementById('open-electron-preview')?.textContent||'').trim(),
        title:document.getElementById('test-title').value
      };
    })()`);
    if(!/vraie page/i.test(setup.button)||setup.title!=='Aperçu Electron Smoke') return fail('bouton ou saisie Builder incorrecte',setup);

    await win.webContents.executeJavaScript(`document.getElementById('open-electron-preview').click();true`);
    for(let i=0;i<30;i++){
      await wait(120);
      const p=await win.webContents.executeJavaScript('location.pathname');
      if(/test-preview\.html$/i.test(p)) break;
    }
    await wait(500);

    const shown=await win.webContents.executeJavaScript(`(()=>({
      path:location.pathname,
      title:String(document.querySelector('.kb-heading h1')?.textContent||'').trim(),
      scenario:String(document.querySelectorAll('.kb-context p')[0]?.textContent||'').trim(),
      instruction:String(document.querySelectorAll('.kb-context p')[1]?.textContent||'').trim(),
      close:String(document.querySelector('.close-preview')?.textContent||'').trim(),
      next:String(document.querySelector('.kb-nav-btn.next')?.textContent||'').trim(),
      calculator:String(document.querySelector('.kb-footer-center button')?.textContent||'').trim(),
      chrono:String(document.querySelector('.kb-chrono-time')?.textContent||'').trim(),
      topbarVisible:!!document.querySelector('#seb-evalpro-topbar') && getComputedStyle(document.querySelector('#seb-evalpro-topbar')).display!=='none'
    }))()`);

    if(!/test-preview\.html$/i.test(shown.path)||
       shown.title!=='Aperçu Electron Smoke'||
       shown.scenario!=='Scénario plein écran'||
       shown.instruction!=='Consigne plein écran'||
       shown.close!=='Fermer l’aperçu'||
       shown.next!=='Suivant'||
       shown.calculator!=='Calculatrice'||
       shown.chrono!=='00:00'||
       shown.topbarVisible) {
      return fail('rendu plein écran incorrect',shown);
    }

    await win.webContents.executeJavaScript(`document.querySelector('.kb-footer-center button').click();true`);
    await wait(100);
    const calcOpen=await win.webContents.executeJavaScript(`(()=>{const p=document.querySelector('.kb-calculator');return !!p&&!p.hidden;})()`);
    if(!calcOpen)return fail('calculatrice de l’aperçu non interactive');

    await win.webContents.executeJavaScript(`document.querySelector('.close-preview').click();true`);
    for(let i=0;i<30;i++){
      await wait(120);
      const p=await win.webContents.executeJavaScript('location.pathname');
      if(/test-builder\.html$/i.test(p)) break;
    }
    await wait(500);

    const returned=await win.webContents.executeJavaScript(`(()=>({
      path:location.pathname,
      title:document.getElementById('test-title')?.value||'',
      scenario:document.getElementById('test-scenario')?.value||'',
      instruction:document.getElementById('test-instruction')?.value||'',
      previewButton:String(document.getElementById('open-electron-preview')?.textContent||'').trim()
    }))()`);

    if(!/test-builder\.html$/i.test(returned.path)||
       returned.title!=='Aperçu Electron Smoke'||
       returned.scenario!=='Scénario plein écran'||
       returned.instruction!=='Consigne plein écran'||
       !/vraie page/i.test(returned.previewButton)) {
      return fail('retour au Builder avec brouillon incorrect',returned);
    }

    console.log('KALONEO_BUILDER_PREVIEW_ELECTRON=OK');
    console.log(JSON.stringify({setup,shown,returned,definitionId:previewDefinition&&previewDefinition.id}));
    clearTimeout(timeout);win.destroy();app.exit(0);
  }catch(error){
    fail(String(error&&error.stack||error));
  }
});
