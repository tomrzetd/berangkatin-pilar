(function(global){
  const P=global.PILAR=global.PILAR||{};
  let scheduled=null;
  function snapshot(reason){
    const s=P.state.get(), d=s.dynamics, c=s.circuit;
    const rec={
      id:++s.trialSeq, reason, t:Date.now(), B:s.params.B, V:s.params.V, R:s.params.R,
      polarity:c.actualPolarity, current:c.currentActual, fIdeal:d.fIdeal, fEffective:d.fEffective,
      fieldFactor:d.fieldFactor, alpha:Math.abs(d.alpha*180/Math.PI), direction:P.lorentzPhysics.dirOf(d.fEffective), on:c.on
    };
    s.evidence.push(rec); if(s.evidence.length>30)s.evidence.shift();
    P.missionEngine&&P.missionEngine.evaluate();
    return rec;
  }
  P.evidence={
    record(reason='manual'){let r;P.state.patch(()=>{r=snapshot(reason)});return r},
    schedule(reason,delay=900){scheduled={reason,at:performance.now()+delay}},
    tick(now){if(scheduled&&now>=scheduled.at){const x=scheduled;scheduled=null;P.evidence.record(x.reason)}},
    clear(){scheduled=null;P.state.patch(s=>{s.evidence=[];s.trialSeq=0})}
  };
})(window);
