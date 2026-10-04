const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'app', 'web');

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
function fail(message,data){ throw new Error(message+(data?' — '+JSON.stringify(data):'')); }

function createWindow(width,height){
  return new BrowserWindow({
    show:false,
    width,
    height,
    useContentSize:true,
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:false,
      devTools:false,
      spellcheck:false
    }
  });
}

async function load(win,file,options){
  let lastError=null;
  for(let attempt=0;attempt<3;attempt+=1){
    try{
      await win.loadFile(path.join(web,file),options||{});
      await wait(650);
      return;
    }catch(error){
      lastError=error;
      await wait(220);
    }
  }
  throw lastError;
}

async function js(win,code){ return win.webContents.executeJavaScript(code,true); }

async function barSnapshot(win){
  return js(win,`(() => {
    const bar=document.getElementById('kaloneo-common-navigation');
    const body=document.body;
    const visibleActions=Array.from(document.querySelectorAll('#kaloneo-nav-center .kaloneo-nav-action')).filter(b=>!b.hidden);
    const hiddenActions=Array.from(document.querySelectorAll('#kaloneo-nav-center .kaloneo-nav-action')).filter(b=>b.hidden);
    const rect=el=>el?({left:el.getBoundingClientRect().left,top:el.getBoundingClientRect().top,right:el.getBoundingClientRect().right,bottom:el.getBoundingClientRect().bottom,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}):null;
    return {
      innerWidth:window.innerWidth,
      innerHeight:window.innerHeight,
      body:rect(body),
      bar:rect(bar),
      bg:bar?getComputedStyle(bar).backgroundImage:'',
      brand:(() => {const b=document.getElementById('kaloneo-nav-brand');const s=b?getComputedStyle(b):null;return b?{rect:rect(b),background:s?.backgroundColor||''}:null})(),
      logo:(() => {const i=document.getElementById('kaloneo-nav-logo-img');return i?{src:i.src,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,rect:rect(i)}:null})(),
      actions:visibleActions.map(b=>({text:(b.textContent||'').trim(),rect:rect(b),disabled:b.disabled})),
      hiddenRects:hiddenActions.map(b=>rect(b)),
      emptyVisible:visibleActions.filter(b=>!(b.textContent||'').trim()).length,
      home:rect(document.getElementById('kaloneo-nav-home')),
      abandonVisible:(() => {const b=document.getElementById('kaloneo-nav-abandon');return !!b&&!b.hidden&&getComputedStyle(b).display!=='none'})(),
      bodyScrollHeight:body.scrollHeight,
      bodyClientHeight:body.clientHeight,
      docScrollHeight:document.documentElement.scrollHeight,
      docClientHeight:document.documentElement.clientHeight
    };
  })()`);
}

function assertBar(s,label){
  if(!s.bar) fail(label+': barre absente',s);
  if(Math.abs(s.bar.height-52)>2) fail(label+': barre != 52px',s);
  if(Math.abs(s.bar.bottom-s.innerHeight)>2) fail(label+': barre non collée au bas',s);
  if(!/linear-gradient/i.test(s.bg) || !/0, 78, 112|0, 59, 87|53, 103, 135/.test(s.bg)) fail(label+': dégradé bleu KALONÉO absent',s);
  if(!s.logo || !/^data:image\/png;base64,/i.test(s.logo.src) || s.logo.naturalWidth<32) fail(label+': icône officielle KALONÉO absente',s);
  if(!s.brand || Math.abs(s.brand.rect.width-36)>2 || Math.abs(s.brand.rect.height-36)>2) fail(label+': carré icône KALONÉO != 36px',s);
  if(!/59, 129, 156/.test(s.brand.background)) fail(label+': fond bleu clair de l’icône absent',s);
  if(s.emptyVisible!==0) fail(label+': bouton vide visible',s);
  for(const r of s.hiddenRects){
    if(r && r.width>1 && r.height>1) fail(label+': slot masqué garde une taille',s);
  }
  if(s.body && Math.abs(s.body.bottom-s.bar.top)>3) fail(label+': zone de travail et barre se chevauchent ou laissent un trou',s);
  if(s.bodyScrollHeight>s.bodyClientHeight+3) fail(label+': body scroll vertical',s);
  if(s.docScrollHeight>s.docClientHeight+3) fail(label+': document scroll vertical',s);
}

