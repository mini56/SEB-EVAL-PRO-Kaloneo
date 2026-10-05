const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, details) {
  console.error('KALONEO_PARCOURS_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state = {
  version:1,
  sessionStorage:{},
  localStorage:{},
  lastPage:'kaltest-pilot2.html',
  lastEvaluationPage:'kaltest-pilot2.html'
};

const library = [
  {id:'introduction_parcours_base',version:'1.0.0',title:'Introduction de parcours — modèle de base',category:'introduction',role:'introduction',kind:'complex',scored:false,description:'Introduction'},
  {id:'test_alpha',version:'1.0.0',title:'Test Alpha',category:'mathematiques',role:'test',kind:'questionnaire',scored:true,description:'Premier test',questionCount:3},
  {id:'test_beta',version:'1.0.0',title:'Test Bêta',category:'francais',role:'test',kind:'questionnaire',scored:false,description:'Deuxième test',questionCount:2},
  {id:'test_gamma',version:'1.0.0',title:'Test Gamma',category:'organisation',role:'test',kind:'complex',scored:false,description:'Troisième test',questionCount:0},
  {id:'fin_parcours',version:'1.0.0',title:'Fin du parcours',category:'systeme',role:'fin',kind:'complex',scored:false,description:'Fin'}
];

const saved = [{
  id:'parcours-de-base',
  name:'Parcours de base',
  creator:'SEB EvalPro / KALONÉO',
  systemProvided:true,
  testCount:3
}];
let lastSavedPayload = null;

ipcMain.on('app:edition-sync', event => {
  event.returnValue = {edition:'unified',canBilan:true,canAi:true,canImport:true,canExport:true};
});
ipcMain.on('state:load-sync', event => { event.returnValue = state; });
ipcMain.on('state:save-sync', (event, payload) => {
  state = {...state,...(payload || {})};
  event.returnValue = {ok:true,state};
});
ipcMain.on('candidate-catalog:workspace-load-sync', event => { event.returnValue = {ok:false}; });
ipcMain.on('candidate-catalog:workspace-save-sync', event => { event.returnValue = {ok:true}; });
ipcMain.on('candidate-catalog:results-workspace-load-sync', event => { event.returnValue = {ok:false}; });

ipcMain.handle('state:save', (_event,payload) => {
  state = {...state,...(payload || {})};
  return {ok:true,state};
});
ipcMain.handle('admin:status', () => true);
ipcMain.handle('admin:verify', () => true);
ipcMain.handle('admin:verify-password', () => true);
ipcMain.handle('admin:lock', () => true);
ipcMain.handle('candidate:active', () => null);
ipcMain.handle('candidate:set-admin-export-context', () => true);
ipcMain.handle('candidate-catalog:workspace-save', () => ({ok:true}));
ipcMain.handle('candidate-catalog:end-bilan', () => true);
ipcMain.handle('admin:open-candidate-browser', () => true);
ipcMain.handle('admin:return-candidate-browser', () => true);
ipcMain.handle('admin:open-tests-parcours', () => true);
ipcMain.handle('admin:close-tests-parcours', () => true);
ipcMain.handle('admin:open-bilan', () => true);
ipcMain.handle('admin:open-candidate-results', () => true);
ipcMain.handle('admin:return-evaluation', () => true);
ipcMain.handle('admin:close-session', () => true);
ipcMain.handle('admin:quit-application', () => true);
ipcMain.handle('candidate:complete-active', () => ({ok:true}));
ipcMain.handle('ai:cancel-current', () => ({ok:true}));
ipcMain.handle('ai:status', () => ({available:true,offline:true,integrated:true}));
ipcMain.handle('ai:rewrite-synthesis', () => ({ok:false}));
ipcMain.handle('replay:capture-page', () => ({ok:true}));
ipcMain.handle('replay:list', () => []);
ipcMain.handle('bilan-history:list', () => []);
ipcMain.handle('candidate-catalog:list', () => []);
ipcMain.handle('candidate-catalog:sync', () => ({ok:true}));
ipcMain.handle('candidate-catalog:detail', () => ({ok:false}));

ipcMain.handle('kaloneo-library:list-tests', () => ({ok:true,tests:library}));
ipcMain.handle('kaloneo-library:list-parcours', () => ({ok:true,parcours:saved}));
ipcMain.handle('kaloneo-library:save-parcours', (_event,payload) => {
  const key = String(payload && payload.name || '').trim().toLocaleLowerCase('fr-FR');
  if (saved.some(item => String(item.name || '').trim().toLocaleLowerCase('fr-FR') === key)) {
    return {ok:false,error:'Un parcours portant ce nom existe déjà.'};
  }
  lastSavedPayload = JSON.parse(JSON.stringify(payload || {}));
  const item = {
    id:'parcours-smoke',
    name:String(payload.name || ''),
    creator:String(payload.creator || ''),
    systemProvided:false,
    testCount:Array.isArray(payload.tests) ? payload.tests.length : 0
  };
  saved.push(item);
  return {ok:true,parcours:item};
});

const timeout = setTimeout(() => fail('délai global dépassé'), 45000);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const root = path.join(__dirname, '..');
  const web = path.join(root, 'app', 'web');
  const target = path.join(web, 'admin-parcours-builder.html');
  if (!fs.existsSync(target)) return fail('admin-parcours-builder.html absent de app/web');

  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{
      preload:path.join(root,'src','preload.js'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:false
    }
  });

  win.webContents.on('preload-error', (_event,badPath,error) => {
    fail('erreur preload ' + String(badPath || ''), {error:String(error && error.stack || error)});
  });

  try {
    await win.loadFile(target);
    await wait(800);

    const initial = await win.webContents.executeJavaScript(`(()=>{
      const cards=[...document.querySelectorAll('.library-card')];
      return {
        title:String(document.querySelector('.page-topbar h1')?.textContent||'').trim(),
        libraryCount:cards.length,
        draggable:cards.every(card=>card.draggable===true),
        intro:String(document.querySelector('#intro-slot .special-card strong')?.textContent||'').trim(),
        fin:String(document.querySelector('#fin-slot .special-card strong')?.textContent||'').trim(),
        savedCount:document.querySelectorAll('#saved-parcours .saved-card').length
      };
    })()`);

    if (initial.title !== 'Création de parcours' || initial.libraryCount !== 3 || !initial.draggable ||
        !/Introduction/.test(initial.intro) || initial.fin !== 'Fin du parcours' || initial.savedCount !== 1) {
      return fail('état initial incorrect', initial);
    }

    // Ajout par bouton : le test doit disparaître de la bibliothèque.
    await win.webContents.executeJavaScript(`(()=>{const card=[...document.querySelectorAll('.library-card')].find(c=>c.querySelector('.card-title')?.textContent==='Test Alpha');card?.querySelector('.card-add')?.click();return true;})()`);
    await wait(120);
    const afterAdd = await win.webContents.executeJavaScript(`(()=>({
      sequence:document.querySelectorAll('#tests-dropzone .sequence-card').length,
      library:document.querySelectorAll('.library-card').length,
      title:String(document.querySelector('#tests-dropzone .sequence-title')?.textContent||'').trim()
    }))()`);
    if (afterAdd.sequence !== 1 || afterAdd.library !== 2 || afterAdd.title !== 'Test Alpha') {
      return fail('ajout / disparition de vignette incorrect', afterAdd);
    }

    // Retrait : le test doit revenir dans la bibliothèque.
    await win.webContents.executeJavaScript(`document.querySelector('#tests-dropzone .remove-test').click();true`);
    await wait(120);
    const afterRemove = await win.webContents.executeJavaScript(`(()=>({
      sequence:document.querySelectorAll('#tests-dropzone .sequence-card').length,
      library:document.querySelectorAll('.library-card').length
    }))()`);
    if (afterRemove.sequence !== 0 || afterRemove.library !== 3) {
      return fail('retrait / retour en bibliothèque incorrect', afterRemove);
    }

    // Ajouter Alpha puis Bêta.
    await win.webContents.executeJavaScript(`(()=>{
      const add=(title)=>{const card=[...document.querySelectorAll('.library-card')].find(c=>c.querySelector('.card-title')?.textContent===title);card?.querySelector('.card-add')?.click();};
      add('Test Alpha'); add('Test Bêta'); return true;
    })()`);
    await wait(160);

    // Réordonner avec le bouton descendre.
    await win.webContents.executeJavaScript(`document.querySelector('#tests-dropzone .sequence-card .move-down').click();true`);
    await wait(120);
    const reordered = await win.webContents.executeJavaScript(`[...document.querySelectorAll('#tests-dropzone .sequence-title')].map(x=>String(x.textContent||'').trim())`);
    if (JSON.stringify(reordered) !== JSON.stringify(['Test Bêta','Test Alpha'])) {
      return fail('réordonnancement incorrect', reordered);
    }

    // Ajouter Gamma par vrai drag/drop HTML5.
    const dragResult = await win.webContents.executeJavaScript(`(()=>{
      const card=[...document.querySelectorAll('.library-card')].find(c=>c.querySelector('.card-title')?.textContent==='Test Gamma');
      const zone=document.getElementById('tests-dropzone');
      if(!card||!zone||typeof DataTransfer!=='function'||typeof DragEvent!=='function') return {supported:false};
      const dt=new DataTransfer();
      card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));
      zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));
      zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));
      card.dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer:dt}));
      return {supported:true};
    })()`);
    await wait(150);
    const afterDrag = await win.webContents.executeJavaScript(`(()=>({
      sequence:document.querySelectorAll('#tests-dropzone .sequence-card').length,
      library:document.querySelectorAll('.library-card').length,
      titles:[...document.querySelectorAll('#tests-dropzone .sequence-title')].map(x=>String(x.textContent||'').trim())
    }))()`);
    if (!dragResult.supported || afterDrag.sequence !== 3 || afterDrag.library !== 0 || afterDrag.titles[2] !== 'Test Gamma') {
      return fail('glisser-déposer réel incorrect', {dragResult,afterDrag});
    }

    // Enregistrement avec nom et créateur.
    await win.webContents.executeJavaScript(`(()=>{
      document.getElementById('parcours-name').value='Parcours long';
      document.getElementById('parcours-creator').value='Créateur smoke';
      document.getElementById('save-parcours').click();
      return true;
    })()`);
    await wait(220);

    const savedUi = await win.webContents.executeJavaScript(`(()=>({
      status:String(document.getElementById('builder-status')?.textContent||'').trim(),
      saved:[...document.querySelectorAll('#saved-parcours .saved-card strong')].map(x=>String(x.textContent||'').trim()),
      creators:[...document.querySelectorAll('#saved-parcours .saved-card span:first-of-type')].map(x=>String(x.textContent||'').trim())
    }))()`);

    if (!lastSavedPayload ||
        lastSavedPayload.name !== 'Parcours long' ||
        lastSavedPayload.creator !== 'Créateur smoke' ||
        lastSavedPayload.introduction?.id !== 'introduction_parcours_base' ||
        lastSavedPayload.fin?.id !== 'fin_parcours' ||
        lastSavedPayload.tests?.length !== 3 ||
        new Set(lastSavedPayload.tests.map(item=>item.id)).size !== 3 ||
        !/enregistré/i.test(savedUi.status) ||
        !savedUi.saved.includes('Parcours long') ||
        !savedUi.creators.some(text=>/Créateur smoke/.test(text))) {
      return fail('enregistrement UI incorrect', {lastSavedPayload,savedUi});
    }

    // Rechargement complet : le parcours enregistré doit rester visible avec son créateur.
    await win.reload();
    await wait(700);
    const reloaded = await win.webContents.executeJavaScript(`(()=>({
      saved:[...document.querySelectorAll('#saved-parcours .saved-card strong')].map(x=>String(x.textContent||'').trim()),
      creators:[...document.querySelectorAll('#saved-parcours .saved-card span:first-of-type')].map(x=>String(x.textContent||'').trim()),
      library:document.querySelectorAll('.library-card').length,
      sequence:document.querySelectorAll('#tests-dropzone .sequence-card').length
    }))()`);
    if (!reloaded.saved.includes('Parcours long') ||
        !reloaded.creators.some(text=>/Créateur smoke/.test(text)) ||
        reloaded.library !== 3 ||
        reloaded.sequence !== 0) {
      return fail('rechargement du parcours enregistré incorrect', reloaded);
    }

    // Reconstruire le parcours pour vérifier le refus du nom déjà enregistré.
    await win.webContents.executeJavaScript(`(()=>{
      const add=(title)=>{const card=[...document.querySelectorAll('.library-card')].find(c=>c.querySelector('.card-title')?.textContent===title);card?.querySelector('.card-add')?.click();};
      add('Test Alpha'); add('Test Bêta'); add('Test Gamma');
      document.getElementById('parcours-name').value='Parcours long';
      document.getElementById('parcours-creator').value='Créateur smoke';
      return true;
    })()`);
    await wait(160);

    // Le même nom doit être refusé sans perdre le parcours en construction.
    await win.webContents.executeJavaScript(`document.getElementById('save-parcours').click();true`);
    await wait(170);
    const duplicate = await win.webContents.executeJavaScript(`(()=>({
      status:String(document.getElementById('builder-status')?.textContent||'').trim(),
      sequence:document.querySelectorAll('#tests-dropzone .sequence-card').length
    }))()`);
    if (!/existe déjà/i.test(duplicate.status) || duplicate.sequence !== 3) {
      return fail('refus du nom dupliqué incorrect', duplicate);
    }

    console.log('KALONEO_PARCOURS_ELECTRON=OK');
    console.log(JSON.stringify({initial,afterAdd,afterRemove,reordered,afterDrag,savedUi,reloaded,duplicate,lastSavedPayload}));

    clearTimeout(timeout);
    win.destroy();
    app.exit(0);
  } catch (error) {
    fail(String(error && error.stack || error));
  }
});
