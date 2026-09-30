(function(global){
  const P=global.PILAR=global.PILAR||{};
  const listeners=[];
  const state={
    phase:'lihat', xp:0, prediction:null,
    params:{V:3.7,R:2.0,B:0.30,L:0.10,mass:0.010,length:0.22,damping:1.45},
    circuit:{on:false,targetPolarity:1,actualPolarity:1,batteryRotation:0,batteryRotationTarget:0,currentActual:0,currentTarget:0},
    dynamics:{alpha:0,omega:0,x:0,fIdeal:0,fieldFactor:1,fEffective:0},
    reveal:{field:false,current:false,force:false,formula:false},
    missions:{close:false,flip:false,bchange:false},
    aha:{reversal:false,bEffect:false,offEffect:false,unlocked:false},
    evidence:[], trialSeq:0,
    ui:{speed:1,replaySeconds:0},
    engineering:{motion:null,need:'',constraint:'',brief:''},
    collab:{round:0}
  };
  const api={
    get(){return state},
    patch(fn){fn(state);listeners.forEach(f=>f(state))},
    subscribe(fn){listeners.push(fn);fn(state);return()=>{const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1)}},
    resetExperiment(){
      api.patch(s=>{
        s.circuit.on=false;s.circuit.targetPolarity=1;s.circuit.actualPolarity=1;s.circuit.batteryRotation=0;s.circuit.batteryRotationTarget=0;s.circuit.currentActual=0;s.circuit.currentTarget=0;
        s.dynamics.alpha=0;s.dynamics.omega=0;s.dynamics.x=0;s.dynamics.fIdeal=0;s.dynamics.fEffective=0;s.dynamics.fieldFactor=1;
        s.reveal.field=false;s.reveal.current=false;s.reveal.force=false;
        s.missions={close:false,flip:false,bchange:false};s.aha={reversal:false,bEffect:false,offEffect:false,unlocked:false};
        s.evidence=[];s.trialSeq=0;
      });
    }
  };
  P.state=api;
})(window);
