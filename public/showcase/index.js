import borderSpriteGenerator, { resetSpriteBorder, setSpritePositionPool } from "../sources/sprites/index.js";
import { changeBackgroundColor, changeBackgroundSprite } from "../sources/background/background.js";
import createRandomizedCard from "../sources/randomizer/randomizer.js";
import activateRain from "../sources/rain/index.js";
import { generatePortrait } from "../sources/pmd-chat/index.js";
import { applyChannelSettings } from "../sources/pmd-chat/layout.js";
import { loadUniteRoster } from "../utils/loadUniteRoster.js";
import { randomizerMessages } from "../lists/bot-messages.js";
import { positions } from "../lists/positions.js";

const SHOWCASE_CHANNEL = "frampersand";
const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 450;
const SPRITE_SIZE = 50;
const PMD_CONFIG_REQUEST = "pmd-config-request";
const PMD_CONFIG = "pmd-config";

let uniteRoster = [];

const MOCK_USERNAMES = [
  { name: "Frampersand", role: "broadcaster" },
  { name: "PokeFan42", role: "sub" },
  { name: "NightOwl_", role: "" },
  { name: "ModTeam", role: "mod" },
  { name: "UniteMain", role: "sub" },
  { name: "ChatLurker", role: "" },
];

const MOCK_CHAT_LINES = [
  "this overlay is so clean",
  "ok who called the randomizer LUL",
  "rain incoming?",
  "love the pmd chat bubbles",
  "can we get another sprite on the border",
  "W stream",
  "first time here, hi!",
  "the background pattern goes hard",
  "deal with it!",
  "mods are sleeping",
];

const PMD_USERBASE = [
  {
    username: "Frampersand",
    portrait: "143",
    variant: "Inspired",
  },
];

const elements = {
  streamStage: document.getElementById("stream-stage"),
  streamStageInner: document.getElementById("stream-stage-inner"),
  layerSprites: document.getElementById("layer-sprites"),
  layerBackgroundColor: document.getElementById("layer-background-color"),
  layerBackgroundPattern: document.getElementById("layer-background-pattern"),
  layerRandomizer: document.getElementById("layer-randomizer"),
  layerPmdChat: document.getElementById("layer-pmd-chat"),
  layerRain: document.getElementById("layer-rain"),
  chatMessages: document.getElementById("chat-messages"),
  rainGif: document.getElementById("rain-gif"),
  rainAudio: document.getElementById("rain-audio"),
};

const state = {
  pmdSync: true,
  pmdSettings: {},
  socket: io(),
};

function buildScaledSpritePositions() {
  const maxX = Math.max(...positions.map((p) => p.x)) + SPRITE_SIZE;
  const maxY = Math.max(...positions.map((p) => p.y)) + SPRITE_SIZE;
  const scale = Math.min(STAGE_WIDTH / maxX, STAGE_HEIGHT / maxY);

  return positions.map((p) => ({
    x: Math.round(p.x * scale),
    y: Math.round(p.y * scale),
  }));
}

function fitStreamStage() {
  const { streamStage, streamStageInner } = elements;
  if (!streamStage || !streamStageInner) return;

  const scale = Math.min(streamStage.clientWidth / 800, streamStage.clientHeight / 450);
  streamStageInner.style.setProperty("--stage-scale", String(scale));
}

function setLayerVisibility(layerEl, visible) {
  layerEl.classList.toggle("layer-hidden", !visible);
}

function bindLayerToggle(checkboxId, layerEl) {
  const checkbox = document.getElementById(checkboxId);
  checkbox.addEventListener("change", () => {
    setLayerVisibility(layerEl, checkbox.checked);
  });
}

function randomHexColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
}

function randomMockUsername() {
  return MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
}

function randomMockMessage() {
  const useUnite = Math.random() < 0.35;
  if (useUnite && uniteRoster.length > 0) {
    const user = randomMockUsername();
    const pokemon = uniteRoster[Math.floor(Math.random() * uniteRoster.length)].name;
    return { user, text: randomizerMessages(user.name, pokemon) };
  }

  return {
    user: randomMockUsername(),
    text: MOCK_CHAT_LINES[Math.floor(Math.random() * MOCK_CHAT_LINES.length)],
  };
}

