const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'brique.html');
const outDir = path.resolve(root, '..', 'docs', 'render-check-real');

function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function shot(win,name){
  const img=await win.webContents.capturePage();
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,name),img.toPNG());
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win=new BrowserWindow({
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
    win.webContents.setZoomFactor(0.85);
    await wait(700);
    await shot(win,'REAL-PROGRAM-LEGO-initial-1366x768-zoom085.png');

    await win.webContents.executeJavaScript(`
      document.getElementById('startBtn')?.click();
      true;
    `,true);
    await wait(1250);
    await win.webContents.executeJavaScript(`
      document.getElementById('stopBtn')?.click();
      const errors=document.getElementById('nivDiff');
      if(errors){errors.value='2';errors.dispatchEvent(new Event('input',{bubbles:true}));}
      const code=document.getElementById('secretCode');
      if(code){code.value='svg56';code.dispatchEvent(new Event('input',{bubbles:true}));}
      true;
    `,true);
    await wait(180);
    await shot(win,'REAL-PROGRAM-LEGO-ready-1366x768-zoom085.png');

    const meta=await win.webContents.executeJavaScript(`
      ({
        layout:document.body.dataset.kaloneoLayout||'',
        exercise:document.body.dataset.kaloneoExercise||'',
        image:document.querySelector('.kaloneo-practical-image img')?.getAttribute('src')||'',
        chrono:document.querySelector('.kaloneo-chrono-display')?.textContent.trim()||'',
        time:document.getElementById('temps')?.value||'',
        errors:document.getElementById('nivDiff')?.value||'',
        validDisabled:document.getElementById('validBtn')?.disabled,
        autoEvalVisible:getComputedStyle(document.getElementById('autoEvalPart')).display
      })
    `,true);
    fs.writeFileSync(path.join(outDir,'REAL-PROGRAM-LEGO-meta.json'),JSON.stringify(meta,null,2),'utf8');

    await win.webContents.executeJavaScript("document.getElementById('validBtn')?.click();true",true);
    await wait(1200);
    await shot(win,'REAL-PROGRAM-LEGO-autoeval-1366x768-zoom085.png');

    console.log('REAL_PROGRAM_LEGO_RENDER: OK');
    console.log(JSON.stringify(meta));
    win.destroy();
    app.exit(0);
  }catch(error){
    console.error(error && error.stack ? error.stack : error);
    try{win.destroy();}catch(_){}
    app.exit(2);
  }
}).catch(err=>{console.error(err);app.exit(2);});

setTimeout(()=>{console.error('REAL_PROGRAM_LEGO_RENDER: TIMEOUT');app.exit(3)},60000);
