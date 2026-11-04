// tinycolor is loaded as a global from /libs/tinycolor/tinycolor.js by the host page
import {
    ShaderMount,
    ShaderFitOptions,
    defaultObjectSizing,
    getShaderColorFromString,
    getShaderNoiseTexture,
    GrainGradientShapes,
    WarpPatterns,
    meshGradientFragmentShader,
    grainGradientFragmentShader,
    warpFragmentShader,
    swirlFragmentShader,
    neuroNoiseFragmentShader,
    metaballsFragmentShader,
    godRaysFragmentShader,
} from "/libs/paper-shaders/index.js";
import { FALLBACK_COLOR, PLAIN_SCENE, SCENES } from "/shared/shaderScenes.js";

const FADE_MS = 1500;

/** Paper's shared noise texture: a data URL image that must finish loading before a shader uses it */
let noiseTexture = null;
const noiseReady = new Promise((resolve) => {
    const img = getShaderNoiseTexture();
    const done = () => { noiseTexture = img; resolve(); };
    if (img.complete && img.naturalWidth) done();
    else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
    }
});
const COLOR_KEYS = ["colorBack", "colorFront", "colorMid", "colorBloom"];

/** Paper param names → uniforms, per shader (mirrors Paper's React wrappers) */
const SHADERS = {
    meshGradient: {
        fragment: meshGradientFragmentShader,
        uniforms: (p) => ({
            u_colors: p.colors.map(getShaderColorFromString),
            u_colorsCount: p.colors.length,
            u_distortion: p.distortion,
            u_swirl: p.swirl,
            u_grainMixer: p.grainMixer,
            u_grainOverlay: p.grainOverlay,
        }),
    },
    grainGradient: {
        fragment: grainGradientFragmentShader,
        uniforms: (p) => ({
            u_colorBack: getShaderColorFromString(p.colorBack),
            u_colors: p.colors.map(getShaderColorFromString),
            u_colorsCount: p.colors.length,
            u_softness: p.softness,
            u_intensity: p.intensity,
            u_noise: p.noise,
            u_shape: GrainGradientShapes[p.shape],
            u_noiseTexture: noiseTexture,
        }),
    },
    warp: {
        fragment: warpFragmentShader,
        uniforms: (p) => ({
            u_colors: p.colors.map(getShaderColorFromString),
            u_colorsCount: p.colors.length,
            u_proportion: p.proportion,
            u_softness: p.softness,
            u_distortion: p.distortion,
            u_swirl: p.swirl,
            u_swirlIterations: p.swirlIterations,
            u_shapeScale: p.shapeScale,
            u_shape: WarpPatterns[p.shape],
            u_noiseTexture: noiseTexture,
        }),
    },
    swirl: {
        fragment: swirlFragmentShader,
        uniforms: (p) => ({
            u_colorBack: getShaderColorFromString(p.colorBack),
            u_colors: p.colors.map(getShaderColorFromString),
            u_colorsCount: p.colors.length,
            u_bandCount: p.bandCount,
            u_twist: p.twist,
            u_center: p.center,
            u_proportion: p.proportion,
            u_softness: p.softness,
            u_noiseFrequency: p.noiseFrequency,
            u_noise: p.noise,
        }),
    },
    neuroNoise: {
        fragment: neuroNoiseFragmentShader,
        uniforms: (p) => ({
            u_colorFront: getShaderColorFromString(p.colorFront),
            u_colorMid: getShaderColorFromString(p.colorMid),
            u_colorBack: getShaderColorFromString(p.colorBack),
            u_brightness: p.brightness,
            u_contrast: p.contrast,
        }),
    },
    metaballs: {
        fragment: metaballsFragmentShader,
        uniforms: (p) => ({
            u_colorBack: getShaderColorFromString(p.colorBack),
            u_colors: p.colors.map(getShaderColorFromString),
            u_colorsCount: p.colors.length,
            u_size: p.size,
            u_count: p.count,
            u_noiseTexture: noiseTexture,
        }),
    },
    godRays: {
        fragment: godRaysFragmentShader,
        uniforms: (p) => ({
            u_colorBloom: getShaderColorFromString(p.colorBloom),
            u_colorBack: getShaderColorFromString(p.colorBack),
            u_colors: p.colors.map(getShaderColorFromString),
            u_colorsCount: p.colors.length,
            u_density: p.density,
            u_spotty: p.spotty,
            u_midIntensity: p.midIntensity,
            u_midSize: p.midSize,
            u_intensity: p.intensity,
            u_bloom: p.bloom,
            u_noiseTexture: noiseTexture,
        }),
    },
};

const sizingUniforms = (p) => ({
    u_fit: ShaderFitOptions[p.fit],
    u_scale: p.scale,
    u_rotation: p.rotation,
    u_offsetX: p.offsetX,
    u_offsetY: p.offsetY,
    u_originX: p.originX,
    u_originY: p.originY,
    u_worldWidth: p.worldWidth,
    u_worldHeight: p.worldHeight,
});

/**
 * One picked color as five tones, light to dark: what a scene is repainted with. The base is
 * kept inside a middle band so there's always a darker and a lighter tone around it.
 */
export function paletteFrom(color) {
    const { h, s } = tinycolor(color).toHsl();
    const base = tinycolor(color).toHsl();
    const tone = (l, sat = s) => tinycolor({ h, s: sat, l }).toHexString();
    return {
        deep: tone(0.07, Math.min(s, 0.55)),
        dark: tone(0.24),
        base: tone(Math.min(0.64, Math.max(0.38, base.l))),
        light: tone(0.76),
        glow: tone(0.93, Math.min(s, 0.8)),
    };
}

