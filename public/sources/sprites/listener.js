import borderSpriteGenerator, { setSpritePositionPool } from './index.js';
import { framePositions } from './framePositions.js';
import { getOverlayChannel, joinOverlayChannel } from '../../utils/overlayChannel.js';
import { numberParam, rectParam } from '../../utils/viewParams.js';

/** Sprite box size the page is designed around */
const SLOT = 50;

// ?frame=x,y,w,h (page px) puts the sprites on that frame's edges and ?size= sets their size,
// so the source can be 1920x1080 at scale 1 in OBS. Without it, the original 800x450 ring.
const frame = rectParam('frame');
if (frame) {
    const size = numberParam('size', { min: 10, max: 400 }) ?? SLOT;
    const k = size / SLOT;
    const width = frame.width / k;
    const height = frame.height / k;
    document.querySelector('.container').style.display = 'block';
    Object.assign(document.getElementById('game-area').style, {
        position: 'absolute',
        left: `${frame.x}px`,
        top: `${frame.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `scale(${k})`,
        transformOrigin: '0 0',
    });
    setSpritePositionPool(framePositions(width, height, SLOT));
}

let socket = io();
joinOverlayChannel(socket, getOverlayChannel());

socket.on('sprite-number', (pokemonNumber) => {
    borderSpriteGenerator(pokemonNumber);
});
