# Menambah app baru ke PILAR Hub

1. Duplikasi folder app Anda ke `apps/<slug>/`.
2. Pastikan halaman utama bernama `index.html`.
3. Tambahkan tombol kembali ke hub: `<a href="../../index.html">← PILAR Hub</a>`.
4. Tampilkan Creator ID di header: `by : rizalabdurrahman05@guru.smp.belajar.id`.
5. Tambahkan entri di `apps/registry.js` dan ubah `status` menjadi `ready`.
6. Jika app butuh Vision AI, muat model hanya setelah pengguna memilih fitur Vision.

Contoh entri:
```js
{
  id:'tekanan',
  title:'Tekanan IPA',
  subtitle:'Padat · cair · gas',
  category:'Simulasi',
  icon:'🫧',
  url:'apps/pressure/',
  version:'1.0',
  status:'ready'
}
```
