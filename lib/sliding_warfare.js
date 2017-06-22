const Game = require("./game");
const GameView = require("./game_view");
const connection = new WebSocket('ws://localhost:9090');

document.addEventListener("DOMContentLoaded", function() {
  const $ = require('jquery');
  const canvasEl = document.getElementById("sliding-warfare");
  canvasEl.width = Game.DIM_X;
  canvasEl.height = Game.DIM_Y;

  const ctx = canvasEl.getContext("2d");
  const newGame = new GameView(ctx);

  const bodyEl = document.getElementsByTagName("body")[0];
  const gameTitleEl = document.getElementById("game-title-container");
  let $gameInfo = $("#game-info");
  const gameEl = document.getElementById("canvas-container");
  const usernameInput = document.querySelector("#username");
  const loginBtn = document.querySelector("#loginBtn")
  let connectedUser, myConnection, dataChannel;
  let name = "";

  loginBtn.addEventListener("click", function() {
    name = usernameInput.value;
    if(name.length > 0){
      send({
        type: "login",
        name: name
      });
      // TODO: move to accepted offer signal
      // newGame.start();
    }
  });

  connection.onmessage = function(message) {
      console.log("Got message", message.data);
      var data = JSON.parse(message.data);

      switch(data.type) {
        case "login":
          onLogin(data.success, data.users);
          break;
        case "offer":
          onOffer(data.offer, data.name);
          break;
        case "answer":
          onAnswer(data.answer);
          break;
        case "candidate":
          onCandidate(data.candidate);
          break;
        default:
          break;
      }
    }

    function onLogin(success, users) {
      if(success === false) {
        alert("Username already taken.")
      }else {
        $gameInfo.html("<ul id='user-list'></ul>");
        $userList = $("#user-list");
        for(let i in users) {
          $user = $(`<li id=${users[i]}>${users[i]}</li>`)
          $userList.append($user);
        }

        // Creating RTCPeerConnection object
        var configuration = {
          "iceservers": [{ "url": "stun:stun.1.google.com:19302" }]
        }

        myConnection = new RTCPeerConnection(configuration);
        console.log("PeerConnection object created");
        console.log(myConnection);

        // setup ice handling
        myConnection.onicecandidate = function(event) {

          if (event.candidate) {
            send({
              type: "candidate",
              candidate: event.candidate
            });
          }
        };

        // TODO: handle data transfer for game logic
        myConnection.ondatachannel = function(event) {
           var receiveChannel = event.channel;
           receiveChannel.onmessage = function(event) {
              console.log("Got message:", event.data);
           };
        };

        var dataChannelOptions = {
          reliable: true
        };

        dataChannel = myConnection.createDataChannel("myDataChannel", dataChannelOptions);
      }

    };

    connection.onopen = function() {
      console.log("Connected");
    };

    connection.onerror = function(err) {
      console.log("Got error", err);
    };

    // Alias for sending messages in JSON format
    function send(message) {
      if(connectedUser) {
        message.name = connectedUser;
      }

      connection.send(JSON.stringify(message));
    };



});