async function waitKaltest(win,id){
  for(let i=0;i<80;i++){
    const current=await js(win,`window.sebKaltestPilot2?.currentTest?.()?.id||''`).catch(()=> '');
    if(current===id) return;
    await wait(60);
  }
  throw new Error('KALTEST non prêt: '+id);
}

async function testConversions(width,height){
  const win=createWindow(width,height);
  try{
    await load(win,'kaltest-pilot2.html',{query:{fullParcours:'1',segment:'conversions'}});
    await waitKaltest(win,'conversions_atelier_expedition');
    await wait(250);
    const bar=await barSnapshot(win);
    if(Math.abs(bar.innerWidth-width)>3 || Math.abs(bar.innerHeight-height)>3){
      fail(`Conversions: viewport réel différent de ${width}x${height}`,bar);
    }
    assertBar(bar,`Conversions ${width}x${height}`);
    if(!bar.actions.some(a=>/calculatrice/i.test(a.text))) fail('Conversions: calculatrice absente de la barre',bar);
    if(!bar.actions.some(a=>/suivant/i.test(a.text))) fail('Conversions: Suivant absent de la barre',bar);
    const metrics=await js(win,`(() => {
      const wrap=document.querySelector('.kaltest-conversions-work .kaltest-table-wrap');
      const table=document.querySelector('.kaltest-conversions-table');
      const rows=Array.from(document.querySelectorAll('.kaltest-conversions-table tbody tr'));
      const calc=document.getElementById('kaltest-calculator');
      const footer=document.querySelector('.kaltest-footer');
      const content=document.getElementById('kaltest-content');
      const rect=el=>el?({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height}):null;
      return {
        wrapClient:wrap?.clientHeight||0,
        wrapScroll:wrap?.scrollHeight||0,
        table:rect(table),
        last:rect(rows[rows.length-1]),
        content:rect(content),
        calcRect:rect(calc),
        calcOpacity:calc?getComputedStyle(calc).opacity:'',
        footer:rect(footer),
        rowCount:rows.length
      };
    })()`);
    if(metrics.rowCount!==10) fail('Conversions: 10 lignes attendues',metrics);
    if(metrics.wrapScroll>metrics.wrapClient+3) fail('Conversions: scrollbar interne encore présente',metrics);
    if(!metrics.last || !metrics.content || metrics.last.bottom>metrics.content.bottom+2) fail('Conversions: dernière ligne hors zone utile',metrics);
    if(metrics.calcRect && metrics.calcRect.width>2 && metrics.calcOpacity!=='0') fail('Conversions: bouton calculatrice encore visible dans la page',metrics);
    return {bar,metrics};
  } finally { try{win.destroy()}catch(_){} await wait(180); }
}

async function testIdentification1200(){
  const win=createWindow(1200,800);
  try{
    await load(win,'kaltest-pilot2.html');
    const bar=await barSnapshot(win);
    assertBar(bar,'Identification 1200x800');
    const m=await js(win,`(() => {
      const grid=document.querySelector('.pilot2-onboarding-grid');
      const shell=document.getElementById('pilot2-shell');
      const calcTest=document.getElementById('pilot2-calculator-test-open');
      const calcInBar=Array.from(document.querySelectorAll('#kaloneo-nav-center .kaloneo-nav-action')).some(b=>/calculatrice/i.test(b.textContent||''));
      const r=el=>el?el.getBoundingClientRect():null;
      const g=r(grid),s=r(shell);
      return {
        grid:g?{left:g.left,right:g.right,width:g.width}:null,
        shell:s?{left:s.left,right:s.right,width:s.width}:null,
        bodyOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        calcTestVisible:calcTest?getComputedStyle(calcTest).display!=='none':false,
        calcTestRect:calcTest?{width:calcTest.getBoundingClientRect().width,height:calcTest.getBoundingClientRect().height}:null,
        calcInBar
      };
    })()`);
    if(m.bodyOverflow>2) fail('Identification 1200x800: débordement horizontal',m);
    if(!m.calcTestVisible || !m.calcTestRect || m.calcTestRect.width<40 || m.calcTestRect.height<25) fail('Identification: bouton de test Calculatrice absent de la page',m);
    if(m.calcInBar) fail('Identification: la calculatrice de prise en main ne doit pas être déplacée dans la barre',m);
    if(m.grid && m.shell && (m.grid.left<m.shell.left-2 || m.grid.right>m.shell.right+2)) fail('Identification 1200x800: grille hors écran',m);
    return {bar,m};
  } finally { try{win.destroy()}catch(_){} await wait(180); }
}

