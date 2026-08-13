(function () {
  "use strict";

  var SIZE = 4;
  var BEST_KEY = "ttgo-2048-best";
  var grid = [];
  var score = 0;
  var best = 0;
  var won = false;
  var keepPlaying = false;
  var touchStartX = 0;
  var touchStartY = 0;

  var el = function (id) { return document.getElementById(id); };
  var tilesEl = el("g2048-tiles");
  var scoreEl = el("g2048-score");
  var bestEl = el("g2048-best");
  var overlay = el("g2048-overlay");
  var overlayTitle = el("g2048-overlay-title");
  var overlayText = el("g2048-overlay-text");

  function loadBest() {
    try {
      best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
    } catch (e) {
      best = 0;
    }
    bestEl.textContent = String(best);
  }

  function saveBest() {
    if (score <= best) return;
    best = score;
    bestEl.textContent = String(best);
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
  }

  function updateScore() {
    scoreEl.textContent = String(score);
    saveBest();
  }

  function emptyGrid() {
    var g = [];
    var r, c;
    for (r = 0; r < SIZE; r++) {
      g[r] = [];
      for (c = 0; c < SIZE; c++) g[r][c] = 0;
    }
    return g;
  }

  function cloneGrid(src) {
    return src.map(function (row) { return row.slice(); });
  }

  function emptyCells() {
    var cells = [];
    var r, c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) cells.push([r, c]);
      }
    }
    return cells;
  }

  function spawnTile() {
    var cells = emptyCells();
    if (!cells.length) return null;
    var pick = cells[Math.floor(Math.random() * cells.length)];
    grid[pick[0]][pick[1]] = Math.random() < 0.9 ? 2 : 4;
    return pick;
  }

  function tileClass(v) {
    if (v <= 8192) return "v" + v;
    return "v8192";
  }

  function renderTiles(spawned, merged) {
    spawned = spawned || [];
    merged = merged || [];
    var html = "";
    var r, c, v, cls, isSpawn, isMerge;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        v = grid[r][c];
        if (!v) continue;
        isSpawn = spawned.some(function (p) { return p[0] === r && p[1] === c; });
        isMerge = merged.some(function (p) { return p[0] === r && p[1] === c; });
        cls = "g2048-tile " + tileClass(v);
        if (isSpawn) cls += " is-new";
        if (isMerge) cls += " is-merged";
        html += '<div class="' + cls + '" style="grid-row:' + (r + 1) + ";grid-column:" + (c + 1) + '">' + v + "</div>";
      }
    }
    tilesEl.innerHTML = html;
    updateScore();
  }

  function slideLine(line) {
    var filtered = line.filter(function (n) { return n !== 0; });
    var mergedCells = [];
    var out = [];
    var i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        var val = filtered[i] * 2;
        out.push(val);
        score += val;
        mergedCells.push(out.length - 1);
        i += 2;
      } else {
        out.push(filtered[i]);
        i += 1;
      }
    }
    while (out.length < SIZE) out.push(0);
    return { line: out, mergedAt: mergedCells };
  }

  function linesEqual(a, b) {
    var i;
    for (i = 0; i < SIZE; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function moveLeft() {
    var moved = false;
    var spawned = [];
    var merged = [];
    var r, res, before, after, c, idx;
    for (r = 0; r < SIZE; r++) {
      before = grid[r].slice();
      res = slideLine(grid[r]);
      grid[r] = res.line;
      if (!linesEqual(before, grid[r])) moved = true;
      for (idx = 0; idx < res.mergedAt.length; idx++) {
        merged.push([r, res.mergedAt[idx]]);
      }
    }
    return moved;
  }

  function reverseLine(line) {
    return line.slice().reverse();
  }

  function moveRight() {
    var r, before, res, moved = false, merged = [], idx;
    for (r = 0; r < SIZE; r++) {
      before = grid[r].slice();
      res = slideLine(reverseLine(grid[r]));
      grid[r] = reverseLine(res.line);
      if (!linesEqual(before, grid[r])) moved = true;
      for (idx = 0; idx < res.mergedAt.length; idx++) {
        merged.push([r, SIZE - 1 - res.mergedAt[idx]]);
      }
    }
    return moved;
  }

  function getColumn(c) {
    var col = [];
    var r;
    for (r = 0; r < SIZE; r++) col.push(grid[r][c]);
    return col;
  }

  function setColumn(c, col) {
    var r;
    for (r = 0; r < SIZE; r++) grid[r][c] = col[r];
  }

  function moveUp() {
    var moved = false;
    var merged = [];
    var c, before, res, idx;
    for (c = 0; c < SIZE; c++) {
      before = getColumn(c);
      res = slideLine(before);
      setColumn(c, res.line);
      if (!linesEqual(before, res.line)) moved = true;
      for (idx = 0; idx < res.mergedAt.length; idx++) {
        merged.push([res.mergedAt[idx], c]);
      }
    }
    return moved;
  }

  function moveDown() {
    var moved = false;
    var merged = [];
    var c, before, res, idx;
    for (c = 0; c < SIZE; c++) {
      before = getColumn(c);
      res = slideLine(reverseLine(before));
      setColumn(c, reverseLine(res.line));
      if (!linesEqual(before, getColumn(c))) moved = true;
      for (idx = 0; idx < res.mergedAt.length; idx++) {
        merged.push([SIZE - 1 - res.mergedAt[idx], c]);
      }
    }
    return moved;
  }

  function has2048() {
    var r, c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (grid[r][c] === 2048) return true;
      }
    }
    return false;
  }

  function canMove() {
    if (emptyCells().length) return true;
    var r, c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
        if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function handleMove(fn) {
    var moved = fn();
    if (!moved) return;
    var spawned = spawnTile();
    renderTiles(spawned ? [spawned] : [], []);
    if (!won && has2048()) {
      won = true;
      if (!keepPlaying) {
        showOverlay("You made 2048!", "Keep playing for a higher tile, or start a new game.");
      }
    }
    if (!canMove()) {
      showOverlay("Game over", "No moves left. Score: " + score + ".");
    }
  }

  function newGame() {
    grid = emptyGrid();
    score = 0;
    won = false;
    keepPlaying = false;
    hideOverlay();
    spawnTile();
    spawnTile();
    renderTiles([], []);
  }

  function continueGame() {
    keepPlaying = true;
    hideOverlay();
  }

  document.addEventListener("keydown", function (e) {
    var key = e.key;
    if (key === "ArrowLeft") { e.preventDefault(); handleMove(moveLeft); }
    else if (key === "ArrowRight") { e.preventDefault(); handleMove(moveRight); }
    else if (key === "ArrowUp") { e.preventDefault(); handleMove(moveUp); }
    else if (key === "ArrowDown") { e.preventDefault(); handleMove(moveDown); }
  });

  var boardWrap = el("g2048-board-wrap");
  boardWrap.addEventListener("touchstart", function (e) {
    if (!e.changedTouches.length) return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  boardWrap.addEventListener("touchend", function (e) {
    if (!e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? moveRight : moveLeft);
    } else {
      handleMove(dy > 0 ? moveDown : moveUp);
    }
  }, { passive: true });

  el("g2048-new").addEventListener("click", newGame);
  el("g2048-overlay-restart").addEventListener("click", newGame);
  el("g2048-overlay-continue").addEventListener("click", continueGame);
  el("g2048-reset-best").addEventListener("click", function () {
    best = 0;
    bestEl.textContent = "0";
    try { localStorage.removeItem(BEST_KEY); } catch (e) {}
  });

  loadBest();
  newGame();
})();
