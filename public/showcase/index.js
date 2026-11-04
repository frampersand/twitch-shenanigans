import borderSpriteGenerator, { resetSpriteBorder, setSpritePositionPool } from "../sources/sprites/index.js";
import { changeBackgroundSprite } from "../sources/background/background.js";
import { clearTilePattern } from "../sources/background/tilePattern.js";
import createRandomizedCard from "../sources/randomizer/randomizer.js";
import { createDesignCard, DESIGNS } from "../sources/randomizer/designs.js";
import { generatePortrait } from "../sources/pmd-chat/index.js";
import { startRainCanvas, stopRainCanvas } from "../sources/rain/rainCanvas.js";
import { createSceneStage } from "../sources/shader/sceneStage.js";
import { applyChannelSettings } from "../sources/pmd-chat/layout.js";
import { loadRoster } from "../utils/loadRoster.js";
import { getOverlayChannel } from "../utils/overlayChannel.js";
import { positions } from "../lists/positions.js";
import { COMMAND_INFO, REWARD_ICONS, REWARD_INFO } from "/shared/features.js";
import {
  RANDOM_CARD_STYLE,
  DEFAULT_GAME,
  RANDOMIZER_GAMES,
  cardStyleLabel,
  cardStyleList,
  findCardStyle,
  gameList,
  parseDealWithItArgs,
  resolveCardStyle,
} from "/shared/randomizerGames.js";
import {
  botReplies,
  randomizerCooldownMessages,
  randomizerMessages,
  welcomeMessages,
} from "/shared/bot-messages.js";
import {
  DEFAULT_BACKGROUND as BACKGROUND_DEFAULT,
  PLAIN_SCENE,
  SCENE_IDS,
  SHUFFLE_MINUTES,
  SHUFFLE_SCENE,
  currentBackground,
  findScene,
  normalizeBackground,
  normalizeColor,
  randomScene,
  sceneLabel,
  sceneList,
} from "/shared/shaderScenes.js";
import {
  DEFAULT_CHANNEL_PREFERENCES,
  getSupportedPmdPreferences,
  parsePreferenceValue,
} from "/shared/pmdPreferences.js";

/**
 * The showcase simulates a Twitch channel in the browser: chat commands and channel point
 * rewards run the same overlay code and bot replies as the real bot, without touching the
 * live channel. Only the channel's saved PMD settings are read from the server.
 */

const CHANNEL = getOverlayChannel().toLowerCase();
const CHANNEL_DISPLAY = CHANNEL.charAt(0).toUpperCase() + CHANNEL.slice(1);
/** Mirrors src/config: the home channel gets themed replies; these logins may !guesswhosback */
const HOME_CHANNEL = "frampersand";
const OWNER_LOGINS = ["frampersand", "frampscodes"];
/** The product name; also the bot's Twitch name, so the demo chat matches the real one */
const BRAND = "FramperBot";
const BOT = { name: BRAND, login: BRAND.toLowerCase(), role: "bot", color: "#a970ff" };

const COOLDOWN_MS = 3 * 60 * 1000;
const NOT_FOUND_REPLY_MS = 30 * 1000;
const BOT_DELAY_MS = 650;
const CARD_REVEAL_MS = 2500;
const RAIN_DURATION_MS = 15000;
const MAX_CHAT_LINES = 150;
const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 450;
const SPRITE_SIZE = 50;
/** Until the channel's own look arrives (or if it never does) */
const BACKGROUND_WAIT_MS = 1500;
const DEFAULT_VOLUME = 0.4;
const VOLUME_STORAGE_KEY = "showcase:rainVolume";

const IDENTITIES = {
  viewer: { name: "You", login: "you", role: "", color: null },
  broadcaster: { name: CHANNEL_DISPLAY, login: CHANNEL, role: "broadcaster", color: "#ff4a4a" },
};

const MOCK_USERS = [
  { name: "PokeFan42", login: "pokefan42", role: "sub", color: "#ff7f50" },
  { name: "NightOwl_", login: "nightowl_", role: "", color: "#1e90ff" },
  { name: "ModTeam", login: "modteam", role: "mod", color: "#00b85c" },
  { name: "UniteMain", login: "unitemain", role: "sub", color: "#daa520" },
  { name: "ChatLurker", login: "chatlurker", role: "", color: null },
];

const MOCK_CHAT_LINES = [
  "this overlay is so clean",
  "rain incoming?",
  "love the pmd chat bubbles",
  "W stream",
  "first time here, hi!",
  "the background pattern goes hard",
  "who's playing support tonight",
  "mods are sleeping",
  "that sprite border is adorable",
  "gg",
];

/** Demo viewers' PMD portraits; the viewer's own entry is added by !portrait */
const userBase = [
  { username: "PokeFan42", portrait: "25", variant: "Happy" },
  { username: "NightOwl_", portrait: "163", variant: "Normal" },
  { username: "ModTeam", portrait: "448", variant: "Determined" },
  { username: "UniteMain", portrait: "778", variant: "Joyous" },
  { username: "ChatLurker", portrait: "143", variant: "Sigh" },
  { username: CHANNEL_DISPLAY, portrait: "143", variant: "Inspired" },
];

