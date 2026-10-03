const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'app', 'web');
const kaltest = path.join(web, 'kaltest-pilot2.html');

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function waitForFile(win, expected, timeout=8000){
  const start=Date.now();
  while(Date.now()-start<timeout){
    const current=path.basename(new URL(win.webContents.getURL()).pathname);
    if(current===expected) return true;
    await sleep(80);
  }
  throw new Error('Navigation attendue vers '+expected+' absente. URL='+win.webContents.getURL());
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
    await win.loadFile(kaltest,{query:{fullParcours:'1'}});
    await sleep(500);

    // 1. Vérifie explicitement que l'introduction KALONÉO fait partie du parcours.
    await win.webContents.executeJavaScript(`
      sessionStorage.setItem('seb_kaltest_pilot2_state_v1', JSON.stringify({
        phase:'intro',
        testIndex:0,
        personId:'smoke-person',
        evaluationId:'smoke-eval',
        identity:{},
        tests:{},
        replay:[]
      }));
      location.reload();
      true;
    `,true);
    await sleep(600);

    const intro=await win.webContents.executeJavaScript(`
      ({
        visible:document.getElementById('page-intro')?.classList.contains('visible')||false,
        videoCard:Boolean(document.querySelector('.pilot2-intro-video-card')),
        animation:Boolean(document.getElementById('pilot2-intro-video')),
        next:document.getElementById('intro-next')?.textContent.trim()||''
      })
    `,true);
    if(!intro.visible || !intro.videoCard || !intro.animation){
      throw new Error('Introduction KALONÉO absente du parcours complet: '+JSON.stringify(intro));
    }

    // 2. Place le parcours sur le dernier KALTEST et abandonne ce test pour déclencher
    //    exactement la même fonction advance() qu'une fin d'exercice.
    await win.webContents.executeJavaScript(`
      sessionStorage.setItem('seb_kaltest_pilot2_state_v1', JSON.stringify({
        phase:'exercise',
        testIndex:6,
        personId:'smoke-person',
        evaluationId:'smoke-eval',
        identity:{},
        tests:{},
        replay:[]
      }));
      location.reload();
      true;
    `,true);
    await sleep(650);

    const fullFlag=await win.webContents.executeJavaScript(
      "new URLSearchParams(location.search).get('fullParcours')",
      true
    );
    if(fullFlag!=='1') throw new Error('Drapeau fullParcours perdu avant handoff.');

    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForFile(win,'autoeval1.html');

    // 3. Autoévaluation -> vraie introduction vidéo Briques.
    const auto=await win.webContents.executeJavaScript(`
      ({
        parcours:Boolean(window.sebParcours),
        next:window.sebParcours?.nextFile('autoeval1')||''
      })
    `,true);
    if(!auto.parcours || auto.next!=='introbrique.html'){
      throw new Error('Autoévaluation ne mène pas à introbrique.html: '+JSON.stringify(auto));
    }

    await win.webContents.executeJavaScript("window.sebParcours.goNext('autoeval1'); true;",true);
    await waitForFile(win,'introbrique.html');
    await sleep(350);

    // 4. Vérifie la vraie vidéo MP4, puis simule sa fin.
    const video=await win.webContents.executeJavaScript(`
      (() => {
        const v=document.getElementById('introVideo');
        const src=v?.querySelector('source')?.getAttribute('src')||'';
        return {exists:Boolean(v),src,autoplay:Boolean(v?.autoplay),muted:Boolean(v?.muted)};
      })()
    `,true);
    if(!video.exists || !/video_brique\.mp4$/.test(video.src) || !video.autoplay){
      throw new Error('Vidéo Briques réelle absente/invalide: '+JSON.stringify(video));
    }

    await win.webContents.executeJavaScript(
      "document.getElementById('introVideo').dispatchEvent(new Event('ended')); true;",
      true
    );
    await waitForFile(win,'brique.html',5000);
    await sleep(300);

    // 5. LEGO doit être la vraie page Briques.
    const lego=await win.webContents.executeJavaScript(`
      ({
        exercise:document.body.dataset.kaloneoExercise||'',
        layout:document.body.dataset.kaloneoLayout||'',
        chrono:Boolean(document.getElementById('startBtn')&&document.getElementById('stopBtn')),
        image:document.querySelector('.kaloneo-practical-image img')?.getAttribute('src')||'',
        next:window.sebParcours?.nextFile('brique')||''
      })
    `,true);
    if(lego.exercise!=='brique' || !lego.chrono || lego.next!=='stock.html'){
      throw new Error('Page LEGO/Briques invalide: '+JSON.stringify(lego));
    }

    // 6. LEGO -> Stock dans le vrai registre.
    await win.webContents.executeJavaScript("window.sebParcours.goNext('brique'); true;",true);
    await waitForFile(win,'stock.html');
    await sleep(350);

    const stock=await win.webContents.executeJavaScript(`
      ({
        exercise:document.body.dataset.kaloneoExercise||'',
        layout:document.body.dataset.kaloneoLayout||'',
        pots:document.querySelectorAll('.pot').length,
        cases:document.querySelectorAll('.case').length,
        engine:Boolean(window.sebStock)
      })
    `,true);
    if(stock.exercise!=='stock' || stock.pots!==34 || !stock.engine){
      throw new Error('Page Stock absente/invalide: '+JSON.stringify(stock));
    }

    console.log('FULL_PILOT_JOURNEY_SMOKE: OK');
    console.log('INTRO_KALONEO=OK');
    console.log('KALTEST_HANDOFF=autoeval1.html');
    console.log('BRIQUE_VIDEO='+video.src);
    console.log('LEGO_PAGE=OK');
    console.log('STOCK_PAGE=OK pots='+stock.pots+' cases='+stock.cases);

    win.destroy();
    app.exit(0);
  }catch(error){
    console.error('FULL_PILOT_JOURNEY_SMOKE: FAIL — '+(error?.message||error));
    if(error?.stack) console.error(error.stack);
    try{win.destroy();}catch(_){}
    app.exit(2);
  }
}).catch(error=>{
  console.error(error);
  app.exit(2);
});

setTimeout(()=>{
  console.error('FULL_PILOT_JOURNEY_SMOKE: TIMEOUT');
  app.exit(3);
},45000);
