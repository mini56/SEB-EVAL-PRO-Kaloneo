const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');

function fail(message, detail) {
  console.error('PILOT9_PAGE1_LAYOUT_SMOKE: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      devTools:false
    }
  });

  try {
    await win.loadFile(page);
    win.webContents.setZoomFactor(0.85);
    await wait(350);

    const layout = await win.webContents.executeJavaScript(`(()=>{
      const q=(s)=>document.querySelector(s);
      const title=q('.pilot2-onboarding-title-row');
      const titleH=q('.pilot2-onboarding-title-row h2');
      const titleP=q('.pilot2-onboarding-title-row p');
      const mouse=q('.pilot2-mouse-card');
      const side=q('.pilot2-onboarding-side');
      const chrono=q('.pilot2-chrono-card');
      const calcCard=q('.pilot2-calculator-test-card');
      const audio=q('.pilot2-audio-card');
      const dock=q('.pilot2-calculator-dock');
      const cards=[chrono,calcCard,audio];
      const rect=(e)=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
      const overflow=cards.map(card=>{
        const cr=card.getBoundingClientRect();
        const childRects=[...card.children].map(x=>x.getBoundingClientRect()).filter(r=>r.width||r.height);
        return {
          className:card.className,
          cardBottom:cr.bottom,
          maxChildBottom:Math.max(...childRects.map(r=>r.bottom),cr.top),
          scrollHeight:card.scrollHeight,
          clientHeight:card.clientHeight
        };
      });
      const start=q('#pilot2-chrono-start'), stop=q('#pilot2-chrono-stop');
      const ss=getComputedStyle(start), ts=getComputedStyle(stop);
      const house=getComputedStyle(q('.pilot2-house-static.house-left'));
      const car=getComputedStyle(q('.pilot2-car'));
      return {
        title:rect(title),titleH:rect(titleH),titleP:rect(titleP),
        mouse:rect(mouse),side:rect(side),chrono:rect(chrono),calcCard:rect(calcCard),audio:rect(audio),dock:rect(dock),
        titleSameLine:Math.abs(titleH.top-titleP.top)<12 && titleP.left>titleH.right+8,
        overflow,
        start:{text:ss.color,border:ss.borderColor,bg:ss.backgroundImage},
        stop:{text:ts.color,border:ts.borderColor,bg:ts.backgroundImage,opacity:ts.opacity},
        house:{width:house.width,height:house.height},
        car:{width:car.width,height:car.height,background:car.backgroundImage},
        bodyScroll:document.body.scrollHeight,
        bodyClient:document.body.clientHeight,
        nextBottom:q('.pilot2-identification-actions').getBoundingClientRect().bottom,
        viewport:window.innerHeight
      };
    })()`, true);

    if (!layout.titleSameLine) {
      throw new Error('Le texte sous Prise en main n’est pas décalé à droite sur la même ligne : '+JSON.stringify(layout));
    }
    if (layout.side.top > layout.mouse.top + 2 || layout.dock.top > layout.mouse.top + 2) {
      throw new Error('Les outils de droite ou la calculatrice restent trop bas : '+JSON.stringify(layout));
    }
    for (const item of layout.overflow) {
      if (item.maxChildBottom > item.cardBottom + 2 || item.scrollHeight > item.clientHeight + 3) {
        throw new Error('Texte/contenu masqué dans un petit bloc : '+JSON.stringify(item));
      }
    }
    if (layout.start.text !== 'rgb(25, 135, 84)' ||
        layout.start.border !== 'rgb(0, 78, 112)' ||
        !/linear-gradient/.test(layout.start.bg)) {
      throw new Error('Démarrer ne respecte pas KALONÉO avec texte vert : '+JSON.stringify(layout.start));
    }
    if (layout.stop.text !== 'rgb(198, 40, 40)' ||
        layout.stop.border !== 'rgb(0, 78, 112)' ||
        !/linear-gradient/.test(layout.stop.bg)) {
      throw new Error('Arrêter ne respecte pas KALONÉO avec texte rouge : '+JSON.stringify(layout.stop));
    }
    if (parseFloat(layout.house.width) < 76 || parseFloat(layout.car.width) < 84 || !/linear-gradient/.test(layout.car.background)) {
      throw new Error('Maisons/voiture n’ont pas été améliorées : '+JSON.stringify({house:layout.house,car:layout.car}));
    }
    if (layout.nextBottom > layout.viewport + 3 || layout.bodyScroll > layout.bodyClient + 3) {
      throw new Error('La page 1 déborde verticalement : '+JSON.stringify(layout));
    }

    await win.webContents.executeJavaScript("document.getElementById('pilot2-calculator-test-open').click();true", true);
    await wait(180);
    const calculator = await win.webContents.executeJavaScript(`(()=>{
      const calc=document.getElementById('calc-container');
      const dock=document.getElementById('pilot2-calculator-dock');
      const r=calc.getBoundingClientRect(), d=dock.getBoundingClientRect();
      return {
        visible:getComputedStyle(calc).display!=='none',
        calc:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},
        dock:{left:d.left,top:d.top,right:d.right,bottom:d.bottom,width:d.width,height:d.height}
      };
    })()`, true);
    if (!calculator.visible) throw new Error('La calculatrice ne s’ouvre pas.');
    if (calculator.calc.top > calculator.dock.top + 14) {
      throw new Error('La calculatrice reste trop basse dans sa colonne : '+JSON.stringify(calculator));
    }
    if (calculator.calc.width < 270) {
      throw new Error('La calculatrice de prise en main reste trop petite : '+JSON.stringify(calculator));
    }
    if (calculator.calc.left < calculator.dock.left - 16 || calculator.calc.right > calculator.dock.right + 16) {
      throw new Error('La calculatrice sort de sa zone dédiée : '+JSON.stringify(calculator));
    }

    console.log('PILOT9_PAGE1_LAYOUT_SMOKE: OK');
    console.log('PILOT9_HELP_TEXT=RIGHT_OF_TITLE');
    console.log('PILOT9_RIGHT_BLOCKS=RAISED_AND_LARGER');
    console.log('PILOT9_CARD_TEXT=FULLY_VISIBLE');
    console.log('PILOT9_CALCULATOR=RAISED_AND_LARGER');
    console.log('PILOT9_CHRONO_START=KALONEO_GREEN_TEXT');
    console.log('PILOT9_CHRONO_STOP=KALONEO_RED_TEXT');
    console.log('PILOT9_MOUSE_VISUALS=IMPROVED');

    win.destroy();
    app.exit(0);
  } catch (error) {
    try { if (!win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error && error.message ? error.message : String(error), error && error.stack ? error.stack : '');
  }
}).catch(error => fail('Initialisation Electron impossible', error && error.message ? error.message : String(error)));

setTimeout(()=>fail('Timeout global du smoke PILOTE 9.'),70000);