const NAME_COLORS = ["#ff4a4a", "#1e90ff", "#00b85c", "#ff7f50", "#9acd32", "#ff4500", "#daa520", "#5f9ea0", "#ff69b4", "#b48cff"];

const $ = (id) => document.getElementById(id);
const el = {
  stage: $("stream-stage"),
  stageInner: $("stream-stage-inner"),
  layerBackground: $("layer-background-color"),
  layerPattern: $("layer-background-pattern"),
  layerSprites: $("layer-sprites"),
  layerRandomizer: $("layer-randomizer"),
  layerPmd: $("layer-pmd-chat"),
  pmdContainer: $("chat-container"),
  rainGif: $("rain-gif"),
  rainAudio: $("rain-audio"),
  actionFeed: $("action-feed"),
  volume: $("volume"),
  volumeMute: $("volume-mute"),
  volumeSlider: $("volume-slider"),
  chatLog: $("chat-log"),
  chatForm: $("chat-form"),
  chatInput: $("chat-input"),
  suggestions: $("suggestions"),
  pointsButton: $("points-button"),
  pointsPopover: $("points-popover"),
  rewardList: $("reward-list"),
  rewardForm: $("reward-form"),
  rewardFormTitle: $("reward-form-title"),
  rewardFormHelp: $("reward-form-help"),
  rewardInput: $("reward-input"),
  rewardError: $("reward-error"),
  demoToggle: $("demo-toggle"),
  demoLabel: $("demo-label"),
  actionGrid: $("action-grid"),
};

