// This is the Node. Consider it to be the server. This script is launched when the node launches. 
// This script needs to contain end-points which apply the game logic to the client's game-state and the server's game-state.
// Serverside game-state (autoratative game-state) can be managed here.

const {generateKeyPairSync, sign, createSign, createVerify, generateKey} = require('crypto');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { makeId, checkWin, checkTie, verifyMessage, signMessage } = require('./server_utils/server_utils')
const nacl = require("tweetnacl");
const bs58 = require('bs58');
const { Connection, PublicKey, Keypair } = require('@_koii/web3.js');






// Init Vars // Server Vars
const app = express();
app.use(express.json())

const rooms = {};

var turnLog = {};
var serverGameEndState = false;

// Init Vars // Game Vars
let currentServerPlayer = "player1";

player1AwaitingReset = false;
player2AwaitingReset = false;

let player1 = false;
let player2 = false;
let lobbyReady = false;

const winning_combinations = [
    ['square0', 'square1', 'square2'],
    ['square3', 'square4', 'square5'],
    ['square6', 'square7', 'square8'],
    ['square0', 'square3', 'square6'],
    ['square1', 'square4', 'square7'],
    ['square2', 'square5', 'square8'],
    ['square0', 'square4', 'square8'],
    ['square2', 'square4', 'square6']];

const newBoard = {
    'square0': null,
    'square1': null,
    'square2': null,
    'square3': null,
    'square4': null,
    'square5': null,
    'square6': null,
    'square7': null,
    'square8': null
};

var board = structuredClone(newBoard);

// Init Vars // Key Pair
const options = {
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.cert")
};

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 520,
    publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});



// Configuration
process.env.SERVER_URL = "127.0.0.1:1999"
process.env.PRIVATE_SERVER_KEY = privateKey;
process.env.PUBLIC_SERVER_KEY = publicKey;
var httpsServer = https.createServer(options, app);
// var httpServer = http.createServer(options, app);
app.use(express.static(path.join(__dirname, 'client')));



// Endpoints
app.get('/serverstatus', (req, res) => {
    res.send('<h1>Server is online.<h1>');
});

app.get('/game', (req, res) => {
    res.sendFile(__dirname + "/client/main.html");
})

app.get('/game/state', (req, res) => {
    res.send({
        lobbyReady:lobbyReady,
        serverGameEndState: serverGameEndState,
        player1AwaitingReset:player1AwaitingReset,
        player2AwaitingReset:player2AwaitingReset,
        currentServerPlayer:currentServerPlayer
    });
    res.end();
});

app.get("/game/board", (req, res) => {
    res.send({
        board:board,
        lobbyReady:lobbyReady,
        serverGameEndState: serverGameEndState,
        player1AwaitingReset:player1AwaitingReset,
        player2AwaitingReset:player2AwaitingReset,
        currentServerPlayer:currentServerPlayer
    });
    res.end();
})

app.get('/createGame', (req, res) => {
    // const uniqueRoomID = makeId(6);
    // rooms[uniqueRoomID] = {};
    // console.log("Room Made At: ", uniqueRoomID)
    // Associate Players with certain IDs (ROOM ID), only serve those players
    // socket.join(uniqueRoomID);
    // console.log("Emitting 'newGame'")
    // socket.emit("newGame", {uniqueRoomID: uniqueRoomID});
    
    player1 = true;
    if (player2) {
        lobbyReady = true;
    }
    res.send({data:"Someone Created a Game"})
    res.end();
})

app.get('/joinGame', (req, res) => {
    player2 = true;
    // res.send({some:lobbyReady});
    if (player1) {
        lobbyReady = true;
    }
    res.send({data:"Someone Joined a Game"})
    res.end();
})

