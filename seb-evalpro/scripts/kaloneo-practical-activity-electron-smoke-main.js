'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createKaloneoLibrary } = require('../src/kaloneo-library-main');

function fail(message, detail) {
  console.error('KALONEO_PRACTICAL_ACTIVITY_SMOKE: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

const root=path.join(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seb-kaloneo-practical-'));
const library=createKaloneoLibrary({
  dataRoot:temp,
  seedTestsRoot:path.join(root,'source','kaltest','tests'),
  now:()=>new Date('2026-10-07T08:00:00.000Z')
});
const all=library.listTests();
const intro=all.find(x=>x.role==='introduction');
const fin=all.find(x=>x.role==='fin');
const practical=all.find(x=>x.id==='structure_3d_papier');

if(!intro||!fin||!practical) fail('activité pratique ou pages système absentes de la bibliothèque',{intro,fin,practical});
if(practical.category!=='activite_pratique'||practical.scored!==false||practical.activityType!=='practical') {
  fail('métadonnées de l’activité pratique incorrectes',practical);
}

const saved=library.saveParcours({
  name:'Parcours activité pratique smoke',
  creator:'Smoke R14',
  introduction:{id:intro.id,version:intro.version},
  tests:[{id:practical.id,version:practical.version}],
  fin:{id:fin.id,version:fin.version}
});
if(!saved.ok) fail('création parcours impossible',saved);
library.selectParcours(saved.parcours.id,{showCorrectionsDuringParcours:false});

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
    await wait(850);

    const seeded=await win.webContents.executeJavaScript(`(()=>({
      ready:Boolean(window.sebKaltestPilot2),
      active:window.sebKaltestPilot2?.activeTests||[],
      practical:window.sebKaltestPilot2?.data?.tests?.find(x=>x.id==='structure_3d_papier')||null
    }))()`,true);
    if(!seeded.ready||JSON.stringify(seeded.active)!==JSON.stringify(['structure_3d_papier','fin_parcours'])) {
      return fail('parcours pratique non chargé',seeded);
    }
    if(!seeded.practical||seeded.practical.allowEmptyCompletion!==true||seeded.practical.scored!==false) {
      return fail('définition candidat pratique incorrecte',seeded);
    }

    await win.webContents.executeJavaScript(`(()=>{
      const set=(id,value)=>{const el=document.getElementById(id);if(el){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}};
      set('nom','TEST');set('prenom','PRATIQUE');set('naissance','2000-01-01');set('ss7','1234567');
      set('lieu','Lorient');set('groupe','1');set('dateEvaluation','2026-10-07');
      document.getElementById('identity-next')?.click();
      return true;
    })()`,true);
    await wait(120);
    await win.webContents.executeJavaScript(`document.getElementById('intro-next')?.click();true`,true);
    await wait(180);

    const onActivity=await win.webContents.executeJavaScript(`(()=>({
      current:window.sebKaltestPilot2?.currentTest?.()?.id||'',
      title:document.getElementById('kaltest-title')?.textContent||'',
      scenario:document.getElementById('kaltest-scenario')?.textContent||'',
      instruction:document.getElementById('kaltest-instruction')?.textContent||'',
      status:document.getElementById('exercise-status')?.textContent||''
    }))()`,true);
    if(onActivity.current!=='structure_3d_papier'||!/structure 3d/i.test(onActivity.title+' '+onActivity.scenario)) {
      return fail('page candidat activité pratique incorrecte',onActivity);
    }

    await win.webContents.executeJavaScript(`document.getElementById('kaltest-next')?.click();true`,true);
    await wait(250);

    const completed=await win.webContents.executeJavaScript(`(()=>({
      current:window.sebKaltestPilot2?.currentTest?.()?.id||'',
      practicalState:window.sebKaltestPilot2?.state?.tests?.structure_3d_papier||null,
      status:document.getElementById('exercise-status')?.textContent||''
    }))()`,true);

    if(completed.current!=='fin_parcours') return fail('activité pratique ne passe pas à la page de fin',completed);
    if(completed.practicalState?.status!=='COMPLETED'||Number(completed.practicalState?.result?.scoreMax)!==0) {
      return fail('activité pratique non enregistrée comme terminée sans score',completed);
    }

    console.log('KALONEO_PRACTICAL_ACTIVITY_SMOKE: OK');
    console.log(JSON.stringify({practical,seeded,onActivity,completed}));
    clearTimeout(timeout);
    win.destroy();
    fs.rmSync(temp,{recursive:true,force:true});
    app.exit(0);
  }catch(error){
    fail(String(error?.stack||error));
  }
});
