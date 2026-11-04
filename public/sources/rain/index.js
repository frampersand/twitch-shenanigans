import { startRainCanvas, stopRainCanvas } from "./rainCanvas.js";

/** How long the rain lasts before it fades out (matches the rain audio) */
const RAIN_DURATION_MS = 2040000;
/** Must match the CSS opacity transition on #rain-gif.fade */
const FADE_MS = 10000;

let fadeTimer = null;
let stopTimer = null;

const activateRain = ({ gifEl, audioEl } = {}) => {
  const container = gifEl || document.getElementById("rain-gif");
  const audio = audioEl || document.getElementById("rain-container");

  if (!container || !audio) return;

  clearTimeout(fadeTimer);
  clearTimeout(stopTimer);
  container.classList.remove("fade");
  container.classList.add("active");
  startRainCanvas(container);
  audio.currentTime = 0;
  audio.play().catch(() => {});

  fadeTimer = setTimeout(() => {
    container.classList.add("fade");
    stopTimer = setTimeout(() => stopRainCanvas(container), FADE_MS);
  }, RAIN_DURATION_MS);
};

export default activateRain;
