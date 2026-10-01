const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');

function fail(message, detail) {
  console.error('KALTEST_PILOT2_FUNCTIONAL_SMOKE: FAIL — ' + message);
  if (detail) console.error(detail);
  app.exit(2);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitReady(win) {
  for (let i = 0; i < 160; i += 1) {
    const ready = await win.webContents.executeJavaScript(
      "Boolean(window.sebKaltestPilot2 && window.sebKaltestPilot2.data && window.sebKaltestPilot2.data.tests && window.sebKaltestPilot2.data.tests.length)",
      true
    ).catch(() => false);
    if (ready) return;
    await sleep(50);
  }
  throw new Error('Le moteur PILOTE 2 ne devient pas prêt.');
}

async function visiblePage(win) {
  return win.webContents.executeJavaScript(
    "document.querySelector('.pilot2-page.visible')?.id || ''",
    true
  );
}

async function assertNoOverflow(win, label) {
  const metrics = await win.webContents.executeJavaScript(
    "({bodyScrollHeight:document.body.scrollHeight,bodyClientHeight:document.body.clientHeight,contentScrollHeight:document.getElementById('kaltest-content')?.scrollHeight||0,contentClientHeight:document.getElementById('kaltest-content')?.clientHeight||0})",
    true
  );
  if (metrics.bodyScrollHeight > metrics.bodyClientHeight + 2) {
    throw new Error(label + ' : débordement vertical de la page candidat.');
  }
  if (metrics.contentClientHeight && metrics.contentScrollHeight > metrics.contentClientHeight + 3) {
    throw new Error(label + ' : contenu KALTEST rogné dans son bloc.');
  }
}

async function perfectResult(win) {
  return win.webContents.executeJavaScript(
    "(function(){const test=window.sebKaltestPilot2.currentTest();const answers={};for(const q of test.questions||[]){if(q.response?.type==='duration')answers[q.id]=q.acceptedMinutes+' min';else answers[q.id]=Array.isArray(q.acceptedAnswers)?q.acceptedAnswers[0]:'';}return window.sebKaltestPilot2.evaluateTest(test,{answers,units:{},supplemental:{}});})()",
    true
  );
}

async function fillOneAnswer(win) {
  const choice = await win.webContents.executeJavaScript(
    "Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.choiceTable)",
    true
  );

  if (choice) {
    await win.webContents.executeJavaScript(
      "(function(){const test=window.sebKaltestPilot2.currentTest();const q=test.questions[0];const row=document.querySelector('.kaltest-choice-table tbody tr');const cells=Array.from(row.querySelectorAll('.kaltest-choice'));const target=cells.find(cell=>cell.textContent.trim()===q.acceptedAnswers[0]);target.click();return true;})()",
      true
    );
  } else {
    await win.webContents.executeJavaScript(
      "(function(){const test=window.sebKaltestPilot2.currentTest();const q=test.questions[0];const input=document.querySelector('[data-question-id="'+q.id+'"]');const value=q.response?.type==='duration'?q.acceptedMinutes+' min':q.acceptedAnswers[0];input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()",
      true
    );
  }
  await sleep(40);
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
    console.log('PILOT2_SMOKE_STAGE=load');
    await win.loadFile(page);
    await waitReady(win);
    console.log('PILOT2_SMOKE_STAGE=ready');

    const initial = await win.webContents.executeJavaScript(
      "({page:document.querySelector('.pilot2-page.visible')?.id,tests:window.sebKaltestPilot2.data.tests.length,introImage:document.querySelector('#page-intro .pilot2-intro-cover img')?.getAttribute('src'),scenarioImage:document.querySelector('#page-exercise .kaltest-context img')?.getAttribute('src'),calculator:Boolean(document.getElementById('calc-container'))})",
      true
    );

    if (initial.page !== 'page-identification') throw new Error('Le parcours ne démarre pas par Identification.');
    if (initial.tests !== 7) throw new Error('Le PILOTE 2 doit contenir les 7 migrations KALTEST validées.');
    if (initial.introImage !== 'imageqcm/image_cover.png') throw new Error('Image historique de la page Introduction absente.');
    if (initial.scenarioImage !== 'imageqcm/scenario.png') throw new Error('Icône Scénario historique absente.');
    if (!initial.calculator) throw new Error('Calculatrice flottante centrale absente.');

    await win.webContents.executeJavaScript(
      "(function(){const values={nom:'XX',prenom:'YY',naissance:'1966-04-17',ss7:'12345',lieu:'Lorient',groupe:'7',dateEvaluation:'2026-10-01'};for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}document.getElementById('identity-next').click();return true;})()",
      true
    );
    await sleep(50);

    const invalid = await win.webContents.executeJavaScript(
      "({page:document.querySelector('.pilot2-page.visible')?.id,msg:document.getElementById('identity-status').textContent})",
      true
    );
    if (invalid.page !== 'page-identification' || !/7 premiers chiffres/.test(invalid.msg)) {
      throw new Error('Contrôle SS7 incorrect.');
    }

    await win.webContents.executeJavaScript(
      "(function(){const el=document.getElementById('ss7');el.value='1660123';el.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('identity-next').click();return true;})()",
      true
    );
    await sleep(50);
    if (await visiblePage(win) !== 'page-intro') throw new Error('Identification valide : Introduction attendue.');

    console.log('PILOT2_SMOKE_STAGE=introduction');
    await assertNoOverflow(win, 'Introduction');

    await win.webContents.executeJavaScript("document.getElementById('intro-next').click();true",true);
    await sleep(70);
    if (await visiblePage(win) !== 'page-exercise') throw new Error('Introduction : premier KALTEST attendu.');

    console.log('PILOT2_SMOKE_STAGE=first-test');
    const first = await win.webContents.executeJavaScript(
      "({id:window.sebKaltestPilot2.currentTest().id,scenario:Boolean(document.querySelector('#page-exercise img[src="imageqcm/scenario.png"]')),consigne:Boolean(document.querySelector('#page-exercise img[src="imageqcm/avatar_transparant.png"]')),calcHidden:document.getElementById('kaltest-calculator').hidden})",
      true
    );
    if (first.id !== 'calculs_commandes_atelier') throw new Error('Premier KALTEST inattendu.');
    if (!first.scenario || !first.consigne) throw new Error('Icônes Scénario / Consigne absentes.');
    if (first.calcHidden) throw new Error('Calculatrice compatible non proposée.');

    await win.webContents.executeJavaScript("document.getElementById('kaltest-calculator').click();true",true);
    const calcVisible = await win.webContents.executeJavaScript(
      "getComputedStyle(document.getElementById('calc-container')).display !== 'none'",
      true
    );
    if (!calcVisible) throw new Error('La calculatrice flottante ne s’ouvre pas.');
    await win.webContents.executeJavaScript("document.getElementById('close').click();true",true);

    const abandonUi = await win.webContents.executeJavaScript(
      "(function(){const b=document.getElementById('seb-evalpro-abandon-fixed');if(!b)return {button:false};b.click();const layer=document.getElementById('seb-evalpro-abandon-layer');const out={button:true,reasons:layer?.querySelectorAll('input[data-abandon-reason="1"]').length||0,ne:Boolean(layer?.querySelector('#seb-evalpro-abandon-ne')),password:Boolean(layer?.querySelector('#seb-evalpro-abandon-admin-password'))};layer?.querySelector('#seb-evalpro-abandon-cancel')?.click();return out;})()",
      true
    );
    if (!abandonUi.button || abandonUi.reasons !== 4 || !abandonUi.ne || !abandonUi.password) {
      throw new Error('Fenêtre Abandon centrale incomplète.');
    }

    const expectedIds = [
      'calculs_commandes_atelier',
      'calculs_poids_volumes',
      'horaires_reception_controle',
      'texte_a_trous_stage_logistique',
      'conversions_atelier_expedition',
      'genre_nombre',
      'paronymes_rapport'
    ];

    for (let index = 0; index < expectedIds.length; index += 1) {
      console.log('PILOT2_SMOKE_STAGE=test-' + (index + 1) + '-' + expectedIds[index]);
      const testId = await win.webContents.executeJavaScript("window.sebKaltestPilot2.currentTest().id",true);
      if (testId !== expectedIds[index]) {
        throw new Error('Ordre KALTEST incorrect : attendu ' + expectedIds[index] + ', trouvé ' + testId);
      }

      const perfect = await perfectResult(win);
      const questionCount = await win.webContents.executeJavaScript("window.sebKaltestPilot2.currentTest().questions.length",true);
      if (perfect.score !== perfect.scoreMax || perfect.scoreMax !== questionCount) {
        throw new Error(testId + ' : moteur de correction partagé incorrect.');
      }

      await assertNoOverflow(win, testId);
      await fillOneAnswer(win);
      await win.webContents.executeJavaScript("document.getElementById('kaltest-next').click();true",true);
      await sleep(70);
    }

    if (await visiblePage(win) !== 'page-final') throw new Error('Page finale système attendue après les 7 tests.');

    console.log('KALTEST_PILOT2_FUNCTIONAL_SMOKE: OK');
    console.log('PILOT2_REAL_SEB_VISUALS=Introduction image + Scenario/Consigne icons');
    console.log('PILOT2_DYNAMIC_TESTS=7');
    console.log('PILOT2_RENDERERS=basic + duration table + inline gaps + supplemental fields + two tables + single choice');
    console.log('PILOT2_FLOATING_CALCULATOR=OK');
    console.log('PILOT2_ABANDON_UI=4 reasons + admin password + NE');
    console.log('PILOT2_NO_VERTICAL_OVERFLOW=OK');
    console.log('PILOT2_FINAL_PAGE=OK');

    win.destroy();
    app.exit(0);
  } catch (error) {
    try { if (!win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error && error.message ? error.message : String(error), error && error.stack ? error.stack : '');
  }
}).catch(error => fail('Initialisation Electron impossible', error && error.stack ? error.stack : String(error)));

setTimeout(() => fail('Timeout global du smoke test PILOTE 2.'), 80000);
