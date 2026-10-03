// REAL PROGRAM RENDER — no preview HTML involved
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');
const outDir = path.resolve(root, '..', 'docs', 'render-check-real');

function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function shot(win, name){
  const img = await win.webContents.capturePage();
  fs.mkdirSync(outDir, { recursive:true });
  fs.writeFileSync(path.join(outDir, name), img.toPNG());
}

async function putExerciseState(win){
  await win.webContents.executeJavaScript(`
    sessionStorage.setItem('seb_kaltest_pilot2_state_v1', JSON.stringify({
      phase:'exercise',
      testIndex:0,
      personId:'render-person',
      evaluationId:'render-eval',
      identity:{},
      tests:{},
      replay:[]
    }));
    location.reload();
    true;
  `, true);
  await wait(900);
  win.webContents.setZoomFactor(0.85);
  await wait(350);
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    useContentSize:true,
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:false,
      devTools:false,
      spellcheck:false
    }
  });

  try{
    await win.loadFile(page);
    await putExerciseState(win);
    await shot(win,'REAL-PROGRAM-test1-initial-1366x768-zoom085.png');

    await win.webContents.executeJavaScript(`
      const b=document.getElementById('kaltest-calculator');
      if(b) b.click();
      true;
    `, true);
    await wait(300);
    await shot(win,'REAL-PROGRAM-test1-calculator-1366x768-zoom085.png');

    const meta = await win.webContents.executeJavaScript(`
      ({
        title: document.getElementById('kaltest-title')?.textContent || '',
        progress: document.getElementById('kaltest-progress')?.textContent || '',
        phaseVisible: document.getElementById('page-exercise')?.classList.contains('visible') || false,
        calculatorVisible: getComputedStyle(document.getElementById('calc-container')).display,
        buttons: [...document.querySelectorAll('#page-exercise button')].map(b=>b.textContent.trim()),
        bodyTestId: document.body.dataset.sebKaltestId || ''
      })
    `, true);

    fs.writeFileSync(path.join(outDir,'REAL-PROGRAM-test1-meta.json'), JSON.stringify(meta,null,2),'utf8');
    console.log('REAL_PROGRAM_TEST1_RENDER: OK');
    console.log(JSON.stringify(meta));
    win.destroy();
    app.exit(0);
  }catch(error){
    console.error(error && error.stack ? error.stack : error);
    try{win.destroy();}catch(_){}
    app.exit(2);
  }
}).catch(err=>{ console.error(err); app.exit(2); });

setTimeout(()=>{ console.error('REAL_PROGRAM_TEST1_RENDER: TIMEOUT'); app.exit(3); },60000);
