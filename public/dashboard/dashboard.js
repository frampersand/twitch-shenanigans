import createRandomizedCard from "/sources/randomizer/randomizer.js";
import { createDesignCard, DESIGNS } from "/sources/randomizer/designs.js";
import { generatePortrait } from "/sources/pmd-chat/index.js";
import { applyChannelSettings } from "/sources/pmd-chat/layout.js";
import { REWARD_ICONS, REWARD_INFO } from "/shared/features.js";
import { CARD_STYLES, RANDOMIZER_GAMES, RANDOM_CARD_STYLE, resolveCardStyle } from "/shared/randomizerGames.js";

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

const state = { me: null, settings: null };

/* ---------- API ---------- */

async function api(path, { method = "GET", body } = {}) {
    const response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || response.statusText), { status: response.status });
    return data;
}

let toastTimer = null;
function toast(message, isError = false) {
    const node = $("toast");
    node.textContent = message;
    node.classList.toggle("error", isError);
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 2200);
}

async function save(path, body, onSaved) {
    try {
        const result = await api(`/api/dashboard/${state.settings.channel}/${path}`, { method: "PUT", body });
        onSaved?.(result);
        toast("Saved");
    } catch (err) {
        toast(err.status === 401 ? "Your login expired. Log in again." : "That didn't save. Try again.", true);
    }
}

/* ---------- Messages (logged out, no channel) ---------- */

function showMessage(title, paragraphs, action) {
    const panel = $("message-panel");
    panel.replaceChildren(el("h1", null, title), ...paragraphs.map((text) => el("p", null, text)));
    if (action) {
        const link = el("a", "button button-twitch", action.label);
        link.href = action.href;
        panel.appendChild(link);
    }
    panel.hidden = false;
    $("settings").hidden = true;
}

/* ---------- Channel points status ---------- */

const POINTS_STATUS = {
    enabled: ["ok", "Channel points connected: every redemption reaches FramperBot, with or without text."],
    webhook_callback_verification_pending: ["wait", "Channel points connecting: Twitch is verifying FramperBot. Refresh in a minute."],
    not_connected: ["", "Channel points not connected yet. The broadcaster logs in here to connect them; until then, only rewards that ask for text work."],
};

function renderStatus() {
    const { channelPoints } = state.settings;
    const [kind, text] = POINTS_STATUS[channelPoints] ?? ["", `Channel points disconnected (${channelPoints}). The broadcaster can log in again to reconnect.`];
    const node = $("points-status");
    node.replaceChildren(el("span", `dot ${kind}`), el("span", null, text));
}

/* ---------- Rewards ---------- */

function rewardWarnings(feature, reward) {
    const warnings = [];
    if (!reward) return warnings;
    if (feature.text === "required" && !reward.requiresText) {
        warnings.push(`This reward doesn't ask viewers for text, but this effect needs ${feature.textHint}. Turn on "Require viewer to enter text" for it on Twitch.`);
    }
    if (feature.text === "none" && !reward.requiresText && state.settings.channelPoints !== "enabled") {
        warnings.push("Without channel points connected, rewards that don't ask for text never reach FramperBot.");
    }
    if (!reward.enabled) warnings.push("This reward is turned off on Twitch.");
    return warnings;
}

