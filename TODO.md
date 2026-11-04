# Project TODO

Follow-ups from the November 2026 project assessment (security, bugs, quality, legal).

---

## Security (done)

- [X] Randomizer overlay XSS via `!dealwithit @<payload>` — names rendered with `textContent`, usernames validated
- [X] Open Socket.IO relay let anyone make the bot talk / inject IRC — relay removed, server announces results itself
- [X] Overlay-changing socket events and admin panel require `ADMIN_TOKEN`
- [X] Remote crashes from malformed socket events and unhandled `client.say` rejections
- [X] `POST /api/unite-roster/sync` requires `ADMIN_TOKEN` (since removed with the Game8 sync)
- [X] Scraped names can't produce image paths outside `data/unite-assets`
- [X] Vendored tinycolor instead of unpinned `esm.sh`; GitHub Actions pinned to SHAs
- [X] `npm audit` clean (express bumped to `^4.22.3`)
- [X] `/pmd-user-data` requires `ADMIN_TOKEN`
- [X] `package-lock.json` no longer gitignored

## Deploy steps

- [X] **Before pushing to `main`** (push auto-deploys): on the droplet, `sudo chown -R 1000:1000 <compose-dir>/data` — the container now runs as `node` (uid 1000) and can't write a root-owned volume
- [X] Set `ADMIN_TOKEN` in the droplet's compose environment
- [X] Refresh OBS browser sources after deploying
- [X] Remove the stale `data/channels.js` from the droplet's `./data` volume (no longer read)
- [X] Commit `package-lock.json` (CI's `npm ci` and the Docker build both need it)
- [X] Add `?channel=<name>` to sprites / background / rain OBS URLs on channels other than frampersand (without it they default to frampersand's room)
- [X] **Deploy the sprite CDN first** (push `pokemon-card-project-sprites`), check `https://cdn.frampersand.dev/pmd/manifest.json`, then push this repo — until the CDN has the files, portraits, icons and UNITE images 404
- [X] Delete the now-unused `uniteRoster.json`, `uniteRoster.meta.json` and `unite-assets/` from the droplet's `./data` volume

## Security hardening

- [X] Container runs as `USER node`; app code stays root-owned, only `/app/data` is writable
- [X] Dockerfile uses `npm ci --omit=dev` (needs `package-lock.json` committed)
- [X] Image builds and runs as `node`; verified a root-owned data volume fails writes (EACCES, server stays up) and a uid-1000 volume works

## Bugs

- [X] `data/channels.js` was shadowed by the `./data` volume — moved to `src/config/channels.js`
- [X] JSON files: lost updates and corruption — per-file lock + atomic writes; sync no longer clobbers meta
- [X] Portrait user data read from disk on every chat message — cached in memory
- [X] Commands were case-sensitive (`!Portrait` ignored)
- [X] Permission checks used display names — now use the Twitch login
- [X] Overlay events (sprites, color, pattern, rain, PMD chat, config) reached every channel — scoped to per-channel rooms
- [X] Rainbearer lost on restart — persisted to `data/rainbearer.json`

## Code quality

- [X] Removed unused deps (`fs`, `http`, `path`, `twitch`, `body-parser`, `node-fetch`, `tinycolor2`); nodemon 2 → 3
- [X] Server/browser shared code moved to `shared/` (served at `/shared`); duplicate helpers removed
- [X] Channel-specific rules (`HOME_CHANNEL`, restricted randomizer channels) live in `src/config/channels.js`
- [X] `node:test` suite (temp `DATA_DIR`, fake CDN) and ESLint; deploy workflow runs both before building
- [X] Repo clutter: `public/.DS_Store` deleted, package renamed `twitch-shenanigans`, README and `.env.example` written
- [X] `/portrait` returns forward-slash paths, 404s for unknown portraits, ignores array query params
- [X] Admin panel channel picker and token-accepted indicator
- [ ] Dev-only audit finding: moderate `minimatch` advisory inside ESLint (no fixed ESLint release yet; not in the production image)

## Legal (public GitHub repo + public Docker Hub image)

- [X] PMD portraits, pokemondb icons and UNITE images moved to the private sprite CDN repo (`/pmd/`, `/pokemon/icon/`, `/unite/`) and removed from this repo
- [X] Sprites stripped from local git history (`filter-branch`; 18 commits kept, pack 94 → 21 MB). Old history backed up in a bundle in the session scratchpad
- [X] Commit, then force-push the rewritten `main` (`git push --force-with-lease origin main`)
- [X] After the push: `git reflog expire --expire=now --all && git gc --prune=now` locally; re-clone on any other machine
- [X] Delete old `frampersand/tw-shenanigans` image tags on Docker Hub (they contain the sprites); keep `latest` and the new version
- [X] Check the sprite CDN's Docker Hub image (`frampersand/pokemon-sprites`) is private too; it now bakes in the portraits
- [X] `pmd.ttf` and `rain.mp4` kept here; sources still unconfirmed (listed as such in `THIRD_PARTY_NOTICES.md`)
- [X] `LICENSE` (ISC, code only) and `THIRD_PARTY_NOTICES.md`; README license section and fan-project disclaimer
- [X] Exo `OFL.txt` shipped with the fonts; tinycolor MIT header added
- [X] Game8 scraping removed after one last sync (97 Pokémon); roster is static in `src/data/uniteRoster.json`

## Second assessment (November 2026)

- [X] `!portrait` checks the number against the CDN manifest and replies when it's unknown; odd emotion input is dropped
- [X] PMD chat overlay falls back to a random portrait, then to no portrait, instead of dropping the message
- [X] Viewers without a Twitch name color get the default tag color instead of none
- [X] A mistyped `!portrait` no longer costs the 3-minute cooldown (the "not found" reply is limited to one per 30 s)
- [X] Background pattern reworked as drifting tiles (`tilePattern.js`): no reshuffle on resize, no shared state between containers, crossfades between picks, keeps the old pattern if an icon fails
- [X] SIGTERM/SIGINT close the server and the Twitch connection (`docker stop` 10 s → under 1 s)
- [X] Showcase no longer joins the live sprites room: socket wiring moved to `sources/sprites/listener.js`
- [ ] Sprites overlay hotlinks pokemondb / projectpokemon GIFs and stops at dex 893 (could move to the CDN)
- [ ] No health check for the app's container or deploy (the CDN's deploy has one)
- [ ] Two quick PMD messages can render out of order (each fetches its portrait separately)
- [ ] `data/pmdChatPreferences.json` and `data/portraitUserbase.json` are both tracked and gitignored
- [ ] Sprite CDN repo's workflow uses unpinned action tags (`@v4`)

## Multi-game randomizer

- [X] `!dealwithit [game] [role] [@user]` for UNITE, Overwatch 2, Valorant, Marvel Rivals and League; text cards with role colors for non-UNITE games; reroll repeats the viewer's last game
- [X] A mistyped `!dealwithit` (unknown word or bad `@user`) no longer costs the cooldown
- [X] Removed duplicate Mewtwo X/Y entries from the UNITE roster (they were twice as likely to roll)
- [X] Rosters refreshed from each game's source (Nov 2026): League 173, Valorant 30, Overwatch 54, Marvel Rivals 54
- [X] Art for all five games on the sprite CDN (`randomizer/<game>/`), with a text-card fallback if an image is missing; Riot, Blizzard and NetEase credits added
- [ ] **Deploy the sprite CDN first** (it now has `randomizer/`), then this repo — until then the new games' cards fall back to text
- [ ] Marvel Rivals art has no published fan content policy (unlike Riot and Blizzard); revisit if NetEase or Marvel ever object
- [ ] Mega Charizard X and Y are listed as Supporters in the UNITE roster; check their real roles
- [X] `!cardstyle classic|holo|reel|lockin|random` per channel (replaced the temporary `!dwi`); preview at `/sources/randomizer/designs.html`
- [X] League and Overwatch art fills the classic card; game logos on the classic and holo card backs
- [ ] Deploy the sprite CDN (new `randomizer/logos/`) — until then the card backs show the game's name instead of its logo

## Twitch login, EventSub and dashboard

- [X] Log in with Twitch (`channel:read:redemptions`), EventSub webhooks for every redemption, chat fallback for unconnected channels
- [X] `/dashboard/`: reward linking per channel, card style, PMD chat look, OBS URLs; owner manages every channel
- [ ] After deploying: log in again at `/dashboard/` as frampersand to load your rewards, then link them (the built-in IDs keep working until you do)
- [ ] Ask the other streamers to log in at `/dashboard/`, accept the terms and link their rewards
- [X] Self-serve: anyone can add FramperBot to their own channel after accepting the EULA and Privacy Policy (version + time recorded); removing it deletes the channel's data
- [ ] Check the Privacy Policy's hosting details match the droplet (it says "DigitalOcean Droplet in the United States")
- [ ] Add Docker log rotation (e.g. `logging: { options: { max-size: "10m", max-file: "3" } }`) so logs don't grow between deploys
- [ ] If sign-ups grow past ~20 channels, apply for Twitch's verified bot status (unverified bots have chat join limits)
- [ ] Once every channel has linked its rewards, `src/config/rewards.js` can go

## Background (color and animated scene)

- [X] `/sources/shader/`: a plain color or one of nine animated WebGL scenes from Paper Shaders (vendored in `public/libs/paper-shaders`, Apache-2.0), crossfades, still-gradient fallback without WebGL, renders at 1080p max
- [X] Dashboard default look: plain color or animated scene, color (or the scene's own colors), speed (`data/backgroundScenes.json`), live preview, "On stream now" with Back to default
- [X] Background color and Animated scene rewards build on each other in either order; scenes are repainted with dark, base and light tones of the color; viewers pick scenes by name or number
- [X] Wording: Background color / Pokémon pattern / Animated scene; Pokémon pattern source gets `?color=off` to sit above the Background
- [ ] Check GPU use in OBS on a real stream PC (use `?quality=low` if it's heavy)
- [ ] Add the Background source to the showcase's simulated stream
- [ ] Rename the "Background pattern" reward on Twitch to "Pokémon pattern" and create an "Animated scene" reward (text optional), then link it
