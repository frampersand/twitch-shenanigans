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
| `PUBLIC_BASE_URL` | This app's public HTTPS address, e.g. `https://overlay.example.com`. Needed for Twitch login and EventSub |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | The Twitch application (see "Twitch login and channel points" below) |
| `TWITCH_EVENTSUB_SECRET` | Random string (10-100 characters) Twitch signs EventSub webhooks with |
| `SESSION_SECRET` | Long random string that signs dashboard login cookies |

## Pokémon art (sprite CDN)

PMD portraits, background icons and UNITE images aren't in this repo. They're served by the
sprite CDN (`pokemon-card-project-sprites` repo) at `https://cdn.frampersand.dev`:

| Path | Used by |
| --- | --- |
| `/pmd/manifest.json` | `/portrait` picks a folder and emotion from it (cached 6 h) |
| `/pmd/portrait/{0001}/{Emotion}.png` | PMD chat overlay |
| `/pokemon/icon/{dex}.png` | Background pattern |
| `/unite/{id}.png` | UNITE randomizer |

Randomizer rosters are static lists in `src/data/rosters/<game>.json` (`id`, `name`, `role`); games and
their roles are defined in `shared/randomizerGames.js`. When a game adds a character, add it to the
file and its art to the sprite CDN (`unite/<id>.png` for UNITE, `randomizer/<game>/<id>.png` for the
rest, `.jpg` for League); a card whose art is missing falls back to a text layout. The lists came from
each game's source in November 2026: League from Riot's Data Dragon (first class as role), Valorant from
valorant-api.com, Overwatch from OverFast API, Marvel Rivals from the official heroes page (Deadpool,
who plays all three roles, is listed as Vanguard).

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
| `/` | FramperBot home page: what viewers can do, how it works, the channels it's on (from `/api/channels`) |
| `/showcase/` | A simulated channel: try chat commands and channel point rewards and watch the overlays react. Runs entirely in the browser; `?channel=` previews that channel's PMD settings |
| `/admin/#token=…` | Trigger overlays by hand (needs `ADMIN_TOKEN`) |
| `/dashboard/` | Broadcasters log in with Twitch; connects their channel points to FramperBot |

## Chat commands

| Command | Who | Does |
| --- | --- | --- |
| `!dealwithit [game] [role] [@user]` | Anyone (3 min cooldown) | Rolls a random pick for you or `@user`. Games: `unite` (default), `overwatch`, `valorant`, `rivals`, `league`; an optional role narrows it (`!dealwithit overwatch support`) |
| `!portrait <dex number> [emotion]` | Anyone (cooldown) | Sets your portrait in the PMD chat overlay |
| `!pmdconfig <setting> <value>` | Broadcaster | Tunes the PMD chat overlay (`chatDirection`, `solidBubbles`, `solidBubblesColor`, `bubbleTextColor`, `portraitShape`) |
| `!cardstyle <style>` | Broadcaster | Picks the channel's randomizer card: `classic`, `holo`, `reel`, `lockin`, or `random` for a different one every roll. Preview them at `/sources/randomizer/designs.html` |
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

## Twitch login and channel points

Chat (tmi.js) only sees channel point rewards that ask the viewer for text. FramperBot also
listens to Twitch EventSub, which delivers every redemption, with or without text:

1. Create an application at https://dev.twitch.tv/console/apps and add the OAuth redirect URL
   `<PUBLIC_BASE_URL>/auth/twitch/callback` (plus `http://localhost:3000/auth/twitch/callback` for local testing).
2. Put `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_EVENTSUB_SECRET`, `SESSION_SECRET` and
   `PUBLIC_BASE_URL` in the environment.
3. Each broadcaster opens `/dashboard/` and logs in with Twitch once. FramperBot asks only for
   `channel:read:redemptions`, keeps no tokens, and subscribes to that channel's redemptions;
   Twitch then POSTs them to `/eventsub/callback` (signature-checked).

Once a channel is connected, the chat copy of a redemption is ignored so rewards don't run twice.
Channels that haven't connected keep working through chat. Subscriptions are re-checked on startup.

## Deploying

Pushing to `main` builds the Docker image, pushes it to Docker Hub and redeploys it on the
droplet with `docker compose`. The container runs as the `node` user (uid 1000), so the
droplet's `data/` volume must be owned by uid 1000.

## License

The code is ISC-licensed ([LICENSE](LICENSE)). Fonts, libraries and Pokémon art keep their own
terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

This is an unofficial fan project, not affiliated with or endorsed by Nintendo, Creatures,
GAME FREAK, The Pokémon Company, Spike Chunsoft, Riot Games, Blizzard Entertainment, NetEase or
Marvel. Pokémon is a trademark of Nintendo, Creatures and GAME FREAK. FramperBot isn't endorsed by
Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in
producing or managing Riot Games properties.
