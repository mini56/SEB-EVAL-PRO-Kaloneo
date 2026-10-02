const { app } = require('electron');
const path = require('path');

process.env.SEB_KALTEST_PILOT2 = '1';
process.env.SEB_EVALPRO_EDITION = 'admin';

const APP_NAME = 'SEB EvalPro Kalonéo - PILOTE 6';

try {
  app.setName(APP_NAME);
  const appData = app.getPath('appData');
  const isolatedRoot = path.join(appData, 'SEB EvalPro Kaloneo PILOTE 6');
  app.setPath('userData', isolatedRoot);
  app.setPath('documents', path.join(isolatedRoot, 'Documents'));
} catch (_) {}

require('./main');
