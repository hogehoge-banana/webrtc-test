// web rtc test
(function(global){

  var localVideo = document.getElementById('local-video');
  var remoteVideo = document.getElementById('remote-video');
  var localStream = null;
  var peerConnection = null;
  var peerStarted = false;
  var mediaConstraints = { 'mandatory': {
    'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true }};
  // ----------------- handshake --------------
  var textForSendSDP = document.getElementById('text-for-send-sdp');
  var textForSendICE = document.getElementById('text-for-send-ice');
  var textToReceiveSDP = document.getElementById('text-for-receive-sdp');
  var textToReceiveICE = document.getElementById('text-for-receive-ice');
  var iceSeparator = '------ ICE Candidate -------';
  var CR = String.fromCharCode(13);
  var myChannel = null;

  var connections = {}; // key: channel, value: connection

  // initialize websocket
  var url = "wss://" + location.host + "/ws";
  var ws = new Socket(url, function(type, msg) {

    console.log('received type:' + type)

    if (type === 'offer') {
      onOffer(msg);
    } else if (type === 'answer') {
      onAnswer(msg);
    } else if (type === 'candidate') {
      onCandidate(msg);
    } else if (type === 'user dissconnected') {
      stop();
    } else if (type === 'enter') {
      sendOffer(msg);
    } else if (type === 'leave') {
      onLeave(msg);
    }
  });

  // ---- UI ----
  //
  // start local video
  //
  function startVideo() {
    return new Promise(function (resolve, reject) {
      navigator.webkitGetUserMedia(
        {video: true, audio: true},
        function (stream) { // success
          localStream = stream;
          localVideo.src = window.URL.createObjectURL(stream);
          localVideo.play();
          localVideo.volume = 0;
          console.log('localStream ready')
          resolve();
        },
        function (error) { // error
          console.error('An error occurred: [CODE ' + error.code + ']');
          console.error(error.message);
          reject();
        }
      );
    });
  }

  // stop local video
  function stopVideo() {
    localVideo.src = "";
    localStream.stop();
    localStream = null;
  }

  function hangUp() {
    console.log("Hang up.");
    stop();
  }

  // logic

  // -- start flow --

  // start the connection upon user request
  function sendOffer(data) {
    var conn = prepareNewConnection(data.From);
    conn.createOffer(function (sessionDescription) {
      // in case of success
      conn.peer.setLocalDescription(sessionDescription);
      sendSDP(data.From, sessionDescription);
    }, function () {
      // in case of error
      console.log("Create Offer failed");
    }, mediaConstraints);
  }

  // -- start flow end --

  // -- on offer received flow --

  function onOffer(msg) {
    var sdp = JSON.parse(msg.Msg);
    var connection = prepareNewConnection(msg.From);
    connection.peer.setRemoteDescription(new RTCSessionDescription(sdp));
    addConnection(connection);
    sendAnswer(msg);
  }

  function sendCandidate(id, candidate) {
    var text = JSON.stringify(candidate);
    textForSendICE.value = (textForSendICE.value + CR + iceSeparator + CR + text + CR);
    textForSendICE.scrollTop = textForSendICE.scrollHeight;
    ws.unicast(id, candidate.type, candidate)
  }

  function sendAnswer(evt) {
    var conn = getConnection(evt.From)
    var peer = conn.peer;
    peer.createAnswer(function (sessionDescription) { // in case of success
      peer.setLocalDescription(sessionDescription);
      sendSDP(evt.From, sessionDescription);
    }, function () { // in case of error
      console.log("Create Answer failed");
    }, mediaConstraints);
  }

  // ---- on answer ----
  function onAnswer(evt) {
    var data = eval("(" + evt.Msg + ')');

    var conn = getConnection(evt.From);
    conn.peer.setRemoteDescription(new RTCSessionDescription(data));
  }

  // ---- on leave message ----

  function onLeave(msg) {
    console.log('remove connection:' + msg.From)
    removeConnection(msg.From)
    $('#' + msg.From).remove();
  }

  // ----  utility ----

  function sendSDP(id, sdp) {
    var text = JSON.stringify(sdp);
    textForSendSDP.value = text;
    ws.unicast(id, sdp.type, sdp)
  }


  // stop the connection upon user request
  function stop() {
    peerConnection.close();
    peerConnection = null;
    peerStarted = false;
  }


  function onSDP() {
    var text = textToReceiveSDP.value;
    var evt = JSON.parse(text);
    if (peerConnection) {
      onAnswer(evt);
    } else {
      onOffer(evt);
    }

    textToReceiveSDP.value ="";
  }


  //--- multi ICE candidate ---
  function onICE() {
    var text = textToReceiveICE.value;
    var arr = text.split(iceSeparator);
    for (var i = 1, len = arr.length; i < len; i++) {
      var evt = JSON.parse(arr[i]);
      onCandidate(evt);
    }

    textToReceiveICE.value ="";
  }

  function onCandidate(msg) {
    var evt = JSON.parse(msg.Msg);
    var conn = getConnection(msg.From);

    var candidate = new RTCIceCandidate({
      sdpMLineIndex:evt.sdpMLineIndex,
      sdpMid:evt.sdpMid,
      candidate:evt.candidate});
    conn.peer.addIceCandidate(candidate);
  }

  // ---------------------- connection handling -----------------------
  function prepareNewConnection(id) {
    var connection = new Connection(id);
    addConnection(connection);

    var pc_config = {"iceServers":[]};
    var peer = null;

    try {
      peer = new webkitRTCPeerConnection(pc_config);
      // send any ice candidates to the other peer
      peer.onicecandidate = function (evt) {
        if (evt.candidate) {
          console.log('on candidate');
          sendCandidate(connection.id, {
            type: "candidate",
            sdpMLineIndex: evt.candidate.sdpMLineIndex,
            sdpMid: evt.candidate.sdpMid,
            candidate: evt.candidate.candidate
          });
        } else {
          console.log("candidate end. ------- phase=" + evt.eventPhase);
          connection.ready = true;
        }
      };

      peer.addStream(localStream);

      peer.addEventListener("addstream", function(event){
        console.log("Added remote stream");
        var $video = $('<video class="remote-video" autoplay></video>');
        $video.attr('id', id);
        $("#remote-videos").append($video);
        $video.get(0).src = window.URL.createObjectURL(event.stream);
      }, false);

      peer.addEventListener("removestream", function(event){
        // when remote removes a stream, remove it from the local video element
        $('#' + id).remove();
      }, false);

      connection.peer = peer;

    } catch (e) {
      console.log("Failed to create peerConnection, exception: " + e.message);
    }
    return connection;
  }

  function isLocalStreamReady() {
    return localStream != null;
  }


  function getRoomName() {
    var url   = location.href;
    urls    = url.split("?");
    if (1 < urls.length && urls[1]) {
      return urls[1];
    } else {
      room = prompt('ルーム名を入力してください', 'general');
      location.search = room;
      return room;
    }
  }

  function addConnection(conn) {
    connections[conn.id] = conn;
  }
  function removeConnection(connId) {
    delete connections[connId];
  }

  function getConnection(id) {
    return connections[id];
  }

  function enterRoom(){
    return ws.connect().then(function(){
      var roomname = getRoomName();
      ws.enter(roomname);
    });
  }

  startVideo().then(function(){
    enterRoom();
  });
})(window);
