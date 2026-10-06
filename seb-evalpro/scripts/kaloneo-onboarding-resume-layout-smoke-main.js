'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');

function fail(message, detail) {
  console.error('KALONEO_ONBOARDING_RESUME_LAYOUT: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geometry(win) {
  return win.webContents.executeJavaScript(`
    (() => {
      const center = el => {
        const r=el.getBoundingClientRect();
        return {x:r.left+r.width/2,y:r.top+r.height/2,left:r.left,top:r.top,width:r.width,height:r.height};
      };
      const house=document.getElementById('pilot2-drag-house');
      const houseTarget=document.getElementById('pilot2-house-target');
      const car=document.getElementById('pilot2-drag-car');
      const carTarget=document.getElementById('pilot2-car-target');
      const scene=document.getElementById('pilot2-mouse-scene');
      if(!house||!houseTarget||!car||!carTarget||!scene) return {missing:true};
      const h=center(house),ht=center(houseTarget),c=center(car),ct=center(carTarget);
      return {
        missing:false,
        houseDelta:{x:Math.round(h.x-ht.x),y:Math.round(h.y-ht.y)},
        carDelta:{x:Math.round(c.x-ct.x),y:Math.round(c.y-ct.y)},
        houseStatus:document.getElementById('pilot2-house-status')?.textContent||'',
        carStatus:document.getElementById('pilot2-car-status')?.textContent||'',
        scene:{width:scene.getBoundingClientRect().width,height:scene.getBoundingClientRect().height},
        zoom:window.devicePixelRatio
      };
    })()
  `, true);
}

function aligned(value) {
  return !value.missing &&
    Math.abs(value.houseDelta.x) <= 2 && Math.abs(value.houseDelta.y) <= 2 &&
    Math.abs(value.carDelta.x) <= 2 && Math.abs(value.carDelta.y) <= 2;
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async () => {
  const root=path.join(__dirname,'..');
  const page=path.join(root,'app','web','kaltest-pilot2.html');
  const win=new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false}
  });

  try {
    await win.loadFile(page);
    await win.webContents.executeJavaScript(`
      sessionStorage.setItem('seb_kaltest_pilot2_onboarding_v1',JSON.stringify({
        housePlaced:true,
        carPlaced:true,
        chronoTested:true,
        chronoSeconds:2,
        calculatorTested:true,
        audioPlayed:true,
        audioHeard:true
      }));
      true;
    `,true);

    await win.reload();
    await sleep(20);

    // Reproduit la reprise réelle : le zoom adaptatif Electron arrive après
    // le DOMContentLoaded qui a restauré les objets.
    win.webContents.setZoomFactor(0.85);
    await sleep(650);

    const afterZoom=await geometry(win);
    if(!aligned(afterZoom) || !/bien placée/.test(afterZoom.houseStatus) || !/bien placée/.test(afterZoom.carStatus)) {
      return fail('objets décalés après reprise + zoom adaptatif',afterZoom);
    }

    // Un second changement de géométrie doit également conserver le centrage.
    win.setSize(1200,800);
    win.webContents.setZoomFactor(0.75);
    await sleep(650);

    const afterResize=await geometry(win);
    if(!aligned(afterResize)) return fail('objets décalés après redimensionnement',afterResize);

    console.log('KALONEO_ONBOARDING_RESUME_LAYOUT=OK');
    console.log(JSON.stringify({afterZoom,afterResize}));
    win.destroy();
    app.exit(0);
  } catch (error) {
    fail(String(error && error.stack || error));
  }
});

setTimeout(()=>fail('timeout'),45000).unref();
