(function(global){
  const P=global.PILAR=global.PILAR||{};
  P.engineering={
    makeBrief(motion,need,constraint){
      const m=motion||'gerak';
      const n=(need||'kebutuhan belum ditulis').trim();
      const c=(constraint||'batasan belum ditulis').trim();
      return `BRIEF REKAYASA PILAR\nFungsi gerak: ${m}\nKebutuhan: ${n}\nBatasan: ${c}\nHipotesis kerja: gaya Lorentz pada penghantar berarus di medan magnet akan diubah menjadi gerak ${m}.\nBukti minimum: ukur arus, arah gaya, respons gerak, dan ulangi minimal 3 kali.\nKriteria jadi: prototipe bekerja, kebutuhan terjawab, keterbatasan dilaporkan jujur.`;
    }
  };
})(window);
