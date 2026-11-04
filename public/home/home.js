import { mountTilePattern } from "../sources/background/tilePattern.js";
import { pokemonIconUrl } from "/shared/cdn.js";
import { COMMAND_INFO, REWARD_ICONS, REWARD_INFO } from "/shared/features.js";
import { botReplies } from "/shared/bot-messages.js";

/** Hero backdrop: a few favorites, swapped every so often */
const HERO_POKEMON = [25, 143, 133, 448, 778, 6, 39, 197];
const HERO_SWAP_MS = 9000;

/** The hero's example chat: what a viewer does, then what the stream shows */
const EXAMPLE_CHAT = [
    { name: "PokeFan42", color: "#ff7f50", text: "!dealwithit" },
    { name: "FramperBot", color: "#a970ff", bot: true, text: "Get ready, its Pikachu time @PokeFan42" },
    { redeem: "NightOwl_", reward: "Summon the rain" },
    { name: "FramperBot", color: "#a970ff", bot: true, text: botReplies.rain("NightOwl_") },
    { name: "UniteMain", color: "#daa520", text: "!portrait 25 happy" },
    { redeem: "ModTeam", reward: "Background pattern", input: "143" },
    { name: "ChatLurker", color: "#1e90ff", text: "the background pattern goes hard" },
];
const CHAT_STEP_MS = 1600;
const CHAT_MAX_LINES = 5;

function svgIcon(id) {
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${REWARD_ICONS[id]}</svg>`;
}

function renderRewards() {
    const grid = document.getElementById("reward-grid");
    for (const reward of REWARD_INFO) {
        const card = document.createElement("article");
        card.className = "reward-card";
        card.innerHTML = `<span class="reward-icon" style="background:${reward.color}">${svgIcon(reward.id)}</span><h4></h4><p></p>`;
        card.querySelector("h4").textContent = reward.title;
        card.querySelector("p").textContent = reward.description;
        grid.appendChild(card);
    }
}

function renderCommands() {
    const list = document.getElementById("command-list");
    for (const command of COMMAND_INFO.filter((c) => !c.hidden)) {
        const row = document.createElement("div");
        row.className = "command-row";
        row.innerHTML = `<code></code><p></p><span class="command-who"></span>`;
        row.querySelector("code").textContent = command.usage;
        row.querySelector("p").textContent = command.description;
        row.querySelector(".command-who").textContent = command.who;
        list.appendChild(row);
    }
}

async function renderChannels() {
    const list = document.getElementById("channel-list");
    let channels = [];
    try {
        const response = await fetch("/api/channels");
        if (response.ok) channels = await response.json();
    } catch {
        // Leave the section with its fallback text
    }
    if (!channels.length) {
        list.innerHTML = "<li class=\"channel-empty\">The channel list isn't available right now.</li>";
        return;
    }
    for (const name of channels) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `https://www.twitch.tv/${encodeURIComponent(name)}`;
        link.rel = "noopener";
        link.className = "channel";
        const avatar = document.createElement("span");
        avatar.className = "channel-avatar";
        avatar.textContent = name.charAt(0).toUpperCase();
        const label = document.createElement("span");
        label.textContent = name;
        link.append(avatar, label);
        item.appendChild(link);
        list.appendChild(item);
    }
}

function chatLine(entry) {
    const line = document.createElement("li");
    if (entry.redeem) {
        line.className = "redeem";
        const who = document.createElement("strong");
        who.textContent = entry.redeem;
        const what = document.createElement("strong");
        what.textContent = entry.reward;
        line.append(who, document.createTextNode(" redeemed "), what);
        if (entry.input) line.append(document.createTextNode(` · ${entry.input}`));
        return line;
    }
    if (entry.bot) {
        const badge = document.createElement("span");
        badge.className = "bot-badge";
        badge.textContent = "BOT";
        line.appendChild(badge);
    }
    const name = document.createElement("span");
    name.className = "chat-name";
    name.style.color = entry.color;
    name.textContent = entry.name;
    line.append(name, document.createTextNode(`: ${entry.text}`));
    return line;
}

function startExampleChat() {
    const log = document.getElementById("hero-chat-log");
    let index = 0;
    const step = () => {
        log.appendChild(chatLine(EXAMPLE_CHAT[index % EXAMPLE_CHAT.length]));
        while (log.children.length > CHAT_MAX_LINES) log.firstChild.remove();
        index += 1;
    };
    for (let i = 0; i < 3; i++) step();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setInterval(step, CHAT_STEP_MS);
    }
}

function startHeroPattern() {
    const container = document.getElementById("hero-pattern");
    let index = Math.floor(Math.random() * HERO_POKEMON.length);
    const show = () => {
        mountTilePattern(container, { spriteUrl: pokemonIconUrl(HERO_POKEMON[index % HERO_POKEMON.length]) });
        index += 1;
    };
    show();
    setInterval(show, HERO_SWAP_MS);
}

renderRewards();
renderCommands();
renderChannels();
startExampleChat();
startHeroPattern();