function renderRewards() {
    const { rewards, rewardsAvailable, rewardLinks, channel } = state.settings;
    const ownChannel = state.me.login === channel;
    const note = $("rewards-note");
    $("refresh-rewards").hidden = !ownChannel;

    let noteText = "";
    if (rewards === null) noteText = ownChannel ? "Log in again to load your rewards." : `${channel} hasn't logged in here yet, so their rewards can't be listed. Ask them to log in at this page.`;
    else if (rewardsAvailable === false) noteText = "Twitch only has channel point rewards for Affiliates and Partners.";
    else if (!rewards.length) noteText = "No custom rewards found. Create some on Twitch, then refresh this list.";
    note.textContent = noteText;
    note.hidden = !noteText;

    const rows = $("reward-rows");
    rows.replaceChildren();
    for (const feature of REWARD_INFO) {
        const row = el("div", "reward-row");
        const icon = el("span", "reward-icon");
        icon.style.background = feature.color;
        icon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${REWARD_ICONS[feature.id]}</svg>`;

        const text = el("div", "reward-text");
        text.append(el("h3", null, feature.title), el("p", null, feature.description));

        const select = el("select");
        select.setAttribute("aria-label", `Reward for ${feature.title}`);
        select.add(new Option("Not linked", ""));
        for (const reward of rewards ?? []) {
            select.add(new Option(`${reward.title} · ${reward.cost.toLocaleString()} pts${reward.requiresText ? " · asks for text" : ""}`, reward.id));
        }
        select.value = rewardLinks[feature.id] ?? "";
        select.disabled = !rewards?.length;
        select.addEventListener("change", () =>
            save("rewards", { feature: feature.id, rewardId: select.value || null }, (result) => {
                state.settings.rewardLinks = result.rewardLinks;
                renderRewards();
            })
        );

        const linked = (rewards ?? []).find((reward) => reward.id === rewardLinks[feature.id]);
        const warnings = el("div", "reward-warnings");
        for (const warning of rewardWarnings(feature, linked)) warnings.appendChild(el("p", "warning", warning));

        row.append(icon, text, select, warnings);
        rows.appendChild(row);
    }
}

/* ---------- Card style ---------- */

const STYLE_TEXT = {
    classic: "The original card: art spins through picks and settles",
    ...Object.fromEntries(Object.entries(DESIGNS).map(([id, design]) => [id, design.description])),
    [RANDOM_CARD_STYLE]: "A different style on every roll",
};

let previewGame = 0;
async function previewCard(setting) {
    const stage = $("style-preview");
    stage.replaceChildren();
    const games = Object.keys(RANDOMIZER_GAMES);
    const game = games[previewGame++ % games.length];
    const style = resolveCardStyle(setting);
    const name = state.settings.channel;
    if (Object.hasOwn(DESIGNS, style)) await createDesignCard({ design: style, username: name, target: stage, game });
    else await createRandomizedCard(name, stage, null, game);
}

function renderCardStyles() {
    const grid = $("style-grid");
    grid.replaceChildren();
    const options = [...Object.entries(CARD_STYLES).map(([id, style]) => [id, style.label]), [RANDOM_CARD_STYLE, "Random"]];
    for (const [id, label] of options) {
        const tile = el("button", "style-tile");
        tile.type = "button";
        tile.setAttribute("role", "radio");
        tile.setAttribute("aria-checked", String(state.settings.cardStyle === id));
        tile.append(el("span", "style-name", label), el("span", "style-desc", STYLE_TEXT[id]));
        tile.addEventListener("click", () => {
            previewCard(id);
            if (state.settings.cardStyle === id) return;
            save("card-style", { cardStyle: id }, (result) => {
                state.settings.cardStyle = result.cardStyle;
                renderCardStyles();
            });
        });
        grid.appendChild(tile);
    }
}

/* ---------- PMD chat ---------- */

const SAMPLE_MESSAGES = [
    { name: "PokeFan42", color: "#ff7f50", portrait: "25", variant: "Happy", text: "this overlay is so clean" },
    { name: "NightOwl_", color: "#1e90ff", portrait: "163", variant: "Normal", text: "rain incoming?" },
    { name: "UniteMain", color: "#daa520", portrait: "778", variant: "Joyous", text: "W stream" },
];

const fullHex = (color) => /^#[0-9a-f]{3}$/i.test(color) ? `#${[...color.slice(1)].map((c) => c + c).join("")}` : color;

async function renderPmdPreview() {
    const container = $("chat-container");
    container.replaceChildren();
    applyChannelSettings(state.settings.pmd);
    const userBase = SAMPLE_MESSAGES.map(({ name, portrait, variant }) => ({ username: name, portrait, variant }));
    for (const message of SAMPLE_MESSAGES) {
        await generatePortrait(message.text, message.name, userBase, { color: message.color });
    }
}

function renderPmdControls() {
    const form = $("pmd-controls");
    const { pmd } = state.settings;
    for (const input of form.elements) {
        if (input.type === "radio") input.checked = pmd[input.name] === input.value;
        else if (input.type === "checkbox") input.checked = Boolean(pmd[input.name]);
        else if (input.type === "color") input.value = fullHex(pmd[input.name]);
        else if (input.type === "number") input.value = String(pmd[input.name] ?? "");
    }
}

function bindPmdControls() {
    $("pmd-controls").addEventListener("change", (event) => {
        const input = event.target;
        const value = input.type === "checkbox" ? input.checked : input.value;
        save("pmd", { preference: input.name, value }, (result) => {
            state.settings.pmd = result.pmd;
            renderPmdPreview();
        });
    });
}

/* ---------- OBS setup ---------- */

const OBS_SOURCES = [
    { name: "Randomizer cards", path: "/sources/randomizer/", size: "1920 × 1080" },
    { name: "PMD chat", path: "/sources/pmd-chat/", size: "600 × 1080" },
    { name: "Pokémon sprite border", path: "/sources/sprites/", size: "1920 × 1080" },
    { name: "Background color and pattern", path: "/sources/background/", size: "1920 × 1080" },
    { name: "Rain", path: "/sources/rain/", size: "1920 × 1080" },
];

function renderObs() {
    const rows = $("obs-rows");
    rows.replaceChildren();
    for (const source of OBS_SOURCES) {
        const url = `${location.origin}${source.path}?channel=${encodeURIComponent(state.settings.channel)}`;
        const row = el("div", "obs-row");
        const text = el("div", "obs-text");
        text.append(el("h3", null, source.name), el("p", null, source.size));
        const input = el("input");
        input.readOnly = true;
        input.value = url;
        input.setAttribute("aria-label", `${source.name} URL`);
        input.addEventListener("focus", () => input.select());
        const copy = el("button", "button small", "Copy");
        copy.type = "button";
        copy.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(url);
                toast("Copied");
            } catch {
                input.select();
                toast("Press Ctrl+C to copy", true);
            }
        });
        row.append(text, input, copy);
        rows.appendChild(row);
    }
}

