(function(global){
  const P=global.PILAR=global.PILAR||{};
  const handlers={};
  P.intent={
    on(name,fn){handlers[name]=fn},
    dispatch(name,payload){if(!handlers[name]){console.warn('Unknown intent',name);return}return handlers[name](payload)}
  };
})(window);
