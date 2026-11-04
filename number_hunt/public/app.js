const socket = io();

const $ = id => document.getElementById(id);
const lobby = $("lobby");
const game = $("game");
let roomCode = "";
let myPlayerNumber = 0;
let latestState = null;
let currentLower = 1;
let currentUpper = 100;
let attemptCount = 0;

function showMessage(id, text, good = false) {
  const el = $(id);
  el.textContent = text || "";
  el.style.color = good ? "#5af0bd" : "";
}
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}
function showGame() {
  lobby.classList.add("hidden");
  game.classList.remove("hidden");
  $("hero").classList.add("hidden");
  game.scrollIntoView({ behavior: "smooth", block: "start" });
}
function playerName() {
  return $("playerName").value.trim() || "Player";
}
function updateBounds(lower, upper) {
  currentLower = lower;
  currentUpper = upper;
  $("lowerBound").textContent = lower;
  $("upperBound").textContent = upper;
  const width = Math.max(0, ((upper - lower) / 99) * 100);
  $("rangeFill").style.width = width + "%";
}
function renderState(state) {
  latestState = state;
  $("roomCodeDisplay").textContent = state.code;
  $("roundTitle").textContent = state.phase === "finished"
    ? "Match complete"
    : `Round ${Math.min(state.round, state.rounds)} / ${state.rounds}`;

  state.players.forEach((p, i) => {
    $(`player${i}Name`).textContent = p.name;
    $(`player${i}Score`).textContent = p.score;
  });
  const activeIndex = state.phase === "setting"
    ? state.setterIndex
    : state.phase === "guessing"
      ? state.guesserIndex
      : -1;
  $("playerCard0").classList.toggle("active", activeIndex === 0);
  $("playerCard1").classList.toggle("active", activeIndex === 1);

  if (state.phase === "waiting") {
    $("turnText").textContent = "Waiting for the second player to join…";
  } else if (state.phase === "setting") {
    $("turnText").textContent = "A secret number is being selected.";
  } else if (state.phase === "guessing") {
    const guesser = state.players[state.guesserIndex];
    $("turnText").textContent = `${guesser.name} is searching for the secret number.`;
  } else if (state.phase === "round-complete") {
    $("turnText").textContent = "Round complete. Preparing the next round…";
  } else if (state.phase === "finished") {
    $("turnText").textContent = "The match has ended.";
  }

  updateBounds(state.lower, state.upper);
}

function addHistory(text, type) {
  const list = $("historyList");
  const empty = list.querySelector(".empty-history");
  if (empty) empty.remove();
  const pill = document.createElement("span");
  pill.className = `history-pill ${type}`;
  pill.textContent = text;
  list.prepend(pill);
}
function setAction(html) {
  $("actionContent").innerHTML = html;
}
function showWaiting(text) {
  setAction(`<div class="waiting-symbol">⌛</div><h3>You're all set</h3><p>${text}</p>`);
}
function showSecretEntry() {
  setAction(`
    <div class="section-kicker">YOUR TURN / SECRET SETTER</div>
    <h3>Choose your secret number</h3>
    <p>Pick a whole number from 1 to 100. Your opponent cannot see it.</p>
    <form class="secret-form" id="secretForm">
      <input class="text-input" id="secretInput" type="password" inputmode="numeric" min="1" max="100" placeholder="Your secret number" required>
      <button class="button button-primary" type="submit">LOCK IN SECRET ↗</button>
    </form>
  `);
  $("secretForm").addEventListener("submit", event => {
    event.preventDefault();
    const secret = Number($("secretInput").value);
    socket.emit("set-secret", { code: roomCode, secret }, response => {
      if (!response?.ok) return showMessage("gameMessage", response?.error || "Could not set secret.");
      showWaiting("Secret locked. Your opponent is now guessing.");
      showMessage("gameMessage", "");
    });
  });
}
function showGuessEntry(lower, upper) {
  updateBounds(lower, upper);
  setAction(`
    <div class="section-kicker">YOUR TURN / NUMBER SEEKER</div>
    <h3>Make your guess</h3>
    <p>Enter a whole number between <strong>${lower}</strong> and <strong>${upper}</strong>.</p>
    <form class="guess-form" id="guessForm">
      <input class="text-input" id="guessInput" type="number" inputmode="numeric" min="${lower}" max="${upper}" placeholder="?" required>
      <button class="button button-primary" type="submit">GUESS ↗</button>
    </form>
  `);
  $("guessForm").addEventListener("submit", event => {
    event.preventDefault();
    const guess = Number($("guessInput").value);
    socket.emit("make-guess", { code: roomCode, guess }, response => {
      if (!response?.ok) showMessage("gameMessage", response?.error || "Guess not accepted.");
      else showMessage("gameMessage", "");
    });
  });
}
function finishGame(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const result = sorted[0].score === sorted[1].score
    ? "It's a draw!"
    : `${sorted[0].name} wins the match!`;
  setAction(`
    <div class="section-kicker">FINAL RESULTS</div>
    <div class="waiting-symbol">🏆</div>
    <h3>${result}</h3>
    <p>${players.map(p => `${p.name}: ${p.score} point(s)`).join(" · ")}</p>
    <p style="margin-top:12px">Thanks for playing Number Hunt.</p>
  `);
}

