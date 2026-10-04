const { app, BrowserWindow } = require('electron');
const path = require('path');

const width=Number(process.env.PILOT16_WIDTH||1366);
const height=Number(process.env.PILOT16_HEIGHT||768);
const pageName=String(process.env.PILOT16_PAGE||'conversions');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'app','web');

function wait(ms){return new Promise(r=>setTimeout(r,ms));}
function fail(message,data){throw new Error(message+(data?' — '+JSON.stringify(data):''));}
async function load(win,file,options){await win.loadFile(path.join(web,file),options||{});await wait(650);}
async function js(win,code){return win.webContents.executeJavaScript(code,true);}
async function waitKaltest(win,id){
  for(let i=0;i<120;i+=1){
    const cur=await js(win,`window.sebKaltestPilot2?.currentTest?.()?.id||''`).catch(()=> '');
    if(cur===id)return;
    await wait(50);
  }
  throw new Error('KALTEST non prêt: '+id);
}
async function base(win,label){
  const s=await js(win,`(() => {
    const bar=document.getElementById('kaloneo-common-navigation');
    const body=document.body;
    const rect=el=>el?({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}):null;
    const actions=Array.from(document.querySelectorAll('#kaloneo-nav-center .kaloneo-nav-action')).filter(b=>!b.hidden);
    return {
      innerWidth:window.innerWidth,innerHeight:window.innerHeight,
      bar:rect(bar),body:rect(body),
      bodyScroll:body.scrollHeight-body.clientHeight,
      docScroll:document.documentElement.scrollHeight-document.documentElement.clientHeight,
      xScroll:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      bg:bar?getComputedStyle(bar).backgroundImage:'',
      actions:actions.map(b=>(b.textContent||'').trim()),
      empty:actions.filter(b=>!(b.textContent||'').trim()).length,
      abandonVisible:(()=>{const b=document.getElementById('kaloneo-nav-abandon');return !!b&&!b.hidden&&getComputedStyle(b).display!=='none'})(),
      logo:(()=>{const i=document.getElementById('kaloneo-nav-logo-img');return i?{naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,src:i.src}:null})()
    };
  })()`);
  if(Math.abs(s.innerWidth-width)>3||Math.abs(s.innerHeight-height)>3)fail(label+': viewport réel incorrect',s);
  if(!s.bar||Math.abs(s.bar.height-52)>2||Math.abs(s.bar.bottom-s.innerHeight)>2)fail(label+': barre incorrecte',s);
  if(!s.body||Math.abs(s.body.top)>2||Math.abs(s.body.bottom-s.bar.top)>3)fail(label+': zone utile incorrecte',s);
  if(s.bodyScroll>3||s.docScroll>3||s.xScroll>3)fail(label+': scroll global inattendu',s);
  if(!/linear-gradient/i.test(s.bg))fail(label+': gradient absent',s);
  if(!s.logo||!s.logo.naturalWidth||!/^data:image\/jpeg;base64,/i.test(s.logo.src))fail(label+': logo fourni absent',s);
  if(s.empty)fail(label+': bouton vide visible',s);
  return s;
}

