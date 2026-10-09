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
let adminUnlocked = false;
let activeCandidate = { candidateId:'SMOKE', displayName:'Candidat test', status:'EN_COURS' };
let workspaceLoad = { ok:false };
let openCandidateCalls = 0;
let openTestsParcoursCalls = 0;
let closeTestsParcoursCalls = 0;
let endBilanCalls = 0;
let returnCandidateCalls = 0;
let lastExportOptions = null;
const catalogItems = [
  {
    candidateId:'CAND-DONE-1', nom:'Candidat', prenom:'Terminé', lieu:'Lorient', groupe:'1', date:'2026-10-09',
    status:'TERMINE', bilanCount:1, revisionCount:0, hasOriginalBilan:true, replayCount:1, exportCount:1
  },
  {
    candidateId:'CAND-ACTIVE-1', nom:'Candidat', prenom:'En cours', lieu:'Auray', groupe:'2', date:'2026-10-09',
    status:'EN_COURS', bilanCount:0, revisionCount:0, hasOriginalBilan:false, replayCount:0, exportCount:0
  }
];

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
ipcMain.on('candidate-catalog:workspace-load-sync', (event) => { event.returnValue = workspaceLoad; });
ipcMain.on('candidate-catalog:workspace-save-sync', (event) => { event.returnValue = { ok:true }; });
ipcMain.handle('candidate-catalog:workspace-save', () => ({ ok:true }));
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
ipcMain.handle('admin:return-candidate-browser', () => { returnCandidateCalls += 1; return true; });
ipcMain.handle('admin:open-tests-parcours', () => { openTestsParcoursCalls += 1; return true; });
ipcMain.handle('admin:close-tests-parcours', () => { closeTestsParcoursCalls += 1; return true; });
ipcMain.handle('admin:open-bilan', () => true);
ipcMain.handle('admin:open-candidate-results', () => true);
ipcMain.handle('admin:return-evaluation', () => true);
ipcMain.handle('admin:close-session', () => true);
ipcMain.handle('admin:quit-application', () => true);
ipcMain.handle('candidate:complete-active', () => ({ ok:true }));
ipcMain.handle('candidate:set-admin-export-context', () => true);
ipcMain.handle('candidate-catalog:end-bilan', () => { endBilanCalls += 1; return true; });
ipcMain.handle('ai:cancel-current', () => ({ ok:true }));
ipcMain.handle('ai:status', () => ({ available:true, offline:true, integrated:true }));
ipcMain.handle('ai:rewrite-synthesis', () => ({ ok:false }));
ipcMain.handle('replay:capture-page', () => ({ ok:true }));
ipcMain.handle('replay:list', () => []);
ipcMain.handle('bilan-history:list', () => []);
ipcMain.handle('candidate-catalog:list', () => catalogItems);
ipcMain.handle('admin:export-candidates', (_event, _password, options = {}) => {
  lastExportOptions = JSON.parse(JSON.stringify(options || {}));
  const count = Array.isArray(options.candidateIds) ? options.candidateIds.length : 0;
  return {
    ok:true, total:count, added:count, updated:0, skipped:0, verifiedFiles:count,
    destinationRoot:'USB-SMOKE', invalidSkipped:0
  };
});
ipcMain.handle('admin:import-candidates', () => ({ ok:true, total:0, added:0, updated:0, skipped:0, verifiedFiles:0, destinationRoot:'ADMIN-SMOKE' }));
ipcMain.handle('candidate-catalog:sync', () => ({ ok:true }));
ipcMain.handle('candidate-catalog:detail', () => ({ ok:false }));

