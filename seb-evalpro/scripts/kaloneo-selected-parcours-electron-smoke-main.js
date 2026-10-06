'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createKaloneoLibrary } = require('../src/kaloneo-library-main');

function fail(message, detail) {
  console.error('KALONEO_SELECTED_PARCOURS_ELECTRON: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

const root=path.join(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seb-kaloneo-selected-'));
const library=createKaloneoLibrary({
  dataRoot:temp,
  seedTestsRoot:path.join(root,'source','kaltest','tests'),
  now:()=>new Date('2026-10-06T09:00:00.000Z')
});
const all=library.listTests();
const intro=all.find(x=>x.role==='introduction');
const fin=all.find(x=>x.role==='fin');
const tests=all.filter(x=>x.role==='test').slice(0,2);

library.saveMaskScreen({
  id:'mask-runtime-smoke',version:'1.0.0',name:'Masque runtime smoke',
  content:{text:'Masque sélectionné',image:''}
});
const saved=library.saveParcours({
  name:'Parcours smoke sélectionné',
  creator:'Smoke R6',
  maskScreen:{id:'mask-runtime-smoke',version:'1.0.0'},
  introduction:{id:intro.id,version:intro.version},
  tests:tests.map(x=>({id:x.id,version:x.version})),
  fin:{id:fin.id,version:fin.version}
});
if(!saved.ok) fail('création parcours impossible',saved);
library.selectParcours(saved.parcours.id,{showCorrectionsDuringParcours:true});

ipcMain.on('smoke:selected-runtime-sync',e=>{e.returnValue=library.resolveParcoursRuntime();});

const timeout=setTimeout(()=>fail('timeout'),45000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const target=path.join(root,'app','web','kaltest-pilot2.html');
  const win=new BrowserWindow({
    show:false,width:1366,height:768,
    webPreferences:{
      preload:path.join(__dirname,'kaloneo-selected-parcours-smoke-preload.js'),
      contextIsolation:true,nodeIntegration:false,sandbox:false,devTools:false
    }
  });
  try{
    await win.loadFile(target,{query:{fullParcours:'1'}});
    await wait(900);
    const value=await win.webContents.executeJavaScript(`(()=>({
      ready:Boolean(window.sebKaltestPilot2),
      title:document.getElementById('parcours')?.value||'',
      dataTitle:window.sebKaltestPilot2?.data?.parcours?.title||'',
      active:window.sebKaltestPilot2?.activeTests||[],
      phase:document.querySelector('.pilot2-page.visible')?.id||'',
      corrections:window.sebKaltestPilot2?.showCorrectionsDuringParcours===true
    }))()`,true);
    const expected=[...tests.map(x=>x.id),fin.id];
    if(!value.ready||value.title!=='Parcours smoke sélectionné'||value.dataTitle!=='Parcours smoke sélectionné'||
       JSON.stringify(value.active)!==JSON.stringify(expected)||value.phase!=='page-identification'||value.corrections!==true){
      return fail('le parcours choisi n’est pas utilisé par le candidat',{value,expected});
    }
    console.log('KALONEO_SELECTED_PARCOURS_ELECTRON=OK');
    console.log(JSON.stringify({value,expected}));
    clearTimeout(timeout);
    win.destroy();
    fs.rmSync(temp,{recursive:true,force:true});
    app.exit(0);
  }catch(error){
    fail(String(error?.stack||error));
  }
});
