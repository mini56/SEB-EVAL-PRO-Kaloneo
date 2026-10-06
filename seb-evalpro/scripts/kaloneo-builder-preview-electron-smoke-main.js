const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, details) {
  console.error('KALONEO_BUILDER_PREVIEW_ELECTRON: FAIL — ' + message);
  if (details) console.error(JSON.stringify(details, null, 2));
  app.exit(2);
}

let state = {version:1,sessionStorage:{},localStorage:{},lastPage:'kaltest-pilot2.html',lastEvaluationPage:'kaltest-pilot2.html'};
let previewDefinition = null;
let savedLibraryDefinition = null;
let win = null;

ipcMain.on('app:edition-sync', event => {
  event.returnValue = {edition:'unified',canBilan:true,canAi:true,canImport:true,canExport:true};
});
ipcMain.on('state:load-sync', event => { event.returnValue = state; });
ipcMain.on('state:save-sync', (event,payload) => {
  state={...state,...(payload||{})};
  event.returnValue={ok:true,state};
});
ipcMain.on('candidate-catalog:workspace-load-sync', event => { event.returnValue={ok:false}; });
ipcMain.on('candidate-catalog:workspace-save-sync', event => { event.returnValue={ok:true}; });
ipcMain.on('candidate-catalog:results-workspace-load-sync', event => { event.returnValue={ok:false}; });

ipcMain.handle('state:save', (_event,payload)=>{state={...state,...(payload||{})};return {ok:true,state};});
ipcMain.handle('admin:status',()=>true);
ipcMain.handle('admin:verify',()=>true);
ipcMain.handle('admin:verify-password',()=>true);
ipcMain.handle('admin:lock',()=>true);
ipcMain.handle('candidate:active',()=>null);
ipcMain.handle('candidate:set-admin-export-context',()=>true);
ipcMain.handle('candidate-catalog:workspace-save',()=>({ok:true}));
ipcMain.handle('candidate-catalog:end-bilan',()=>true);
ipcMain.handle('admin:open-candidate-browser',()=>true);
ipcMain.handle('admin:return-candidate-browser',()=>true);
ipcMain.handle('admin:open-tests-parcours',()=>true);
ipcMain.handle('admin:close-tests-parcours',()=>true);
ipcMain.handle('admin:open-bilan',()=>true);
ipcMain.handle('admin:open-candidate-results',()=>true);
ipcMain.handle('admin:return-evaluation',()=>true);
ipcMain.handle('admin:close-session',()=>true);
ipcMain.handle('admin:quit-application',()=>true);
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
ipcMain.handle('kaloneo-library:list-tests',()=>({ok:true,tests:[]}));
ipcMain.handle('kaloneo-library:save-test',(_e,payload)=>{
  savedLibraryDefinition=JSON.parse(JSON.stringify(payload?.definition||null));
  return {ok:true,replaced:false,test:{id:savedLibraryDefinition?.id,version:savedLibraryDefinition?.version,title:savedLibraryDefinition?.title}};
});
ipcMain.handle('kaloneo-library:list-mask-screens',()=>({ok:true,maskScreens:[{id:'kaloneo-default',version:'1.0.0',name:'KALONÉO',systemProvided:true,hasText:true,hasImage:false}]}));
ipcMain.handle('kaloneo-library:get-mask-screen',()=>({ok:true,maskScreen:{id:'kaloneo-default',version:'1.0.0',name:'KALONÉO',content:{text:'KALONÉO',image:''}}}));
ipcMain.handle('kaloneo-library:list-parcours',()=>({ok:true,parcours:[]}));
ipcMain.handle('kaloneo-library:save-parcours',()=>({ok:true}));

