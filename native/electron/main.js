/* PILAR Hub · aplikasi desktop x86 (Windows / Linux) berbasis Electron.
   Situs dibundel di folder www/ (dibuat oleh native/build-web.mjs) dan dilayani
   lewat protokol aman app://pilar/ → kamera, mikrofon, WebGL, Web Serial (ESP32),
   Web Bluetooth dan penyimpanan lokal bekerja tanpa internet. */
'use strict';
const {app, BrowserWindow, protocol, session, shell, Menu, dialog} = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const SMOKE = process.env.PILAR_SMOKE === '1';
const WWW = path.join(__dirname, 'www');
const ORIGIN = 'app://pilar';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.task': 'application/octet-stream', '.bin': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8',
  '.ino': 'text/plain; charset=utf-8'
};

/* Laptop pemerintah sering memakai driver Intel lama yang masuk daftar hitam GPU Chromium → WebGL mati.
   Abaikan daftar hitam agar lab 3D tetap jalan; audio boleh berbunyi tanpa klik (SoundScope, Generator). */
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-experimental-web-platform-features'); // Web Bluetooth di Linux
if (SMOKE) {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('use-fake-device-for-media-stream');
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
}

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true}
}]);

if (!SMOKE && !app.requestSingleInstanceLock()) app.quit();

function serve(request) {
  const url = new URL(request.url);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(WWW, rel));
  if (!file.startsWith(WWW)) return new Response('Forbidden', {status: 403});
  let target = file;
  try {
    if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  } catch (_) {
    return new Response('Tidak ditemukan: ' + rel, {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
  }
  try {
    const data = fs.readFileSync(target);
    return new Response(data, {
      status: 200,
      headers: {
        'content-type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-cache',
        // SharedArrayBuffer tidak dipakai; header ini aman & membantu wasm MediaPipe
        'cross-origin-resource-policy': 'cross-origin'
      }
    });
  } catch (e) {
    return new Response(String(e), {status: 500});
  }
}

function setupSession(ses) {
  const allow = new Set(['media', 'mediaKeySystem', 'fullscreen', 'pointerLock', 'clipboard-read', 'clipboard-sanitized-write',
    'serial', 'hid', 'usb', 'bluetooth', 'notifications', 'idle-detection', 'speaker-selection', 'window-management']);
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(allow.has(perm)));
  ses.setPermissionCheckHandler((wc, perm) => allow.has(perm));
  ses.setDevicePermissionHandler(() => true);
  // ESP32 lewat USB: pilih port yang paling mungkin (CP210x, CH340, Espressif native USB), atau tanya bila banyak
  ses.on('select-serial-port', async (event, ports, wc, callback) => {
    event.preventDefault();
    if (!ports.length) return callback('');
    const known = ports.find(p => /^(10c4|1a86|303a|0403)$/i.test(Number(p.vendorId || 0).toString(16).padStart(4, '0')));
    if (known || ports.length === 1) return callback((known || ports[0]).portId);
    const win = BrowserWindow.fromWebContents(wc);
    const r = await dialog.showMessageBox(win, {type: 'question', title: 'Pilih port USB', message: 'Pilih port ESP32 / controller:',
      buttons: [...ports.map(p => p.displayName || p.portName || p.portId), 'Batal'], cancelId: ports.length});
    callback(r.response < ports.length ? ports[r.response].portId : '');
  });
  ses.on('will-download', (e, item) => {
    item.setSaveDialogOptions({defaultPath: path.join(app.getPath('documents'), 'PILAR', item.getFilename())});
    try { fs.mkdirSync(path.join(app.getPath('documents'), 'PILAR'), {recursive: true}); } catch (_) {}
  });
}

function wireWindow(win) {
  const wc = win.webContents;
  // Web Bluetooth: pilih perangkat bernama PILAR/ESP; batal otomatis setelah 15 detik bila tidak ada
  let btTimer = null;
  wc.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    const pick = devices.find(d => /pilar|esp|microscope/i.test(d.deviceName || ''));
    if (pick) { clearTimeout(btTimer); btTimer = null; return callback(pick.deviceId); }
    if (!btTimer) btTimer = setTimeout(() => { btTimer = null; callback(devices[0] ? devices[0].deviceId : ''); }, 15000);
  });
  wc.setWindowOpenHandler(({url}) => {
    if (url.startsWith(ORIGIN)) return {action: 'allow', overrideBrowserWindowOptions: windowOptions()};
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return {action: 'deny'};
  });
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN) && !url.startsWith('about:')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });
  wc.on('did-create-window', w => wireWindow(w));
  // Pintasan: F11 layar penuh · Ctrl+R muat ulang · Ctrl+Shift+I DevTools · Ctrl +/−/0 zoom · Alt+← kembali · Alt+Home Hub
  wc.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    const k = i.key, c = i.control || i.meta;
    if (k === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (c && k.toLowerCase() === 'r') { wc.reloadIgnoringCache(); e.preventDefault(); }
    else if ((c && i.shift && k.toLowerCase() === 'i') || k === 'F12') { wc.toggleDevTools(); e.preventDefault(); }
    else if (c && (k === '=' || k === '+')) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); e.preventDefault(); }
    else if (c && k === '-') { wc.setZoomLevel(wc.getZoomLevel() - 0.5); e.preventDefault(); }
    else if (c && k === '0') { wc.setZoomLevel(0); e.preventDefault(); }
    else if (i.alt && k === 'ArrowLeft') { if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); e.preventDefault(); }
    else if (i.alt && k === 'Home') { wc.loadURL(ORIGIN + '/index.html'); e.preventDefault(); }
  });
}

function windowOptions() {
  return {
    width: 1366, height: 820, minWidth: 360, minHeight: 480, show: false,
    backgroundColor: '#07101b', autoHideMenuBar: true, title: 'PILAR Hub',
    icon: path.join(__dirname, 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false, spellcheck: false
    }
  };
}

function createWindow() {
  const win = new BrowserWindow(windowOptions());
  wireWindow(win);
  win.once('ready-to-show', () => { if (!SMOKE) { win.maximize(); win.show(); } });
  win.loadURL(ORIGIN + '/index.html');
  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', serve);
  setupSession(session.defaultSession);
  if (SMOKE) return require('./smoke.js')(createWindow, ORIGIN, WWW);
  createWindow();
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
