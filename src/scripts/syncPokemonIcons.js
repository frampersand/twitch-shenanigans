import { promises as fs } from "fs";
import path from "path";
import fetch from "node-fetch";
import { config } from "../config/index.js";
import pokemon from "../../public/lists/pokemon-list.js";
import { getPokemonIconFilename } from "../../public/utils/pokemonIcons.js";

const { pokemonIconsFolder } = config;
const CONCURRENCY = 8;

function getRemoteIconUrl(entry) {
    const filename = getPokemonIconFilename(entry.name);
    const base = entry.number > 898
        ? "https://img.pokemondb.net/sprites/scarlet-violet/icon/"
        : "https://img.pokemondb.net/sprites/sword-shield/icon/";

    return `${base}${filename}.png`;
}

function getLocalIconPath(entry) {
    const series = entry.number > 898 ? "scarlet-violet" : "sword-shield";
    const filename = getPokemonIconFilename(entry.name);
    return path.join(pokemonIconsFolder, series, `${filename}.png`);
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function downloadIcon(entry) {
    const destination = getLocalIconPath(entry);

    if (await fileExists(destination)) {
        return { name: entry.name, status: "skipped" };
    }

    const response = await fetch(getRemoteIconUrl(entry), {
        headers: { "User-Agent": "twitch-shenanigans/1.0" },
    });

    if (!response.ok) {
        return { name: entry.name, status: "failed", code: response.status };
    }

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
    return { name: entry.name, status: "downloaded" };
}

async function runPool(items, worker) {
    const results = [];
    let index = 0;

    async function next() {
        while (index < items.length) {
            const current = items[index++];
            results.push(await worker(current));
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, next));
    return results;
}

const results = await runPool(pokemon, downloadIcon);

const summary = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
}, {});

const failed = results.filter((result) => result.status === "failed");

console.log(
    `Pokemon icon sync complete. downloaded=${summary.downloaded || 0}, skipped=${summary.skipped || 0}, failed=${summary.failed || 0}`
);

if (failed.length) {
    console.log("Failed icons:");
    for (const entry of failed) {
        console.log(`  ${entry.name} (${entry.code})`);
    }
}
