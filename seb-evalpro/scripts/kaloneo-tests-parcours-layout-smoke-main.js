'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, detail) {
  console.error('KALONEO_TESTS_PARCOURS_LAYOUT: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..');
  const target=path.join(root,'app','web','admin-tests-parcours.html');
  if(!fs.existsSync(target)) return fail('admin-tests-parcours.html absent de app/web');

  const win=new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false}
  });

  try {
    await win.loadFile(target);
    await new Promise(r=>setTimeout(r,250));

    const metrics=await win.webContents.executeJavaScript(`(()=> {
      const cards=[...document.querySelectorAll('.action-card')];
      const buttons=['open-kaloneo-builder','open-mask-builder','open-parcours-builder','open-kaloneo-transfer'].map(id=>document.getElementById(id));
      const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom,cx:r.left+r.width/2,cy:r.top+r.height/2};};
      return {
        cardRects:cards.map(rect),
        buttonRects:buttons.map(rect),
        buttonTexts:buttons.map(b=>b.textContent.trim()),
        main:rect(document.querySelector('main')),
        viewport:{width:innerWidth,height:innerHeight}
      };
    })()`,true);

    const heights=metrics.buttonRects.map(r=>r.height);
    const cardHeights=metrics.cardRects.map(r=>r.height);
    const sameHeight=Math.max(...heights)-Math.min(...heights)<=1;
    const sameCards=Math.max(...cardHeights)-Math.min(...cardHeights)<=2;
    const centered=metrics.buttonRects.every((b,i)=>Math.abs(b.cx-metrics.cardRects[i].cx)<=2);
    const twoRows=new Set(metrics.cardRects.map(r=>Math.round(r.top))).size===2;
    const twoColumns=new Set(metrics.cardRects.map(r=>Math.round(r.left))).size===2;

    if(metrics.cardRects.length!==4||metrics.buttonRects.length!==4||!sameHeight||!sameCards||!centered||!twoRows||!twoColumns) {
      return fail('grille ergonomique Tests / Parcours incorrecte',metrics);
    }

    console.log('KALONEO_TESTS_PARCOURS_LAYOUT=OK');
    console.log(JSON.stringify(metrics));
    win.destroy();
    app.exit(0);
  } catch(error) {
    fail(String(error?.stack||error));
  }
});

setTimeout(()=>fail('timeout'),30000).unref();
