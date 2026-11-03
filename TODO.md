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

- [ ] **Before pushing to `main`** (push auto-deploys): on the droplet, `sudo chown -R 1000:1000 <compose-dir>/data` — the container now runs as `node` (uid 1000) and can't write a root-owned volume
- [ ] Set `ADMIN_TOKEN` in the droplet's compose environment
- [ ] Refresh OBS browser sources after deploying
- [ ] Remove the stale `data/channels.js` from the droplet's `./data` volume (no longer read)
- [ ] Commit `package-lock.json` (CI's `npm ci` and the Docker build both need it)
- [ ] Add `?channel=<name>` to sprites / background / rain OBS URLs on channels other than frampersand (without it they default to frampersand's room)
- [X] **Deploy the sprite CDN first** (push `pokemon-card-project-sprites`), check `https://cdn.frampersand.dev/pmd/manifest.json`, then push this repo — until the CDN has the files, portraits, icons and UNITE images 404
- [ ] Delete the now-unused `uniteRoster.json`, `uniteRoster.meta.json` and `unite-assets/` from the droplet's `./data` volume

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
- [ ] Commit, then force-push the rewritten `main` (`git push --force-with-lease origin main`)
- [ ] After the push: `git reflog expire --expire=now --all && git gc --prune=now` locally; re-clone on any other machine
- [ ] Delete old `frampersand/tw-shenanigans` image tags on Docker Hub (they contain the sprites); keep `latest` and the new version
- [ ] Check the sprite CDN's Docker Hub image (`frampersand/pokemon-sprites`) is private too; it now bakes in the portraits
- [ ] `pmd.ttf` and `rain.mp4` kept here; sources still unconfirmed (listed as such in `THIRD_PARTY_NOTICES.md`)
- [X] `LICENSE` (ISC, code only) and `THIRD_PARTY_NOTICES.md`; README license section and fan-project disclaimer
- [X] Exo `OFL.txt` shipped with the fonts; tinycolor MIT header added
- [X] Game8 scraping removed after one last sync (97 Pokémon); roster is static in `src/data/uniteRoster.json`
