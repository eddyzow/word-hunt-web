// --- ELEMENT GETTERS ---
const tiles = Array.from(document.querySelectorAll(".tile"));
const wordDisplay = document.getElementById("current-word");
const scoreDisplay = document.querySelector(".score-value");
const wordCountDisplay = document.querySelector(".word-count");
const timerDisplay = document.querySelector(".timer");
const startModal = document.getElementById("start-modal");
const startBtn = document.getElementById("start-btn");
const canvas = document.getElementById("line-canvas");
const copyLinkBtn = document.getElementById("copy-link-btn");
const seedDisplay = document.getElementById("seed-display");
const inviteMessage = document.getElementById("invite-message");
const highScoreDisplay = document.getElementById("high-score-display");
const ctx = canvas.getContext("2d");

const endGameModal = document.getElementById("end-game-modal");
const endGameTitle = document.getElementById("end-game-title");
const finalScoreDisplay = document.getElementById("final-score");
const finalHighScoreDisplay = document.getElementById("final-high-score");
const finalWordCountDisplay = document.getElementById("final-word-count");
const playAgainBtn = document.getElementById("play-again-btn");
const shareScoreBtn = document.getElementById("share-score-btn");
const endGameCopyLinkBtn = document.getElementById("end-game-copy-link-btn");

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
    if (sounds.score[scoreLength]) {
      sounds.score[scoreLength].play();
    } else if (scoreLength > 5) {
      sounds.score[6].play();
    }
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

