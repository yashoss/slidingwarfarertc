const Game = require("./game");
const GameView = require("./game_view");
var HOST = location.origin.replace(/^http/, 'ws');
const connection = new WebSocket(HOST);

document.addEventListener("DOMContentLoaded", function() {
  const $ = require('jquery');
  const canvasEl = document.getElementById("sliding-warfare");
  canvasEl.width = Game.DIM_X;
  canvasEl.height = Game.DIM_Y;

  const ctx = canvasEl.getContext("2d");

  const bodyEl = document.getElementsByTagName("body")[0];
  const gameTitleEl = document.getElementById("game-title-container");
  let $gameInfoDiv = $("#game-info div");
  const gameEl = document.getElementById("canvas-container");
  const usernameInput = document.querySelector("#username");
  const loginBtn = document.querySelector("#loginBtn")
  let myConnection, dataChannel;
  let name = "", myName = "";
  let selectedUser = "";

  // Send offer on challenge
  $challengeBtn = $("<button id='challengeBtn'>CHALLENGE!</button>").bind("click", function() {
    if(selectedUser.length > 0) {
      console.log("Challenging: ", selectedUser);
      myConnection.createOffer(function(offer) {
        console.log();
        send({
          type: "offer",
          offer: offer
        });

        myConnection.setLocalDescription(offer);
      }, function(error){
        alert("An error has occured.");
      });
    }
  });

  loginBtn.addEventListener("click", function() {
    name = usernameInput.value;
    myName = usernameInput.value;
    if(name.length > 0){
      send({
        type: "login",
        name: name
      });
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
        // Create list of available users
        $gameInfoDiv.html("<ul id='user-list'></ul>");
        $userList = $("#user-list");
        for(let i in users) {
          if(users[i] === name) {
            $user = $(`<li class='self' id='self' key=${users[i]}>${users[i]}</li>`)
          }else {
            $user = $(`<li class='user' key=${users[i]}>${users[i]}</li>`)
            $user.bind("click", function(e) {
              $(".selected").removeClass("selected");
              $(this).addClass("selected");
              selectedUser = users[i];
            })
          }
          $userList.append($user);
        }
        $userList.after($challengeBtn);

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
        // myConnection.ondatachannel = function(event) {
        //    var receiveChannel = event.channel;
        //    receiveChannel.onmessage = function(event) {
        //       console.log("Got message:", event.data);
        //    };
        // };

        var dataChannelOptions = {
          reliable: false
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
      if(selectedUser) {
        message.name = selectedUser;
      }

      connection.send(JSON.stringify(message));
    };

    function onOffer(offer, name) {
      selectedUser = name;
      console.log("answering:", name);
      myConnection.setRemoteDescription(new RTCSessionDescription(offer));

      myConnection.createAnswer(function(answer) {
        myConnection.setLocalDescription(answer);

        send({
          type: "answer",
          answer: answer
        });

        gameTitleEl.remove();
        const newGame = new GameView(ctx, selectedUser, myName, dataChannel, myConnection, false);
        newGame.start();

      }, function(error) {
        alert("oops...error");
      });
    }

    function onAnswer(answer) {
      myConnection.setRemoteDescription(new RTCSessionDescription(answer));
      gameTitleEl.remove();
      const newGame = new GameView(ctx, myName, selectedUser, dataChannel, myConnection, true);
      newGame.start();
    }

    function onCandidate(candidate) {
      myConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

});