app.post('/game/reset', (req, res) => {
    let resetRequestFromPlayer = req.body.player;

    if (resetRequestFromPlayer === "player1") {
        if (player1AwaitingReset) {
            board = structuredClone(newBoard);
            player1AwaitingReset = false;
        } else {
            console.error("player1 is not awaiting a reset on the server.")
        }
    } else if (resetRequestFromPlayer === "player2"){
        if (player1AwaitingReset) {
            board = structuredClone(newBoard);
            player2AwaitingReset = false;
        } else {
            console.error("player2 is not awaiting a reset on the server.")
        }
    } else {
        console.error("No valid player found.")
    }

    serverGameEndState = false;

    res.send({
        board:board,
        lobbyReady:lobbyReady,
        serverGameEndState: serverGameEndState,
        player1AwaitingReset:player1AwaitingReset,
        player2AwaitingReset:player2AwaitingReset,
        currentServerPlayer:currentServerPlayer
    });
    res.end();
})

app.post('/game/playerMadeMove', (req, res) => {
    // console.log(req.body)
    let playerMove = req.body.playerMove;
    // console.log(currentServerPlayer)
    // console.log(req.body.player)

        if (board[playerMove] === null) {
            console.log(req.body.player, "sent move", playerMove)
            if (currentServerPlayer === "player1" && req.body.player === "player1") {
                try {
                    console.log(`Server acknowledged ${req.body.player} made move ${playerMove}`)
        
                    // access the playerMove from the payload
                    // tell the room what the most recent move has been (BUT EVENTUALLY WE WANT TO STORE THIS IN A JSON)
                    // rooms[payload.uniqueRoomID].p1Move = playerMove;
        
                    // update the servers board
                    board[playerMove] = "player1"
                    
                    // check win
                    if (checkWin(currentServerPlayer, winning_combinations, board)) {
                        
                        // emit to the caller
                        // socket.emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer})
                        
                        // emit to the room
                        // socket.to(payload.uniqueRoomID).emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer})
                        
                        console.log("Server found a win")
                        serverGameEndState = currentServerPlayer;
                        // reset the board
                        player1AwaitingReset = true
                        player2AwaitingReset = true

                        return null
                    }
                    
                    // check tie
                    if (checkTie(board)) {
                        // emit to the caller
                        // socket.emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                        // emit to the room
                        // socket.to(payload.uniqueRoomID).emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                        
                        serverGameEndState = "tie";
                        // reset the board
                        player1AwaitingReset = true
                        player2AwaitingReset = true
                        // console.log("Server found a win");
                        return null;
                    }
                    
                    // pass the turn off to the other player
                    console.log("Server confirmed move. Passing to next player.")
                    currentServerPlayer = "player2"
        

                    // Log turn to RAM
                    turnKey = "Turn " + (Object.keys(turnLog).length + 1)
                    turnLog[turnKey] = {currentServerPlayer: currentServerPlayer, playerMove: playerMove}
                    // socket.emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer})
                    // socket.in(payload.uniqueRoomID).emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer})
                } catch(e) {
                    console.log(`Server failed to acknowledge ${req.body.player} made a move: `, e)
                }
            } else if (currentServerPlayer === "player2" && req.body.player === "player2") {
                try {
                    console.log(`Server acknowledged ${req.body.player} made a move`)
                    let playerMove = req.body.playerMove;
        
                    // access the playerMove from the payload
                    // tell the room what the most recent move has been (BUT EVENTUALLY WE WANT TO STORE THIS IN A JSON)
                    // rooms[payload.uniqueRoomID].p1Move = playerMove;
        
                    // update the servers board
                    board[playerMove] = "player2";
                    
                    // check win
                    if (checkWin(currentServerPlayer, winning_combinations, board)) {
                                
                        // emit to the caller
                        // socket.emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                        
                        // emit to the room
                        // socket.to(payload.uniqueRoomID).emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                        
                        serverGameEndState = currentServerPlayer;

                        // reset the board
                        player1AwaitingReset = true
                        player2AwaitingReset = true

                        console.log("Server found a win");
                        return null;
                    }
                    
                    // check tie
                    if (checkTie(board)) {
                        // emit to the caller
                        // socket.emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                        // emit to the room
                        // socket.to(payload.uniqueRoomID).emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                        
                        serverGameEndState = "tie";

                        // reset the board
                        player1AwaitingReset = true
                        player2AwaitingReset = true
                        console.log("Server found a tie");
                        return null;
                    }
                    
                    // pass the turn off to the other player
                    console.log("Server confirmed move. Passing to next player.")
                    currentServerPlayer = "player1";
        


                    // Log turn to RAM
                    turnKey = "Turn " + (Object.keys(turnLog).length + 1)
                    turnLog[turnKey] = {currentServerPlayer: currentServerPlayer, playerMove: playerMove}

                    // socket.emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                    // socket.in(payload.uniqueRoomID).emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                } catch(e) {
                    console.log(`Server failed to acknowledge ${req.body.player} made a move: `, e)
                }
            } else {
                console.log(currentServerPlayer)
                console.log(req.body.player)
                console.error("Could not find a valid currentServerPlayer. A player is likely trying to make a move when it is not their turn (or the server has failed and requires a restart).");
            }
        } else {
            console.error("Client tried an invalid move.");
        }
})

