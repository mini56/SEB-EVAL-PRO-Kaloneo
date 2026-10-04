const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'app', 'web');

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
function approx(actual, expected, tolerance, label){
  if (Math.abs(actual-expected) > tolerance) {
    throw new Error(label + ': attendu ' + expected + ' ± ' + tolerance + ', obtenu ' + actual);
  }
}

async function load(win, file, options){
  await win.loadFile(path.join(web,file), options || {});
  await wait(380);
}

async function evalJs(win, code){
  return win.webContents.executeJavaScript(code, true);
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    useContentSize:true,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:false,devTools:false,spellcheck:false}
  });

  try{
    // Traitement de texte : 50/50 strict + contexte pleine largeur + aucun scroll horizontal.
    await load(win,'nwtexte.html');
    const nw = await evalJs(win, `(() => {
      const main=document.querySelector('.nwtexte-main-50');
      const left=document.getElementById('left'), right=document.getElementById('right');
      const scenario=document.querySelector('.nwtexte-scenario');
      const consigne=document.querySelector('.nwtexte-consigne');
      const label=consigne.querySelector('.kaloneo-context-label');
      const text=consigne.querySelector('.kaloneo-context-text');
      return {
        left:left.getBoundingClientRect().width,
        right:right.getBoundingClientRect().width,
        main:main.getBoundingClientRect().width,
        scenario:scenario.getBoundingClientRect().width,
        consigne:consigne.getBoundingClientRect().width,
        page:document.getElementById('page7').getBoundingClientRect().width,
        leftOverflow:left.scrollWidth-left.clientWidth,
        bodyOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        labelTop:label.getBoundingClientRect().top,
        labelBottom:label.getBoundingClientRect().bottom,
        labelRight:label.getBoundingClientRect().right,
        textTop:text.getBoundingClientRect().top,
        textBottom:text.getBoundingClientRect().bottom,
        textLeft:text.getBoundingClientRect().left
      };
    })()`);
    approx(nw.left/(nw.left+nw.right),0.5,0.025,'nwtexte 50/50');
    if(nw.leftOverflow>2 || nw.bodyOverflow>2) throw new Error('nwtexte scroll horizontal: '+JSON.stringify(nw));
    if(!(nw.textTop < nw.labelBottom && nw.textBottom > nw.labelTop && nw.textLeft >= nw.labelRight-2)) throw new Error('nwtexte Consigne non alignée sur la même ligne: '+JSON.stringify(nw));
    if(nw.scenario < nw.page*0.93 || nw.consigne < nw.page*0.93) throw new Error('nwtexte contexte non pleine largeur');

    // E-mail : 50/50 + scénario pleine largeur + Parcourir au style KALONÉO.
    await load(win,'nvmail.html');
    const mail = await evalJs(win, `(() => {
      const left=document.getElementById('left'), right=document.getElementById('right');
      const scenario=document.querySelector('.nvmail-scenario');
      const page=document.getElementById('page8');
      const label=document.querySelector('.nvmail-consigne-panel .kaloneo-context-label');
      const text=document.querySelector('.nvmail-consigne-panel .kaloneo-context-text');
      const picker=document.getElementById('nvmail-file-picker');
      const ps=getComputedStyle(picker);
      return {
        left:left.getBoundingClientRect().width,
        right:right.getBoundingClientRect().width,
        scenario:scenario.getBoundingClientRect().width,
        page:page.getBoundingClientRect().width,
        bodyOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        labelTop:label.getBoundingClientRect().top,
        labelBottom:label.getBoundingClientRect().bottom,
        labelRight:label.getBoundingClientRect().right,
        textTop:text.getBoundingClientRect().top,
        textBottom:text.getBoundingClientRect().bottom,
        textLeft:text.getBoundingClientRect().left,
        pickerBorder:ps.borderColor,
        pickerBg:ps.backgroundImage
      };
    })()`);
    approx(mail.left/(mail.left+mail.right),0.5,0.025,'nvmail 50/50');
    if(mail.bodyOverflow>2) throw new Error('nvmail scroll horizontal: '+JSON.stringify(mail));
    if(!(mail.textTop < mail.labelBottom && mail.textBottom > mail.labelTop && mail.textLeft >= mail.labelRight-2)) throw new Error('nvmail Consigne non alignée sur la même ligne: '+JSON.stringify(mail));
    if(mail.scenario < mail.page*0.93) throw new Error('nvmail scénario non pleine largeur');
    if(mail.pickerBorder!=='rgb(0, 78, 112)' || mail.pickerBg==='none') throw new Error('Parcourir hors style KALONÉO: '+JSON.stringify(mail));

    // Autoévaluations : 50/50 et aucun scroll horizontal.
    for(const file of ['autoeval1.html','autoeval2.html']){
      await load(win,file);
      const result=await evalJs(win, `(() => {
        const left=document.getElementById('left'), right=document.getElementById('right');
        return {
          left:left.getBoundingClientRect().width,
          right:right.getBoundingClientRect().width,
          leftOverflow:left.scrollWidth-left.clientWidth,
          pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
        };
      })()`);
      approx(result.left/(result.left+result.right),0.5,0.025,file+' 50/50');
      if(result.leftOverflow>2 || result.pageOverflow>2) throw new Error(file+' scroll horizontal: '+JSON.stringify(result));
    }

    // Fractions : image à gauche, exercice à droite avec davantage de place pour l'exercice.
    await load(win,'qcmv1.0.html',{query:{page:'4'},hash:'page4'});
    const p4=await evalJs(win, `(() => {
      const wrap=document.querySelector('#page4 .k-qcm-fractions-layout');
      const kids=wrap ? Array.from(wrap.children) : [];
      return kids.length===2 ? {left:kids[0].getBoundingClientRect().width,right:kids[1].getBoundingClientRect().width,image:Boolean(kids[0].querySelector('img'))} : null;
    })()`);
    if(!p4 || !p4.image) throw new Error('Fractions: bloc image gauche absent');
    approx(p4.left/(p4.left+p4.right),0.4,0.04,'Fractions 40/60');

    // Organisation : deux blocs 50/50, image à gauche.
    await load(win,'qcmv1.0.html',{query:{page:'5'},hash:'page5'});
    const p5=await evalJs(win, `(() => {
      const wrap=document.querySelector('#page5 .k-qcm-organisation-layout');
      const kids=wrap ? Array.from(wrap.children) : [];
      return kids.length===2 ? {left:kids[0].getBoundingClientRect().width,right:kids[1].getBoundingClientRect().width,image:Boolean(kids[0].querySelector('img'))} : null;
    })()`);
    if(!p5 || !p5.image) throw new Error('Organisation: bloc image gauche absent');
    approx(p5.left/(p5.left+p5.right),0.5,0.03,'Organisation 50/50');

    // LEGO : libellé Consigne commun, chrono aéré et image contenue.
    await load(win,'brique.html');
    const lego=await evalJs(win, `(() => {
      const label=document.querySelector('.kaloneo-consigne .kaloneo-context-label');
      const text=document.querySelector('.kaloneo-consigne .kaloneo-context-text');
      const image=document.querySelector('.kaloneo-practical-image img');
      const chrono=document.querySelector('.kaloneo-practical-right .kaloneo-control-card:first-child');
      const ls=getComputedStyle(label);
      return {
        labelColor:ls.color,
        labelFont:ls.fontFamily,
        labelWeight:ls.fontWeight,
        labelTop:label.getBoundingClientRect().top,
        labelBottom:label.getBoundingClientRect().bottom,
        labelRight:label.getBoundingClientRect().right,
        textTop:text.getBoundingClientRect().top,
        textBottom:text.getBoundingClientRect().bottom,
        textLeft:text.getBoundingClientRect().left,
        imageHeight:image.getBoundingClientRect().height,
        imageBottom:image.getBoundingClientRect().bottom,
        chronoHeight:chrono.getBoundingClientRect().height
      };
    })()`);
    if(lego.labelColor!=='rgb(0, 78, 112)' || !/Calibri/i.test(lego.labelFont) || lego.labelWeight!=='700') throw new Error('LEGO Consigne hors style commun: '+JSON.stringify(lego));
    if(!(lego.textTop < lego.labelBottom && lego.textBottom > lego.labelTop && lego.textLeft >= lego.labelRight-2)) throw new Error('LEGO Consigne non alignée sur la même ligne: '+JSON.stringify(lego));
    if(lego.imageHeight<365 || lego.imageBottom>735) throw new Error('LEGO image non agrandie ou hors zone utile: '+JSON.stringify(lego));
    if(lego.chronoHeight<105) throw new Error('LEGO chrono pas assez aéré: '+JSON.stringify(lego));

    console.log('PILOT13_LAYOUT_SMOKE: OK');
    console.log(JSON.stringify({nw,mail,p4,p5,lego}));
    win.destroy();
    app.exit(0);
  }catch(error){
    console.error('PILOT13_LAYOUT_SMOKE: FAIL — '+(error?.message||error));
    if(error?.stack) console.error(error.stack);
    try{win.destroy();}catch(_){}
    app.exit(2);
  }
}).catch(error=>{console.error(error);app.exit(2)});

setTimeout(()=>{console.error('PILOT13_LAYOUT_SMOKE: TIMEOUT');app.exit(3)},70000);
