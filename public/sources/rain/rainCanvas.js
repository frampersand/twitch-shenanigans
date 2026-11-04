/**
 * Rain drawn on a canvas inside a container, so the overlay needs no external GIF.
 * The container keeps its CSS fade (opacity on .active / .fade); this only draws the drops.
 */

const DROP_COLOR = "rgba(174, 194, 224, 0.55)";
/** Drops per 100 px of width */
const DENSITY = 9;
/** Horizontal drift per unit of fall, for a slight slant */
const WIND = 0.18;

const running = new WeakMap();

function makeDrop(width, height, fromTop) {
    const speed = 700 + Math.random() * 500; // px per second
    return {
        x: Math.random() * (width + height * WIND) - height * WIND,
        y: fromTop ? -Math.random() * height : Math.random() * height,
        length: 14 + Math.random() * 22,
        speed,
    };
}

/** Start (or restart) the rain in container. Safe to call repeatedly. */
export function startRainCanvas(container) {
    if (!container) return;
    stopRainCanvas(container);

    let canvas = container.querySelector("canvas.rain-canvas");
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.className = "rain-canvas";
        Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
        if (getComputedStyle(container).position === "static") container.style.position = "relative";
        container.appendChild(canvas);
    }
    const ctx = canvas.getContext("2d");
    let drops = [];
    let width = 0;
    let height = 0;

    const resize = () => {
        const ratio = window.devicePixelRatio || 1;
        width = container.clientWidth;
        height = container.clientHeight;
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const count = Math.round((width / 100) * DENSITY);
        drops = Array.from({ length: count }, () => makeDrop(width, height, false));
    };
    resize();

    let last = performance.now();
    const state = { frame: 0, resize };
    const tick = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (container.clientWidth !== width || container.clientHeight !== height) resize();
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = DROP_COLOR;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (const drop of drops) {
            drop.y += drop.speed * dt;
            drop.x += drop.speed * dt * WIND;
            if (drop.y - drop.length > height) Object.assign(drop, makeDrop(width, height, true));
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - drop.length * WIND, drop.y - drop.length);
        }
        ctx.stroke();
        state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
    running.set(container, state);
}

/** Stop drawing (call after the fade-out; the canvas stays so a restart is instant) */
export function stopRainCanvas(container) {
    const state = container && running.get(container);
    if (!state) return;
    cancelAnimationFrame(state.frame);
    running.delete(container);
}