async function testTri(){
  const win=createWindow(1366,768);
  try{
    await load(win,'tri_de_cheville.html');
    let bar=await barSnapshot(win);
    assertBar(bar,'Tri initial');
    await js(win,`document.getElementById('startBtn')?.click();true`);
    await wait(120);
    const timerStyle=await js(win,`(() => {
      const b=document.getElementById('startBtn');
      const s=b?getComputedStyle(b):null;
      return b?{border:s.borderColor,outline:s.outlineColor,disabled:b.disabled}:null;
    })()`);
    if(!timerStyle || timerStyle.border!=='rgb(25, 135, 84)' || /249, 178, 51|249,178,51|f9b233/i.test(timerStyle.outline)) fail('Tri: contour orange encore présent sur Démarrer',timerStyle);
    await js(win,`window.sebTri?.stopChrono?.();true`);
    await wait(80);

    const initial=await js(win,`(() => {
      const header=document.querySelector('.header');
      const main=document.querySelector('.main');
      const left=document.getElementById('left');
      const bar=document.getElementById('kaloneo-common-navigation');
      const r=el=>el?({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height}):null;
      return {header:r(header),main:r(main),left:r(left),bar:r(bar),scrollY:window.scrollY};
    })()`);
    if(initial.scrollY!==0 || initial.header.top<0 || initial.main.bottom>initial.bar.top+2) fail('Tri initial: contenu décalé',initial);

    await js(win,`(() => {
      const c=document.getElementById('consigne');
      const a=document.getElementById('autoEvalPart');
      if(c){c.classList.add('tri-consigne-replaced');c.style.display='none';}
      if(a){a.style.display='flex';a.classList.add('visible');}
      document.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    })()`);
    await wait(120);
    bar=await barSnapshot(win);
    assertBar(bar,'Tri autoévaluation');
    const auto=await js(win,`(() => {
      const a=document.getElementById('autoEvalPart');
      const left=document.getElementById('left');
      const main=document.querySelector('.main');
      const bar=document.getElementById('kaloneo-common-navigation');
      const r=el=>el?({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height}):null;
      return {auto:r(a),left:r(left),main:r(main),bar:r(bar),scrollY:window.scrollY,autoScroll:a?.scrollHeight||0,autoClient:a?.clientHeight||0};
    })()`);
    if(auto.scrollY!==0) fail('Tri autoévaluation: page scrollée',auto);
    if(!auto.auto || !auto.left || auto.auto.top>auto.left.top+15) fail('Tri autoévaluation: bloc gauche encore décalé vers le bas',auto);
    if(auto.auto.bottom>auto.bar.top+2) fail('Tri autoévaluation: contenu derrière la barre',auto);
    if(auto.autoScroll>auto.autoClient+3) fail('Tri autoévaluation: scroll interne inutile',auto);
    return {bar,initial,auto};
  } finally { try{win.destroy()}catch(_){} await wait(180); }
}

