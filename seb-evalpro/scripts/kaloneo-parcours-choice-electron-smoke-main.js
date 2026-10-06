'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function fail(message, detail) {
  console.error('KALONEO_PARCOURS_CHOICE_ELECTRON: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  app.exit(2);
}

let state={version:1,sessionStorage:{},localStorage:{},lastPage:'kaltest-pilot2.html',lastEvaluationPage:'kaltest-pilot2.html'};
let selectedId='parcours-de-base';
let lockCount=0;

const parcours=[
  {
    id:'parcours-de-base',name:'Parcours de base',creator:'SEB EvalPro / KALONÉO',
    systemProvided:true,selected:true,testCount:3,
    maskScreen:{id:'kaloneo-default',version:'1.0.0'},
    maskScreenMeta:{id:'kaloneo-default',version:'1.0.0',name:'KALONÉO'}
  },
  {
    id:'parcours-court',name:'Parcours court',creator:'Smoke R6',
    systemProvided:false,selected:false,testCount:2,
    maskScreen:{id:'masque-court',version:'1.0.0'},
    maskScreenMeta:{id:'masque-court',version:'1.0.0',name:'Masque court'}
  }
];

const details={
  'parcours-de-base':{
    ...parcours[0],
    introduction:{id:'intro',version:'1.0.0'},
    introductionMeta:{id:'intro',version:'1.0.0',title:'Introduction de base'},
    tests:[
      {ref:{id:'a',version:'1.0.0'},meta:{id:'a',version:'1.0.0',title:'Test A'}},
      {ref:{id:'b',version:'1.0.0'},meta:{id:'b',version:'1.0.0',title:'Test B'}},
      {ref:{id:'c',version:'1.0.0'},meta:{id:'c',version:'1.0.0',title:'Test C'}}
    ],
    fin:{id:'fin',version:'1.0.0'},finMeta:{id:'fin',version:'1.0.0',title:'Fin du parcours'}
  },
  'parcours-court':{
    ...parcours[1],
    introduction:{id:'intro',version:'1.0.0'},
    introductionMeta:{id:'intro',version:'1.0.0',title:'Introduction de base'},
    tests:[
      {ref:{id:'a',version:'1.0.0'},meta:{id:'a',version:'1.0.0',title:'Calcul court'}},
      {ref:{id:'b',version:'1.0.0'},meta:{id:'b',version:'1.0.0',title:'Français court'}}
    ],
    fin:{id:'fin',version:'1.0.0'},finMeta:{id:'fin',version:'1.0.0',title:'Fin du parcours'}
  }
};

ipcMain.on('app:edition-sync',e=>{e.returnValue={edition:'unified',canBilan:true,canAi:true,canImport:true,canExport:true};});
ipcMain.on('state:load-sync',e=>{e.returnValue=state;});
ipcMain.on('state:save-sync',(e,p)=>{state={...state,...(p||{})};e.returnValue={ok:true,state};});
ipcMain.on('candidate-catalog:workspace-load-sync',e=>{e.returnValue={ok:false};});
ipcMain.on('candidate-catalog:workspace-save-sync',e=>{e.returnValue={ok:true};});
ipcMain.on('candidate-catalog:results-workspace-load-sync',e=>{e.returnValue={ok:false};});
ipcMain.on('kaloneo-library:selected-runtime-sync',e=>{e.returnValue={ok:true,runtime:{id:selectedId,title:details[selectedId].name,tests:[],fin:null,maskScreen:details[selectedId].maskScreen}};});

ipcMain.handle('state:save',(_e,p)=>{state={...state,...(p||{})};return {ok:true,state};});
ipcMain.handle('admin:status',()=>true);
ipcMain.handle('admin:verify',()=>true);
ipcMain.handle('admin:verify-password',()=>true);
ipcMain.handle('admin:lock',()=>{lockCount+=1;return true;});
for (const name of [
  'candidate:set-admin-export-context','candidate-catalog:end-bilan','admin:open-candidate-browser',
  'admin:return-candidate-browser','admin:open-tests-parcours','admin:close-tests-parcours',
  'admin:open-bilan','admin:open-candidate-results','admin:return-evaluation','admin:close-session',
  'admin:quit-application'
]) ipcMain.handle(name,()=>true);
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

