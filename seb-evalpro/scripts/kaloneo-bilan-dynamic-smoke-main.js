'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function fail(message, details) {
  console.error('KALONEO_BILAN_DYNAMIC_SMOKE: FAIL - ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

const manifest = {
  schemaVersion:1,
  parcoursId:'parcours-smoke-r13',
  parcoursTitle:'Parcours smoke R13',
  tests:[
    {id:'calculs_commandes_atelier',title:'Calculs commandes atelier',category:'mathematiques',scored:true},
    {id:'organisation_demenagement',title:'Organisation d’une activité',category:'organisation',scored:true},
    {id:'planning_cantine',title:'Planification — Le restaurant',category:'organisation',scored:true},
    {id:'tri_chevilles',title:'Tri de chevilles',category:'technique',scored:false},
    {id:'transition_video_f1',title:'Transition vidéo F1',category:'transition',scored:false}
  ]
};
const kaltest = {
  tests:{
    calculs_commandes_atelier:{status:'COMPLETED',result:{score:4,scoreMax:5,percentage:80,details:{}}},
    organisation_demenagement:{status:'COMPLETED',result:{score:7,scoreMax:8,percentage:87.5,details:{}}},
    planning_cantine:{status:'COMPLETED',result:{score:12,scoreMax:15,percentage:80,details:{}}},
    tri_chevilles:{status:'COMPLETED',result:{score:0,scoreMax:0,percentage:0,details:{},tri:{completedCount:4,temps_moyen:700,moyenne_erreurs:1,erreurs_total:4}}},
    transition_video_f1:{status:'COMPLETED',result:{score:0,scoreMax:0,percentage:0,details:{}}}
  }
};

let smokeState={
  version:1,
  sessionStorage:{
    candidat_data:JSON.stringify({nom:'TEST',prenom:'R13',date:'2026-10-07'}),
    seb_kaloneo_results_manifest:JSON.stringify(manifest),
    seb_kaltest_pilot2_state_v1:JSON.stringify(kaltest)
  },
  localStorage:{},
  lastPage:'admin-bilan.html',
  lastEvaluationPage:'kaltest-pilot2.html'
};

ipcMain.on('app:edition-sync',event=>{event.returnValue={edition:'admin',canBilan:true,canAi:true,canImport:true,canExport:true}});
ipcMain.on('state:load-sync',event=>{event.returnValue=smokeState});
ipcMain.on('state:save-sync',(event,payload)=>{smokeState={...smokeState,...(payload||{})};event.returnValue={ok:true,state:smokeState}});
ipcMain.on('candidate-catalog:workspace-load-sync',event=>{event.returnValue={ok:false}});
ipcMain.on('candidate-catalog:results-workspace-load-sync',event=>{event.returnValue={ok:false}});
ipcMain.on('candidate-catalog:workspace-save-sync',event=>{event.returnValue={ok:true}});
ipcMain.on('kaloneo-library:test-metadata-sync',event=>{event.returnValue={ok:true,tests:[
  {id:'calculs_commandes_atelier',title:'Calculs de commandes en atelier',category:'mathematiques',scored:true},
  {id:'organisation_demenagement',title:'Organisation d’une activité',category:'organisation',scored:true},
  {id:'planning_cantine',title:'Planification — Le restaurant',category:'planification',scored:true},
  {id:'tri_chevilles',title:'Tri de chevilles',category:'technique',scored:false},
  {id:'transition_video_f1',title:'Transition vidéo F1',category:'transition',scored:false}
]}});

ipcMain.handle('state:save',(_event,payload)=>{smokeState={...smokeState,...(payload||{})};return{ok:true,state:smokeState}});
ipcMain.handle('admin:status',()=>true);
ipcMain.handle('admin:verify',()=>true);
ipcMain.handle('admin:verify-password',()=>false);
ipcMain.handle('admin:lock',()=>true);
ipcMain.handle('admin:open-bilan',()=>false);
ipcMain.handle('admin:open-candidate-results',()=>false);
ipcMain.handle('admin:return-evaluation',()=>false);
ipcMain.handle('admin:close-session',()=>false);
ipcMain.handle('ai:status',()=>({available:false,offline:true}));
ipcMain.handle('ai:rewrite-synthesis',()=>({ok:false}));

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win=new BrowserWindow({
    show:false,width:1280,height:800,
    webPreferences:{preload:path.join(__dirname,'..','src','preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  try{
    await win.loadFile(path.join(__dirname,'..','app','web','admin-bilan.html'));
    await new Promise(resolve=>setTimeout(resolve,1400));

    const before=await win.webContents.executeJavaScript(`(()=>({
      enabled:!!window.SEB_KALONEO_BILAN?.enabled,
      visibleIds:window.SEB_KALONEO_BILAN?.visibleTestIds?.()||[],
      sections:[...document.querySelectorAll('tr[data-kaloneo-section="1"]')].map(x=>x.textContent.trim()),
      rows:[...document.querySelectorAll('tr[data-kaloneo-test-id]')].map(x=>({id:x.dataset.kaloneoTestId,level:x.dataset.level||'',detail:x.querySelector('.detail')?.textContent||''})),
      compatVisible:[...document.querySelectorAll('[data-seb-kaloneo-compat="1"]')].filter(x=>!x.hidden).length,
      parcours:document.getElementById('seb-kaloneo-bilan-parcours')?.textContent||''
    }))()`,true);

    if(!before.enabled) return fail('mode Bilan KALONÉO non activé',before);
    const expected=['calculs_commandes_atelier','organisation_demenagement','planning_cantine','tri_chevilles'];
    if(JSON.stringify(before.visibleIds)!==JSON.stringify(expected)) return fail('liste de tests visible incorrecte',before);
    if(before.visibleIds.includes('transition_video_f1')) return fail('transition visible dans le Bilan',before);
    if(!before.sections.includes('Mathématiques')||!before.sections.includes('Organisation')||!before.sections.includes('Planification')||!before.sections.includes('Compétences techniques')) return fail('sections KALONÉO incomplètes',before);
    if(before.compatVisible!==0) return fail('lignes historiques visibles',before);
    if(!/Parcours smoke R13/.test(before.parcours)) return fail('nom du parcours absent',before);

    await win.webContents.executeJavaScript(`document.getElementById('auto').click()`,true);
    await new Promise(resolve=>setTimeout(resolve,300));
    const after=await win.webContents.executeJavaScript(`(()=>({
      dynamic:Object.fromEntries([...document.querySelectorAll('tr[data-kaloneo-test-id]')].map(x=>[x.dataset.kaloneoTestId,x.dataset.level||''])),
      legacy:{
        organisation:document.querySelector('tr[data-r="organisation"]')?.dataset.level||'',
        planning:document.querySelector('tr[data-r="planning"]')?.dataset.level||'',
        triTemps:document.querySelector('tr[data-r="tri-temps"]')?.dataset.level||'',
        triErreurs:document.querySelector('tr[data-r="tri-erreurs"]')?.dataset.level||''
      },
      status:document.getElementById('status')?.textContent||''
    }))()`,true);

    if(after.dynamic.calculs_commandes_atelier!=='I') return fail('niveau maths incorrect',after);
    if(after.dynamic.organisation_demenagement!=='I') return fail('niveau organisation incorrect',after);
    if(after.dynamic.planning_cantine!=='II') return fail('niveau planification incorrect',after);
    if(after.dynamic.tri_chevilles!=='I') return fail('niveau tri incorrect',after);
    if(after.legacy.organisation!=='I'||after.legacy.planning!=='II'||after.legacy.triTemps!=='I'||after.legacy.triErreurs!=='I') return fail('compatibilité SEB-IA incorrecte',after);
    if(!/tests réellement présents/i.test(after.status)) return fail('statut auto Bilan incorrect',after);

    console.log('KALONEO_BILAN_DYNAMIC_SMOKE: OK');
    console.log(JSON.stringify({before,after}));
    win.destroy();
    app.exit(0);
  }catch(error){
    fail('erreur Electron: '+String(error&&error.stack||error));
  }
});

setTimeout(()=>fail('timeout'),60000).unref();