app.post('/game/verify', async (req, res) => {
    console.log(req.body)

    const message = req.body.message
    const signature = Uint8Array.from(Object.values(req.body.sig.signature))
    const publicKey = req.body.sig.publicKey
    console.log("ASasdS",publicKey)

    let zz = new PublicKey(publicKey).toBytes()
    console.log(zz)
    const signVerify = nacl.sign.detached.verify(new TextEncoder().encode(message), signature, zz )
    console.log(signVerify)

    // console.log(req.body.sig.signature)
    // let array = Object.values(req.body.sig.signature);
    // console.log(array)
    // let uint = Uint8Array.from(array)
    // console.log(uint)
    // console.log("REQ BODY", req.body.message, typeof(req.body.message))
    // let payload = await payloadSigning(req.body.message)
    // console.log(payload)
    // console.log(verify(req.body.message, encode(Object.values(req.body.sig.signature)), req.body.sig.publicKey))
    // signature = res.get(signature)
    // res.end();

    // console.log(verify("hello", signature, window.k2.publicKey))
})

// app.use("/game", router);

// router.use('/game', (req, res, next) => {

// });




// Listen
// httpServer.listen(1999,  () => {
//     console.log('Listening on port 1999');
// });
httpsServer.listen(1999, "127.0.0.1",  () => {
    console.log('Listening on port 1999');
});


// Verify Signature
async function verify(message, signature, publicKey) {
    console.log("TYPE OF SIG", typeof(signature))
    console.log(signature)

    try {
        const payload = nacl.sign.open(
          await bs58Decode(message),
          await bs58Decode(publicKey),
        );
        if (!payload) return { error: 'Invalid signature' };
        return { data: decodePayload(payload) };
      } catch (e) {
        console.error(e);
        return { error: `Verification failed: ${e}` };
      }
      
    // const encodedMessage = encode(message); // Encode message using helper function
    // const verified = nacl.sign.detached.verify(
    //   message,
    //   signature,
    //   publicKey
    // );
  
    // return verified;
}

    
async function payloadSigning(body) {
    const msg = new TextEncoder().encode(JSON.stringify(body));
    console.log("MSG", msg)
    const signedMessage = nacl.sign(
        msg,
        new Keypair().secretKey
        
    );
    console.log(signedMessage)
    return await bs58Encode(signedMessage);
}

async function bs58Encode(data) {
return bs58.default.encode(
    Buffer.from(data.buffer, data.byteOffset, data.byteLength),
);
}

async function bs58Decode(data) {
    return new Uint8Array(bs58.default.decode(data));
}



// Encode message
const encode = (message) => {
    const encoder = new TextEncoder();
    const messageUint8 = encoder.encode(message); // Takes a string and returns a Uint8Array

    return messageUint8;
  };
  
  // Decode data
  const decode = (data) => {
    const decoder = new TextDecoder();
    const decodedMessage = decoder.decode(data); // Returns a string containing the text decoded
  
    return decodedMessage;
  };