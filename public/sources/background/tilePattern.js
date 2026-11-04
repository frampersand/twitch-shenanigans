/**
 * Background pattern: one Pokémon's icon in a staggered grid that drifts diagonally and loops.
 *
 * The grid is plain <img> elements in one layer, slid by a transform, so the motion runs on
 * the compositor and nothing is redrawn per frame. Plain images (no canvas) also mean no CORS
 * request, so icons keep loading from the CDN cache even if the CDN origin is unreachable.
 */

/** Pattern opacity over the background color */
const PATTERN_OPACITY = 0.5;
/** Icon height in CSS px (pokemondb box icons are about 68x56) */
const ICON_HEIGHT = 48;
/** Tile edge as a multiple of the icon height; two icons per tile, offset by half */
const TILE_SCALE = 2.4;
/** Drift speed along each axis */
const DRIFT_PX_PER_SECOND = 14;
const CROSSFADE_MS = 800;
const TILE_SIZE = Math.round(ICON_HEIGHT * TILE_SCALE);

/** Per container: the latest render token, so a slow image load can't overwrite a newer pick */
const renderTokens = new WeakMap();
const resizeObserver = typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver((entries) => entries.forEach(({ target }) => refillLayers(target)));

const prefersReducedMotion = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Could not load ${url}`));
        img.src = url;
    });
}

function makeIcon(url, x, y, mirrored) {
    const icon = document.createElement("img");
    icon.src = url;
    icon.alt = "";
    icon.decoding = "async";
    Object.assign(icon.style, {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        height: `${ICON_HEIGHT}px`,
        transform: `translate(-50%, -50%)${mirrored ? " scaleX(-1)" : ""}`,
        imageRendering: "pixelated",
    });
    return icon;
}

/** Cover the container plus one tile of overscan; only grows, so resizes don't flicker */
function fillLayer(layer, container) {
    const cols = Math.ceil(container.clientWidth / TILE_SIZE) + 2;
    const rows = Math.ceil(container.clientHeight / TILE_SIZE) + 2;
    if (cols <= Number(layer.dataset.cols || 0) && rows <= Number(layer.dataset.rows || 0)) return;

    const fragment = document.createDocumentFragment();
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;
            // Staggered pair; the second one faces the other way for a little variety
            fragment.appendChild(makeIcon(layer.dataset.url, x + TILE_SIZE / 4, y + TILE_SIZE / 4, false));
            fragment.appendChild(makeIcon(layer.dataset.url, x + (TILE_SIZE * 3) / 4, y + (TILE_SIZE * 3) / 4, true));
        }
    }
    layer.replaceChildren(fragment);
    layer.style.width = `${cols * TILE_SIZE}px`;
    layer.style.height = `${rows * TILE_SIZE}px`;
    layer.dataset.cols = String(cols);
    layer.dataset.rows = String(rows);
}

function refillLayers(container) {
    container.querySelectorAll(".tile-pattern").forEach((layer) => fillLayer(layer, container));
}

function createLayer(url) {
    const layer = document.createElement("div");
    layer.className = "tile-pattern";
    layer.dataset.url = url;
    // Starts one tile up and left, so sliding by a tile never shows an edge
    Object.assign(layer.style, {
        position: "absolute",
        top: `${-TILE_SIZE}px`,
        left: `${-TILE_SIZE}px`,
        opacity: "0",
        willChange: "transform, opacity",
        pointerEvents: "none",
    });
    return layer;
}

function removeLayer(layer) {
    layer.getAnimations().forEach((animation) => animation.cancel());
    layer.remove();
}

/** Remove the pattern from the container */
export function clearTilePattern(container) {
    renderTokens.set(container, {});
    container.querySelectorAll(".tile-pattern").forEach(removeLayer);
}

/**
 * Show spriteUrl's icon as a drifting pattern in container, crossfading from any previous one.
 * Resolves false (and keeps the old pattern) if the icon can't be loaded.
 */
export async function mountTilePattern(container, { spriteUrl }) {
    const token = {};
    renderTokens.set(container, token);

    try {
        // Load once up front so the grid appears complete, not icon by icon
        await loadImage(spriteUrl);
    } catch (err) {
        console.error("Failed to render background pattern:", err);
        return false;
    }
    if (renderTokens.get(container) !== token) return false;

    if (getComputedStyle(container).position === "static") container.style.position = "relative";
    container.style.overflow = "hidden";
    resizeObserver?.observe(container);

    const previous = [...container.querySelectorAll(".tile-pattern")];
    const layer = createLayer(spriteUrl);
    fillLayer(layer, container);
    container.appendChild(layer);

    if (!prefersReducedMotion()) {
        layer.animate(
            [{ transform: "translate(0, 0)" }, { transform: `translate(${TILE_SIZE}px, ${TILE_SIZE}px)` }],
            { duration: (TILE_SIZE / DRIFT_PX_PER_SECOND) * 1000, iterations: Infinity, easing: "linear" }
        );
    }

    layer.animate(
        [{ opacity: 0 }, { opacity: PATTERN_OPACITY }],
        { duration: CROSSFADE_MS, easing: "ease-out", fill: "forwards" }
    );
    previous.forEach((old) =>
        old.animate([{ opacity: PATTERN_OPACITY }, { opacity: 0 }], {
            duration: CROSSFADE_MS,
            easing: "ease-in",
            fill: "forwards",
        })
    );
    // A timer, not the animation's finished promise: a hidden OBS source renders no frames,
    // so animations never finish there and old layers would pile up
    setTimeout(() => previous.forEach(removeLayer), CROSSFADE_MS + 50);
    return true;
}
