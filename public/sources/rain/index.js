const activateRain = () => {
  const container = document.getElementById("rain-gif");
  container.classList.add("active");
  document.getElementById("rain-container").play();
  setTimeout(() => {
    container.classList.add("fade");
  }, 2040000);
};

export default activateRain;