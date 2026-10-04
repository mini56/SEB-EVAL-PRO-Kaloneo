const { app, BrowserWindow, screen } = require('electron');
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

function applyBuild20AdaptiveZoom(win) {
  const DESIGN_WIDTH = 1600;
  const DESIGN_HEIGHT = 900;
  const MIN_ZOOM_FACTOR = 0.60;
  const bounds = win.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const size = display && display.size ? display.size : { width: bounds.width, height: bounds.height };
  const widthFactor = Number(size.width || bounds.width || DESIGN_WIDTH) / DESIGN_WIDTH;
  const heightFactor = Number(size.height || bounds.height || DESIGN_HEIGHT) / DESIGN_HEIGHT;
  const raw = Math.min(1, widthFactor, heightFactor);
  const factor = Math.max(MIN_ZOOM_FACTOR, Math.round(raw * 100) / 100);
  win.webContents.setZoomFactor(factor);
  return { factor, displayWidth:size.width, displayHeight:size.height };
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
    "({bodyScrollHeight:document.body.scrollHeight,bodyClientHeight:document.body.clientHeight,contentScrollHeight:document.getElementById('kaltest-content')?.scrollHeight||0,contentClientHeight:document.getElementById('kaltest-content')?.clientHeight||0,contentInnerHeight:document.getElementById('kaltest-content')?.firstElementChild?.getBoundingClientRect().height||0})",
    true
  );
  if (metrics.bodyScrollHeight > metrics.bodyClientHeight + 2) {
    throw new Error(label + ' : débordement vertical de la page candidat — ' + JSON.stringify(metrics));
  }
  if (metrics.contentClientHeight && metrics.contentScrollHeight > metrics.contentClientHeight + 3) {
    throw new Error(label + ' : contenu KALTEST rogné dans son bloc — ' + JSON.stringify(metrics));
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
      `(function(){const test=window.sebKaltestPilot2.currentTest();const q=test.questions[0];const input=document.querySelector('[data-question-id="'+q.id+'"]');const value=q.response?.type==='duration'?q.acceptedMinutes+' min':q.acceptedAnswers[0];input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`,
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
    const zoom = applyBuild20AdaptiveZoom(win);
    console.log('PILOT2_BUILD20_ADAPTIVE_ZOOM=' + JSON.stringify(zoom));
    await sleep(80);
    await waitReady(win);
    console.log('PILOT2_SMOKE_STAGE=ready');

    const initial = await win.webContents.executeJavaScript(
      "({page:document.querySelector('.pilot2-page.visible')?.id,tests:window.sebKaltestPilot2.data.tests.length,introVideo:Boolean(document.getElementById('pilot2-intro-video')),introLegacyImage:Boolean(document.querySelector('#page-intro .pilot2-intro-cover img')),introCalculatorGuide:Boolean(document.querySelector('#page-intro .pilot2-calculator-guide')),scenarioImage:document.querySelector('#page-exercise .kaltest-context img')?.getAttribute('src'),calculator:Boolean(document.getElementById('calc-container'))})",
      true
    );

    if (initial.page !== 'page-identification') throw new Error('Le parcours ne démarre pas par Identification.');
    if (initial.tests !== 7) throw new Error('Le PILOTE 2 doit contenir les 7 migrations KALTEST validées.');
    if (!initial.introVideo) throw new Error('Mini vidéo/animation d’introduction absente.');
    if (initial.introLegacyImage) throw new Error('L’ancienne image de couverture est encore présente sur Introduction.');
    if (initial.introCalculatorGuide) throw new Error('Le doublon de test calculatrice est encore présent sur Introduction.');
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

    const candidateMeta = await win.webContents.executeJavaScript(
      "JSON.parse(sessionStorage.getItem('candidat_data')||'{}')",
      true
    );
    if (candidateMeta.date !== '2026-10-01' || candidateMeta.dateTest !== '2026-10-01') {
      throw new Error('La date candidat n’est pas propagée vers le format SEB historique.');
    }

    console.log('PILOT2_SMOKE_STAGE=introduction');
    await assertNoOverflow(win, 'Introduction');

    await win.webContents.executeJavaScript("document.getElementById('intro-next').click();true",true);
    await sleep(70);
    if (await visiblePage(win) !== 'page-exercise') throw new Error('Introduction : premier KALTEST attendu.');

    console.log('PILOT2_SMOKE_STAGE=first-test');
    const first = await win.webContents.executeJavaScript(
      `({id:window.sebKaltestPilot2.currentTest().id,scenario:Boolean(document.querySelector('#page-exercise img[src="imageqcm/scenario.png"]')),consigne:Boolean(document.querySelector('#page-exercise img[src="imageqcm/avatar_transparant.png"]')),calcHidden:document.getElementById('kaltest-calculator').hidden})`,
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

    const abandonUi = await win.webContents.executeJavaScript(
      `(function(){const b=document.getElementById('seb-evalpro-abandon-fixed');if(!b)return {button:false};b.click();const layer=document.getElementById('seb-evalpro-abandon-layer');const out={button:true,reasons:layer?.querySelectorAll('input[data-abandon-reason="1"]').length||0,ne:Boolean(layer?.querySelector('#seb-evalpro-abandon-ne')),password:Boolean(layer?.querySelector('#seb-evalpro-abandon-admin-password'))};layer?.querySelector('#seb-evalpro-abandon-cancel')?.click();return out;})()`,
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

      const visualContract = await win.webContents.executeJavaScript(
        "(function(){const test=window.sebKaltestPilot2.currentTest();return {compatible:test.calculator?.compatible===true,calcDisplay:getComputedStyle(document.getElementById('kaltest-calculator')).display,durationPlaceholders:Array.from(document.querySelectorAll('[data-question-id]')).filter(el=>/ex\\./i.test(el.getAttribute('placeholder')||'')).length,textGapBreaks:document.querySelectorAll('.kaltest-inline-flow br').length,genreTables:document.querySelectorAll('.kaltest-two-tables .kaltest-grammar-table').length,choiceFont:document.querySelector('.kaltest-choice-table')?parseFloat(getComputedStyle(document.querySelector('.kaltest-choice-table')).fontSize):null};})()",
        true
      );

      if (!visualContract.compatible && visualContract.calcDisplay !== 'none') {
        throw new Error(testId + ' : bouton Calculatrice visible alors que le test est incompatible.');
      }
      if (testId === 'horaires_reception_controle' && visualContract.durationPlaceholders) {
        throw new Error('Réception / contrôle : exemples de réponses encore affichés dans les champs.');
      }
      if (testId === 'texte_a_trous_stage_logistique' && visualContract.textGapBreaks !== 14) {
        throw new Error('Texte à trous : retours à la ligne de fin de phrase incorrects : ' + JSON.stringify(visualContract));
      }
      if (testId === 'genre_nombre' && visualContract.genreTables !== 2) {
        throw new Error('Genre / Nombre : les deux tableaux Build #20 ne sont pas rendus.');
      }
      if (testId === 'paronymes_rapport' && (!visualContract.choiceFont || visualContract.choiceFont < 14)) {
        throw new Error('Paronymes : police trop petite pour un test réel.');
      }

      await fillOneAnswer(win);
      await win.webContents.executeJavaScript("document.getElementById('kaltest-next').click();true",true);
      await sleep(70);

      if (index === 0) {
        const calcAfterNavigation = await win.webContents.executeJavaScript(
          "getComputedStyle(document.getElementById('calc-container')).display",
          true
        );
        if (calcAfterNavigation !== 'none') {
          throw new Error('La calculatrice reste ouverte après un changement d’exercice.');
        }
      }
    }

    if (await visiblePage(win) !== 'page-final') throw new Error('Page finale système attendue après les 7 tests.');

    const finalAudit = await win.webContents.executeJavaScript(
      "(function(){const sc=JSON.parse(sessionStorage.getItem('scores_data')||'{}');const cand=JSON.parse(sessionStorage.getItem('candidat_data')||'{}');return {congrats:/Félicitations/.test(document.getElementById('page-final')?.textContent||''),date:cand.date,requiredLegacy:['page2_q1','page2_1_q6','page3_q1','pageTexteTrous','page6_q1'].every(k=>Object.prototype.hasOwnProperty.call(sc,k)),paronymes:sessionStorage.getItem('paronymes_score')!==null,genre:sessionStorage.getItem('erreurs_exercice')!==null};})()",
      true
    );
    if (!finalAudit.congrats) throw new Error('La page finale Félicitations du Build #20 n’est pas restaurée.');
    if (!finalAudit.requiredLegacy || !finalAudit.paronymes || !finalAudit.genre) {
      throw new Error('Le pont KALTEST → Résultats/Bilan historiques est incomplet : ' + JSON.stringify(finalAudit));
    }

    console.log('KALTEST_PILOT2_FUNCTIONAL_SMOKE: OK');
    console.log('PILOT2_REAL_SEB_VISUALS=Introduction video + Scenario/Consigne icons');
    console.log('PILOT2_DYNAMIC_TESTS=7');
    console.log('PILOT2_RENDERERS=basic + duration table + inline gaps + supplemental fields + two tables + single choice');
    console.log('PILOT2_FLOATING_CALCULATOR=OK');
    console.log('PILOT2_ABANDON_UI=4 reasons + admin password + NE');
    console.log('PILOT2_NO_VERTICAL_OVERFLOW=OK');
    console.log('PILOT2_FINAL_PAGE=BUILD20_CONGRATULATIONS');
    console.log('PILOT2_LEGACY_RESULTS_BRIDGE=OK');
    console.log('PILOT2_CALCULATOR_CLOSE_ON_NAVIGATION=OK');
    console.log('PILOT2_GENRE_NOMBRE_TWO_TABLES=OK');
    console.log('PILOT2_PARONYMES_READABILITY=OK');

    win.destroy();
    app.exit(0);
  } catch (error) {
    try { if (!win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error && error.message ? error.message : String(error), error && error.stack ? error.stack : '');
  }
}).catch(error => fail('Initialisation Electron impossible', error && error.stack ? error.stack : String(error)));

setTimeout(() => fail('Timeout global du smoke test PILOTE 2.'), 80000);
