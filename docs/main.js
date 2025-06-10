// --- ELEMENT GETTERS ---
let tiles = [];
const grid = document.querySelector(".grid");
const wordDisplay = document.getElementById("current-word");
const scoreDisplay = document.querySelector(".score-value");
const wordCountDisplay = document.querySelector(".word-count");
const timerDisplay = document.querySelector(".timer");
const canvas = document.getElementById("line-canvas");
const inviteMessage = document.getElementById("invite-message");
const highScoreDisplay = document.getElementById("high-score-display");
const ctx = canvas.getContext("2d");

// Screens
const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");

// Home Screen Elements
const seedDisplay = document.getElementById("seed-display");
const copyLinkBtn = document.getElementById("copy-link-btn");
const sizeSlider = document.getElementById("size-slider");
const label4x4 = document.getElementById("label-4x4");
const label5x5 = document.getElementById("label-5x5");
const startBtn = document.getElementById("start-btn");

// End Game Modal Elements
const endGameModal = document.getElementById("end-game-modal");
const endGameTitle = document.getElementById("end-game-title");
const finalScoreDisplay = document.getElementById("final-score");
const finalHighScoreDisplay = document.getElementById("final-high-score");
const finalWordCountDisplay = document.getElementById("final-word-count");
const endGameSeedDisplay = document.getElementById("end-game-seed-display");
const endGameCopyLinkBtn = document.getElementById("end-game-copy-link-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const shareScoreBtn = document.getElementById("share-score-btn");
const homeBtn = document.getElementById("home-btn");

// Other UI
const aboutModal = document.getElementById("about-modal");
const aboutBtnTriggers = document.querySelectorAll(".about-btn-trigger");
const aboutCloseBtn = document.getElementById("about-close-btn");
const endEarlyBtn = document.getElementById("end-early-btn");
const musicMuteBtn = document.getElementById("music-mute-btn");
const sfxMuteBtn = document.getElementById("sfx-mute-btn");

// --- GAME STATE VARIABLES ---
let selectedTiles = [];
let isDragging = false;
let score = 0;
let wordsFound = 0;
let boardSize = 4;
let timer = 90;
let interval;
let wordSet;
let foundWords;
let currentSeed;
let seededRNG;
let lastGamePlayedSeed;
let lastGamePlayedSize;
let wasLastWordValid = false;
let isMusicMuted = localStorage.getItem("musicMuted") === "true";
let isSfxMuted = localStorage.getItem("sfxMuted") === "true";

// --- SOUNDS ---
const sounds = {
  loop: new Howl({ src: ["sounds/loop.mp3"], loop: true, volume: 0.4 }),
  start: new Howl({ src: ["sounds/start.mp3"] }),
  hit: new Howl({ src: ["sounds/hit.mp3"], volume: 0.5 }),
  invalid: new Howl({ src: ["sounds/invalid.mp3"], volume: 0.6 }),
  almost: new Howl({ src: ["sounds/almost.mp3"] }),
  tick: new Howl({ src: ["sounds/tick.mp3"] }),
  score: {
    3: new Howl({ src: ["sounds/score3.mp3"] }),
    4: new Howl({ src: ["sounds/score4.mp3"] }),
    5: new Howl({ src: ["sounds/score5.mp3"] }),
    6: new Howl({ src: ["sounds/score6.mp3"] }),
  },
  end: new Howl({ src: ["sounds/end.mp3"] }),
};

function playSfx(sound, scoreLength = null) {
  if (isSfxMuted) return;
  if (sound === "score" && scoreLength) {
    sounds.score[scoreLength]?.play() || sounds.score[6]?.play();
  } else if (sounds[sound]) {
    sounds[sound].play();
  }
}

// --- HIGH SCORE LOGIC ---
function getHighScore() {
  return parseInt(localStorage.getItem("wordHuntHighScore") || "0");
}
function setHighScore(newScore) {
  localStorage.setItem("wordHuntHighScore", newScore);
  highScoreDisplay.textContent = newScore.toString().padStart(5, "0");
}

// --- SEED AND BOARD GENERATION ---
function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(s) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

function generateNewSeed(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const letterDistribution =
  "EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKKJXXQZ".split(
    ""
  );

function generateBoard() {
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
  tiles = [];
  for (let i = 0; i < boardSize * boardSize; i++) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="tile-letter">?</div>
      <div class="tile-overlay"></div>
    `;
    grid.appendChild(tile);
    tiles.push(tile);
  }
}

// --- CANVAS AND DRAWING ---
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function animateLineFadeOut(tilesToFade) {
  if (tilesToFade.length < 2) return;
  let startTime = null;
  const duration = 200;
  const initialAlpha = 0.67;

  function fade(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = elapsed / duration;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (progress < 1) {
      ctx.globalAlpha = initialAlpha * (1 - progress);
      ctx.strokeStyle = "white";
      const tileWidth = tilesToFade[0].getBoundingClientRect().width;
      ctx.lineWidth = Math.max(2, tileWidth / 8);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const firstRect = tilesToFade[0].getBoundingClientRect();
      ctx.moveTo(
        firstRect.left + firstRect.width / 2,
        firstRect.top + firstRect.height / 2
      );
      for (let i = 1; i < tilesToFade.length; i++) {
        const rect = tilesToFade[i].getBoundingClientRect();
        ctx.lineTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      ctx.stroke();
      requestAnimationFrame(fade);
    }
  }
  requestAnimationFrame(fade);
}

function drawLine(status) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (selectedTiles.length < 2) return;
  ctx.strokeStyle = status === "invalid" ? "red" : "white";
  ctx.globalAlpha = 0.67;
  const tileWidth = selectedTiles[0].getBoundingClientRect().width;
  ctx.lineWidth = Math.max(2, tileWidth / 8);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const firstRect = selectedTiles[0].getBoundingClientRect();
  ctx.moveTo(
    firstRect.left + firstRect.width / 2,
    firstRect.top + firstRect.height / 2
  );
  for (let i = 1; i < selectedTiles.length; i++) {
    const rect = selectedTiles[i].getBoundingClientRect();
    ctx.lineTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

// --- CORE GAME LOGIC ---
async function loadDictionary() {
  startBtn.classList.add("disabled");
  startBtn.textContent = "LOADING DICTIONARY...";
  try {
    const response = await fetch("dictionary.txt");
    const text = await response.text();
    wordSet = new Set(
      text.split("\n").map((word) => word.trim().toUpperCase())
    );
    startBtn.classList.remove("disabled");
    startBtn.textContent = "START GAME";
  } catch (error) {
    console.error("Error loading dictionary:", error);
    startBtn.textContent = "ERROR LOADING";
  }
}

function checkWord(word) {
  return wordSet?.has(word);
}
function getTilePosition(tile) {
  const index = tiles.indexOf(tile);
  return [Math.floor(index / boardSize), index % boardSize];
}
function areAdjacent(tile1, tile2) {
  const [r1, c1] = getTilePosition(tile1);
  const [r2, c2] = getTilePosition(tile2);
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
}
function resetTiles() {
  selectedTiles.forEach((t) => t.classList.remove("selected", "current"));
  selectedTiles = [];
}
function calculateScore(word) {
  const length = word.length;
  if (length < 3) return 0;
  const scoreMap = {
    3: 100,
    4: 400,
    5: 800,
    6: 1400,
    7: 1800,
    8: 2200,
    9: 2600,
  };
  return length <= 9 ? scoreMap[length] : 2600 + (length - 9) * 400;
}
function updateWordDisplay(word, scoreValue = 0, status = "valid") {
  const wordBox = document.getElementById("current-word-box");
  document.body.classList.remove(
    "word-state-valid",
    "word-state-found",
    "word-state-invalid"
  );
  wordBox.classList.remove(
    "valid",
    "found",
    "invalid",
    "word-success-animation"
  );
  if (word === "") {
    wordDisplay.innerHTML = ".";
    wordBox.style.opacity = "0";
  } else {
    wordDisplay.innerHTML =
      status === "valid"
        ? `<span class="current-word">${word}</span> <span class="current-word-score">(+${scoreValue})</span>`
        : `<span class="current-word">${word}</span>`;
    wordBox.style.opacity = "1";
    document.body.classList.add(`word-state-${status}`);
    wordBox.classList.add(status);
  }
}
function animateScore(newScore) {
  const oldScore = parseInt(scoreDisplay.textContent) || 0;
  let startTime = null;
  function animationStep(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / 500, 1);
    const current = Math.floor(oldScore + (newScore - oldScore) * progress);
    scoreDisplay.textContent = current.toString().padStart(5, "0");
    if (progress < 1) requestAnimationFrame(animationStep);
  }
  requestAnimationFrame(animationStep);
}

function handlePointerDown(e) {
  if (homeScreen.offsetParent !== null || endGameModal.style.display !== "none")
    return;
  const tile = e.target.closest(".tile");
  if (!tile) return;
  e.preventDefault();
  isDragging = true;
  resetTiles();
  wasLastWordValid = false;
  tile.classList.add("selected", "current");
  selectedTiles.push(tile);
  playSfx("hit");
  const word = selectedTiles.map((t) => t.textContent.trim()).join("");
  const currentScore = calculateScore(word);
  let status = "invalid";
  if (word.length >= 3) {
    if (foundWords.has(word)) status = "found";
    else if (checkWord(word)) status = "valid";
  }
  updateWordDisplay(word, currentScore, status);
  drawLine(status);
}

function handlePointerMove(e) {
  if (!isDragging) return;
  e.preventDefault();
  const point = e.touches ? e.touches[0] : e;
  const el = document
    .elementFromPoint(point.clientX, point.clientY)
    ?.closest(".tile");
  if (!el || el === selectedTiles.at(-1)) return;
  tiles.forEach((t) => t.classList.remove("current"));
  if (selectedTiles.includes(el)) {
    if (selectedTiles.length >= 2 && el === selectedTiles.at(-2)) {
      selectedTiles.pop().classList.remove("selected");
    }
  } else if (!selectedTiles.length || areAdjacent(selectedTiles.at(-1), el)) {
    el.classList.add("selected");
    selectedTiles.push(el);
    playSfx("hit");
  }
  if (selectedTiles.length) selectedTiles.at(-1).classList.add("current");
  const word = selectedTiles.map((t) => t.textContent.trim()).join("");
  const currentScore = calculateScore(word);
  let status = "invalid";
  if (word.length >= 3) {
    if (foundWords.has(word)) status = "found";
    else if (checkWord(word)) status = "valid";
  }
  if (status === "valid" && !wasLastWordValid) playSfx("almost");
  wasLastWordValid = status === "valid";
  updateWordDisplay(word, currentScore, status);
  drawLine(status);
}

function handlePointerUp() {
  if (!isDragging) return;
  isDragging = false;
  const word = selectedTiles.map((t) => t.textContent.trim()).join("");
  const wordScore = calculateScore(word);
  if (wordScore > 0 && checkWord(word) && !foundWords.has(word)) {
    foundWords.add(word);
    score += wordScore;
    wordsFound++;
    animateScore(score);
    wordCountDisplay.textContent = `WORDS: ${wordsFound}`;
    playSfx("score", word.length);
    document
      .getElementById("current-word-box")
      .classList.add("word-success-animation");
    animateLineFadeOut([...selectedTiles]);
  } else {
    if (word.length >= 3) playSfx("invalid");
    updateWordDisplay("");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  resetTiles();
}

function endGame() {
  clearInterval(interval);
  lastGamePlayedSeed = currentSeed;
  lastGamePlayedSize = boardSize;
  const highScore = getHighScore();
  endGameTitle.classList.remove("new-high-score");
  if (score > highScore) {
    setHighScore(score);
    endGameTitle.textContent = "New High Score!";
    endGameTitle.classList.add("new-high-score");
  } else {
    endGameTitle.textContent = "Time's Up!";
  }
  finalScoreDisplay.textContent = score.toString().padStart(5, "0");
  finalHighScoreDisplay.textContent = getHighScore()
    .toString()
    .padStart(5, "0");
  finalWordCountDisplay.textContent = wordsFound;
  endGameSeedDisplay.textContent = lastGamePlayedSeed;
  endGameModal.style.display = "flex";
}

function startFlow() {
  if (startBtn.classList.contains("disabled")) return;
  boardSize = sizeSlider.checked ? 5 : 4;
  const params = new URLSearchParams(window.location.search);
  const seedFromUrl = params.get("seed");
  const sizeFromUrl = parseInt(params.get("size"));
  if (!seedFromUrl || sizeFromUrl !== boardSize) {
    currentSeed = generateNewSeed(8);
    const newUrl = `${window.location.origin}${window.location.pathname}?seed=${currentSeed}&size=${boardSize}`;
    window.history.pushState(
      { seed: currentSeed, size: boardSize },
      "",
      newUrl
    );
  }
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  startGame();
}

function startGame() {
  endGameModal.style.display = "none";
  generateBoard();
  score = 0;
  wordsFound = 0;
  foundWords = new Set();
  scoreDisplay.textContent = "00000";
  wordCountDisplay.textContent = "WORDS: 0";
  updateWordDisplay("");
  const numericSeed = stringToSeed(currentSeed + boardSize);
  seededRNG = mulberry32(numericSeed);
  const generatedLetters = Array.from(
    { length: tiles.length },
    () =>
      letterDistribution[Math.floor(seededRNG() * letterDistribution.length)]
  );
  tiles.forEach((tile) => tile.classList.add("is-flipping"));
  setTimeout(() => {
    tiles.forEach((tile, i) => {
      tile.querySelector(".tile-letter").textContent = generatedLetters[i];
    });
  }, 250);
  setTimeout(
    () => tiles.forEach((t) => t.classList.remove("is-flipping")),
    500
  );
  playSfx("start");
  timer = 90;
  timerDisplay.textContent = "1:30";
  clearInterval(interval);
  interval = setInterval(() => {
    timer--;
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    timerDisplay.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
    if (timer === 4) playSfx("tick");
    if (timer <= 0) endGame();
  }, 1000);
}

function initializeHomeScreen() {
  const params = new URLSearchParams(window.location.search);
  let seed = params.get("seed");
  let size = parseInt(params.get("size"));
  if (!seed || !seed.match(/^[a-z0-9]{8}$/)) {
    seed = generateNewSeed(8);
    size = 4;
    inviteMessage.style.display = "none";
    window.history.replaceState({}, "", window.location.pathname);
  } else {
    inviteMessage.style.display = "block";
  }
  currentSeed = seed.toLowerCase();
  boardSize = size === 5 ? 5 : 4;
  sizeSlider.checked = boardSize === 5;
  updateSliderLabels();
  seedDisplay.textContent = currentSeed;
  highScoreDisplay.textContent = getHighScore().toString().padStart(5, "0");
  gameScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  endGameModal.style.display = "none";
}

function updateMuteButtons() {
  musicMuteBtn.querySelector(".sound-text").textContent = `Music: ${
    isMusicMuted ? "OFF" : "ON"
  }`;
  sfxMuteBtn.querySelector(".sound-text").textContent = `SFX: ${
    isSfxMuted ? "OFF" : "ON"
  }`;
  sounds.loop.mute(isMusicMuted);
}

function toggleMusic() {
  isMusicMuted = !isMusicMuted;
  localStorage.setItem("musicMuted", isMusicMuted);
  updateMuteButtons();
}

function toggleSfx() {
  isSfxMuted = !isSfxMuted;
  localStorage.setItem("sfxMuted", isSfxMuted);
  updateMuteButtons();
}

function updateSliderLabels() {
  if (sizeSlider.checked) {
    label5x5.classList.add("active");
    label4x4.classList.remove("active");
  } else {
    label4x4.classList.add("active");
    label5x5.classList.remove("active");
  }
}

// Event Listeners
const copyToClipboard = (text, btn) => {
  const originalText = btn.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "COPIED!";
    setTimeout(() => (btn.textContent = originalText), 1500);
  });
};
copyLinkBtn.addEventListener("click", () => {
  const size = sizeSlider.checked ? 5 : 4;
  const url = `${window.location.origin}${window.location.pathname}?seed=${currentSeed}&size=${size}`;
  copyToClipboard(url, copyLinkBtn);
});
endGameCopyLinkBtn.addEventListener("click", () => {
  const url = `${window.location.origin}${window.location.pathname}?seed=${lastGamePlayedSeed}&size=${lastGamePlayedSize}`;
  copyToClipboard(url, endGameCopyLinkBtn);
});
shareScoreBtn.addEventListener("click", () => {
  const url = `${window.location.origin}${window.location.pathname}?seed=${lastGamePlayedSeed}&size=${lastGamePlayedSize}`;
  const text = `I scored ${score} with ${wordsFound} words in Word Hunt! Can you beat me?\n\nPlay the same board: ${url}`;
  copyToClipboard(text, shareScoreBtn);
});
playAgainBtn.addEventListener("click", startGame);
homeBtn.addEventListener("click", initializeHomeScreen);
aboutBtnTriggers.forEach((btn) =>
  btn.addEventListener("click", () => (aboutModal.style.display = "flex"))
);
aboutCloseBtn.addEventListener(
  "click",
  () => (aboutModal.style.display = "none")
);
endEarlyBtn.addEventListener("click", () => {
  if (interval) {
    timer = 0;
    timerDisplay.textContent = "0:00";
    playSfx("end");
    endGame();
  }
});
musicMuteBtn.addEventListener("click", toggleMusic);
sfxMuteBtn.addEventListener("click", toggleSfx);
sizeSlider.addEventListener("input", updateSliderLabels);

window.addEventListener("resize", resizeCanvas);
document.addEventListener("pointerdown", handlePointerDown, { passive: false });
document.addEventListener("pointermove", handlePointerMove, { passive: false });
document.addEventListener("pointerup", handlePointerUp);
document.addEventListener("pointerleave", handlePointerUp);
startBtn.addEventListener("click", startFlow);

// Initial setup
resizeCanvas();
loadDictionary();
initializeHomeScreen();
updateMuteButtons();
if (!sounds.loop.playing()) {
  sounds.loop.play();
}
