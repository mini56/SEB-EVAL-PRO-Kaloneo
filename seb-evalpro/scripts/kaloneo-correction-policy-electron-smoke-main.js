'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

function fail(message, detail) {
  console.error('KALONEO_CORRECTION_POLICY_ELECTRON: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

const root = path.join(__dirname, '..');
const webRoot = path.join(root, 'app', 'web');
let currentRuntime = null;
let currentState = null;

ipcMain.on('smoke:correction-case-sync', (event) => {
  event.returnValue = { runtime:currentRuntime, state:currentState };
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function readTest(folder) {
  const file = path.join(webRoot, 'kaltest', 'tests', folder, '1.0.0', 'test.json');
  if (!fs.existsSync(file)) throw new Error('Test absent: ' + file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function completedState(test, answerValue) {
  const answers = {};
  const details = {};
  for (const question of test.questions || []) {
    answers[question.id] = question.id === test.questions?.[0]?.id ? answerValue : '';
    details[question.id] = {
      value:answers[question.id],
      correct:false,
      points:Number(question.points) || 0,
      manual:false
    };
  }
  return {
    answers,
    units:{},
    supplemental:{},
    result:{score:0,scoreMax:Math.max(1,(test.questions || []).length),percentage:0,details},
    status:'COMPLETED',
    abandon:null
  };
}

async function runCase(test, fin, showCorrections, answerValue) {
  currentRuntime = {
    id:'correction-policy-smoke',
    title:'Correction policy smoke',
    creator:'Smoke R7',
    launchOptions:{showCorrectionsDuringParcours:showCorrections === true},
    maskScreen:{id:'kaloneo-default',version:'1.0.0'},
    introduction:null,
    tests:[test],
    fin
  };

  const testState = completedState(test, answerValue);
  currentState = {
    phase:'exercise',
    testIndex:0,
    personId:'smoke-person',
    evaluationId:'smoke-eval',
    identity:{},
    tests:{
      [test.id]:testState,
      [fin.id]:{
        answers:{},units:{},supplemental:{},result:null,status:'PENDING',abandon:null
      }
    },
    replay:[]
  };

  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{
      preload:path.join(__dirname, 'kaloneo-correction-policy-smoke-preload.js'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:false,
      devTools:false
    }
  });

  await win.loadFile(path.join(webRoot, 'kaltest-pilot2.html'));
  await wait(380);

  const result = await win.webContents.executeJavaScript(`(()=>({
    ready:Boolean(window.sebKaltestPilot2),
    corrections:window.sebKaltestPilot2?.showCorrectionsDuringParcours===true,
    id:document.body.dataset.sebKaltestId||'',
    correct:document.querySelectorAll('.kaltest-answer-correct,.kaltest-stock-pot.correct').length,
    incorrect:document.querySelectorAll('.kaltest-answer-incorrect,.kaltest-stock-pot.incorrect').length,
    selected:document.querySelectorAll('.kaltest-choice.selected').length,
    status:document.getElementById('exercise-status')?.textContent.trim()||''
  }))()`, true);

  await wait(40);
  win.destroy();
  return result;
}

app.commandLine.appendSwitch('disable-gpu');

const timeout = setTimeout(() => fail('timeout'), 60000);

app.whenReady().then(async () => {
  try {
    const planning = readTest('planning-cantine');
    const stock = readTest('ranger-stock');
    const paronymes = readTest('paronymes-rapport');
    const fin = readTest('fin-parcours');

    const paronymeQuestion = paronymes.questions?.[0];
    const wrongOption = (paronymeQuestion?.response?.options || [])
      .find(value => !(paronymeQuestion.acceptedAnswers || []).includes(value)) ||
      paronymeQuestion?.response?.options?.[0] || '';

    const cases = [];
    for (const [name,test,answer] of [
      ['Planning', planning, 'réponse volontairement fausse'],
      ['Stock', stock, 'source'],
      ['Paronymes', paronymes, wrongOption]
    ]) {
      const hidden = await runCase(test, fin, false, answer);
      if (!hidden.ready || hidden.corrections || hidden.id !== test.id || hidden.correct !== 0 || hidden.incorrect !== 0) {
        return fail(name + ' affiche une correction alors que le choix Admin est Non', hidden);
      }

      const shown = await runCase(test, fin, true, answer);
      if (!shown.ready || !shown.corrections || shown.id !== test.id || (shown.correct + shown.incorrect) < 1) {
        return fail(name + ' n’affiche pas la correction alors que le choix Admin est Oui', shown);
      }
      cases.push({name,hidden,shown});
    }

    console.log('KALONEO_CORRECTION_POLICY_ELECTRON=OK');
    console.log(JSON.stringify(cases));
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) {
    fail(String(error && error.stack || error));
  }
});
