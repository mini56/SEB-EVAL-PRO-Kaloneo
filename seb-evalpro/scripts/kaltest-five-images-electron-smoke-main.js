'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function fail(message, detail) {
  console.error('KALTEST_FIVE_IMAGES_ELECTRON: FAIL — ' + message);
  if (detail) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  app.exit(2);
}

async function waitReady(win, id) {
  for (let i=0;i<120;i+=1) {
    const ready = await win.webContents.executeJavaScript(
      `Boolean(window.sebKaltestPilot2 && window.sebKaltestPilot2.currentTest()?.id === ${JSON.stringify(id)} && document.body.dataset.sebKaltestId === ${JSON.stringify(id)})`,
      true
    ).catch(()=>false);
    if (ready) return;
    await wait(50);
  }
  throw new Error('Test non rendu : ' + id);
}

async function setInitialIndex(win, index, id) {
  await win.webContents.executeJavaScript(`
    (() => {
      const api=window.sebKaltestPilot2;
      const state=api.state;
      state.phase='exercise';
      state.testIndex=${index};
      sessionStorage.setItem('seb_kaltest_pilot2_state_v1', JSON.stringify(state));
      return true;
    })()
  `,true);
  await win.reload();
  await waitReady(win,id);
  await wait(120);
}

async function inspect(win, expected) {
  return win.webContents.executeJavaScript(`
    (() => {
      const img=document.querySelector('.kaltest-visual-panel img');
      const placeholder=document.querySelector('.kaltest-visual-placeholder');
      const layout=document.querySelector(
        '.kaltest-questionnaire-visual-layout,.kaltest-schedule-visual-layout,.kaltest-inline-visual-layout,.kaltest-conversions-visual-layout'
      );
      const list=document.querySelector('.kaltest-question-list');
      const table=document.querySelector('.kaltest-table');
      const ir=img?.getBoundingClientRect();
      const fr=img?.closest('.kaltest-visual-frame')?.getBoundingClientRect();
      return {
        id:document.body.dataset.sebKaltestId||'',
        src:img?.getAttribute('src')||'',
        complete:!!img?.complete,
        naturalWidth:img?.naturalWidth||0,
        naturalHeight:img?.naturalHeight||0,
        placeholder:!!placeholder,
        layoutClass:layout?.className||'',
        hasList:!!list,
        hasTable:!!table,
        imageFits:!!(ir&&fr&&ir.width<=fr.width+1&&ir.height<=fr.height+1),
        expected:${JSON.stringify(expected)}
      };
    })()
  `,true);
}

function assertImage(result, id, src, layoutClass) {
  if (result.id !== id ||
      result.src !== src ||
      result.placeholder ||
      !result.complete ||
      result.naturalWidth < 100 ||
      result.naturalHeight < 100 ||
      !result.imageFits ||
      !String(result.layoutClass).includes(layoutClass)) {
    throw new Error(id + ' : visuel/rendu incorrect ' + JSON.stringify(result));
  }
}

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async()=>{
  const win=new BrowserWindow({
    show:false,width:1366,height:768,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false}
  });
  try {
    await win.loadFile(page,{query:{segment:'initial'}});
    for (let i=0;i<120;i+=1) {
      const ok=await win.webContents.executeJavaScript('Boolean(window.sebKaltestPilot2)',true).catch(()=>false);
      if(ok)break;
      await wait(50);
    }

    const initial=[
      ['calculs_commandes_atelier','imageqcm/kaloneo-calculs-commandes-atelier.webp','kaltest-questionnaire-visual-layout'],
      ['calculs_poids_volumes','imageqcm/kaloneo-calculs-poids-volumes.webp','kaltest-questionnaire-visual-layout'],
      ['horaires_reception_controle','imageqcm/kaloneo-reception-controle-horaires.webp','kaltest-schedule-visual-layout'],
      ['texte_a_trous_stage_logistique','imageqcm/kaloneo-texte-trous-stage-logistique.webp','kaltest-inline-visual-layout']
    ];

    for(let index=0;index<initial.length;index+=1){
      const [id,src,layoutClass]=initial[index];
      await setInitialIndex(win,index,id);
      const result=await inspect(win,{id,src,layoutClass});
      assertImage(result,id,src,layoutClass);
      if((id==='calculs_commandes_atelier'||id==='calculs_poids_volumes') && (!result.hasList||!result.hasTable)){
        throw new Error(id+' : questions et tableau ne sont plus réunis dans le bloc de travail.');
      }
      console.log('KALTEST_IMAGE_'+id.toUpperCase()+'=OK');
    }

    await win.loadFile(page,{query:{segment:'conversions'}});
    await waitReady(win,'conversions_atelier_expedition');
    await wait(120);
    const conversions=await inspect(win,{
      id:'conversions_atelier_expedition',
      src:'imageqcm/kaloneo-conversions-atelier-expedition.webp',
      layoutClass:'kaltest-conversions-visual-layout'
    });
    assertImage(
      conversions,
      'conversions_atelier_expedition',
      'imageqcm/kaloneo-conversions-atelier-expedition.webp',
      'kaltest-conversions-visual-layout'
    );
    if(!conversions.hasList||!conversions.hasTable) {
      throw new Error('Conversions : questions/tableau perdus.');
    }

    console.log('KALTEST_IMAGE_CONVERSIONS_ATELIER_EXPEDITION=OK');
    console.log('KALTEST_FIVE_IMAGES_ELECTRON=OK');
    win.destroy();
    app.exit(0);
  } catch(error) {
    try{if(!win.isDestroyed())win.destroy();}catch(_){}
    fail(error?.message||String(error),error?.stack||'');
  }
}).catch(error=>fail(error?.message||String(error),error?.stack||''));

setTimeout(()=>fail('Timeout global du smoke cinq images.'),60000);
