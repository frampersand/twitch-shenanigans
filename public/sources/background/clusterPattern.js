const SPRITE_SIZE_SCALE = 1.15;
// Layer opacity for the whole pattern. Per-sprite alpha below stacks on top of this.
const PATTERN_CANVAS_OPACITY = 0.5;

const CLUSTER_PRESETS = [
    {
        id: "clouds",
        clusterCount: [6, 9],
        spritesPerCluster: [21, 30],
        clusterRadius: 158,
        minClusterSeparation: 380,
        spriteHeight: [22, 36],
        margin: 30,
        fillDensity: 24000,
    },
    {
        id: "islands",
        clusterCount: [5, 7],
        spritesPerCluster: [23, 32],
        clusterRadius: 188,
        minClusterSeparation: 450,
        spriteHeight: [28, 44],
        margin: 45,
        fillDensity: 27800,
    },
    {
        id: "dust",
        clusterCount: [14, 18],
        spritesPerCluster: [12, 17],
        clusterRadius: 107,
        minClusterSeparation: 298,
        spriteHeight: [16, 26],
        margin: 24,
        fillDensity: 19000,
    },
    {
        id: "constellation",
        clusterCount: [8, 12],
        spritesPerCluster: [25, 35],
        clusterRadius: 147,
        minClusterSeparation: 368,
        spriteHeight: [24, 38],
        margin: 35,
        fillDensity: 22500,
    },
];

let latestRenderId = 0;
let lastRenderState = null;
let resizeObserver = null;
const observedContainers = new WeakSet();

function createSeededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function randBetween(rng, min, max) {
    return min + rng() * (max - min);
}

function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
}

function getClusterReach(preset) {
    const maxSprite = preset.spriteHeight[1] * SPRITE_SIZE_SCALE;
    const spriteWidth = maxSprite * 1.15;
    return preset.clusterRadius + Math.max(maxSprite, spriteWidth) * 0.45;
}

function getMinClusterSeparation(width, height, preset) {
    const footprintGap = getClusterReach(preset) * 2.45;
    const requested = Math.max(preset.minClusterSeparation, footprintGap);
    const viewportCap = Math.min(width, height) * 0.5;
    return Math.min(requested, viewportCap);
}

function getClusterSpreadDistance(rng, clusterRadius) {
    return (0.08 + rng() * 0.97) * clusterRadius;
}

function scaleSpriteHeight(height) {
    return height * SPRITE_SIZE_SCALE;
}

function placeClusterCenters(width, height, preset, rng) {
    const targetCount = randInt(rng, preset.clusterCount[0], preset.clusterCount[1]);
    const minSep = getMinClusterSeparation(width, height, preset);
    const centers = [];
    const maxAttempts = targetCount * 80;

    for (let placed = 0; placed < targetCount; placed++) {
        let candidate = null;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const point = {
                x: randBetween(rng, preset.margin, width - preset.margin),
                y: randBetween(rng, preset.margin, height - preset.margin),
            };

            const isFarEnough = centers.every((center) => {
                const dx = center.x - point.x;
                const dy = center.y - point.y;
                return Math.hypot(dx, dy) >= minSep;
            });

            if (isFarEnough) {
                candidate = point;
                break;
            }
        }

        if (candidate) {
            centers.push(candidate);
        }
    }

    if (centers.length === 0) {
        centers.push({ x: width / 2, y: height / 2 });
    }

    return centers;
}

function addFillSprites(sprites, width, height, preset, rng, centers) {
    if (!preset.fillDensity) {
        return;
    }

    const count = Math.floor((width * height) / preset.fillDensity);
    const minGap = getClusterReach(preset) * 1.15;

    for (let i = 0; i < count; i++) {
        let point = null;

        for (let attempt = 0; attempt < 24; attempt++) {
            const candidate = {
                x: randBetween(rng, preset.margin, width - preset.margin),
                y: randBetween(rng, preset.margin, height - preset.margin),
            };

            const awayFromClusters = centers.every((center) => {
                const dx = center.x - candidate.x;
                const dy = center.y - candidate.y;
                return Math.hypot(dx, dy) >= minGap;
            });

            if (awayFromClusters) {
                point = candidate;
                break;
            }
        }

        if (!point) {
            continue;
        }

        sprites.push({
            x: point.x,
            y: point.y,
            height: scaleSpriteHeight(randBetween(rng, preset.spriteHeight[0] * 0.75, preset.spriteHeight[1] * 0.9)),
            alpha: randBetween(rng, 0.5, 0.65),
        });
    }
}

