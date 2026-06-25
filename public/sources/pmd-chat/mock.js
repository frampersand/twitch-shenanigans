import { generatePortrait } from "./index.js";
import { truncateString } from "../../utils/utils.js";
import { loadUniteRoster } from "../../utils/loadUniteRoster.js";
import { randomizerMessages } from "../../lists/bot-messages.js";

const DEFAULT_USERBASE = [
    {
        username: "Frampersand",
        portrait: "143",
        variant: "Inspired",
    },
];

function parseMockInterval(urlParams) {
    const parsed = Number.parseInt(urlParams.get("mockInterval") ?? "5000", 10);
    if (!Number.isFinite(parsed) || parsed < 1000) return 5000;
    return parsed;
}

function randomHexColor() {
    return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
}

function randomRosterName(roster) {
    if (!Array.isArray(roster) || roster.length === 0) {
        return "Pikachu";
    }
    return roster[Math.floor(Math.random() * roster.length)].name;
}

export function startMockChat(urlParams, channelName) {
    if (!urlParams.has("mock")) return null;

    const intervalMs = parseMockInterval(urlParams);
    const username = urlParams.get("mockUser") || "Frampersand";
    const userBase = DEFAULT_USERBASE.map((user) => ({
        ...user,
        username,
    }));

    let uniteRoster = [];
    loadUniteRoster()
        .then((roster) => {
            uniteRoster = roster;
        })
        .catch((err) => {
            console.error("Failed to load unite roster for mock chat:", err);
        });

    if (!document.getElementById("chat-container")) {
        console.error("[pmd-chat mock] #chat-container not found — mock mode disabled");
        return null;
    }

    console.warn(`[pmd-chat mock] active for #${channelName} — "${username}" every ${intervalMs}ms`);

    const tick = () => {
        try {
            const message = randomizerMessages(username, randomRosterName(uniteRoster));
            generatePortrait(
                message,
                truncateString(username, 25),
                userBase,
                { color: randomHexColor() }
            );
        } catch (error) {
            console.error("[pmd-chat mock] failed to render message:", error);
        }
    };

    tick();
    const intervalId = window.setInterval(tick, intervalMs);
    window.addEventListener("beforeunload", () => window.clearInterval(intervalId));

    return intervalId;
}