// --- CANVAS AND DRAWING ---
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function animateLineFadeOut(tilesToFade) {
  if (tilesToFade.length < 2) return;

  let startTime = null;
  const duration = 200; // Fade duration in ms
  const initialAlpha = 0.67; // The line's starting opacity

  function fade(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = elapsed / duration;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas each frame

    if (progress < 1) {
      const currentAlpha = initialAlpha * (1 - progress);
      ctx.globalAlpha = currentAlpha;

      // Redraw the line with the new alpha
      ctx.strokeStyle = "white"; // Assuming the success line color is white
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
    startBtn.textContent = "ERROR LOADING DICTIONARY";
  }
}

function checkWord(word) {
  return !wordSet ? false : wordSet.has(word);
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
  const body = document.body;

  wordBox.classList.remove("word-success-animation");

  body.classList.remove(
    "word-state-valid",
    "word-state-found",
    "word-state-invalid"
  );
  wordBox.classList.remove("valid", "found", "invalid");
  if (word === "") {
    wordDisplay.innerHTML = ".";
    wordBox.style.opacity = "0";
  } else {
    wordDisplay.innerHTML =
      status === "valid"
        ? `<span class="current-word">${word}</span> <span class="current-word-score">(+${scoreValue})</span>`
        : `<span class="current-word">${word}</span>`;
    wordBox.style.opacity = "1";
    body.classList.add(`word-state-${status}`);
    wordBox.classList.add(status);
  }
}

function animateScore(newScore) {
  const oldScore = parseInt(scoreDisplay.textContent);
  const duration = 500; // ms
  let startTime = null;

  function animationStep(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const currentDisplayScore = Math.floor(
      oldScore + (newScore - oldScore) * progress
    );
    scoreDisplay.textContent = currentDisplayScore.toString().padStart(5, "0");
    if (progress < 1) {
      requestAnimationFrame(animationStep);
    }
  }

  requestAnimationFrame(animationStep);
  scoreDisplay.classList.add("pulse");
  setTimeout(() => scoreDisplay.classList.remove("pulse"), 300);
}

function handlePointerDown(e) {
  if (
    startModal.style.display !== "none" ||
    endGameModal.style.display !== "none"
  )
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
  const word = selectedTiles
    .map((t) => t.querySelector(".tile-letter").textContent.trim())
    .join("")
    .toUpperCase();
  const currentScore = calculateScore(word);
  let status;
  if (word.length < 3) status = "invalid";
  else if (foundWords.has(word)) status = "found";
  else if (checkWord(word)) status = "valid";
  else status = "invalid";
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
  if (!el || el === selectedTiles[selectedTiles.length - 1]) return;
  const rect = el.getBoundingClientRect();
  const radius = rect.width / 2;
  const distance = Math.sqrt(
    Math.pow(point.clientX - (rect.left + radius), 2) +
      Math.pow(point.clientY - (rect.top + radius), 2)
  );
  if (distance > radius) return;
  tiles.forEach((t) => t.classList.remove("current"));
  if (selectedTiles.includes(el)) {
    if (
      selectedTiles.length >= 2 &&
      el === selectedTiles[selectedTiles.length - 2]
    ) {
      selectedTiles.pop().classList.remove("selected");
    }
  } else if (
    !selectedTiles.length ||
    areAdjacent(selectedTiles[selectedTiles.length - 1], el)
  ) {
    el.classList.add("selected");
    selectedTiles.push(el);
    playSfx("hit");
  }
  if (selectedTiles.length > 0) {
    selectedTiles[selectedTiles.length - 1].classList.add("current");
  }
  const word = selectedTiles
    .map((t) => t.querySelector(".tile-letter").textContent.trim())
    .join("")
    .toUpperCase();
  const currentScore = calculateScore(word);
  let status;
  if (word.length < 3) {
    status = "invalid";
  } else if (foundWords.has(word)) {
    status = "found";
  } else if (checkWord(word)) {
    status = "valid";
  } else {
    status = "invalid";
  }
  if (status === "valid" && !wasLastWordValid) {
    playSfx("almost");
  }
  wasLastWordValid = status === "valid";
  updateWordDisplay(word, currentScore, status);
  drawLine(status);
}

function handlePointerUp() {
  if (!isDragging) return;
  isDragging = false;

  const word = selectedTiles
    .map((t) => t.querySelector(".tile-letter").textContent.trim())
    .join("")
    .toUpperCase();
  const wordScore = calculateScore(word);
  const isValidWord = checkWord(word);
  const isAlreadyFound = foundWords.has(word);

  if (wordScore > 0 && isValidWord && !isAlreadyFound) {
    const tilesToFade = [...selectedTiles]; // Capture tiles before reset
    foundWords.add(word);
    score += wordScore;
    wordsFound++;
    animateScore(score);
    wordCountDisplay.textContent = `WORDS: ${wordsFound}`;
    playSfx("score", word.length);

    const wordBox = document.getElementById("current-word-box");
    updateWordDisplay(word, wordScore, "valid");
    wordBox.classList.add("word-success-animation");

    animateLineFadeOut(tilesToFade);
  } else {
    if (word.length >= 3) {
      playSfx("invalid");
    }
    updateWordDisplay("");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  resetTiles();
}

function endGame() {
  clearInterval(interval);
  // FIX: Removed this line to ensure the music loop continues playing
  // sounds.loop.stop();
  lastGamePlayedSeed = currentSeed;
  const highScore = getHighScore();
  endGameTitle.textContent = "Time's Up!";
  endGameTitle.classList.remove("new-high-score");
  if (score > highScore) {
    setHighScore(score);
    endGameTitle.textContent = "New High Score!";
    endGameTitle.classList.add("new-high-score");
  }
  finalScoreDisplay.textContent = score.toString().padStart(5, "0");
  finalHighScoreDisplay.textContent = getHighScore()
    .toString()
    .padStart(5, "0");
  finalWordCountDisplay.textContent = wordsFound;
  endGameModal.style.display = "flex";
}

function startGame() {
  if (startBtn.classList.contains("disabled")) return;
  startModal.style.display = "none";
  endGameModal.style.display = "none";
  score = 0;
  wordsFound = 0;
  foundWords = new Set();
  scoreDisplay.textContent = "00000";
  wordCountDisplay.textContent = "WORDS: 0";
  updateWordDisplay("");
  const numericSeed = stringToSeed(currentSeed);
  seededRNG = mulberry32(numericSeed);
  const generatedLetters = [];
  for (let i = 0; i < tiles.length; i++) {
    generatedLetters.push(
      letterDistribution[Math.floor(seededRNG() * letterDistribution.length)]
    );
  }
  tiles.forEach((tile) => tile.classList.add("is-flipping"));
  setTimeout(() => {
    tiles.forEach((tile, i) => {
      tile.querySelector(".tile-letter").textContent = generatedLetters[i];
    });
  }, 250);
  setTimeout(() => {
    tiles.forEach((tile) => tile.classList.remove("is-flipping"));
  }, 500);
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
    if (timer === 4) {
      playSfx("tick");
    }
    if (timer <= 0) {
      endGame();
    }
  }, 1000);
}