const timeout=setTimeout(()=>fail('délai global dépassé'),45000);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..');
  const web=path.join(root,'app','web');
  const builder=path.join(web,'kaloneo-builder','test-builder.html');
  const preview=path.join(web,'kaloneo-builder','test-preview.html');
  if(!fs.existsSync(builder)||!fs.existsSync(preview)) return fail('Builder ou page aperçu absent de app/web');

  ipcMain.handle('kaloneo-builder:open-preview',async(_event,definition)=>{
    previewDefinition=JSON.parse(JSON.stringify(definition||{}));
    await win.loadFile(preview);
    return {ok:true};
  });
  ipcMain.handle('kaloneo-builder:get-preview',()=>previewDefinition?{ok:true,definition:previewDefinition}:{ok:false,error:'absent'});
  ipcMain.handle('kaloneo-builder:close-preview',async()=>{
    await win.loadFile(builder,{query:{resume:'preview'}});
    return true;
  });

  win=new BrowserWindow({
    show:false,width:1366,height:768,
    webPreferences:{
      preload:path.join(root,'src','preload.js'),
      contextIsolation:true,nodeIntegration:false,sandbox:false
    }
  });
  win.webContents.on('preload-error',(_event,badPath,error)=>fail('erreur preload '+String(badPath||''),{error:String(error&&error.stack||error)}));

  try{
    await win.loadFile(builder);
    await wait(900);

    const initial=await win.webContents.executeJavaScript(`(()=>{
      const title=document.getElementById('test-title');
      const editor=document.querySelector('.builder-editor');
      return {
        title:title?.value||'',
        titleDisabled:!!title?.disabled,
        titleReadOnly:!!title?.readOnly,
        activeId:document.activeElement?.id||'',
        bodyOverflow:getComputedStyle(document.body).overflowY,
        editorOverflow:getComputedStyle(editor).overflowY,
        pageScroll:document.documentElement.scrollHeight>window.innerHeight+2,
        editorCanScroll:editor.scrollHeight>=editor.clientHeight
      };
    })()`);
    if(initial.title!==''||initial.titleDisabled||initial.titleReadOnly||initial.activeId!=='test-title'||
       initial.bodyOverflow!=='hidden'||!['auto','scroll'].includes(initial.editorOverflow)||initial.pageScroll) {
      return fail('entrée R3 du Builder incorrecte',initial);
    }

    const newTest=await win.webContents.executeJavaScript(`(()=>{
      window.confirm=()=>true;
      const title=document.getElementById('test-title');
      title.value='Ancien brouillon';
      title.dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('new-test').click();
      return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const current=document.getElementById('test-title');
        current.value='Saisie immédiate';
        current.dispatchEvent(new Event('input',{bubbles:true}));
        resolve({
          value:current.value,
          disabled:current.disabled,
          readOnly:current.readOnly,
          activeId:document.activeElement?.id||''
        });
      })));
    })()`);
    if(newTest.value!=='Saisie immédiate'||newTest.disabled||newTest.readOnly||newTest.activeId!=='test-title') {
      return fail('Nouveau test non saisissable immédiatement',newTest);
    }

    const setup=await win.webContents.executeJavaScript(`(async()=>{
      document.getElementById('test-title').value='Aperçu Electron Smoke';
      document.getElementById('test-title').dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('test-scenario').value='Scénario plein écran';
      document.getElementById('test-scenario').dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('test-instruction').value='Consigne plein écran';
      document.getElementById('test-instruction').dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('calculator-compatible').checked=true;
      document.getElementById('calculator-compatible').dispatchEvent(new Event('change',{bubbles:true}));
      document.getElementById('calculator-brand').value='KALONÉO';
      document.getElementById('calculator-brand').dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('chrono-enabled').checked=true;
      document.getElementById('chrono-enabled').dispatchEvent(new Event('change',{bubbles:true}));

      const type=document.querySelector('.exercise-block .block-type');
      type.value='image';
      type.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,80));
      const mediaInput=document.querySelector('.exercise-block input[type="file"]');
      const svg='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="340"><rect width="320" height="340" fill="#dceff5"/><circle cx="160" cy="170" r="80" fill="#f9b233"/></svg>';
      const mediaFile=new File([svg],'image-test-r3.svg',{type:'image/svg+xml'});
      const dt=new DataTransfer();
      dt.items.add(mediaFile);
      mediaInput.files=dt.files;
      mediaInput.dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,180));
      document.getElementById('refresh-preview').click();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      document.getElementById('save-draft').click();
      await new Promise(resolve=>setTimeout(resolve,180));
      const smallImg=document.querySelector('.preview-media');
      const smallBlock=smallImg?.closest('.preview-media-block');
      const ir=smallImg?.getBoundingClientRect();
      const br=smallBlock?.getBoundingClientRect();
      return {
        button:String(document.getElementById('open-electron-preview')?.textContent||'').trim(),
        title:document.getElementById('test-title').value,
        calculatorBrand:document.getElementById('calculator-brand')?.value||'',
        calculatorOptionsHidden:document.getElementById('calculator-options')?.hidden,
        libraryStatus:String(document.getElementById('draft-status')?.textContent||'').trim(),
        imagePresent:!!smallImg,
        smallImageFits:!!(ir&&br&&ir.width<=br.width+1&&ir.height<=br.height+1),
        smallImageSize:ir?{width:Math.round(ir.width),height:Math.round(ir.height)}:null,
        smallBlockSize:br?{width:Math.round(br.width),height:Math.round(br.height)}:null
      };
    })()`);
    if(!/vraie page/i.test(setup.button)||setup.title!=='Aperçu Electron Smoke'||setup.calculatorBrand!=='KALONÉO'||setup.calculatorOptionsHidden||
       !savedLibraryDefinition||savedLibraryDefinition.title!=='Aperçu Electron Smoke'||! /bibliothèque/i.test(setup.libraryStatus)||
       !setup.imagePresent||!setup.smallImageFits) return fail('bouton, saisie ou image Builder incorrecte',setup);

    await win.webContents.executeJavaScript(`document.getElementById('open-electron-preview').click();true`);
    for(let i=0;i<30;i++){
      await wait(120);
      const p=await win.webContents.executeJavaScript('location.pathname');
      if(/test-preview\.html$/i.test(p)) break;
    }
    await wait(500);

    const shown=await win.webContents.executeJavaScript(`(()=>({
      path:location.pathname,
      title:String(document.querySelector('.kb-heading h1')?.textContent||'').trim(),
      scenario:String(document.querySelectorAll('.kb-context p')[0]?.textContent||'').trim(),
      instruction:String(document.querySelectorAll('.kb-context p')[1]?.textContent||'').trim(),
      close:String(document.querySelector('.close-preview')?.textContent||'').trim(),
      next:String(document.querySelector('.kb-nav-btn.next')?.textContent||'').trim(),
      calculator:String(document.querySelector('.kb-footer-center button')?.textContent||'').trim(),
      chrono:String(document.querySelector('.kb-chrono-time')?.textContent||'').trim(),
      privacy:(()=>{const p=document.getElementById('seb-evalpro-privacy-toggle');return p?getComputedStyle(p).display:'absent';})(),
      calculatorButtonShadow:getComputedStyle(document.querySelector('.kb-footer-center button')).boxShadow,
      media:(()=>{
        const img=document.querySelector('.kb-media');
        const block=img?.closest('.kb-media-block');
        const workspace=document.querySelector('.kb-workspace');
        const ir=img?.getBoundingClientRect();
        const br=block?.getBoundingClientRect();
        return {
          present:!!img,
          fits:!!(ir&&br&&ir.width<=br.width+1&&ir.height<=br.height+1),
          image:ir?{width:Math.round(ir.width),height:Math.round(ir.height)}:null,
          block:br?{width:Math.round(br.width),height:Math.round(br.height)}:null,
          workspaceScroll:workspace?workspace.scrollHeight>workspace.clientHeight+2:false
        };
      })()
    }))()`);

    if(!/test-preview\.html$/i.test(shown.path)||
       shown.title!=='Aperçu Electron Smoke'||
       shown.scenario!=='Scénario plein écran'||
       shown.instruction!=='Consigne plein écran'||
       shown.close!=='Fermer l’aperçu'||
       shown.next!=='Suivant'||
       shown.calculator!=='Ouvrir la calculatrice'||
       shown.chrono!=='00:00'||
       !['none','absent'].includes(shown.privacy)||
       !shown.media.present||!shown.media.fits||shown.media.workspaceScroll) {
      return fail('rendu plein écran incorrect',shown);
    }

    await win.webContents.executeJavaScript(`document.querySelector('.kb-footer-center button').click();true`);
    await wait(130);
    const calcBefore=await win.webContents.executeJavaScript(`(()=>{
      const panel=document.getElementById('calc-container');
      const bar=panel?.querySelector('.seb-calc-dragbar');
      const brand=panel?.querySelector('.seb-calc-brand');
      const labels=[...panel?.querySelectorAll('.calc-btn')||[]].map(x=>String(x.textContent||'').trim());
      if(!panel||!bar||getComputedStyle(panel).display==='none') return {open:false};
      const rect=panel.getBoundingClientRect();
      const barRect=bar.getBoundingClientRect();
      return {
        open:true,
        brand:String(brand?.textContent||'').trim(),
        dragLabel:String(bar?.querySelector('span')?.textContent||'').trim(),
        hasX:labels.includes('x'),
        hasStar:labels.includes('*'),
        left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,
        x:Math.round(barRect.left+30),y:Math.round(barRect.top+Math.min(18,barRect.height/2)),
        viewport:[innerWidth,innerHeight]
      };
    })()`);
    if(!calcBefore.open||calcBefore.brand!=='KALONÉO'||calcBefore.dragLabel!=='Calculatrice'||!calcBefore.hasX||calcBefore.hasStar){
      return fail('calculatrice commune de l’aperçu incorrecte avant déplacement',calcBefore);
    }

    const dragTrace=await win.webContents.executeJavaScript(`(()=>{
      const bar=document.querySelector('#calc-container .seb-calc-dragbar');
      if(!bar)return {ok:false};
      const r=bar.getBoundingClientRect();
      const x=r.left+30,y=r.top+Math.min(18,r.height/2);
      const fire=(type,cx,cy,buttons)=>bar.dispatchEvent(new PointerEvent(type,{
        bubbles:true,cancelable:true,pointerId:41,pointerType:'mouse',isPrimary:true,
        button:type==='pointermove'?-1:0,buttons,clientX:cx,clientY:cy
      }));
      fire('pointerdown',x,y,1);
      fire('pointermove',x+35,y+22,1);
      fire('pointermove',x+70,y+45,1);
      fire('pointerup',x+70,y+45,0);
      return {ok:true};
    })()`,true);
    if(!dragTrace.ok)return fail('barre de déplacement de la calculatrice absente',dragTrace);
    await wait(120);

    const calcOpen=await win.webContents.executeJavaScript(`(()=>{
      const panel=document.getElementById('calc-container');
      if(!panel||getComputedStyle(panel).display==='none') return {open:false};
      const after=panel.getBoundingClientRect();
      return {
        open:true,
        moved:Math.abs(after.left-${calcBefore.left})>20||Math.abs(after.top-${calcBefore.top})>20,
        inside:after.left>=0&&after.top>=0&&after.right<=innerWidth&&after.bottom<=innerHeight,
        left:after.left,top:after.top
      };
    })()`);
    if(!calcOpen.open||!calcOpen.moved||!calcOpen.inside){
      return fail('déplacement réel souris de la calculatrice incorrect', {calcBefore,calcOpen});
    }

    await win.webContents.executeJavaScript(`document.querySelector('.close-preview').click();true`);
    for(let i=0;i<30;i++){
      await wait(120);
      const p=await win.webContents.executeJavaScript('location.pathname');
      if(/test-builder\.html$/i.test(p)) break;
    }
    await wait(500);

    const returned=await win.webContents.executeJavaScript(`(()=>({
      path:location.pathname,
      title:document.getElementById('test-title')?.value||'',
      scenario:document.getElementById('test-scenario')?.value||'',
      instruction:document.getElementById('test-instruction')?.value||'',
      calculatorBrand:document.getElementById('calculator-brand')?.value||'',
      previewButton:String(document.getElementById('open-electron-preview')?.textContent||'').trim()
    }))()`);

    if(!/test-builder\.html$/i.test(returned.path)||
       returned.title!=='Aperçu Electron Smoke'||
       returned.scenario!=='Scénario plein écran'||
       returned.instruction!=='Consigne plein écran'||
       returned.calculatorBrand!=='KALONÉO'||
       !/vraie page/i.test(returned.previewButton)) {
      return fail('retour au Builder avec brouillon incorrect',returned);
    }

    console.log('KALONEO_BUILDER_PREVIEW_ELECTRON=OK');
    console.log(JSON.stringify({setup,shown,returned,definitionId:previewDefinition&&previewDefinition.id}));
    clearTimeout(timeout);win.destroy();app.exit(0);
  }catch(error){
    fail(String(error&&error.stack||error));
  }
});