function buildClusterLayout(width, height, preset, rng) {
    const centers = placeClusterCenters(width, height, preset, rng);
    const sprites = [];

    for (const center of centers) {
        const count = randInt(
            rng,
            preset.spritesPerCluster[0],
            preset.spritesPerCluster[1]
        );

        for (let i = 0; i < count; i++) {
            const angle = rng() * Math.PI * 2;
            const distance = getClusterSpreadDistance(rng, preset.clusterRadius);
            sprites.push({
                x: center.x + Math.cos(angle) * distance,
                y: center.y + Math.sin(angle) * distance,
                height: scaleSpriteHeight(randBetween(rng, preset.spriteHeight[0], preset.spriteHeight[1])),
                alpha: randBetween(rng, 0.6, 1),
            });
        }
    }

    addFillSprites(sprites, width, height, preset, rng, centers);

    return sprites;
}

function ensureCanvas(container) {
    container.style.position = "relative";

    let canvas = container.querySelector("canvas.pattern-canvas");
    if (!canvas) {
        container.replaceChildren();
        canvas = document.createElement("canvas");
        canvas.className = "pattern-canvas";
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        container.appendChild(canvas);
    }

    container.style.backgroundImage = "none";
    return canvas;
}

function stylePatternCanvas(canvas) {
    canvas.style.opacity = String(PATTERN_CANVAS_OPACITY);
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

function drawSprite(ctx, img, sprite) {
    const scale = sprite.height / img.naturalHeight;
    const width = img.naturalWidth * scale;
    const x = sprite.x - width / 2;
    const y = sprite.y - sprite.height / 2;

    ctx.save();
    ctx.globalAlpha = sprite.alpha;
    ctx.drawImage(img, x, y, width, sprite.height);
    ctx.restore();
}

function getCanvasSize(container) {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    return { width: Math.max(width, 1), height: Math.max(height, 1) };
}

function pickPatternIndex(pokemonNumber, isRandom) {
    if (isRandom) {
        return Math.floor(Math.random() * CLUSTER_PRESETS.length);
    }
    return pokemonNumber % CLUSTER_PRESETS.length;
}

function buildSeed(pokemonNumber, patternIndex, isRandom) {
    if (isRandom) {
        return Math.floor(Math.random() * 1_000_000_000);
    }
    return (pokemonNumber * 9973) + (patternIndex * 131);
}

async function renderClusterPattern(container, pokemonNumber, options = {}) {
    const { isRandom = false, spriteUrl } = options;
    const renderId = ++latestRenderId;
    const patternIndex = pickPatternIndex(pokemonNumber, isRandom);
    const preset = CLUSTER_PRESETS[patternIndex];
    const seed = buildSeed(pokemonNumber, patternIndex, isRandom);
    const rng = createSeededRandom(seed);

    lastRenderState = { container, pokemonNumber, isRandom, spriteUrl };

    const canvas = ensureCanvas(container);
    stylePatternCanvas(canvas);
    const { width, height } = getCanvasSize(container);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    try {
        const img = await loadImage(spriteUrl);
        if (renderId !== latestRenderId) {
            return;
        }

        const sprites = buildClusterLayout(width, height, preset, rng);
        for (const sprite of sprites) {
            drawSprite(ctx, img, sprite);
        }

        container.dataset.pattern = preset.id;
    } catch (err) {
        console.error("Failed to render cluster pattern:", err);
        container.dataset.pattern = "error";
    }
}

function bindResizeHandler() {
    if (resizeObserver || typeof ResizeObserver === "undefined") {
        return;
    }

    resizeObserver = new ResizeObserver(() => {
        if (!lastRenderState) {
            return;
        }

        const { container, pokemonNumber, isRandom, spriteUrl } = lastRenderState;
        renderClusterPattern(container, pokemonNumber, { isRandom, spriteUrl });
    });
}

export function mountClusterPattern(container, pokemonNumber, options = {}) {
    bindResizeHandler();

    if (!observedContainers.has(container)) {
        resizeObserver.observe(container);
        observedContainers.add(container);
    }

    return renderClusterPattern(container, pokemonNumber, options);
}

export { CLUSTER_PRESETS, pickPatternIndex };
