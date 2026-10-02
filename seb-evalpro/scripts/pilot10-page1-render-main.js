const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');
const outDir = path.resolve(root, '..', 'docs', 'render-check');

function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function shot(win, name){
  const img = await win.webContents.capturePage();
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,name), img.toPNG());
}

async function resetOnboarding(win){
  await win.webContents.executeJavaScript("sessionStorage.removeItem('seb_kaltest_pilot2_onboarding_v1');sessionStorage.removeItem('seb_kaltest_pilot2_state_v1');location.reload();true", true);
  await wait(500);
  win.webContents.setZoomFactor(0.85);
  await wait(250);
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    useContentSize:true,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false}
  });

  try{
    await win.loadFile(page);
    win.webContents.setZoomFactor(0.85);
    await wait(550);
    await shot(win,'electron-page1-initial-1366x768-zoom085.png');

    await win.webContents.executeJavaScript("document.getElementById('pilot2-calculator-test-open').click();true", true);
    await wait(300);
    await shot(win,'electron-page1-calc-1366x768-zoom085.png');

    await resetOnboarding(win);
    await win.webContents.executeJavaScript("window.sebPilot2Onboarding.placeHouse();window.sebPilot2Onboarding.placeCar();window.sebPilot2Onboarding.startChrono();true",true);
    await wait(1100);
    await win.webContents.executeJavaScript("window.sebPilot2Onboarding.stopChrono();document.getElementById('pilot2-calculator-test-open').click();window.closeCalculator();const a=document.getElementById('pilot2-audio-heard');a.checked=true;a.dispatchEvent(new Event('change',{bubbles:true}));true",true);
    await wait(250);
    await shot(win,'electron-page1-completed-1366x768-zoom085.png');

    console.log('PILOT10_PAGE1_RENDER: OK');
    win.destroy();
    app.exit(0);
  }catch(error){
    console.error(error && error.stack ? error.stack : error);
    try{win.destroy();}catch(_){}
    app.exit(2);
  }
}).catch(err=>{console.error(err);app.exit(2);});

setTimeout(()=>{console.error('PILOT10_PAGE1_RENDER: TIMEOUT');app.exit(3)},60000);
