# Third-party notices

FramperBot (this repository, twitch-shenanigans) is an unofficial fan project. It is not affiliated with,
sponsored or endorsed by Nintendo, Creatures Inc., GAME FREAK inc., The Pokémon Company, Spike Chunsoft,
TiMi Studio Group, Riot Games, Blizzard Entertainment, NetEase Games or Marvel. Pokémon and Pokémon
character names are trademarks of Nintendo, Creatures and GAME FREAK. All artwork belongs to its
respective owners.

FramperBot isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
officially involved in producing or managing Riot Games properties. Riot Games, and all associated
properties are trademarks or registered trademarks of Riot Games, Inc.

Overwatch is a trademark or registered trademark of Blizzard Entertainment, Inc. in the U.S. and/or other
countries. Marvel Rivals is © NetEase; Marvel characters are © Marvel.

The project's own code is under the ISC license in [LICENSE](LICENSE). Nothing below is
covered by that license.

## Bundled in this repository

| File | Owner | License |
| --- | --- | --- |
| `public/assets/fonts/exo/` (Exo) | The Exo Project Authors | SIL Open Font License 1.1, text in [`public/assets/fonts/exo/OFL.txt`](public/assets/fonts/exo/OFL.txt) |
| `public/libs/tinycolor/tinycolor.js` (TinyColor 1.6.0) | Brian Grinstead | MIT, notice in the file header |
| `public/libs/paper-shaders/` (`@paper-design/shaders` 0.0.82, unmodified apart from removed source map comments) | Paper, https://shaders.paper.design | Apache-2.0, `LICENSE` and `NOTICE` in the folder |
| `public/assets/fonts/pmd.ttf` | Fan-made font in the style of Pokémon Mystery Dungeon | Source and license not confirmed |
| `public/assets/rain.mp4` | Unknown | Source and license not confirmed |
| `public/assets/pokeball-logo.png` | Poké Ball design © Nintendo / Creatures / GAME FREAK | Used as fan content |
| `shared/pokemon-list.js`, `src/data/rosters/` | Character names belong to their games' owners. UNITE roles as listed by Game8; League from Riot's Data Dragon; Valorant from valorant-api.com; Overwatch from OverFast API; Marvel Rivals from the official site | Factual lists used as fan content |

## Served from the sprite CDN (`cdn.frampersand.dev`, not in this repository)

| Path | Source | License |
| --- | --- | --- |
| `pmd/portrait/` | [PMDCollab SpriteCollab](https://github.com/PMDCollab/SpriteCollab) | Community portraits: CC BY-NC 4.0, artists credited in each folder's `credits.txt`. Portraits credited to CHUNSOFT are official Pokémon Mystery Dungeon art © Nintendo / Spike Chunsoft |
| `pokemon/icon/` | Box icons from [pokemondb](https://pokemondb.net) (Sword/Shield, Scarlet/Violet) | © Nintendo / Creatures / GAME FREAK, used as fan content |
| `unite/` | Pokémon HOME renders from [pokemondb](https://pokemondb.net) | © Nintendo / Creatures / GAME FREAK, used as fan content |
| `randomizer/league/` | Champion loading art from Riot's Data Dragon | © Riot Games, used under Riot's [Legal Jibber Jabber](https://www.riotgames.com/en/legal) policy for free fan projects |
| `randomizer/valorant/` | Agent portraits from the game's files, via [valorant-api.com](https://valorant-api.com) | © Riot Games, same policy |
| `randomizer/overwatch/` | Hero portraits from Blizzard's CDN, via [OverFast API](https://overfast-api.tekrop.fr) | © Blizzard Entertainment, used under Blizzard's fan content policy (non-commercial) |
| `randomizer/rivals/` | Hero portraits from the official [Marvel Rivals site](https://www.marvelrivals.com/heroes/) | © NetEase / Marvel. No published fan content policy; used as fan content |
| `randomizer/logos/` | Overwatch, Valorant, League of Legends and Marvel Rivals logos from [Wikimedia Commons](https://commons.wikimedia.org) | Trademarks of Blizzard Entertainment, Riot Games and NetEase / Marvel, shown on card backs to name the game |

## Loaded from third-party sites at runtime

The sprites overlay (`public/sources/sprites/`) shows animated sprites hotlinked from
pokemondb.net and projectpokemon.org (© Nintendo / Creatures / GAME FREAK).

## npm dependencies

Installed packages carry their own license files in `node_modules/`: express, socket.io and
tmi.js (MIT), dotenv (BSD-2-Clause). Dev tooling (ESLint, nodemon, socket.io-client) isn't
shipped in the Docker image.
