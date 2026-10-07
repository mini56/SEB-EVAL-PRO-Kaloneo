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
    const stock = await win.webContents.executeJavaScript(`(()=>({
      id:document.body.dataset.sebKaltestId,
      legacy:document.body.classList.contains('seb-kaltest-legacy-full'),
      page:Boolean(document.querySelector('.kaltest-legacy-stock-page')),
      scenario:Boolean(document.querySelector('.kaltest-legacy-stock-scenario')),
      instructions:Boolean(document.querySelector('.kaltest-legacy-stock-instructions')),
      action:(document.querySelector('.kaltest-legacy-stock-action')?.textContent||'').trim(),
      pots:document.querySelectorAll('.kaltest-stock-pot').length,
      shelves:document.querySelectorAll('.kaltest-stock-shelf').length,
      sourceZones:document.querySelectorAll('.kaltest-stock-zone').length,
      headingDisplay:getComputedStyle(document.querySelector('.kaltest-heading')).display,
      contextDisplay:getComputedStyle(document.querySelector('.kaltest-context-row')).display,
      footerDisplay:getComputedStyle(document.querySelector('.kaltest-footer')).display,
      contentHeight:Math.round(document.getElementById('kaltest-content').getBoundingClientRect().height),
      blockHeight:Math.round(document.querySelector('.kaltest-legacy-stock-page').getBoundingClientRect().height)
    }))()`, true);
    if (stock.id!=='ranger_stock'||!stock.legacy||!stock.page||!stock.scenario||!stock.instructions) {
      throw new Error('Le Stock n utilise pas son bloc historique pleine page: '+JSON.stringify(stock));
    }
    if (stock.pots!==34||stock.shelves!==3||stock.sourceZones!==2) {
      throw new Error('Plateau Stock incomplet: '+JSON.stringify(stock));
    }
    if (!/Vérifier/.test(stock.action)) throw new Error('Bouton Vérifier Stock absent.');
    if (stock.headingDisplay!=='none'||stock.contextDisplay!=='none'||stock.footerDisplay!=='none') {
      throw new Error('Le cadre générique KALTEST prend encore de la place sur Stock.');
    }
    if (stock.blockHeight < stock.contentHeight-4) throw new Error('Le bloc Stock ne prend pas toute la hauteur disponible.');

    win.destroy();
    win = await openSegment('carre');
    const puzzle = await win.webContents.executeJavaScript(`(()=>({
      id:document.body.dataset.sebKaltestId,
      legacy:document.body.classList.contains('seb-kaltest-legacy-full'),
      page:Boolean(document.querySelector('.kaltest-legacy-gratte-page')),
      title:(document.querySelector('.kaltest-legacy-gratte-header h2')?.textContent||'').trim(),
      rules:(document.querySelector('.kaltest-legacy-gratte-rules')?.textContent||''),
      examples:document.querySelectorAll('.kaltest-legacy-gratte-example').length,
      cells:document.querySelectorAll('.kaltest-legacy-gratte-cell').length,
      blueClues:document.querySelectorAll('.kaltest-legacy-gratte-clue.clue-blue').length,
      orangeClues:document.querySelectorAll('.kaltest-legacy-gratte-clue.clue-orange').length,
      reset:Boolean(document.querySelector('.kaltest-legacy-gratte-btn.reset')),
      validate:Boolean(document.querySelector('.kaltest-legacy-gratte-btn.validate')),
      background:getComputedStyle(document.querySelector('.kaltest-legacy-gratte-page')).backgroundImage,
      headingDisplay:getComputedStyle(document.querySelector('.kaltest-heading')).display,
      contextDisplay:getComputedStyle(document.querySelector('.kaltest-context-row')).display,
      footerDisplay:getComputedStyle(document.querySelector('.kaltest-footer')).display,
      contentHeight:Math.round(document.getElementById('kaltest-content').getBoundingClientRect().height),
      blockHeight:Math.round(document.querySelector('.kaltest-legacy-gratte-page').getBoundingClientRect().height)
    }))()`, true);
    if (puzzle.id!=='gratte_ciel'||!puzzle.legacy||!puzzle.page||!/Puzzle Gratte-ciel/.test(puzzle.title)) {
      throw new Error('Le Puzzle n utilise pas son bloc historique pleine page: '+JSON.stringify(puzzle));
    }
    if (!/Règles du jeu/.test(puzzle.rules)||!/Astuces/.test(puzzle.rules)||!/Comment jouer/.test(puzzle.rules)||puzzle.examples!==3) {
      throw new Error('Consignes spécifiques du Puzzle incomplètes.');
    }
    if (puzzle.cells!==16||puzzle.blueClues!==8||puzzle.orangeClues!==8||!puzzle.reset||!puzzle.validate) {
      throw new Error('Grille historique du Puzzle incomplète: '+JSON.stringify(puzzle));
    }
    if (!puzzle.background||puzzle.background==='none') throw new Error('Fond urbain du Puzzle absent.');
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
