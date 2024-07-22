console.log("Client.js started.");

// Initializing Variables
// const socket = io();

// YOU"LL NEED TO REPLACE THIS WITH THE IP OF THE NODE
// THIS GAME IS ALWAYS BEING HOSTED ON PORT 1999
// THE SERVER IS ALWAYS RUNNING WITH AN OPEN IP WITH THE PORT 1999 BEING AVAILABLE (I ASSUME AT LEAST)
// WHEN YOU LAUNCH THE SERVER IT SHOULD AUTOMATICALLY SAY
// "any connection coming to my IP with the port 1999 wants me to serve them main.html"
const socket = io.connect('https://127.0.0.1:1999');

var indicator = document.createElement('h2')
indicator.style.color = "white";
var resetButton = document.createElement('button')
let uniqueRoomID = null;
const players = ['X', 'O']
let currentPlayer = players[0]

let board = null
let squares = null

let clientPlayer = null

// let player1 = false;


// Game Functions
function createGame() {
    // currentPlayer = players[0];
    clientPlayer = players[0]
    
    try {
        console.log("Attempting to create game.");
        socket.emit('createGame');
    } catch(e) {
        console.log("Could not create game:", e)
    }
};

function joinGame() {
    // currentPlayer = players[1];
    clientPlayer = players[1]
    
    uniqueRoomID = document.getElementById('uniqueRoomID').value;
    
    socket.emit('joinGame', {uniqueRoomID: uniqueRoomID});

    console.log("Attemping to join game.");
};

function sendMove(playerMove) {
    // const nowPlayer = player1 ? "p1Choice" : "p2Choice";

    // document.getElementById(playerMove).innerText = clientPlayer
    console.log(clientPlayer, "Move is", playerMove, ". Emitting playerMadeMove")
    socket.emit("playerMadeMove", {
        uniqueRoomID: uniqueRoomID,
        playerMove: playerMove,
        player: clientPlayer
    })
};

function displayOpponentChoice(payload) {
    console.log("Current Player is ", currentPlayer);
    indicator.textContent = `You are ${clientPlayer}. It's currently ${payload.currentPlayer}'s turn!`

    console.log("Server Board Looks like: ", payload.board)
    console.log("Client Board Looks like (before updates): ", squares)
    // update the board
    for (let i = 0; i < squares.length; i++) {
        const squareKey = "square"+i

        // console.log(squares[i].innerText)
        // console.log(payload.board["square" + i])

        squares[i].innerText = payload.board[squareKey];

    }
    console.log("Client Board Looks like (after updates): ", squares)
};

function updateBoard(payload, winFlag, tieFlag, resetFlag) {
    console.log("Current Player is ", currentPlayer);

    if (winFlag) {
        if (payload.currentPlayer === "X") {
            indicator.textContent = `Blue Koii wins!`
        } else if (payload.currentPlayer === "O") {
            indicator.textContent = `Orange Koii wins!`
        }
        indicator.style.color = "#A0FFAB"

        resetButton.style.display = "block"
        resetButton.className = 'gameButton'
        resetButton.innerText = "Reset Game"
        // indicator.style.marginTop = '30px'
        // indicator.style.textAlign='center'
        resetButton.onclick = function()
        {
            // emit resetRequest to server
            socket.emit('requestReset', {uniqueRoomID: uniqueRoomID})
        }
        indicator.after(resetButton)
    } else if (resetFlag) {
        indicator.style.color = "white"
        resetButton.style.display = "none"
        indicator.textContent = `You are ${clientPlayer}. It's currently ${payload.currentPlayer}'s turn!`
        // wipe the board visually speaking
        console.log(payload.board)
        for (let i = 0; i < squares.length; i++) {
            const squareKey = "square"+i
            squares[i].innerText = payload.board[squareKey];
            console.log(squares[i].innerText)
        }
    } else if (tieFlag) { 
        indicator.textContent = `The game has ended in a tie.`
        indicator.style.color = "blue"

        resetButton.style.display = "block"
        resetButton.innerText = "Reset Game"
        // indicator.style.marginTop = '30px'
        // indicator.style.textAlign='center'
        resetButton.onclick = function()
        {
            // emit resetRequest to server
            socket.emit('requestReset', {uniqueRoomID: uniqueRoomID})
        }
        indicator.after(resetButton)
    } else {
        indicator.textContent = `You are ${clientPlayer}. It's currently ${payload.currentPlayer}'s turn!`
    }

    console.log("Server Board Looks like: ", payload.board)
    // update the board
    for (let i = 0; i < squares.length; i++) {
        const squareKey = "square"+i

        // console.log(squares[i].innerText)
        // console.log(payload.board["square" + i])

        // squares[i].innerText = payload.board[squareKey];

        if (payload.board[squareKey] === "X") {
            squares[i].innerHTML = "<img src='assets/koii_blue.png' style='width:100px;height:60px;' />"
        } else if (payload.board[squareKey] === "O") {
            squares[i].innerHTML = "<img src='assets/koii_orange.png' style='width:100px;height:60px;' />"
        }

    }
    console.log("Client Board Looks like (after updates): ", squares)
};

function logToConsole(m) {
    console.log(m)
}



// Listen
socket.on("newGame", (payload) => {
    uniqueRoomID = payload.uniqueRoomID;

    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameplay').style.display = 'block';

    let copyButton = document.createElement('button');
    copyButton.style.display = "block"
    copyButton.style.marginTop = "10px"
    copyButton.className = "center gameButton"
    copyButton.innerText = "Copy code to clipboard"
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(uniqueRoomID).then(function() {
            console.log("Copying to clipboard was successful")
        }, function(err) {
            console.error("Could not copy text: ", err)
        })
    })

    document.getElementById('lobbyArea').innerText = `Waiting for another player, please share Room ID:  ${uniqueRoomID}`;
    document.getElementById('lobbyArea').appendChild(copyButton)

});

socket.on("lobbyReady", () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('lobbyArea').style.display = 'none';
    
    board = document.getElementById('board')
    squares = document.getElementsByClassName('square')
    
    indicator.textContent = `You are ${clientPlayer}. It's currently ${currentPlayer}'s turn!`
    indicator.style.marginTop = '30px'
    indicator.style.textAlign='center'
    board.after(indicator)

    document.getElementById('board').style.display = '';
})

socket.on("serverConfirmedMove", (payload) => {
    console.log("Client acknowledged a valid move")
    currentPlayer = payload.currentPlayer
    // displayOpponentChoice(payload)
    updateBoard(payload, false, false)
})

socket.on("serverConfirmedWin", (payload) => {
    console.log("Client acknowledged a valid win")
    // displayOpponentChoice(payload)
    updateBoard(payload, true, false, false)
})

socket.on("serverConfirmedTie", (payload) => {
    console.log("Client acknowledged a valid tie")
    // displayOpponentChoice(payload)
    updateBoard(payload, false, true, false)
})

socket.on("resetBoard", (payload) => {
    console.log("Client acknowledged a board reset")
    updateBoard(payload, false, false, true)
})

socket.on("SMT_1", (payload) => {
    console.log("SIGNATURE: ", payload.message)
    console.log("PUB KEY: ", payload.publicKey)

    console.log(verifyMessage(
        payload.publicKey,
        payload.signature
    ));
})