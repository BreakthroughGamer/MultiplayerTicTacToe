// 'require' statements
const express = require('express')
const http = require('http')
const https = require('https')
const path = require('path')
const { cpuUsage } = require('process')
const { Server } = require("socket.io")
const {generateKeyPairSync, sign, createSign, createVerify, generateKey} = require('crypto')
const fs = require('fs')
const bodyParser = require('body-parser')

// Initializing variables
const app = express()
// const server = https.createServer(app)
const rooms = {}
let currentPlayer = "X"
let awaitingReset = false
var turnLog = {}

const options = {
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.cert")
}
const server = https.createServer(options, app)
const io = new Server(server)

// Key Pair
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
process.env.PRIVATE_SERVER_KEY = privateKey;
process.env.PUBLIC_SERVER_KEY = publicKey;

const winning_combinations = [
    ['square0', 'square1', 'square2'],
    ['square3', 'square4', 'square5'],
    ['square6', 'square7', 'square8'],
    ['square0', 'square3', 'square6'],
    ['square1', 'square4', 'square7'],
    ['square2', 'square5', 'square8'],
    ['square0', 'square4', 'square8'],
    ['square2', 'square4', 'square6']
]
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
}
var board = structuredClone(newBoard)


// Configuration
app.use(express.static(path.join(__dirname, 'client')))
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

// Endpoints
app.get('/serverstatus', (req, res) => {
    res.send('<h1>Rock Paper Scissors Server running.<h1>');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/client/main.html");
});