async function testMailAndStock(){
  const win=createWindow(1366,768);
  try{
    await load(win,'nvmail.html');
    let bar=await barSnapshot(win);
    assertBar(bar,'E-mail');
    const mail=await js(win,`(() => {
      const score=document.getElementById('resultatScore');
      score.textContent='Message envoyé ! 👍';
      const modal=document.getElementById('modalFichier');
      if(modal)modal.style.display='block';
      const li=document.querySelector('#modalFichier li');
      const s=getComputedStyle(score);
      return {
        bg:s.backgroundImage,
        color:s.color,
        border:s.borderTopColor,
        borderWidth:s.borderTopWidth,
        listType:li?getComputedStyle(li.parentElement).listStyleType:'',
        marker:li?getComputedStyle(li,'::marker').content:''
      };
    })()`);
    if(mail.bg!=='none') fail('E-mail: la confirmation doit rester un message intégré sans fond',mail);
    if(parseFloat(mail.borderWidth||'0')>0) fail('E-mail: la confirmation ne doit plus être encadrée',mail);
    if(mail.listType!=='none' || String(mail.marker).includes('•')) fail('E-mail: puces encore présentes devant les fichiers',mail);

    await load(win,'planning.html');
    bar=await barSnapshot(win);
    assertBar(bar,'Planning');
    const planning=await js(win,`(() => {
      const page=document.querySelector('.container');
      const scenario=document.querySelector('.header.kaloneo-context-scenario');
      const consigne=document.querySelector('.consigne-header.kaloneo-context-consigne');
      const main=document.querySelector('.main-content');
      const r=el=>el?el.getBoundingClientRect():null;
      const p=r(page),s=r(scenario),c=r(consigne),m=r(main);
      return {
        page:p?{left:p.left,right:p.right,width:p.width}:null,
        scenario:s?{left:s.left,right:s.right,width:s.width,bottom:s.bottom}:null,
        consigne:c?{left:c.left,right:c.right,width:c.width,top:c.top,bottom:c.bottom}:null,
        main:m?{top:m.top}:null
      };
    })()`);
    if(!planning.page||!planning.scenario||!planning.consigne||!planning.main) fail('Planning: structure incomplète',planning);
    if(planning.scenario.width<planning.page.width*.94 || planning.consigne.width<planning.page.width*.94) fail('Planning: Scénario/Consigne non pleine largeur',planning);
    if(planning.consigne.top<planning.scenario.bottom-2 || planning.main.top<planning.consigne.bottom-2) fail('Planning: ordre Scénario > Consigne > contenu incorrect',planning);

    await load(win,'stock.html');
    bar=await barSnapshot(win);
    assertBar(bar,'Stock');
    const stock=await js(win,`(() => {
      const p=document.querySelector('.k-stock-instruction-grid p');
      const before=p?getComputedStyle(p,'::before'):null;
      return {content:before?.content||'',bg:before?.backgroundImage||'',scrollY:window.scrollY};
    })()`);
    if(!String(stock.content).includes('•') || (stock.bg&&stock.bg!=='none')) fail('Stock: ancienne puce image encore présente',stock);
    return {mail,stock};
  } finally { try{win.destroy()}catch(_){} await wait(180); }
}

async function testFractions1200AndFinal(){
  const win=createWindow(1200,800);
  try{
    await load(win,'qcmv1.0.html',{query:{page:'4'},hash:'page4'});
    let bar=await barSnapshot(win);
    assertBar(bar,'Fractions 1200x800');
    if(bar.actions.length!==0) fail('Fractions: action vide ou prématurée',bar);
    await js(win,`document.querySelector('#page4 .item')?.click();true`);
    await wait(100);
    bar=await barSnapshot(win);
    assertBar(bar,'Fractions après réponse 1200x800');
    if(bar.actions.length!==1 || !/suivant/i.test(bar.actions[0].text)) fail('Fractions: un seul Suivant attendu',bar);

    await load(win,'qcmv1.0.html',{query:{page:'finale'},hash:'pageFinale'});
    bar=await barSnapshot(win);
    assertBar(bar,'Fin évaluation');
    if(bar.abandonVisible) fail('Fin évaluation: Abandonner encore visible',bar);
    return bar;
  } finally { try{win.destroy()}catch(_){} await wait(180); }
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  try{
    const conversions=[];
    for(const [w,h] of [[1366,768],[1200,800],[1280,720],[1920,1080]]){
      conversions.push({viewport:[w,h],result:await testConversions(w,h)});
    }
    const identification=await testIdentification1200();
    const tri=await testTri();
    const mailStock=await testMailAndStock();
    const fractionsFinal=await testFractions1200AndFinal();

    console.log('PILOT16_RESPONSIVE_SMOKE: OK');
    console.log(JSON.stringify({conversions,identification,tri,mailStock,fractionsFinal}));
    app.exit(0);
  }catch(error){
    console.error('PILOT16_RESPONSIVE_SMOKE: FAIL — '+(error?.message||error));
    if(error?.stack) console.error(error.stack);
    app.exit(2);
  }
}).catch(error=>{console.error(error);app.exit(2)});

setTimeout(()=>{console.error('PILOT16_RESPONSIVE_SMOKE: TIMEOUT');app.exit(3)},120000);