function appendMockChatMessage({ user, text }) {
  const row = document.createElement("div");
  row.className = "chat-message";

  const name = document.createElement("span");
  name.className = `username ${user.role}`.trim();
  name.textContent = user.name;

  const body = document.createElement("span");
  body.textContent = text;

  row.appendChild(name);
  row.appendChild(body);
  elements.chatMessages.appendChild(row);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

  while (elements.chatMessages.children.length > 40) {
    elements.chatMessages.firstChild.remove();
  }

  return { user, text };
}

function triggerPmdPortrait(username, message) {
  if (!document.getElementById("toggle-pmd").checked) return;

  generatePortrait(
    message,
    username,
    PMD_USERBASE.map((entry) => ({ ...entry, username })),
    { color: randomHexColor() }
  );
}

function addSprite(number) {
  const raw = String(number ?? "").trim();
  if (raw === "") {
    borderSpriteGenerator("0", elements.layerSprites);
    return;
  }
  borderSpriteGenerator(raw, elements.layerSprites);
}

function applyBackgroundColor(rawColor) {
  const color = String(rawColor).replace("#", "").trim();
  if (!color) return;
  changeBackgroundColor(color, elements.layerBackgroundColor);
}

function applyBackgroundPattern(rawNumber) {
  const raw = String(rawNumber ?? "").trim();
  changeBackgroundSprite(raw === "" ? "" : raw, elements.layerBackgroundPattern);
}

function startMockChatLoop() {
  const pushMessage = () => {
    const message = appendMockChatMessage(randomMockMessage());
    if (state.pmdSync && document.getElementById("toggle-pmd-sync").checked) {
      triggerPmdPortrait(message.user.name, message.text);
    }
  };

  pushMessage();
  window.setInterval(pushMessage, 2800 + Math.floor(Math.random() * 2200));
}

function loadPmdConfig() {
  state.socket.emit(PMD_CONFIG_REQUEST, SHOWCASE_CHANNEL);
}

function initControls() {
  document.getElementById("sprite-add-btn").addEventListener("click", () => {
    addSprite(document.getElementById("sprite-number").value);
  });

  document.getElementById("sprite-random-btn").addEventListener("click", () => {
    addSprite(0);
  });

  document.getElementById("sprite-clear-btn").addEventListener("click", () => {
    resetSpriteBorder(elements.layerSprites);
  });

  document.getElementById("color-btn").addEventListener("click", () => {
    applyBackgroundColor(document.getElementById("background-color").value);
  });

  document.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      applyBackgroundColor(button.dataset.color);
      document.getElementById("background-color").value = button.dataset.color;
    });
  });

  document.getElementById("pattern-btn").addEventListener("click", () => {
    applyBackgroundPattern(document.getElementById("pattern-number").value);
  });

  document.getElementById("randomize-btn").addEventListener("click", () => {
    const user = randomMockUsername();
    createRandomizedCard(user.name, "showcase", elements.layerRandomizer, state.socket);
  });

  document.getElementById("rain-btn").addEventListener("click", () => {
    activateRain({ gifEl: elements.rainGif, audioEl: elements.rainAudio });
  });

  document.getElementById("pmd-test-btn").addEventListener("click", () => {
    const message = randomMockMessage();
    appendMockChatMessage(message);
    triggerPmdPortrait(message.user.name, message.text);
  });

  bindLayerToggle("toggle-sprites", elements.layerSprites);
  bindLayerToggle("toggle-background-color", elements.layerBackgroundColor);
  bindLayerToggle("toggle-background-pattern", elements.layerBackgroundPattern);
  bindLayerToggle("toggle-randomizer", elements.layerRandomizer);
  bindLayerToggle("toggle-rain", elements.layerRain);
  bindLayerToggle("toggle-pmd", elements.layerPmdChat);
}

function initSocket() {
  state.socket.on(PMD_CONFIG, (channel, settings) => {
    if (channel !== SHOWCASE_CHANNEL) return;
    state.pmdSettings = settings || {};
    applyChannelSettings(state.pmdSettings);
  });
}

function init() {
  setSpritePositionPool(buildScaledSpritePositions());
  fitStreamStage();
  window.addEventListener("resize", fitStreamStage);

  applyBackgroundColor("1a1a2e");
  applyBackgroundPattern(143);
  applyChannelSettings();

  initControls();
  initSocket();
  loadPmdConfig();
  loadUniteRoster()
    .then((roster) => {
      uniteRoster = roster;
    })
    .catch((err) => {
      console.error("Failed to load unite roster for showcase:", err);
    });
  startMockChatLoop();
}

init();
