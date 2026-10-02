const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');

function fail(message, details) {
  console.error('PILOT7_START_PAGE_SMOKE: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function applyAdaptiveZoom(win) {
  const DESIGN_WIDTH = 1600;
  const DESIGN_HEIGHT = 900;
  const MIN_ZOOM_FACTOR = 0.60;
  const bounds = win.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const size = display && display.size ? display.size : { width:bounds.width, height:bounds.height };
  const factor = Math.max(
    MIN_ZOOM_FACTOR,
    Math.min(1, Number(size.width || DESIGN_WIDTH) / DESIGN_WIDTH, Number(size.height || DESIGN_HEIGHT) / DESIGN_HEIGHT)
  );
  win.webContents.setZoomFactor(Math.round(factor * 100) / 100);
}

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show:false,
    width:1600,
    height:900,
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      devTools:false
    }
  });

  try {
    await win.loadFile(page);
    applyAdaptiveZoom(win);
    await wait(180);

    const initial = await win.webContents.executeJavaScript(`(()=>{
      const page=document.getElementById('page-identification');
      const grid=document.querySelector('#page-identification .pilot2-form-grid');
      const firstInput=document.getElementById('nom');
      const onboarding=document.querySelector('.pilot2-onboarding');
      const actions=document.querySelector('.pilot2-identification-actions');
      const rect=page.getBoundingClientRect();
      const onboardingRect=onboarding.getBoundingClientRect();
      const actionRect=actions.getBoundingClientRect();
      return {
        visible:page.classList.contains('visible'),
        fields:grid?.querySelectorAll('.pilot2-field').length||0,
        columns:getComputedStyle(grid).gridTemplateColumns,
        inputWidth:firstInput?.getBoundingClientRect().width||0,
        onboarding:Boolean(onboarding),
        mouseScene:Boolean(document.getElementById('pilot2-mouse-scene')),
        house:Boolean(document.getElementById('pilot2-drag-house')),
        houseTarget:Boolean(document.getElementById('pilot2-house-target')),
        car:Boolean(document.getElementById('pilot2-drag-car')),
        carTarget:Boolean(document.getElementById('pilot2-car-target')),
        chrono:Boolean(document.getElementById('pilot2-chrono-display')),
        calculator:Boolean(document.getElementById('pilot2-calculator-test-open')),
        audio:Boolean(document.getElementById('pilot2-audio-play')),
        api:Boolean(window.sebPilot2Onboarding),
        pageBottom:rect.bottom,
        onboardingBottom:onboardingRect.bottom,
        actionBottom:actionRect.bottom,
        viewportHeight:window.innerHeight,
        bodyScrollHeight:document.body.scrollHeight,
        bodyClientHeight:document.body.clientHeight
      };
    })()`, true);

    if (!initial.visible || initial.fields !== 8 || !initial.onboarding ||
        !initial.mouseScene || !initial.house || !initial.houseTarget ||
        !initial.car || !initial.carTarget || !initial.chrono ||
        !initial.calculator || !initial.audio || !initial.api) {
      throw new Error('La nouvelle page candidat est incomplète : ' + JSON.stringify(initial));
    }
    if (String(initial.columns).split(' ').length < 2) {
      throw new Error('Les 8 champs ne sont pas organisés sur deux colonnes.');
    }
    if (initial.inputWidth > 430) {
      throw new Error('Les champs candidat restent trop larges : ' + initial.inputWidth + ' px.');
    }
    if (initial.actionBottom > initial.viewportHeight + 3 || initial.onboardingBottom > initial.viewportHeight + 3) {
      throw new Error('La page Identification déborde verticalement : ' + JSON.stringify(initial));
    }

    const dragResult = await win.webContents.executeJavaScript(`(()=>{
      const a=window.sebPilot2Onboarding.placeHouse();
      const b=window.sebPilot2Onboarding.placeCar();
      return {
        a,b,
        state:window.sebPilot2Onboarding.state,
        houseText:document.getElementById('pilot2-house-status').textContent,
        carText:document.getElementById('pilot2-car-status').textContent
      };
    })()`, true);
    if (!dragResult.a || !dragResult.b || !dragResult.state.housePlaced || !dragResult.state.carPlaced ||
        !/bien placée/.test(dragResult.houseText) || !/bien placée/.test(dragResult.carText)) {
      throw new Error('Le test souris maison/voiture ne valide pas correctement : ' + JSON.stringify(dragResult));
    }

    await win.webContents.executeJavaScript("window.sebPilot2Onboarding.startChrono();true", true);
    await wait(1150);
    await win.webContents.executeJavaScript("window.sebPilot2Onboarding.stopChrono();true", true);
    const chrono = await win.webContents.executeJavaScript(`(()=>({
      value:document.getElementById('pilot2-chrono-display').textContent.trim(),
      status:document.getElementById('pilot2-chrono-status').textContent.trim(),
      state:window.sebPilot2Onboarding.state
    }))()`, true);
    if (!chrono.state.chronoTested || !/testé/.test(chrono.status)) {
      throw new Error('Le test chronomètre ne se termine pas correctement : ' + JSON.stringify(chrono));
    }

    await win.webContents.executeJavaScript("document.getElementById('pilot2-calculator-test-open').click();true", true);
    await wait(120);
    const calculatorDock = await win.webContents.executeJavaScript(`(()=>{
      const calc=document.getElementById('calc-container').getBoundingClientRect();
      const dock=document.getElementById('pilot2-calculator-dock').getBoundingClientRect();
      return {
        visible:getComputedStyle(document.getElementById('calc-container')).display!=='none',
        calc:{left:calc.left,right:calc.right,top:calc.top,bottom:calc.bottom,width:calc.width,height:calc.height},
        dock:{left:dock.left,right:dock.right,top:dock.top,bottom:dock.bottom,width:dock.width,height:dock.height},
        tested:window.sebPilot2Onboarding.state.calculatorTested
      };
    })()`, true);
    if (!calculatorDock.visible || !calculatorDock.tested) {
      throw new Error('Le bouton Ouvrir ne lance pas la calculatrice.');
    }
    if (calculatorDock.calc.left < calculatorDock.dock.left - 18 ||
        calculatorDock.calc.right > calculatorDock.dock.right + 18) {
      throw new Error('La calculatrice ne s’ouvre pas dans sa zone à droite : ' + JSON.stringify(calculatorDock));
    }

    await win.webContents.executeJavaScript("window.closeCalculator();document.getElementById('pilot2-audio-heard').click();true", true);
    const audio = await win.webContents.executeJavaScript(`(()=>({
      checked:document.getElementById('pilot2-audio-heard').checked,
      heard:window.sebPilot2Onboarding.state.audioHeard,
      status:document.getElementById('pilot2-audio-status').textContent.trim()
    }))()`, true);
    if (!audio.checked || !audio.heard || !/Son entendu/.test(audio.status)) {
      throw new Error('La confirmation audio ne fonctionne pas : ' + JSON.stringify(audio));
    }

    await win.webContents.executeJavaScript(`(()=>{
      const values={nom:'XX',prenom:'YY',naissance:'1966-04-17',ss7:'1660123',lieu:'Lorient',groupe:'7',dateEvaluation:'2026-10-02'};
      for(const [id,value] of Object.entries(values)){
        const el=document.getElementById(id); el.value=value; el.dispatchEvent(new Event('input',{bubbles:true}));
      }
      document.getElementById('identity-next').click();
      return true;
    })()`, true);
    await wait(120);

    const intro = await win.webContents.executeJavaScript(`(()=>({
      visible:document.getElementById('page-intro').classList.contains('visible'),
      guide:document.querySelector('#page-intro .pilot2-calculator-guide')?.getBoundingClientRect(),
      image:document.querySelector('#page-intro .pilot2-intro-cover img')?.getBoundingClientRect(),
      cover:document.querySelector('#page-intro .pilot2-intro-cover')?.getBoundingClientRect(),
      button:Boolean(document.querySelector('#page-intro [data-seb-action="open-calculator"]'))
    }))()`, true);
    if (!intro.visible || !intro.button) throw new Error('La page Introduction n’est plus accessible.');

    await win.webContents.executeJavaScript("document.querySelector('#page-intro [data-seb-action="open-calculator"]').click();true", true);
    await wait(120);
    const introCalc = await win.webContents.executeJavaScript(`(()=>{
      const calc=document.getElementById('calc-container').getBoundingClientRect();
      const guide=document.querySelector('#page-intro .pilot2-calculator-guide').getBoundingClientRect();
      return {
        calcLeft:calc.left,calcRight:calc.right,guideRight:guide.right,
        rightGap:window.innerWidth-calc.right,
        visible:getComputedStyle(document.getElementById('calc-container')).display!=='none'
      };
    })()`, true);
    if (!introCalc.visible || introCalc.rightGap > 35 || introCalc.calcLeft < introCalc.guideRight + 10) {
      throw new Error('Sur Introduction, la calculatrice masque encore le texte : ' + JSON.stringify(introCalc));
    }

    console.log('PILOT7_START_PAGE_SMOKE: OK');
    console.log('PILOT7_IDENTITY_TWO_COLUMNS=OK');
    console.log('PILOT7_MOUSE_HOUSE_CAR=OK');
    console.log('PILOT7_CHRONO=OK');
    console.log('PILOT7_CALCULATOR_DOCK_RIGHT=OK');
    console.log('PILOT7_AUDIO_CONFIRM=OK');
    console.log('PILOT7_INTRO_CALCULATOR_RIGHT=OK');

    win.destroy();
    app.exit(0);
  } catch (error) {
    try { if (!win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error && error.message ? error.message : String(error));
  }
}).catch(error => fail('Initialisation Electron impossible', error && error.message ? error.message : String(error)));

setTimeout(() => fail('Timeout global du smoke PILOTE 7.'), 70000);
