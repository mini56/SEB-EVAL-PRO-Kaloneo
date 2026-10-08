'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const payload = ipcRenderer.sendSync('smoke:interactive-fullpage-sync') || {};
try {
  if (payload.state) {
    window.sessionStorage.setItem('seb_kaltest_pilot2_state_v1', JSON.stringify(payload.state));
  }
} catch (_) {}

contextBridge.exposeInMainWorld('sebEvalPro', {
  kaloneoSelectedParcoursRuntimeSync: () => ({ ok:true, runtime:payload.runtime }),
  save: () => ({ ok:true }),
  captureReplay: async () => ({ ok:true })
});
