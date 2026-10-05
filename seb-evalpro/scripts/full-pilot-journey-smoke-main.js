const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'app', 'web');
const kaltest = path.join(web, 'kaltest-pilot2.html');

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function locationInfo(win){
  const url = new URL(win.webContents.getURL());
  return {
    file:path.basename(url.pathname),
    search:url.search,
    hash:url.hash,
    segment:url.searchParams.get('segment') || '',
    page:url.searchParams.get('page') || ''
  };
}

async function waitForLocation(win, predicate, label, timeout=8000){
  const start=Date.now();
  while(Date.now()-start<timeout){
    const current=locationInfo(win);
    if(predicate(current)) return current;
    await sleep(80);
  }
  throw new Error('Navigation attendue absente ('+label+'). URL='+win.webContents.getURL());
}

async function waitForFile(win, expected, timeout=8000){
  return waitForLocation(win, current=>current.file===expected, expected, timeout);
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

    // 1. Page 1 + Introduction restent l'entrée unique du PILOTE 11.
    await win.webContents.executeJavaScript(`
      sessionStorage.removeItem('seb_kaltest_pilot2_state_v1');
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
        next:document.getElementById('intro-next')?.textContent.trim()||'',
        segment:window.sebKaltestPilot2?.segment||'',
        activeTests:window.sebKaltestPilot2?.activeTests||[],
        parcoursMode:window.sebParcours?.mode||''
      })
    `,true);

    const expectedInitial=[
      'calculs_commandes_atelier',
      'calculs_poids_volumes',
      'horaires_reception_controle',
      'texte_a_trous_stage_logistique'
    ];
    if(!intro.visible || !intro.videoCard || !intro.animation ||
       intro.segment!=='initial' || intro.parcoursMode!=='pilot11' ||
       JSON.stringify(intro.activeTests)!==JSON.stringify(expectedInitial)){
      throw new Error('Entrée PILOTE 11 invalide: '+JSON.stringify(intro));
    }

    // 2. Fin du 4e KALTEST initial -> Fractions KALTEST. Les exercices 4/5/5_1
    // conservent leur position historique mais ne passent plus par qcmv1.0.html.
    await win.webContents.executeJavaScript(`
      sessionStorage.setItem('seb_kaltest_pilot2_state_v1', JSON.stringify({
        phase:'exercise',
        testIndex:3,
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

    const initialLast=await win.webContents.executeJavaScript(`
      ({
        id:window.sebKaltestPilot2.currentTest()?.id||'',
        active:window.sebKaltestPilot2.activeTests,
        full:new URLSearchParams(location.search).get('fullParcours')
      })
    `,true);
    if(initialLast.id!=='texte_a_trous_stage_logistique' || initialLast.active.length!==4 || initialLast.full!=='1'){
      throw new Error('Dernier KALTEST initial incorrect: '+JSON.stringify(initialLast));
    }

    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForLocation(win, current=>current.file==='kaltest-pilot2.html' && current.segment==='fractions', 'Fractions KALTEST');
    await sleep(450);

    const page4=await win.webContents.executeJavaScript(`
      ({
        current:window.sebKaltestPilot2.currentTest()?.id||'',
        mode:window.sebParcours?.mode||'',
        next4:window.sebParcours?.nextUrl('qcm-4')||'',
        next5:window.sebParcours?.nextUrl('qcm-5')||'',
        next51:window.sebParcours?.nextUrl('qcm-5_1')||'',
        ids:window.sebParcours?.steps?.map(step=>step.id)||[]
      })
    `,true);

    const expectedPilotIds=[
      'kaltest-initial','qcm-4','qcm-5','qcm-5_1','qcm-6',
      'autoeval1','introbrique','brique','stock','planning','genrenombres','dictee',
      'tri-de-cheville','nwtexte','nvmail','autoeval2','paronymes','carre','qcm-11','qcm-finale'
    ];
    const page4Location=locationInfo(win);
    if(page4.current!=='fractions_preparation_lots' || page4.mode!=='pilot11' || page4Location.search.indexOf('fullParcours=1')<0 ||
       page4.next4!=='kaltest-pilot2.html?fullParcours=1&segment=organisation' ||
       page4.next5!=='kaltest-pilot2.html?fullParcours=1&segment=postures' ||
       page4.next51!=='kaltest-pilot2.html?fullParcours=1&segment=conversions' ||
       JSON.stringify(page4.ids)!==JSON.stringify(expectedPilotIds)){
      throw new Error('Ordre central PILOTE 11 invalide: '+JSON.stringify(page4));
    }

    // 3. Fractions -> Organisation -> Postures sont maintenant trois KALTEST.
    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForLocation(win, current=>current.file==='kaltest-pilot2.html' && current.segment==='organisation', 'Organisation KALTEST');
    await sleep(350);
    const organisation=await win.webContents.executeJavaScript("window.sebKaltestPilot2.currentTest()?.id||''",true);
    if(organisation!=='organisation_demenagement') throw new Error('Organisation KALTEST absente: '+organisation);

    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForLocation(win, current=>current.file==='kaltest-pilot2.html' && current.segment==='postures', 'Postures KALTEST');
    await sleep(350);
    const postures=await win.webContents.executeJavaScript("window.sebKaltestPilot2.currentTest()?.id||''",true);
    if(postures!=='gestes_postures') throw new Error('Postures KALTEST absentes: '+postures);

    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForLocation(win, current=>current.file==='kaltest-pilot2.html' && current.segment==='conversions', 'Conversions KALTEST');
    await sleep(500);

    const conversions=await win.webContents.executeJavaScript(`
      ({
        current:window.sebKaltestPilot2.currentTest()?.id||'',
        segment:window.sebKaltestPilot2.segment,
        active:window.sebKaltestPilot2.activeTests,
        exercise:document.getElementById('page-exercise')?.classList.contains('visible')||false,
        identification:document.getElementById('page-identification')?.classList.contains('visible')||false
      })
    `,true);
    if(conversions.current!=='conversions_atelier_expedition' ||
       conversions.segment!=='conversions' ||
       JSON.stringify(conversions.active)!==JSON.stringify(['conversions_atelier_expedition']) ||
       !conversions.exercise || conversions.identification){
      throw new Error('Segment Conversions invalide: '+JSON.stringify(conversions));
    }

    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForFile(win,'autoeval1.html');

    // 4. Autoévaluation -> vraie introduction vidéo Briques -> LEGO -> Stock.
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

    const lego=await win.webContents.executeJavaScript(`
      ({
        exercise:document.body.dataset.kaloneoExercise||'',
        chrono:Boolean(document.getElementById('startBtn')&&document.getElementById('stopBtn')),
        next:window.sebParcours?.nextFile('brique')||''
      })
    `,true);
    if(lego.exercise!=='brique' || !lego.chrono || lego.next!=='stock.html'){
      throw new Error('Page LEGO/Briques invalide: '+JSON.stringify(lego));
    }

    await win.webContents.executeJavaScript("window.sebParcours.goNext('brique'); true;",true);
    await waitForFile(win,'stock.html');
    await sleep(350);

    const stock=await win.webContents.executeJavaScript(`
      ({
        exercise:document.body.dataset.kaloneoExercise||'',
        pots:document.querySelectorAll('.pot').length,
        cases:document.querySelectorAll('.case').length,
        engine:Boolean(window.sebStock),
        next:window.sebParcours?.nextUrl('stock')||''
      })
    `,true);
    if(stock.exercise!=='stock' || stock.pots!==34 || !stock.engine || stock.next!=='planning.html?fullParcours=1'){
      throw new Error('Page Stock absente/invalide: '+JSON.stringify(stock));
    }

    // 5. Planning est lui aussi un KALTEST, puis mène au Genre/Nombre KALTEST.
    await win.webContents.executeJavaScript("window.sebParcours.goNext('stock'); true;",true);
    await waitForLocation(win, current=>current.file==='kaltest-pilot2.html' && current.segment==='planning', 'Planning KALTEST');
    await sleep(350);

    const planning=await win.webContents.executeJavaScript(`
      ({
        current:window.sebKaltestPilot2.currentTest()?.id||'',
        next:window.sebParcours?.nextUrl('planning')||'',
        rows:document.querySelectorAll('.kaltest-planning-table tbody tr').length
      })
    `,true);
    if(planning.current!=='planning_cantine' ||
       planning.next!=='kaltest-pilot2.html?fullParcours=1&segment=genre-nombre' ||
       planning.rows!==3){
      throw new Error('Planning KALTEST invalide: '+JSON.stringify(planning));
    }

    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForLocation(win, current=>current.file==='kaltest-pilot2.html' && current.segment==='genre-nombre', 'Genre/Nombre KALTEST');
    await sleep(450);

    const genre=await win.webContents.executeJavaScript(`
      ({
        current:window.sebKaltestPilot2.currentTest()?.id||'',
        segment:window.sebKaltestPilot2.segment,
        active:window.sebKaltestPilot2.activeTests
      })
    `,true);
    if(genre.current!=='genre_nombre' || genre.segment!=='genre-nombre' ||
       JSON.stringify(genre.active)!==JSON.stringify(['genre_nombre'])){
      throw new Error('Segment Genre/Nombre invalide: '+JSON.stringify(genre));
    }

    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForFile(win,'dictee.html');
    await sleep(250);

    // 6. Milieu de parcours inchangé, puis Autoévaluation 2 -> Paronymes KALTEST.
    const middle=await win.webContents.executeJavaScript(`
      ({
        dictee:window.sebParcours?.nextUrl('dictee')||'',
        tri:window.sebParcours?.nextUrl('tri-de-cheville')||'',
        nwtexte:window.sebParcours?.nextUrl('nwtexte')||'',
        nvmail:window.sebParcours?.nextUrl('nvmail')||'',
        auto2:window.sebParcours?.nextUrl('autoeval2')||''
      })
    `,true);
    if(middle.dictee!=='tri_de_cheville.html?fullParcours=1' ||
       middle.tri!=='nwtexte.html?fullParcours=1' ||
       middle.nwtexte!=='nvmail.html?fullParcours=1' ||
       middle.nvmail!=='autoeval2.html?fullParcours=1' ||
       middle.auto2!=='kaltest-pilot2.html?fullParcours=1&segment=paronymes'){
      throw new Error('Milieu/fin de parcours PILOTE 11 incorrect: '+JSON.stringify(middle));
    }

    await win.webContents.executeJavaScript("window.sebParcours.goTo('autoeval2'); true;",true);
    await waitForFile(win,'autoeval2.html');
    await sleep(250);
    await win.webContents.executeJavaScript("window.sebParcours.goNext('autoeval2'); true;",true);
    await waitForLocation(win, current=>current.file==='kaltest-pilot2.html' && current.segment==='paronymes', 'Paronymes KALTEST');
    await sleep(450);

    const paronymes=await win.webContents.executeJavaScript(`
      ({
        current:window.sebKaltestPilot2.currentTest()?.id||'',
        segment:window.sebKaltestPilot2.segment,
        active:window.sebKaltestPilot2.activeTests
      })
    `,true);
    if(paronymes.current!=='paronymes_rapport' || paronymes.segment!=='paronymes' ||
       JSON.stringify(paronymes.active)!==JSON.stringify(['paronymes_rapport'])){
      throw new Error('Segment Paronymes invalide: '+JSON.stringify(paronymes));
    }

    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot2.onAbandon({nonEvaluated:true,reasons:['smoke'],comment:''}); true;",
      true
    );
    await waitForFile(win,'carre.html');
    await sleep(250);

    const ending=await win.webContents.executeJavaScript(`
      ({
        afterCarre:window.sebParcours?.nextUrl('carre')||'',
        after11:window.sebParcours?.nextUrl('qcm-11')||''
      })
    `,true);
    if(ending.afterCarre!=='qcmv1.0.html?fullParcours=1&page=11#page11' ||
       ending.after11!=='qcmv1.0.html?fullParcours=1&page=finale#pageFinale'){
      throw new Error('Fin du parcours PILOTE 11 incorrecte: '+JSON.stringify(ending));
    }

    console.log('FULL_PILOT_JOURNEY_SMOKE: OK');
    console.log('PILOT11_INITIAL_KALTESTS='+expectedInitial.join(','));
    console.log('PILOT11_KALTEST_4_5_5_1=Fractions,Organisation,Postures');
    console.log('PILOT11_CONVERSIONS_AT_CORRECT_POSITION=OK');
    console.log('BRIQUE_VIDEO='+video.src);
    console.log('LEGO_PAGE=OK');
    console.log('STOCK_PAGE=OK pots='+stock.pots+' cases='+stock.cases);
    console.log('PILOT11_PLANNING_KALTEST=OK');
    console.log('PILOT11_GENRE_NOMBRE_AT_CORRECT_POSITION=OK');
    console.log('PILOT11_PARONYMES_AT_CORRECT_POSITION=OK');
    console.log('PILOT11_NO_DUPLICATE_MIGRATED_PAGES=OK');
    console.log('PILOT11_FINAL_ROUTE=carre -> qcm11 -> finale');

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
},70000);