const state = {
  identity: "viewer",
  greeted: false,
  rainbearer: null,
  pmd: { ...DEFAULT_CHANNEL_PREFERENCES },
  /** Each player's last game and role, so the reroll reward rolls the same game (like the bot) */
  lastRolls: new Map(),
  /** The simulated channel's !cardstyle setting; random so the demo shows every style */
  cardStyle: RANDOM_CARD_STYLE,
  spriteCount: 0,
  cooldowns: new Map(),
  warned: new Set(),
  /** Rain volume, 0 to 1 */
  volume: DEFAULT_VOLUME,
  volumeBeforeMute: DEFAULT_VOLUME,
  rainTimer: null,
  selectedReward: null,
  suggestionIndex: 0,
  demo: { playing: true, timer: null, step: 0 },
  /** The channel's look when the page opened, plus this visit's color and scene changes */
  background: { defaults: { ...BACKGROUND_DEFAULT }, live: {}, loaded: false },
  shuffle: { scene: null, timer: null },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const currentUser = () => IDENTITIES[state.identity];
const isOwner = (user) => OWNER_LOGINS.includes(user.login);
const isExempt = (user) => user.role === "broadcaster" || isOwner(user);

function nameColor(user) {
  if (user.color) return user.color;
  const sum = [...user.name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return NAME_COLORS[sum % NAME_COLORS.length];
}

/* ---------- Chat log ---------- */

function badgeFor(role) {
  if (!role) return null;
  const badge = document.createElement("span");
  badge.className = `badge badge-${role}`;
  badge.title = role === "bot" ? "Bot" : role.charAt(0).toUpperCase() + role.slice(1);
  if (role === "bot") badge.textContent = "BOT";
  return badge;
}

function appendLine(line) {
  const log = el.chatLog;
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  log.appendChild(line);
  while (log.children.length > MAX_CHAT_LINES) log.firstChild.remove();
  if (nearBottom) log.scrollTop = log.scrollHeight;
}

function addChatLine(user, text, { kind = "message" } = {}) {
  const line = document.createElement("div");
  line.className = `chat-line ${kind}`;
  if (user === currentUser()) line.classList.add("is-self");

  const badge = badgeFor(user.role);
  if (badge) line.appendChild(badge);

  const name = document.createElement("span");
  name.className = "name";
  name.style.color = nameColor(user);
  name.textContent = user.name;
  line.append(name, document.createTextNode(": "), document.createTextNode(text));
  appendLine(line);
}

function addRedeemLine(user, reward, input) {
  const line = document.createElement("div");
  line.className = "chat-line redeem";
  const head = document.createElement("span");
  head.className = "redeem-head";
  const who = document.createElement("strong");
  who.textContent = user.name;
  const what = document.createElement("strong");
  what.textContent = reward.title;
  head.append(who, document.createTextNode(" redeemed "), what);
  line.appendChild(head);
  if (input) line.appendChild(document.createTextNode(input));
  appendLine(line);
}

/** Notes about the demo itself (not something the real bot would say) */
function addHint(text) {
  const line = document.createElement("div");
  line.className = "chat-line hint";
  line.textContent = text;
  appendLine(line);
}

async function botSay(text, delay = BOT_DELAY_MS) {
  await wait(delay);
  addChatLine(BOT, text);
}

/* ---------- Stage ---------- */

function showAction(kind, text) {
  const toast = document.createElement("div");
  toast.className = "action-toast";
  const label = document.createElement("span");
  label.className = "action-toast-kind";
  label.textContent = kind;
  const body = document.createElement("span");
  body.className = "action-toast-text";
  body.textContent = text;
  toast.append(label, body);
  el.actionFeed.prepend(toast);
  while (el.actionFeed.children.length > 3) el.actionFeed.lastChild.remove();
  setTimeout(() => {
    toast.classList.add("leaving");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function showOnPmdChat(user, text) {
  generatePortrait(text, user.name, userBase, { color: user.color });
}

function fitStage() {
  const scale = Math.min(el.stage.clientWidth / STAGE_WIDTH, el.stage.clientHeight / STAGE_HEIGHT);
  el.stageInner.style.setProperty("--stage-scale", String(scale));
}

function buildScaledSpritePositions() {
  const maxX = Math.max(...positions.map((p) => p.x)) + SPRITE_SIZE;
  const maxY = Math.max(...positions.map((p) => p.y)) + SPRITE_SIZE;
  const scale = Math.min(STAGE_WIDTH / maxX, STAGE_HEIGHT / maxY);
  return positions.map((p) => ({ x: Math.round(p.x * scale), y: Math.round(p.y * scale) }));
}

function addSprite(value) {
  // The border has a fixed number of slots; start over before it fills up
  if (state.spriteCount >= Math.floor(positions.length * 0.6)) {
    resetSpriteBorder(el.layerSprites);
    state.spriteCount = 0;
  }
  borderSpriteGenerator(value || "0", el.layerSprites);
  state.spriteCount += 1;
}

function startRain({ withSound }) {
  el.rainGif.classList.remove("fade");
  el.rainGif.classList.add("active");
  startRainCanvas(el.rainGif);
  if (withSound && state.volume > 0) {
    el.rainAudio.currentTime = 0;
    el.rainAudio.play().catch(() => {});
  }
  clearTimeout(state.rainTimer);
  state.rainTimer = setTimeout(stopRain, RAIN_DURATION_MS);
}

function stopRain() {
  el.rainGif.classList.add("fade");
  el.rainGif.classList.remove("active");
  el.rainAudio.pause();
  // Matches the 3s opacity transition in showcase.css
  setTimeout(() => {
    if (!el.rainGif.classList.contains("active")) stopRainCanvas(el.rainGif);
  }, 3100);
}

async function rollFor(player, game = DEFAULT_GAME, role = null) {
  const roster = (await loadRoster(game).catch(() => [])).filter((entry) => !role || entry.role === role);
  if (!roster.length) return;
  state.lastRolls.set(player.toLowerCase(), { game, role });
  const result = pick(roster);
  showAction("Randomizer", `${RANDOMIZER_GAMES[game].name} for ${player}`);
  const style = resolveCardStyle(state.cardStyle);
  if (Object.hasOwn(DESIGNS, style)) {
    await createDesignCard({ design: style, username: player, target: el.layerRandomizer, pickId: result.id, game });
  } else {
    await createRandomizedCard(player, el.layerRandomizer, result.id, game);
  }
  await botSay(randomizerMessages(player, result.name), CARD_REVEAL_MS);
}

const lastRollFor = (player) => state.lastRolls.get(player.toLowerCase()) ?? { game: DEFAULT_GAME, role: null };

/* ---------- Background: a plain color or an animated scene, built up like the real source ---------- */

const sceneStage = createSceneStage(el.layerBackground, { maxPixelCount: 1280 * 720 });
const backgroundNow = () => currentBackground(state.background.defaults, state.background.live);

function renderBackground() {
  if (!state.background.loaded) return;
  const look = backgroundNow();
  clearInterval(state.shuffle.timer);
  if (look.scene !== SHUFFLE_SCENE) {
    state.shuffle.scene = null;
    sceneStage.show(look);
    return;
  }
  // Same as the source: shuffle keeps its scene when only the color changes
  state.shuffle.scene ??= randomScene();
  sceneStage.show({ ...look, scene: state.shuffle.scene });
  state.shuffle.timer = setInterval(() => {
    state.shuffle.scene = randomScene(state.shuffle.scene);
    sceneStage.show({ ...backgroundNow(), scene: state.shuffle.scene });
  }, SHUFFLE_MINUTES * 60_000);
}

/** A new color keeps the scene, a new scene keeps the color */
function changeBackground(changes) {
  state.background.live = { ...state.background.live, ...changes };
  renderBackground();
}

/** Starts from the channel's current look (its dashboard default plus this stream's changes) */
function loadBackground() {
  const socket = io();
  const start = (look) => {
    if (state.background.loaded) return;
    if (look) state.background.defaults = normalizeBackground(look);
    state.background.loaded = true;
    renderBackground();
    socket.close();
  };
  socket.on("background-scene", start);
  socket.emit("background-scene-request", CHANNEL);
  setTimeout(() => start(null), BACKGROUND_WAIT_MS);
}

function resetStage() {
  resetSpriteBorder(el.layerSprites);
  state.spriteCount = 0;
  clearTilePattern(el.layerPattern);
  state.background.live = {};
  renderBackground();
  el.layerRandomizer.innerHTML = "";
  el.pmdContainer.innerHTML = "";
  clearTimeout(state.rainTimer);
  stopRain();
}

/* ---------- Cooldowns (same rule as the bot: 3 minutes, one warning) ---------- */

function isCoolingDown(user, command, ms = COOLDOWN_MS) {
  const last = state.cooldowns.get(`${user.login}:${command}`);
  return Boolean(last) && Date.now() - last < ms;
}

function startCooldown(user, command) {
  const key = `${user.login}:${command}`;
  state.cooldowns.set(key, Date.now());
  state.warned.delete(key);
}

/** True while the command is cooling down; warns once, like the bot */
function blockedByCooldown(user, command, warning) {
  if (isExempt(user) || !isCoolingDown(user, command)) return false;
  const key = `${user.login}:${command}`;
  if (!state.warned.has(key)) {
    state.warned.add(key);
    botSay(warning).then(() =>
      addHint(`Viewers can use ${command} once every 3 minutes. Switch to Broadcaster to skip the cooldown.`)
    );
  }
  return true;
}

/* ---------- Commands ---------- */

/** Names and descriptions come from shared/features.js; the behavior is defined here */
const commandInfo = (name) => COMMAND_INFO.find((command) => command.name === name);
const rewardInfo = (id) => REWARD_INFO.find((reward) => reward.id === id);

const DEX_NUMBER = /^\d{1,4}$/;
const EMOTION = /^[A-Za-z0-9-]{1,20}\^?$/;

const COMMANDS = [
  {
    ...commandInfo("!dealwithit"),
    async run(user, params, { fromDemo }) {
      const warning = CHANNEL === HOME_CHANNEL
        ? randomizerCooldownMessages(user.name)
        : botReplies.spamWarning(user.name);
      if (!fromDemo && blockedByCooldown(user, "!dealwithit", warning)) return;

      // Same parsing and rules as the bot: a typo doesn't cost the cooldown
      const args = parseDealWithItArgs(params);
      if (args.error) {
        if (isExempt(user) || !isCoolingDown(user, "!dealwithit:help", NOT_FOUND_REPLY_MS)) {
          startCooldown(user, "!dealwithit:help");
          await botSay(args.error === "invalid_target"
            ? botReplies.invalidDealTarget()
            : botReplies.randomizerHelp(user.name, gameList()));
        }
        return;
      }
      if (!fromDemo && !isExempt(user)) startCooldown(user, "!dealwithit");
      await rollFor(args.target ?? user.name, args.game, args.role);
    },
  },
  {
    ...commandInfo("!portrait"),
    async run(user, params, { fromDemo }) {
      if (!fromDemo && blockedByCooldown(user, "!portrait", botReplies.spamWarning(user.name))) return;
      const [number, variant] = params;
      if (!number) return;

      const response = DEX_NUMBER.test(number)
        ? await fetch(`/portrait?portrait=${encodeURIComponent(number)}`).catch(() => null)
        : null;
      if (!response?.ok) {
        // Same as the bot: a typo doesn't cost the cooldown, and the reply is limited to one per 30s
        if (isExempt(user) || !isCoolingDown(user, "!portrait:not-found", NOT_FOUND_REPLY_MS)) {
          startCooldown(user, "!portrait:not-found");
          await botSay(botReplies.portraitNotFound(user.name));
        }
        return;
      }
      if (!fromDemo && !isExempt(user)) startCooldown(user, "!portrait");

      const entry = { username: user.name, portrait: number, variant: EMOTION.test(variant ?? "") ? variant : "" };
      const index = userBase.findIndex((u) => u.username === user.name);
      if (index === -1) userBase.push(entry);
      else userBase[index] = entry;

      showAction("Portrait", `${user.name} is now #${number}`);
      if (isOwner(user)) await botSay(botReplies.portraitUpdated(user.name));
      else if (!fromDemo) addHint("Saved. Your next messages on the stream use this portrait.");
    },
  },
  {
    ...commandInfo("!rainbearer"),
    async run() {
      if (CHANNEL !== HOME_CHANNEL) return;
      await botSay(botReplies.rainbearer(state.rainbearer));
    },
  },
  {
    ...commandInfo("!pmdconfig"),
    async run(user, params) {
      // The bot ignores this from viewers; the hint explains why nothing happened
      if (user.role !== "broadcaster") {
        addHint("Only the broadcaster can use !pmdconfig. Switch to Broadcaster under the chat.");
        return;
      }
      const [preference, value] = params;
      const supported = getSupportedPmdPreferences();
      if (!preference || value === undefined) {
        await botSay(botReplies.pmdUsage(supported));
        return;
      }
      const result = parsePreferenceValue(preference, value);
      if (result.error) {
        await botSay(botReplies.pmdError(result.error, preference, supported));
        return;
      }
      state.pmd = { ...state.pmd, [result.preference]: result.value };
      applyChannelSettings(state.pmd);
      showAction("PMD chat", `${result.preference} = ${String(result.value)}`);
      await botSay(botReplies.pmdSet(user.name, result.preference, result.value));
      addHint("Preview only: the real channel's settings don't change.");
    },
  },
  {
    ...commandInfo("!cardstyle"),
    async run(user, params) {
      if (user.role !== "broadcaster") {
        addHint("Only the broadcaster can use !cardstyle. Switch to Broadcaster under the chat.");
        return;
      }
      if (!params[0]) {
        await botSay(botReplies.cardStyleCurrent(cardStyleLabel(state.cardStyle), cardStyleList()));
        return;
      }
      const style = findCardStyle(params[0]);
      if (!style) {
        await botSay(botReplies.cardStyleUnknown(user.name, cardStyleList()));
        return;
      }
      state.cardStyle = style;
      showAction("Card style", cardStyleLabel(style));
      await botSay(botReplies.cardStyleSet(user.name, cardStyleLabel(style)));
      addHint("Preview only: the real channel's setting doesn't change. Try !dealwithit to see it.");
    },
  },
  {
    ...commandInfo("!background"),
    async run(user, params) {
      if (user.role !== "broadcaster") {
        addHint("Only the broadcaster can use !background. Switch to Broadcaster under the chat.");
        return;
      }
      const requested = params[0]?.toLowerCase();
      const now = backgroundNow();
      const fallback = state.background.defaults;
      if (!requested) {
        await botSay(botReplies.backgroundStatus(sceneLabel(now.scene), now.color, sceneLabel(fallback.scene), sceneList()));
        return;
      }
      if (requested === "reset") {
        state.background.live = {};
        renderBackground();
        showAction("Background", "back to the default");
        await botSay(botReplies.backgroundReset(user.name, sceneLabel(fallback.scene)));
        return;
      }
      if (["color", "colour", "tint"].includes(requested)) {
        const value = params[1]?.toLowerCase();
        const own = ["off", "none", "own", "default"].includes(value);
        const color = own ? null : normalizeColor(value);
        if (!color && !own) {
          await botSay(botReplies.backgroundColorUsage(user.name));
          return;
        }
        changeBackground({ color });
        showAction("Background", color ?? "the scene's own colors");
        await botSay(botReplies.backgroundColorSet(user.name, color));
        return;
      }
      const scene = requested === "random"
        ? randomScene(now.scene === SHUFFLE_SCENE ? undefined : now.scene)
        : findScene(requested);
      if (!scene) {
        await botSay(botReplies.backgroundUnknown(user.name, sceneList()));
        return;
      }
      changeBackground({ scene });
      showAction("Background", sceneLabel(scene));
      await botSay(botReplies.backgroundSet(user.name, sceneLabel(scene)));
      addHint("Preview only: the real channel's background doesn't change.");
    },
  },
  {
    ...commandInfo("!guesswhosback"),
    async run(user) {
      if (!isOwner(user)) {
        await botSay(botReplies.guessWhosBackDenied());
        return;
      }
      for (const [i, line] of botReplies.guessWhosBack.entries()) {
        await botSay(line, i === 0 ? BOT_DELAY_MS : 2000);
      }
    },
  },
];

const commandByName = new Map(COMMANDS.map((command) => [command.name, command]));
commandByName.set("!bg", commandByName.get("!background"));

async function handleChat(user, rawText, { fromDemo = false } = {}) {
  const text = rawText.trim();
  if (!text) return;

  addChatLine(user, text);
  const [first, ...params] = text.split(/\s+/);
  const commandName = first.toLowerCase();

  // Same rule as the bot: everything but the setup commands shows up in the PMD chat
  if (!["!portrait", "!pmdconfig", "!cardstyle", "!background", "!bg"].includes(commandName)) showOnPmdChat(user, text);

  // First-time chatters get a welcome on the home channel
  if (!fromDemo && !state.greeted && CHANNEL === HOME_CHANNEL) {
    state.greeted = true;
    botSay(welcomeMessages(user.name), 1100);
  }

  await commandByName.get(commandName)?.run(user, params, { fromDemo });
}

/* ---------- Channel point rewards ---------- */

const REWARDS = [
  {
    ...rewardInfo("rain"),
    async run(user, _input, { fromDemo }) {
      startRain({ withSound: !fromDemo });
      state.rainbearer = user.name;
      showAction("Rain", `summoned by ${user.name}`);
      await botSay(botReplies.rain(user.name));
    },
  },
  {
    ...rewardInfo("sprite"),
    input: {
      help: "Pokédex number from 1 to 893. Leave it empty for a random one.",
      placeholder: "25",
      validate: (value) =>
        value === "" || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 893)
          ? ""
          : "Use a number from 1 to 893, or leave it empty",
    },
    async run(user, input) {
      addSprite(input);
      showAction("Sprite", `${input ? `#${input}` : "a random one"} from ${user.name}`);
    },
  },
  {
    ...rewardInfo("color"),
    input: {
      help: "A hex color, with or without the #. An animated scene is repainted in it. The bot tells you if it can't read it.",
      placeholder: "9146ff",
      validate: (value) => (value ? "" : "Enter a hex color"),
    },
    async run(user, input) {
      const color = input.startsWith("#") ? input.slice(1) : input;
      if (!/^([0-9a-f]{3}){1,2}$/i.test(color)) {
        await botSay(botReplies.invalidColor());
        return;
      }
      changeBackground({ color: normalizeColor(color) });
      showAction("Background", `#${color} from ${user.name}`);
    },
  },
  {
    ...rewardInfo("scene"),
    input: {
      help: `A scene's name or number: ${SCENE_IDS.map((id, i) => `${i + 1} ${id}`).join(", ")}, or ${PLAIN_SCENE} for just the color. Leave it empty for a random one. It takes on the current background color.`,
      placeholder: "lava",
      validate: () => "",
    },
    async run(user, input) {
      // Same as the bot: the first word counts; unknown words (or shuffle) give a random scene
      const named = findScene(input.split(/\s+/)[0]);
      const valid = named && named !== SHUFFLE_SCENE;
      const scene = valid ? named : randomScene(backgroundNow().scene);
      changeBackground({ scene });
      showAction("Scene", `${sceneLabel(scene)} from ${user.name}`);
      const reply = input && !valid ? botReplies.sceneRedeemedUnknown : botReplies.sceneRedeemed;
      await botSay(reply(user.name, sceneLabel(scene)));
    },
  },
  {
    ...rewardInfo("pattern"),
    input: {
      help: "Pokédex number from 1 to 1010.",
      placeholder: "143",
      validate: (value) => (value ? "" : "Enter a Pokédex number"),
    },
    async run(user, input) {
      const number = parseInt(input, 10);
      if (!Number.isInteger(number)) {
        await botSay(botReplies.invalidPattern());
        return;
      }
      if (changeBackgroundSprite(number, el.layerPattern) === false) {
        addHint("Patterns go from 1 to 1010.");
        return;
      }
      showAction("Pattern", `#${number} from ${user.name}`);
    },
  },
  {
    ...rewardInfo("reroll"),
    async run(user) {
      const { game, role } = lastRollFor(user.name);
      await rollFor(user.name, game, role);
    },
  },
];

const rewardById = new Map(REWARDS.map((reward) => [reward.id, reward]));

async function redeem(user, reward, input = "", { fromDemo = false } = {}) {
  addRedeemLine(user, reward, input);
  await reward.run(user, input, { fromDemo });
}

function rewardIcon(reward) {
  const swatch = document.createElement("span");
  swatch.className = "reward-swatch";
  swatch.style.background = reward.color;
  swatch.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${REWARD_ICONS[reward.id]}</svg>`;
  return swatch;
}

function renderRewardList() {
  for (const reward of REWARDS) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "reward-tile";
    tile.append(rewardIcon(reward), document.createTextNode(reward.title));
    tile.addEventListener("click", () => selectReward(reward));
    el.rewardList.appendChild(tile);
  }
}

function openPoints(reward = null) {
  closeSuggestions();
  el.pointsPopover.hidden = false;
  el.pointsButton.setAttribute("aria-expanded", "true");
  if (reward) selectReward(reward);
  else showRewardList();
}

function closePoints() {
  el.pointsPopover.hidden = true;
  el.pointsButton.setAttribute("aria-expanded", "false");
  state.selectedReward = null;
}

function showRewardList() {
  state.selectedReward = null;
  el.rewardList.hidden = false;
  el.rewardForm.hidden = true;
}

function selectReward(reward) {
  if (!reward.input) {
    closePoints();
    redeem(currentUser(), reward);
    return;
  }
  state.selectedReward = reward;
  el.rewardList.hidden = true;
  el.rewardForm.hidden = false;
  el.rewardFormTitle.textContent = reward.title;
  el.rewardFormHelp.textContent = reward.input.help;
  el.rewardInput.value = "";
  el.rewardInput.placeholder = reward.input.placeholder;
  el.rewardError.textContent = "";
  el.rewardInput.focus();
}

function submitReward(event) {
  event.preventDefault();
  const reward = state.selectedReward;
  if (!reward) return;
  const value = el.rewardInput.value.trim();
  const error = reward.input.validate(value);
  if (error) {
    el.rewardError.textContent = error;
    el.rewardInput.focus();
    return;
  }
  closePoints();
  redeem(currentUser(), reward, value);
}

/* ---------- Command autocomplete ---------- */

function visibleCommands() {
  const value = el.chatInput.value;
  if (!value.startsWith("!") || value.includes(" ")) return [];
  const prefix = value.toLowerCase();
  return COMMANDS.filter((command) => !command.hidden && command.name.startsWith(prefix));
}

function renderSuggestions() {
  const matches = visibleCommands();
  if (!matches.length) {
    closeSuggestions();
    return;
  }
  state.suggestionIndex = Math.min(state.suggestionIndex, matches.length - 1);
  el.suggestions.replaceChildren();

  const title = document.createElement("p");
  title.className = "suggestions-title";
  title.textContent = "Commands";
  el.suggestions.appendChild(title);

  matches.forEach((command, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "suggestion";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(index === state.suggestionIndex));
    const usage = document.createElement("span");
    usage.className = "suggestion-usage";
    usage.textContent = command.usage;
    const desc = document.createElement("span");
    desc.className = "suggestion-desc";
    desc.textContent = `${command.description} · ${command.who}`;
    option.append(usage, desc);
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => acceptSuggestion(command));
    el.suggestions.appendChild(option);
  });
  el.suggestions.hidden = false;
}

function closeSuggestions() {
  el.suggestions.hidden = true;
  state.suggestionIndex = 0;
}

function acceptSuggestion(command) {
  el.chatInput.value = `${command.name} `;
  closeSuggestions();
  el.chatInput.focus();
}

function onChatKeydown(event) {
  const matches = el.suggestions.hidden ? [] : visibleCommands();
  if (!matches.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    state.suggestionIndex = (state.suggestionIndex + step + matches.length) % matches.length;
    renderSuggestions();
  } else if (event.key === "Tab" || event.key === "Enter") {
    event.preventDefault();
    acceptSuggestion(matches[state.suggestionIndex]);
  } else if (event.key === "Escape") {
    closeSuggestions();
  }
}

/* ---------- "What viewers can do" cards ---------- */

function renderActionCards() {
  const cards = [
    ...REWARDS.map((reward) => ({
      kind: "Reward",
      name: reward.title,
      description: reward.description,
      who: "Anyone, with channel points",
      onTry: () => openPoints(reward),
      reward: true,
    })),
    ...COMMANDS.filter((command) => !command.hidden).map((command) => ({
      kind: "Command",
      name: command.usage,
      description: command.description,
      who: command.who,
      onTry: () => tryCommand(command),
    })),
  ];

  for (const card of cards) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action-card${card.reward ? " reward-card" : ""}`;
    button.innerHTML = `
      <span class="action-card-top">
        <span class="action-name"></span>
        <span class="action-kind${card.reward ? " reward" : ""}"></span>
      </span>
      <p class="action-desc"></p>
      <p class="action-who"></p>
      <span class="action-try">Try it</span>`;
    button.querySelector(".action-name").textContent = card.name;
    button.querySelector(".action-kind").textContent = card.kind;
    button.querySelector(".action-desc").textContent = card.description;
    button.querySelector(".action-who").textContent = card.who;
    button.addEventListener("click", (event) => {
      // Keep the outside-click handler from closing the popover this just opened
      event.stopPropagation();
      card.onTry();
    });
    el.actionGrid.appendChild(button);
  }
}

function tryCommand(command) {
  closePoints();
  if (command.broadcasterOnly && state.identity !== "broadcaster") setIdentity("broadcaster");
  el.chatInput.value = command.example;
  el.chatInput.focus();
  el.chatInput.setSelectionRange(command.example.length, command.example.length);
}

/* ---------- Identity ---------- */

function setIdentity(identity) {
  state.identity = identity;
  document.querySelectorAll(".identity-option").forEach((option) => {
    option.setAttribute("aria-pressed", String(option.dataset.identity === identity));
  });
}

/* ---------- Demo loop: fake viewers keep the channel lively; the pill in the chat header pauses it ---------- */

const DEMO_ROLLS = ["!dealwithit", "!dealwithit overwatch support", "!dealwithit valorant", "!dealwithit rivals duelist", "!dealwithit league mage"];

const DEMO_ACTIONS = [
  (user) => redeem(user, rewardById.get("sprite"), "", { fromDemo: true }),
  (user) => handleChat(user, pick(DEMO_ROLLS), { fromDemo: true }),
  (user) => redeem(user, rewardById.get("color"), pick(["124071", "3b1f5e", "1f4d3a", "5e2a1f"]), { fromDemo: true }),
  (user) => redeem(user, rewardById.get("scene"), pick(["", "lava", "2", "candy", "synapse", "ether", "dusk", "6"]), { fromDemo: true }),
  (user) => redeem(user, rewardById.get("pattern"), String(pick([1, 4, 7, 25, 133, 143, 175, 393, 448, 778])), { fromDemo: true }),
  (user) => handleChat(user, `!portrait ${pick([1, 4, 7, 39, 54, 132, 133, 197])}`, { fromDemo: true }),
  (user) => redeem(user, rewardById.get("rain"), "", { fromDemo: true }),
  (user) => redeem(user, rewardById.get("sprite"), "", { fromDemo: true }),
  (user) => handleChat(user, "!rainbearer", { fromDemo: true }),
];

function demoTick() {
  const user = pick(MOCK_USERS);
  // Mostly chatter, with an action every third beat
  if (state.demo.step % 3 === 2) {
    DEMO_ACTIONS[Math.floor(state.demo.step / 3) % DEMO_ACTIONS.length](user);
  } else {
    handleChat(user, pick(MOCK_CHAT_LINES), { fromDemo: true });
  }
  state.demo.step += 1;
  state.demo.timer = setTimeout(demoTick, 2600 + Math.random() * 1800);
}

function setDemoPlaying(playing) {
  state.demo.playing = playing;
  clearTimeout(state.demo.timer);
  if (playing) state.demo.timer = setTimeout(demoTick, 600);
  el.demoToggle.setAttribute("aria-pressed", String(playing));
  el.demoLabel.textContent = playing ? "Demo playing" : "Demo paused";
}

/* ---------- Wiring ---------- */

function initLayerChips() {
  document.querySelectorAll(".chip[data-layer]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const visible = chip.getAttribute("aria-pressed") !== "true";
      chip.setAttribute("aria-pressed", String(visible));
      $(chip.dataset.layer).classList.toggle("layer-hidden", !visible);
    });
  });
  $("reset-stage").addEventListener("click", resetStage);
}

function initComposer() {
  el.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = el.chatInput.value;
    el.chatInput.value = "";
    closeSuggestions();
    handleChat(currentUser(), text);
  });
  el.chatInput.addEventListener("input", () => {
    state.suggestionIndex = 0;
    renderSuggestions();
  });
  el.chatInput.addEventListener("focus", () => {
    renderSuggestions();
  });
  el.chatInput.addEventListener("blur", () => setTimeout(closeSuggestions, 120));
  el.chatInput.addEventListener("keydown", onChatKeydown);

  el.pointsButton.addEventListener("click", () => {
    if (el.pointsPopover.hidden) openPoints();
    else closePoints();
  });
  $("points-close").addEventListener("click", closePoints);
  $("reward-back").addEventListener("click", showRewardList);
  el.rewardForm.addEventListener("submit", submitReward);
  el.rewardInput.addEventListener("input", () => {
    el.rewardError.textContent = "";
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el.pointsPopover.hidden) closePoints();
  });
  document.addEventListener("click", (event) => {
    if (el.pointsPopover.hidden) return;
    if (!el.pointsPopover.contains(event.target) && !el.pointsButton.contains(event.target)) closePoints();
  });

  document.querySelectorAll(".identity-option").forEach((option) => {
    option.addEventListener("click", () => {
      setIdentity(option.dataset.identity);
    });
  });
}

