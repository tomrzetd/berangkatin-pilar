(function(global){
  const P=global.PILAR=global.PILAR||{};
  P.lorentzMissions={
    mark(name){P.state.patch(s=>{if(name in s.missions)s.missions[name]=true});P.score&&P.score.sync()},
    proofSuccess(){return P.state.get().evidence.some(x=>x.alpha>=35&&x.alpha<=45)}
  };
})(window);
