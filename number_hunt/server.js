const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN
      ? process.env.ALLOWED_ORIGIN.split(",").map(x => x.trim())
      : true,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

function makeCode() {
  let code;
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function cleanName(value) {
  return String(value || "Player").trim().replace(/[<>]/g, "").slice(0, 18) || "Player";
}

function publicState(room) {
  return {
    code: room.code,
    rounds: room.rounds,
    round: room.roundIndex + 1,
    phase: room.phase,
    lower: room.lower,
    upper: room.upper,
    players: room.players.map(p => ({
      name: p.name,
      score: p.score,
      connected: Boolean(p.socketId)
    })),
    setterIndex: room.setterIndex,
    guesserIndex: room.guesserIndex
  };
}

function sendState(room) {
  io.to(room.code).emit("room-state", publicState(room));
}

function playerForSocket(room, socket) {
  return room.players.find(p => p.socketId === socket.id);
}

function startRound(room) {
  if (room.roundIndex >= room.rounds) {
    room.phase = "finished";
    io.to(room.code).emit("game-over", {
      players: room.players.map(p => ({ name: p.name, score: p.score }))
    });
    sendState(room);
    return;
  }

  room.setterIndex = room.roundIndex % 2;
  room.guesserIndex = 1 - room.setterIndex;
  room.secret = null;
  room.lower = 1;
  room.upper = 100;
  room.attempts = 0;
  room.phase = "setting";

  sendState(room);

  const setter = room.players[room.setterIndex];
  const guesser = room.players[room.guesserIndex];

  io.to(setter.socketId).emit("secret-entry", {
    round: room.roundIndex + 1,
    min: 1,
    max: 100
  });
  io.to(guesser.socketId).emit("waiting-for-secret", {
    message: `${setter.name} is choosing a secret number.`
  });
}

io.on("connection", socket => {
  socket.on("create-room", (payload = {}, ack = () => {}) => {
    const rounds = Number(payload.rounds);
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 30) {
      return ack({ ok: false, error: "Choose between 1 and 30 rounds." });
    }

    const code = makeCode();
    const room = {
      code,
      rounds,
      roundIndex: 0,
      phase: "waiting",
      secret: null,
      lower: 1,
      upper: 100,
      attempts: 0,
      setterIndex: 0,
      guesserIndex: 1,
      players: [{
        name: cleanName(payload.name),
        score: 0,
        socketId: socket.id
      }]
    };

    rooms.set(code, room);
    socket.join(code);
    ack({ ok: true, code, playerNumber: 1 });
    sendState(room);
  });

  socket.on("join-room", (payload = {}, ack = () => {}) => {
    const code = String(payload.code || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) return ack({ ok: false, error: "Room not found. Check the code." });
    if (room.players.length >= 2) return ack({ ok: false, error: "This room already has two players." });
    if (room.phase !== "waiting") return ack({ ok: false, error: "This game has already started." });

    room.players.push({
      name: cleanName(payload.name),
      score: 0,
      socketId: socket.id
    });

    socket.join(code);
    ack({ ok: true, code, playerNumber: 2 });
    sendState(room);
    startRound(room);
  });

  socket.on("set-secret", (payload = {}, ack = () => {}) => {
    const room = rooms.get(String(payload.code || "").toUpperCase());
    if (!room) return ack({ ok: false, error: "Room not found." });

    const player = playerForSocket(room, socket);
    const secret = Number(payload.secret);

    if (!player || room.phase !== "setting" || room.players[room.setterIndex] !== player) {
      return ack({ ok: false, error: "It is not your turn to set the secret." });
    }
    if (!Number.isInteger(secret) || secret < 1 || secret > 100) {
      return ack({ ok: false, error: "Enter a whole number from 1 to 100." });
    }

    room.secret = secret;
    room.phase = "guessing";
    ack({ ok: true });
    sendState(room);

    const guesser = room.players[room.guesserIndex];
    io.to(guesser.socketId).emit("your-guess-turn", {
      lower: room.lower,
      upper: room.upper
    });
    io.to(room.players[room.setterIndex].socketId).emit("guessing-started", {
      message: "Your secret is locked in. Wait for the guess."
    });
  });

  socket.on("make-guess", (payload = {}, ack = () => {}) => {
    const room = rooms.get(String(payload.code || "").toUpperCase());
    if (!room) return ack({ ok: false, error: "Room not found." });

    const player = playerForSocket(room, socket);
    const guess = Number(payload.guess);

    if (!player || room.phase !== "guessing" || room.players[room.guesserIndex] !== player) {
      return ack({ ok: false, error: "It is not your turn to guess." });
    }
    if (!Number.isInteger(guess) || guess < room.lower || guess > room.upper) {
      return ack({ ok: false, error: `Guess must be between ${room.lower} and ${room.upper}.` });
    }

    room.attempts++;

    if (guess < room.secret) {
      room.lower = guess + 1;
      const result = {
        outcome: "low",
        message: "TOO LOW",
        guess,
        lower: room.lower,
        upper: room.upper,
        attempts: room.attempts
      };
      io.to(room.code).emit("guess-result", result);
      sendState(room);
      ack({ ok: true });
      io.to(player.socketId).emit("your-guess-turn", {
        lower: room.lower,
        upper: room.upper
      });
      return;
    }

    if (guess > room.secret) {
      room.upper = guess - 1;
      const result = {
        outcome: "high",
        message: "TOO HIGH",
        guess,
        lower: room.lower,
        upper: room.upper,
        attempts: room.attempts
      };
      io.to(room.code).emit("guess-result", result);
      sendState(room);
      ack({ ok: true });
      io.to(player.socketId).emit("your-guess-turn", {
        lower: room.lower,
        upper: room.upper
      });
      return;
    }

    player.score++;
    room.phase = "round-complete";
    const result = {
      outcome: "correct",
      message: "CORRECT!",
      guess,
      attempts: room.attempts,
      winner: player.name,
      round: room.roundIndex + 1
    };
    io.to(room.code).emit("guess-result", result);
    sendState(room);
    ack({ ok: true });

    room.roundIndex++;
    setTimeout(() => {
      if (rooms.get(room.code) === room) startRound(room);
    }, 2800);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = playerForSocket(room, socket);
      if (player) {
        player.socketId = null;
        io.to(room.code).emit("opponent-disconnected", {
          message: `${player.name} disconnected. This room will remain unavailable until the server is restarted.`
        });
        sendState(room);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Number Hunt running on port ${PORT}`);
});
