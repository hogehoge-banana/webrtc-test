(function(global){
  var Obj = function(id) {
    this.id = id;
    this.peer = null;
    this.ready = false;
    this.iceReady = false;
  };

  Obj.prototype.createOffer = function(success, error, options) {
    return this.peer.createOffer(success, error, options);
  };

  global.Connection = Obj;
})(window);
