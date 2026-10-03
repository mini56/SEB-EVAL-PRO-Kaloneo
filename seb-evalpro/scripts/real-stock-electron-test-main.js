const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'stock.html');
const outDir = path.resolve(root, '..', 'docs', 'render-check-real');

function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function shot(win,name){
  const img=await win.webContents.capturePage();
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,name),img.toPNG());
}

async function meta(win){
  return win.webContents.executeJavaScript(`
    (() => {
      const left=document.querySelector('.k-stock-left')?.getBoundingClientRect();
      const right=document.querySelector('.k-stock-shelves')?.getBoundingClientRect();
      return {
        layout:document.body.dataset.kaloneoLayout||'',
        pots:document.querySelectorAll('.pot').length,
        cases:document.querySelectorAll('.case').length,
        sourcePots:document.querySelectorAll('#pots-source .pot').length,
        triPots:document.querySelectorAll('#zone-tri .pot').length,
        leftWidth:left?.width||0,
        rightWidth:right?.width||0,
        ratio:left&&right ? right.width/left.width : 0,
        button:document.getElementById('stockActionBtn')?.textContent.trim()||'',
        result:window.sebStock?.resultFromStorage?.()||null,
        storedState:JSON.parse(sessionStorage.getItem('seb_evalpro_stock_state')||'null')
      };
    })()
  `,true);
}

async function placeAllCorrectly(win){
  return win.webContents.executeJavaScript(`
    (() => {
      const used=new Set();
      document.querySelectorAll('.case .pot').forEach(pot=>{
        const cell=pot.closest('.case');
        const level=cell?.closest('[data-etagere][data-niveau]');
        if(cell&&level) used.add(level.dataset.etagere+'-'+level.dataset.niveau+'-'+cell.dataset.case);
      });

      const failures=[];
      for(const pot of window.sebStock.pots){
        const id=String(pot.id);
        const el=document.querySelector('.pot[data-pot-id="'+id+'"]');
        if(!el){failures.push({id,reason:'missing'});continue;}

        const current=el.closest('.case');
        if(current){
          const level=current.closest('[data-etagere][data-niveau]');
          const key=level.dataset.etagere+'-'+level.dataset.niveau+'-'+current.dataset.case;
          const score=window.sebStock.computeScore(false);
          const allowed=window.sebStock.positionsForPotId(id);
          if(allowed.some(pos=>String(pos.etagere)+'-'+String(pos.niveau)+'-'+String(pos.case)===key)){
            used.add(key);
            continue;
          }
        }

        const allowed=window.sebStock.positionsForPotId(id);
        let placed=false;
        for(const pos of allowed){
          const key=String(pos.etagere)+'-'+String(pos.niveau)+'-'+String(pos.case);
          if(used.has(key)) continue;
          if(window.sebStock.placePot(id,pos,false)){
            used.add(key);
            placed=true;
            break;
          }
        }
        if(!placed) failures.push({id,allowed});
      }

      window.sebStock.persistState(false);
      return {failures,score:window.sebStock.computeScore(false)};
    })()
  `,true);
}

app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(async()=>{
  const win=new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    useContentSize:true,
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:false,
      devTools:false,
      spellcheck:false
    }
  });

  try{
    await win.loadFile(page);
    win.webContents.setZoomFactor(0.85);
    await wait(800);

    await shot(win,'REAL-PROGRAM-STOCK-initial-1366x768-zoom085.png');
    const initial=await meta(win);

    const placement=await placeAllCorrectly(win);
    if(placement.failures.length) throw new Error('Placement failures: '+JSON.stringify(placement.failures));
    if(placement.score.correct!==33 || placement.score.errors!==0){
      throw new Error('Unexpected pre-verify score: '+JSON.stringify(placement.score));
    }

    await win.webContents.executeJavaScript(`
      window.alert=()=>{};
      window.sebStock.verifyPlacements();
      true;
    `,true);
    await wait(250);

    const verified=await meta(win);
    if(!verified.result || verified.result.correct!==33 || verified.result.errors!==0 || verified.result.total!==33){
      throw new Error('Verification result invalid: '+JSON.stringify(verified.result));
    }
    if(!/Suivant/i.test(verified.button)) throw new Error('Verify button did not switch to Suivant: '+verified.button);
    await shot(win,'REAL-PROGRAM-STOCK-verified-1366x768-zoom085.png');

    await win.reload();
    win.webContents.setZoomFactor(0.85);
    await wait(800);

    const restored=await meta(win);
    if(!restored.result || restored.result.correct!==33 || restored.result.errors!==0){
      throw new Error('Stored result not restored: '+JSON.stringify(restored.result));
    }
    if(!/Suivant/i.test(restored.button)) throw new Error('Validated UI not restored after reload: '+restored.button);
    await shot(win,'REAL-PROGRAM-STOCK-restored-1366x768-zoom085.png');

    const report={initial,placement,verified,restored};
    fs.writeFileSync(path.join(outDir,'REAL-PROGRAM-STOCK-test-report.json'),JSON.stringify(report,null,2),'utf8');

    console.log('REAL_PROGRAM_STOCK_TEST: OK');
    console.log(JSON.stringify({
      layout:initial.layout,
      pots:initial.pots,
      cases:initial.cases,
      ratio:Number(initial.ratio.toFixed(3)),
      verified:verified.result,
      restored:restored.result,
      buttonAfterReload:restored.button
    }));
    win.destroy();
    app.exit(0);
  }catch(error){
    console.error(error && error.stack ? error.stack : error);
    try{win.destroy();}catch(_){}
    app.exit(2);
  }
}).catch(err=>{console.error(err);app.exit(2);});

setTimeout(()=>{console.error('REAL_PROGRAM_STOCK_TEST: TIMEOUT');app.exit(3)},60000);
