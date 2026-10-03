# PILAR™ MBG Delivery Duel v3 — Audit & Modernization

## Temuan pada v2
- Input pointer sudah menyatukan mouse/touch dan map sudah divalidasi solvable dengan BFS.
- Scoring v2 memakai nilai `students` acak berbeda per tim tetapi memasukkan `students * 2` ke skor; ini membuat duel dapat bias sebelum pemain bergerak.
- Bonus efisiensi memakai angka optimal tetap 18 langkah (Manhattan), padahal obstacle dapat membuat rute minimum aktual lebih panjang.
- Pointer move menerima hanya satu sel yang adjacent; swipe cepat pada IFP dapat melewati beberapa sel dan terasa putus.
- UI maksimum 1400 px belum memanfaatkan IFP 2K/4K besar.
- Belum ada Vision AI berbasis machine learning; interaksi hanya pointer/touch.

## v3
- Fair match: peta, jumlah porsi, dan basis skor identik untuk dua tim.
- `parRoute` dihitung dengan BFS aktual untuk setiap map dan menjadi basis efisiensi.
- Partial score memakai jarak BFS dari posisi terakhir ke sekolah.
- Coalesced Pointer Events + interpolasi sel untuk drag cepat IFP.
- Palm rejection dasar pada profil IFP.
- Profil UI Auto / IFP 2K+ / Desktop / Mobile.
- Mobile memakai tab Tim Biru / Tim Merah agar board tetap besar.
- Vision AI optional: MediaPipe Hand Landmarker, hingga 2 tangan, wireframe, kursor per tim, pinch-to-route, inference adaptif, GPU→CPU fallback.
- Vision hanya dimuat saat dipilih; touch/mouse selalu menjadi fallback.
- Kamera diproses lokal di browser dan stream tidak direkam/diunggah oleh aplikasi.
- PILAR Hub navigation + Creator ID.

## Catatan akselerasi AI
Web app mendeteksi `navigator.gpu` dan meminta delegate GPU pada MediaPipe. Browser saat ini tidak menjamin akses langsung ke NPU/TOPS tertentu, sehingga label performa tidak mengklaim pemakaian NPU 50+ TOPS secara langsung.
