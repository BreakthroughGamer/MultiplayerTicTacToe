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
// let submissionObject = {}

// let playerWallets = {}

const rooms = {};

var turnLog = {};
var serverGameEndState = false;

// Init Vars // Game Vars
let currentServerPlayer = "player1";

playersAwaitingReset = false;

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
        playersAwaitingReset:playersAwaitingReset,
        currentServerPlayer:currentServerPlayer
    });
    res.end();
});

app.get("/game/board", (req, res) => {
    // console.log("Sending Game Board...")
    res.send({
        board:board,
        lobbyReady:lobbyReady,
        serverGameEndState: serverGameEndState,
        playersAwaitingReset:playersAwaitingReset,
        currentServerPlayer:currentServerPlayer
    });
    res.end();
});

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

    // signature = signMessage(JSON.stringify(turnLog))
    // fs.writeFile("example.json", JSON.stringify(turnLog), (e) => console.log(e))
    // fs.writeFile("example.json", signature, (e) => console.log(e))

    if (playersAwaitingReset) {
        console.log("Received reset request. TURN LOG", turnLog)
        console.log("Resetting board. Request from", resetRequestFromPlayer)
        board = structuredClone(newBoard);
        console.log("Board", board)
        playersAwaitingReset = false;
        serverGameEndState = false;
    } else {
        console.error("players not awaiting a reset on the server.")
    }
    

    res.send({
        board:board,
        lobbyReady:lobbyReady,
        serverGameEndState: serverGameEndState,
        playersAwaitingReset:playersAwaitingReset,
        currentServerPlayer:currentServerPlayer
    });

    console.log(turnLog)

    res.end();
})

app.post('/game/playerMadeMove', (req, res) => {
    // console.log(req.body)
    let playerMoveChoice = req.body.playerMoveChoice;
    let playerWallet = req.body.playerWallet;
    // console.log(currentServerPlayer)
    // console.log(req.body.player)
    console.log("Server started processing move.")


    if (board[playerMoveChoice] === null && serverGameEndState === false) {
        console.log(req.body.player, "sent move", playerMoveChoice)
        if (currentServerPlayer === "player1" && req.body.player === "player1") {
            try {
                console.log(`Server acknowledged ${req.body.player} made move ${playerMoveChoice}`)
    
                // access the playerMove from the payload
                // tell the room what the most recent move has been (BUT EVENTUALLY WE WANT TO STORE THIS IN A JSON)
                // rooms[payload.uniqueRoomID].p1Move = playerMove;
    
                // update the servers board
                board[playerMoveChoice] = "player1"
                
                // check win/tie/else
                if (checkWin(currentServerPlayer, winning_combinations, board)) {
                    
                    // emit to the caller
                    // socket.emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer})
                    
                    // emit to the room
                    // socket.to(payload.uniqueRoomID).emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer})
                    
                    console.log("Server found a win")
                    console.log(board)
                    serverGameEndState = currentServerPlayer;
                    // reset the board
                    playersAwaitingReset = true;

                } else if (checkTie(board)) {
                    // emit to the caller
                    // socket.emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                    // emit to the room
                    // socket.to(payload.uniqueRoomID).emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                    
                    console.log("Server found a tie.")
                    console.log(board)

                    serverGameEndState = "tie";
                    // reset the board
                    playersAwaitingReset = true;
                } else {
                    // pass the turn off to the other player
                    console.log("Server confirmed move. Passing turn to player2. Board is now", board)
                    currentServerPlayer = "player2"
        

                    // Log turn to RAM
                    turnKey = "Turn " + (Object.keys(turnLog).length + 1)
                    turnLog[turnKey] = {currentServerPlayer: currentServerPlayer, playerWallet: playerWallet ,playerMoveChoice: playerMoveChoice}

                    // socket.emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer})
                    // socket.in(payload.uniqueRoomID).emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer})
                }


            } catch(e) {
                console.log(`Server failed to acknowledge ${req.body.player} made a move: `, e)
            }
        } else if (currentServerPlayer === "player2" && req.body.player === "player2") {
            try {
                console.log(`Server acknowledged ${req.body.player} made a move`)
                let playerMoveChoice = req.body.playerMoveChoice;
    
                // access the playerMove from the payload
                // tell the room what the most recent move has been (BUT EVENTUALLY WE WANT TO STORE THIS IN A JSON)
                // rooms[payload.uniqueRoomID].p1Move = playerMove;
    
                // update the servers board
                board[playerMoveChoice] = "player2";
                
                // check win
                if (checkWin(currentServerPlayer, winning_combinations, board)) {
                            
                    // emit to the caller
                    // socket.emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                    
                    // emit to the room
                    // socket.to(payload.uniqueRoomID).emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                    
                    console.log("Server found a win")
                    console.log(board)
                    serverGameEndState = currentServerPlayer;

                    // reset the board
                    playersAwaitingReset = true;

                    return null;
                }
                
                // check tie
                if (checkTie(board)) {
                    // emit to the caller
                    // socket.emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                    // emit to the room
                    // socket.to(payload.uniqueRoomID).emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                    
                    console.log("Server found a tie");
                    console.log(board)
                    serverGameEndState = "tie";

                    // reset the board
                    playersAwaitingReset = true;
                    return null;
                }
                
                // pass the turn off to the other player
                console.log("Server confirmed move. Passing to next player1. Board is now", board)
                currentServerPlayer = "player1";
    


                // Log turn to RAM
                turnKey = "Turn " + (Object.keys(turnLog).length + 1)
                turnLog[turnKey] = {currentServerPlayer: currentServerPlayer, playerWallet: playerWallet ,playerMoveChoice: playerMoveChoice}


                // socket.emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
                // socket.in(payload.uniqueRoomID).emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentServerPlayer: currentServerPlayer});
            } catch(e) {
                console.log(`Server failed to acknowledge ${req.body.player} made a move: `, e)
            }
        } else {
            console.log("Current server player is", currentServerPlayer, "and request comes from", req.body.player)
            console.error("Could not find a valid currentServerPlayer. A player is likely trying to make a move when it is not their turn (or the server has failed and requires a restart).");
        }
    } else {
        console.error("Client tried an invalid move.");
    }
    console.log("Server completed processing move.")
    res.end()
})

