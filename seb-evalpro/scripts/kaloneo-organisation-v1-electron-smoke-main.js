'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const webRoot = path.join(root, 'app', 'web');
let runtime = null;
let state = null;

function fail(message, detail) {
  console.error('KALONEO_ORGANISATION_V1: FAIL — ' + message);
  if (detail) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  app.exit(2);
}

function readTest(folder) {
  const file = path.join(webRoot, 'kaltest', 'tests', folder, '1.0.0', 'test.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

ipcMain.on('smoke:interactive-fullpage-sync', event => {
  event.returnValue = { runtime, state };
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async () => {
  const organisation = readTest('organisation-demenagement');
  const fin = readTest('fin-parcours');

  runtime = {
    id:'organisation-v1-smoke',
    title:'Organisation V1',
    creator:'Smoke R44',
    launchOptions:{showCorrectionsDuringParcours:false},
    maskScreen:{id:'kaloneo-default',version:'1.0.0'},
    introduction:null,
    tests:[organisation],
    fin
  };
  state = {
    phase:'exercise',
    testIndex:0,
    personId:'smoke-person',
    evaluationId:'smoke-eval',
    identity:{},
    tests:{
      [organisation.id]:{answers:{},units:{},supplemental:{},result:null,status:'PENDING',abandon:null},
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
    try { await win.loadFile(path.join(webRoot, 'kaltest-pilot2.html')); }
    catch (error) { if (!/ERR_FAILED/.test(String(error?.message || error))) throw error; }

    let result = null;
    for (let i=0;i<120;i+=1) {
      result = await win.webContents.executeJavaScript(`(()=>{
        const layout=document.querySelector('.kaltest-organisation-layout');
        const rows=[...document.querySelectorAll('.kaltest-organisation-row')];
        const image=layout?.querySelector('img');
        return {
          id:document.body.dataset.sebKaltestId||'',
          hasOrganisation:!!layout,
          hasBuilder:!!document.querySelector('.kaltest-builder-runtime-layout'),
          rowCount:rows.length,
          imageSrc:image?.getAttribute('src')||'',
          inputsBeforeText:rows.every(row=>{
            const children=[...row.children];
            return children[0]?.matches('input,select,textarea') && children[1]?.tagName==='SPAN';
          }),
          firstText:String(rows[0]?.querySelector('span')?.textContent||'').trim(),
          firstInputWidth:Math.round(rows[0]?.querySelector('input')?.getBoundingClientRect().width||0)
        };
      })()`, true).catch(()=>null);
      if (result?.hasOrganisation && result.rowCount===8) break;
      await wait(50);
    }

    if (!result?.hasOrganisation || result.hasBuilder || result.rowCount !== 8 ||
        !result.inputsBeforeText ||
        !/imageqcm\/demenagement\.png$/i.test(result.imageSrc) ||
        result.firstText !== 'Emballer les pièces et protéger les machines fragiles.') {
      return fail('le rendu V1 Organisation n’est plus fidèle à la page historique', result);
    }

    console.log('KALONEO_ORGANISATION_V1=OK');
    console.log('KALONEO_ORGANISATION_V1_INPUTS_BEFORE_TEXT=OK');
    console.log('KALONEO_ORGANISATION_V1_IMAGE=OK');
    console.log(JSON.stringify(result));
    win.destroy();
    app.exit(0);
  } catch (error) {
    try { if (!win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error?.stack || error?.message || String(error));
  }
}).catch(error => fail(error?.stack || String(error)));

setTimeout(() => fail('timeout global'), 45000);
