const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot.html');

function fail(message, detail) {
  console.error('KALTEST_PILOT_FUNCTIONAL_SMOKE: FAIL — ' + message);
  if (detail) console.error(detail);
  app.exit(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitReady(win) {
  for (let i = 0; i < 160; i += 1) {
    const ready = await win.webContents.executeJavaScript(
      "Boolean(window.sebKaltestPilot && window.sebKaltestPilot.ready && window.sebKaltestPilot.ready())",
      true
    ).catch(() => false);
    if (ready) return;
    await sleep(50);
  }
  throw new Error('Le moteur pilote KALTEST ne devient pas prêt.');
}

async function visiblePage(win) {
  return win.webContents.executeJavaScript(
    "document.querySelector('.page.visible')?.id || ''",
    true
  );
}

async function reset(win) {
  await win.webContents.executeJavaScript("window.sebKaltestPilot.reset(); true", true);
  await sleep(60);
}

async function fillIdentity(win, ss6) {
  const payload = JSON.stringify({
    nom:'DUPONT',
    prenom:'JEAN',
    naissance:'1966-04-17',
    ss6:ss6,
    lieu:'Lorient',
    groupe:'7',
    dateEvaluation:'2026-10-01'
  });
  await win.webContents.executeJavaScript(
    "(function(){const values="+payload+";for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}document.getElementById('identity-next').click();return true;})()",
    true
  );
  await sleep(60);
}

async function goToExercise(win) {
  if (await visiblePage(win) !== 'page-intro') {
    throw new Error('La validation identité ne mène pas à la page Introduction.');
  }
  await win.webContents.executeJavaScript("document.getElementById('intro-next').click(); true", true);
  await sleep(60);
  if (await visiblePage(win) !== 'page-exercise') {
    throw new Error('La page Introduction ne mène pas au test dynamique.');
  }
}

async function fillAnswers(win, values) {
  const payload = JSON.stringify(values);
  await win.webContents.executeJavaScript(
    "(function(){const values="+payload+";for(const [index,value] of Object.entries(values)){const question=window.sebKaltestPilot.test.questions[Number(index)-1];const input=document.getElementById('answer-'+question.id);input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));}return true;})()",
    true
  );
  await sleep(60);
}

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show:false,
    width:1600,
    height:1000,
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      devTools:false
    }
  });

  try {
    await win.loadFile(page);
    await waitReady(win);

    const structure = await win.webContents.executeJavaScript(
      "({page:document.querySelector('.page.visible')?.id,title:window.sebKaltestPilot.test?.title,questions:window.sebKaltestPilot.test?.questions?.length,responseRows:document.querySelectorAll('#response-table tr').length-1,calculatorCompatible:window.sebKaltestPilot.test?.calculator?.compatible,calculatorButtonHidden:document.getElementById('calculator-open').hidden,targetLine:window.sebKaltestPilot.test?.bilanContributions?.[0]?.lineId})",
      true
    );

    if (structure.page !== 'page-identification') throw new Error('Le parcours ne démarre pas par Identification.');
    if (structure.title !== 'Calculs de commandes en atelier') throw new Error('Le premier KALTEST n’est pas chargé.');
    if (structure.questions !== 5 || structure.responseRows !== 5) throw new Error('Le rendu dynamique ne contient pas les 5 questions.');
    if (!structure.calculatorCompatible || structure.calculatorButtonHidden) throw new Error('La calculatrice compatible n’est pas proposée.');
    if (structure.targetLine !== 'bilan.savoirs_fondamentaux.mathematiques.comprendre_enonce_consigne') {
      throw new Error('Destination bilan du KALTEST incorrecte.');
    }

    await reset(win);
    await fillIdentity(win, '12345');
    const invalidIdentity = await win.webContents.executeJavaScript(
      "({page:document.querySelector('.page.visible')?.id,message:document.getElementById('identity-status').textContent})",
      true
    );
    if (invalidIdentity.page !== 'page-identification' || !/6 premiers chiffres/.test(invalidIdentity.message)) {
      throw new Error('Le contrôle des 6 chiffres de sécurité sociale ne bloque pas correctement.');
    }

    await fillIdentity(win, '166012');
    await goToExercise(win);
    await fillAnswers(win, {1:'1020',2:'1250'});

    const partial = await win.webContents.executeJavaScript("window.sebKaltestPilot.evaluate()", true);
    if (partial.score !== 2 || partial.scoreMax !== 5) throw new Error('Score partiel attendu 2/5.');

    await win.reload();
    await waitReady(win);
    await sleep(100);

    const restored = await win.webContents.executeJavaScript(
      "(function(){const test=window.sebKaltestPilot.test;return {page:document.querySelector('.page.visible')?.id,a1:document.getElementById('answer-'+test.questions[0].id)?.value,a2:document.getElementById('answer-'+test.questions[1].id)?.value};})()",
      true
    );
    if (restored.page !== 'page-exercise' || restored.a1 !== '1020' || restored.a2 !== '1250') {
      throw new Error('La reprise du test après rechargement a perdu le brouillon.');
    }

    await win.webContents.executeJavaScript("window.sebKaltestPilot.abandon(false); true", true);
    const abandonedEvaluated = await win.webContents.executeJavaScript("window.sebKaltestPilot.state", true);
    if (abandonedEvaluated.status !== 'ABANDONED_EVALUATED') throw new Error('Statut abandon évalué incorrect.');
    if (abandonedEvaluated.result.score !== 2 || abandonedEvaluated.result.scoreMax !== 5) {
      throw new Error('Les points réalisés avant abandon ne sont pas conservés.');
    }
    if (!abandonedEvaluated.bilan.includeInCalculation || abandonedEvaluated.bilan.level !== 'III') {
      throw new Error('Abandon non-NE : 2/5 doit rester dans le bilan et produire III.');
    }
    if (!abandonedEvaluated.replay.some((event) => event.type === 'EXERCISE_ABANDONED')) {
      throw new Error('Replay : abandon non enregistré.');
    }
    if (await visiblePage(win) !== 'page-final') throw new Error('Après abandon, la page finale n’est pas atteinte.');

    await reset(win);
    await win.webContents.executeJavaScript("window.sebKaltestPilot.showPage('exercise'); true", true);
    await fillAnswers(win, {1:'1020',2:'1250'});
    await win.webContents.executeJavaScript(
      "window.sebKaltestPilot.abandon(true); window.sebKaltestPilot.setBilanComment('Exercice non évalué à la demande de l’administrateur.'); true",
      true
    );
    const abandonedNE = await win.webContents.executeJavaScript("window.sebKaltestPilot.state", true);
    if (abandonedNE.status !== 'ABANDONED_NE') throw new Error('Statut abandon NE incorrect.');
    if (abandonedNE.result.score !== 2 || abandonedNE.result.scoreMax !== 5) {
      throw new Error('L’historique du score réalisé doit rester disponible même lorsque le bilan est NE.');
    }
    if (abandonedNE.bilan.includeInCalculation !== false || abandonedNE.bilan.level !== 'NE') {
      throw new Error('La case non évalué doit exclure totalement la contribution et produire NE.');
    }
    if (abandonedNE.bilan.score !== 0 || abandonedNE.bilan.scoreMax !== 0) {
      throw new Error('Une contribution NE ne doit laisser aucun point dans le calcul du bilan.');
    }
    if (!/non évalué/i.test(abandonedNE.bilan.comment)) {
      throw new Error('Le commentaire Administrateur NE n’est pas conservé.');
    }

    await reset(win);
    await win.webContents.executeJavaScript("window.sebKaltestPilot.showPage('exercise'); true", true);
    await fillAnswers(win, {1:'1020',2:'1250',3:'60',4:'525',5:'8'});
    await win.webContents.executeJavaScript("window.sebKaltestPilot.finishExercise(); true", true);
    const perfect = await win.webContents.executeJavaScript("window.sebKaltestPilot.state", true);
    if (perfect.status !== 'COMPLETED') throw new Error('Statut final normal incorrect.');
    if (perfect.result.score !== 5 || perfect.result.scoreMax !== 5 || perfect.result.percentage !== 100) {
      throw new Error('Résultat parfait attendu 5/5 — 100 %.');
    }
    if (perfect.bilan.level !== 'I' || perfect.bilan.includeInCalculation !== true) {
      throw new Error('Résultat parfait : niveau bilan I attendu.');
    }
    if (await visiblePage(win) !== 'page-final') throw new Error('Fin normale : page finale absente.');

    console.log('KALTEST_PILOT_FUNCTIONAL_SMOKE: OK');
    console.log('PILOT_ROUTE=Identification -> Introduction -> KALTEST -> Final');
    console.log('PILOT_IDENTITY_SS6=OK');
    console.log('PILOT_DYNAMIC_RENDER=5 questions');
    console.log('PILOT_RESUME_AFTER_RELOAD=OK');
    console.log('PILOT_ABANDON_EVALUATED=2/5 -> III');
    console.log('PILOT_ABANDON_NE=excluded -> NE');
    console.log('PILOT_NE_ADMIN_COMMENT=OK');
    console.log('PILOT_REPLAY_EVENTS=OK');
    console.log('PILOT_PERFECT=5/5 -> I');

    win.destroy();
    app.exit(0);
  } catch (error) {
    try { if (!win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error && error.message ? error.message : String(error), error && error.stack ? error.stack : '');
  }
}).catch((error) => fail('Electron initialization failed', error && error.stack ? error.stack : String(error)));

setTimeout(() => fail('Timeout global du smoke test KALTEST pilote.'), 60000);
