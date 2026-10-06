'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

function fail(message, detail) {
  console.error('KALONEO_FINAL_COMPLETION_ELECTRON: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

const root = path.join(__dirname, '..');
const webRoot = path.join(root, 'app', 'web');
const finFile = path.join(webRoot, 'kaltest', 'tests', 'fin-parcours', '1.0.0', 'test.json');
if (!fs.existsSync(finFile)) fail('définition fin_parcours absente');
const fin = JSON.parse(fs.readFileSync(finFile, 'utf8'));

const kaltestState = {
  phase:'exercise',
  testIndex:0,
  personId:'final-smoke-person',
  evaluationId:'final-smoke-eval',
  identity:{nom:'SMOKE',prenom:'FINAL',lieu:'Lorient',groupe:'1',dateEvaluation:'2026-10-06',parcours:'Parcours final smoke'},
  tests:{
    [fin.id]:{answers:{},units:{},supplemental:{},result:null,status:'PENDING',abandon:null}
  },
  replay:[]
};

let smokeState = {
  version:1,
  sessionStorage:{
    candidat_data:JSON.stringify({
      nom:'SMOKE',prenom:'FINAL','prénom':'FINAL',lieu:'Lorient',groupe:'1',date:'2026-10-06',parcours:'Parcours final smoke'
    }),
    seb_kaltest_pilot2_state_v1:JSON.stringify(kaltestState)
  },
  localStorage:{},
  lastPage:'kaltest-pilot2.html',
  lastEvaluationPage:'kaltest-pilot2.html'
};
let activeCandidate={candidateId:'final-smoke',displayName:'FINAL SMOKE',status:'EN_COURS'};
let completeCalls=0;

ipcMain.on('app:edition-sync',e=>{e.returnValue={edition:'unified',canBilan:true,canAi:true,canImport:true,canExport:true};});
ipcMain.on('state:load-sync',e=>{e.returnValue=smokeState;});
ipcMain.on('state:save-sync',(e,p)=>{smokeState={...smokeState,...(p||{})};e.returnValue={ok:true,state:smokeState};});
ipcMain.on('candidate-catalog:workspace-load-sync',e=>{e.returnValue={ok:false};});
ipcMain.on('candidate-catalog:workspace-save-sync',e=>{e.returnValue={ok:true};});
ipcMain.on('candidate-catalog:results-workspace-load-sync',e=>{e.returnValue={ok:false};});
ipcMain.on('kaloneo-library:selected-runtime-sync',e=>{
  e.returnValue={
    ok:true,
    runtime:{
      id:'parcours-final-smoke',
      title:'Parcours final smoke',
      creator:'Smoke R7',
      launchOptions:{showCorrectionsDuringParcours:false},
      maskScreen:{id:'kaloneo-default',version:'1.0.0'},
      maskScreenDefinition:{id:'kaloneo-default',version:'1.0.0',name:'KALONÉO',content:{text:'KALONÉO',image:''}},
      introduction:null,
      tests:[],
      fin
    }
  };
});

ipcMain.handle('state:save',(_e,p)=>{smokeState={...smokeState,...(p||{})};return {ok:true,state:smokeState};});
ipcMain.handle('admin:status',()=>false);
ipcMain.handle('admin:verify',()=>false);
ipcMain.handle('admin:verify-password',()=>false);
ipcMain.handle('admin:lock',()=>true);
ipcMain.handle('candidate:active',()=>activeCandidate);
ipcMain.handle('candidate:complete-active',(_e,mode)=>{
  if(mode!=='candidate-final-page') return {ok:false,error:'mauvais mode'};
  completeCalls+=1;
  activeCandidate=null;
  return {ok:true,candidateId:'final-smoke',status:'TERMINE',completionReason:mode};
});
ipcMain.handle('candidate:set-admin-export-context',()=>false);
ipcMain.handle('ai:cancel-current',()=>({ok:true}));
ipcMain.handle('ai:status',()=>({available:true,offline:true,integrated:true}));
ipcMain.handle('ai:rewrite-synthesis',()=>({ok:false}));
ipcMain.handle('replay:capture-page',()=>({ok:true}));
ipcMain.handle('replay:list',()=>[]);
ipcMain.handle('bilan-history:list',()=>[]);
ipcMain.handle('candidate-catalog:list',()=>[]);
ipcMain.handle('candidate-catalog:sync',()=>({ok:true}));
ipcMain.handle('candidate-catalog:detail',()=>({ok:false}));
ipcMain.handle('kaloneo-library:get-mask-screen',()=>({
  ok:true,maskScreen:{id:'kaloneo-default',version:'1.0.0',name:'KALONÉO',content:{text:'KALONÉO',image:''}}
}));

for (const name of [
  'admin:open-bilan','admin:open-candidate-results','admin:return-evaluation',
  'admin:open-candidate-browser','admin:return-candidate-browser','admin:open-tests-parcours',
  'admin:close-tests-parcours','admin:close-session','admin:quit-application',
  'candidate-catalog:end-bilan','candidate-catalog:end-results','candidate-catalog:workspace-save'
]) {
  ipcMain.handle(name,()=>true);
}

const timeout=setTimeout(()=>fail('timeout'),45000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const target=path.join(webRoot,'kaltest-pilot2.html');
  const win=new BrowserWindow({
    show:false,width:1366,height:768,
    webPreferences:{
      preload:path.join(root,'src','preload.js'),
      contextIsolation:true,nodeIntegration:false,sandbox:false,devTools:false
    }
  });
  try{
    await win.loadFile(target);
    await wait(1300);
    const ui=await win.webContents.executeJavaScript(`(()=>({
      terminal:Boolean(document.querySelector('.kaltest-terminal-page')),
      terminalVisible:Boolean(document.querySelector('.kaltest-terminal-page')?.closest('.pilot2-page')?.classList.contains('visible')),
      legacyFinalVisible:Boolean(document.getElementById('page-final')?.classList.contains('visible')),
      finished:sessionStorage.getItem('seb_kaltest_parcours_finished')||''
    }))()`,true);

    if(!ui.terminal||!ui.terminalVisible||ui.legacyFinalVisible||ui.finished!=='1') {
      return fail('page terminale dynamique incorrecte',ui);
    }
    if(completeCalls!==1||activeCandidate!==null) {
      return fail('le parcours dynamique terminé reste actif',{completeCalls,activeCandidate,ui});
    }

    console.log('KALONEO_FINAL_COMPLETION_ELECTRON=OK');
    console.log(JSON.stringify({completeCalls,activeCandidate,ui}));
    clearTimeout(timeout);
    win.destroy();
    app.exit(0);
  }catch(error){fail(String(error && error.stack || error));}
});
