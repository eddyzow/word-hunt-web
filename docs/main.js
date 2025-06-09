const tiles = Array.from(document.querySelectorAll(".tile"));
const wordDisplay = document.getElementById("current-word");
const scoreDisplay = document.querySelector(".score-value");
const wordCountDisplay = document.querySelector(".word-count");
const timerDisplay = document.querySelector(".timer");
const modal = document.getElementById("rules-modal");
const startBtn = document.getElementById("start-btn");

let selectedTiles = [];
let isDragging = false;
let score = 0;
let wordsFound = 0;
let boardSize = 4;
let timer = 90;
let interval;

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
  selectedTiles.forEach((t) => t.classList.remove("selected", "valid"));
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

function updateWordDisplay(word, scoreValue = 0) {
  if (word == "") {
    wordDisplay.innerHTML = ".";
    document
      .getElementById("current-word-box")
      .setAttribute("style", "opacity: 0");
  } else {
    wordDisplay.innerHTML = word
      ? `<span class="current-word">${word}</span> <span class="current-word-score">(+${scoreValue})</span>`
      : "";
    document
      .getElementById("current-word-box")
      .setAttribute("style", "opacity: 1");
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
  e.preventDefault();
  isDragging = true;
  resetTiles();
  handlePointerMove(e);
}

function handlePointerMove(e) {
  if (!isDragging) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || !el.classList.contains("tile")) return;

  const last = selectedTiles[selectedTiles.length - 1];

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

  const word = selectedTiles.map((t) => t.textContent.trim()).join("");
  const currentScore = calculateScore(word);
  updateWordDisplay(word, currentScore);
}

function handlePointerUp() {
  if (!isDragging) return;
  isDragging = false;

  const word = selectedTiles.map((t) => t.textContent.trim()).join("");
  const wordScore = calculateScore(word);

  if (wordScore > 0) {
    score += wordScore;

    wordsFound++;
    animateScore(score);
    wordCountDisplay.textContent = `${wordsFound} words`;
    selectedTiles.forEach((t) => t.classList.add("valid"));
    updateWordDisplay("");
  } else {
    updateWordDisplay("");
  }

  setTimeout(resetTiles, 150);
}

function startGame() {
  modal.style.display = "none";
  score = 0;
  wordsFound = 0;
  scoreDisplay.textContent = "0";
  wordCountDisplay.textContent = "0 words";
  wordDisplay.innerHTML = ".";
  document
    .getElementById("current-word-box")
    .setAttribute("style", "opacity: 0");
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

// Set up pointer events
document.addEventListener("pointerdown", handlePointerDown);
document.addEventListener("pointermove", handlePointerMove);
document.addEventListener("pointerup", handlePointerUp);
document.addEventListener("pointerleave", handlePointerUp);

startBtn.addEventListener("click", startGame);
