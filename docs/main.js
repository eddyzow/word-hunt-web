const tiles = Array.from(document.querySelectorAll(".tile"));
const wordDisplay = document.getElementById("current-word");
const scoreDisplay = document.querySelector(".score-value");
const wordCountDisplay = document.querySelector(".word-count");
const timerDisplay = document.querySelector(".timer");
const modal = document.getElementById("rules-modal");
const startBtn = document.getElementById("start-btn");
const canvas = document.getElementById("line-canvas");
const copyLinkBtn = document.getElementById("copy-link-btn");
const ctx = canvas.getContext("2d");

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

// A simple seedable random number generator (mulberry32)
function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Letter distribution based on English language frequency
const letterDistribution =
  "EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKKJXXQZ".split(
    ""
  );

function populateBoard() {
  tiles.forEach((tile) => {
    const randomIndex = Math.floor(seededRNG() * letterDistribution.length);
    tile.textContent = letterDistribution[randomIndex];
  });
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function drawLine(status) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (selectedTiles.length < 2) {
    return;
  }

  if (status === "invalid") {
    ctx.strokeStyle = "red";
  } else {
    ctx.strokeStyle = "white";
  }

  ctx.globalAlpha = 0.7;
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

async function loadDictionary() {
  startBtn.disabled = true;
  startBtn.textContent = "LOADING DICTIONARY...";
  try {
    const response = await fetch("dictionary.txt");
    const text = await response.text();
    const words = text.split("\n").map((word) => word.trim().toUpperCase());
    wordSet = new Set(words);
    startBtn.disabled = false;
    startBtn.textContent = "START";
  } catch (error) {
    console.error("Error loading dictionary:", error);
    startBtn.textContent = "ERROR LOADING DICTIONARY";
  }
}

function checkWord(word) {
  if (!wordSet) return false;
  return wordSet.has(word);
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    if (status === "valid") {
      wordDisplay.innerHTML = `<span class="current-word">${word}</span> <span class="current-word-score">(+${scoreValue})</span>`;
    } else {
      wordDisplay.innerHTML = `<span class="current-word">${word}</span>`;
    }

    wordBox.style.opacity = "1";

    body.classList.add(`word-state-${status}`);
    wordBox.classList.add(status);
  }
}

function animateScore(newScore) {
  const oldScore = parseInt(scoreDisplay.textContent);
  const duration = 600;
  const frameRate = 30;
  const increment = (newScore - oldScore) / (duration / frameRate);
  let current = oldScore;
  const step = setInterval(() => {
    current += increment;
    if (
      (increment > 0 && current >= newScore) ||
      (increment < 0 && current <= newScore)
    ) {
      current = newScore;
      clearInterval(step);
    }
    scoreDisplay.textContent = Math.round(current);
  }, frameRate);
  scoreDisplay.classList.add("pulse");
  setTimeout(() => scoreDisplay.classList.remove("pulse"), 300);
}

function handlePointerDown(e) {
  if (!e.target.classList.contains("tile")) {
    return;
  }

  e.preventDefault();
  isDragging = true;
  resetTiles();
  handlePointerMove(e);
}

function handlePointerMove(e) {
  if (!isDragging) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);

  if (!el || !el.classList.contains("tile")) return;

  const rect = el.getBoundingClientRect();
  const radius = rect.width / 2;
  const centerX = rect.left + radius;
  const centerY = rect.top + radius;

  const distance = Math.sqrt(
    Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
  );

  if (distance > radius) {
    return;
  }

  const last = selectedTiles[selectedTiles.length - 1];
  tiles.forEach((t) => t.classList.remove("current"));

  if (selectedTiles.includes(el)) {
    if (
      selectedTiles.length >= 2 &&
      el === selectedTiles[selectedTiles.length - 2]
    ) {
      last.classList.remove("selected");
      selectedTiles.pop();
    }
  } else if (!last || areAdjacent(last, el)) {
    el.classList.add("selected");
    selectedTiles.push(el);
  }

  if (selectedTiles.length > 0) {
    selectedTiles[selectedTiles.length - 1].classList.add("current");
  }

  const word = selectedTiles
    .map((t) => t.textContent.trim())
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

  updateWordDisplay(word, currentScore, status);
  drawLine(status);
}

function handlePointerUp() {
  if (!isDragging) return;
  isDragging = false;

  const word = selectedTiles
    .map((t) => t.textContent.trim())
    .join("")
    .toUpperCase();
  const wordScore = calculateScore(word);
  const isValidWord = checkWord(word);
  const isAlreadyFound = foundWords.has(word);

  if (wordScore > 0 && isValidWord && !isAlreadyFound) {
    foundWords.add(word);
    score += wordScore;
    wordsFound++;
    animateScore(score);
    wordCountDisplay.textContent = `${wordsFound} words`;
    updateWordDisplay("");
  } else {
    updateWordDisplay("");
  }

  resetTiles();
}

function startGame() {
  modal.style.display = "none";
  score = 0;
  wordsFound = 0;
  foundWords = new Set();
  scoreDisplay.textContent = "0";
  wordCountDisplay.textContent = "0 words";
  updateWordDisplay("");

  // Re-populate the board using the same seed for this session
  seededRNG = mulberry32(currentSeed);
  populateBoard();

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
    if (timer <= 0) {
      clearInterval(interval);
      alert(
        `Time's up!\nYou scored ${score} points and found ${wordsFound} words.`
      );
    }
  }, 1000);
}

function initializeGame() {
  const params = new URLSearchParams(window.location.search);
  let seed = parseInt(params.get("seed"));

  // If no seed in URL or seed is invalid, generate a new one
  if (!seed) {
    seed = Math.floor(Math.random() * 1000000000);
    // Update the URL without reloading the page
    const newUrl = `${window.location.pathname}?seed=${seed}`;
    window.history.replaceState({ path: newUrl }, "", newUrl);
  }

  currentSeed = seed;
  seededRNG = mulberry32(currentSeed);

  populateBoard();

  copyLinkBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      copyLinkBtn.textContent = "Link Copied!";
      setTimeout(() => {
        copyLinkBtn.textContent = "Copy Link";
      }, 1500);
    });
  });
}

// Set up pointer events
window.addEventListener("resize", resizeCanvas);
document.addEventListener("pointerdown", handlePointerDown);
document.addEventListener("pointermove", handlePointerMove);
document.addEventListener("pointerup", handlePointerUp);
document.addEventListener("pointerleave", handlePointerUp);

startBtn.addEventListener("click", startGame);

// Initial setup
resizeCanvas();
loadDictionary();
initializeGame();
