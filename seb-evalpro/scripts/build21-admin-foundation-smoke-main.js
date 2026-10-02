const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function die(message, details) {
  console.error('BUILD21_ADMIN_ELECTRON_SMOKE: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state = {
  version:1,
  sessionStorage:{},
  localStorage:{},
  lastPage:'qcmv1.0.html',
  lastEvaluationPage:'qcmv1.0.html'
};
let adminUnlocked = true;
let openCandidateCalls = 0;

ipcMain.on('app:edition-sync', (event) => {
  event.returnValue = {
    edition:'unified',
    label:'SEB EvalPro',
    canBilan:true,
    canAi:true,
    canImport:true,
    canExport:true,
    canCatalog:true,
    canReplay:true,
    canResults:true
  };
});
ipcMain.on('state:load-sync', (event) => { event.returnValue = state; });
ipcMain.on('state:save-sync', (event, payload) => {
  state = { ...state, ...(payload || {}) };
  event.returnValue = { ok:true, state };
});
ipcMain.on('candidate-catalog:workspace-load-sync', (event) => { event.returnValue = { ok:false }; });
ipcMain.on('candidate-catalog:results-workspace-load-sync', (event) => { event.returnValue = { ok:false }; });
ipcMain.handle('state:save', (_event, payload) => {
  state = { ...state, ...(payload || {}) };
  return { ok:true, state };
});
ipcMain.handle('candidate:active', () => null);
ipcMain.handle('admin:status', () => adminUnlocked);
ipcMain.handle('admin:verify', () => { adminUnlocked = true; return true; });
ipcMain.handle('admin:verify-password', () => false);
ipcMain.handle('admin:lock', () => { adminUnlocked = false; return true; });
ipcMain.handle('admin:open-candidate-browser', () => { openCandidateCalls += 1; return true; });
ipcMain.handle('admin:return-candidate-browser', () => true);
ipcMain.handle('admin:open-bilan', () => true);
ipcMain.handle('admin:open-candidate-results', () => true);
ipcMain.handle('admin:return-evaluation', () => true);
ipcMain.handle('admin:close-session', () => true);
ipcMain.handle('admin:quit-application', () => true);
ipcMain.handle('candidate:complete-active', () => ({ ok:true }));
ipcMain.handle('candidate:set-admin-export-context', () => true);
ipcMain.handle('ai:cancel-current', () => ({ ok:true }));
ipcMain.handle('ai:status', () => ({ available:true, offline:true, integrated:true }));
ipcMain.handle('ai:rewrite-synthesis', () => ({ ok:false }));
ipcMain.handle('replay:capture-page', () => ({ ok:true }));
ipcMain.handle('replay:list', () => []);
ipcMain.handle('bilan-history:list', () => []);
ipcMain.handle('candidate-catalog:list', () => []);
ipcMain.handle('candidate-catalog:sync', () => ({ ok:true }));
ipcMain.handle('candidate-catalog:detail', () => ({ ok:false }));

const timeout = setTimeout(() => die('délai global dépassé'), 30000);

app.whenReady().then(async () => {
  const root = path.join(__dirname, '..');
  const preload = path.join(root, 'src', 'preload.js');
  const web = path.join(root, 'app', 'web');
  for (const required of ['qcmv1.0.html','admin-candidats.html','admin-bilan.html']) {
    if (!fs.existsSync(path.join(web, required))) {
      die('fichier web généré absent: ' + required);
      return;
    }
  }

  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{
      preload,
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:false
    }
  });

  win.webContents.on('preload-error', (_event, badPath, error) => {
    die('erreur preload ' + String(badPath || ''), { error:String(error && error.stack || error) });
  });

  try {
    await win.loadFile(path.join(web, 'qcmv1.0.html'));
    await new Promise(r => setTimeout(r, 650));

    const initial = await win.webContents.executeJavaScript("(()=>{ const visible=(id)=>{ const el=document.getElementById(id); if(!el)return false; const css=getComputedStyle(el); return !el.hidden && css.display!=='none' && css.visibility!=='hidden'; }; const bar=document.getElementById('seb-evalpro-topbar'); return { bar:!!bar, hotzone:!!document.getElementById('seb-evalpro-top-hotzone'), openCandidate:visible('seb-evalpro-open-candidate'), closeSession:visible('seb-evalpro-close-session'), quit:visible('seb-evalpro-quit-application'), bilan:visible('seb-evalpro-bilan'), replay:visible('seb-evalpro-replay'), results:visible('seb-evalpro-results'), adminText:String(document.getElementById('seb-evalpro-admin')?.textContent||'').trim(), initiallyOpen:!!bar && bar.classList.contains('seb-evalpro-visible') }; })()");

    if (!initial.bar || !initial.hotzone || !initial.openCandidate || !initial.closeSession || !initial.quit ||
        initial.bilan || initial.replay || initial.results || initial.adminText !== 'Verrouiller') {
      die('état Administrateur initial incorrect', initial);
      return;
    }

    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-open-candidate').click(); true");
    await new Promise(r => setTimeout(r, 120));
    if (openCandidateCalls !== 1) {
      die('Ouvrir un candidat ne déclenche pas la navigation Admin', { openCandidateCalls });
      return;
    }

    await win.webContents.executeJavaScript("(()=>{ const bar=document.getElementById('seb-evalpro-topbar'); const hot=document.getElementById('seb-evalpro-top-hotzone'); bar.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true})); hot.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true})); return bar.classList.contains('seb-evalpro-visible'); })()");
    await win.webContents.executeJavaScript("(()=>{ const bar=document.getElementById('seb-evalpro-topbar'); const hot=document.getElementById('seb-evalpro-top-hotzone'); bar.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true})); hot.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true})); return true; })()");

    await new Promise(r => setTimeout(r, 350));
    const stillOpen = await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-topbar').classList.contains('seb-evalpro-visible')");
    if (!stillOpen) {
      die('la barre se replie avant la temporisation de 1 seconde');
      return;
    }

    await new Promise(r => setTimeout(r, 900));
    const closedAfterDelay = await win.webContents.executeJavaScript("!document.getElementById('seb-evalpro-topbar').classList.contains('seb-evalpro-visible')");
    if (!closedAfterDelay) {
      die('la barre ne se replie pas après la temporisation attendue');
      return;
    }

    adminUnlocked = false;
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('pageshow')); true");
    await new Promise(r => setTimeout(r, 180));
    const locked = await win.webContents.executeJavaScript("(()=>{ const shown=[...document.querySelectorAll('#seb-evalpro-topbar button')].filter(el=>{ const css=getComputedStyle(el); return !el.hidden && css.display!=='none' && css.visibility!=='hidden'; }).map(el=>({id:el.id,text:String(el.textContent||'').trim()})); const bar=document.getElementById('seb-evalpro-topbar'); return { shown, barOpen:bar.classList.contains('seb-evalpro-visible'), adminText:String(document.getElementById('seb-evalpro-admin')?.textContent||'').trim() }; })()");

    if (locked.shown.length !== 1 || locked.shown[0].id !== 'seb-evalpro-admin' || locked.adminText !== 'Administrateur') {
      die('état verrouillé incorrect', locked);
      return;
    }
    if (locked.barOpen) {
      die('la barre verrouillée doit rester repliée tant que la zone haute n’est pas sollicitée', locked);
      return;
    }

    console.log('BUILD21_ADMIN_ELECTRON_SMOKE: OK');
    console.log(JSON.stringify({initial, delay:{stillOpen,closedAfterDelay}, locked}));

    clearTimeout(timeout);
    win.destroy();
    app.exit(0);
  } catch (error) {
    die(String(error && error.stack || error));
  }
});
