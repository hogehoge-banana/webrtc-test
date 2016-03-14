// web rtc test
(function(){


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

  // initialize websocket
  var url = "wss://" + location.host + "/ws";
  var ws = new Socket(url, function(type, msg) {
    if (type === 'connected') {
      var roomname = getRoomName();
      ws.send('enter', roomname);
    } else {
      var data = eval("(" +msg + ')');
      if (type === 'offer') {
        console.log("Received offer");
        onOffer(data);
      } else if (type === 'answer' && peerStarted) {
        console.log('Received answer, settinng answer SDP');
        onAnswer(data);
      } else if (type === 'candidate' && peerStarted) {
        console.log('Received ICE candidate...');
        onCandidate(data);
      } else if (type === 'user dissconnected' && peerStarted) {
        console.log("user disconnected");
        stop();
      }
    }
  });



  // ---- UI ----
  $('#connect').click(function(){
    connect();
  });
  //
  // start local video
  //
  function startVideo() {
    navigator.webkitGetUserMedia(
      {video: true, audio: true},
      function (stream) { // success
        localStream = stream;
        localVideo.src = window.URL.createObjectURL(stream);
        localVideo.play();
        localVideo.volume = 0;
      },
      function (error) { // error
        console.error('An error occurred: [CODE ' + error.code + ']');
        console.error(error.message);
        return;
      }
    );
  }

  // stop local video
  function stopVideo() {
    localVideo.src = "";
    localStream.stop();
  }

  function hangUp() {
    console.log("Hang up.");
    stop();
  }

  // logic

  // -- start flow --

  // start the connection upon user request
  function connect() {
    if (!peerStarted && localStream) {
      sendOffer();
      peerStarted = true;
    } else {
      alert("Local stream not running yet - try again.");
    }
  }
  // send offer
  function sendOffer() {
    peerConnection = prepareNewConnection();
    peerConnection.createOffer(function (sessionDescription) { // in case of success
      peerConnection.setLocalDescription(sessionDescription);
      sendSDP(sessionDescription);
    }, function () { // in case of error
      console.log("Create Offer failed");
    }, mediaConstraints);
  }

  // -- start flow end --

  // -- on offer received flow --

  function onOffer(evt) {
    setOffer(evt);
    sendAnswer(evt);
    peerStarted = true;
  }

  function setOffer(evt) {
    if (peerConnection) {
      console.error('peerConnection alreay exist!');
      return;
    }
    peerConnection = prepareNewConnection();
    peerConnection.setRemoteDescription(new RTCSessionDescription(evt));
  }

  function sendCandidate(candidate) {
    var text = JSON.stringify(candidate);
    console.log("---sending candidate text ---");
    textForSendICE.value = (textForSendICE.value + CR + iceSeparator + CR + text + CR);
    textForSendICE.scrollTop = textForSendICE.scrollHeight;
    ws.send(candidate.type, candidate)
  }

  function sendAnswer(evt) {
    console.log('sending Answer. Creating remote session description...' );
    if (!peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }
    peerConnection.createAnswer(function (sessionDescription) { // in case of success
      peerConnection.setLocalDescription(sessionDescription);
      sendSDP(sessionDescription);
    }, function () { // in case of error
      console.log("Create Answer failed");
    }, mediaConstraints);
  }

  // ---- on answer ----
  function onAnswer(evt) {
    console.log("Received Answer...");
    setAnswer(evt);
  }
  function setAnswer(evt) {
    if (! peerConnection) {
      console.error('peerConnection NOT exist!');
      return;
    }
    peerConnection.setRemoteDescription(new RTCSessionDescription(evt));
  }

  // ----  utility ----

  function sendSDP(sdp) {
    var text = JSON.stringify(sdp);
    console.log("---sending sdp text ---");
    textForSendSDP.value = text;
    // send oover websocket
    ws.send(sdp.type, sdp)
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

  function onCandidate(evt) {
    var candidate = new RTCIceCandidate({sdpMLineIndex:evt.sdpMLineIndex, sdpMid:evt.sdpMid, candidate:evt.candidate});
    console.log("Received Candidate...");
    peerConnection.addIceCandidate(candidate);
  }

  // ---------------------- connection handling -----------------------
  function prepareNewConnection() {
    var pc_config = {"iceServers":[]};
    var peer = null;

    // when remote adds a stream, hand it on to the local video element
    function onRemoteStreamAdded(event) {
      console.log("Added remote stream");
      remoteVideo.src = window.URL.createObjectURL(event.stream);
    }

    // when remote removes a stream, remove it from the local video element
    function onRemoteStreamRemoved(event) {
      console.log("Remove remote stream");
      remoteVideo.src = "";
    }

    try {
      peer = new webkitRTCPeerConnection(pc_config);
      // send any ice candidates to the other peer
      peer.onicecandidate = function (evt) {
        if (evt.candidate) {
          sendCandidate({
            type: "candidate",
            sdpMLineIndex: evt.candidate.sdpMLineIndex,
            sdpMid: evt.candidate.sdpMid,
            candidate: evt.candidate.candidate
          });
        } else {
          console.log("End of candidates. ------------------- phase=" + evt.eventPhase);
        }
      };

      console.log('Adding local stream...');
      peer.addStream(localStream);

      peer.addEventListener("addstream", onRemoteStreamAdded, false);
      peer.addEventListener("removestream", onRemoteStreamRemoved, false);

    } catch (e) {
      console.log("Failed to create peerConnection, exception: " + e.message);
    }
    return peer;
  }


  function getRoomName() {
    var url   = location.href;
    urls    = url.split("?");
    if (1 < urls.length && urls[1]) {
      return urls[1]
    } else {
      return 'default'
    }
  }

  startVideo();

})();
