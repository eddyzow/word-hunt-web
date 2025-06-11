document.addEventListener("DOMContentLoaded", () => {
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
  const homeSeedDisplay = document.getElementById("home-seed-display");
  const showMarathonStartBtn = document.getElementById(
    "show-marathon-start-btn"
  );
  const homeCopyLinkBtn = document.getElementById("home-copy-link-btn");
  const randomizeSeedBtn = document.getElementById("randomize-seed-btn");
  const sizeSlider = document.getElementById("size-slider");
  const label4x4 = document.getElementById("label-4x4");
  const label5x5 = document.getElementById("label-5x5");
  const startBtn = document.getElementById("start-btn");

  // Classic End Game Modal Elements
  const endGameModal = document.getElementById("end-game-modal");
  const endGameTitle = document.getElementById("end-game-title");
  const finalScoreDisplay = document.getElementById("final-score");
  const finalWordCountDisplay = document.getElementById("final-word-count");
  const foundWordsList = document.getElementById("found-words-list");
  const classicEndSeedDisplay = document.getElementById(
    "classic-end-seed-display"
  );
  const classicEndCopyLinkBtn = document.getElementById(
    "classic-end-copy-link-btn"
  );
  const viewAllWordsBtn = document.getElementById("view-all-words-btn");
  const playAgainBtn = document.getElementById("play-again-btn");
  const homeBtn = document.getElementById("home-btn");

  // Marathon Modals
  const marathonStartModal = document.getElementById("marathon-start-modal");
  const marathonStatusMessage = document.getElementById(
    "marathon-status-message"
  );
  const nextBoardTimerDisplay = document.getElementById("next-board-timer");
  const startMarathonBtn = document.getElementById("start-marathon-btn");
  const marathonStartHomeBtn = document.getElementById(
    "marathon-start-home-btn"
  );
  const marathonStartCloseBtn = document.getElementById(
    "marathon-start-close-btn"
  );
  const marathonEndModal = document.getElementById("marathon-end-modal");
  const marathonEndTitle = document.getElementById("marathon-end-title");
  const marathonTimeSurvived = document.getElementById(
    "marathon-time-survived"
  );
  const marathonTodayBest = document.getElementById("marathon-today-best");
  const marathonAllTimeBest = document.getElementById("marathon-all-time-best");
  const shareTimeBtn = document.getElementById("share-time-btn");
  const marathonViewAllWordsBtn = document.getElementById(
    "marathon-view-all-words-btn"
  );
  const marathonHomeBtn = document.getElementById("marathon-home-btn");

  // All Words Modal Elements
  const allWordsModal = document.getElementById("all-words-modal");
  const allWordsCloseBtn = document.getElementById("all-words-close-btn");
  const allPossibleWordsList = document.getElementById("all-possible-words");

  // Stats Modal Elements
  const statsModal = document.getElementById("stats-modal");
  const statsBtnTriggers = document.querySelectorAll(".stats-btn-trigger");
  const statsCloseBtn = document.getElementById("stats-close-btn");
  const statsValues = document.querySelectorAll("[data-stat]");
  const resetStatsBtn = document.getElementById("reset-stats-btn");

  // Other UI
  const aboutModal = document.getElementById("about-modal");
  const aboutBtnTriggers = document.querySelectorAll(".about-btn-trigger");
  const aboutCloseBtn = document.getElementById("about-close-btn");
  const endEarlyBtn = document.getElementById("end-early-btn");
  const allMusicMuteBtns = document.querySelectorAll(".music-mute-btn");
  const allSfxMuteBtns = document.querySelectorAll(".sfx-mute-btn");

  // --- GAME STATE VARIABLES ---
  let selectedTiles = [];
  let isDragging = false;
  let score = 0;
  let wordsFound = new Set();
  let allPossibleWords = new Set();
  let boardSize = 4;
  let gameMode = "classic"; // 'classic' or 'marathon'
  let timer = 90;
  let timeSurvived = 0;
  let gameInterval;
  let nextBoardInterval;
  let wordSet;
  let dictionaryTrie;
  let currentSeed;
  let seededRNG;
  let lastGamePlayedSeed;
  let lastGamePlayedSize;
  let wasLastWordValid = false;
  let isMusicMuted = localStorage.getItem("musicMuted") === "true";
  let isSfxMuted = localStorage.getItem("sfxMuted") === "true";

  // --- TRIE & SOLVER ---
  class TrieNode {
    constructor() {
      this.children = {};
      this.isEndOfWord = false;
    }
  }

  function buildTrie(words) {
    const root = new TrieNode();
    for (const word of words) {
      if (word.length < 3) continue;
      let node = root;
      for (const char of word) {
        if (!node.children[char]) {
          node.children[char] = new TrieNode();
        }
        node = node.children[char];
      }
      node.isEndOfWord = true;
    }
    return root;
  }

  function solveBoard(boardLetters) {
    allPossibleWords.clear();
    const rows = boardSize;
    const cols = boardSize;
    const board = [];
    for (let i = 0; i < rows; i++) {
      board.push(boardLetters.slice(i * cols, i * cols + cols));
    }

    function dfs(node, r, c, currentWord, visited) {
      if (r < 0 || r >= rows || c < 0 || c >= cols || visited[r][c] || !node) {
        return;
      }

      const char = board[r][c];
      const nextNode = node.children[char];
      if (!nextNode) return;

      const newWord = currentWord + char;
      visited[r][c] = true;

      if (nextNode.isEndOfWord && newWord.length >= 3) {
        allPossibleWords.add(newWord);
      }

      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          dfs(nextNode, r + i, c + j, newWord, visited);
        }
      }
      visited[r][c] = false;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const visited = Array(rows)
          .fill(false)
          .map(() => Array(cols).fill(false));
        dfs(dictionaryTrie, r, c, "", visited);
      }
    }
  }

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
    time: new Howl({ src: ["sounds/time.mp3"], volume: 0.7 }),
  };

  function playSfx(sound, scoreLength = null) {
    if (isSfxMuted) return;
    if (sound === "score" && scoreLength) {
      sounds.score[scoreLength]?.play() || sounds.score[6]?.play();
    } else if (sounds[sound]) {
      sounds[sound].play();
    }
  }

  // --- STATS LOGIC ---
  function getStats(mode = "classic") {
    const key = mode === "classic" ? "wordHuntStats" : "wordHuntMarathonStats";
    const defaultStats =
      mode === "classic"
        ? {
            gamesPlayed: 0,
            totalWordsFound: 0,
            totalScore: 0,
            highScore: 0,
            longestWord: "",
            totalWordLength: 0,
          }
        : {
            allTimeBest: 0,
            dailyBest: { date: null, time: 0 },
          };
    try {
      const stats = JSON.parse(localStorage.getItem(key));
      const mergedStats = { ...defaultStats, ...stats };
      if (mode === "marathon" && stats) {
        mergedStats.dailyBest = {
          ...defaultStats.dailyBest,
          ...stats.dailyBest,
        };
      }
      return mergedStats;
    } catch (e) {
      return defaultStats;
    }
  }

  function saveStats(stats, mode = "classic") {
    const key = mode === "classic" ? "wordHuntStats" : "wordHuntMarathonStats";
    localStorage.setItem(key, JSON.stringify(stats));
  }

  function updateClassicStats() {
    const stats = getStats("classic");
    stats.gamesPlayed++;
    stats.totalWordsFound += wordsFound.size;
    stats.totalScore += score;
    if (score > stats.highScore) {
      stats.highScore = score;
    }
    let currentLongest = stats.longestWord;
    let currentTotalLength = 0;
    wordsFound.forEach((word) => {
      if (word.length > currentLongest.length) {
        currentLongest = word;
      } else if (
        word.length === currentLongest.length &&
        word > currentLongest
      ) {
        currentLongest = word;
      }
      currentTotalLength += word.length;
    });
    stats.longestWord = currentLongest;
    stats.totalWordLength += currentTotalLength;
    saveStats(stats, "classic");
  }

  function updateMarathonStats() {
    const stats = getStats("marathon");
    const today = getDailySeed();

    // This is an official run only if it's a new day
    if (stats.dailyBest.date !== today) {
      stats.dailyBest = { date: today, time: timeSurvived };
    }
    // All-time best is always updated if beaten, even in practice runs
    if (timeSurvived > stats.allTimeBest) {
      stats.allTimeBest = timeSurvived;
    }
    saveStats(stats, "marathon");
  }

  function displayStats() {
    const stats = getStats("classic");
    const avgScore =
      stats.gamesPlayed > 0
        ? Math.round(stats.totalScore / stats.gamesPlayed)
        : 0;
    const avgWordLength =
      stats.totalWordsFound > 0
        ? (stats.totalWordLength / stats.totalWordsFound).toFixed(1)
        : "0.0";

    const statsMap = {
      gamesPlayed: stats.gamesPlayed,
      highScore: stats.highScore,
      avgScore: avgScore,
      totalWordsFound: stats.totalWordsFound,
      avgWordLength: avgWordLength,
      longestWord: stats.longestWord || "-",
    };

    statsValues.forEach((el) => {
      const statName = el.getAttribute("data-stat");
      el.textContent = statsMap[statName];
    });
    statsModal.style.display = "flex";
  }

  // --- HIGH SCORE LOGIC ---
  function getHighScore() {
    return getStats("classic").highScore;
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

  function getDailySeed() {
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = (today.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = today.getUTCDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    const dpr = window.devicePixelRatio || 1;
    const rect = grid.getBoundingClientRect(); // Get size of the grid container

    // Set the display size of the canvas
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Set the internal resolution of the canvas
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    // Scale the context to account for the higher resolution
    ctx.scale(dpr, dpr);
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
    showMarathonStartBtn.classList.add("disabled");
    startBtn.textContent = "LOADING...";
    try {
      const response = await fetch("dictionary.txt");
      const text = await response.text();
      const words = text.split("\n").map((word) => word.trim().toUpperCase());
      wordSet = new Set(words);
      dictionaryTrie = buildTrie(words);
      startBtn.classList.remove("disabled");
      showMarathonStartBtn.classList.remove("disabled");
      startBtn.textContent = "PLAY CLASSIC";
    } catch (error) {
      console.error("Error loading dictionary:", error);
      startBtn.textContent = "ERROR";
      showMarathonStartBtn.textContent = "ERROR";
    }
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

  function calculateTimeBonus(word) {
    const length = word.length;
    if (length < 3) return 0;
    const timeMap = { 3: 2, 4: 3, 5: 5, 6: 7, 7: 10, 8: 13 };
    return timeMap[length] || 16;
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
      let scoreOrTime =
        gameMode === "classic"
          ? `(+${scoreValue})`
          : `(+${calculateTimeBonus(word)}s)`;
      wordDisplay.innerHTML =
        status === "valid"
          ? `<span class="current-word">${word}</span> <span class="current-word-score">${scoreOrTime}</span>`
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
    if (
      homeScreen.offsetParent !== null ||
      endGameModal.style.display !== "none" ||
      allWordsModal.style.display !== "none" ||
      marathonEndModal.style.display !== "none" ||
      marathonStartModal.style.display !== "none"
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
    const word = selectedTiles.map((t) => t.textContent.trim()).join("");
    const currentScore = calculateScore(word);
    let status = "invalid";
    if (word.length >= 3) {
      if (wordsFound.has(word)) status = "found";
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

    const rect = el.getBoundingClientRect();
    const radius = rect.width / 2;
    const distance = Math.sqrt(
      Math.pow(point.clientX - (rect.left + radius), 2) +
        Math.pow(point.clientY - (rect.top + radius), 2)
    );
    if (distance > radius) return;

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
      if (wordsFound.has(word)) status = "found";
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
    const isValidWord =
      word.length >= 3 && checkWord(word) && !wordsFound.has(word);

    if (isValidWord) {
      wordsFound.add(word);
      playSfx("score", word.length);

      if (gameMode === "classic") {
        const wordScore = calculateScore(word);
        score += wordScore;
        animateScore(score);
      } else if (gameMode === "marathon") {
        const timeBonus = calculateTimeBonus(word);
        timer += timeBonus;
        scoreDisplay.textContent = formatTime(timer);
        scoreDisplay.classList.add("time-bonus");
        setTimeout(() => scoreDisplay.classList.remove("time-bonus"), 300);
        playSfx("time");
      }

      wordCountDisplay.textContent = `WORDS: ${wordsFound.size}`;
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
    clearInterval(gameInterval);

    if (gameMode === "classic") {
      lastGamePlayedSeed = currentSeed;
      lastGamePlayedSize = boardSize;
      updateClassicStats();
      highScoreDisplay.textContent = getStats("classic").highScore.toString();
      endGameTitle.classList.remove("new-high-score");
      if (score > 0 && score === getStats("classic").highScore) {
        endGameTitle.textContent = "New High Score!";
        endGameTitle.classList.add("new-high-score");
      } else {
        endGameTitle.textContent = "Time's Up!";
      }
      finalScoreDisplay.textContent = score.toString();
      finalWordCountDisplay.textContent = wordsFound.size;
      classicEndSeedDisplay.textContent = currentSeed;
      foundWordsList.innerHTML = "";
      const sortedFoundWords = [...wordsFound].sort();
      const numColumns = 2;
      const columns = Array.from({ length: numColumns }, () =>
        document.createElement("div")
      );
      sortedFoundWords.forEach((word, index) => {
        const span = document.createElement("span");
        span.textContent = word;
        columns[index % numColumns].appendChild(span);
      });
      columns.forEach((col) => foundWordsList.appendChild(col));
      endGameModal.style.display = "flex";
    } else if (gameMode === "marathon") {
      playSfx("end");
      updateMarathonStats();
      const marathonStats = getStats("marathon");
      marathonEndTitle.classList.remove("new-high-score");
      if (timeSurvived > 0 && timeSurvived === marathonStats.allTimeBest) {
        marathonEndTitle.textContent = "New Best Time!";
        marathonEndTitle.classList.add("new-high-score");
      } else {
        marathonEndTitle.textContent = "Time's Up!";
      }
      marathonTimeSurvived.textContent = formatTime(timeSurvived);
      marathonTodayBest.textContent = formatTime(marathonStats.dailyBest.time);
      marathonAllTimeBest.textContent = formatTime(marathonStats.allTimeBest);
      marathonEndModal.style.display = "flex";
    }
  }

  function showMarathonStartScreen() {
    const stats = getStats("marathon");
    const today = getDailySeed();
    if (stats.dailyBest.date === today && stats.dailyBest.time > 0) {
      marathonStatusMessage.innerHTML = `Your best time today is <strong>${formatTime(
        stats.dailyBest.time
      )}</strong>. Further runs are for practice!`;
    } else {
      marathonStatusMessage.innerHTML =
        "You have one official attempt for today's board. Good luck!";
    }

    clearInterval(nextBoardInterval);
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
      );
      const diff = tomorrow - now.getTime();
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        .toString()
        .padStart(2, "0");
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
        .toString()
        .padStart(2, "0");
      const seconds = Math.floor((diff / 1000) % 60)
        .toString()
        .padStart(2, "0");
      nextBoardTimerDisplay.textContent = `Next board in: ${hours}:${minutes}:${seconds}`;
    };
    updateTimer();
    nextBoardInterval = setInterval(updateTimer, 1000);
    marathonStartModal.style.display = "flex";
  }

  function startMarathonGame() {
    clearInterval(nextBoardInterval);
    gameMode = "marathon";
    marathonStartModal.style.display = "none";
    homeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    boardSize = 4;
    currentSeed = getDailySeed();
    startGame();
  }

  function startClassicGame() {
    if (startBtn.classList.contains("disabled")) return;
    boardSize = sizeSlider.checked ? 5 : 4;
    gameMode = "classic";
    currentSeed = homeSeedDisplay.textContent || generateNewSeed(8);
    homeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    startGame();
  }

  function startGame() {
    document.body.classList.toggle("mode-5x5", boardSize === 5);
    document.body.classList.toggle("mode-marathon", gameMode === "marathon");

    [endGameModal, allWordsModal, marathonEndModal, marathonStartModal].forEach(
      (m) => (m.style.display = "none")
    );

    generateBoard();
    score = 0;
    timeSurvived = 0;
    wordsFound.clear();
    allPossibleWords.clear();
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
      solveBoard(generatedLetters);
    }, 250);
    setTimeout(
      () => tiles.forEach((t) => t.classList.remove("is-flipping")),
      500
    );
    playSfx("start");

    timer = gameMode === "classic" ? 90 : 30;
    if (gameMode === "marathon") {
      scoreDisplay.textContent = formatTime(timer);
    } else {
      scoreDisplay.textContent = "00000";
    }

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
      timer--;
      if (gameMode === "marathon") {
        timeSurvived++;
      }
      if (gameMode === "marathon") scoreDisplay.textContent = formatTime(timer);
      timerDisplay.textContent = formatTime(timer);

      if (gameMode === "classic" && timer === 4) {
        playSfx("tick");
      }
      if (timer <= 0) {
        endGame();
      }
    }, 1000);
  }

  function playNewGame() {
    boardSize = lastGamePlayedSize || 4;
    currentSeed = generateNewSeed(8);
    gameMode = "classic";
    const newUrl = `${window.location.origin}${window.location.pathname}?seed=${currentSeed}&size=${boardSize}`;
    window.history.pushState(
      { seed: currentSeed, size: boardSize },
      "",
      newUrl
    );
    startGame();
  }

  function initializeHomeScreen(isReturning = false) {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");

    if (modeParam === "marathon") {
      showMarathonStartScreen();
      return;
    }

    gameMode = "classic";
    let seed = params.get("seed");
    let size = parseInt(params.get("size"));
    if (isReturning || !seed || !seed.match(/^[a-z0-9]{8,10}$/)) {
      window.history.replaceState({}, "", window.location.pathname);
      seed = generateNewSeed(8);
      size = 4;
      inviteMessage.style.display = "none";
    } else {
      inviteMessage.style.display = "block";
    }
    currentSeed = seed.toLowerCase();
    boardSize = size === 5 ? 5 : 4;
    sizeSlider.checked = boardSize === 5;
    updateSliderLabels();
    homeSeedDisplay.textContent = currentSeed;
    highScoreDisplay.textContent = getHighScore().toString();
    gameScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    [endGameModal, allWordsModal, marathonEndModal, marathonStartModal].forEach(
      (m) => (m.style.display = "none")
    );
    document.body.classList.remove("mode-5x5", "mode-marathon");
  }

  function updateMuteButtons() {
    const musicText = `Music: ${isMusicMuted ? "OFF" : "ON"}`;
    const sfxText = `SFX: ${isSfxMuted ? "OFF" : "ON"}`;
    allMusicMuteBtns.forEach(
      (btn) =>
        (btn.innerHTML = `<span class="sound-icon">🎵</span> ${musicText}`)
    );
    allSfxMuteBtns.forEach(
      (btn) => (btn.innerHTML = `<span class="sound-icon">🔊</span> ${sfxText}`)
    );
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
  homeCopyLinkBtn.addEventListener("click", () => {
    const size = sizeSlider.checked ? 5 : 4;
    const url = `${window.location.origin}${window.location.pathname}?seed=${homeSeedDisplay.textContent}&size=${size}`;
    copyToClipboard(url, homeCopyLinkBtn);
  });
  classicEndCopyLinkBtn.addEventListener("click", () => {
    const url = `${window.location.origin}${window.location.pathname}?seed=${lastGamePlayedSeed}&size=${lastGamePlayedSize}`;
    copyToClipboard(url, classicEndCopyLinkBtn);
  });

  playAgainBtn.addEventListener("click", playNewGame);
  homeBtn.addEventListener("click", () => initializeHomeScreen(true));
  marathonHomeBtn.addEventListener("click", () => initializeHomeScreen(true));
  marathonStartHomeBtn.addEventListener("click", () => {
    clearInterval(nextBoardInterval);
    initializeHomeScreen(true);
  });

  randomizeSeedBtn.addEventListener("click", () => {
    currentSeed = generateNewSeed(8);
    homeSeedDisplay.textContent = currentSeed;
    window.history.replaceState({}, "", window.location.pathname);
    inviteMessage.style.display = "none";
  });

  aboutBtnTriggers.forEach((btn) =>
    btn.addEventListener("click", () => (aboutModal.style.display = "flex"))
  );
  statsBtnTriggers.forEach((btn) =>
    btn.addEventListener("click", () => displayStats())
  );

  [
    aboutCloseBtn,
    statsCloseBtn,
    allWordsCloseBtn,
    marathonStartCloseBtn,
  ].forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modal").style.display = "none";
      if (btn.id === "marathon-start-close-btn")
        clearInterval(nextBoardInterval);
    });
  });

  resetStatsBtn.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to reset all your classic stats? This cannot be undone."
      )
    ) {
      localStorage.removeItem("wordHuntStats");
      displayStats();
    }
  });

  function showAllWords() {
    allPossibleWordsList.innerHTML = "";
    const sortedAllWords = [...allPossibleWords].sort();
    const numColumns = window.innerWidth < 500 ? 2 : 3;
    const columns = Array.from({ length: numColumns }, () =>
      document.createElement("div")
    );
    sortedAllWords.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      if (wordsFound.has(word)) {
        span.classList.add("found");
      }
      columns[index % numColumns].appendChild(span);
    });
    columns.forEach((col) => allPossibleWordsList.appendChild(col));
    allWordsModal.style.display = "flex";
  }
  viewAllWordsBtn.addEventListener("click", showAllWords);
  marathonViewAllWordsBtn.addEventListener("click", showAllWords);

  shareTimeBtn.addEventListener("click", () => {
    const timeStr = formatTime(timeSurvived);
    const url = `${window.location.origin}${window.location.pathname}?mode=marathon`;
    const text = `I survived for ${timeStr} in today's Word Hunt Daily Marathon! Can you beat my time?\n\nPlay the same board: ${url}`;
    copyToClipboard(text, shareTimeBtn);
  });

  endEarlyBtn.addEventListener("click", () => {
    if (gameInterval) {
      playSfx("end");
      clearInterval(gameInterval);
      endGame();
    }
  });

  allMusicMuteBtns.forEach((btn) => btn.addEventListener("click", toggleMusic));
  allSfxMuteBtns.forEach((btn) => btn.addEventListener("click", toggleSfx));

  sizeSlider.addEventListener("input", updateSliderLabels);

  startBtn.addEventListener("click", startClassicGame);
  showMarathonStartBtn.addEventListener("click", showMarathonStartScreen);
  startMarathonBtn.addEventListener("click", startMarathonGame);

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("pointerdown", handlePointerDown, {
    passive: false,
  });
  document.addEventListener("pointermove", handlePointerMove, {
    passive: false,
  });
  document.addEventListener("pointerup", handlePointerUp);
  document.addEventListener("pointerleave", handlePointerUp);

  // Initial setup
  resizeCanvas();
  loadDictionary();
  initializeHomeScreen();
  updateMuteButtons();
  if (!sounds.loop.playing()) {
    sounds.loop.play();
  }
});