/* ---------- Sign-up, terms, guide and removal ---------- */

async function acceptTerms(errorNode) {
    try {
        await api("/api/dashboard/join", { method: "POST", body: { acceptTerms: true } });
        return true;
    } catch (err) {
        errorNode.textContent = err.message === "channel_limit"
            ? "FramperBot is on as many channels as it can handle right now. Try again later."
            : "That didn't work. Try again.";
        return false;
    }
}

function showJoin() {
    $("message-panel").hidden = true;
    $("settings").hidden = true;
    $("join-channel").textContent = `${state.me.login}'s`;
    $("join-panel").hidden = false;
    $("join-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const error = $("join-error");
        if (!$("accept-terms").checked) {
            error.textContent = "Tick the box to accept the EULA and Privacy Policy first.";
            return;
        }
        error.textContent = "";
        // Logging in again now that the channel is joined connects channel points and reads the rewards
        if (await acceptTerms(error)) location.assign("/auth/twitch/login");
    });
    $("accept-terms").addEventListener("change", () => { $("join-error").textContent = ""; });
}

function renderTerms() {
    const { terms, channel } = state.settings;
    // Only the broadcaster can accept for their channel
    $("terms-card").hidden = terms.accepted === terms.current || state.me.login !== channel;
}

function bindTerms() {
    $("terms-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const error = $("terms-error");
        if (!$("terms-accept").checked) {
            error.textContent = "Tick the box to accept them first.";
            return;
        }
        if (await acceptTerms(error)) {
            state.settings.terms.accepted = state.settings.terms.current;
            renderTerms();
            toast("Thanks, terms accepted");
        }
    });
}

