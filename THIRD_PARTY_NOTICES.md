# Third-party notices

twitch-shenanigans is an unofficial fan project. It is not affiliated with, sponsored or
endorsed by Nintendo, Creatures Inc., GAME FREAK inc., The Pokémon Company, Spike Chunsoft
or TiMi Studio Group. Pokémon and Pokémon character names are trademarks of Nintendo,
Creatures and GAME FREAK. All Pokémon artwork belongs to its respective owners.

The project's own code is under the ISC license in [LICENSE](LICENSE). Nothing below is
covered by that license.

## Bundled in this repository

| File | Owner | License |
| --- | --- | --- |
| `public/assets/fonts/exo/` (Exo) | The Exo Project Authors | SIL Open Font License 1.1, text in [`public/assets/fonts/exo/OFL.txt`](public/assets/fonts/exo/OFL.txt) |
| `public/libs/tinycolor/tinycolor.js` (TinyColor 1.6.0) | Brian Grinstead | MIT, notice in the file header |
| `public/assets/fonts/pmd.ttf` | Fan-made font in the style of Pokémon Mystery Dungeon | Source and license not confirmed |
| `public/assets/rain.mp4` | Unknown | Source and license not confirmed |
| `public/assets/pokeball-logo.png` | Poké Ball design © Nintendo / Creatures / GAME FREAK | Used as fan content |
| `shared/pokemon-list.js`, `src/data/uniteRoster.json` | Pokémon names © Nintendo / Creatures / GAME FREAK; roster roles as listed by Game8 | Factual lists used as fan content |

## Served from the sprite CDN (`cdn.frampersand.dev`, not in this repository)

| Path | Source | License |
| --- | --- | --- |
| `pmd/portrait/` | [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab) | Community portraits: CC BY-NC 4.0, artists credited in each folder's `credits.txt`. Portraits credited to CHUNSOFT are official Pokémon Mystery Dungeon art © Nintendo / Spike Chunsoft |
| `pokemon/icon/` | Box icons from [pokemondb](https://pokemondb.net) (Sword/Shield, Scarlet/Violet) | © Nintendo / Creatures / GAME FREAK, used as fan content |
| `unite/` | Pokémon HOME renders from [pokemondb](https://pokemondb.net) | © Nintendo / Creatures / GAME FREAK, used as fan content |

## Loaded from third-party sites at runtime

The sprites overlay (`public/sources/sprites/`) shows animated sprites hotlinked from
pokemondb.net and projectpokemon.org (© Nintendo / Creatures / GAME FREAK).

## npm dependencies

Installed packages carry their own license files in `node_modules/`: express, socket.io and
tmi.js (MIT), dotenv (BSD-2-Clause). Dev tooling (ESLint, nodemon, socket.io-client) isn't
shipped in the Docker image.
