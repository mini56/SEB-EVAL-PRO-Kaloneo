'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const preload = fs.readFileSync(path.join(root, 'src', 'preload.js'), 'utf8');
const installer = fs.readFileSync(path.join(root, 'build', 'installer.nsh'), 'utf8');
const r27Builder = fs.readFileSync(path.join(root, 'build', 'kaloneo-test-builder-r27-builder.yml'), 'utf8');

function fail(message) {
  console.error('SEB EvalPro garde barre Admin / build: ' + message);
  process.exit(2);
}

const buildNumber = String(pkg.sebBuildNumber || '').trim();
if (!/^\d+$/.test(buildNumber)) fail('sebBuildNumber invalide dans package.json.');
if (!preload.includes("const APP_BUILD_NUMBER = String(appPackage.sebBuildNumber || '').trim() || 'DEV';")) {
  fail('preload.js ne lit pas le build central depuis package.json.');
}
if (!preload.includes('const APP_BUILD_LABEL = `Build #${APP_BUILD_NUMBER}`;')) {
  fail('APP_BUILD_LABEL n’est pas construit depuis le build central.');
}
if (!preload.includes('<div id="seb-evalpro-build" class="seb-evalpro-build">${APP_BUILD_LABEL}</div>')) {
  fail('la barre Admin n’injecte pas APP_BUILD_LABEL.');
}
const installerMatch = installer.match(/!define\s+SEB_BUILD_NUMBER\s+"(\d+)"/);
if (!installerMatch || installerMatch[1] !== buildNumber) {
  fail('le Setup et la barre Admin n’utilisent pas le même numéro de build.');
}
if (!r27Builder.includes('version: 0.0.' + buildNumber)) {
  fail('la version du builder R27 ne correspond pas au Build #' + buildNumber + '.');
}

console.log('SEB_ADMIN_BUILD_LABEL=OK Build #' + buildNumber);
