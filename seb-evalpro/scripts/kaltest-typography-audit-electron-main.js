'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function fail(message, detail) {
  console.error('KALTEST_TYPOGRAPHY_AUDIT: FAIL — ' + message);
  if (detail) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  app.exit(2);
}

async function waitReady(win, id) {
  for (let i=0;i<140;i+=1) {
    const ready = await win.webContents.executeJavaScript(
      `Boolean(window.sebKaltestPilot2 && window.sebKaltestPilot2.currentTest()?.id === ${JSON.stringify(id)} && document.body.dataset.sebKaltestId === ${JSON.stringify(id)})`,
      true
    ).catch(()=>false);
    if (ready) return;
    await wait(50);
  }
  throw new Error('Test non rendu : ' + id);
}

async function loadSegment(win, segment, id) {
  await win.loadFile(page,{query:{segment}});
  await waitReady(win,id);
  await wait(150);
}

async function loadInitialIndex(win,index,id) {
  await win.loadFile(page,{query:{segment:'initial'}});
  for (let i=0;i<120;i+=1) {
    const ok=await win.webContents.executeJavaScript('Boolean(window.sebKaltestPilot2)',true).catch(()=>false);
    if(ok)break;
    await wait(50);
  }
  await win.webContents.executeJavaScript(`
    (() => {
      const api=window.sebKaltestPilot2;
      const state=api.state;
      state.phase='exercise';
      state.testIndex=${index};
      sessionStorage.setItem('seb_kaltest_pilot2_state_v1',JSON.stringify(state));
      return true;
    })()
  `,true);
  await win.reload();
  await waitReady(win,id);
  await wait(150);
}

async function inspect(win) {
  return win.webContents.executeJavaScript(`
    (() => {
      const root=document.querySelector('#page-exercise');
      const visible=el=>{
        const s=getComputedStyle(el),r=el.getBoundingClientRect();
        return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0;
      };
      const directText=el=>Array.from(el.childNodes).some(n=>n.nodeType===3&&String(n.textContent||'').trim());
      const controls=new Set(['BUTTON','INPUT','TEXTAREA','SELECT','OPTION']);
      const rows=[];
      for(const el of root?.querySelectorAll('*')||[]) {
        if(!visible(el)) continue;
        if(!directText(el)&&!controls.has(el.tagName)) continue;
        const size=parseFloat(getComputedStyle(el).fontSize||'0');
        const text=(el.innerText||el.value||el.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,90);
        if(!text&&el.tagName!=='INPUT'&&el.tagName!=='TEXTAREA'&&el.tagName!=='SELECT') continue;
        rows.push({
          tag:el.tagName.toLowerCase(),
          id:el.id||'',
          cls:String(el.className||'').slice(0,100),
          size:Number(size.toFixed(2)),
          text
        });
      }
      const title=document.querySelector('.kaltest-heading h2');
      const progress=document.querySelector('.kaltest-progress');
      const context=document.querySelector('.kaltest-context p');
      const qlist=document.querySelector('.kaltest-question-list');
      const table=document.querySelector('.kaltest-table');
      const field=document.querySelector('.kaltest-table input,.kaltest-table select,.kaltest-table textarea');
      const px=el=>el?Number(parseFloat(getComputedStyle(el).fontSize).toFixed(2)):null;
      return {
        id:document.body.dataset.sebKaltestId||'',
        viewport:[innerWidth,innerHeight],
        key:{title:px(title),progress:px(progress),context:px(context),questions:px(qlist),table:px(table),field:px(field)},
        below15:rows.filter(x=>x.size>0&&x.size<15).sort((a,b)=>a.size-b.size).slice(0,40),
        min:rows.length?Math.min(...rows.filter(x=>x.size>0).map(x=>x.size)):null
      };
    })()
  `,true);
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
      {initial:0,id:'calculs_commandes_atelier'},
      {initial:1,id:'calculs_poids_volumes'},
      {segment:'fractions',id:'fractions_preparation_lots'},
      {segment:'organisation',id:'organisation_demenagement'},
      {segment:'conversions',id:'conversions_atelier_expedition'},
      {segment:'autoeval1',id:'autoevaluation_savoirs'},
      {segment:'brique',id:'construction_briques'},
      {segment:'planning',id:'planning_cantine'},
      {segment:'tri',id:'tri_chevilles'},
      {segment:'mail',id:'redaction_email'},
      {segment:'autoeval2',id:'autoevaluation_tic'}
    ];
    for(const item of cases){
      if(Number.isInteger(item.initial)) await loadInitialIndex(win,item.initial,item.id);
      else await loadSegment(win,item.segment,item.id);
      const result=await inspect(win);
      console.log('KALTEST_TYPO_AUDIT '+JSON.stringify(result));
    }
    console.log('KALTEST_TYPOGRAPHY_AUDIT=OK');
    win.destroy();
    app.exit(0);
  }catch(error){
    try{if(!win.isDestroyed())win.destroy();}catch(_){}
    fail(error?.message||String(error),error?.stack||'');
  }
}).catch(error=>fail(error?.message||String(error),error?.stack||''));

setTimeout(()=>fail('Timeout global audit typographique.'),90000);
