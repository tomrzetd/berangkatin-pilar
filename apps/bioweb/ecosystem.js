(function(global){
'use strict';
global.BIOWEB_DATA=(function(){
const ZC={puncak:0xcfe8ff,hutan:0x7ee08a,air:0x5ad1e6,sawah:0xe8d36a};
const ZN={puncak:'Puncak',hutan:'Hutan hujan',air:'Air & tanah',sawah:'Sawah & desa'};
const NODES=[
['cantigi','Cantigi & edelweis','🌼',2800,'puncak','Tumbuhan tangguh di puncak. Ia menangkap embun dan menahan tanah di tempat yang dingin.'],
['elang','Elang jawa','🦅',2000,'hutan','Elang jawa adalah predator penting di Ciremai dan memangsa berbagai hewan kecil.'],
['macan','Macan tutul','🐆',1900,'hutan','Pemangsa besar yang membutuhkan habitat hutan yang masih mampu menopang rantai makanan yang kompleks.'],
['owa','Owa jawa','🐒',1700,'hutan','Owa makan buah lalu menyebarkan bijinya. Ia ikut menanam hutan.'],
['pohon','Pohon hutan','🌳',1600,'hutan','Akar pohon menahan tanah dan menyimpan air hujan seperti spons.'],
['serangga','Lebah & kupu','🐝',1300,'hutan','Mereka membantu bunga menjadi buah dan biji.'],
['air','Mata air','💧',1100,'air','Hutan dan tanah pegunungan membantu menyimpan air hujan; mata air penting bagi desa dan sawah di bawah.'],
['pengurai','Jamur pengurai','🍄',900,'air','Jamur dan cacing mengubah daun busuk menjadi makanan bagi tanah.'],
['tanah','Tanah','🟤',700,'air','Tanah subur menyimpan air dan zat hara untuk tumbuhan.'],
['padi','Padi','🌾',600,'sawah','Padi adalah makanan manusia dan makanan banyak hewan sawah.'],
['wereng','Wereng','🦗',650,'sawah','Serangga kecil pemakan padi. Terlalu banyak, padi rusak.'],
['tikus','Tikus','🐀',550,'sawah','Memakan padi, tetapi juga makanan elang dan ular.'],
['katak','Katak','🐸',520,'sawah','Katak memakan wereng. Ia petani tanpa gaji.'],
['ular','Ular sawah','🐍',500,'sawah','Ular menjaga tikus tidak berlebihan.'],
['warga','Warga desa','🧑‍🌾',350,'sawah','Manusia bisa menjaga, bisa juga menekan. Pilihan kitalah yang menentukan.']
].map(a=>({id:a[0],name:a[1],icon:a[2],alt:a[3],zone:a[4],info:a[5]}));
// jenis: s=menopang, e=dimakan, c=daur unsur, p=tekanan
const LINKS=[['air','pohon','s'],['air','padi','s'],['air','warga','s'],['tanah','pohon','s'],['tanah','padi','s'],['pohon','air','s'],['cantigi','air','s'],['pohon','owa','s'],['owa','pohon','s'],['pohon','serangga','s'],['serangga','pohon','s'],['padi','wereng','e'],['padi','tikus','e'],['wereng','katak','e'],['katak','ular','e'],['tikus','ular','e'],['tikus','elang','e'],['owa','macan','e'],['pengurai','tanah','c'],['padi','warga','s'],['warga','pohon','p'],['wereng','padi','p'],['tikus','padi','p']].map(a=>({a:a[0],b:a[1],t:a[2]}));
const TC={s:0x7ee08a,e:0xff8a3d,c:0x5ad1e6,p:0xff5d6c},TN={all:'Semua',e:'Makan–dimakan',s:'Saling menopang',p:'Tekanan'};
const EVT={
kemarau:['☀ Kemarau panjang',0xffd36c,8,{air:-4,tanah:-.8,padi:-1},'Mata air mengecil, lalu padi dan warga ikut kesulitan.'],
api:['🔥 Hutan terbakar',0xff5d6c,8,{pohon:-5,cantigi:-3,owa:-3,elang:-1.5,air:-1.5},'Pohon hilang, air tak tertahan, hewan kehilangan rumah.'],
racun:['🧴 Pestisida berlebihan',0xff8a3d,7,{wereng:-5,katak:-1.5,serangga:-3,pengurai:-.6,tanah:-.5},'Hama turun, tetapi pemangsa dan lebah ikut terkena.'],
buru:['🎯 Perburuan liar',0xc78bff,8,{elang:-3.5,macan:-3,ular:-2},'Pemangsa hilang, hewan kecil jadi tak terkendali.'],
tanam:['🌱 Tanam pohon',0x7be495,9,{pohon:3,air:1,tanah:1,owa:.8},'Akar baru menahan air; hutan pulih pelan-pelan.'],
organik:['🍂 Pupuk kompos',0x9be36f,8,{pengurai:2,tanah:1.5,padi:.5},'Pengurai bertambah, tanah subur tanpa racun.']};

return{ZC,ZN,NODES,LINKS,TC,TN,EVT};
})();
})(window);