/** Which tone replaces a scene color, from that color's own lightness (keeps the scene's light/dark design) */
const toneFor = (l) => (l < 0.15 ? "deep" : l < 0.35 ? "dark" : l < 0.68 ? "base" : l < 0.85 ? "light" : "glow");

/**
 * Repaint a scene with the tones of one color. Each scene color takes the tone closest to its
 * own lightness and keeps its alpha; repeats of a tone get a small hue shift so the motion
 * between them stays visible.
 */
function repaint(params, color) {
    const palette = paletteFrom(color);
    const used = {};
    const recolor = (original) => {
        const hsl = tinycolor(original).toHsl();
        const role = toneFor(hsl.l);
        const repeat = used[role] = (used[role] ?? -1) + 1;
        const shift = repeat === 0 ? 0 : (repeat % 2 ? 1 : -1) * 14 * Math.ceil(repeat / 2);
        return tinycolor(palette[role]).spin(shift).setAlpha(hsl.a).toHex8String();
    };
    const painted = { ...params };
    for (const key of COLOR_KEYS) if (params[key]) painted[key] = recolor(params[key]);
    if (params.colors) painted.colors = params.colors.map(recolor);
    return painted;
}

/** The plain color look: the same gradient the Pokémon pattern source has always painted */
export function plainGradient(color) {
    const darker = tinycolor(color).darken(20).toString();
    return `linear-gradient(315deg, ${color} 0%, ${darker} 100%)`;
}

/** The colors a scene is drawn with, painted with `color` or its own (also used for dashboard swatches) */
export function sceneColors(sceneId, color) {
    const scene = SCENES[sceneId];
    if (!scene) return [];
    const params = color ? repaint(scene.params, color) : scene.params;
    return [params.colorBack, params.colorMid, ...(params.colors ?? []), params.colorFront].filter(Boolean);
}

/** A CSS gradient in the scene's colors: the swatch, and the fallback without WebGL */
export function sceneGradient(sceneId, color) {
    if (sceneId === PLAIN_SCENE) return plainGradient(color ?? FALLBACK_COLOR);
    const colors = sceneColors(sceneId, color).map((c) => tinycolor(c).setAlpha(1).toHexString());
    return colors.length > 1 ? `linear-gradient(135deg, ${colors.join(", ")})` : colors[0] ?? "transparent";
}

const keyOf = ({ scene, color, speed }) => `${scene}|${color}|${speed}`;

function mountLayer(container, look, { maxPixelCount, minPixelRatio }) {
    const layer = document.createElement("div");
    layer.className = "scene-layer";
    container.appendChild(layer);

    if (look.scene === PLAIN_SCENE) {
        layer.style.background = plainGradient(look.color ?? FALLBACK_COLOR);
        return { layer, mount: null, key: keyOf(look) };
    }

    const scene = SCENES[look.scene];
    const shader = SHADERS[scene.shader];
    const params = { ...defaultObjectSizing, ...(look.color ? repaint(scene.params, look.color) : scene.params) };
    let mount = null;
    try {
        mount = new ShaderMount(
            layer,
            shader.fragment,
            { ...shader.uniforms(params), ...sizingUniforms(params) },
            undefined,
            scene.speed * look.speed,
            // A random start so two scenes (or two reloads) don't open on the same frame
            Math.floor(Math.random() * 60_000),
            minPixelRatio,
            maxPixelCount
        );
    } catch (err) {
        // No WebGL (or it failed): a still gradient in the same colors
        console.error("Animated scene could not start WebGL:", err);
        layer.style.background = sceneGradient(look.scene, look.color);
    }
    return { layer, mount, key: keyOf(look) };
}

/**
 * A full-size stage that shows one look at a time (a plain color, or a scene painted in a
 * color) and crossfades to the next. `maxPixelCount` caps the render size (the overlay renders
 * at 1080p by default to spare the streamer's GPU); the dashboard preview passes less.
 */
export function createSceneStage(container, { maxPixelCount = 1920 * 1080, minPixelRatio = 1 } = {}) {
    let current = null;
    let latest = 0;

    async function show(look) {
        const request = ++latest;
        await noiseReady;
        if (request !== latest) return;
        if (look.scene !== PLAIN_SCENE && !Object.hasOwn(SCENES, look.scene)) return;
        const next = { scene: look.scene, color: look.color ?? null, speed: look.speed ?? 1 };
        if (current?.key === keyOf(next)) return;

        // Same scene and color, only the speed changed: no need to rebuild it
        if (current?.mount && current.key === keyOf({ ...next, speed: current.key.split("|")[2] })) {
            current.mount.setSpeed(SCENES[next.scene].speed * next.speed);
            current.key = keyOf(next);
            return;
        }

        const previous = current;
        current = mountLayer(container, next, { maxPixelCount, minPixelRatio });
        if (!previous) {
            current.layer.classList.add("visible");
            return;
        }
        // Fade the new layer in over the old one, then drop the old one (on a timer: a hidden
        // OBS source may never fire transition events)
        const incoming = current.layer;
        setTimeout(() => incoming.classList.add("visible"), 30);
        setTimeout(() => {
            previous.mount?.dispose();
            previous.layer.remove();
        }, FADE_MS + 100);
    }

    function destroy() {
        current?.mount?.dispose();
        container.replaceChildren();
        current = null;
    }

    return { show, destroy };
}

export { FADE_MS };
