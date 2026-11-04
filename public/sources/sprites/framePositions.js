/**
 * Sprite slots centered on the edges of a width x height frame, about `slot` px apart.
 * Each entry is the top-left corner of a slot-sized box, like lists/positions.js.
 */
export function framePositions(width, height, slot = 50) {
    const across = Math.max(1, Math.round(width / slot));
    const down = Math.max(1, Math.round(height / slot));
    const at = (cx, cy) => ({ x: cx - slot / 2, y: cy - slot / 2, pokemon: null });
    const slots = [];
    for (let i = 0; i <= across; i++) {
        const cx = (i * width) / across;
        slots.push(at(cx, 0), at(cx, height));
    }
    for (let j = 1; j < down; j++) {
        const cy = (j * height) / down;
        slots.push(at(0, cy), at(width, cy));
    }
    return slots;
}
