'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function fail(message, detail) {
  console.error('KALTEST_SIX_MORE_IMAGES_ELECTRON: FAIL — ' + message);
  if (detail) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  app.exit(2);
}
async function waitReady(win,id){
  for(let i=0;i<140;i+=1){
    const ok=await win.webContents.executeJavaScript(
      `Boolean(window.sebKaltestPilot2 && window.sebKaltestPilot2.currentTest()?.id===${JSON.stringify(id)} && document.body.dataset.sebKaltestId===${JSON.stringify(id)})`,
      true
    ).catch(()=>false);
    if(ok)return;
    await wait(50);
  }
  throw new Error('Test non rendu : '+id);
}
async function load(win,segment,id){
  await win.loadFile(page,{query:{segment}});
  await waitReady(win,id);
  await wait(150);
}
async function inspectImage(win,selector,expected){
  return win.webContents.executeJavaScript(`
    (() => {
      const img=document.querySelector(${JSON.stringify(selector)});
      const rect=img?.getBoundingClientRect();
      const parent=img?.parentElement?.getBoundingClientRect();
      return {
        src:img?.getAttribute('src')||'',
        complete:!!img?.complete,
        naturalWidth:img?.naturalWidth||0,
        naturalHeight:img?.naturalHeight||0,
        visible:!!(rect&&rect.width>0&&rect.height>0),
        fits:!!(!parent||!rect||(rect.width<=parent.width+2&&rect.height<=parent.height+2)),
        expected:${JSON.stringify(expected)}
      };
    })()
  `,true);
}
function assertImage(result,id,src){
  if(result.src!==src||!result.complete||result.naturalWidth<100||result.naturalHeight<100||!result.visible||!result.fits){
    throw new Error(id+' : image non chargée/cadrée '+JSON.stringify(result));
  }
}

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async()=>{
  const win=new BrowserWindow({
    show:false,width:1366,height:768,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false}
  });
  try{
    const cases=[
      ['fractions','fractions_preparation_lots','.kaltest-visual-panel img','imageqcm/kaloneo-fractions-proportions.webp'],
      ['organisation','organisation_demenagement','.kaltest-visual-panel img','imageqcm/kaloneo-organisation-demenagement.webp'],
      ['autoeval1','autoevaluation_savoirs','.kaltest-visual-panel img','imageqcm/kaloneo-autoevaluation-savoirs.webp'],
      ['brique','construction_briques','.kaltest-brique-image-card img','imageqcm/kaloneo-lego-f1-orange.webp'],
      ['autoeval2','autoevaluation_tic','.kaltest-visual-panel img','imageqcm/kaloneo-autoevaluation-tic.webp']
    ];
    for(const [segment,id,selector,src] of cases){
      await load(win,segment,id);
      const result=await inspectImage(win,selector,src);
      assertImage(result,id,src);
      console.log('KALTEST_IMAGE_'+id.toUpperCase()+'=OK');
    }

    await load(win,'planning','planning_cantine');
    const planning=await win.webContents.executeJavaScript(`
      (async()=>{
        const layout=document.querySelector('.kaltest-planning-layout');
        const expected='imageqcm/kaloneo-planning-restaurant.webp';
        const variable=layout?.style.getPropertyValue('--kaltest-planning-bg')||'';
        const img=new Image();
        const loaded=new Promise(resolve=>{
          img.onload=()=>resolve(true);
          img.onerror=()=>resolve(false);
        });
        img.src=expected;
        const ok=await loaded;
        return {
          variable,
          expected,
          loaded:ok,
          naturalWidth:img.naturalWidth||0,
          naturalHeight:img.naturalHeight||0,
          visible:!!(layout&&layout.getBoundingClientRect().width>0&&layout.getBoundingClientRect().height>0)
        };
      })()
    `,true);
    if(!planning.variable.includes(planning.expected)||!planning.loaded||planning.naturalWidth<100||planning.naturalHeight<100||!planning.visible){
      throw new Error('planning_cantine : fond non chargé '+JSON.stringify(planning));
    }
    console.log('KALTEST_IMAGE_PLANNING_CANTINE=OK');
    console.log('KALTEST_SIX_MORE_IMAGES_ELECTRON=OK');
    win.destroy();
    app.exit(0);
  }catch(error){
    try{if(!win.isDestroyed())win.destroy();}catch(_){}
    fail(error?.message||String(error),error?.stack||'');
  }
}).catch(error=>fail(error?.message||String(error),error?.stack||''));

setTimeout(()=>fail('Timeout global smoke six images.'),70000);
