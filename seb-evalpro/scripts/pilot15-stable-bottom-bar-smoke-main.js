const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'app', 'web');

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function load(win,file,options){
  await win.loadFile(path.join(web,file),options||{});
  await wait(750);
}
async function js(win,code){ return win.webContents.executeJavaScript(code,true); }
function fail(message,data){ throw new Error(message+(data?' — '+JSON.stringify(data):'')); }

async function navSnapshot(win){
  return js(win,`(() => {
    const bar=document.getElementById('kaloneo-common-navigation');
    const brand=document.getElementById('kaloneo-nav-brand');
    const center=document.getElementById('kaloneo-nav-center');
    const home=document.getElementById('kaloneo-nav-home');
    const clock=document.getElementById('kaloneo-nav-clock');
    const actions=Array.from(document.querySelectorAll('#kaloneo-nav-center .kaloneo-nav-action')).filter(b=>!b.hidden);
    const abandon=document.getElementById('kaloneo-nav-abandon');
    const rect=(el)=>el?({left:el.getBoundingClientRect().left,top:el.getBoundingClientRect().top,right:el.getBoundingClientRect().right,bottom:el.getBoundingClientRect().bottom,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}):null;
    return {
      innerHeight:window.innerHeight,
      bar:rect(bar),
      brand:rect(brand),
      center:rect(center),
      home:rect(home),
      clock:rect(clock),
      abandon:rect(abandon),
      abandonVisible:abandon?getComputedStyle(abandon).display!=='none':false,
      actionTexts:actions.map(b=>(b.textContent||'').trim()),
      actionRects:actions.map(rect),
      actionDisabled:actions.map(b=>b.disabled),
      time:(document.getElementById('kaloneo-nav-time')?.textContent||'').trim(),
      date:(document.getElementById('kaloneo-nav-date')?.textContent||'').trim(),
      bodyPadding:getComputedStyle(document.body).paddingBottom,
      barBg:bar?getComputedStyle(bar).backgroundImage:'',
      barBorder:bar?getComputedStyle(bar).borderTopWidth:'',
      topbar:(() => {
        const t=document.getElementById('seb-evalpro-topbar');
        if(!t) return null;
        const s=getComputedStyle(t);
        return {position:s.position,top:t.getBoundingClientRect().top,transform:s.transform};
      })()
    };
  })()`);
}

function assertCommon(s,label){
  if(!s.bar) fail(label+': barre KALONÉO absente',s);
  if(Math.abs(s.bar.height-52)>1.5) fail(label+': hauteur barre différente de 52 px',s);
  if(Math.abs(s.bar.bottom-s.innerHeight)>2) fail(label+': barre non collée au bas de la zone visible',s);
  if(!s.brand || s.brand.width<60) fail(label+': identité KALONÉO absente à gauche',s);
  if(!s.clock || !/^\d{2}:\d{2}$/.test(s.time) || !/^\d{2}\/\d{2}\/\d{4}$/.test(s.date)) fail(label+': date/heure absente ou incorrecte',s);
  if(s.bodyPadding!=='52px') fail(label+': hauteur de barre non réservée dans la page',s);
  if(!s.barBg || s.barBg==='none' || s.barBorder==='0px') fail(label+': barre pas assez matérialisée visuellement',s);
  if(s.topbar && s.topbar.position!=='fixed') fail(label+': barre Admin n’est plus fixe',s);
  if(s.home){
    if(Math.abs(s.home.height-36)>2) fail(label+': bouton accueil pas à la hauteur commune',s);
    if(Math.abs((s.home.top+s.home.height/2)-(s.bar.top+s.bar.height/2))>3) fail(label+': bouton accueil non centré verticalement',s);
  }
  s.actionRects.forEach((r,i)=>{
    if(Math.abs(r.height-36)>2) fail(label+': action '+i+' pas à la hauteur commune',s);
    if(Math.abs((r.top+r.height/2)-(s.bar.top+s.bar.height/2))>3) fail(label+': action '+i+' non centrée verticalement',s);
  });
  if(s.abandonVisible && s.abandon){
    if(Math.abs(s.abandon.height-36)>2) fail(label+': Abandonner pas à la hauteur commune',s);
    if(Math.abs((s.abandon.top+s.abandon.height/2)-(s.bar.top+s.bar.height/2))>3) fail(label+': Abandonner non centré',s);
  }
}

app.commandLine.appendSwitch('disable-gpu');

