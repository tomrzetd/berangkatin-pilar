(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  const payload=[34,32,54,32,62,81,87,86,37,59,62,32,58,93,84,92,16,46,57,51,39,30,70,95,32,103,46,36,62,81,95,83,34,103,37,37];
  const key=[80,73,76,65,82,48,53,50];
  const decode=()=>String.fromCharCode(...payload.map((v,i)=>v^key[i%key.length]));
  const hash=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0').toUpperCase()};
  const version='0.5.2';
  const fingerprint=hash(decode()+'|PILAR|Lorentz|'+version);
  P.ownership={
    version,
    fingerprint,
    owner(){return decode()},
    publicText(){return 'by : '+decode()},
    tag(){return 'PILAR-LTZ-'+fingerprint.slice(0,6)},
    stamp(target){
      if(!target)return;
      target.dataset.pilarBuild=version;
      target.dataset.pilarFingerprint=fingerprint;
      target.textContent=this.publicText()+' · '+this.tag();
    },
    signScene(scene){
      if(!scene)return;
      scene.userData=scene.userData||{};
      scene.userData.pilar={build:version,fingerprint,ownerXor:payload.slice()};
    }
  };
})(window);
