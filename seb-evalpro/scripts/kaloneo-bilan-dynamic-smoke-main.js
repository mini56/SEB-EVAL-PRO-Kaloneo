'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function fail(message, details) {
  console.error('KALONEO_BILAN_INSTITUTIONAL_SMOKE: FAIL - ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

const manifest = {
  schemaVersion:1,
  parcoursId:'parcours-smoke-r15',
  parcoursTitle:'Parcours smoke R15 institutionnel',
  tests:[
    {id:'calculs_commandes_atelier',title:'Calculs commandes atelier',category:'mathematiques',scored:true},
    {id:'organisation_demenagement',title:'Organisation d’une activité',category:'organisation',scored:true},
    {id:'planning_cantine',title:'Planification — Le restaurant',category:'organisation',scored:true},
    {id:'gestes_postures',title:'Gestes et postures',category:'technique',scored:true},
    {id:'tri_chevilles',title:'Tri de chevilles',category:'technique',scored:false},
    {id:'structure_3d_papier',title:'Structure 3D en papier',category:'activite_pratique',scored:false},
    {id:'autoevaluation_savoirs',title:'Autoévaluation — savoirs',category:'autoevaluation',scored:false},
    {id:'transition_video_f1',title:'Transition vidéo F1',category:'transition',scored:false}
  ]
};

const kaltest = {
  tests:{
    calculs_commandes_atelier:{status:'COMPLETED',result:{score:4,scoreMax:5,percentage:80,details:{}}},
    organisation_demenagement:{status:'COMPLETED',result:{score:7,scoreMax:8,percentage:87.5,details:{}}},
    planning_cantine:{status:'COMPLETED',result:{score:12,scoreMax:15,percentage:80,details:{}}},
    gestes_postures:{status:'COMPLETED',result:{score:3,scoreMax:3,percentage:100,details:{}}},
    tri_chevilles:{
      status:'COMPLETED',
      tri:{rows:[
        {seconds:660,errors:1},{seconds:700,errors:0},{seconds:720,errors:2},{seconds:720,errors:1},{seconds:null,errors:null}
      ]},
      result:{score:0,scoreMax:0,percentage:0,details:{},tri:{
        completedCount:4,temps_moyen:700,temps_essais:[660,700,720,720],moyenne_erreurs:1,erreurs_total:4
      }}
    },
    structure_3d_papier:{status:'COMPLETED',result:{score:0,scoreMax:0,percentage:0,details:{}}},
    autoevaluation_savoirs:{
      status:'COMPLETED',
      answers:{ease:['Calculs'],difficulties:['Orthographe']},
      supplemental:{auto:{commentaire:'Je dois encore vérifier mes réponses.'}},
      result:{score:0,scoreMax:0,percentage:0,details:{}}
    },
    transition_video_f1:{status:'COMPLETED',result:{score:0,scoreMax:0,percentage:0,details:{}}}
  }
};

let smokeState={
  version:1,
  sessionStorage:{
    candidat_data:JSON.stringify({nom:'TEST',prenom:'R15',date:'2026-10-07'}),
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
  {id:'gestes_postures',title:'Gestes et postures',category:'technique',scored:true},
  {id:'tri_chevilles',title:'Tri de chevilles',category:'technique',scored:false},
  {id:'structure_3d_papier',title:'Structure 3D en papier',category:'activite_pratique',activityType:'practical',scored:false},
  {id:'autoevaluation_savoirs',title:'Autoévaluation — savoirs',category:'autoevaluation',scored:false},
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
    await new Promise(resolve=>setTimeout(resolve,1200));

    const before=await win.webContents.executeJavaScript(`(()=>({
      enabled:!!window.SEB_KALONEO_BILAN?.enabled,
      visibleIds:window.SEB_KALONEO_BILAN?.visibleTestIds?.()||[],
      visibleRows:window.SEB_KALONEO_BILAN?.visibleInstitutionalRows?.()||[],
      generatedPerTest:document.querySelectorAll('tr[data-kaloneo-test-id]').length,
      visibleSections:[...document.querySelectorAll('#bilan tbody tr.section,#bilan tbody tr.section2')]
        .filter(x=>!x.hidden).map(x=>x.textContent.trim()),
      fabrication:[...document.querySelectorAll('tr[data-r^="fabrication-"]')].map(x=>({id:x.dataset.r,hidden:x.hidden,level:x.dataset.level||''})),
      autoDetail:document.querySelector('tr[data-r="kaloneo-autoevaluation"] .detail')?.textContent||'',
      parcours:document.getElementById('seb-kaloneo-bilan-parcours')?.textContent||''
    }))()`,true);

    if(!before.enabled) return fail('mode Bilan KALONÉO non activé',before);
    if(before.visibleIds.includes('transition_video_f1')) return fail('transition présente dans la source Bilan',before);
    if(before.generatedPerTest!==0) return fail('le Bilan est encore construit avec une ligne par exercice',before);
    const mustRows=['fabrication-plan','fabrication-tracage','fabrication-decoupe','fabrication-assemblage','fabrication-finition',
      'organisation','planning','tri-temps','tri-erreurs','math-enonce','kaloneo-gestes-postures','kaloneo-autoevaluation'];
    if(mustRows.some(id=>!before.visibleRows.includes(id))) return fail('lignes institutionnelles attendues absentes',before);
    const forbiddenRows=['briques-identification','briques-manipulation','carre','texte','mail','expression','math-problemes'];
    if(forbiddenRows.some(id=>before.visibleRows.includes(id))) return fail('ligne institutionnelle hors parcours encore visible',before);
    if(before.fabrication.length!==5||before.fabrication.some(x=>x.hidden)) return fail('grille manuelle Structure 3D incomplète',before);
    if(!before.visibleSections.includes('Compétences techniques')||!before.visibleSections.includes('Savoirs fondamentaux')||!before.visibleSections.includes('Autoévaluation')) {
      return fail('sections institutionnelles / complémentaire incorrectes',before);
    }
    if(before.visibleSections.some(x=>/techniques de l'information/i.test(x))) return fail('section TIC visible sans exercice TIC',before);
    if(!/Calculs/.test(before.autoDetail)||!/Orthographe/.test(before.autoDetail)) return fail('détails autoévaluation perdus',before);
    if(!/Parcours smoke R15 institutionnel/.test(before.parcours)) return fail('nom du parcours absent',before);

    await win.webContents.executeJavaScript(`document.getElementById('auto').click()`,true);
    await new Promise(resolve=>setTimeout(resolve,250));

    const after=await win.webContents.executeJavaScript(`(()=>({
      levels:{
        organisation:document.querySelector('tr[data-r="organisation"]')?.dataset.level||'',
        planning:document.querySelector('tr[data-r="planning"]')?.dataset.level||'',
        triTemps:document.querySelector('tr[data-r="tri-temps"]')?.dataset.level||'',
        triErreurs:document.querySelector('tr[data-r="tri-erreurs"]')?.dataset.level||'',
        mathEnonce:document.querySelector('tr[data-r="math-enonce"]')?.dataset.level||'',
        gestures:document.querySelector('tr[data-r="kaloneo-gestes-postures"]')?.dataset.level||'',
        autoevaluation:document.querySelector('tr[data-r="kaloneo-autoevaluation"]')?.dataset.level||'',
        fabrication:[...document.querySelectorAll('tr[data-r^="fabrication-"]')].map(x=>x.dataset.level||'')
      },
      comments:{
        organisation:document.querySelector('tr[data-r="organisation"] .ctxt')?.value||'',
        planning:document.querySelector('tr[data-r="planning"] .ctxt')?.value||'',
        triErrors:document.querySelector('tr[data-r="tri-erreurs"] .ctxt')?.value||'',
        mathEnonce:document.querySelector('tr[data-r="math-enonce"] .ctxt')?.value||''
      },
      tri:{
        avg:document.getElementById('triAvg')?.textContent||'',
        times:document.getElementById('triTimes')?.innerText||'',
        errors:document.getElementById('triErr')?.textContent||''
      },
      status:document.getElementById('status')?.textContent||''
    }))()`,true);

    if(after.levels.organisation!=='I') return fail('niveau institutionnel Organisation incorrect',after);
    if(after.levels.planning!=='II') return fail('niveau institutionnel Planification incorrect',after);
    if(after.levels.triTemps!=='I'||after.levels.triErreurs!=='I') return fail('niveaux institutionnels Tri incorrects',after);
    if(after.levels.mathEnonce!=='I'||after.levels.gestures!=='I') return fail('agrégation institutionnelle incorrecte',after);
    if(after.levels.fabrication.some(Boolean)) return fail('Structure 3D remplie automatiquement alors qu’elle doit rester manuelle',after);
    if(after.levels.autoevaluation) return fail('Autoévaluation transformée en niveau automatique',after);

    if(!/gestion de stock multicritère/i.test(after.comments.organisation)) return fail('commentaire institutionnel Organisation remplacé',after);
    if(!/ordre d.exécution de tâches/i.test(after.comments.planning)) return fail('commentaire institutionnel Planification remplacé',after);
    if(!/Fiabilité satisfaisante/i.test(after.comments.triErrors)) return fail('commentaire institutionnel Tri remplacé',after);
    if(!/Comprend et exécute une consigne unique/i.test(after.comments.mathEnonce)) return fail('commentaire institutionnel Maths remplacé',after);

    for(const label of ['N°1','N°2','N°3','N°4']){
      if(!after.tri.times.includes(label)) return fail('temps individuels du Tri perdus',after);
    }
    if(after.tri.avg!=='11:40'||after.tri.errors!=='4 erreurs') return fail('moyenne/erreurs Tri incorrectes',after);
    if(!/Bilan institutionnel complété/i.test(after.status)) return fail('statut Bilan incorrect',after);

    console.log('KALONEO_BILAN_INSTITUTIONAL_SMOKE: OK');
    console.log(JSON.stringify({before,after}));
    win.destroy();
    app.exit(0);
  }catch(error){
    fail('erreur Electron: '+String(error&&error.stack||error));
  }
});

setTimeout(()=>fail('timeout'),60000).unref();
