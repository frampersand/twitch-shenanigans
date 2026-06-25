const activateRain = ({ gifEl, audioEl } = {}) => {
  const container = gifEl || document.getElementById("rain-gif");
  const audio = audioEl || document.getElementById("rain-container");

  if (!container || !audio) return;

  container.classList.remove("fade");
  container.classList.add("active");
  audio.currentTime = 0;
  audio.play().catch(() => {});

  setTimeout(() => {
    container.classList.add("fade");
  }, 2040000);
};

export default activateRain;
