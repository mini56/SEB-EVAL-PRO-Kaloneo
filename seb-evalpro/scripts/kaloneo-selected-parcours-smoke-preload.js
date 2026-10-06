'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sebEvalPro', {
  kaloneoSelectedParcoursRuntimeSync: () => ipcRenderer.sendSync('smoke:selected-runtime-sync'),
  save: () => ({ok:true}),
  captureReplay: async () => ({ok:true})
});
