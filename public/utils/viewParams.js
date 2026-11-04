/**
 * Layout options for full-canvas OBS sources, read from the URL. They let a browser source
 * stay at 1920x1080 and scale 1 in OBS (crisp text and sprites) instead of being cropped and
 * stretched there.
 */

const params = () => new URLSearchParams(window.location.search);

/** A number from the URL, or null when missing or outside [min, max] */
export function numberParam(name, { min = -Infinity, max = Infinity } = {}, search = params()) {
    const raw = search.get(name);
    if (raw === null || raw.trim() === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

/** `?name=a,b,c,d` as four numbers, or null */
export function rectParam(name, search = params()) {
    const raw = search.get(name);
    if (!raw) return null;
    const parts = raw.split(",").map(Number);
    if (parts.length !== 4 || !parts.every(Number.isFinite) || parts[2] <= 0 || parts[3] <= 0) return null;
    const [x, y, width, height] = parts;
    return { x, y, width, height };
}

/**
 * Scale el's content by `scale` while it still fills its box: the element is laid out at
 * 1/scale of the size, then scaled back up from the top-left corner.
 */
export function scaleToFill(el, scale) {
    if (!el || !scale || scale === 1) return;
    Object.assign(el.style, {
        width: `${100 / scale}%`,
        height: `${100 / scale}vh`,
        transform: `scale(${scale})`,
        transformOrigin: "0 0",
    });
}

/**
 * Center el's children on the point (x, y) in page px, optionally scaled around that point.
 * el becomes a zero-size anchor; a flex container keeps its children centered on it.
 */
export function anchorAt(el, { x, y, scale = 1 }) {
    if (!el) return;
    Object.assign(el.style, {
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        width: "0",
        height: "0",
        overflow: "visible",
        transform: scale === 1 ? "" : `scale(${scale})`,
        transformOrigin: "0 0",
    });
}
