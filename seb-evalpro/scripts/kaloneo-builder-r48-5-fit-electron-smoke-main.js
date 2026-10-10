'use strict';
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const web=path.join(root,'app','web');
const definition=JSON.parse(fs.readFileSync(path.join(root,'r48-demo','planning-restaurant-builder-r48.json'),'utf8'));
let saved=0, replaySaved=0, closed=0;
const realRuntime={ok:true,runtime:{
 id:'kaloneo-builder-preview-only',title:'Restaurant aperçu',builderPreview:true,
 launchOptions:{showCorrectionsDuringParcours:false},introduction:null,tests:[definition],fin:null
}};
const ok={ok:true};
ipcMain.on('app:edition-sync',e=>e.returnValue={edition:'unified',canBilan:true,canAi:true,canImport:true,canExport:true});
ipcMain.on('state:load-sync',e=>e.returnValue={version:1,sessionStorage:{},localStorage:{},lastPage:'kaltest-pilot2.html'});
ipcMain.on('state:save-sync',e=>{saved++;e.returnValue=ok;});
ipcMain.on('candidate-catalog:workspace-load-sync',e=>e.returnValue={ok:false});
ipcMain.on('candidate-catalog:workspace-save-sync',e=>e.returnValue=ok);
ipcMain.on('candidate-catalog:results-workspace-load-sync',e=>e.returnValue={ok:false});
ipcMain.on('kaloneo-library:selected-runtime-sync',e=>e.returnValue=realRuntime);
ipcMain.handle('kaloneo-library:selected-runtime',()=>realRuntime);
ipcMain.handle('kaloneo-builder:close-preview',()=>{closed++;return true;});
ipcMain.handle('admin:status',()=>true);
ipcMain.handle('admin:verify',()=>true);
ipcMain.handle('admin:lock',()=>true);
ipcMain.handle('candidate:active',()=>null);
ipcMain.handle('state:save',()=>{saved++;return ok;});
ipcMain.handle('replay:capture-page',()=>{replaySaved++;return ok;});
ipcMain.handle('replay:list',()=>[]);
ipcMain.handle('bilan-history:list',()=>[]);
ipcMain.handle('candidate-catalog:list',()=>[]);
ipcMain.handle('candidate-catalog:sync',()=>ok);
ipcMain.handle('candidate-catalog:detail',()=>({ok:false}));
ipcMain.handle('candidate-catalog:workspace-save',()=>ok);
ipcMain.handle('candidate-catalog:end-bilan',()=>ok);
ipcMain.handle('ai:status',()=>({available:false}));
ipcMain.handle('ai:cancel-current',()=>ok);
ipcMain.handle('kaloneo-library:get-mask-screen',()=>({ok:false}));
ipcMain.handle('kaloneo-library:list-tests',()=>({ok:true,tests:[]}));
ipcMain.handle('kaloneo-library:list-mask-screens',()=>({ok:true,maskScreens:[]}));
const wait=t=>new Promise(resolve=>setTimeout(resolve,t));
const timeout=setTimeout(()=>{console.error('R48_5_REAL_PREVIEW: TIMEOUT');app.exit(2);},45000);
const fail=(error)=>{console.error('R48_5_REAL_PREVIEW: FAIL',error?.stack||String(error));app.exit(2);};
app.whenReady().then(async()=>{
 try{
  const win=new BrowserWindow({show:true,width:1366,height:768,webPreferences:{preload:path.join(root,'src','preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:false}});
  win.webContents.on('preload-error',(_e,p,error)=>fail(new Error('Preload '+p+': '+error)));
  await win.loadFile(path.join(web,'kaltest-pilot2.html'),{query:{kaloneoPreview:'1'}});
  await wait(1100);
  const result=await win.webContents.executeJavaScript(`(()=>{
    const target=document.getElementById('kaltest-content');
    const selectors=[...target.querySelectorAll('select')];
    const photos=[...target.querySelectorAll('img.seb-media-image')];
    const bg=[...target.querySelectorAll('*')].filter(el=>getComputedStyle(el).backgroundImage.includes('r48-plateau-repas'));
    return {
      realCandidateEngine:Boolean(window.sebKaltestPilot2),
      testId:document.body.dataset.sebKaltestId,
      preview:document.body.classList.contains('kaloneo-real-candidate-preview'),
      title:document.getElementById('kaltest-title')?.textContent,
      phase:window.sebKaltestPilot2?.state?.phase,
      selectCount:selectors.length,
      selectValues:selectors.map(el=>el.value),
      photos:photos.map(el=>({src:el.getAttribute('src'),loaded:el.complete&&el.naturalWidth>0})),
      backgroundCount:bg.length,
      closeLabel:document.getElementById('kaltest-next')?.textContent,
      visible:document.getElementById('page-exercise')?.classList.contains('visible')
    };
  })()`);
  const fit=await win.webContents.executeJavaScript(`(()=>{
    const zone=document.querySelector('.kaltest-builder-runtime-zone');
    const table=document.querySelector('.kaltest-builder-grid');
    const guard=document.querySelector('.kaltest-builder-background-text-guard');
    const guidance=[...document.querySelectorAll('.kaltest-builder-content-item')]
      .find(el=>el.textContent.includes('Jacqueline'));
    const measure=node=>node?{
      width:node.getBoundingClientRect().width,
      height:node.getBoundingClientRect().height,
      clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,
      clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,
      left:node.getBoundingClientRect().left,
      right:node.getBoundingClientRect().right,
      bottom:node.getBoundingClientRect().bottom
    }:null;
    const finalText=[...guidance?.childNodes||[]].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.includes('Jacqueline'));
    let lastLineRects=[];
    if(finalText){
      const range=document.createRange();
      const at=finalText.textContent.indexOf('Jacqueline');
      range.setStart(finalText,Math.max(0,at));
      range.setEnd(finalText,finalText.textContent.length);
      lastLineRects=Array.from(range.getClientRects()).map(r=>({
        left:r.left,right:r.right,top:r.top,bottom:r.bottom
      }));
    }
    const headers=[...table?.querySelectorAll('thead th')||[]]
      .map(h=>({text:h.textContent,rect:measure(h)}));
    return {viewport:[innerWidth,innerHeight],
      zone:measure(zone),table:measure(table),guard:measure(guard),
      guidance:measure(guidance),headers,lastLineRects};
  })()`);
  console.log('R48_5_GEOMETRY',JSON.stringify(fit));
  assert.equal(fit.headers.length,6,'six planning columns must exist');
  assert.equal(fit.headers[5].text,'Vendredi','last column must be Vendredi');
  assert.ok(fit.headers[5].rect.right<=fit.zone.right+2,'Friday column must remain fully visible');
  assert.ok(fit.table.scrollWidth<=fit.table.clientWidth+2,'table must not scroll horizontally');
  assert.ok(fit.zone.scrollWidth<=fit.zone.clientWidth+2,'left column must not scroll horizontally');
  assert.ok(fit.guard?.height>90,'decorative text-exclusion area missing');
  assert.ok(fit.guidance.scrollHeight<=fit.guidance.clientHeight+3,'instructions overflow vertically');
  assert.ok(fit.lastLineRects.length>0,'last indication should remain visible');
  assert.ok(fit.lastLineRects.every(rect=>rect.bottom<=fit.guidance.bottom+1),'last indication clipped');
  assert.equal(result.realCandidateEngine,true);
  assert.equal(result.testId,definition.id);
  assert.equal(result.preview,true);
  assert.equal(result.phase,'exercise');
  assert.equal(result.visible,true);
  assert.equal(result.selectCount,15);
  assert.equal(result.photos.length,1);
  assert.equal(result.photos[0].loaded,true,'restaurant candidate image not loaded');
  assert.ok(result.backgroundCount>0,'plateau background missing');
  assert.ok(result.closeLabel.includes('Fermer l’aperçu'),'close button label missing');
  assert.equal(saved,0,'preview must not save candidate state');
  assert.equal(replaySaved,0,'preview must not capture candidate replay');
  await win.webContents.executeJavaScript("document.getElementById('kaltest-next').click()");
  await wait(180);
  assert.equal(closed,1,'close preview not wired');
  assert.equal(saved,0,'close preview must not save candidate state');
  console.log('R48_4_REAL_CANDIDATE_PREVIEW: OK',JSON.stringify({selects:result.selectCount,image:result.photos[0].src,background:result.backgroundCount,saved,closed}));
  clearTimeout(timeout);win.destroy();app.quit();
 }catch(e){fail(e);}
}).catch(fail);
