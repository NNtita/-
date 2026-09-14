const arena = document.querySelector("#arena");
const target = document.querySelector("#target");
const scoreLabel = document.querySelector("#score");
const bestScoreLabel = document.querySelector("#bestScore");
const timeLabel = document.querySelector("#time");
const finalScoreLabel = document.querySelector("#finalScore");
const resultMessage = document.querySelector("#resultMessage");
const startScreen = document.querySelector("#startScreen");
const endScreen = document.querySelector("#endScreen");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const soundButton = document.querySelector("#soundButton");

let score = 0;
let timeLeft = 30;
let timerId;
let soundEnabled = true;
let audioContext;

const savedBest = Number(localStorage.getItem("star-catcher-best")) || 0;
bestScoreLabel.textContent = savedBest;

function beep(frequency = 520) {
  if (!soundEnabled) return;
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.06, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.09);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.09);
}

function moveTarget() {
  const padding = 12;
  const maxX = Math.max(padding, arena.clientWidth - target.offsetWidth - padding);
  const maxY = Math.max(padding, arena.clientHeight - target.offsetHeight - padding);
  target.style.left = `${padding + Math.random() * (maxX - padding)}px`;
  target.style.top = `${padding + Math.random() * (maxY - padding)}px`;
}

function catchStar() {
  score += 1;
  scoreLabel.textContent = score;
  beep(440 + Math.min(score * 16, 480));
  target.classList.remove("pop");
  void target.offsetWidth;
  target.classList.add("pop");
  moveTarget();
}

function finishGame() {
  clearInterval(timerId);
  target.style.display = "none";
  finalScoreLabel.textContent = score;
  const best = Math.max(score, Number(bestScoreLabel.textContent));
  const isRecord = score > Number(bestScoreLabel.textContent);
  bestScoreLabel.textContent = best;
  localStorage.setItem("star-catcher-best", best);
  resultMessage.textContent = isRecord
    ? "Новый рекорд! Космос аплодирует."
    : score >= 20 ? "Отличный полёт!" : "Ещё один раунд — и звёзды твои.";
  endScreen.classList.remove("hidden");
  beep(isRecord ? 880 : 330);
}

function startGame() {
  score = 0;
  timeLeft = 30;
  scoreLabel.textContent = score;
  timeLabel.textContent = timeLeft;
  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  target.style.display = "block";
  moveTarget();
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft -= 1;
    timeLabel.textContent = timeLeft;
    if (timeLeft <= 0) finishGame();
  }, 1000);
}

target.addEventListener("click", catchStar);
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? "♪" : "×";
  soundButton.setAttribute("aria-label", soundEnabled ? "Выключить звук" : "Включить звук");
});

window.addEventListener("resize", () => {
  if (target.style.display === "block") moveTarget();
});