function createWindow(){
  return new BrowserWindow({
    show:false,
    width:1366,
    height:768,
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

async function withPage(file,options,callback){
  const win=createWindow();
  try{
    await load(win,file,options);
    return await callback(win);
  } finally {
    try{ if(!win.isDestroyed()) win.destroy(); }catch(_){}
    await wait(90);
  }
}

app.whenReady().then(async()=>{
  try{
    const frac=await withPage('qcmv1.0.html',{query:{page:'4'},hash:'page4'},async(win)=>{
      let snap=await navSnapshot(win);
      assertCommon(snap,'Fractions');
      if(snap.actionTexts.length>1) fail('Fractions: plusieurs actions Suivant dès l’ouverture',snap);
      await js(win,`document.querySelector('#page4 .item')?.click();true`);
      await wait(260);
      snap=await navSnapshot(win);
      assertCommon(snap,'Fractions après réponse');
      if(snap.actionTexts.length!==1 || !/Suivant/i.test(snap.actionTexts[0])) fail('Fractions: exactement un seul Suivant attendu',snap);
      const sources=await js(win,`(() => ({
        owned:Array.from(document.querySelectorAll('#page4 button.seb-kaloneo-owned-nav-source')).map(b=>b.id||b.className),
        visibleOriginal:Array.from(document.querySelectorAll('#page4 button.seb-kaloneo-owned-nav-source')).filter(b=>{const r=b.getBoundingClientRect();return r.width>2&&r.height>2&&getComputedStyle(b).opacity!=='0'}).length
      }))()`);
      if(sources.visibleOriginal!==0) fail('Fractions: ancien bouton encore visible dans la page',sources);
      return {snap,sources};
    });

    const planning=await withPage('planning.html',null,async(win)=>{
      const snap=await navSnapshot(win);
      assertCommon(snap,'Planning');
      if(snap.actionTexts.length!==1 || !/Valider mon planning/i.test(snap.actionTexts[0])) fail('Planning: une seule action Valider attendue',snap);
      return snap;
    });

    const brique=await withPage('brique.html',null,async(win)=>{
      const snap=await navSnapshot(win);
      assertCommon(snap,'Briques');
      const layout=await js(win,`(() => {
        const title=document.querySelector('h1');
        const scenario=document.querySelector('.kaloneo-context-scenario');
        const consigne=document.querySelector('.kaloneo-context-consigne');
        return {
          titleTop:title?.getBoundingClientRect().top ?? null,
          scenarioTop:scenario?.getBoundingClientRect().top ?? null,
          consigneTop:consigne?.getBoundingClientRect().top ?? null,
          scrollY:window.scrollY
        };
      })()`);
      if(layout.titleTop!==null && layout.titleTop<-1) fail('Briques: titre décalé hors écran',layout);
      if(layout.scenarioTop!==null && layout.scenarioTop<-1) fail('Briques: scénario décalé hors écran',layout);
      if(layout.consigneTop!==null && layout.consigneTop<-1) fail('Briques: consigne décalée hors écran',layout);
      return {snap,layout};
    });

    const tri=await withPage('tri_de_cheville.html',null,async(win)=>{
      const snap=await navSnapshot(win);
      assertCommon(snap,'Tri');
      if(snap.actionTexts.length>1) fail('Tri: plusieurs actions concurrentes au démarrage',snap);
      return snap;
    });

    const dictee=await withPage('dictee.html',null,async(win)=>{
      const snap=await navSnapshot(win);
      assertCommon(snap,'Dictée');
      if(snap.actionTexts.length!==1 || !/Dictée terminée|Suivant/i.test(snap.actionTexts[0])) fail('Dictée: action unique attendue',snap);
      return snap;
    });

    const mail=await withPage('nvmail.html',null,async(win)=>{
      const snap=await navSnapshot(win);
      assertCommon(snap,'E-mail');
      await js(win,`document.getElementById('nvmail-file-picker')?.click();true`);
      await wait(120);
      const attachment=await js(win,`(() => {
        const ul=document.querySelector('#modalFichier ul');
        const li=document.querySelector('#modalFichier li');
        return {
          className:ul?.className||'',
          type:ul?getComputedStyle(ul).listStyleType:'',
          marker:li?getComputedStyle(li,'::marker').content:''
        };
      })()`);
      if(attachment.type!=='none' || String(attachment.marker).includes('•')) fail('E-mail: puce encore présente devant les fichiers',attachment);
      return {snap,attachment};
    });

    const puzzle=await withPage('carre.html',null,async(win)=>{
      const snap=await navSnapshot(win);
      assertCommon(snap,'Puzzle');
      if(snap.actionTexts.length<2 || snap.actionTexts.length>3) fail('Puzzle: nombre d’actions centrales incohérent',snap);
      if(new Set(snap.actionTexts).size!==snap.actionTexts.length) fail('Puzzle: action dupliquée',snap);
      return snap;
    });

    console.log('PILOT15_STABLE_BOTTOM_BAR: OK');
    console.log(JSON.stringify({frac,planning,brique,tri,dictee,mail,puzzle}));
    app.exit(0);
  }catch(error){
    console.error('PILOT15_STABLE_BOTTOM_BAR: FAIL — '+(error?.message||error));
    if(error?.stack) console.error(error.stack);
    app.exit(2);
  }
}).catch(error=>{console.error(error);app.exit(2)});

setTimeout(()=>{console.error('PILOT15_STABLE_BOTTOM_BAR: TIMEOUT');app.exit(3)},90000);
