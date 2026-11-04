# Number Hunt

A two-player, real-time number guessing game. One player privately selects a number from 1 to 100. The other guesses, receiving automatic HIGH/LOW clues while the server updates the valid boundary. Players alternate secret-setter and guesser roles each round.

## Project contents

- `number_hunt.c` — standalone beginner-friendly C console version.
- `server.js` — Node.js + Express + Socket.IO authoritative game server.
- `public/index.html` — website structure.
- `public/style.css` — responsive neon game design.
- `public/app.js` — browser interactions and real-time events.

## Run locally

1. Install Node.js 18 or newer.
2. Extract this folder.
3. Open a terminal in the `number_hunt` folder.
4. Run:

   ```bash
   npm install
   npm start
   ```

5. Open `http://localhost:3000` in your browser.

For testing on two devices on the same Wi-Fi, use the computer's local network IP address instead of `localhost` on the second device. Both devices must be able to reach the host computer, and its firewall must allow the server port.

## Deploy publicly

This project can be deployed as a Node web service on a hosting provider that supports persistent Node.js processes and WebSockets (for example, Render).

1. Create a Git repository and upload the project files.
2. Create a new Web Service from that repository.
3. Set the build command to `npm install`.
4. Set the start command to `npm start`.
5. Deploy, then open the HTTPS URL on both devices.
6. Keep WebSocket support enabled. Do not use static-only hosting for this server.

Optional environment variables:
- `PORT` — supplied automatically by most hosts.
- `ALLOWED_ORIGIN` — comma-separated allowed website origins. Configure this to your deployed HTTPS origin for a production deployment.

## Multiplayer and privacy notes

- The secret number is stored only in the server's in-memory room object. It is not sent in room-state or clue events.
- The server validates whose turn it is, the number range, and each guess boundary.
- The room code is a temporary invite credential. Share it only with the intended opponent.
- This starter version stores rooms in memory. Restarting/redeploying the server clears active rooms, and a disconnected player cannot resume the same seat.
- For a public production service, add persistent storage, reconnect tokens, per-IP rate limiting, abuse controls, HTTPS-only deployment, and monitoring. The room code is not an account login system.

## Compile the C program

GCC:

```bash
gcc number_hunt.c -o number_hunt
./number_hunt
```

On Windows with MinGW:

```bash
gcc number_hunt.c -o number_hunt.exe
number_hunt.exe
```

## C concepts to explain

- Variables: `secret`, `guess`, `lower`, `upper`, `rounds`, `score1`, `score2`.
- `scanf`: receives input from the players.
- `for` loop: repeats the game for the chosen number of rounds.
- `while` loop: continues guessing until the number is found.
- `if / else if / else`: compares the guess with the secret number.
- Boundary update:
  - If guess is low: `lower = guess + 1`.
  - If guess is high: `upper = guess - 1`.
- Functions are not required in this beginner version; the program uses `main()`.

## Game scoring

The player who guesses the secret number earns one point. The secret setter earns no point for that round. Roles alternate every round so each player gets a chance to guess.
