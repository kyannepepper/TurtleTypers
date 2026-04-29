# Turtle Typers

Multiplayer typing race: players join from their phones, type a shared prompt as fast and accurately as they can, and watch “turtles” move on a shared display. Built with **Node.js**, **Express**, **WebSockets** (`ws`), and **Vue 3** (loaded from a CDN in the browser).

## How it works

- **Display (host):** open [`http://localhost:3000/`](http://localhost:3000/) — lobby, live race board, and podium for 1st–3rd place.
- **Players:** open [`http://localhost:3000/player.html`](http://localhost:3000/player.html) on each device, enter a name, and join. The host starts the round from the display after everyone is in.

The server in `index.js` serves static files from `public/` and runs a WebSocket server on the same HTTP port so all clients stay in sync.

## Requirements

- [Node.js](https://nodejs.org/) (LTS recommended)

## Setup and run

```bash
npm install
node index.js
```

The app listens on **port 3000**. You should see `Server is ready...` in the terminal.

There is no `npm start` script in `package.json` yet; use `node index.js` or add a start script if you prefer.

## Local development: WebSocket URL

The front end in `public/app.js` connects to a WebSocket URL at the top of `connectSocket`. For local play, use the same host as your server, for example:

```javascript
this.socket = new WebSocket("ws://localhost:3000");
```

Comment out or remove any production URL (for example a hosted `wss://…` endpoint) while testing locally. Use `wss://` only when the page is served over HTTPS.

## Project layout

| Path | Role |
|------|------|
| `index.js` | Express app, static hosting, WebSocket game state |
| `public/index.html` | Main display / host UI |
| `public/player.html` | Player phone UI |
| `public/app.js` | Vue app, socket client, game flow |

## Optional assets

The HTML references images (for example a QR code on the lobby screen and artwork on the player page). If those files are not in `public/`, replace the paths or add the images there. Sound effects are loaded from `/sounds/` in `app.js`; add those files under `public/sounds/` if you want audio.

## License

See `package.json` (`ISC` unless you change it).
