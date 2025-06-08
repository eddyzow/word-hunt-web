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

let selectedTiles = [];
let isDragging = false;
let score = 0;

function resetTiles() {
  selectedTiles.forEach((tile) => tile.classList.remove("selected"));
  selectedTiles = [];
}

function onStart(e) {
  e.preventDefault();
  isDragging = true;
  resetTiles();

  const point = e.touches ? e.touches[0] : e;
  const el = document.elementFromPoint(point.clientX, point.clientY);
  if (el && el.classList.contains("tile")) {
    el.classList.add("selected");
    selectedTiles.push(el);
    const word = selectedTiles.map((t) => t.textContent.trim()).join("");
    wordDisplay.textContent = word;
  }

  // Add mouseleave listener only during dragging
  document.addEventListener("mouseleave", onEnd);
}

function onMove(e) {
  if (!isDragging) return;
  const point = e.touches ? e.touches[0] : e;
  const el = document.elementFromPoint(point.clientX, point.clientY);
  if (el && el.classList.contains("tile") && !selectedTiles.includes(el)) {
    el.classList.add("selected");
    selectedTiles.push(el);
    const word = selectedTiles.map((t) => t.textContent.trim()).join("");
    wordDisplay.textContent = word;
  }
}

function onEnd() {
  if (!isDragging) return;
  isDragging = false;

  const word = selectedTiles.map((t) => t.textContent.trim()).join("");
  if (word.length > 0) {
    score += 100;
    scoreDisplay.textContent = score;
  }
  wordDisplay.textContent = "";
  resetTiles();

  // Remove mouseleave listener when drag ends
  document.removeEventListener("mouseleave", onEnd);
}

// Event listeners

document.addEventListener("pointerdown", onStart);
document.addEventListener("pointermove", onMove);
document.addEventListener("pointerup", onEnd);
document.addEventListener("pointercancel", onEnd);
document.addEventListener("pointerleave", onEnd);
