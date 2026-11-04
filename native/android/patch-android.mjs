#!/usr/bin/env node
/* Sesuaikan proyek Android hasil "npx cap add android" untuk PILAR Hub.
   Dijalankan di CI setelah cap add, sebelum cap sync. */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AND = path.join(HERE, 'android');
const APP = path.join(AND, 'app');
const PKG = 'id/berangkatin/pilarhub';
const log = (...a) => console.log('[patch-android]', ...a);
const must = (cond, msg) => { if (!cond) { console.error('[patch-android] GAGAL:', msg); process.exit(1); } };

// 1. MainActivity
const java = path.join(APP, 'src/main/java', PKG, 'MainActivity.java');
await fs.mkdir(path.dirname(java), {recursive: true});
await fs.copyFile(path.join(HERE, 'java/MainActivity.java'), java);
log('MainActivity dipasang');

// 2. AndroidManifest
const mf = path.join(APP, 'src/main/AndroidManifest.xml');
let m = await fs.readFile(mf, 'utf8');
const perms = [
  'android.permission.CAMERA', 'android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.ACCESS_NETWORK_STATE', 'android.permission.WAKE_LOCK'
];
let add = perms.filter(p => !m.includes(`"${p}"`)).map(p => `    <uses-permission android:name="${p}" />`);
if (!m.includes('WRITE_EXTERNAL_STORAGE')) add.push('    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />');
if (!m.includes('READ_EXTERNAL_STORAGE')) add.push('    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />');
// Fitur tidak wajib → APK bisa dipasang di IFP tanpa kamera bawaan / layar tanpa GPS dll.
for (const f of ['android.hardware.camera', 'android.hardware.camera.any', 'android.hardware.camera.autofocus', 'android.hardware.microphone',
  'android.hardware.touchscreen', 'android.hardware.usb.host', 'android.hardware.bluetooth_le', 'android.hardware.screen.portrait', 'android.hardware.screen.landscape'])
  if (!m.includes(`"${f}"`)) add.push(`    <uses-feature android:name="${f}" android:required="false" />`);
m = m.replace(/<\/manifest>\s*$/, add.join('\n') + '\n</manifest>\n');
m = m.replace(/<application\b/, '<application android:usesCleartextTraffic="true" android:hardwareAccelerated="true" android:largeHeap="true" android:requestLegacyExternalStorage="true" android:resizeableActivity="true"');
// Aktivitas: jangan dimulai ulang saat orientasi/ukuran/keyboard/layar berubah (penting saat IFP berganti input HDMI)
m = m.replace(/android:configChanges="[^"]*"/, 'android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|screenLayout|uiMode|navigation|density|fontScale|locale|layoutDirection"');
must(m.includes('android.permission.CAMERA'), 'izin kamera');
await fs.writeFile(mf, m);
log('AndroidManifest diperbarui');

// 3. Ikon aplikasi
const res = path.join(APP, 'src/main/res');
for (const d of await fs.readdir(res)) if (/^mipmap-anydpi/.test(d)) await fs.rm(path.join(res, d), {recursive: true, force: true});
for (const d of await fs.readdir(path.join(HERE, 'res'))) {
  await fs.mkdir(path.join(res, d), {recursive: true});
  for (const f of await fs.readdir(path.join(HERE, 'res', d))) await fs.copyFile(path.join(HERE, 'res', d, f), path.join(res, d, f));
}
log('ikon disalin');

// 4. Versi & penandatanganan
const gradle = path.join(APP, 'build.gradle');
let g = await fs.readFile(gradle, 'utf8');
const code = parseInt(process.env.PILAR_VERSION_CODE || '1', 10), name = process.env.PILAR_VERSION_NAME || '0.8.2';
g = g.replace(/versionCode\s+\d+/, 'versionCode ' + code).replace(/versionName\s+"[^"]*"/, `versionName "${name}"`);
if (!g.includes('signingConfigs')) {
  g = g.replace(/buildTypes\s*\{/, `signingConfigs {
        // Kunci debug tetap (bukan rahasia) → APK debug versi baru bisa dipasang menimpa versi lama tanpa hapus data.
        debug {
            storeFile file("${path.join(HERE, 'pilar-debug.keystore').replace(/\\/g, '/')}")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
        release {
            if (System.getenv("PILAR_KEYSTORE")) {
                storeFile file(System.getenv("PILAR_KEYSTORE"))
                storePassword System.getenv("PILAR_KEYSTORE_PASSWORD")
                keyAlias System.getenv("PILAR_KEY_ALIAS")
                keyPassword System.getenv("PILAR_KEY_PASSWORD")
            }
        }
    }
    buildTypes {`);
  g = g.replace(/(release\s*\{\s*\n\s*minifyEnabled[^\n]*)/, '$1\n            if (System.getenv("PILAR_KEYSTORE")) signingConfig signingConfigs.release');
}
must(g.includes('versionCode ' + code), 'versionCode');
await fs.writeFile(gradle, g);
log(`versi ${name} (${code}); tanda tangan rilis: ${process.env.PILAR_KEYSTORE ? 'ya' : 'tidak (hanya APK debug)'}`);
