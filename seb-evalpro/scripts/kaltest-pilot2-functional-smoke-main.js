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
    "(()=>{const metric=(sel)=>{const el=document.querySelector(sel);return el?{scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,height:el.getBoundingClientRect().height}:null};return {bodyScrollHeight:document.body.scrollHeight,bodyClientHeight:document.body.clientHeight,contentScrollHeight:document.getElementById('kaltest-content')?.scrollHeight||0,contentClientHeight:document.getElementById('kaltest-content')?.clientHeight||0,contentInnerHeight:document.getElementById('kaltest-content')?.firstElementChild?.getBoundingClientRect().height||0,stock:{layout:metric('.kaltest-stock-layout'),left:metric('.kaltest-stock-left'),source:metric('.kaltest-stock-zone'),pots:metric('.kaltest-stock-pots'),shelves:metric('.kaltest-stock-shelves'),shelf1:metric('.kaltest-stock-shelf.shelf-1'),shelf2:metric('.kaltest-stock-shelf.shelf-2'),shelf3:metric('.kaltest-stock-shelf.shelf-3')}}})()",
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
    "(function(){const test=window.sebKaltestPilot2.currentTest();const answers={};for(const q of test.questions||[]){if(q.response?.type==='duration')answers[q.id]=q.acceptedMinutes+' min';else answers[q.id]=Array.isArray(q.acceptedAnswers)?q.acceptedAnswers[0]:'';}for(const group of test.evaluation?.uniqueGroups||[]){(group.questionIds||[]).forEach((id,index)=>{answers[id]=(group.allowedValues||[])[index]||'';});}if(test.id==='dictee_professionnelle'){answers.dictee_text=window.sebKaltestDicteeEngine.reference;}if(test.id==='redaction_email'){answers.mail_to='conseil.perso@sauvegarde56.org';answers.mail_cc='stage-pro@sauvegarde56.org';answers.mail_subject='YY Mail-SEB';answers.mail_file='Rapport_stage.docx';answers.mail_signature='Bonjour. Cordialement, YY XX 01.02.34.56.78';answers.mail_phone=answers.mail_signature;}return window.sebKaltestPilot2.evaluateTest(test,{answers,units:{},supplemental:{}});})()",
    true
  );
}

