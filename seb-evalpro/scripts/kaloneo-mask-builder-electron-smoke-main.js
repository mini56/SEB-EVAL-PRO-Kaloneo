'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, details) {
  console.error('KALONEO_MASK_BUILDER_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state={version:1,sessionStorage:{},localStorage:{},lastPage:'kaltest-pilot2.html',lastEvaluationPage:'kaltest-pilot2.html'};
const masks=[
  {id:'kaloneo-default',version:'1.0.0',name:'KALONÉO',systemProvided:true,hasText:true,hasImage:false}
];
const maskDefinitions={
  'kaloneo-default@1.0.0':{id:'kaloneo-default',version:'1.0.0',name:'KALONÉO',systemProvided:true,content:{text:'KALONÉO\\nAu cœur d’un nouvel élan',image:''}}
};
let lastSaved=null;
let previewDraft=null;
let win=null;

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

ipcMain.handle('kaloneo-library:list-mask-screens',()=>({ok:true,maskScreens:masks}));
ipcMain.handle('kaloneo-library:get-mask-screen',(_e,ref)=>{
  const id=ref?.id||'kaloneo-default';
  const version=ref?.version||'1.0.0';
  const value=maskDefinitions[id+'@'+version]||maskDefinitions['kaloneo-default@1.0.0'];
  return {ok:true,maskScreen:value};
});
ipcMain.handle('kaloneo-library:save-mask-screen',(_e,payload)=>{
  lastSaved=JSON.parse(JSON.stringify(payload?.maskScreen||null));
  const meta={id:lastSaved.id,version:lastSaved.version,name:lastSaved.name,systemProvided:false,hasText:!!lastSaved.content?.text,hasImage:!!lastSaved.content?.image};
  const index=masks.findIndex(x=>x.id===meta.id&&x.version===meta.version);
  if(index>=0)masks[index]=meta;else masks.push(meta);
  maskDefinitions[meta.id+'@'+meta.version]={...lastSaved,systemProvided:false};
  return {ok:true,replaced:index>=0,maskScreen:meta};
});

ipcMain.handle('kaloneo-mask:open-preview',(_e,definition)=>{
  previewDraft=JSON.parse(JSON.stringify(definition||null));
  const target=path.join(__dirname,'..','app','web','admin-mask-preview.html');
  setTimeout(()=>{ if(win&&!win.isDestroyed()) win.loadFile(target); },0);
  return {ok:true};
});
ipcMain.handle('kaloneo-mask:get-preview',()=>previewDraft?{ok:true,definition:JSON.parse(JSON.stringify(previewDraft))}:{ok:false,error:'absent'});
ipcMain.handle('kaloneo-mask:consume-preview',()=>{
  if(!previewDraft)return {ok:false,error:'absent'};
  const definition=JSON.parse(JSON.stringify(previewDraft));
  previewDraft=null;
  return {ok:true,definition};
});
ipcMain.handle('kaloneo-mask:close-preview',()=>{
  const target=path.join(__dirname,'..','app','web','admin-mask-builder.html');
  setTimeout(()=>{ if(win&&!win.isDestroyed()) win.loadFile(target,{query:{resume:'preview'}}); },0);
  return true;
});

const timeout=setTimeout(()=>fail('délai global dépassé'),30000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..');
  const target=path.join(root,'app','web','admin-mask-builder.html');
  if(!fs.existsSync(target))return fail('admin-mask-builder.html absent de app/web');
  win=new BrowserWindow({show:true,width:1366,height:768,webPreferences:{preload:path.join(root,'src','preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}});
  try{
    await win.loadFile(target);
    await wait(650);
    const initial=await win.webContents.executeJavaScript(`(()=> {
      const rect=sel=>document.querySelector(sel)?.getBoundingClientRect()||null;
      const topbar=rect('.mask-topbar');
      const shell=rect('.mask-shell');
      const headings=[...document.querySelectorAll('.mask-library h2,.mask-editor h2,.mask-preview h2')].map(el=>{
        const r=el.getBoundingClientRect();
        return {text:el.textContent.trim(),top:r.top,bottom:r.bottom};
      });
      return {
        title:document.querySelector('.mask-topbar h1')?.textContent.trim(),
        count:document.querySelectorAll('.mask-item').length,
        first:document.querySelector('.mask-item strong')?.textContent.trim(),
        closeLabel:document.querySelector('.mask-close-preview')?.textContent.trim(),
        privacy:document.getElementById('seb-evalpro-privacy-toggle')?getComputedStyle(document.getElementById('seb-evalpro-privacy-toggle')).display:'absent',
        topbar:{top:topbar?.top,bottom:topbar?.bottom,height:topbar?.height},
        shell:{top:shell?.top,bottom:shell?.bottom,height:shell?.height},
        headings,
        viewport:window.innerHeight
      };
    })()`);
    const headingsVisible=initial.headings.length===3&&initial.headings.every(h=>h.top>=initial.topbar.bottom+2&&h.bottom<=initial.viewport);
    const shellVisible=initial.shell.top>=initial.topbar.bottom+6&&initial.shell.bottom<=initial.viewport+1;
    if(initial.title!=='Écrans de masquage'||initial.count!==1||initial.first!=='KALONÉO'||initial.closeLabel!=='Masquer l’écran d’accueil'||!['none','absent'].includes(initial.privacy)||!headingsVisible||!shellVisible)return fail('état initial / mise en page incorrecte',initial);

    await win.webContents.executeJavaScript(`(()=>{
      const set=(id,value)=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));};
      set('mask-name','Pause smoke');
      set('mask-text','Texte smoke');
      document.getElementById('save-mask').click();
      return true;
    })()`);
    await wait(260);
    const after=await win.webContents.executeJavaScript(`(()=>({
      status:document.getElementById('mask-status').textContent.trim(),
      count:document.querySelectorAll('.mask-item').length,
      preview:document.getElementById('mask-preview-text').textContent.trim(),
      id:document.getElementById('mask-id').value
    }))()`);
    if(!lastSaved||lastSaved.name!=='Pause smoke'||lastSaved.content?.text!=='Texte smoke'||after.count!==2||after.preview!=='Texte smoke'||!/enregistré/i.test(after.status))return fail('enregistrement texte incorrect',{lastSaved,after});

    // Vrai aperçu Electron, puis retour au brouillon sans perte.
    await win.webContents.executeJavaScript(`document.getElementById('open-real-mask-preview').click();true`);
    await wait(420);
    const realPreview=await win.webContents.executeJavaScript(`(()=>({
      title:document.title,
      text:document.getElementById('mask-preview-text')?.textContent.trim()||'',
      close:document.getElementById('mask-preview-close')?.textContent.trim()||'',
      imageHidden:document.getElementById('mask-preview-image')?.hidden
    }))()`);
    if(!/Aperçu écran de masquage/.test(realPreview.title)||realPreview.text!=='Texte smoke'||realPreview.close!=='Masquer l’écran d’accueil'||realPreview.imageHidden!==true) {
      return fail('vrai aperçu écran de masquage incorrect',realPreview);
    }

    await win.webContents.executeJavaScript(`document.getElementById('mask-preview-close').click();true`);
    await wait(420);
    const resumed=await win.webContents.executeJavaScript(`(()=>({
      page:document.title,
      name:document.getElementById('mask-name')?.value||'',
      text:document.getElementById('mask-text')?.value||'',
      status:document.getElementById('mask-status')?.textContent.trim()||''
    }))()`);
    if(!/Écrans de masquage/.test(resumed.page)||resumed.name!=='Pause smoke'||resumed.text!=='Texte smoke'||!/Retour de l’aperçu réel/.test(resumed.status)) {
      return fail('retour du vrai aperçu sans perte incorrect',resumed);
    }

    await win.webContents.executeJavaScript(`document.querySelector('.mask-item.system')?.click();true`);
    await wait(120);
    const protectedState=await win.webContents.executeJavaScript(`({disabled:document.getElementById('save-mask').disabled,status:document.getElementById('mask-status').textContent.trim()})`);
    if(!protectedState.disabled||!/protégé/i.test(protectedState.status))return fail('écran KALONÉO par défaut non protégé',protectedState);

    console.log('KALONEO_MASK_BUILDER_ELECTRON=OK');
    console.log(JSON.stringify({initial,after,realPreview,resumed,protectedState,lastSaved}));
    clearTimeout(timeout);win.destroy();app.exit(0);
  }catch(error){fail(String(error?.stack||error));}
});
