(function(global){
  const P=global.PILAR=global.PILAR||{};
  function sameSign(a,b){return Math.sign(a)!==0&&Math.sign(a)===Math.sign(b)}
  P.missionEngine={
    evaluate(){
      const s=P.state.get(), e=s.evidence;
      const reversal=e.some(a=>e.some(b=>a.id!==b.id&&a.on&&b.on&&a.polarity===-b.polarity&&Math.sign(a.fEffective)===-Math.sign(b.fEffective)&&Math.abs(a.fEffective)>.003&&Math.abs(b.fEffective)>.003));
      const bEffect=e.some(a=>e.some(b=>a.id!==b.id&&a.on&&b.on&&a.polarity===b.polarity&&Math.abs(a.B-b.B)>=.09&&sameSign(a.fEffective,b.fEffective)&&Math.abs(a.fEffective-b.fEffective)>=.008));
      const offEffect=e.some(x=>!x.on&&Math.abs(x.current)<.02&&Math.abs(x.fEffective)<.002);
      P.state.patch(st=>{
        st.aha.reversal=reversal;st.aha.bEffect=bEffect;st.aha.offEffect=offEffect;
        st.aha.unlocked=reversal&&bEffect;
      });
      if(P.score)P.score.sync();
    }
  };
})(window);
