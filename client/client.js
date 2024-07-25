console.log("Client.js started.");

// Initializing Variables
// const socket = io.connect('https://127.0.0.1:1999');
let sig = false

var indicator = document.createElement('h2')
indicator.style.color = "white";
var resetButton = document.createElement('button')
let uniqueRoomID = null;
const players = ['player1', 'player2']

let clientBoard = null
let squares = null

let serverAwaitingReset = false;
let clientPlayer = null
let currentServerPlayer = null;
let serverBoard = null;
let serverGameEndState = null;
let stopPollingLobby = false;
// window.addEventListener("load", () => {
//     window.k2.connect()
// })

// window.onload(() => {
//     window.k2.connect();
// });



// Game Functions
async function login() {
    // let result = await window.k2.connect();
    // console.log("WINDOW DONE CONNECT")

    // FOR TESTING ONLY
    sig = true

    // let sig = await window.k2.signMessage("hello");

    // console.log(sig)
    await fetch("/game/verify", {
        method:"POST", 
        headers: {
            'Accept' : 'application/json', 
            'Content-Type': 'application/json', 
        },
        body:JSON.stringify({
            message:"hello",
            sig:sig
        })
    });
    console.log("Window successfully connected to K2");
    document.getElementById("createGame").disabled = false;
    document.getElementById("joinGame").disabled = false;

};

async function createGame() {
    clientPlayer = players[0]
    
    try {
        console.log("Attempting to create game.");
        await fetch("/createGame").then((response) => response.json()).then(data => console.log(data))
    } catch(e) {
        console.log("Could not create game:", e)
    }

    // uniqueRoomID = payload.uniqueRoomID;

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
    document.getElementById('lobbyArea').appendChild(copyButton);
    
    pollServerForLobbyUpdate();
};

async function joinGame() {
    // currentPlayer = players[1];
    // clientPlayer = players[1]
    // uniqueRoomID = document.getElementById('uniqueRoomID').value;
    // let sig = await window.k2.signMessage("hello");

    // console.log("Attemping to join game.");
    clientPlayer = players[1]
    await fetch("/joinGame").then((response) => response.json()).then(data => console.log(data))
    
    pollServerForLobbyUpdate();
};

async function sendMove(playerMove) {
    // const nowPlayer = player1 ? "p1Choice" : "p2Choice";

    // document.getElementById(playerMove).innerText = clientPlayer
    console.log(clientPlayer, "Move is", playerMove, ". Sending playerMadeMove")
    // socket.emit("playerMadeMove", {
    //     uniqueRoomID: uniqueRoomID,
    //     playerMove: playerMove,
    //     player: clientPlayer
    // })
    await fetch("/game/playerMadeMove", {
        method:"POST", 
        headers: {
            'Accept' : 'application/json', 
            'Content-Type': 'application/json', 
        },
        body:JSON.stringify({
            playerMove:playerMove,
            player:clientPlayer
        })
    });

    await updateBoard();
};

// function displayOpponentChoice(payload) {
//     console.log("Current Player is ", clientPlayer);
//     indicator.textContent = `You are ${clientPlayer}. It's currently ${payload.currentPlayer}'s turn!`

//     console.log("Server Board Looks like: ", payload.board)
//     console.log("Client Board Looks like (before updates): ", squares)
//     // update the board
//     for (let i = 0; i < squares.length; i++) {
//         const squareKey = "square"+i

//         // console.log(squares[i].innerText)
//         // console.log(payload.board["square" + i])

//         squares[i].innerText = payload.board[squareKey];

//     }
//     console.log("Client Board Looks like (after updates): ", squares)
// };

