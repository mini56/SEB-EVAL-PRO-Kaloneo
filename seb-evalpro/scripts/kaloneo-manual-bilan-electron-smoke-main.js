const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function fail(message, details) {
  console.error('KALONEO_MANUAL_BILAN_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let smokeState = {
  version: 1,
  sessionStorage: {
    'seb_kaltest_pilot2_state_v1:manual-smoke': "{\"phase\":\"handoff\",\"testIndex\":0,\"personId\":\"p\",\"evaluationId\":\"e\",\"identity\":{},\"tests\":{\"test_libre_smoke\":{\"answers\":{\"q_libre\":\"Je vérifie les informations avant de préparer la commande.\"},\"units\":{},\"supplemental\":{},\"status\":\"COMPLETED\",\"abandon\":null,\"result\":{\"score\":0,\"scoreMax\":0,\"percentage\":0,\"details\":{\"q_libre\":{\"value\":\"Je vérifie les informations avant de préparer la commande.\",\"correct\":null,\"points\":0,\"manual\":true,\"manualLevel\":null}},\"manualEvaluation\":{\"required\":true,\"testId\":\"test_libre_smoke\",\"testTitle\":\"Question libre smoke\",\"levels\":[\"NE\",\"I\",\"II\",\"III\"],\"items\":[{\"questionId\":\"q_libre\",\"prompt\":\"Expliquez comment vous contrôlez une commande.\",\"response\":\"Je vérifie les informations avant de préparer la commande.\",\"level\":null,\"comment\":\"\",\"levels\":[\"NE\",\"I\",\"II\",\"III\"]}]}}}},\"replay\":[]}"
  },
  localStorage: {},
  lastPage: 'admin-bilan.html',
  lastEvaluationPage: 'kaltest-pilot2.html'
};

ipcMain.on('app:edition-sync', (event) => { event.returnValue = { edition:'admin', canBilan:true, canAi:true, canImport:true, canExport:true }; });
ipcMain.on('state:load-sync', (event) => { event.returnValue = smokeState; });
ipcMain.on('state:save-sync', (event, payload) => {
  smokeState = { ...smokeState, ...(payload || {}) };
  event.returnValue = { ok:true, state:smokeState };
});
ipcMain.on('candidate-catalog:workspace-load-sync', e=>{e.returnValue={ok:false};});
ipcMain.on('candidate-catalog:results-workspace-load-sync', e=>{e.returnValue={ok:false};});
ipcMain.on('candidate-catalog:workspace-save-sync', e=>{e.returnValue={ok:true};});
ipcMain.handle('state:save', (_event,payload)=>{smokeState={...smokeState,...(payload||{})};return {ok:true,state:smokeState};});
for (const name of ['admin:status','admin:verify','admin:lock']) ipcMain.handle(name,()=>true);
ipcMain.handle('admin:verify-password',()=>false);
for (const name of ['admin:open-bilan','admin:open-candidate-results','admin:return-evaluation','admin:close-session']) ipcMain.handle(name,()=>false);
ipcMain.handle('ai:status',()=>({available:false,offline:true}));
ipcMain.handle('ai:rewrite-synthesis',()=>({ok:false}));
ipcMain.handle('ai:cancel-current',()=>({ok:true}));
ipcMain.handle('candidate:active',()=>null);
ipcMain.handle('candidate-catalog:workspace-save',()=>({ok:true}));
ipcMain.handle('replay:capture-page',()=>({ok:true}));
ipcMain.handle('replay:list',()=>[]);
ipcMain.handle('bilan-history:list',()=>[]);

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win=new BrowserWindow({
    show:false,width:1366,height:768,
    webPreferences:{preload:path.join(__dirname,'..','src','preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  try{
    await win.loadFile(path.join(__dirname,'..','app','web','admin-bilan.html'));
    await new Promise(r=>setTimeout(r,1500));

    const initial=await win.webContents.executeJavaScript(`(()=> {
      const row=document.querySelector('tr[data-kaltest-manual="1"]');
      return {
        section:String(document.getElementById('seb-kaltest-manual-bilan-section')?.textContent||'').trim(),
        row:!!row,
        module:String(row?.cells?.[0]?.textContent||'').trim(),
        answer:String(row?.querySelector('.seb-kaltest-free-answer')?.textContent||'').trim(),
        levels:[...row?.querySelectorAll('.level')||[]].map(x=>x.dataset.l),
        privacy:document.getElementById('seb-evalpro-privacy-toggle')?getComputedStyle(document.getElementById('seb-evalpro-privacy-toggle')).display:'absent'
      };
    })()`,true);

    if(!initial.row||!/Évaluations manuelles KALONÉO/.test(initial.section)||!/Question libre smoke/.test(initial.module)||
       !/Expliquez comment/.test(initial.module)||!/Je vérifie les informations/.test(initial.answer)||
       JSON.stringify(initial.levels)!==JSON.stringify(['NE','I','II','III'])) {
      return fail('ligne de Bilan manuel incorrecte',initial);
    }

    const after=await win.webContents.executeJavaScript(`(()=> {
      const row=document.querySelector('tr[data-kaltest-manual="1"]');
      row.querySelector('.level[data-l="II"]').click();
      const text=row.querySelector('.ctxt');
      text.value='Réponse pertinente avec quelques repères à consolider.';
      text.dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('save').click();
      const saved=JSON.parse(sessionStorage.getItem('seb_evalpro_bilan')||'{}');
      return {
        selected:[...row.querySelectorAll('.level.on')].map(x=>x.dataset.l),
        rowId:row.dataset.r,
        saved:saved.rows?.[row.dataset.r]||null
      };
    })()`,true);

    if(JSON.stringify(after.selected)!==JSON.stringify(['II'])||after.saved?.level!=='II'||
       !/quelques repères/.test(after.saved?.comment||'')||
       !/Je vérifie les informations/.test(after.saved?.detail||'')) {
      return fail('évaluation manuelle non sauvegardée dans le Bilan',after);
    }

    console.log('KALONEO_MANUAL_BILAN_ELECTRON=OK');
    console.log(JSON.stringify({initial,after}));
    win.destroy();
    app.exit(0);
  }catch(error){fail(String(error&&error.stack||error));}
});

setTimeout(()=>fail('timeout'),60000).unref();
