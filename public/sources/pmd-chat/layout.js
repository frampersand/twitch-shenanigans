export const DEFAULT_CHAT_DIRECTION = "up";
export const DEFAULT_SOLID_BUBBLE_COLOR = "#6961a7";
export const DEFAULT_BUBBLE_TEXT_COLOR = "#ffffff";
export const DEFAULT_PORTRAIT_SHAPE = "rounded";
export const DEFAULT_MAX_MESSAGES = 5;

/** Drop the oldest messages until at most `keep` are left (default: the channel's maxMessages) */
export function trimMessages(chatContainer, keep) {
    if (!chatContainer) return;
    const limit = keep ?? (Number(chatContainer.dataset.maxMessages) || DEFAULT_MAX_MESSAGES);
    const messages = chatContainer.getElementsByClassName("pmd-portrait-container");
    while (messages.length > limit) messages[0].remove();
}
const PORTRAIT_SHAPES = new Set(["square", "round", "rounded"]);

export function applyChatDirection(direction = DEFAULT_CHAT_DIRECTION) {
    const chatContainer = document.getElementById("chat-container");
    if (!chatContainer) return;

    const resolved = direction === "down" ? "down" : "up";
    chatContainer.classList.toggle("chat-up", resolved === "up");
    chatContainer.classList.toggle("chat-down", resolved === "down");
}

export function applyPortraitShape(shape = DEFAULT_PORTRAIT_SHAPE) {
    const chatContainer = document.getElementById("chat-container");
    if (!chatContainer) return;

    const resolved = PORTRAIT_SHAPES.has(shape) ? shape : DEFAULT_PORTRAIT_SHAPE;
    chatContainer.classList.toggle("portrait-square", resolved === "square");
    chatContainer.classList.toggle("portrait-round", resolved === "round");
    chatContainer.classList.toggle("portrait-rounded", resolved === "rounded");
}

export function applyChannelSettings(channelSettings = {}) {
    applyChatDirection(channelSettings.chatDirection);
    applyPortraitShape(channelSettings.portraitShape);

    const chatContainer = document.getElementById("chat-container");
    if (!chatContainer) return;

    // Read by index.js when a message arrives
    const maxMessages = Number(channelSettings.maxMessages);
    chatContainer.dataset.maxMessages = String(
        Number.isInteger(maxMessages) && maxMessages >= 1 ? maxMessages : DEFAULT_MAX_MESSAGES
    );
    trimMessages(chatContainer);

    chatContainer.classList.toggle("solid-bubbles", Boolean(channelSettings.solidBubbles));
    chatContainer.style.setProperty(
        "--solid-bubble-color",
        channelSettings.solidBubblesColor || DEFAULT_SOLID_BUBBLE_COLOR
    );
    chatContainer.style.setProperty(
        "--bubble-text-color",
        channelSettings.bubbleTextColor || DEFAULT_BUBBLE_TEXT_COLOR
    );
}

// Kept for any existing imports.
export const applyChannelLayout = applyChannelSettings;
