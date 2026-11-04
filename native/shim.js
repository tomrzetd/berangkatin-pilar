/* PILAR native shim — dimuat paling awal di setiap halaman versi aplikasi (Android/Electron).
   Di browser biasa (GitHub Pages) berkas ini tidak disertakan. */
(function () {
  'use strict';
  var cap = window.Capacitor;
  var android = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var electron = !!window.PILAR_ELECTRON || location.protocol === 'app:';
  var platform = android ? 'android' : electron ? 'electron' : null;
  if (!platform) return;
  window.PILAR_NATIVE = {platform: platform, electron: window.PILAR_ELECTRON || null};
  document.documentElement.setAttribute('data-native', platform);

  // Versi aplikasi sudah membawa semua berkas sendiri: service worker web tidak diperlukan.
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations)
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
  } catch (_) {}

  if (!android) return;

  /* WebView lama (IFP tanpa Play Store sering tertinggal versi) → beri tahu cara memperbarui. */
  var cv = +((navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1] || 0);
  window.PILAR_NATIVE.webview = cv;
  if (cv && cv < 105 && /\/index\.html$|\/$/.test(location.pathname) && !/\/apps\//.test(location.pathname)) {
    try { if (!sessionStorage.getItem('pilarOldWv')) { sessionStorage.setItem('pilarOldWv', '1');
      addEventListener('DOMContentLoaded', function () { toast('ℹ️ Android System WebView versi ' + cv + ' sudah lama. Perbarui lewat Play Store / APK WebView agar semua lab tampil sempurna.', true); }); } } catch (_) {}
  }

  /* ---------- Android: unduhan (foto mikroskop, peta makna, WAV, dll.) ----------
     WebView tidak bisa menyimpan <a download> dari blob:/data:. Berkas ditulis ke
     Documents/PILAR lewat plugin Filesystem. */
  function toast(msg, bad) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:90vw;padding:12px 18px;border-radius:14px;font:700 15px/1.35 system-ui,sans-serif;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.35);background:' + (bad ? '#c0392b' : '#0f8a5f');
    (document.body || document.documentElement).appendChild(t);
    setTimeout(function () { t.remove(); }, 3800);
  }
  function b64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = rej; r.readAsDataURL(blob);
    });
  }
  function safeName(n) { return String(n || 'PILAR_' + Date.now()).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120); }
  async function save(href, name) {
    var FS = cap.Plugins && cap.Plugins.Filesystem;
    if (!FS) { toast('Penyimpanan berkas belum tersedia di perangkat ini', true); return; }
    try {
      var blob = await (await fetch(href)).blob();
      var file = 'PILAR/' + safeName(name);
      await FS.writeFile({path: file, data: await b64(blob), directory: 'DOCUMENTS', recursive: true});
      toast('✅ Tersimpan: Documents/' + file);
    } catch (e) {
      console.warn('[PILAR native] simpan gagal', e);
      toast('Gagal menyimpan: ' + (e && e.message || e), true);
    }
  }
  function handle(a) {
    if (!a || !a.hasAttribute || !a.hasAttribute('download')) return false;
    var href = a.href || '';
    if (!/^(blob:|data:)/.test(href) && !(href.indexOf(location.origin) === 0)) return false;
    var name = a.getAttribute('download') || href.split('/').pop();
    save(href, name);
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[download]');
    if (a && handle(a)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  var click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (!handle(this)) return click.apply(this, arguments); };
})();
