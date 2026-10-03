const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');

function fail(message, detail) {
  console.error('PILOT8_VISUAL_INTRO_SMOKE: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      devTools:false
    }
  });

  try {
    await win.loadFile(page);
    win.webContents.setZoomFactor(0.85);
    await wait(300);

    const start = await win.webContents.executeJavaScript(`(()=>{
      const mouse=document.querySelector('.pilot2-mouse-card').getBoundingClientRect();
      const side=document.querySelector('.pilot2-onboarding-side').getBoundingClientRect();
      const chrono=document.querySelector('.pilot2-chrono-card').getBoundingClientRect();
      const badge=document.querySelector('.pilot2-chrono-card .pilot2-step-badge').getBoundingClientRect();
      const startBtn=document.getElementById('pilot2-chrono-start');
      const stopBtn=document.getElementById('pilot2-chrono-stop');
      const calcBtn=document.getElementById('pilot2-calculator-test-open');
      const sc=getComputedStyle(startBtn),tc=getComputedStyle(stopBtn);
      return {
        fields:document.querySelectorAll('#page-identification .pilot2-field').length,
        pageVisible:document.getElementById('page-identification').classList.contains('visible'),
        sideTop:side.top,mouseTop:mouse.top,chronoTop:chrono.top,badgeTop:badge.top,chronoTop2:chrono.top,
        startBorder:sc.borderColor,startText:sc.color,startBg:sc.backgroundImage,
        stopBorder:tc.borderColor,stopText:tc.color,stopBg:tc.backgroundImage,stopOpacity:tc.opacity,
        calcText:String(calcBtn.textContent||'').trim(),
        calcClass:calcBtn.className,
        bodyScroll:document.body.scrollHeight,bodyClient:document.body.clientHeight,
        nextBottom:document.querySelector('.pilot2-identification-actions').getBoundingClientRect().bottom,
        viewport:window.innerHeight
      };
    })()`, true);

    if (!start.pageVisible || start.fields !== 8) throw new Error('Identification incomplète.');
    if (start.sideTop > start.mouseTop + 2) throw new Error('Les trois blocs de droite sont encore trop bas : ' + JSON.stringify(start));
    if (start.badgeTop < start.chronoTop2 - 1) throw new Error('Le badge 2 reste coupé en haut : ' + JSON.stringify(start));
    if (start.startText !== 'rgb(255, 255, 255)' || start.startBorder !== 'rgb(25, 135, 84)' || !/linear-gradient/.test(start.startBg)) {
      throw new Error('Démarrer doit être le bouton KALONÉO plein vert avec texte blanc : ' + JSON.stringify(start));
    }
    if (start.stopText !== 'rgb(255, 255, 255)' || start.stopBorder !== 'rgb(198, 40, 40)' || !/linear-gradient/.test(start.stopBg)) {
      throw new Error('Arrêter doit être le bouton KALONÉO plein rouge avec texte blanc : ' + JSON.stringify(start));
    }
    if (!/Ouvrir la calculatrice/.test(start.calcText) ||
        !/seb-action-btn/.test(start.calcClass) || !/seb-btn-calculator/.test(start.calcClass)) {
      throw new Error('Le bouton calculatrice de prise en main n’est pas le bouton réel des exercices : ' + JSON.stringify(start));
    }
    if (start.nextBottom > start.viewport + 3) throw new Error('La page de prise en main déborde verticalement : ' + JSON.stringify(start));

    await win.webContents.executeJavaScript(`(()=>{
      const values={nom:'XX',prenom:'YY',naissance:'1966-04-17',ss7:'1660123',lieu:'Lorient',groupe:'7',dateEvaluation:'2026-10-02'};
      for(const [id,value] of Object.entries(values)){
        const el=document.getElementById(id);
        el.value=value;
        el.dispatchEvent(new Event('input',{bubbles:true}));
      }
      document.getElementById('identity-next').click();
      return true;
    })()`, true);
    await wait(300);

    const intro = await win.webContents.executeJavaScript(`(()=>{
      const scene=document.getElementById('pilot2-intro-video');
      return {
        visible:document.getElementById('page-intro').classList.contains('visible'),
        scene:Boolean(scene),
        playing:scene?.classList.contains('seb-video-playing')||false,
        played:window.sebPilot2IntroVideo?.played||false,
        legacyImage:Boolean(document.querySelector('#page-intro .pilot2-intro-cover')),
        calculatorGuide:Boolean(document.querySelector('#page-intro .pilot2-calculator-guide')),
        calculatorButton:Boolean(document.querySelector('#page-intro [data-seb-action="open-calculator"]')),
        heading:String(document.querySelector('.pilot2-intro-video-heading strong')?.textContent||'').trim(),
        bodyScroll:document.body.scrollHeight,
        bodyClient:document.body.clientHeight
      };
    })()`, true);

    if (!intro.visible || !intro.scene || !intro.playing || !intro.played) {
      throw new Error('La vidéo d’introduction ne démarre pas automatiquement : ' + JSON.stringify(intro));
    }
    if (intro.legacyImage || intro.calculatorGuide || intro.calculatorButton) {
      throw new Error('L’ancienne image ou le doublon calculatrice existe encore sur la page 2 : ' + JSON.stringify(intro));
    }
    if (intro.heading !== 'Vidéo d’introduction') throw new Error('Titre vidéo incorrect : ' + JSON.stringify(intro));

    await win.webContents.executeJavaScript("window.sebPilot2IntroVideo.finish();true", true);
    await wait(60);
    const finished = await win.webContents.executeJavaScript(`(()=>{
      const scene=document.getElementById('pilot2-intro-video');
      return {playing:scene.classList.contains('seb-video-playing'),finished:scene.classList.contains('seb-video-finished'),played:window.sebPilot2IntroVideo.played};
    })()`, true);
    if (finished.playing || !finished.finished || !finished.played) {
      throw new Error('Fin de lecture vidéo incorrecte : ' + JSON.stringify(finished));
    }

    await win.webContents.executeJavaScript("(()=>{const intro=document.getElementById('page-intro');intro.classList.remove('visible');void intro.offsetWidth;intro.classList.add('visible');return true;})()", true);
    await wait(160);
    const replay = await win.webContents.executeJavaScript(`(()=>{
      const scene=document.getElementById('pilot2-intro-video');
      return {playing:scene.classList.contains('seb-video-playing'),finished:scene.classList.contains('seb-video-finished'),played:window.sebPilot2IntroVideo.played};
    })()`, true);
    if (replay.playing || !replay.finished || !replay.played) {
      throw new Error('La vidéo se relance alors qu’une seule lecture est demandée : ' + JSON.stringify(replay));
    }

    console.log('PILOT8_VISUAL_INTRO_SMOKE: OK');
    console.log('PILOT8_ONBOARDING_RIGHT_BLOCKS=RAISED');
    console.log('PILOT8_CHRONO_START=KALONEO_SOLID_GREEN');
    console.log('PILOT8_CHRONO_STOP=KALONEO_SOLID_RED');
    console.log('PILOT8_CALCULATOR_BUTTON=REAL_TEST_STYLE');
    console.log('PILOT8_INTRO_VIDEO=AUTOPLAY_ONCE');
    console.log('PILOT8_INTRO_LEGACY_IMAGE=REMOVED');
    console.log('PILOT8_INTRO_CALCULATOR_DUPLICATE=REMOVED');

    win.destroy();
    app.exit(0);
  } catch (error) {
    try { if (!win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error && error.message ? error.message : String(error), error && error.stack ? error.stack : '');
  }
}).catch(error => fail('Initialisation Electron impossible', error && error.message ? error.message : String(error)));

setTimeout(() => fail('Timeout global du smoke PILOTE 8.'), 70000);
