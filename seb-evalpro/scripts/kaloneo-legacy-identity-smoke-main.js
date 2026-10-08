const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');

function fail(message, detail) {
  console.error('KALONEO_LEGACY_IDENTITY_SMOKE: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function openSegment(segment) {
  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false}
  });
  await win.loadFile(page, { query:{ segment } });
  for (let i=0;i<100;i+=1) {
    const ready = await win.webContents.executeJavaScript(
      "Boolean(window.sebKaltestPilot2 && document.querySelector('#page-exercise.visible') && document.body.dataset.sebKaltestId)",
      true
    ).catch(()=>false);
    if (ready) return win;
    await sleep(50);
  }
  throw new Error('Segment '+segment+' non prêt.');
}

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async()=>{
  let win;
  try {
    win = await openSegment('stock');
    await sleep(450);
    const stock = await win.webContents.executeJavaScript(`(()=>{
      const frame=document.querySelector('.kaltest-legacy-page-iframe');
      const doc=frame?.contentDocument;
      const block=document.querySelector('.kaltest-legacy-page-frame');
      return {
        id:document.body.dataset.sebKaltestId,
        legacy:document.body.classList.contains('seb-kaltest-legacy-full'),
        src:frame?.getAttribute('src')||'',
        page:Boolean(doc?.querySelector('.container')),
        scenario:Boolean(doc?.querySelector('img[src="imageqcm/scenario.png"]')),
        instructions:Boolean(doc?.querySelector('.info-panel')),
        background:doc?getComputedStyle(doc.body).backgroundImage:'',
        action:(doc?.getElementById('stockActionBtn')?.textContent||'').trim(),
        actionDisplay:doc?.getElementById('stockActionBtn')?getComputedStyle(doc.getElementById('stockActionBtn')).display:'',
        barActions:[...document.querySelectorAll('#kaloneo-nav-center .kaloneo-nav-action')]
          .filter(button=>!button.hidden&&getComputedStyle(button).display!=='none')
          .map(button=>String(button.textContent||'').trim()),
        pots:doc?.querySelectorAll('.pot').length||0,
        shelves:doc?.querySelectorAll('.etagere').length||0,
        cases:doc?.querySelectorAll('.case').length||0,
        sourceZones:(doc?.querySelector('.zone-pots')?1:0)+(doc?.querySelector('.zone-tri')?1:0),
        nestedNav:Boolean(doc?.getElementById('kaloneo-common-navigation')),
        headingDisplay:getComputedStyle(document.querySelector('.kaltest-heading')).display,
        contextDisplay:getComputedStyle(document.querySelector('.kaltest-context-row')).display,
        footerDisplay:getComputedStyle(document.querySelector('.kaltest-footer')).display,
        contentHeight:Math.round(document.getElementById('kaltest-content').getBoundingClientRect().height),
        blockHeight:Math.round(block?.getBoundingClientRect().height||0)
      };
    })()`, true);
    if (stock.id!=='ranger_stock'||!stock.legacy||!stock.page||!stock.scenario||!stock.instructions) {
      throw new Error('Le vrai Stock Build #20 n est pas chargé: '+JSON.stringify(stock));
    }
    if (!/linear-gradient/.test(stock.background||'')) {
      throw new Error('Le fond historique violet/bleu de Stock a été perdu: '+JSON.stringify(stock));
    }
    if (stock.pots!==34||stock.shelves!==3||stock.cases!==35||stock.sourceZones!==2) {
      throw new Error('Plateau Stock historique incomplet: '+JSON.stringify(stock));
    }
    if (stock.actionDisplay!=='none' || JSON.stringify(stock.barActions)!==JSON.stringify(['➡️ Suivant'])) {
      throw new Error('Stock sans corrections : le bouton interne doit être masqué et Suivant doit être dans la barre candidat: '+JSON.stringify(stock));
    }
    if (stock.nestedNav) throw new Error('Navigation commune imbriquée dans la page historique Stock.');
    if (stock.headingDisplay!=='none'||stock.contextDisplay!=='none'||stock.footerDisplay!=='none') {
      throw new Error('Le cadre générique KALTEST prend encore de la place sur Stock.');
    }
    if (stock.blockHeight < stock.contentHeight-4) throw new Error('Le bloc Stock ne prend pas toute la hauteur disponible.');

    win.destroy();
    win = await openSegment('carre');
    await sleep(450);
    const puzzle = await win.webContents.executeJavaScript(`(()=>{
      const frame=document.querySelector('.kaltest-legacy-page-iframe');
      const doc=frame?.contentDocument;
      const block=document.querySelector('.kaltest-legacy-page-frame');
      return {
        id:document.body.dataset.sebKaltestId,
        legacy:document.body.classList.contains('seb-kaltest-legacy-full'),
        src:frame?.getAttribute('src')||'',
        page:Boolean(doc?.querySelector('.container')),
        title:(doc?.querySelector('.header h1')?.textContent||'').trim(),
        subtitle:(doc?.querySelector('.header .subtitle')?.textContent||'').trim(),
        rules:(doc?.querySelector('.explanations')?.textContent||''),
        examples:doc?.querySelectorAll('.example').length||0,
        cells:doc?.querySelectorAll('.cell[data-row][data-col]').length||0,
        blueClues:doc?.querySelectorAll('.clue-top,.clue-bottom').length||0,
        orangeClues:doc?.querySelectorAll('.clue-left,.clue-right').length||0,
        reset:Boolean(doc?.querySelector('.btn-reset')),
        validateLabel:(doc?.getElementById('btnValidate')?.textContent||'').trim(),
        resetDisplay:doc?.getElementById('carre-reset')?getComputedStyle(doc.getElementById('carre-reset')).display:'',
        validateDisplay:doc?.getElementById('btnValidate')?getComputedStyle(doc.getElementById('btnValidate')).display:'',
        nextDisplay:doc?.getElementById('btnNext')?getComputedStyle(doc.getElementById('btnNext')).display:'',
        barActions:[...document.querySelectorAll('#kaloneo-nav-center .kaloneo-nav-action')]
          .filter(button=>!button.hidden&&getComputedStyle(button).display!=='none')
          .map(button=>String(button.textContent||'').trim()),
        background:doc?getComputedStyle(doc.body).backgroundImage:'',
        nestedNav:Boolean(doc?.getElementById('kaloneo-common-navigation')),
        headingDisplay:getComputedStyle(document.querySelector('.kaltest-heading')).display,
        contextDisplay:getComputedStyle(document.querySelector('.kaltest-context-row')).display,
        footerDisplay:getComputedStyle(document.querySelector('.kaltest-footer')).display,
        contentHeight:Math.round(document.getElementById('kaltest-content').getBoundingClientRect().height),
        blockHeight:Math.round(block?.getBoundingClientRect().height||0)
      };
    })()`, true);
    if (puzzle.id!=='gratte_ciel'||!puzzle.legacy||!puzzle.page||!/Puzzle Gratte-ciel/.test(puzzle.title)) {
      throw new Error('La vraie page Puzzle historique n est pas chargée: '+JSON.stringify(puzzle));
    }
    if (!/Règles du jeu/.test(puzzle.rules)||!/Astuces/.test(puzzle.rules)||!/Comment jouer/.test(puzzle.rules)||puzzle.examples!==3) {
      throw new Error('Consignes spécifiques historiques du Puzzle incomplètes.');
    }
    if (puzzle.cells!==16||puzzle.blueClues!==8||puzzle.orangeClues!==8||!puzzle.reset) {
      throw new Error('Grille historique du Puzzle incomplète: '+JSON.stringify(puzzle));
    }
    if (puzzle.resetDisplay!=='none'||puzzle.validateDisplay!=='none'||puzzle.nextDisplay!=='none' ||
        JSON.stringify(puzzle.barActions)!==JSON.stringify(['🔄 Recommencer','➡️ Suivant'])) {
      throw new Error('Puzzle sans corrections : boutons internes masqués et Recommencer/Suivant attendus dans la barre candidat: '+JSON.stringify(puzzle));
    }
    if (!puzzle.background||puzzle.background==='none'||!/gratteciel/.test(puzzle.background)) {
      throw new Error('Fond urbain historique du Puzzle absent: '+JSON.stringify(puzzle));
    }
    if (puzzle.nestedNav) throw new Error('Navigation commune imbriquée dans la page historique Puzzle.');
    if (puzzle.headingDisplay!=='none'||puzzle.contextDisplay!=='none'||puzzle.footerDisplay!=='none') {
      throw new Error('Le cadre générique KALTEST prend encore de la place sur Puzzle.');
    }
    if (puzzle.blockHeight < puzzle.contentHeight-4) throw new Error('Le bloc Puzzle ne prend pas toute la hauteur disponible.');

    console.log('KALONEO_LEGACY_IDENTITY_SMOKE: OK');
    console.log(JSON.stringify({stock,puzzle}));
    win.destroy();
    app.exit(0);
  } catch(error) {
    try { if (win && !win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error?.message||String(error), error?.stack||'');
  }
}).catch(error=>fail('Electron initialization failed', error?.stack||String(error)));

setTimeout(()=>fail('Timeout global du smoke test identité historique.'),45000);
