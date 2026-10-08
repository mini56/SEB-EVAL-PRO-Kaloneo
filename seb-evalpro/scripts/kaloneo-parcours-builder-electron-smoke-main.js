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
const masks=[
  {id:'kaloneo-default',version:'1.0.0',name:'KALONÉO',systemProvided:true,hasText:true,hasImage:false},
  {id:'masque-smoke',version:'1.0.0',name:'Masque Smoke',systemProvided:false,hasText:true,hasImage:true}
];
const saved=[{id:'parcours-de-base',name:'Parcours de base',creator:'SEB EvalPro / KALONÉO',systemProvided:true,testCount:3,maskScreen:{id:'kaloneo-default',version:'1.0.0'},maskScreenMeta:{name:'KALONÉO'}}];
const savedDefinitions={
  'parcours-de-base':{
    format:'kaloneo-parcours',schemaVersion:2,id:'parcours-de-base',name:'Parcours de base',
    creator:'SEB EvalPro / KALONÉO',systemProvided:true,
    maskScreen:{id:'kaloneo-default',version:'1.0.0'},
    introduction:{id:'introduction_parcours_base',version:'1.0.0'},
    tests:[
      {id:'test_alpha',version:'1.0.0'},
      {id:'test_beta',version:'1.0.0'},
      {id:'test_gamma',version:'1.0.0'}
    ],
    fin:{id:'fin_parcours',version:'1.0.0'}
  }
};
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
ipcMain.handle('kaloneo-library:selected-runtime',()=>({ok:false,error:'Aucun runtime candidat dans ce smoke Builder.'}));
ipcMain.handle('kaloneo-library:list-tests',()=>({ok:true,tests:library}));
ipcMain.handle('kaloneo-library:list-mask-screens',()=>({ok:true,maskScreens:masks}));
ipcMain.handle('kaloneo-library:get-mask-screen',(_e,ref)=>{
  const meta=masks.find(x=>x.id===(ref?.id||'kaloneo-default')&&x.version===(ref?.version||'1.0.0'))||masks[0];
  return {ok:true,maskScreen:{...meta,format:'kaloneo-mask-screen',content:{text:meta.name,image:''}}};
});
ipcMain.handle('kaloneo-library:list-parcours',()=>({ok:true,parcours:saved}));
ipcMain.handle('kaloneo-library:get-parcours',(_e,id)=>{
  const value=savedDefinitions[String(id||'')];
  return value?{ok:true,parcours:JSON.parse(JSON.stringify(value))}:{ok:false,error:'Parcours introuvable.'};
});
ipcMain.handle('kaloneo-library:save-parcours',(_e,payload)=>{
  const editingId=String(payload?.id||'');
  const key=String(payload?.name||'').trim().toLocaleLowerCase('fr-FR');
  if(saved.some(x=>String(x.id)!==editingId&&String(x.name||'').trim().toLocaleLowerCase('fr-FR')===key)) {
    return {ok:false,error:'Un parcours portant ce nom existe déjà.'};
  }
  if(editingId==='parcours-de-base') return {ok:false,error:'Le parcours fourni est protégé.'};

  lastSavedPayload=JSON.parse(JSON.stringify(payload||{}));
  const id=editingId||'parcours-smoke';
  const value={
    format:'kaloneo-parcours',schemaVersion:2,id,
    name:String(payload.name||''),creator:String(payload.creator||''),
    systemProvided:false,
    maskScreen:payload.maskScreen,
    introduction:payload.introduction,
    tests:Array.isArray(payload.tests)?payload.tests:[],
    fin:payload.fin
  };
  savedDefinitions[id]=JSON.parse(JSON.stringify(value));
  const item={
    id,name:value.name,creator:value.creator,systemProvided:false,
    testCount:value.tests.length,maskScreen:value.maskScreen,
    maskScreenMeta:{name:(masks.find(x=>x.id===value.maskScreen?.id)?.name)||'KALONÉO'}
  };
  const index=saved.findIndex(x=>x.id===id);
  if(index>=0)saved[index]=item;else saved.push(item);
  return {ok:true,updated:Boolean(editingId),parcours:value};
});

