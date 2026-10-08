'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const webRoot = path.join(root, 'app', 'web');
let currentRuntime = null;
let currentState = null;

function fail(message, detail) {
  console.error('KALONEO_INTERACTIVE_FULLPAGE: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

ipcMain.on('smoke:interactive-fullpage-sync', event => {
  event.returnValue = { runtime:currentRuntime, state:currentState };
});

function readTest(folder) {
  const file = path.join(webRoot, 'kaltest', 'tests', folder, '1.0.0', 'test.json');
  if (!fs.existsSync(file)) throw new Error('Test absent: ' + file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function pendingState(test, fin) {
  return {
    phase:'exercise',
    testIndex:0,
    personId:'smoke-person',
    evaluationId:'smoke-eval',
    identity:{},
    tests:{
      [test.id]:{answers:{},units:{},supplemental:{},result:null,status:'PENDING',abandon:null},
      [fin.id]:{answers:{},units:{},supplemental:{},result:null,status:'PENDING',abandon:null}
    },
    replay:[]
  };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runCase(test, fin, showCorrections) {
  currentRuntime = {
    id:'interactive-fullpage-smoke',
    title:'Interactive full-page smoke',
    creator:'Smoke R23',
    launchOptions:{showCorrectionsDuringParcours:showCorrections === true},
    maskScreen:{id:'kaloneo-default',version:'1.0.0'},
    introduction:null,
    tests:[test],
    fin
  };
  currentState = pendingState(test, fin);

  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{
      preload:path.join(__dirname, 'kaloneo-interactive-fullpage-smoke-preload.js'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:false,
      devTools:false
    }
  });

  await win.loadFile(path.join(webRoot, 'kaltest-pilot2.html'));

  let result = null;
  for (let i=0;i<80;i+=1) {
    result = await win.webContents.executeJavaScript(`(()=>{
      const frame=document.querySelector('.kaltest-legacy-page-iframe');
      const doc=frame?.contentDocument;
      const visibleActions=[...document.querySelectorAll('#kaloneo-nav-center .kaloneo-nav-action')]
        .filter(button=>!button.hidden&&getComputedStyle(button).display!=='none')
        .map(button=>String(button.textContent||'').trim());
      const internalIds=['stockActionBtn','carre-reset','btnValidate','btnNext'];
      const internal=Object.fromEntries(internalIds.map(id=>{
        const node=doc?.getElementById(id);
        return [id,node?getComputedStyle(node).display:'absent'];
      }));
      return {
        ready:Boolean(window.sebKaltestPilot2),
        testId:document.body.dataset.sebKaltestId||'',
        corrections:window.sebKaltestPilot2?.showCorrectionsDuringParcours===true,
        legacyFull:document.body.classList.contains('seb-kaltest-legacy-full'),
        frame:!!frame,
        nestedBar:Boolean(doc?.getElementById('kaloneo-common-navigation')),
        nativeNextHidden:Boolean(document.getElementById('kaltest-next')?.hidden),
        actions:visibleActions,
        internal
      };
    })()`, true).catch(()=>null);
    if (result?.ready && result?.frame && result.actions.length) break;
    await wait(50);
  }

  win.destroy();
  return result;
}

function sameLabels(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

app.commandLine.appendSwitch('disable-gpu');

const timeout = setTimeout(() => fail('timeout'), 60000);

app.whenReady().then(async () => {
  try {
    const stock = readTest('ranger-stock');
    const puzzle = readTest('gratte-ciel');
    const fin = readTest('fin-parcours');

    const stockNo = await runCase(stock, fin, false);
    if (!stockNo?.ready || stockNo.testId !== 'ranger_stock' || stockNo.corrections ||
        !stockNo.legacyFull || !stockNo.nativeNextHidden || stockNo.nestedBar ||
        !sameLabels(stockNo.actions, ['➡️ Suivant']) ||
        stockNo.internal.stockActionBtn !== 'none') {
      return fail('Stock sans corrections : la barre candidat doit afficher uniquement Suivant', stockNo);
    }

    const stockYes = await runCase(stock, fin, true);
    if (!stockYes?.ready || stockYes.testId !== 'ranger_stock' || !stockYes.corrections ||
        !sameLabels(stockYes.actions, ['🔍 Vérifier']) ||
        stockYes.internal.stockActionBtn !== 'none') {
      return fail('Stock avec corrections : la barre candidat doit afficher Vérifier', stockYes);
    }

    const puzzleNo = await runCase(puzzle, fin, false);
    if (!puzzleNo?.ready || puzzleNo.testId !== 'gratte_ciel' || puzzleNo.corrections ||
        !puzzleNo.legacyFull || !puzzleNo.nativeNextHidden || puzzleNo.nestedBar ||
        !sameLabels(puzzleNo.actions, ['🔄 Recommencer','➡️ Suivant']) ||
        puzzleNo.internal['carre-reset'] !== 'none' ||
        puzzleNo.internal.btnValidate !== 'none' ||
        puzzleNo.internal.btnNext !== 'none') {
      return fail('Puzzle sans corrections : Recommencer + Suivant attendus dans la barre candidat', puzzleNo);
    }

    const puzzleYes = await runCase(puzzle, fin, true);
    if (!puzzleYes?.ready || puzzleYes.testId !== 'gratte_ciel' || !puzzleYes.corrections ||
        !sameLabels(puzzleYes.actions, ['🔄 Recommencer','✔️ Valider']) ||
        puzzleYes.internal['carre-reset'] !== 'none' ||
        puzzleYes.internal.btnValidate !== 'none' ||
        puzzleYes.internal.btnNext !== 'none') {
      return fail('Puzzle avec corrections : Recommencer + Valider attendus dans la barre candidat', puzzleYes);
    }

    console.log('KALONEO_INTERACTIVE_FULLPAGE=OK');
    console.log(JSON.stringify({stockNo,stockYes,puzzleNo,puzzleYes}));
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) {
    fail(String(error && error.stack || error));
  }
});
