// goal:
// standard Word Hunt functionality
// free standard 4 boards
// free hints
// free everything

// clearly label that this is an open source project.
// take donations though

// expand to word bites if people want

const tiles = Array.from(document.querySelectorAll(".tile"));
const wordDisplay = document.getElementById("current-word");
const scoreDisplay = document.querySelector(".score-value");
const wordCountDisplay = document.querySelector(".word-count"); // assuming you have a word count element
const modal = document.getElementById("rules-modal");
const startBtn = document.getElementById("start-btn");
const timerDisplay = document.querySelector(".timer");

let selectedTiles = [];
let isDragging = false;
let score = 0;
let wordCount = 0;
let gameActive = false;
let timer = 120; // 2 minutes in seconds
let timerInterval = null;

function resetTiles() {
  selectedTiles.forEach((tile) => tile.classList.remove("selected"));
  selectedTiles = [];
}

function updateTimer() {
  if (timer <= 0) {
    clearInterval(timerInterval);
    endGame();
    return;
  }
  timer--;
  const mins = Math.floor(timer / 60);
  const secs = timer % 60;
  timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
}

function endGame() {
  gameActive = false;
  alert(`Time's up! You scored ${score} points with ${wordCount} words.`);
  // Optionally reload or reset game here
  // location.reload();
}

function onStart(e) {
  if (!gameActive) return;
  e.preventDefault();
  isDragging = true;
  resetTiles();
  onMove(e);
}

function onMove(e) {
  if (!gameActive || !isDragging) return;
  const point = e.touches ? e.touches[0] : e;
  const el = document.elementFromPoint(point.clientX, point.clientY);

  if (el && el.classList.contains("tile")) {
    const lastTile = selectedTiles[selectedTiles.length - 1];

    if (selectedTiles.includes(el)) {
      // Undo on backward drag (only last tile can be removed)
      if (
        selectedTiles.length > 1 &&
        el === selectedTiles[selectedTiles.length - 2]
      ) {
        lastTile.classList.remove("selected");
        selectedTiles.pop();
      }
    } else {
      // Check adjacency before adding new tile
      if (!lastTile || areTilesAdjacent(lastTile, el)) {
        el.classList.add("selected");
        selectedTiles.push(el);
      }
    }

    const word = selectedTiles.map((t) => t.textContent.trim()).join("");
    wordDisplay.textContent = word;
  }
}

function areTilesAdjacent(tileA, tileB) {
  const indexA = tiles.indexOf(tileA);
  const indexB = tiles.indexOf(tileB);
  const size = 4; // 4x4 board

  const rowA = Math.floor(indexA / size);
  const colA = indexA % size;
  const rowB = Math.floor(indexB / size);
  const colB = indexB % size;

  const rowDiff = Math.abs(rowA - rowB);
  const colDiff = Math.abs(colA - colB);

  // Adjacent means rowDiff <= 1 and colDiff <= 1 but not same tile
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

function onEnd() {
  if (!gameActive || !isDragging) return;
  isDragging = false;
  const word = selectedTiles.map((t) => t.textContent.trim()).join("");
  if (word.length > 0) {
    score += 100;
    wordCount++;
    scoreDisplay.textContent = score;
    wordCountDisplay.textContent = `${wordCount} words`;
  }
  wordDisplay.textContent = "";
  resetTiles();
}

startBtn.addEventListener("click", () => {
  modal.style.display = "none";
  gameActive = true;
  timer = 120;
  score = 0;
  wordCount = 0;
  scoreDisplay.textContent = score;
  wordCountDisplay.textContent = `${wordCount} words`;
  timerDisplay.textContent = "2:00";
  resetTiles();
  wordDisplay.textContent = "";

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
});

document.addEventListener("pointerdown", onStart);
document.addEventListener("pointermove", onMove);
document.addEventListener("pointerup", onEnd);
document.addEventListener("pointercancel", onEnd);
document.addEventListener("pointerleave", onEnd);
