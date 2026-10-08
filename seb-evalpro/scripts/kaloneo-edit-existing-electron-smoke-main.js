'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const Core = require('../../kaloneo/builder-core');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'app', 'web');
let runtime = null;
let state = null;

function fail(message, detail) {
  console.error('KALONEO_EDIT_EXISTING_ELECTRON: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(2);
}

function readTest(folder) {
  const file = path.join(webRoot, 'kaltest', 'tests', folder, '1.0.0', 'test.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function buildOrganisationV2() {
  const v1 = readTest('organisation-demenagement');
  const model = Core.definitionToModel(v1);
  model.meta.version = '2.0.0';
  model.meta.layout = '60-40';
  model.meta.scenario = '[b]Première ligne[/b]\\nDeuxième ligne';
  model.meta.instruction = '[i]Consigne ligne 1[/i]\n[u]Consigne ligne 2[/u]';
  model.meta.pageBackgroundType = 'color';
  model.meta.pageBackgroundColor = '#FFF8DD';

  const image = model.blocks.find(block => block.type === 'image');
  const questions = model.blocks.filter(block => block.type === 'question');
  if (!image || questions.length !== 8) throw new Error('conversion Builder Organisation incomplète');

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#f4b44b"/><circle cx="200" cy="150" r="80" fill="#1b6c8e"/></svg>';
  image.zone = 'right';
  image.mediaName = 'organisation-v2.svg';
  image.mediaType = 'image/svg+xml';
  image.mediaData = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  image.mediaAlt = 'Illustration ajoutée dans la V2';
  questions.forEach(block => { block.zone = 'left'; });
  questions[0].fontSize = 22;
  questions[0].backgroundColor = '#EEF9F2';

  return Core.modelToDefinition(model);
}

ipcMain.on('smoke:interactive-fullpage-sync', event => {
  event.returnValue = { runtime, state };
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const timeout = setTimeout(() => fail('timeout'), 45000);
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async () => {
  try {
    const test = buildOrganisationV2();
    const fin = readTest('fin-parcours');

    runtime = {
      id:'organisation-v2-smoke',
      title:'Parcours Organisation V2',
      creator:'Smoke R26',
      launchOptions:{showCorrectionsDuringParcours:false},
      maskScreen:{id:'kaloneo-default',version:'1.0.0'},
      introduction:null,
      tests:[test],
      fin
    };
    state = {
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

    const win = new BrowserWindow({
      show:false,
      width:1366,
      height:768,
      webPreferences:{
        preload:path.join(__dirname, 'kaloneo-interactive-fullpage-smoke-preload.js'),
        contextIsolation:true,
        nodeIntegration:false,
        sandbox:false
      }
    });

    try {
      await win.loadFile(path.join(webRoot, 'kaltest-pilot2.html'));
    } catch (error) {
      if (!/ERR_FAILED/.test(String(error?.message || error))) throw error;
    }

    let result = null;
    for (let i=0;i<100;i+=1) {
      result = await win.webContents.executeJavaScript(`(()=>{
        const generic=document.querySelector('.kaltest-builder-runtime-layout');
        const zones=[...document.querySelectorAll('.kaltest-builder-runtime-zone')];
        const image=document.querySelector('.kaltest-builder-runtime-zone:nth-child(2) img.seb-media-image');
        const leftQuestions=zones[0]?.querySelectorAll('.kaltest-builder-question input,.kaltest-builder-question select,.kaltest-builder-question textarea').length||0;
        const styledBlock=document.querySelector('[data-kaloneo-font-size="22"]');
        const page=document.getElementById('page-exercise');
        return {
          id:document.body.dataset.sebKaltestId||'',
          generic:!!generic,
          legacyOrganisation:!!document.querySelector('.kaltest-organisation-layout'),
          columns:generic?getComputedStyle(generic).gridTemplateColumns:'',
          zoneCount:zones.length,
          leftQuestions,
          rightImage:!!image,
          rightImageSrc:image?.getAttribute('src')||'',
          title:String(document.querySelector('.kaltest-heading h1')?.textContent||'').trim(),
          scenario:String(document.getElementById('kaltest-scenario')?.textContent||''),
          instruction:String(document.getElementById('kaltest-instruction')?.textContent||''),
          pageBackground:page?.style.backgroundColor||'',
          styledFont:styledBlock?.style.fontSize||'',
          styledBackground:styledBlock?.style.backgroundColor||'',
          scenarioBold:String(document.querySelector('#kaltest-scenario strong')?.textContent||''),
          instructionItalic:String(document.querySelector('#kaltest-instruction em')?.textContent||''),
          instructionUnderline:String(document.querySelector('#kaltest-instruction u')?.textContent||''),
          scenarioBreaks:document.querySelectorAll('#kaltest-scenario br').length,
          instructionBreaks:document.querySelectorAll('#kaltest-instruction br').length
        };
      })()`, true).catch(()=>null);
      if (result?.generic && result?.rightImage) break;
      await wait(50);
    }

    if (!result?.generic || result.legacyOrganisation || result.zoneCount !== 2 ||
        result.leftQuestions !== 8 || !result.rightImage ||
        !result.rightImageSrc.startsWith('data:image/svg+xml;base64,') ||
        result.scenario !== 'Première ligneDeuxième ligne' ||
        result.instruction !== 'Consigne ligne 1Consigne ligne 2' ||
        result.scenarioBreaks !== 1 ||
        result.instructionBreaks !== 1 ||
        !/255, 248, 221/.test(result.pageBackground) ||
        result.styledFont !== '22px' ||
        !/238, 249, 242/.test(result.styledBackground) ||
        result.scenarioBold !== 'Première ligne' ||
        result.instructionItalic !== 'Consigne ligne 1' ||
        result.instructionUnderline !== 'Consigne ligne 2') {
      return fail('la V2 modifiée n’est pas rendue avec ses styles Builder', result);
    }

    console.log('KALONEO_EDIT_EXISTING_ELECTRON=OK');
    console.log(JSON.stringify(result));
    clearTimeout(timeout);
    win.destroy();
    app.exit(0);
  } catch (error) {
    fail(String(error?.stack || error));
  }
});
