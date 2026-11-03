# twitch-shenanigans

A Twitch chat bot and a set of OBS browser-source overlays, served by one Node.js app:
Pokémon sprites around the stream, a Pokémon UNITE randomizer, PMD-style chat portraits,
rain and a reward-driven background.

## Running locally

Requires Node.js 22+.

```bash
npm install
cp .env.example .env   # then fill in the values (see below)
npm run dev            # restarts on changes (nodemon)
```

The server listens on `PORT` (default `3000`).

| Script | What it does |
| --- | --- |
| `npm start` | Run the server |
| `npm run dev` | Run with auto-restart |
| `npm test` | Run the test suite (`node:test`, uses a temp data folder) |
| `npm run lint` | ESLint |

### Environment variables

| Variable | Purpose |
| --- | --- |
| `BOT_USERNAME` | Twitch login of the bot account |
| `BOT_AUTH` | Bot OAuth token (`oauth:...`) |
| `ADMIN_TOKEN` | Secret for the admin panel and `/pmd-user-data`. Unset = those are disabled |
| `PORT` | HTTP port (default `3000`) |
| `DATA_DIR` | Where writable data lives (default `./data`) |
| `CDN_BASE_URL` | Sprite CDN the server reads the PMD manifest from (default `https://cdn.frampersand.dev`; tests override it) |

## Pokémon art (sprite CDN)

PMD portraits, background icons and UNITE images aren't in this repo. They're served by the
sprite CDN (`pokemon-card-project-sprites` repo) at `https://cdn.frampersand.dev`:

| Path | Used by |
| --- | --- |
| `/pmd/manifest.json` | `/portrait` picks a folder and emotion from it (cached 6 h) |
| `/pmd/portrait/{0001}/{Emotion}.png` | PMD chat overlay |
| `/pokemon/icon/{dex}.png` | Background pattern |
| `/unite/{id}.png` | UNITE randomizer |

The UNITE roster is a static list in `src/data/uniteRoster.json`. For a new release, add the
entry there and its image to the CDN's `unite/` folder.

## Overlays (OBS browser sources)

Add `?channel=<twitch-login>` so each source only reacts to its own channel.
Sources without it default to `frampersand`.

| Path | Shows |
| --- | --- |
| `/sources/sprites/` | Pokémon sprites popping up around the frame |
| `/sources/background/` | Background color and Pokémon pattern |
| `/sources/rain/` | Rain animation and sound |
| `/sources/randomizer/?channel=…` | UNITE randomizer cards (`?channel` required) |
| `/sources/pmd-chat/?channel=…` | Chat with PMD portraits (`?channel` required, add `&mock` to preview) |
| `/showcase/` | All overlays on one page with test buttons |
| `/admin/#token=…` | Trigger overlays by hand (needs `ADMIN_TOKEN`) |

## Chat commands

| Command | Who | Does |
| --- | --- | --- |
| `!dealwithit [@user]` | Anyone (3 min cooldown) | Rolls a random UNITE Pokémon for you or `@user` |
| `!portrait <dex number> [emotion]` | Anyone (cooldown) | Sets your portrait in the PMD chat overlay |
| `!pmdconfig <setting> <value>` | Broadcaster | Tunes the PMD chat overlay (`chatDirection`, `solidBubbles`, `solidBubblesColor`, `bubbleTextColor`, `portraitShape`) |
| `!rainbearer` | Anyone, home channel | Says who last summoned the rain |
| `!guesswhosback` | Owner | 🎵 |

Channel point rewards (sprite, reroll, rain, background color, background pattern) are mapped in
`src/config/rewards.js`. Joined channels and per-channel rules live in `src/config/channels.js`.

## Project layout

```
index.js            entry point: HTTP + Socket.IO server and Twitch client
src/app.js          express/socket.io setup (used by tests without Twitch)
src/config/         channels, owner logins, reward IDs, paths and env
src/twitch/         chat message handling, commands, channel rewards
src/socket/         Socket.IO events, rooms and handlers
src/services/       portraits, PMD preferences, randomizer, UNITE roster
src/data/           static UNITE roster
shared/             modules used by both the server and the overlays (served at /shared)
public/             overlays, showcase, admin panel and assets
data/               writable JSON state (mounted as a volume in production)
test/               node:test suites
```

## Deploying

Pushing to `main` builds the Docker image, pushes it to Docker Hub and redeploys it on the
droplet with `docker compose`. The container runs as the `node` user (uid 1000), so the
droplet's `data/` volume must be owned by uid 1000.

## License

The code is ISC-licensed ([LICENSE](LICENSE)). Fonts, libraries and Pokémon art keep their own
terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

This is an unofficial fan project, not affiliated with or endorsed by Nintendo, Creatures,
GAME FREAK, The Pokémon Company or Spike Chunsoft. Pokémon is a trademark of Nintendo,
Creatures and GAME FREAK.
