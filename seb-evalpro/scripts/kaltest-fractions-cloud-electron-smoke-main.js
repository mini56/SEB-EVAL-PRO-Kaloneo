const { app, BrowserWindow } = require('electron');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'app', 'web', 'kaltest-pilot2.html');

function fail(message, detail) {
  console.error('KALTEST_FRACTIONS_CLOUD: FAIL — ' + message);
  if (detail) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  app.exit(2);
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitCloud(win) {
  for (let i = 0; i < 180; i += 1) {
    const ready = await win.webContents.executeJavaScript(
      `Boolean(
        window.sebKaltestPilot2 &&
        window.sebKaltestPilot2.currentTest()?.id === 'fractions_preparation_lots' &&
        document.querySelector('.kaltest-fraction-items.cloud[data-cloud="true"][data-cloud-ready="1"]')
      )`,
      true
    ).catch(() => false);
    if (ready) return;
    await sleep(50);
  }
  throw new Error('Le nuage Fractions KALTEST ne devient pas prêt.');
}

async function inspect(win) {
  return win.webContents.executeJavaScript(`
    (() => {
      const rows=[...document.querySelectorAll('.kaltest-fraction-row')];
      const cloud=document.querySelector('.kaltest-fraction-items.cloud[data-cloud="true"]');
      const items=[...cloud.querySelectorAll('.kaltest-fraction-item')];
      const positions=items.map(item => ({
        left:Math.round(parseFloat(item.style.left)||0),
        top:Math.round(parseFloat(item.style.top)||0),
        width:Math.round(item.getBoundingClientRect().width),
        height:Math.round(item.getBoundingClientRect().height),
        absolute:getComputedStyle(item).position === 'absolute',
        selected:item.classList.contains('selected'),
        aria:item.getAttribute('aria-pressed')
      }));
      let overlap=false;
      for(let i=0;i<positions.length;i+=1){
        for(let j=i+1;j<positions.length;j+=1){
          const a=positions[i],b=positions[j];
          if(
            Math.abs(a.left-b.left) < Math.max(a.width,b.width)+6 &&
            Math.abs(a.top-b.top) < Math.max(a.height,b.height)+6
          ) overlap=true;
        }
      }
      const firstTwo=rows.slice(0,2).map(row=>row.querySelectorAll('.kaltest-fraction-item').length);
      const state=window.sebKaltestPilot2.state.tests.fractions_preparation_lots;
      return {
        rowCount:rows.length,
        firstTwo,
        cloudCount:items.length,
        cloudReady:cloud.dataset.cloudReady,
        allAbsolute:positions.every(p=>p.absolute),
        distinctX:new Set(positions.map(p=>p.left)).size,
        distinctY:new Set(positions.map(p=>p.top)).size,
        overlap,
        positions,
        saved:state.fractionCloudPositions?.fraction_2_8 || null,
        selectedAnswers:state.answers?.fraction_2_8 || []
      };
    })()
  `, true);
}

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show:false,
    width:1366,
    height:768,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false}
  });

  try {
    await win.loadFile(page, { query:{ segment:'fractions' } });
    await waitCloud(win);
    await sleep(140);

    const initial = await inspect(win);
    if(initial.rowCount !== 3 || JSON.stringify(initial.firstTwo) !== JSON.stringify([4,6])) {
      throw new Error('Les deux premières fractions ont été modifiées : ' + JSON.stringify(initial));
    }
    if(initial.cloudCount !== 12 || initial.cloudReady !== '1' || !initial.allAbsolute) {
      throw new Error('Le troisième groupe n’est pas un vrai nuage de 12 images : ' + JSON.stringify(initial));
    }
    if(initial.distinctX < 4 || initial.distinctY < 3 || initial.overlap) {
      throw new Error('Le nuage est encore aligné ou contient des chevauchements : ' + JSON.stringify(initial));
    }
    if(!Array.isArray(initial.saved) || initial.saved.length !== 12) {
      throw new Error('Les positions du nuage ne sont pas persistées.');
    }

    await win.webContents.executeJavaScript(`
      (() => {
        const items=[...document.querySelectorAll('.kaltest-fraction-items.cloud .kaltest-fraction-item')];
        items.slice(0,3).forEach(item=>item.click());
        return true;
      })()
    `, true);
    await sleep(100);

    const selected = await inspect(win);
    if(selected.selectedAnswers.length !== 3 || selected.positions.filter(p=>p.selected).length !== 3 ||
       selected.positions.filter(p=>p.aria === 'true').length !== 3) {
      throw new Error('La sélection des images du nuage ne fonctionne plus : ' + JSON.stringify(selected));
    }
    const savedBeforeReload = JSON.stringify(selected.saved);

    await win.reload();
    await waitCloud(win);
    await sleep(140);

    const restored = await inspect(win);
    if(restored.overlap || restored.distinctY < 3 || restored.selectedAnswers.length !== 3) {
      throw new Error('Le nuage ou les sélections sont perdus après rechargement : ' + JSON.stringify(restored));
    }
    if(JSON.stringify(restored.saved) !== savedBeforeReload) {
      throw new Error('Les positions normalisées du nuage ont changé après rechargement.');
    }

    console.log('KALTEST_FRACTIONS_CLOUD=OK');
    console.log('KALTEST_FRACTIONS_COUNTS=4_6_12');
    console.log('KALTEST_FRACTIONS_CLOUD_RANDOM_ROWS=' + restored.distinctY);
    console.log('KALTEST_FRACTIONS_CLOUD_NO_OVERLAP=OK');
    console.log('KALTEST_FRACTIONS_CLOUD_SELECTION=OK');
    console.log('KALTEST_FRACTIONS_CLOUD_RELOAD=OK');
    win.destroy();
    app.exit(0);
  } catch (error) {
    try { if (!win.isDestroyed()) win.destroy(); } catch (_) {}
    fail(error?.message || String(error), error?.stack || '');
  }
}).catch(error => fail('Initialisation Electron impossible.', error?.stack || String(error)));

setTimeout(() => fail('Timeout global du test Fractions nuage.'), 60000);