// Listen
io.on('connection', (socket) => {
    console.log("User connected with ID '" + io.id + "'");

    socket.on('disconnect', () => {
        console.log("User with ID '" + io.id + "' disconnected");
    });

    socket.on("createGame", () => {
        const uniqueRoomID = makeid(6);
        rooms[uniqueRoomID] = {};
        console.log("Room Made At", uniqueRoomID)
        
        socket.join(uniqueRoomID);

        console.log("Emitting 'newGame'")
        socket.emit("newGame", {uniqueRoomID: uniqueRoomID});
    });

    socket.on("joinGame", (payload) => {
        if(rooms[payload.uniqueRoomID] != null) {
            socket.join(payload.uniqueRoomID);

            // target 'to' a room, emit that the game lobby is ready
            socket.to(payload.uniqueRoomID).emit("lobbyReady", {});
            // also emit to the caller
            socket.emit("lobbyReady");
        }   
    });

    socket.on("playerMadeMove", (payload) => {
        let playerMove = payload.playerMove;

        if (board[playerMove] === null) {
            if (currentPlayer === "X" && payload.player === "X") {
                try {
                    console.log("Server acknowledged X made a move")
        
                    // access the playerMove from the payload
                    // tell the room what the most recent move has been (BUT EVENTUALLY WE WANT TO STORE THIS IN A JSON)
                    // rooms[payload.uniqueRoomID].p1Move = playerMove;
        
                    // update the servers board
                    board[playerMove] = "X"
                    
                    // check win
                    if (checkWin(currentPlayer)) {
                        
                        // emit to the caller
                        socket.emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer})
                        
                        // emit to the room
                        socket.to(payload.uniqueRoomID).emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer})
                        
                        console.log("Server found a win")
                        
                        // reset the board
                        awaitingReset = true

                        return null
                    }
                    
                    // check tie
                    if (checkTie(currentPlayer)) {
                        // emit to the caller
                        socket.emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer});
                        // emit to the room
                        socket.to(payload.uniqueRoomID).emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer});
                        
                        // reset the board
                        awaitingReset = true
                        // console.log("Server found a win");
                        return null;
                    }
                    
                    // pass the turn off to the other player
                    currentPlayer = "O"
        
                    // notify the clients of the update so they may update their board
                    console.log("Emitting serverConfirmedMove back to client")

                    // Log turn to RAM
                    turnKey = "Turn " + (Object.keys(turnLog).length + 1)
                    turnLog[turnKey] = {currentPlayer: currentPlayer, playerMove: playerMove}

                    socket.emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer})
                    socket.in(payload.uniqueRoomID).emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer})
                } catch(e) {
                    console.log("Server failed to acknowledge X made a move: ", e)
                }
            } else if (currentPlayer === "O" && payload.player === "O") {
                try {
                    console.log("Server acknowledged O made a move")
                    let playerMove = payload.playerMove;
        
                    // access the playerMove from the payload
                    // tell the room what the most recent move has been (BUT EVENTUALLY WE WANT TO STORE THIS IN A JSON)
                    // rooms[payload.uniqueRoomID].p1Move = playerMove;
        
                    // update the servers board
                    board[playerMove] = "O";
                    
                    // check win
                    if (checkWin(currentPlayer)) {
                                
                        // emit to the caller
                        socket.emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer});
                        
                        // emit to the room
                        socket.to(payload.uniqueRoomID).emit("serverConfirmedWin", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer});
                        
                        // reset the board
                        awaitingReset = true

                        // console.log("Server found a win");
                        return null;
                    }
                    
                    // check tie
                    if (checkTie(currentPlayer)) {
                        // emit to the caller
                        socket.emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer});
                        // emit to the room
                        socket.to(payload.uniqueRoomID).emit("serverConfirmedTie", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer});
                        
                        // reset the board
                        awaitingReset = true
                        // console.log("Server found a win");
                        return null;
                    }
                    
                    // pass the turn off to the other player
                    currentPlayer = "X";
        
                    // notify the clients of the update so they may update their board
                    console.log("Emitting serverConfirmedMove back to client");

                    // Log turn to RAM
                    turnKey = "Turn " + (Object.keys(turnLog).length + 1)
                    turnLog[turnKey] = {currentPlayer: currentPlayer, playerMove: playerMove}

                    socket.emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer});
                    socket.in(payload.uniqueRoomID).emit("serverConfirmedMove", {playerMove: payload.playerMove, board: board, currentPlayer: currentPlayer});
                } catch(e) {
                    console.log("Server failed to acknowledge O made a move", e);
                }
            } else {
                console.error("Could not find a valid currentplayer. A player is likely trying to make a move when it is not their turn (or the server has failed and requires a restart).");
            }
        } else {
            console.error("Client tried an invalid move.");
        }




        // if (rooms[payload.uniqueRoomID].p2Move != null) {
        //     declareWinner(payload.uniqueRoomID);
        // }
    });

    socket.on("requestReset", (payload) => {
        console.log("Received reset request from client. awaitingReset is currently", awaitingReset)
        if (awaitingReset) {
            console.log("TURN LOG", turnLog)
            signature = signMessage(JSON.stringify(turnLog))
            // fs.writeFile("example.json", JSON.stringify(turnLog), (e) => console.log(e))
            fs.writeFile("example.json", signature, (e) => console.log(e))
            board = structuredClone(newBoard)
            console.log("Resetting board", board)
            socket.emit("resetBoard", {board: board, currentPlayer:currentPlayer})
            socket.to(payload.uniqueRoomID).emit("resetBoard", {board: board, currentPlayer:currentPlayer})
        } else {
            console.error("Attempted reset request denied.")
        }
    });



    // var message = "My Secret Message"

    // socket.emit("SMT_1", {publicKey: process.env.PUBLIC_SERVER_KEY, signature: signMessage(message)}) 

    // socket.on("smt_1", (payload) => {

    // })

});

server.listen(1999, () => {
    console.log('Listening on port 1999');
});




// Utils
function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

function checkWin(currentPlayer) {
    for(let i = 0; i < winning_combinations.length; i++){
        const [a, b, c] = winning_combinations[i]
        if(board[a] === currentPlayer && board[b] === currentPlayer && board[c] === currentPlayer){
            return true
        }
    }
    return false
}

// later on replace this with just checking to see if 9 turns have passed, if no win condition is met then its an auto-tie.
// You don't really need to process this, though it is a very small compute so idk
function checkTie(){
    for (i in board) {
        if (board[i] === null) {
            return false
        }
    }
    return true
}

function signMessage(message) {
    const sign = createSign('SHA256');
    sign.update(message);
    sign.end();

    // this is a returned signature
    return sign.sign(privateKey, 'hex');
}
  
function verifyMessage(message, signature) {
    const verify = createVerify('SHA256');
    verify.update(message);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
}