const timeout = setTimeout(() => die('délai global dépassé'), 55000);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    // 1. État verrouillé réel au démarrage.
    await win.loadFile(path.join(web, 'qcmv1.0.html'));
    await wait(750);

    const lockedInitial = await win.webContents.executeJavaScript(`(()=>{
      const physicalVisible=(el)=>{
        if(!el)return false;
        const css=getComputedStyle(el),r=el.getBoundingClientRect();
        return css.display!=='none'&&css.visibility!=='hidden'&&r.width>0&&r.height>0;
      };
      const buttons=[...document.querySelectorAll('#seb-evalpro-topbar button')].map(el=>({
        id:el.id,text:String(el.textContent||'').trim(),hidden:el.hidden,
        display:getComputedStyle(el).display,physical:physicalVisible(el)
      }));
      return {buttons,shown:buttons.filter(x=>x.physical),adminText:String(document.getElementById('seb-evalpro-admin')?.textContent||'').trim()};
    })()`);

    if (lockedInitial.shown.length !== 1 || lockedInitial.shown[0].id !== 'seb-evalpro-admin' || lockedInitial.adminText !== 'Administrateur') {
      die('au démarrage verrouillé, seul Administrateur doit être visible', lockedInitial);
      return;
    }
    const hiddenButDisplayed = lockedInitial.buttons.filter(b => b.hidden && b.display !== 'none');
    if (hiddenButDisplayed.length) {
      die('un bouton hidden reste affiché par le CSS', hiddenButDisplayed);
      return;
    }

    const privacyToggleStyle = await win.webContents.executeJavaScript(`(()=>{
      const b=document.getElementById('seb-evalpro-privacy-toggle');
      if(!b)return null;
      const c=getComputedStyle(b),r=b.getBoundingClientRect();
      return {
        text:String(b.textContent||'').trim(),
        color:c.color,
        borderColor:c.borderColor,
        borderRadius:c.borderRadius,
        backgroundImage:c.backgroundImage,
        height:r.height
      };
    })()`);
    if (!privacyToggleStyle ||
        !/Afficher l’écran d’accueil/.test(privacyToggleStyle.text) ||
        privacyToggleStyle.color !== 'rgb(0, 78, 112)' ||
        privacyToggleStyle.borderColor !== 'rgb(0, 78, 112)' ||
        privacyToggleStyle.borderRadius !== '10px' ||
        !/linear-gradient/.test(privacyToggleStyle.backgroundImage)) {
      die('Afficher l’écran d’accueil n’utilise pas le style KALONÉO', privacyToggleStyle || {});
      return;
    }

    // 2. Déverrouillage par le vrai bouton et la vraie boîte de mot de passe.
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-admin').click(); true");
    await wait(120);
    const dialogExists = await win.webContents.executeJavaScript("!!document.getElementById('seb-evalpro-admin-dialog')");
    if (!dialogExists) {
      die('boîte de déverrouillage Admin absente');
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-admin-ok').click(); true");
    await wait(700);

    const unlockedActive = await win.webContents.executeJavaScript(`(()=>{
      const visible=(id)=>{const el=document.getElementById(id);if(!el)return false;const css=getComputedStyle(el),r=el.getBoundingClientRect();return css.display!=='none'&&css.visibility!=='hidden'&&r.width>0&&r.height>0;};
      const bar=document.getElementById('seb-evalpro-topbar'),br=bar.getBoundingClientRect();
      const ids=['seb-evalpro-open-candidate','seb-evalpro-bilan','seb-evalpro-return','seb-evalpro-close-session','seb-evalpro-admin','seb-evalpro-export-candidates','seb-evalpro-import-candidates','seb-evalpro-tests-parcours','seb-evalpro-show-privacy','seb-evalpro-finish-candidate','seb-evalpro-quit-application'];
      const buttons=ids.map(id=>{const el=document.getElementById(id);if(!el)return null;const r=el.getBoundingClientRect(),css=getComputedStyle(el);return{id,text:String(el.textContent||'').trim(),hidden:el.hidden,display:css.display,fontSize:css.fontSize,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,color:css.color,borderColor:css.borderColor,physical:visible(id)};}).filter(Boolean);
      return {
        barRect:{top:br.top,bottom:br.bottom,height:br.height},
        buttons,
        list:visible('seb-evalpro-open-candidate'),
        closeSession:visible('seb-evalpro-close-session'),
        tests:visible('seb-evalpro-tests-parcours'),
        privacy:visible('seb-evalpro-show-privacy'),
        bilan:visible('seb-evalpro-bilan'),
        retour:visible('seb-evalpro-return'),
        finish:visible('seb-evalpro-finish-candidate'),
        quit:visible('seb-evalpro-quit-application'),
        adminText:String(document.getElementById('seb-evalpro-admin')?.textContent||'').trim(),
        listText:String(document.getElementById('seb-evalpro-open-candidate')?.textContent||'').trim(),
        exportText:String(document.getElementById('seb-evalpro-export-candidates')?.textContent||'').trim(),
        importText:String(document.getElementById('seb-evalpro-import-candidates')?.textContent||'').trim()
      };
    })()`);

    if (!unlockedActive.list || !unlockedActive.closeSession || !unlockedActive.privacy || !unlockedActive.quit ||
        unlockedActive.tests || unlockedActive.bilan || unlockedActive.retour || unlockedActive.finish ||
        unlockedActive.adminText !== 'Verrouiller' || unlockedActive.listText !== 'Lister les candidats') {
      die('état Admin avec parcours actif incorrect', unlockedActive);
      return;
    }
    const legacyTransferButtons = unlockedActive.buttons.filter((b) =>
      ['seb-evalpro-export-candidates','seb-evalpro-import-candidates'].includes(b.id)
    );
    if (legacyTransferButtons.some((b) => b.physical)) {
      die('Import / Export candidats doivent être retirés de la barre Admin', legacyTransferButtons);
      return;
    }

    const visibleButtons = unlockedActive.buttons.filter(b => b.physical);
    if (visibleButtons.some(b => b.fontSize !== '15px')) {
      die('tous les boutons visibles de la barre doivent utiliser 15 px', visibleButtons);
      return;
    }
    if (visibleButtons.some(b => b.height > 36.5 || b.top < unlockedActive.barRect.top - 0.5 || b.bottom > unlockedActive.barRect.bottom + 0.5)) {
      die('un bouton dépasse de la hauteur de la barre Admin', {bar:unlockedActive.barRect,buttons:visibleButtons});
      return;
    }
    for (let i=0;i<visibleButtons.length;i++) {
      for (let j=i+1;j<visibleButtons.length;j++) {
        const a=visibleButtons[i],b=visibleButtons[j];
        const overlap=Math.min(a.right,b.right)-Math.max(a.left,b.left);
        if (overlap>0.5) {
          die('deux boutons visibles se chevauchent', {a,b});
          return;
        }
      }
    }
    const quitStyle=unlockedActive.buttons.find(b=>b.id==='seb-evalpro-quit-application');
    if (!quitStyle || quitStyle.color!=='rgb(192, 0, 0)' || quitStyle.borderColor!=='rgb(192, 0, 0)') {
      die('Quitter doit rester rouge', quitStyle||{});
      return;
    }

    // 3. Tous les boutons actuellement visibles doivent produire une aide.
    for (const item of visibleButtons) {
      await win.webContents.executeJavaScript(`(()=>{
        const bar=document.getElementById('seb-evalpro-topbar');
        bar.classList.add('seb-evalpro-visible');
        const old=document.getElementById('seb-evalpro-admin-help');
        if(old){old.hidden=true;old.textContent='';}
        const b=document.getElementById(${JSON.stringify(item.id)});
        b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));
        return true;
      })()`);
      await wait(720);
      const help=await win.webContents.executeJavaScript("(()=>{const t=document.getElementById('seb-evalpro-admin-help');return t&&!t.hidden?String(t.textContent||'').trim():'';})()");
      if (!help) {
        die('un bouton visible n’a pas de bulle d’aide', item);
        return;
      }
      await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-topbar').dispatchEvent(new MouseEvent('click',{bubbles:true}));true");
      await wait(25);
    }

    // 4. Sans parcours actif, Tests / Parcours apparaît et la fin de parcours disparaît.
    activeCandidate = null;
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('pageshow'));true");
    await wait(320);
    const noActive=await win.webContents.executeJavaScript(`(()=>{
      const visible=(id)=>{const e=document.getElementById(id);if(!e)return false;const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0;};
      return {tests:visible('seb-evalpro-tests-parcours'),closeSession:visible('seb-evalpro-close-session'),finish:visible('seb-evalpro-finish-candidate')};
    })()`);
    if (!noActive.tests || noActive.closeSession || noActive.finish) {
      die('visibilité contextuelle de fin de parcours / Tests incorrecte', noActive);
      return;
    }

    // 4b. Quitter ne doit plus inventer un parcours candidat lorsqu'il n'y en a aucun.
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-quit-application').click();true");
    await wait(100);
    const quitWithoutActive = await win.webContents.executeJavaScript(
      "String(document.querySelector('#seb-evalpro-quit-application-dialog .seb-session-close-text')?.textContent||'').trim()"
    );
    if (!/Aucun parcours candidat n.est en cours/.test(quitWithoutActive)) {
      die('Quitter annonce encore un faux parcours actif', { quitWithoutActive });
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-quit-application-cancel').click();true");
    await wait(60);

    activeCandidate = { candidateId:'SMOKE', displayName:'Candidat test', status:'EN_COURS' };
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('pageshow'));true");
    await wait(250);
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-quit-application').click();true");
    await wait(100);
    const quitWithActive = await win.webContents.executeJavaScript(
      "String(document.querySelector('#seb-evalpro-quit-application-dialog .seb-session-close-text')?.textContent||'').trim()"
    );
    if (!/parcours candidat en cours sera sauvegardé/i.test(quitWithActive)) {
      die('Quitter ne reconnaît plus un vrai parcours actif', { quitWithActive });
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-quit-application-cancel').click();true");
    await wait(60);
    activeCandidate = null;
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('pageshow'));true");
    await wait(180);

    // 5. Écran SEB EvalPro depuis une vraie page Admin.
    await win.loadFile(path.join(web,'admin-candidats.html'));
    await wait(700);
    const homeState=await win.webContents.executeJavaScript(`(()=>{
      const visible=(id)=>{const e=document.getElementById(id);if(!e)return false;const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0;};
      return {
        list:visible('seb-evalpro-open-candidate'),
        listText:String(document.getElementById('seb-evalpro-open-candidate')?.textContent||'').trim(),
        privacy:visible('seb-evalpro-show-privacy'),
        legacyExport:visible('seb-evalpro-export-candidates'),
        legacyImport:visible('seb-evalpro-import-candidates')
      };
    })()`);
    if (!homeState.list || homeState.listText!=='Lister les candidats' || !homeState.privacy || homeState.legacyExport || homeState.legacyImport) {
      die('barre de l’espace Administrateur incorrecte', homeState);
      return;
    }

    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-show-privacy').click();true");
    await wait(180);
    const privacyShown=await win.webContents.executeJavaScript("(()=>{const l=document.getElementById('seb-evalpro-privacy-layer');return !!l&&getComputedStyle(l).display==='flex';})()");
    if (!privacyShown) {
      die('Afficher l’écran d’accueil ne fonctionne pas depuis une page Admin');
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-privacy-hide').click();true");
    await wait(140);
    const privacyHidden=await win.webContents.executeJavaScript("(()=>{const l=document.getElementById('seb-evalpro-privacy-layer');return !!l&&getComputedStyle(l).display==='none';})()");
    if (!privacyHidden) {
      die('Masquer l’écran d’accueil ne restaure pas la page Admin');
      return;
    }

    // 5b. Import / Export candidats se fait maintenant dans la Liste des candidats.
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-open-candidate').click();true");
    await wait(180);
    const catalogTransferUi=await win.webContents.executeJavaScript(`(()=>{
      const visible=id=>{const e=document.getElementById(id);if(!e)return false;const c=getComputedStyle(e),r=e.getBoundingClientRect();return !e.hidden&&c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0;};
      return {
        catalog:!!document.getElementById('seb-candidate-catalog'),
        importVisible:visible('seb-cc-import'),
        exportVisible:visible('seb-cc-export-mode'),
        closeVisible:visible('seb-cc-close'),
        rows:document.querySelectorAll('.seb-cc-row').length
      };
    })()`);
    if (!catalogTransferUi.catalog || !catalogTransferUi.importVisible || !catalogTransferUi.exportVisible || !catalogTransferUi.closeVisible || catalogTransferUi.rows!==2) {
      die('boutons Import / Export absents de la Liste des candidats', catalogTransferUi);
      return;
    }

    // Import conserve le processus existant : le clic ouvre bien la demande de mot de passe.
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-import').click();true");
    await wait(100);
    const importPasswordDialog=await win.webContents.executeJavaScript("String(document.querySelector('#seb-evalpro-transfer-password-dialog .seb-transfer-password-title')?.textContent||'').trim()");
    if (!/Import USB sécurisé/i.test(importPasswordDialog)) {
      die('Importer candidat ne lance plus le processus USB existant', {importPasswordDialog});
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-transfer-password-cancel').click();true");
    await wait(80);

    await win.webContents.executeJavaScript("document.getElementById('seb-cc-export-mode').click();true");
    await wait(80);
    const exportMode=await win.webContents.executeJavaScript(`(()=>({
      importHidden:document.getElementById('seb-cc-import').hidden,
      exportHidden:document.getElementById('seb-cc-export-mode').hidden,
      cancelVisible:!document.getElementById('seb-cc-export-cancel').hidden,
      launchVisible:!document.getElementById('seb-cc-export-launch').hidden,
      launchDisabled:document.getElementById('seb-cc-export-launch').disabled,
      rowButtons:[...document.querySelectorAll('.seb-cc-actions button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled}))
    }))()`);
    if (!exportMode.importHidden || !exportMode.exportHidden || !exportMode.cancelVisible || !exportMode.launchVisible || !exportMode.launchDisabled ||
        exportMode.rowButtons.length!==2 || exportMode.rowButtons[0].text!=='Exporter' || exportMode.rowButtons[0].disabled ||
        exportMode.rowButtons[1].text!=='Parcours en cours' || !exportMode.rowButtons[1].disabled) {
      die('mode de sélection Export candidats incorrect', exportMode);
      return;
    }

    await win.webContents.executeJavaScript("document.querySelector('.seb-cc-actions button:not(:disabled)').click();true");
    await wait(70);
    const selectedExport=await win.webContents.executeJavaScript(`(()=>({
      launch:String(document.getElementById('seb-cc-export-launch').textContent||'').trim(),
      launchDisabled:document.getElementById('seb-cc-export-launch').disabled,
      selected:String(document.querySelector('.seb-cc-actions button:not(:disabled)')?.textContent||'').trim()
    }))()`);
    if (selectedExport.launch!=='Lancer l’export (1)' || selectedExport.launchDisabled || selectedExport.selected!=='✓ Sélectionné') {
      die('sélection d’un candidat pour export incorrecte', selectedExport);
      return;
    }

    await win.webContents.executeJavaScript("document.getElementById('seb-cc-export-launch').click();true");
    await wait(90);
    await win.webContents.executeJavaScript(`(()=>{
      document.getElementById('seb-transfer-password').value='USB-Test-2026!';
      document.getElementById('seb-transfer-password-confirm').value='USB-Test-2026!';
      document.getElementById('seb-transfer-password-ok').click();
      return true;
    })()`);
    await wait(90);
    await win.webContents.executeJavaScript("document.getElementById('seb-export-existing').click();true");
    await wait(140);
    if (!lastExportOptions || JSON.stringify(lastExportOptions.candidateIds)!==JSON.stringify(['CAND-DONE-1'])) {
      die('la sélection de candidats n’est pas transmise au moteur d’export', lastExportOptions||{});
      return;
    }
    const exportDoneDialog=await win.webContents.executeJavaScript("String(document.querySelector('#seb-evalpro-transfer-dialog .seb-transfer-title')?.textContent||'').trim()");
    if (exportDoneDialog!=='Export terminé') {
      die('processus normal d’export non terminé après sélection', {exportDoneDialog});
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-transfer-ok').click();true");
    await wait(80);
    const afterSelectedExport=await win.webContents.executeJavaScript(`(()=>({
      normalImport:!document.getElementById('seb-cc-import').hidden,
      normalExport:!document.getElementById('seb-cc-export-mode').hidden,
      launchHidden:document.getElementById('seb-cc-export-launch').hidden
    }))()`);
    if (!afterSelectedExport.normalImport || !afterSelectedExport.normalExport || !afterSelectedExport.launchHidden) {
      die('la Liste des candidats ne revient pas au mode normal après export', afterSelectedExport);
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('seb-cc-close').click();true");
    await wait(80);

    // 6. Tests / Parcours : KALONÉO intégré + retour Fermer.
    await win.webContents.executeJavaScript("document.getElementById('seb-evalpro-tests-parcours').click();true");
    await wait(100);
    if (openTestsParcoursCalls!==1) {
      die('Tests / Parcours ne déclenche pas sa navigation', {openTestsParcoursCalls});
      return;
    }
    await win.loadFile(path.join(web,'admin-tests-parcours.html'));
    await wait(550);
    const testsPage=await win.webContents.executeJavaScript("(()=>{const main=document.querySelector('main');const buttons=main?[...main.querySelectorAll('button')]:[];return{title:String(main?.querySelector('h1')?.textContent||'').trim(),buttonCount:buttons.length,builderText:String(document.getElementById('open-kaloneo-builder')?.textContent||'').trim(),closeText:String(document.getElementById('close-tests-parcours')?.textContent||'').trim()};})()");
    if (testsPage.title!=='Tests / Parcours'||testsPage.buttonCount!==2||!/KALONÉO/.test(testsPage.builderText)||testsPage.closeText!=='Fermer') {
      die('page Tests / Parcours non conforme', testsPage);
      return;
    }

    await win.webContents.executeJavaScript("document.getElementById('open-kaloneo-builder').click();true");
    await wait(550);
    const builderPage=await win.webContents.executeJavaScript("(()=>{const tpl=document.getElementById('block-template');return{title:String(document.querySelector('h1')?.textContent||'').trim(),hasCore:!!window.KaloneoBuilderCore,hasImport:!!document.getElementById('import-json'),hasGrid:!!tpl&&[...tpl.content.querySelectorAll('.block-type option')].some(o=>o.value==='table-grid'),hasFreeLayout:[...document.querySelectorAll('#test-layout option')].some(o=>o.value==='chars-rest'),hasRenderedBlock:!!document.querySelector('#blocks-editor .exercise-block'),hasBack:!!document.getElementById('back-tests')}})()");
    if (!/KALONÉO/.test(builderPage.title)||!builderPage.hasCore||!builderPage.hasImport||!builderPage.hasGrid||!builderPage.hasFreeLayout||!builderPage.hasRenderedBlock||!builderPage.hasBack) {
      die('Builder KALONÉO intégré non conforme', builderPage);
      return;
    }

    await win.webContents.executeJavaScript("document.getElementById('back-tests').click();true");
    await wait(450);
    await win.webContents.executeJavaScript("document.getElementById('close-tests-parcours').click();true");
    await wait(100);
    if (closeTestsParcoursCalls!==1) {
      die('Fermer de Tests / Parcours ne déclenche pas le retour', {closeTestsParcoursCalls});
      return;
    }

    // 7. Bilan : deux boutons Fermer, chacun sauvegarde et revient au candidat.
    workspaceLoad={
      ok:true,
      candidateId:'SMOKE-XY',
      candidate:{nom:'XX',prenom:'YY',date:'02/10/2026'},
      state:{sessionStorage:{},localStorage:{},lastPage:'qcmv1.0.html',lastEvaluationPage:'qcmv1.0.html'}
    };
    await win.loadFile(path.join(web,'admin-bilan.html'));
    await wait(700);
    const bilanButtons=await win.webContents.executeJavaScript("(()=>({top:String(document.getElementById('close-bilan-top')?.textContent||'').trim(),bottom:String(document.getElementById('close-bilan-bottom')?.textContent||'').trim()}))()");
    if (!bilanButtons.top.endsWith('Fermer')||!bilanButtons.bottom.endsWith('Fermer')) {
      die('les deux boutons Fermer du bilan sont absents', bilanButtons);
      return;
    }
    await win.webContents.executeJavaScript("document.getElementById('close-bilan-top').click();true");
    await wait(150);
    if (endBilanCalls!==1||returnCandidateCalls<1) {
      die('Fermer en haut du bilan ne ferme pas proprement le bilan', {endBilanCalls,returnCandidateCalls});
      return;
    }

    workspaceLoad={
      ok:true,
      candidateId:'SMOKE-XY',
      candidate:{nom:'XX',prenom:'YY',date:'02/10/2026'},
      state:{sessionStorage:{},localStorage:{},lastPage:'qcmv1.0.html',lastEvaluationPage:'qcmv1.0.html'}
    };
    await win.loadFile(path.join(web,'admin-bilan.html'));
    await wait(650);
    await win.webContents.executeJavaScript("document.getElementById('close-bilan-bottom').click();true");
    await wait(150);
    if (endBilanCalls!==2||returnCandidateCalls<2) {
      die('Fermer en bas du bilan ne ferme pas proprement le bilan', {endBilanCalls,returnCandidateCalls});
      return;
    }

    console.log('BUILD21_ADMIN_ELECTRON_SMOKE: OK');
    console.log(JSON.stringify({lockedInitial,unlockedActive,noActive,homeState,privacyShown,privacyHidden,testsPage,builderPage,bilanButtons,endBilanCalls,returnCandidateCalls}));

    clearTimeout(timeout);
    win.destroy();
    app.exit(0);
  } catch (error) {
    die(String(error && error.stack || error));
  }
});