app.post('/game/verify', async (req, res) => {
    // console.log(req.body)
    // console.log("Message Req:", req.body.playerWallet);
    // console.log("Signature Req:", req.body.signature);
    // console.log("Public Key Req:", req.body.publicKey);
    
    // console.log("Decoded Signature", decodedSignature);
    let message = Array.from(req.body.playerWallet).map(char => char.charCodeAt(0));
    let signature = req.body.signature;
    let publicKey = req.body.publicKey;
    // console.log("Signature:", signature);
    // console.log("Public Key :", publicKey);

    // console.log(
    //     newMessage,
    //     Object.values(newMessage),
    //     new Uint8Array(Object.values(newMessage))
    //     // new Uint8Array(Object.values(signature)), // All Clear
    //     // new Uint8Array(Object.values(new PublicKey(publicKey).toBytes()))  // Nearly impossible to verify
    // )

    // console.log("Verification Proof", await verify(message, signature , publicKey))
    let verification = await verify(message, signature , publicKey);
    console.log(verification);
    res.send(verification);
    // if (verification === true) {
    //     res.send({verified:true})
    // } else {
    //     res.send({verified:false})
    // }
    res.end();
    
    
    // signature = res.get(signature)
    // let decodedSignature = bs58.default.decode(req.body.encodedSignature);
    // console.log(decodedSignature)

    // const message = new TextEncoder().encode(req.body.message)
    // // const signature = Uint8Array.from(Object.values(req.body.sig.signature))
    // // console.log(req.body.sig.signature)
    // const signature = new Uint8Array(Object.values(req.body.sig.signature))
    // const publicKey = req.body.sig.publicKey

    // const signature = req.body.sig.signature
    // console.log(req.body.sig.publicKey)
    // console.log(Object.values(req.body.sig.publicKey))
    // console.log(new Uint8Array(Object.values(req.body.sig.publicKey)))
    // const publicKey = new Uint8Array(Object.values(req.body.sig.publicKey))
    // const textEncoded_publicKey = new TextEncoder().encode(req.body.sig.publicKey)
    // console.log("ASasdS",publicKey)
    
    // let toBytes_PublicKey = new PublicKey(publicKey).toBytes()
    // console.log("NEW PUB KEY", newPublicKey)

    // TRUE OR FALSE
    // const signVerify = nacl.sign.detached.verify(new TextEncoder().encode(message), signature, toBytes_PublicKey )
    // console.log("SIGN VERIFY", signVerify)

    // console.log(bs58.default.encode(signature))
    // console.log("REQ BODY", req.body.message)
    // let array = Object.values(req.body.sig.signature);
    // // console.log(array)
    // let uint = Uint8Array.from(array)
    // console.log(uint)


    // signature contains two objects; an object that stores the signed wallet and a public key
    // console.log("REQ SIG", req.body.sig, typeof(req.body.message))
    

    // In the context of Koii Tac Toe we don't need to return a payload, but its in this template as an example
    // let payload = await payloadSigning(req.body.message)
    // console.log("PAYLOAD", payload)

    // console.log(new TextEncoder().encode(message))
    // console.log(typeof(signature))
    // console.log(signature)
    // signature = bs58.default.decode(signature)


    // console.log(typeof(message))
    // console.log(message)
    // console.log(typeof(signature))
    // console.log(signature)
    // // console.log(typeof(publicKey))
    // // console.log(publicKey)
    // // console.log(typeof(toBytes_PublicKey))
    // // console.log(toBytes_PublicKey)
    // console.log(typeof(textEncoded_publicKey))
    // console.log(textEncoded_publicKey)

    // arguments = [message]
    // for (var i = 0; i < arguments.length; i++) {
    //     if (!(arguments[i] instanceof Uint8Array)) throw new TypeError('unexpected type, use Uint8Array');
    //   }


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
    try {
        // const payload = nacl.sign.detached.verify(
        //     new Uint8Array(Object.values(message)),
        //     new Uint8Array(Object.values(signature)),
        //     new Uint8Array(Object.values(new PublicKey(publicKey).toBytes()))
        // );
        const verified = nacl.sign.detached.verify(
            new Uint8Array(Object.values(message)),
            new Uint8Array(Object.values(signature)),
            new Uint8Array(Object.values(new PublicKey(publicKey).toBytes()))
        );
        if (!verified) return { error: 'Invalid signature' };
        // return { data: decodePayload(payload) };
        // playerWallets.push(message)
        // console.log(playerWallets)
        return { verified };
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