(function(global){
'use strict';
global.BIOWEB_DATA={
  nodes:[
    {id:'air',name:'Air',icon:'💧',role:'abiotik',x:.17,y:.30,info:'Air membantu padi dan kehidupan sawah tetap tumbuh.'},
    {id:'tanah',name:'Tanah',icon:'🌱',role:'abiotik',x:.23,y:.70,info:'Tanah menyimpan air dan unsur hara yang dibutuhkan tumbuhan.'},
    {id:'padi',name:'Padi',icon:'🌾',role:'produsen',x:.43,y:.50,info:'Padi adalah produsen dan sumber energi bagi banyak organisme sawah.'},
    {id:'wereng',name:'Wereng',icon:'🦗',role:'herbivora',x:.61,y:.35,info:'Wereng memanfaatkan padi sebagai sumber makanan.'},
    {id:'katak',name:'Katak',icon:'🐸',role:'predator',x:.72,y:.53,info:'Katak membantu memangsa serangga dan ikut menjaga keseimbangan.'},
    {id:'ular',name:'Ular',icon:'🐍',role:'predator',x:.84,y:.69,info:'Ular adalah predator yang memengaruhi jumlah beberapa hewan sawah.'},
    {id:'tikus',name:'Tikus',icon:'🐀',role:'konsumen',x:.58,y:.75,info:'Tikus memakan bagian tanaman padi dan juga menjadi mangsa predator.'},
    {id:'burung',name:'Burung',icon:'🐦',role:'predator',x:.79,y:.25,info:'Burung dapat memakan serangga dan menjadi bagian dari jejaring sawah.'},
    {id:'pengurai',name:'Pengurai',icon:'🍄',role:'pengurai',x:.38,y:.82,info:'Pengurai membantu mengembalikan unsur dari sisa makhluk hidup ke tanah.'}
  ],
  links:[
    {a:'air',b:'padi',type:'support',strength:.65,label:'mendukung pertumbuhan'},
    {a:'tanah',b:'padi',type:'support',strength:.55,label:'menyediakan unsur hara'},
    {a:'padi',b:'wereng',type:'consume',strength:.65,label:'dimakan'},
    {a:'padi',b:'tikus',type:'consume',strength:.48,label:'dimakan'},
    {a:'wereng',b:'katak',type:'consume',strength:.58,label:'dimangsa'},
    {a:'wereng',b:'burung',type:'consume',strength:.34,label:'dimangsa'},
    {a:'katak',b:'ular',type:'consume',strength:.42,label:'dimangsa'},
    {a:'tikus',b:'ular',type:'consume',strength:.56,label:'dimangsa'},
    {a:'pengurai',b:'tanah',type:'cycle',strength:.62,label:'mengembalikan unsur'},
    {a:'wereng',b:'padi',type:'pressure',strength:.46,label:'menekan kondisi padi'},
    {a:'tikus',b:'padi',type:'pressure',strength:.38,label:'menekan kondisi padi'}
  ],
  events:{
    kemarau:{name:'Kemarau',icon:'☀',color:'#ffd36c',days:8,effects:{air:-4.1,padi:-1.0,pengurai:-.35},trail:['Air berkurang','Padi tertekan','Organisme lain ikut menyesuaikan']},
    pestisida:{name:'Pestisida',icon:'🧴',color:'#ff9b56',days:7,effects:{wereng:-5.2,katak:-1.0,burung:-.65,pengurai:-.35},trail:['Wereng turun cepat','Sebagian pemangsa ikut turun','Jejaring berubah']},
    predator:{name:'Predator berkurang',icon:'🐍',color:'#ff6f7d',days:9,effects:{ular:-4.6,katak:-1.2,tikus:1.3,wereng:1.0},trail:['Predator turun','Mangsa lebih bebas','Tekanan pada padi dapat meningkat']},
    organik:{name:'Bahan organik',icon:'🌱',color:'#7be495',days:8,effects:{pengurai:2.1,tanah:1.6,padi:.55},trail:['Pengurai meningkat','Tanah mendapat dukungan','Padi mendapat kondisi lebih baik']}
  }
};
})(window);