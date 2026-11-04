/* Preload: hanya menandai bahwa halaman berjalan di aplikasi desktop PILAR. Tidak ada akses Node ke halaman. */
'use strict';
const {contextBridge} = require('electron');
contextBridge.exposeInMainWorld('PILAR_ELECTRON', {
  platform: process.platform,
  arch: process.arch
});