const timeout=setTimeout(()=>fail('délai global dépassé'),45000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function pointerDrag(win, sourceSelector, targetSelector) {
  const points=await win.webContents.executeJavaScript(`(()=>{
    const source=document.querySelector(${JSON.stringify(sourceSelector)});
    const target=document.querySelector(${JSON.stringify(targetSelector)});
    if(!source||!target) return null;
    const centerInScroller=(element,scroller)=>{
      if(!element||!scroller)return;
      const er=element.getBoundingClientRect();
      const sr=scroller.getBoundingClientRect();
      const delta=(er.top+er.height/2)-(sr.top+sr.height/2);
      scroller.scrollTop += delta;
    };
    const libScroller=source.closest('.library-sections');
    if(libScroller) {
      centerInScroller(source,libScroller);
    } else if(source.closest('.sequence-scroll') && target.closest('.library-panel')) {
      centerInScroller(source,source.closest('.sequence-scroll'));
    } else {
      const sourceScroller=source.closest('.sequence-scroll');
      const targetScroller=target.closest('.sequence-scroll');
      if(sourceScroller && sourceScroller===targetScroller) {
        const sr=sourceScroller.getBoundingClientRect();
        const ar=source.getBoundingClientRect();
        const br=target.getBoundingClientRect();
        const scroll=sourceScroller.scrollTop;
        const aTop=ar.top-sr.top+scroll;
        const bTop=br.top-sr.top+scroll;
        const minTop=Math.min(aTop,bTop);
        const maxBottom=Math.max(aTop+ar.height,bTop+br.height);
        const span=maxBottom-minTop;
        if(span<=sourceScroller.clientHeight-20) {
          sourceScroller.scrollTop=Math.max(0,minTop-10);
        } else {
          centerInScroller(source,sourceScroller);
        }
      }
    }
    window.__sebDragTrace={down:0,move:0,up:0,downTarget:'',moveTarget:'',upTarget:''};
    if(!window.__sebDragTraceInstalled){
      window.__sebDragTraceInstalled=true;
      document.addEventListener('mousedown',e=>{const t=window.__sebDragTrace;if(t){t.down++;t.downTarget=(e.target.id||e.target.className||e.target.tagName||'').toString();}},true);
      document.addEventListener('mousemove',e=>{const t=window.__sebDragTrace;if(t){t.move++;t.moveTarget=(e.target.id||e.target.className||e.target.tagName||'').toString();}},true);
      document.addEventListener('mouseup',e=>{const t=window.__sebDragTrace;if(t){t.up++;t.upTarget=(e.target.id||e.target.className||e.target.tagName||'').toString();}},true);
    }
    const a=source.getBoundingClientRect();
    const b=target.getBoundingClientRect();
    const sourceClip=source.closest('.library-sections,.sequence-scroll')?.getBoundingClientRect()||a;
    const visibleLeft=Math.max(a.left,sourceClip.left)+6;
    const visibleRight=Math.min(a.right,sourceClip.right)-6;
    const visibleTop=Math.max(a.top,sourceClip.top)+6;
    const visibleBottom=Math.min(a.bottom,sourceClip.bottom)-6;
    const sx=Math.round(Math.max(visibleLeft,Math.min(visibleRight,a.left+a.width/2)));
    const sy=Math.round(Math.max(visibleTop,Math.min(visibleBottom,a.top+Math.min(a.height/2,22))));
    const targetClip=target.closest('.library-sections,.sequence-scroll')?.getBoundingClientRect()||b;
    const targetLeft=Math.max(b.left,targetClip.left)+6;
    const targetRight=Math.min(b.right,targetClip.right)-6;
    const targetTop=Math.max(b.top,targetClip.top)+6;
    const targetBottom=Math.min(b.bottom,targetClip.bottom)-6;
    const tx=Math.round(Math.max(targetLeft,Math.min(targetRight,b.left+b.width/2)));
    const ty=Math.round(Math.max(targetTop,Math.min(targetBottom,b.top+b.height/2)));
    const describe=(n)=>n?{id:n.id||'',className:String(n.className||''),tag:n.tagName||''}:null;
    return {sx,sy,tx,ty,sourceHit:describe(document.elementFromPoint(sx,sy)),targetHit:describe(document.elementFromPoint(tx,ty))};
  })()`);
  if(!points) return {ok:false,reason:'élément absent'};

  const send=(type,x,y,extra={})=>win.webContents.sendInputEvent({type,x,y,button:'left',...extra});
  send('mouseDown',points.sx,points.sy,{clickCount:1});
  await wait(55);
  send('mouseMove',points.sx+12,points.sy+8,{movementX:12,movementY:8});
  await wait(55);
  const midX=Math.round((points.sx+points.tx)/2);
  const midY=Math.round((points.sy+points.ty)/2);
  send('mouseMove',midX,midY,{movementX:midX-points.sx,movementY:midY-points.sy});
  await wait(65);
  send('mouseMove',points.tx,points.ty,{movementX:points.tx-midX,movementY:points.ty-midY});
  await wait(80);
  send('mouseUp',points.tx,points.ty,{clickCount:1});
  await wait(100);
  const trace=await win.webContents.executeJavaScript('window.__sebDragTrace');
  return {ok:true,from:[points.sx,points.sy],to:[points.tx,points.ty],sourceHit:points.sourceHit,targetHit:points.targetHit,trace};
}

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..'),web=path.join(root,'app','web'),target=path.join(web,'admin-parcours-builder.html');
  if(!fs.existsSync(target)) return fail('admin-parcours-builder.html absent de app/web');
  const win=new BrowserWindow({show:true,width:1366,height:768,webPreferences:{preload:path.join(root,'src','preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}});
  win.webContents.on('preload-error',(_e,p,error)=>fail('erreur preload '+String(p||''),{error:String(error?.stack||error)}));

  try{
    await win.loadFile(target);
    win.show();
    win.focus();
    await wait(900);

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
        closeLabel:String(document.getElementById('back-tests-parcours')?.textContent||'').trim(),
        libraryCount:document.querySelectorAll('.library-card').length,
        mask:String(document.querySelector('#mask-slot .special-card strong')?.textContent||'').trim(),
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
    if(initial.title!=='Création de parcours'||initial.closeLabel!=='Fermer'||initial.libraryCount!==5||initial.mask!=='KALONÉO'||!/Introduction/.test(initial.intro)||initial.fin!=='Fin du parcours'||initial.savedCount!==1||
       initial.bodyOverflow!=='hidden'||initial.scrolls.some(v=>v!=='auto')||!initial.saveInTop||initial.saveShadow!=='none'||initial.finGap<12||
       !['none','absent'].includes(initial.privacyDisplay)) return fail('état R2 initial incorrect',initial);

    // L’écran de masquage est une configuration hors parcours et peut remplacer KALONÉO.
    await win.webContents.executeJavaScript(`(()=>{
      const c=[...document.querySelectorAll('.library-card')].find(x=>x.querySelector('.card-title')?.textContent==='Masque Smoke');
      c?.querySelector('.card-add')?.click();
      return true;
    })()`);
    await wait(100);
    const maskSelection=await win.webContents.executeJavaScript(`String(document.querySelector('#mask-slot .special-card strong')?.textContent||'').trim()`);
    if(maskSelection!=='Masque Smoke')return fail('sélection écran de masquage incorrecte',{maskSelection});

    // Boutons Ajouter / Retirer restent fonctionnels.
    await win.webContents.executeJavaScript(`(()=>{const c=[...document.querySelectorAll('.library-card')].find(x=>x.querySelector('.card-title')?.textContent==='Test Alpha');c?.querySelector('.card-add')?.click();return true;})()`);
    await wait(100);
    let stateUi=await win.webContents.executeJavaScript(`({sequence:document.querySelectorAll('.sequence-card').length,library:document.querySelectorAll('.library-card').length})`);
    if(stateUi.sequence!==1||stateUi.library!==4)return fail('Ajouter incorrect',stateUi);
    await win.webContents.executeJavaScript(`document.querySelector('.sequence-card .remove-test').click();true`);await wait(100);
    stateUi=await win.webContents.executeJavaScript(`({sequence:document.querySelectorAll('.sequence-card').length,library:document.querySelectorAll('.library-card').length})`);
    if(stateUi.sequence!==0||stateUi.library!==5)return fail('Retirer incorrect',stateUi);

    // Pointer drag réel Bibliothèque -> Parcours.
    let drag=await pointerDrag(win,'.library-card[data-id="test_gamma"]','#tests-dropzone');await wait(140);
    let afterPointer=await win.webContents.executeJavaScript(`({titles:[...document.querySelectorAll('.sequence-title')].map(x=>x.textContent.trim()),library:document.querySelectorAll('.library-card').length})`);
    if(!drag.ok||JSON.stringify(afterPointer.titles)!==JSON.stringify(['Test Gamma'])||afterPointer.library!==4)return fail('drag souris Bibliothèque -> Parcours incorrect',{drag,afterPointer});

    // Pointer drag réel Parcours -> Bibliothèque.
    drag=await pointerDrag(win,'.sequence-card[data-test-id="test_gamma"]','.library-panel');await wait(140);
    afterPointer=await win.webContents.executeJavaScript(`({sequence:document.querySelectorAll('.sequence-card').length,library:document.querySelectorAll('.library-card').length,gamma:!![...document.querySelectorAll('.library-card')].find(x=>x.dataset.id==='test_gamma')})`);
    if(!drag.ok||afterPointer.sequence!==0||afterPointer.library!==5||!afterPointer.gamma)return fail('drag souris Parcours -> Bibliothèque incorrect',{drag,afterPointer});

    // Construire trois tests puis réordonner par vrai drag souris.
    await win.webContents.executeJavaScript(`(()=>{
      const scroller=document.querySelector('.sequence-scroll');
      if(scroller) scroller.scrollTop=0;
      const add=t=>[...document.querySelectorAll('.library-card')].find(c=>c.querySelector('.card-title')?.textContent===t)?.querySelector('.card-add')?.click();
      add('Test Alpha');add('Test Bêta');add('Test Gamma');return true;
    })()`);await wait(120);
    drag=await pointerDrag(win,'.sequence-card[data-test-id="test_gamma"]','.sequence-card[data-test-id="test_alpha"]');await wait(140);
    const reordered=await win.webContents.executeJavaScript(`[...document.querySelectorAll('.sequence-title')].map(x=>x.textContent.trim())`);
    if(!drag.ok||reordered.length!==3||reordered.indexOf('Test Gamma')<0||reordered.indexOf('Test Gamma')>=2||
       JSON.stringify(reordered)===JSON.stringify(['Test Alpha','Test Bêta','Test Gamma'])) {
      return fail('réordonnancement souris incorrect',{drag,reordered});
    }

    // Enregistrement + persistance + nom dupliqué.
    await win.webContents.executeJavaScript(`(()=>{document.getElementById('parcours-name').value='Parcours long';document.getElementById('parcours-creator').value='Créateur smoke';document.getElementById('save-parcours').click();return true;})()`);
    await wait(220);
    const savedUi=await win.webContents.executeJavaScript(`({status:document.getElementById('builder-status').textContent.trim(),saved:[...document.querySelectorAll('.saved-card strong')].map(x=>x.textContent.trim()),creators:[...document.querySelectorAll('.saved-card span:first-of-type')].map(x=>x.textContent.trim())})`);
    if(!lastSavedPayload||lastSavedPayload.maskScreen?.id!=='masque-smoke'||lastSavedPayload.tests?.length!==3||new Set(lastSavedPayload.tests.map(x=>x.id)).size!==3||!/enregistré/i.test(savedUi.status)||!savedUi.saved.includes('Parcours long'))return fail('enregistrement incorrect',{lastSavedPayload,savedUi});

    await win.reload();await wait(750);
    const reloaded=await win.webContents.executeJavaScript(`({saved:[...document.querySelectorAll('.saved-card strong')].map(x=>x.textContent.trim()),creators:[...document.querySelectorAll('.saved-card span:first-of-type')].map(x=>x.textContent.trim()),openButtons:document.querySelectorAll('.saved-open').length})`);
    if(!reloaded.saved.includes('Parcours long')||!reloaded.creators.some(x=>/Créateur smoke/.test(x))||reloaded.openButtons<2)return fail('persistance / ouverture incorrecte',reloaded);

    // Ouvrir le parcours enregistré et retrouver exactement son contenu.
    await win.webContents.executeJavaScript(`(()=>{
      const card=[...document.querySelectorAll('.saved-card')].find(x=>x.querySelector('strong')?.textContent==='Parcours long');
      card?.querySelector('.saved-open')?.click();
      return true;
    })()`);
    await wait(250);
    const opened=await win.webContents.executeJavaScript(`(()=>({
      title:document.querySelector('.page-topbar h1')?.textContent.trim()||'',
      name:document.getElementById('parcours-name')?.value||'',
      creator:document.getElementById('parcours-creator')?.value||'',
      mask:document.querySelector('#mask-slot .special-card strong')?.textContent.trim()||'',
      tests:[...document.querySelectorAll('.sequence-title')].map(x=>x.textContent.trim()),
      saveLabel:document.getElementById('save-parcours')?.textContent.trim()||''
    }))()`);
    if(opened.title!=='Modification de parcours'||opened.name!=='Parcours long'||opened.creator!=='Créateur smoke'||
       opened.mask!=='Masque Smoke'||JSON.stringify(opened.tests)!==JSON.stringify(reordered)||
       opened.saveLabel!=='Enregistrer les modifications')return fail('réouverture du parcours incorrecte',{opened,reordered});

    // Modifier puis sauvegarder le même parcours.
    await win.webContents.executeJavaScript(`(()=>{
      document.getElementById('parcours-name').value='Parcours long modifié';
      document.querySelector('.sequence-card .remove-test')?.click();
      document.getElementById('save-parcours').click();
      return true;
    })()`);
    await wait(220);
    const updated=await win.webContents.executeJavaScript(`({status:document.getElementById('builder-status').textContent.trim(),sequence:document.querySelectorAll('.sequence-card').length,saved:[...document.querySelectorAll('.saved-card strong')].map(x=>x.textContent.trim())})`);
    if(!/mis à jour/i.test(updated.status)||updated.sequence!==2||!updated.saved.includes('Parcours long modifié')||savedDefinitions['parcours-smoke'].tests.length!==2) {
      return fail('modification du parcours incorrecte',{updated,definition:savedDefinitions['parcours-smoke']});
    }

    // Un nouveau parcours ne peut pas reprendre le même nom.
    await win.webContents.executeJavaScript(`(()=>{
      document.getElementById('new-parcours').click();
      document.getElementById('parcours-name').value='Parcours long modifié';
      document.getElementById('parcours-creator').value='Autre créateur';
      document.getElementById('save-parcours').click();
      return true;
    })()`);
    await wait(180);
    const duplicate=await win.webContents.executeJavaScript(`({status:document.getElementById('builder-status').textContent.trim(),sequence:document.querySelectorAll('.sequence-card').length})`);
    if(!/existe déjà/i.test(duplicate.status))return fail('nom dupliqué incorrect',duplicate);

    // Fermer protège les modifications non enregistrées et reste sur le Builder si l'Admin annule.
    const closeProtection=await win.webContents.executeJavaScript(`(()=>{
      window.__parcoursConfirmMessage='';
      window.confirm=message=>{window.__parcoursConfirmMessage=String(message||'');return false;};
      document.getElementById('parcours-name').value='Modification non enregistrée';
      const before=location.href;
      document.getElementById('back-tests-parcours').click();
      return {
        before,
        after:location.href,
        message:window.__parcoursConfirmMessage,
        label:String(document.getElementById('back-tests-parcours')?.textContent||'').trim()
      };
    })()`);
    await wait(80);
    if(closeProtection.label!=='Fermer'||closeProtection.after!==closeProtection.before||!/modifications non enregistrées/i.test(closeProtection.message)) {
      return fail('protection Fermer du Builder de parcours incorrecte',closeProtection);
    }

    console.log('KALONEO_PARCOURS_ELECTRON=OK');
    console.log(JSON.stringify({initial,afterPointer,reordered,savedUi,reloaded,opened,updated,duplicate,lastSavedPayload}));
    clearTimeout(timeout);win.destroy();app.exit(0);
  }catch(error){fail(String(error?.stack||error));}
});
