(function(global){
  const P=global.PILAR=global.PILAR||{};
  P.pointer={
    bindOrbit(canvas,orb){
      let drag=false,lx=0,ly=0;
      canvas.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing'});
      canvas.addEventListener('pointermove',e=>{if(!drag)return;orb.taz-=(e.clientX-lx)*.006;orb.tel=Math.max(.03,Math.min(1.05,orb.tel+(e.clientY-ly)*.005));lx=e.clientX;ly=e.clientY});
      canvas.addEventListener('pointerup',e=>{drag=false;canvas.style.cursor='grab';try{canvas.releasePointerCapture(e.pointerId)}catch(_){}});
      canvas.addEventListener('wheel',e=>{e.preventDefault();orb.r=Math.max(6,Math.min(15,orb.r+e.deltaY*.008))},{passive:false});
    }
  };
})(window);