function initializeGame(isNewGame = false) {
  const params = new URLSearchParams(window.location.search);
  let seed = params.get("seed");
  if (isNewGame || !seed || !seed.match(/^[a-z0-9]{8}$/)) {
    seed = generateNewSeed(8);
    inviteMessage.style.display = "none";
    const newUrl = `${window.location.origin}${window.location.pathname}?seed=${seed}`;
    if (isNewGame) {
      window.history.pushState({}, "", newUrl);
    } else {
      window.history.replaceState({}, "", window.location.pathname);
    }
  } else {
    inviteMessage.style.display = "block";
  }
  currentSeed = seed.toLowerCase();
  seedDisplay.textContent = currentSeed;
  tiles.forEach((tile) => {
    if (tile.querySelector(".tile-letter")) {
      tile.querySelector(".tile-letter").textContent = "?";
    }
  });
  highScoreDisplay.textContent = getHighScore().toString().padStart(5, "0");
}

function updateMuteButtons() {
  // Music button
  sounds.loop.mute(isMusicMuted);
  musicMuteBtn.classList.toggle("muted", isMusicMuted);
  musicMuteBtn.querySelector(".sound-icon").textContent = isMusicMuted
    ? "🔇"
    : "🎵";
  musicMuteBtn.querySelector(".sound-text").textContent = `Music: ${
    isMusicMuted ? "OFF" : "ON"
  }`;

  // SFX button
  sfxMuteBtn.classList.toggle("muted", isSfxMuted);
  sfxMuteBtn.querySelector(".sound-icon").textContent = isSfxMuted
    ? "🔇"
    : "🔊";
  sfxMuteBtn.querySelector(".sound-text").textContent = `SFX: ${
    isSfxMuted ? "OFF" : "ON"
  }`;
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

// Event Listeners
const copyToClipboard = (text, btn) => {
  const originalText = btn.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "COPIED!";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  });
};
copyLinkBtn.addEventListener("click", () =>
  copyToClipboard(
    `${window.location.origin}${window.location.pathname}?seed=${currentSeed}`,
    copyLinkBtn
  )
);
endGameCopyLinkBtn.addEventListener("click", () =>
  copyToClipboard(
    `${window.location.origin}${window.location.pathname}?seed=${lastGamePlayedSeed}`,
    endGameCopyLinkBtn
  )
);
shareScoreBtn.addEventListener("click", () => {
  const text = `I scored ${score} with ${wordsFound} words in Word Hunt! Can you beat me?\n\nPlay the same board: ${window.location.origin}${window.location.pathname}?seed=${lastGamePlayedSeed}`;
  copyToClipboard(text, shareScoreBtn);
});
playAgainBtn.addEventListener("click", () => {
  initializeGame(true);
  startGame();
});
aboutBtnTriggers.forEach((btn) =>
  btn.addEventListener("click", () => {
    aboutModal.style.display = "flex";
  })
);
aboutCloseBtn.addEventListener("click", () => {
  aboutModal.style.display = "none";
});
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

window.addEventListener("resize", resizeCanvas);
document.addEventListener("pointerdown", handlePointerDown, { passive: false });
document.addEventListener("pointermove", handlePointerMove, { passive: false });
document.addEventListener("pointerup", handlePointerUp);
document.addEventListener("pointerleave", handlePointerUp);
startBtn.addEventListener("click", startGame);

// Initial setup
resizeCanvas();
loadDictionary();
initializeGame(false);
updateMuteButtons();
sounds.loop.stop();
sounds.loop.play();