async function updateBoard() {
    // console.log("Updating board for player", clientPlayer);

    // await fetch("/game/board").then((response) =>
    //     response.json()).then(data => {
    //         serverBoard = data.board;
    //         serverGameEndState = data.serverConfirmedGame;
    //         currentServerPlayer = data.currentServerPlayer;
    // });
        
    // console.log("Server Board Looks like: ", serverBoard)

    if (serverGameEndState === "player1") {
        indicator.textContent = `Blue Koii wins!`
        indicator.style.color = "#A0FFAB"

        resetButton.style.display = "block"
        resetButton.className = 'gameButton'
        resetButton.innerText = "Reset Game"
        // indicator.style.marginTop = '30px'
        // indicator.style.textAlign='center'
        resetButton.onclick = function()
        {
            resetClientBoard();
        }
        indicator.after(resetButton)

    } else if (serverGameEndState === "player2") {
        indicator.textContent = `Blue Koii wins!`
        indicator.style.color = "#A0FFAB"

        resetButton.style.display = "block"
        resetButton.className = 'gameButton'
        resetButton.innerText = "Reset Game"
        // indicator.style.marginTop = '30px'
        // indicator.style.textAlign='center'
        resetButton.onclick = function()
        {
            resetClientBoard();
        }
        indicator.after(resetButton)
    } else if (serverGameEndState === "tie") { 
        indicator.textContent = `The game has ended in a tie.`
        indicator.style.color = "blue"

        resetButton.style.display = "block"
        resetButton.innerText = "Reset Game"
        // indicator.style.marginTop = '30px'
        // indicator.style.textAlign='center'
        resetButton.onclick = function()
        {
            resetClientBoard();
        }
        indicator.after(resetButton)

    } else {
        indicator.textContent = `You are ${clientPlayer}. It's currently ${currentServerPlayer}'s turn!`
        indicator.style.color = "white";
    }

    // update the board
    // console.log("Server Board Looks like (before update): ", serverBoard)

    for (let i = 0; i < squares.length; i++) {
        const squareKey = "square"+i

        if (serverBoard[squareKey] === "player1") {
            squares[i].innerHTML = "<img src='assets/koii_blue.png' style='width:100px;height:60px;' />"
        } else if (serverBoard[squareKey] === "player2") {
            squares[i].innerHTML = "<img src='assets/koii_orange.png' style='width:100px;height:60px;' />"
        }

    }
    // console.log("Client Board Looks like (after updates): ", clientBoard)
};

function logToConsole(m) {
    console.log(m)
}

async function resetClientBoard() {
    if (serverAwaitingReset[clientPlayer] === true) {
        // Posting reset to server
        await fetch("/game/reset", {
            method:"POST", 
            headers: {
                'Accept' : 'application/json', 
                'Content-Type': 'application/json', 
            },
            body:JSON.stringify({
                player:clientPlayer
            })
        }).then((response) =>
            response.json()).then(data => console.log(serverBoard = data.board)
        ); 
      
        indicator.style.color = "white"
        resetButton.style.display = "none"
        indicator.textContent = `You are ${clientPlayer}. It's currently ${currentServerPlayer}'s turn!`
        
        
        // wipe the board visually speaking
        // console.log(serverBoard)
        for (let i = 0; i < squares.length; i++) {
            // const squareKey = "square"+i
            squares[i].innerHTML = "";
            // console.log(squares[i].innerText)
        }
    }
}

function lobbyReady() {
    if (sig) {
        console.log("Polling server for game update...");
        stopPollingLobby = true
        pollServerForGameUpdate();
    } else {
        console.log("Something went wrong connecting to Finnie.");
    }
    
    document.getElementById('menu').style.display = 'none';
    document.getElementById('lobbyArea').style.display = 'none';
    
    clientBoard = document.getElementById('board')
    squares = document.getElementsByClassName('square')
    
    indicator.textContent = `You are ${clientPlayer}. It's currently ${currentServerPlayer}'s turn!`
    indicator.style.marginTop = '30px'
    indicator.style.textAlign='center'
    clientBoard.after(indicator)
    
    document.getElementById('board').style.display = '';



}


// Poll
// The client needs to be constantly fetching
async function pollServerForGameUpdate() {
    try {
        await fetch("/game/board").then((response) => response.json()).then(data => {
            console.log(data)
            try {
                
                serverBoard = data.board;
                serverAwaitingReset = {
                    player1:data.player1AwaitingReset,
                    player2:data.player2AwaitingReset
                }
                currentServerPlayer = data.currentServerPlayer;
                serverGameEndState = data.serverGameEndState;
                
                updateBoard();
            } catch (e) {
                console.error("Lobby could not process request: ", e)
            }
        });
        
    } catch (e) {
        console.error("Could not find a server: ", e)
    }
    
    setTimeout(pollServerForGameUpdate, 100);
};

async function pollServerForLobbyUpdate() {   
    if (!stopPollingLobby) {
        console.log("Polling server for lobby update...");
        try {
            await fetch("/game/state").then((response) => response.json()).then(data => {
                if (data.lobbyReady) {
                    lobbyReady();
                }
                //  else {
                //     console.log("Server found but not ready.")
                // }
            });
    
        } catch (e) {
            console.error("Could not find a server: ", e)
        }
    
        setTimeout(pollServerForLobbyUpdate, 100);
    } 
};

// Listen
//socket.on("newGame", (payload) => {
    

// });

// socket.on("lobbyReady", () => {

// })

// socket.on("serverConfirmedMove", (payload) => {
//     console.log("Client acknowledged a valid move")
//     currentPlayer = payload.currentPlayer
//     // displayOpponentChoice(payload)
//     updateBoard(payload, false, false)
// })


// Now we just ask if the server has confirmed any game end state at all
// socket.on("serverConfirmedWin", (payload) => {
// })
// socket.on("serverConfirmedTie", (payload) => {
// })
// socket.on("resetBoard", (payload) => {
// })