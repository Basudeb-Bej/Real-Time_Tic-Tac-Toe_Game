const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

//app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "public")));

let players = {};
let playerCount = 0;
let gameState = {
  board: Array(9).fill(""),
  recentMoves: [],
  currentTurn: "O",
  gameActive: true
};

const winPatterns = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const checkWinner = (board) => {
  for (let pattern of winPatterns) {
    let [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return null;
};

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  if (playerCount < 2) {
    const symbol = playerCount % 2 === 0 ? "O" : "X";
    players[socket.id] = symbol;
    playerCount++;

    socket.emit("assign-symbol", symbol);
    socket.emit("game-state", gameState);
    io.emit("player-count", { count: playerCount, ready: playerCount === 2 });

    console.log(`Assigned ${symbol} to ${socket.id}`);
  } else {
    socket.emit("room-full");
    return;
  }

  socket.on("move", (data) => {
    const symbol = players[socket.id];
    if (!symbol || !gameState.gameActive) return;
    const index = data.index;

    if (gameState.board[index] === "" && symbol === gameState.currentTurn) {
      gameState.board[index] = symbol;
      gameState.recentMoves.push({ index, value: symbol });

      if (gameState.recentMoves.length > 5) {
        const removed = gameState.recentMoves.shift();
        gameState.board[removed.index] = "";
      }

      const winner = checkWinner(gameState.board);
      if (winner) {
        gameState.gameActive = false;
        io.emit("game-state", gameState);
        io.emit("game-winner", { winner });
        return;
      }

      const nonEmptyCells = gameState.board.filter(cell => cell !== "").length;
      if (nonEmptyCells === 9) {
        gameState.gameActive = false;
        io.emit("game-state", gameState);
        io.emit("game-draw");
        return;
      }

      gameState.currentTurn = gameState.currentTurn === "O" ? "X" : "O";
      io.emit("game-state", gameState);
    }
  });

  socket.on("reset", () => {
    gameState = {
      board: Array(9).fill(""),
      recentMoves: [],
      currentTurn: "O",
      gameActive: true
    };
    io.emit("game-state", gameState);
    io.emit("game-reset");
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
    delete players[socket.id];
    playerCount = Math.max(playerCount - 1, 0);

    gameState = {
      board: Array(9).fill(""),
      recentMoves: [],
      currentTurn: "O",
      gameActive: true
    };

    io.emit("player-disconnected");
    io.emit("player-count", { count: playerCount, ready: false });
  });
});

server.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
});
