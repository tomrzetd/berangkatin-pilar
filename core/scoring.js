(function(global){
  const P=global.PILAR=global.PILAR||{};
  P.score={
    sync(){
      const s=P.state.get();
      let xp=0;
      if(s.prediction)xp+=10;
      if(s.missions.close)xp+=25;
      if(s.missions.flip)xp+=30;
      if(s.missions.bchange)xp+=30;
      if(s.aha.unlocked)xp+=75;
      if(s.reveal.formula)xp+=30;
      if(s.evidence.some(x=>x.alpha>=35&&x.alpha<=45))xp+=100;
      if(s.engineering.brief)xp+=80;
      if(xp!==s.xp)P.state.patch(st=>{st.xp=xp});
    }
  };
})(window);
