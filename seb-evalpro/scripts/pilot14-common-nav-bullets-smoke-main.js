const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'app', 'web');

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function load(win,file,options){
  await win.loadFile(path.join(web,file),options||{});
  await wait(650);
}
async function js(win,code){ return win.webContents.executeJavaScript(code,true); }
function fail(msg,data){ throw new Error(msg+(data?' — '+JSON.stringify(data):'')); }

async function snapshot(win){
  return js(win,`(() => {
    const bar=document.getElementById('kaloneo-common-navigation');
    const visible=(slot)=>Array.from(document.querySelectorAll('#kaloneo-nav-'+slot+' > button')).filter(b=>!b.hidden).map(b=>({
      text:(b.textContent||'').trim(),
      disabled:b.disabled,
      top:b.getBoundingClientRect().top,
      bottom:b.getBoundingClientRect().bottom
    }));
    return {
      bar:bar?{hidden:bar.hidden,top:bar.getBoundingClientRect().top,bottom:bar.getBoundingClientRect().bottom,height:bar.getBoundingClientRect().height}:null,
      left:visible('left'),
      center:visible('center'),
      right:visible('right'),
      bodyPadding:getComputedStyle(document.body).paddingBottom,
      abandonSource:(() => {
        const b=document.getElementById('seb-evalpro-abandon-fixed');
        if(!b) return {exists:false};
        const s=getComputedStyle(b);
        return {exists:true,display:s.display,visibility:s.visibility,hidden:b.hidden,title:b.title,className:b.className,ariaHidden:b.getAttribute('aria-hidden')};
      })(),
      page4NextSource:(() => {
        const b=document.getElementById('page4Next');
        if(!b) return null;
        const s=getComputedStyle(b);
        return {display:s.display,visibility:s.visibility,hidden:b.hidden,className:b.className,ariaHidden:b.getAttribute('aria-hidden'),activity:sessionStorage.getItem('seb_exercise_activity:qcmv1.0.html#page4')};
      })()
    };
  })()`);
}

function assertBar(s,label){
  if(!s.bar || s.bar.hidden) fail(label+': barre absente',s);
  if(Math.abs(s.bar.height-62)>2) fail(label+': hauteur barre incorrecte',s);
  if(Math.abs(s.bar.bottom-768)>3) fail(label+': barre pas alignée en bas',s);
  if(!s.left.some(x=>/Abandonner/i.test(x.text))) fail(label+': bouton Abandonner absent à gauche',s);
  const all=[...s.left,...s.center,...s.right];
  all.forEach(b=>{ if(Math.abs(b.bottom-(s.bar.bottom-8))>14) fail(label+': boutons à des hauteurs incohérentes',s); });
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win=new BrowserWindow({
    show:false,width:1366,height:768,useContentSize:true,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:false,devTools:false,spellcheck:false}
  });
  try{
    await load(win,'stock.html');
    const stock=await snapshot(win);
    assertBar(stock,'Stock');
    if(!stock.center.some(x=>/Vérifier/i.test(x.text))) fail('Stock: Vérifier non repris dans la barre',stock);
    const stockSource=await js(win,`(() => {
      const b=document.getElementById('stockActionBtn');
      const r=b.getBoundingClientRect();
      return {exists:!!b,left:r.left,top:r.top,proxy:document.querySelector('[data-kaloneo-proxy-for="stockActionBtn"]')?.textContent||''};
    })()`);
    if(!stockSource.exists || stockSource.left>-5000) fail('Stock: bouton source non conservé hors écran',stockSource);

    await load(win,'planning.html');
    const planning=await snapshot(win);
    assertBar(planning,'Planning');
    if(!planning.center.some(x=>/Valider mon planning/i.test(x.text))) fail('Planning: Valider absent',planning);

    await load(win,'qcmv1.0.html',{query:{page:'4'},hash:'page4'});
    let qcm=await snapshot(win);
    assertBar(qcm,'Fractions');
    await js(win,`document.querySelector('#page4 .item')?.click();true`);
    await wait(220);
    qcm=await snapshot(win);
    if(!qcm.center.some(x=>/Suivant/i.test(x.text))) fail('Fractions: Suivant ne rejoint pas la barre après activité',qcm);

    await load(win,'dictee.html');
    const dictee=await snapshot(win);
    assertBar(dictee,'Dictée');
    if(!dictee.center.some(x=>/Dictée terminée|Suivant/i.test(x.text))) fail('Dictée: action de progression absente',dictee);
    const dicteeList=await js(win,`(() => {
      const li=document.querySelector('.instruction-line li');
      if(!li) return null;
      return {type:getComputedStyle(li.parentElement).listStyleType,marker:getComputedStyle(li,'::marker').content,text:li.textContent.trim()};
    })()`);
    if(!dicteeList || dicteeList.type!=='disc' || !String(dicteeList.marker).includes('•')) fail('Dictée: puce KALONÉO non appliquée',dicteeList);

    await load(win,'carre.html');
    const puzzle=await snapshot(win);
    assertBar(puzzle,'Puzzle');
    if(!puzzle.center.some(x=>/Recommencer/i.test(x.text)) || !puzzle.center.some(x=>/Valider/i.test(x.text))) fail('Puzzle: actions centrales incomplètes',puzzle);
    const bullet=await js(win,`(() => {
      const li=document.querySelector('.explanations ul li');
      return li?{type:getComputedStyle(li.parentElement).listStyleType,marker:getComputedStyle(li,'::marker').content,text:li.textContent.trim()}:null;
    })()`);
    if(!bullet || bullet.type!=='disc' || !String(bullet.marker).includes('•')) fail('Puzzle: gros point unique absent',bullet);
    if(/^[•●▪◦‣‧·]/u.test(bullet.text)) fail('Puzzle: ancienne puce texte encore dupliquée',bullet);

    if((await js(win,'typeof window.KaloneoNavigation.declare'))!=='function') fail('API KALONÉO navigation inaccessible');

    console.log('PILOT14_COMMON_NAV_BULLETS: OK');
    console.log(JSON.stringify({stock,planning,qcm,dictee,puzzle,bullet,dicteeList}));
    win.destroy();
    app.exit(0);
  }catch(error){
    console.error('PILOT14_COMMON_NAV_BULLETS: FAIL — '+(error?.message||error));
    if(error?.stack) console.error(error.stack);
    try{win.destroy();}catch(_){}
    app.exit(2);
  }
}).catch(error=>{console.error(error);app.exit(2)});

setTimeout(()=>{console.error('PILOT14_COMMON_NAV_BULLETS: TIMEOUT');app.exit(3)},70000);
