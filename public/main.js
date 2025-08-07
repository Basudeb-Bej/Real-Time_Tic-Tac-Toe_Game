const boxes = document.querySelectorAll(".box");
const resetBtn = document.querySelector("#reset-btn");
const msgContainer = document.querySelector(".msg-container");
const msg = document.querySelector("#msg");
const status = document.querySelector("#status");

const socket = io();

let mySymbol = null;
let gameState = {
  board: Array(9).fill(""),
  recentMoves: [],
  currentTurn: "O",
  gameActive: true
};

socket.on("assign-symbol", (symbol) => {
  mySymbol = symbol;
  status.innerText = `You are "${mySymbol}" - ${symbol === "O" ? "You go first!" : "Waiting for O to move..."}`;
});

socket.on("room-full", () => {
  alert("Room is full. Try again later.");
});

socket.on("player-count", (data) => {
  status.innerText = data.ready
    ? `Game Ready! You are "${mySymbol}"`
    : "Waiting for second player...";
});

socket.on("game-state", (state) => {
  gameState = state;
  updateDisplay();
});

socket.on("game-winner", (data) => showWinner(data.winner));
socket.on("game-draw", () => gameDraw());
socket.on("game-reset", () => resetGame());
socket.on("reset", () => resetGame());

socket.on("player-disconnected", () => {
  alert("Opponent disconnected. Waiting for new player...");
  resetGame();
});

function updateDisplay() {
  boxes.forEach((box, index) => {
    const value = gameState.board[index];
    box.innerText = value;
    box.classList.remove("red", "green");
    if (value === "O") box.classList.add("red");
    else if (value === "X") box.classList.add("green");
  });

  if (gameState.gameActive) {
    status.innerText =
      gameState.currentTurn === mySymbol
        ? `Your turn (${mySymbol})`
        : `Opponent's turn (${gameState.currentTurn})`;
  }
}

boxes.forEach((box, index) => {
  box.addEventListener("click", () => {
    if (
      gameState.currentTurn === mySymbol &&
      gameState.board[index] === "" &&
      gameState.gameActive
    ) {
      socket.emit("move", { index, value: mySymbol });
    }
  });
});

resetBtn.addEventListener("click", () => {
  socket.emit("reset");
});

function resetGame() {
  gameState = {
    board: Array(9).fill(""),
    recentMoves: [],
    currentTurn: "O",
    gameActive: true
  };

  boxes.forEach((box) => {
    box.innerText = "";
    box.classList.remove("red", "green");
  });

  msgContainer.classList.add("hide");

  if (mySymbol) {
    status.innerText =
      mySymbol === "O"
        ? `You are "${mySymbol}" - Your turn!`
        : `You are "${mySymbol}" - Waiting for O to move...`;
  } else {
    status.innerText = "Waiting for second player...";
  }
}

function gameDraw() {
  msg.innerText = "Game was a Draw!";
  msgContainer.classList.remove("hide");
  status.innerText = "It's a tie! Click Reset to play again!";
  gameState.gameActive = false;
}

function showWinner(winner) {
  msg.innerText = `Winner is ${winner}` + (winner === mySymbol ? " (You Won!)" : " (Opponent Won!)");
  msgContainer.classList.remove("hide");
  status.innerText = winner === mySymbol ? "Congratulations! You Won!" : "You Lost! Better luck next time!";
  gameState.gameActive = false;

  setTimeout(() => {
    status.innerText += " - Click Reset to play again!";
  }, 2000);
}
