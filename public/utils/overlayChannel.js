/** Overlays without ?channel= predate per-channel rooms and were only used on this channel */
const LEGACY_DEFAULT_CHANNEL = "frampersand";

export function getOverlayChannel({ fallback = LEGACY_DEFAULT_CHANNEL } = {}) {
    const channel = new URLSearchParams(window.location.search).get("channel");
    return channel || fallback;
}

/** Join the channel's overlay room now and again after every reconnect */
export function joinOverlayChannel(socket, channel) {
    if (!channel) return;
    const join = () => socket.emit("overlay-connect", channel);
    socket.on("connect", join);
    if (socket.connected) join();
}
