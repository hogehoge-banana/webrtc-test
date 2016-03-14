(function(global){
  function onopen() {

  }
  var socket = function(url, cb) {
    var ws = new WebSocket(url);
    var self = this;

    this.channel = null;

    ws.onopen = function (evt){
      console.log("on open");
    };

    ws.onclose = function (evt){
      console.log("disconnected");
    };

    ws.onmessage = function(evt) {
      var msg = eval("(" + evt.data + ")");
      var type = msg.Type;

      if (type === 'connected') {
        self.channel = msg.Channel;
        cb(type)
      } else if (self.channel !== msg.Channel) {
        cb(type, msg.Msg)
      }
    };

    ws.onerror = function(evt) {
      console.log("on error");
    };
    this.ws = ws;
  };

  socket.prototype.send = function(type, data) {
    var msg = {
      Type: type,
      Msg: JSON.stringify(data),
      Channel: this.channel
    };
    var json = JSON.stringify(msg);
    this.ws.send(json)
  };

  global.Socket = socket;
})(window);