$("createBtn").addEventListener("click", () => {
  const rounds = Number($("roundCount").value);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 30) {
    return showMessage("lobbyMessage", "Choose between 1 and 30 rounds.");
  }
  socket.emit("create-room", { name: playerName(), rounds }, response => {
    if (!response?.ok) return showMessage("lobbyMessage", response?.error || "Could not create room.");
    roomCode = response.code;
    myPlayerNumber = response.playerNumber;
    showGame();
    showMessage("lobbyMessage", "");
    showWaiting("Share your room code with your opponent.");
  });
});

$("joinBtn").addEventListener("click", () => {
  const code = $("roomCode").value.trim().toUpperCase();
  if (code.length !== 6) return showMessage("lobbyMessage", "Enter the six-character room code.");
  socket.emit("join-room", { name: playerName(), code }, response => {
    if (!response?.ok) return showMessage("lobbyMessage", response?.error || "Could not join room.");
    roomCode = response.code;
    myPlayerNumber = response.playerNumber;
    showGame();
    showMessage("lobbyMessage", "");
    showWaiting("Joined successfully. Get ready!");
  });
});

$("roomCode").addEventListener("input", event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});
$("copyCodeBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(roomCode);
    toast("Room code copied!");
  } catch {
    toast(`Room code: ${roomCode}`);
  }
});

socket.on("room-state", renderState);
socket.on("secret-entry", () => {
  attemptCount = 0;
  $("attemptCount").textContent = "0 ATTEMPTS";
  $("historyList").innerHTML = '<p class="empty-history">New round — make your first move.</p>';
  showSecretEntry();
});
socket.on("waiting-for-secret", data => showWaiting(data.message));
socket.on("guessing-started", data => showWaiting(data.message));
socket.on("your-guess-turn", data => showGuessEntry(data.lower, data.upper));
socket.on("guess-result", result => {
  attemptCount = result.attempts;
  $("attemptCount").textContent = `${attemptCount} ATTEMPT${attemptCount === 1 ? "" : "S"}`;
  if (result.outcome === "low") {
    addHistory(`${result.guess} · TOO LOW`, "low");
    updateBounds(result.lower, result.upper);
    showMessage("gameMessage", "Too low — the lower boundary moved up.");
  } else if (result.outcome === "high") {
    addHistory(`${result.guess} · TOO HIGH`, "high");
    updateBounds(result.lower, result.upper);
    showMessage("gameMessage", "Too high — the upper boundary moved down.");
  } else {
    addHistory(`${result.guess} · CORRECT!`, "correct");
    setAction(`<div class="section-kicker">NUMBER FOUND</div><div class="waiting-symbol">✦</div><h3>Correct guess, ${result.winner}!</h3><p>Found in ${result.attempts} attempt(s). Next round loading…</p>`);
    showMessage("gameMessage", "Point awarded!");
  }
});
socket.on("game-over", data => finishGame(data.players));
socket.on("opponent-disconnected", data => showMessage("gameMessage", data.message));

socket.on("connect_error", () => {
  showMessage("lobbyMessage", "Cannot connect to the game server. Refresh and try again.");
});
