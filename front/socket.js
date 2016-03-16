(function(global){

  var STATE = {
    INIT: 0,
    CONNECTING: 1,
    ENTERING: 2,
    ESTABLISSHED: 3
  };

  var socket = function(url, cb) {
    this.url = url;
    this.callback = cb;
    this.ready = false;
    this.state = STATE.INIT;
  };

  socket.prototype.connect = function(){
    if (this._connecting) {
      return this._connecting;
    }
    this._init();
    var self = this;
    this._connecting = new Promise(function(resolve, reject) {
      var ws = new WebSocket(self.url);

      ws.onmessage = function(evt){
        var msg = eval("(" + evt.data + ")");
        if (msg.Type === 'connected') {
          console.log('connection ready')
          self.channel = msg.Msg;
          resolve();
        } else {
          console.log('reject message because not ready state.')
        }
      }

      //this._handleMessage;

      ws.onopen = function (evt){
        console.log('on open');
      };

      ws.onclose = function (evt){
        console.log("---- disconnected ----");
        self._init();
      };

      ws.onerror = function(evt) {
        self._onerror(evt);
        reject();
      };

      self.ws = ws;
    });
    return this._connecting;
  };

  socket.prototype.enter = function(roomname) {
    var self = this;
    self.roomname = roomname;
    return this._enter();
  };

  socket.prototype.unicast = function(to, type, data) {
    var self = this;
    self._send(type, data, 'uni', to)
  };

  socket.prototype.broadcast = function(type, data) {
    var self = this;
    self._send(type, data, 'bro', self.roomname)
  };

  socket.prototype._init = function(){
    this.ws = null;
    this.channel = null;
    this.ready = false;
    this._connecting = null;
    this.state = STATE.INIT;
  };

  socket.prototype._send = function(type, data, destType, dest) {
    try {
      console.log('send: ' + type);
      var msg = {
        Type: type,
        Msg: JSON.stringify(data)
      };
      var frame = {
        Type: destType,
        Dest: dest,
        Message: msg
      };
      var json = JSON.stringify(frame);
      this.ws.send(json)
    } catch (e) {
      console.error(e);
    }
  };

  socket.prototype._enter = function() {
    var self = this;
    return this.connect().then(function() {
      return new Promise(function(resolve, reject){
        self.ws.onmessage = function(evt) {
          var msg = eval("(" + evt.data + ")");
          if (msg.Type === 'enter' && msg.From === self.channel) {
            console.log('room ready');
            resolve();
          }
        };

        self.ws.onerror = function(evt) {
          self._onerror(evt);
          reject();
        };
        self._send('enter', self.roomname, 'bro', self.roomname);
      }).then(function(){
        self.ready = true;
        self.ws.onmessage = function(evt) {
          var msg = eval("(" + evt.data + ")");
          if (self.channel !== msg.From) {
            self.callback(msg.Type, msg)
          } else {
            console.debug('reject self message')
          }
        }
      });
    });
  };

  socket.prototype._onerror = function(evt) {
    console.error("websocket error");
    console.error(evt);
    if (this.ws) {
      this.ws.close();
    }
    this._init();
  };

  global.Socket = socket;
})(window);
