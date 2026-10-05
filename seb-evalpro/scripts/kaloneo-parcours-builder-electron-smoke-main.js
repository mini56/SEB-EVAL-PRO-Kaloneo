const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, details) {
  console.error('KALONEO_PARCOURS_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state={version:1,sessionStorage:{},localStorage:{},lastPage:'kaltest-pilot2.html',lastEvaluationPage:'kaltest-pilot2.html'};
const library=[
  {id:'introduction_parcours_base',version:'1.0.0',title:'Introduction de parcours — modèle de base',category:'introduction',role:'introduction',kind:'complex',scored:false,description:'Introduction'},
  {id:'test_alpha',version:'1.0.0',title:'Test Alpha',category:'mathematiques',role:'test',kind:'questionnaire',scored:true,description:'Premier test',questionCount:3},
  {id:'test_beta',version:'1.0.0',title:'Test Bêta',category:'francais',role:'test',kind:'questionnaire',scored:false,description:'Deuxième test',questionCount:2},
  {id:'test_gamma',version:'1.0.0',title:'Test Gamma',category:'organisation',role:'test',kind:'complex',scored:false,description:'Troisième test',questionCount:0},
  {id:'fin_parcours',version:'1.0.0',title:'Fin du parcours',category:'systeme',role:'fin',kind:'complex',scored:false,description:'Fin'}
];
const saved=[{id:'parcours-de-base',name:'Parcours de base',creator:'SEB EvalPro / KALONÉO',systemProvided:true,testCount:3}];
let lastSavedPayload=null;

ipcMain.on('app:edition-sync',e=>{e.returnValue={edition:'unified',canBilan:true,canAi:true,canImport:true,canExport:true};});
ipcMain.on('state:load-sync',e=>{e.returnValue=state;});
ipcMain.on('state:save-sync',(e,p)=>{state={...state,...(p||{})};e.returnValue={ok:true,state};});
ipcMain.on('candidate-catalog:workspace-load-sync',e=>{e.returnValue={ok:false};});
ipcMain.on('candidate-catalog:workspace-save-sync',e=>{e.returnValue={ok:true};});
ipcMain.on('candidate-catalog:results-workspace-load-sync',e=>{e.returnValue={ok:false};});
ipcMain.handle('state:save',(_e,p)=>{state={...state,...(p||{})};return {ok:true,state};});
for (const name of ['admin:status','admin:verify','admin:verify-password','admin:lock','candidate:set-admin-export-context','candidate-catalog:end-bilan','admin:open-candidate-browser','admin:return-candidate-browser','admin:open-tests-parcours','admin:close-tests-parcours','admin:open-bilan','admin:open-candidate-results','admin:return-evaluation','admin:close-session','admin:quit-application']) ipcMain.handle(name,()=>true);
ipcMain.handle('candidate:active',()=>null);
ipcMain.handle('candidate-catalog:workspace-save',()=>({ok:true}));
ipcMain.handle('candidate:complete-active',()=>({ok:true}));
ipcMain.handle('ai:cancel-current',()=>({ok:true}));
ipcMain.handle('ai:status',()=>({available:true,offline:true,integrated:true}));
ipcMain.handle('ai:rewrite-synthesis',()=>({ok:false}));
ipcMain.handle('replay:capture-page',()=>({ok:true}));
ipcMain.handle('replay:list',()=>[]);
ipcMain.handle('bilan-history:list',()=>[]);
ipcMain.handle('candidate-catalog:list',()=>[]);
ipcMain.handle('candidate-catalog:sync',()=>({ok:true}));
ipcMain.handle('candidate-catalog:detail',()=>({ok:false}));
ipcMain.handle('kaloneo-library:list-tests',()=>({ok:true,tests:library}));
ipcMain.handle('kaloneo-library:list-parcours',()=>({ok:true,parcours:saved}));
ipcMain.handle('kaloneo-library:save-parcours',(_e,payload)=>{
  const key=String(payload?.name||'').trim().toLocaleLowerCase('fr-FR');
  if(saved.some(x=>String(x.name||'').trim().toLocaleLowerCase('fr-FR')===key)) return {ok:false,error:'Un parcours portant ce nom existe déjà.'};
  lastSavedPayload=JSON.parse(JSON.stringify(payload||{}));
  const item={id:'parcours-smoke',name:String(payload.name||''),creator:String(payload.creator||''),systemProvided:false,testCount:Array.isArray(payload.tests)?payload.tests.length:0};
  saved.push(item);
  return {ok:true,parcours:item};
});

const timeout=setTimeout(()=>fail('délai global dépassé'),45000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function pointerDrag(win, sourceSelector, targetSelector) {
  return win.webContents.executeJavaScript(`(()=>{
    const source=document.querySelector(${JSON.stringify(sourceSelector)});
    const target=document.querySelector(${JSON.stringify(targetSelector)});
    if(!source||!target||typeof PointerEvent!=='function') return {ok:false,reason:'élément/PointerEvent absent'};
    const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
    const sx=a.left+Math.min(a.width/2,40),sy=a.top+Math.min(a.height/2,22);
    const tx=b.left+Math.min(Math.max(20,b.width/2),b.width-10),ty=b.top+Math.min(Math.max(20,b.height/2),b.height-10);
    const init=(x,y,buttons)=>({bubbles:true,cancelable:true,pointerId:77,pointerType:'mouse',isPrimary:true,button:0,buttons,clientX:x,clientY:y});
    source.dispatchEvent(new PointerEvent('pointerdown',init(sx,sy,1)));
    document.dispatchEvent(new PointerEvent('pointermove',init(sx+10,sy+10,1)));
    document.dispatchEvent(new PointerEvent('pointermove',init(tx,ty,1)));
    document.dispatchEvent(new PointerEvent('pointerup',init(tx,ty,0)));
    return {ok:true,from:[sx,sy],to:[tx,ty]};
  })()`);
}

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..'),web=path.join(root,'app','web'),target=path.join(web,'admin-parcours-builder.html');
  if(!fs.existsSync(target)) return fail('admin-parcours-builder.html absent de app/web');
  const win=new BrowserWindow({show:false,width:1366,height:768,webPreferences:{preload:path.join(root,'src','preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}});
  win.webContents.on('preload-error',(_e,p,error)=>fail('erreur preload '+String(p||''),{error:String(error?.stack||error)}));

  try{
    await win.loadFile(target);await wait(900);

    const initial=await win.webContents.executeJavaScript(`(()=>{
      const body=getComputedStyle(document.body);
      const lib=getComputedStyle(document.getElementById('library-sections'));
      const seq=getComputedStyle(document.querySelector('.sequence-scroll'));
      const savedStyle=getComputedStyle(document.getElementById('saved-parcours'));
      const save=document.getElementById('save-parcours');
      const tests=document.querySelector('.tests-step').getBoundingClientRect();
      const end=document.querySelector('.end-step').getBoundingClientRect();
      const privacy=document.getElementById('seb-evalpro-privacy-toggle');
      return {
        title:String(document.querySelector('.page-topbar h1')?.textContent||'').trim(),
        libraryCount:document.querySelectorAll('.library-card').length,
        intro:String(document.querySelector('#intro-slot .special-card strong')?.textContent||'').trim(),
        fin:String(document.querySelector('#fin-slot .special-card strong')?.textContent||'').trim(),
        savedCount:document.querySelectorAll('#saved-parcours .saved-card').length,
        bodyOverflow:body.overflowY,
        scrolls:[lib.overflowY,seq.overflowY,savedStyle.overflowY],
        saveInTop:!!save?.closest('.meta-card'),
        saveShadow:getComputedStyle(save).boxShadow,
        finGap:Math.round(end.top-tests.bottom),
        privacyDisplay:privacy?getComputedStyle(privacy).display:'absent'
      };
    })()`);
    if(initial.title!=='Création de parcours'||initial.libraryCount!==3||!/Introduction/.test(initial.intro)||initial.fin!=='Fin du parcours'||initial.savedCount!==1||
       initial.bodyOverflow!=='hidden'||initial.scrolls.some(v=>v!=='auto')||!initial.saveInTop||initial.saveShadow!=='none'||initial.finGap<12||
       !['none','absent'].includes(initial.privacyDisplay)) return fail('état R2 initial incorrect',initial);

    // Boutons Ajouter / Retirer restent fonctionnels.
    await win.webContents.executeJavaScript(`(()=>{const c=[...document.querySelectorAll('.library-card')].find(x=>x.querySelector('.card-title')?.textContent==='Test Alpha');c?.querySelector('.card-add')?.click();return true;})()`);
    await wait(100);
    let stateUi=await win.webContents.executeJavaScript(`({sequence:document.querySelectorAll('.sequence-card').length,library:document.querySelectorAll('.library-card').length})`);
    if(stateUi.sequence!==1||stateUi.library!==2)return fail('Ajouter incorrect',stateUi);
    await win.webContents.executeJavaScript(`document.querySelector('.sequence-card .remove-test').click();true`);await wait(100);
    stateUi=await win.webContents.executeJavaScript(`({sequence:document.querySelectorAll('.sequence-card').length,library:document.querySelectorAll('.library-card').length})`);
    if(stateUi.sequence!==0||stateUi.library!==3)return fail('Retirer incorrect',stateUi);

    // Pointer drag réel Bibliothèque -> Parcours.
    let drag=await pointerDrag(win,'.library-card[data-id="test_gamma"]','#tests-dropzone');await wait(140);
    let afterPointer=await win.webContents.executeJavaScript(`({titles:[...document.querySelectorAll('.sequence-title')].map(x=>x.textContent.trim()),library:document.querySelectorAll('.library-card').length})`);
    if(!drag.ok||JSON.stringify(afterPointer.titles)!==JSON.stringify(['Test Gamma'])||afterPointer.library!==2)return fail('drag souris Bibliothèque -> Parcours incorrect',{drag,afterPointer});

    // Pointer drag réel Parcours -> Bibliothèque.
    drag=await pointerDrag(win,'.sequence-card[data-test-id="test_gamma"]','.library-panel');await wait(140);
    afterPointer=await win.webContents.executeJavaScript(`({sequence:document.querySelectorAll('.sequence-card').length,library:document.querySelectorAll('.library-card').length,gamma:!![...document.querySelectorAll('.library-card')].find(x=>x.dataset.id==='test_gamma')})`);
    if(!drag.ok||afterPointer.sequence!==0||afterPointer.library!==3||!afterPointer.gamma)return fail('drag souris Parcours -> Bibliothèque incorrect',{drag,afterPointer});

    // Construire trois tests puis réordonner par pointer drag.
    await win.webContents.executeJavaScript(`(()=>{
      const add=t=>[...document.querySelectorAll('.library-card')].find(c=>c.querySelector('.card-title')?.textContent===t)?.querySelector('.card-add')?.click();
      add('Test Alpha');add('Test Bêta');add('Test Gamma');return true;
    })()`);await wait(120);
    drag=await pointerDrag(win,'.sequence-card[data-test-id="test_gamma"]','.sequence-card[data-test-id="test_alpha"]');await wait(140);
    const reordered=await win.webContents.executeJavaScript(`[...document.querySelectorAll('.sequence-title')].map(x=>x.textContent.trim())`);
    if(!drag.ok||reordered[0]!=='Test Gamma'||reordered.length!==3)return fail('réordonnancement souris incorrect',{drag,reordered});

    // Enregistrement + persistance + nom dupliqué.
    await win.webContents.executeJavaScript(`(()=>{document.getElementById('parcours-name').value='Parcours long';document.getElementById('parcours-creator').value='Créateur smoke';document.getElementById('save-parcours').click();return true;})()`);
    await wait(220);
    const savedUi=await win.webContents.executeJavaScript(`({status:document.getElementById('builder-status').textContent.trim(),saved:[...document.querySelectorAll('.saved-card strong')].map(x=>x.textContent.trim()),creators:[...document.querySelectorAll('.saved-card span:first-of-type')].map(x=>x.textContent.trim())})`);
    if(!lastSavedPayload||lastSavedPayload.tests?.length!==3||new Set(lastSavedPayload.tests.map(x=>x.id)).size!==3||!/enregistré/i.test(savedUi.status)||!savedUi.saved.includes('Parcours long'))return fail('enregistrement incorrect',{lastSavedPayload,savedUi});

    await win.reload();await wait(750);
    const reloaded=await win.webContents.executeJavaScript(`({saved:[...document.querySelectorAll('.saved-card strong')].map(x=>x.textContent.trim()),creators:[...document.querySelectorAll('.saved-card span:first-of-type')].map(x=>x.textContent.trim())})`);
    if(!reloaded.saved.includes('Parcours long')||!reloaded.creators.some(x=>/Créateur smoke/.test(x)))return fail('persistance incorrecte',reloaded);

    await win.webContents.executeJavaScript(`(()=>{
      const add=t=>[...document.querySelectorAll('.library-card')].find(c=>c.querySelector('.card-title')?.textContent===t)?.querySelector('.card-add')?.click();
      add('Test Alpha');add('Test Bêta');add('Test Gamma');
      document.getElementById('parcours-name').value='Parcours long';document.getElementById('parcours-creator').value='Créateur smoke';document.getElementById('save-parcours').click();return true;
    })()`);await wait(180);
    const duplicate=await win.webContents.executeJavaScript(`({status:document.getElementById('builder-status').textContent.trim(),sequence:document.querySelectorAll('.sequence-card').length})`);
    if(!/existe déjà/i.test(duplicate.status)||duplicate.sequence!==3)return fail('nom dupliqué incorrect',duplicate);

    console.log('KALONEO_PARCOURS_ELECTRON=OK');
    console.log(JSON.stringify({initial,afterPointer,reordered,savedUi,reloaded,duplicate,lastSavedPayload}));
    clearTimeout(timeout);win.destroy();app.exit(0);
  }catch(error){fail(String(error?.stack||error));}
});