function renderGuide() {
    const { channelPoints, rewardLinks, rewardsAvailable, botName } = state.settings;
    const linked = Object.keys(rewardLinks).length;
    const bot = botName || "FramperBot";
    const steps = [
        {
            title: "Make FramperBot a VIP (recommended)",
            html: `In your chat, type <code>/vip ${bot}</code> so the bot can still answer when your chat is in follower-only, subscriber-only or slow mode.`,
        },
        {
            title: "Add the overlays to OBS",
            html: `Add the browser sources from <a href="#obs-title">OBS setup</a> below to your scenes. The randomizer and PMD chat are the most popular.`,
        },
        {
            title: "Connect channel points",
            done: channelPoints === "enabled",
            html: channelPoints === "enabled"
                ? "Connected: every redemption reaches FramperBot, even rewards that don't ask for text."
                : "Log in again on this page to connect them. Twitch may take a minute to confirm.",
        },
        {
            title: "Create and link your rewards",
            done: linked > 0,
            html: rewardsAvailable === false
                ? "Twitch only has channel point rewards for Affiliates and Partners. Commands like <code>!dealwithit</code> work without them."
                : `On Twitch, open Creator Dashboard → Viewer Rewards → Channel Points → Manage Rewards and create the ones you want. Background color and pattern need "Require viewer to enter text". Then press Refresh rewards below and pick them under Channel point rewards.${linked ? ` ${linked} linked so far.` : ""}`,
        },
        {
            title: "Try it",
            html: "With the randomizer source open, type <code>!dealwithit</code> in your chat. Or try <code>!portrait 25 happy</code>, then send a message to see it on the PMD chat.",
        },
    ];

    const list = $("guide-steps");
    list.replaceChildren();
    for (const step of steps) {
        const item = el("li", step.done ? "done" : "");
        const body = el("p");
        body.innerHTML = step.html;
        item.append(el("h3", null, step.title), body);
        list.appendChild(item);
    }
    const tracked = steps.filter((step) => step.done !== undefined);
    $("guide-progress").textContent = `${tracked.filter((step) => step.done).length} of ${tracked.length} setup checks done`;
    // Open for channels still setting up
    $("guide").open = linked === 0;
}

function renderDanger() {
    const { channel, isHome } = state.settings;
    $("danger-card").hidden = isHome;
    document.querySelectorAll(".danger-channel").forEach((node) => { node.textContent = channel; });
    $("leave-confirm").value = "";
    $("leave-error").textContent = "";
}

function bindDanger() {
    $("leave-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const { channel } = state.settings;
        const error = $("leave-error");
        if ($("leave-confirm").value.trim().toLowerCase() !== channel) {
            error.textContent = `Type ${channel} exactly to confirm.`;
            return;
        }
        try {
            await api(`/api/dashboard/${channel}/leave`, { method: "POST", body: { confirm: channel } });
            location.assign("/dashboard/");
        } catch {
            error.textContent = "That didn't work. Try again.";
        }
    });
}

/* ---------- Loading ---------- */

async function loadChannel(channel) {
    state.settings = await api(`/api/dashboard/${encodeURIComponent(channel)}`);
    $("channel-title").textContent = channel;
    renderStatus();
    renderTerms();
    renderGuide();
    renderDanger();
    renderRewards();
    renderCardStyles();
    renderPmdControls();
    renderPmdPreview();
    renderObs();
    $("message-panel").hidden = true;
    $("settings").hidden = false;
}

async function init() {
    const notice = new URLSearchParams(location.search).get("login");
    const me = await api("/api/me").catch(() => null);
    if (!me) return showMessage("Dashboard", ["The dashboard isn't reachable right now. Try again in a bit."]);
    state.me = me;

    if (!me.loggedIn) {
        if (!me.loginAvailable) return showMessage("Dashboard", ["Twitch login isn't set up on this server yet."]);
        const intro = "Log in with your Twitch account to manage FramperBot on your channel. FramperBot asks only to read your channel point rewards and redemptions.";
        const extra = notice === "failed" ? ["That login didn't work. Try again."] : notice === "cancelled" ? ["Login cancelled."] : [];
        return showMessage("Dashboard", [...extra, intro], { label: "Log in with Twitch", href: "/auth/twitch/login" });
    }

    $("user-chip").textContent = me.login;
    $("user-chip").hidden = false;
    $("logout").hidden = false;

    const { channels } = await api("/api/dashboard/channels");
    if (!channels.length) return showJoin();

    const initial = channels.includes(me.login) ? me.login : channels[0];
    if (channels.length > 1) {
        const select = $("channel-select");
        for (const channel of channels) select.add(new Option(channel, channel));
        select.value = initial;
        select.addEventListener("change", () => loadChannel(select.value).catch(() => toast("Couldn't load that channel.", true)));
        $("channel-picker").hidden = false;
    }
    bindPmdControls();
    bindTerms();
    bindDanger();
    await loadChannel(initial);
}

$("logout").addEventListener("click", async () => {
    await fetch("/auth/logout", { method: "POST" });
    location.assign("/dashboard/");
});

init().catch(() => showMessage("Dashboard", ["Something went wrong loading the dashboard. Refresh to try again."]));
