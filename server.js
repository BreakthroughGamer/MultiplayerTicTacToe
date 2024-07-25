// Listen
io.on('connection', (socket) => {
    console.log("User connected with ID '" + io.id + "'");

    // Disconnection isn't possible, the server will probably need to have a "ready check" button in case a player afks or disconnects (needs a cooldown so can't be spammed)
    // socket.on('disconnect', () => {
    //     console.log("User with ID '" + io.id + "' disconnected");
    // });

    socket.on("createGame", () => {
    });

    socket.on("joinGame", (payload) => {
        // if(rooms[payload.uniqueRoomID] != null) {
        //     socket.join(payload.uniqueRoomID);
        //     // target 'to' a room, emit that the game lobby is ready
        //     socket.to(payload.uniqueRoomID).emit("lobbyReady", {});
        //     // also emit to the caller
        //     socket.emit("lobbyReady");
        // }   
    });

    socket.on("playerMadeMove", (payload) => {
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


