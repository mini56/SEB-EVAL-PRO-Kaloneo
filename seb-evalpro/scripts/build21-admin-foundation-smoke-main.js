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
let activeCandidate = { candidateId:'SMOKE', displayName:'Candidat test' };
let openCandidateCalls = 0;
let openTestsParcoursCalls = 0;
let closeTestsParcoursCalls = 0;

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
ipcMain.handle('candidate:active', () => activeCandidate);
ipcMain.handle('admin:status', () => adminUnlocked);
ipcMain.handle('admin:verify', () => { adminUnlocked = true; return true; });
ipcMain.handle('admin:verify-password', () => false);
ipcMain.handle('admin:lock', () => { adminUnlocked = false; return true; });
ipcMain.handle('admin:open-candidate-browser', () => { openCandidateCalls += 1; return true; });
ipcMain.handle('admin:return-candidate-browser', () => true);
ipcMain.handle('admin:open-tests-parcours', () => { openTestsParcoursCalls += 1; return true; });
ipcMain.handle('admin:close-tests-parcours', () => { closeTestsParcoursCalls += 1; return true; });
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
  for (const required of ['qcmv1.0.html','admin-candidats.html','admin-bilan.html','admin-tests-parcours.html']) {
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

    const initial = await win.webContents.executeJavaScript("(()=>{ const visible=(id)=>{ const el=document.getElementById(id); if(!el)return false; const css=getComputedStyle(el); return !el.hidden && css.display!=='none' && css.visibility!=='hidden'; }; const bar=document.getElementById('seb-evalpro-topbar'); const br=bar?.getBoundingClientRect(); const ids=['seb-evalpro-open-candidate','seb-evalpro-bilan','seb-evalpro-return','seb-evalpro-close-session','seb-evalpro-admin','seb-evalpro-export-candidates','seb-evalpro-import-candidates','seb-evalpro-tests-parcours','seb-evalpro-finish-candidate','seb-evalpro-quit-application']; const buttons=ids.map(id=>{const el=document.getElementById(id); if(!el)return null; const r=el.getBoundingClientRect(); const css=getComputedStyle(el); return {id,hidden:el.hidden,text:String(el.textContent||'').trim(),top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,color:css.color,borderColor:css.borderColor,display:css.display};}).filter(Boolean); return { bar:!!bar, barRect:br?{top:br.top,bottom:br.bottom,height:br.height}:null, hotzone:!!document.getElementById('seb-evalpro-top-hotzone'), openCandidate:visible('seb-evalpro-open-candidate'), closeSession:visible('seb-evalpro-close-session'), quit:visible('seb-evalpro-quit-application'), testsParcours:visible('seb-evalpro-tests-parcours'), finishCandidate:visible('seb-evalpro-finish-candidate'), bilan:visible('seb-evalpro-bilan'), replay:visible('seb-evalpro-replay'), results:visible('seb-evalpro-results'), exportText:String(document.getElementById('seb-evalpro-export-candidates')?.textContent||'').trim(), importText:String(document.getElementById('seb-evalpro-import-candidates')?.textContent||'').trim(), privacyInBar:document.getElementById('seb-evalpro-privacy-toggle')?.parentElement===bar, adminText:String(document.getElementById('seb-evalpro-admin')?.textContent||'').trim(), initiallyOpen:!!bar && bar.classList.contains('seb-evalpro-visible'), buttons }; })()");

    if (!initial.bar || !initial.hotzone || !initial.openCandidate || !initial.closeSession || !initial.quit ||
        initial.testsParcours || initial.finishCandidate || initial.bilan || initial.replay || initial.results || initial.adminText !== 'Verrouiller') {
      die('état Administrateur initial incorrect', initial);
      return;
    }
    if (initial.exportText !== '↑ Exporter dossiers' || initial.importText !== '↓ Importer dossiers') {
      die('flèches Export / Import incorrectes', initial);
      return;
    }
    if (initial.privacyInBar) {
      die('le bouton de confidentialité ne doit jamais être placé dans la barre Admin', initial);
      return;
    }
    const visibleButtons = initial.buttons.filter(b => !b.hidden && b.display !== 'none');
    if (visibleButtons.some(b => b.height > 36.5 || b.top < initial.barRect.top - 0.5 || b.bottom > initial.barRect.bottom + 0.5)) {
      die('un bouton dépasse de la hauteur de la barre Admin', {bar:initial.barRect, buttons:visibleButtons});
      return;
    }
    for (let i=0;i<visibleButtons.length;i++) {
      for (let j=i+1;j<visibleButtons.length;j++) {
        const a=visibleButtons[i], b=visibleButtons[j];
        const overlap = Math.min(a.right,b.right)-Math.max(a.left,b.left);
        if (overlap > 0.5) {
          die('deux boutons de la barre Admin se chevauchent', {a,b});
          return;
        }
      }
    }
    const quitStyle = initial.buttons.find(b => b.id === 'seb-evalpro-quit-application');
    if (!quitStyle || quitStyle.color !== 'rgb(192, 0, 0)' || quitStyle.borderColor !== 'rgb(192, 0, 0)') {
      die('Quitter doit être affiché en rouge', quitStyle || {});
      return;
    }

    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-open-candidate').click(); true");
    await new Promise(r => setTimeout(r, 120));
    if (openCandidateCalls !== 1) {
      die('Ouvrir un candidat ne déclenche pas la navigation Admin', { openCandidateCalls });
      return;
    }

    // Sans parcours actif, Tests / Parcours devient disponible et Fermer la session disparaît.
    activeCandidate = null;
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('pageshow')); true");
    await new Promise(r => setTimeout(r, 260));
    const noActive = await win.webContents.executeJavaScript("(()=>{ const visible=(id)=>{const el=document.getElementById(id);if(!el)return false;const css=getComputedStyle(el);return !el.hidden&&css.display!=='none'&&css.visibility!=='hidden';}; return {tests:visible('seb-evalpro-tests-parcours'),closeSession:visible('seb-evalpro-close-session')};})()");
    if (!noActive.tests || noActive.closeSession) {
      die('visibilité contextuelle Tests / Parcours incorrecte', noActive);
      return;
    }

    // Bulle d'aide de type Word sur Tests / Parcours.
    await win.webContents.executeJavaScript("(()=>{const bar=document.getElementById('seb-evalpro-topbar');const hot=document.getElementById('seb-evalpro-top-hotzone');hot.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));bar.classList.add('seb-evalpro-visible');const b=document.getElementById('seb-evalpro-tests-parcours');b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));return true;})()");
    await new Promise(r => setTimeout(r, 760));
    const help = await win.webContents.executeJavaScript("(()=>{const t=document.getElementById('seb-evalpro-admin-help');return {exists:!!t,hidden:t?t.hidden:true,text:t?String(t.textContent||'').trim():''};})()");
    if (!help.exists || help.hidden || help.text !== 'Ouvre la page de gestion des tests et des parcours KALONÉO.') {
      die('bulle d’aide Tests / Parcours incorrecte', help);
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-topbar').dispatchEvent(new MouseEvent('click',{bubbles:true})); true");

    // Le bouton ouvre bien la page dédiée.
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-tests-parcours').click(); true");
    await new Promise(r => setTimeout(r, 120));
    if (openTestsParcoursCalls !== 1) {
      die('Tests / Parcours ne déclenche pas sa navigation Admin', { openTestsParcoursCalls });
      return;
    }

    // Vérification de la vraie page vide et de son unique bouton Fermer.
    await win.loadFile(path.join(web, 'admin-tests-parcours.html'));
    await new Promise(r => setTimeout(r, 600));
    const testsPage = await win.webContents.executeJavaScript("(()=>{const main=document.querySelector('main');const buttons=main?[...main.querySelectorAll('button')]:[];return {title:String(main?.querySelector('h1')?.textContent||'').trim(),buttonCount:buttons.length,closeText:String(document.getElementById('close-tests-parcours')?.textContent||'').trim()};})()");
    if (testsPage.title !== 'Tests / Parcours' || testsPage.buttonCount !== 1 || testsPage.closeText !== 'Fermer') {
      die('page Tests / Parcours non conforme', testsPage);
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('close-tests-parcours').click(); true");
    await new Promise(r => setTimeout(r, 120));
    if (closeTestsParcoursCalls !== 1) {
      die('Fermer de Tests / Parcours ne déclenche pas le retour Admin', { closeTestsParcoursCalls });
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
    console.log(JSON.stringify({initial, noActive, help, testsPage, openTestsParcoursCalls, closeTestsParcoursCalls, delay:{stillOpen,closedAfterDelay}, locked}));

    clearTimeout(timeout);
    win.destroy();
    app.exit(0);
  } catch (error) {
    die(String(error && error.stack || error));
  }
});
