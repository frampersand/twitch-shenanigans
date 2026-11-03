/**
 * Pokémon art (PMD portraits, box icons, UNITE renders) is served from the sprite CDN
 * (repo: pokemon-card-project-sprites), not from this app.
 */
export const CDN_BASE_URL = "https://cdn.frampersand.dev";

/** `file` is a manifest path like "0025/Happy^.png"; segments are encoded for the `^` variants */
export function pmdPortraitUrl(file, base = CDN_BASE_URL) {
    return `${base}/pmd/portrait/${file.split("/").map(encodeURIComponent).join("/")}`;
}

export function pmdManifestUrl(base = CDN_BASE_URL) {
    return `${base}/pmd/manifest.json`;
}

export function pokemonIconUrl(number, base = CDN_BASE_URL) {
    return `${base}/pokemon/icon/${number}.png`;
}

export function uniteImageUrl(id, base = CDN_BASE_URL) {
    return `${base}/unite/${encodeURIComponent(id)}.png`;
}