async function fillOneAnswer(win) {
  const mode = await win.webContents.executeJavaScript(
    "({choice:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.choiceTable),fractions:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.fractionSelection),autoeval:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.autoevaluationForm),tri:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.triStation),dictation:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.dictation),mail:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.mailComposer),brique:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.bricksStation),editor:Boolean((window.sebKaltestPilot2.currentTest()?.presentation?.builderContent||[]).some(x=>x.type==='text-editor')),transition:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.transitionVideo),terminal:Boolean(window.sebKaltestPilot2.currentTest()?.presentation?.endPage)})",
    true
  );

  if (mode.transition || mode.terminal) {
    // La transition et la page terminale ne demandent aucune saisie candidat.
  } else if (mode.brique) {
    await win.webContents.executeJavaScript(
      "(function(){document.getElementById('startBtn')?.click();document.getElementById('stopBtn')?.click();const e=document.getElementById('nivDiff');e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));const c=document.getElementById('secretCode');c.value='svg56';document.getElementById('validBtn')?.click();const a=document.querySelector('.kaltest-brique-auto-choice input');if(a&&!a.checked)a.click();document.getElementById('autoEvalBtn')?.click();return true;})()",
      true
    );
  } else if (mode.editor) {
    await win.webContents.executeJavaScript(
      "(function(){const root=document.querySelector('.kaltest-text-editor-tool .ql-editor');if(!root)return false;root.innerHTML='<p><strong>Quelle est mon activité préférée et pourquoi ?</strong></p><p>Ligne 1</p><p>Ligne 2</p><p>Ligne 3</p><p>Ligne 4</p><p>Ligne 5</p><p>Ligne 6</p><p>Ligne 7</p><p>Ligne 8</p><p>Ligne 9</p><p>Ligne 10</p>';root.dispatchEvent(new Event('input',{bubbles:true}));return true;})()",
      true
    );
  } else if (mode.fractions) {
    await win.webContents.executeJavaScript(
      "document.querySelector('.kaltest-fraction-item')?.click();true",
      true
    );
  } else if (mode.autoeval) {
    await win.webContents.executeJavaScript(
      "document.querySelector('.kaltest-autoeval-choice input')?.click();true",
      true
    );
  } else if (mode.tri) {
    await win.webContents.executeJavaScript(
      "(function(){for(let i=0;i<3;i++){document.querySelector('.kaltest-tri-chrono-buttons .seb-btn-timer-start').click();document.querySelector('.kaltest-tri-chrono-buttons .seb-btn-timer-stop').click();const e=document.querySelectorAll('[data-tri-error]')[i];e.value=String(i);e.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('.kaltest-tri-results-button').click();document.querySelector('.kaltest-tri-auto-choice input').click();document.querySelector('.kaltest-tri-auto-validate').click();return true;})()",
      true
    );
  } else if (mode.dictation) {
    await win.webContents.executeJavaScript(
      "(function(){const area=document.querySelector('.kaltest-dictee-writing textarea');area.value='Texte de test';area.dispatchEvent(new Event('input',{bubbles:true}));return true;})()",
      true
    );
  } else if (mode.mail) {
    await win.webContents.executeJavaScript(
      `(function(){const input=document.querySelector('.kaltest-mail-composer input[data-question-id="mail_to"]');input.value='conseil.perso@sauvegarde56.org';input.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`,
      true
    );
  } else if (mode.choice) {
    await win.webContents.executeJavaScript(
      "(function(){const test=window.sebKaltestPilot2.currentTest();const q=test.questions[0];const row=document.querySelector('.kaltest-choice-table tbody tr');const cells=Array.from(row.querySelectorAll('.kaltest-choice'));const target=cells.find(cell=>cell.textContent.trim()===q.acceptedAnswers[0]);target.click();return true;})()",
      true
    );
  } else {
    await win.webContents.executeJavaScript(
      `(function(){const test=window.sebKaltestPilot2.currentTest();const q=test.questions[0];const input=document.querySelector('[data-question-id="'+q.id+'"]');const value=q.response?.type==='duration'?q.acceptedMinutes+' min':q.acceptedAnswers[0];input.value=String(value);input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true}));return true;})()`,
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
    if (initial.tests !== 22) throw new Error('Le moteur doit contenir les 22 définitions KALTEST du parcours de base.');
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
      'fractions_preparation_lots',
      'organisation_demenagement',
      'gestes_postures',
      'conversions_atelier_expedition',
      'autoevaluation_savoirs',
      'transition_video_f1',
      'construction_briques',
      'ranger_stock',
      'planning_cantine',
      'genre_nombre',
      'dictee_professionnelle',
      'tri_chevilles',
      'traitement_texte_bureautique',
      'redaction_email',
      'autoevaluation_tic',
      'paronymes_rapport',
      'gratte_ciel',
      'fin_parcours'
    ];

    for (let index = 0; index < expectedIds.length; index += 1) {
      console.log('PILOT2_SMOKE_STAGE=test-' + (index + 1) + '-' + expectedIds[index]);
      const testId = await win.webContents.executeJavaScript("window.sebKaltestPilot2.currentTest().id",true);
      if (testId !== expectedIds[index]) {
        throw new Error('Ordre KALTEST incorrect : attendu ' + expectedIds[index] + ', trouvé ' + testId);
      }

      const perfect = await perfectResult(win);
      const meta = await win.webContents.executeJavaScript(
        "({questionCount:(window.sebKaltestPilot2.currentTest().questions||[]).length,scored:window.sebKaltestPilot2.currentTest().scored!==false})",
        true
      );
      if (meta.scored) {
        if (testId === 'traitement_texte_bureautique') {
          if (perfect.scoreMax !== 8 || perfect.score < 0 || perfect.score > 8) {
            throw new Error(testId + ' : barème Traitement de texte /8 incorrect.');
          }
        } else {
          const expectedMax = testId === 'dictee_professionnelle' ? 20 : meta.questionCount;
          if (perfect.score !== perfect.scoreMax || perfect.scoreMax !== expectedMax) {
            throw new Error(testId + ' : moteur de correction partagé incorrect.');
          }
        }
      } else if (perfect.score !== 0 || perfect.scoreMax !== 0) {
        throw new Error(testId + ' : une autoévaluation non notée produit encore un score.');
      }

      await assertNoOverflow(win, testId);

      const visualContract = await win.webContents.executeJavaScript(
        "(function(){const test=window.sebKaltestPilot2.currentTest();return {compatible:test.calculator?.compatible===true,calcDisplay:getComputedStyle(document.getElementById('kaltest-calculator')).display,durationPlaceholders:Array.from(document.querySelectorAll('[data-question-id]')).filter(el=>/ex\\./i.test(el.getAttribute('placeholder')||'')).length,textGapBreaks:document.querySelectorAll('.kaltest-inline-flow br').length,genreTables:document.querySelectorAll('.kaltest-two-tables .kaltest-grammar-table').length,choiceFont:document.querySelector('.kaltest-choice-table')?parseFloat(getComputedStyle(document.querySelector('.kaltest-choice-table')).fontSize):null,fractionItems:document.querySelectorAll('.kaltest-fraction-item').length,organisationRows:document.querySelectorAll('.kaltest-organisation-row').length,postureFields:document.querySelectorAll('.kaltest-postures-answer input').length,autoevalChoices:document.querySelectorAll('.kaltest-autoeval-choice input').length,stockPots:document.querySelectorAll('.kaltest-stock-pot').length,stockCases:document.querySelectorAll('.kaltest-stock-case').length,mailInputs:document.querySelectorAll('.kaltest-mail-composer input').length,mailTextarea:document.querySelectorAll('.kaltest-mail-composer textarea').length,dicteeAudio:document.querySelectorAll('.kaltest-dictee-player audio').length,dicteeTextarea:document.querySelectorAll('.kaltest-dictee-writing textarea').length,triRows:document.querySelectorAll('.kaltest-tri-row:not(.head)').length,triChronoButtons:document.querySelectorAll('.kaltest-tri-chrono-buttons button').length,transitionVideo:document.querySelectorAll('.kaltest-transition-video').length,briqueChrono:Boolean(document.getElementById('startBtn')&&document.getElementById('stopBtn')),briqueAdmin:Boolean(document.getElementById('secretCode')&&document.getElementById('validBtn')),textEditor:Boolean(document.querySelector('.kaltest-text-editor-tool .ql-editor')),textEditorFile:Boolean(document.getElementById('nw-file-menu-button')),textEditorImage:Boolean(document.getElementById('nw-image-button')),terminal:Boolean(document.querySelector('.kaltest-terminal-page')),builderGridInputs:document.querySelectorAll('.kaltest-builder-grid input[data-question-id]').length};})()",
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
      if (testId === 'fractions_preparation_lots' && visualContract.fractionItems !== 22) {
        throw new Error('Fractions : 22 objets sélectionnables attendus : ' + JSON.stringify(visualContract));
      }
      if (testId === 'organisation_demenagement' && visualContract.organisationRows !== 8) {
        throw new Error('Organisation : 8 actions attendues : ' + JSON.stringify(visualContract));
      }
      if (testId === 'gestes_postures' && visualContract.postureFields !== 3) {
        throw new Error('Postures : 3 champs attendus : ' + JSON.stringify(visualContract));
      }
      if (testId === 'autoevaluation_savoirs' && visualContract.autoevalChoices !== 5) {
        throw new Error('Autoévaluation 1 : 5 choix attendus : ' + JSON.stringify(visualContract));
      }
      if (testId === 'autoevaluation_tic' && visualContract.autoevalChoices !== 6) {
        throw new Error('Autoévaluation 2 : 6 choix attendus : ' + JSON.stringify(visualContract));
      }
      if (testId === 'transition_video_f1' && visualContract.transitionVideo !== 1) {
        throw new Error('Transition vidéo F1 : vidéo plein écran absente : ' + JSON.stringify(visualContract));
      }
      if (testId === 'construction_briques' && (!visualContract.briqueChrono || !visualContract.briqueAdmin)) {
        throw new Error('Briques : compteur ou validation administrateur absents : ' + JSON.stringify(visualContract));
      }
      if (testId === 'traitement_texte_bureautique' && (!visualContract.textEditor || !visualContract.textEditorFile || !visualContract.textEditorImage)) {
        throw new Error('Traitement de texte : outil Éditeur KALONÉO incomplet : ' + JSON.stringify(visualContract));
      }
      if (testId === 'fin_parcours' && !visualContract.terminal) {
        throw new Error('Fin de parcours : page terminale KALTEST absente : ' + JSON.stringify(visualContract));
      }
      if (testId === 'ranger_stock' && (visualContract.stockPots !== 34 || visualContract.stockCases !== 35)) {
        throw new Error('Stock : 34 pots et 35 cases attendus : ' + JSON.stringify(visualContract));
      }
      if (testId === 'tri_chevilles' && (visualContract.triRows !== 5 || visualContract.triChronoButtons !== 2)) {
        throw new Error('Tri : 5 lignes et 2 boutons chrono attendus : ' + JSON.stringify(visualContract));
      }
      if (testId === 'dictee_professionnelle' && (visualContract.dicteeAudio !== 1 || visualContract.dicteeTextarea !== 1)) {
        throw new Error('Dictée : lecteur audio et zone de texte attendus : ' + JSON.stringify(visualContract));
      }
      if (testId === 'redaction_email' && (visualContract.mailInputs !== 3 || visualContract.mailTextarea !== 1)) {
        throw new Error('Mail : champs À/Cc/Objet et message attendus : ' + JSON.stringify(visualContract));
      }
      if (testId === 'gratte_ciel' && visualContract.builderGridInputs !== 16) {
        throw new Error('Gratte-ciel : 16 cases de réponse attendues : ' + JSON.stringify(visualContract));
      }
      if (testId === 'genre_nombre' && visualContract.genreTables !== 2) {
        throw new Error('Genre / Nombre : les deux tableaux Build #20 ne sont pas rendus.');
      }
      if (testId === 'paronymes_rapport' && (!visualContract.choiceFont || visualContract.choiceFont < 14)) {
        throw new Error('Paronymes : police trop petite pour un test réel.');
      }

      if (testId === 'transition_video_f1') {
        await win.webContents.executeJavaScript("document.querySelector('.kaltest-transition-video')?.dispatchEvent(new Event('ended'));true",true);
        await sleep(1750);
        continue;
      }
      if (testId === 'fin_parcours') {
        const terminal = await win.webContents.executeJavaScript("({id:window.sebKaltestPilot2.currentTest()?.id||'',finished:sessionStorage.getItem('seb_kaltest_parcours_finished'),text:document.querySelector('.kaltest-terminal-page')?.textContent||''})",true);
        if (terminal.id!=='fin_parcours' || terminal.finished!=='1' || !/Félicitations/.test(terminal.text)) {
          throw new Error('Page terminale KALTEST invalide : '+JSON.stringify(terminal));
        }
        break;
      }

      await fillOneAnswer(win);
      const validateBeforeAdvance = await win.webContents.executeJavaScript("window.sebKaltestPilot2.currentTest()?.behavior?.validateBeforeAdvance===true",true);
      await win.webContents.executeJavaScript("document.getElementById('kaltest-next').click();true",true);
      await sleep(70);
      if (validateBeforeAdvance) {
        const validated = await win.webContents.executeJavaScript(
          "({same:window.sebKaltestPilot2.currentTest()?.id||'',label:document.getElementById('kaltest-next')?.textContent||'',planning:sessionStorage.getItem('planningScore'),stock:sessionStorage.getItem('stockCorrect'),dictee:sessionStorage.getItem('dictee_data'),tri:sessionStorage.getItem('tri_cheville_data'),brique:sessionStorage.getItem('eval_brique'),nwtexte:(JSON.parse(sessionStorage.getItem('scores_data')||'{}').page7!==undefined),mail:sessionStorage.getItem('page8_data'),carre:sessionStorage.getItem('carre_magique_erreurs')})",
          true
        );
        const legacyOk = testId === 'planning_cantine' ? validated.planning !== null :
          testId === 'ranger_stock' ? validated.stock !== null :
          testId === 'dictee_professionnelle' ? validated.dictee !== null :
          testId === 'tri_chevilles' ? validated.tri !== null :
          testId === 'construction_briques' ? validated.brique !== null :
          testId === 'traitement_texte_bureautique' ? validated.nwtexte === true :
          testId === 'redaction_email' ? validated.mail !== null :
          testId === 'gratte_ciel' ? validated.carre !== null : true;
        if (validated.same !== testId || !/Suivant\s*$/.test(validated.label.trim()) || !legacyOk) {
          throw new Error(testId + ' : validation avant navigation incorrecte : ' + JSON.stringify(validated));
        }
        await win.webContents.executeJavaScript("document.getElementById('kaltest-next').click();true",true);
        await sleep(70);
      }

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

    const finalAudit = await win.webContents.executeJavaScript(
      "(function(){const sc=JSON.parse(sessionStorage.getItem('scores_data')||'{}');const cand=JSON.parse(sessionStorage.getItem('candidat_data')||'{}');return {congrats:/Félicitations/.test(document.querySelector('.kaltest-terminal-page')?.textContent||''),finished:sessionStorage.getItem('seb_kaltest_parcours_finished')==='1',date:cand.date,requiredLegacy:['page2_q1','page2_1_q6','page3_q1','pageTexteTrous','page4','page5_q1','page5_1_q1','page6_q1'].every(k=>Object.prototype.hasOwnProperty.call(sc,k)),brique:sessionStorage.getItem('eval_brique')!==null,nwtexte:sc.page7!==undefined,paronymes:sessionStorage.getItem('paronymes_score')!==null,genre:sessionStorage.getItem('erreurs_exercice')!==null,auto1:sessionStorage.getItem('autoEval1_resultats')!==null,auto2:sessionStorage.getItem('autoEval2_resultats')!==null,planning:sessionStorage.getItem('planningScore')!==null,stock:sessionStorage.getItem('stockCorrect')!==null,dictee:sessionStorage.getItem('dictee_data')!==null,tri:sessionStorage.getItem('tri_cheville_data')!==null,mail:sessionStorage.getItem('page8_data')!==null,carre:sessionStorage.getItem('carre_magique_erreurs')!==null};})()",
      true
    );
    if (!finalAudit.congrats || !finalAudit.finished) throw new Error('La page terminale KALTEST n’est pas correctement finalisée.');
    if (!finalAudit.requiredLegacy || !finalAudit.brique || !finalAudit.nwtexte || !finalAudit.paronymes || !finalAudit.genre || !finalAudit.auto1 || !finalAudit.auto2 || !finalAudit.planning || !finalAudit.stock || !finalAudit.dictee || !finalAudit.tri || !finalAudit.mail || !finalAudit.carre) {
      throw new Error('Le pont KALTEST → Résultats/Bilan historiques est incomplet : ' + JSON.stringify(finalAudit));
    }

    console.log('KALTEST_PILOT2_FUNCTIONAL_SMOKE: OK');
    console.log('PILOT2_REAL_SEB_VISUALS=Introduction video + Scenario/Consigne icons');
    console.log('PILOT2_DYNAMIC_TESTS=22');
    console.log('PILOT2_RENDERERS=basic + transition F1 + briques + stock + planning + dictation + tri + text-editor + mail + autoevaluations + grid + tables');
    console.log('PILOT2_FLOATING_CALCULATOR=OK');
    console.log('PILOT2_ABANDON_UI=4 reasons + admin password + NE');
    console.log('PILOT2_NO_VERTICAL_OVERFLOW=OK');
    console.log('PILOT2_FINAL_PAGE=KALTEST_TERMINAL');
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
