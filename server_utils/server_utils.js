

// Utils
exports.makeId = function makeId(length) {
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

exports.checkWin = function checkWin(currentPlayer, winning_combinations, board) {
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
exports.checkTie = function checkTie(board){
    console.log("Checking tie. Board looks like this:", board)
    for (i in board) {
        if (board[i] === null) {
            return false
        }
    }
    return true
}

// function signMessage(message) {
//     const sign = createSign('SHA256');
//     sign.update(message);
//     sign.end();

//     // this is a returned signature
//     return sign.sign(privateKey, 'hex');
// }
  
// function verifyMessage(message, signature) {
//     const verify = createVerify('SHA256');
//     verify.update(message);
//     verify.end();
//     return verify.verify(publicKey, signature, 'hex');
// }