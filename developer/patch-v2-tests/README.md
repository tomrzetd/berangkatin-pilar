# Uji patch v2 (alur PM)

Jalankan dari folder proyek (butuh Node 18+, tanpa dependensi):

    node developer/patch-v2-tests/test_pressure.js .
    node developer/patch-v2-tests/test_lorentz.js .

Keduanya memakai DOM tiruan, jadi memeriksa logika alur (kunci keras/lunak, tebakan,
bukti, grafik, refleksi, simpan/pulihkan progres, latihan arah), bukan tampilan 3D.
Tampilan tetap perlu dicek manual di browser (lihat CATATAN-PATCH.md, bagian "Uji manual").