async function runPage(win){
  if(pageName==='conversions'){
    await load(win,'kaltest-pilot2.html',{query:{fullParcours:'1',segment:'conversions'}});
    await waitKaltest(win,'conversions_atelier_expedition');
    await wait(180);
    const b=await base(win,'Conversions');
    if(!b.actions.some(x=>/calculatrice/i.test(x))||!b.actions.some(x=>/suivant/i.test(x)))fail('Conversions: actions barre incomplètes',b);
    const m=await js(win,`(() => {
      const wrap=document.querySelector('.kaltest-conversions-work .kaltest-table-wrap');
      const rows=Array.from(document.querySelectorAll('.kaltest-conversions-table tbody tr'));
      const content=document.getElementById('kaltest-content');
      const last=rows[rows.length-1];
      const r=el=>el?({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height}):null;
      return {rows:rows.length,wrapClient:wrap?.clientHeight||0,wrapScroll:wrap?.scrollHeight||0,last:r(last),content:r(content)};
    })()`);
    if(m.rows!==10||m.wrapScroll>m.wrapClient+3||!m.last||m.last.bottom>m.content.bottom+2)fail('Conversions: contenu/scroll incorrect',m);
    return {base:b,metrics:m};
  }

  if(pageName==='fractions'){
    await load(win,'qcmv1.0.html',{query:{page:'4'},hash:'page4'});
    await wait(180);
    const b=await base(win,'Fractions');
    const m=await js(win,`(() => {
      const wrap=document.querySelector('#page4 .k-qcm-fractions-layout');
      const kids=wrap?Array.from(wrap.children):[];
      return kids.length===2?{left:kids[0].getBoundingClientRect().width,right:kids[1].getBoundingClientRect().width,top:wrap.getBoundingClientRect().top,bottom:wrap.getBoundingClientRect().bottom,barTop:document.getElementById('kaloneo-common-navigation').getBoundingClientRect().top}:null;
    })()`);
    if(!m||Math.abs(m.left/(m.left+m.right)-.4)>.06||m.top<0||m.bottom>m.barTop+2)fail('Fractions: 40/60 ou hauteur incorrecte',m);
    return {base:b,metrics:m};
  }

  if(pageName==='nwtexte'){
    await load(win,'nwtexte.html');
    await wait(180);
    const b=await base(win,'Traitement de texte');
    const m=await js(win,`(() => {
      const l=document.getElementById('left'),r=document.getElementById('right'),page=document.getElementById('page7'),bar=document.getElementById('kaloneo-common-navigation');
      return {left:l?.getBoundingClientRect().width||0,right:r?.getBoundingClientRect().width||0,pageTop:page?.getBoundingClientRect().top??null,pageBottom:page?.getBoundingClientRect().bottom??null,barTop:bar?.getBoundingClientRect().top??null};
    })()`);
    if(!m.left||!m.right||Math.abs(m.left/(m.left+m.right)-.5)>.04||m.pageTop<0||m.pageBottom>m.barTop+2)fail('Traitement de texte: 50/50 ou hauteur incorrecte',m);
    return {base:b,metrics:m};
  }

  if(pageName==='tri'){
    await load(win,'tri_de_cheville.html');
    await wait(180);
    const b=await base(win,'Tri');
    const m=await js(win,`(() => {
      const header=document.querySelector('.header'),main=document.querySelector('.main'),bar=document.getElementById('kaloneo-common-navigation');
      return {headerTop:header?.getBoundingClientRect().top??null,mainBottom:main?.getBoundingClientRect().bottom??null,barTop:bar?.getBoundingClientRect().top??null};
    })()`);
    if(m.headerTop===null||m.mainBottom===null||m.headerTop<0||m.mainBottom>m.barTop+2)fail('Tri: bloc hors zone utile',m);
    return {base:b,metrics:m};
  }

  if(pageName==='stock'){
    await load(win,'stock.html');
    await wait(180);
    const b=await base(win,'Stock');
    const m=await js(win,`(() => {
      const p=document.querySelector('.k-stock-instruction-grid p');
      const before=p?getComputedStyle(p,'::before'):null;
      return {content:before?.content||'',bg:before?.backgroundImage||''};
    })()`);
    if(!String(m.content).includes('•')||(m.bg&&m.bg!=='none'))fail('Stock: ancienne puce encore présente',m);
    return {base:b,metrics:m};
  }

  throw new Error('Page de smoke inconnue: '+pageName);
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win=new BrowserWindow({
    show:false,width,height,useContentSize:true,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:false,devTools:false,spellcheck:false}
  });
  try{
    const result=await runPage(win);
    console.log(`PILOT16_VIEWPORT_${width}x${height}_${pageName}: OK`);
    console.log(JSON.stringify(result));
    app.exit(0);
  }catch(error){
    console.error(`PILOT16_VIEWPORT_${width}x${height}_${pageName}: FAIL — ${error?.message||error}`);
    if(error?.stack)console.error(error.stack);
    app.exit(2);
  }
}).catch(error=>{
  console.error(`PILOT16_VIEWPORT_${width}x${height}_${pageName}: FAIL — ${error?.message||error}`);
  app.exit(2);
});

setTimeout(()=>{console.error(`PILOT16_VIEWPORT_${width}x${height}_${pageName}: TIMEOUT`);app.exit(3)},80000);
