(function(global){
  const P=global.PILAR=global.PILAR||{};
  P.vision={
    enabled:false,
    capabilities:{handPose:false,faceReaction:false},
    // Hook untuk v0.7. Adapter vision hanya boleh mengirim intent yang sama dengan mouse/touch.
    emitGesture(name,payload){if(!this.enabled)return;const map={thumb_up:'LOCK_PREDICTION',fist:'TOGGLE_SWITCH',flip_hand:'FLIP_BATTERY'};const intent=map[name];if(intent)P.intent.dispatch(intent,payload)},
    setEnabled(v){this.enabled=!!v}
  };
})(window);