ipcMain.handle('kaloneo-library:list-parcours',()=>({
  ok:true,
  parcours:parcours.map(item=>({...item,selected:item.id===selectedId}))
}));
ipcMain.handle('kaloneo-library:get-selected-parcours',()=>({ok:true,selected:details[selectedId]}));
ipcMain.handle('kaloneo-library:get-parcours-details',(_e,id)=>({ok:true,details:details[id]}));
ipcMain.handle('kaloneo-library:select-parcours',(_e,id)=>{
  if(!details[id])return {ok:false,error:'introuvable'};
  selectedId=id;
  return {ok:true,selected:details[id]};
});
ipcMain.handle('kaloneo-library:selected-runtime',()=>({
  ok:true,
  runtime:{
    id:selectedId,title:details[selectedId].name,tests:[],fin:null,
    maskScreen:details[selectedId].maskScreen
  }
}));
ipcMain.handle('kaloneo-library:get-mask-screen',()=>({
  ok:true,maskScreen:{id:'kaloneo-default',version:'1.0.0',name:'KALONÉO',content:{text:'KALONÉO',image:''}}
}));

const timeout=setTimeout(()=>fail('timeout'),45000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const root=path.join(__dirname,'..');
  const target=path.join(root,'app','web','admin-tests-parcours.html');
  if(!fs.existsSync(target))return fail('admin-tests-parcours.html absent');
  const win=new BrowserWindow({
    show:false,width:1366,height:768,
    webPreferences:{preload:path.join(root,'src','preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false,devTools:false}
  });
  try{
    await win.loadFile(target);
    await wait(800);

    const initial=await win.webContents.executeJavaScript(`(()=> {
      const button=document.getElementById('seb-evalpro-choose-parcours');
      return {exists:!!button,hidden:button?.hidden,text:button?.textContent.trim()};
    })()`,true);
    if(!initial.exists||initial.hidden||initial.text!=='Choix du parcours')return fail('bouton Choix du parcours incorrect',initial);

    await win.webContents.executeJavaScript(`document.getElementById('seb-evalpro-choose-parcours').click();true`,true);
    await wait(250);

    const dialog=await win.webContents.executeJavaScript(`(()=>({
      exists:!!document.getElementById('seb-evalpro-parcours-choice-dialog'),
      items:[...document.querySelectorAll('#seb-evalpro-parcours-choice-dialog .pc-item strong')].map(x=>x.textContent.trim()),
      selected:document.querySelector('#pc-selected')?.textContent.trim()||'',
      detail:document.querySelector('#pc-detail')?.textContent.replace(/\\s+/g,' ').trim()||''
    }))()`,true);
    if(!dialog.exists||dialog.items.length!==2||!dialog.items.includes('Parcours court')||!/Parcours sélectionné : Parcours de base/.test(dialog.selected)||!/Test A/.test(dialog.detail)) {
      return fail('bibliothèque de choix incorrecte',dialog);
    }

    await win.webContents.executeJavaScript(`(()=>{
      const item=[...document.querySelectorAll('#seb-evalpro-parcours-choice-dialog .pc-item')].find(x=>x.querySelector('strong')?.textContent==='Parcours court');
      item?.click();
      return true;
    })()`,true);
    await wait(180);

    const detail=await win.webContents.executeJavaScript(`(()=>({
      text:document.querySelector('#pc-detail')?.textContent.replace(/\\s+/g,' ').trim()||'',
      chooseDisabled:document.getElementById('pc-choose')?.disabled
    }))()`,true);
    if(!/Masque court/.test(detail.text)||!/Calcul court/.test(detail.text)||!/Français court/.test(detail.text)||detail.chooseDisabled) {
      return fail('détail du parcours court incorrect',detail);
    }

    await win.webContents.executeJavaScript(`document.getElementById('pc-choose').click();true`,true);
    await wait(180);
    const chosen=await win.webContents.executeJavaScript(`document.getElementById('pc-selected')?.textContent.trim()||''`,true);
    if(selectedId!=='parcours-court'||!/Parcours court/.test(chosen))return fail('choix non enregistré',{selectedId,chosen});

    await win.webContents.executeJavaScript(`document.getElementById('pc-close').click();document.getElementById('seb-evalpro-admin').click();true`,true);
    await wait(260);
    if(lockCount!==1||selectedId!=='parcours-court')return fail('verrouillage après choix incorrect',{lockCount,selectedId});

    console.log('KALONEO_PARCOURS_CHOICE_ELECTRON=OK');
    console.log(JSON.stringify({initial,dialog,detail,chosen,selectedId,lockCount}));
    clearTimeout(timeout);
    win.destroy();
    app.exit(0);
  }catch(error){fail(String(error?.stack||error));}
});