/** Remembered per browser; storage can be unavailable (private mode), so it's optional */
function loadSavedVolume() {
  try {
    const saved = Number.parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
    return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function setVolume(volume) {
  state.volume = Math.min(1, Math.max(0, volume));
  if (state.volume > 0) state.volumeBeforeMute = state.volume;
  el.rainAudio.volume = state.volume;
  if (state.volume === 0) el.rainAudio.pause();

  el.volumeSlider.value = String(Math.round(state.volume * 100));
  el.volume.dataset.level = state.volume === 0 ? "muted" : state.volume < 0.5 ? "low" : "high";
  el.volumeMute.setAttribute("aria-label", state.volume === 0 ? "Unmute rain sound" : "Mute rain sound");
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(state.volume));
  } catch {
    // Not saved; the slider still works for this visit
  }
}

function initPlayer() {
  setVolume(loadSavedVolume());
  el.volumeSlider.addEventListener("input", () => setVolume(Number(el.volumeSlider.value) / 100));
  el.volumeMute.addEventListener("click", () =>
    setVolume(state.volume > 0 ? 0 : state.volumeBeforeMute || DEFAULT_VOLUME)
  );
  el.demoToggle.addEventListener("click", () => {
    setDemoPlaying(!state.demo.playing);
  });
  new ResizeObserver(fitStage).observe(el.stage);
  fitStage();
}

/** Use the channel's saved PMD chat settings, so streamers see their own look */
function loadPmdSettings() {
  const socket = io();
  socket.on("pmd-config", (channel, settings) => {
    if (channel !== CHANNEL) return;
    state.pmd = { ...DEFAULT_CHANNEL_PREFERENCES, ...settings };
    applyChannelSettings(state.pmd);
    socket.close();
  });
  socket.emit("pmd-config-request", CHANNEL);
}

function init() {
  $("channel-name").textContent = CHANNEL_DISPLAY;
  $("channel-avatar").textContent = CHANNEL_DISPLAY.charAt(0);
  document.title = `${CHANNEL_DISPLAY} · ${BRAND} showcase`;

  setSpritePositionPool(buildScaledSpritePositions());
  applyChannelSettings(state.pmd);

  renderRewardList();
  renderActionCards();
  initLayerChips();
  initComposer();
  initPlayer();
  loadPmdSettings();
  loadBackground();
  loadRoster(DEFAULT_GAME).catch(() => {});

  addHint("This chat is a simulation. Type ! to see commands, or open Rewards to redeem one. Nothing here reaches the real channel.");
  setDemoPlaying(true);
}

init();
