(function () {
  "use strict";

  var DIFFICULTIES = {
    easy: { rows: 9, cols: 9, mines: 10, label: "Easy" },
    medium: { rows: 16, cols: 16, mines: 40, label: "Medium" },
    hard: { rows: 16, cols: 30, mines: 99, label: "Hard" }
  };

  var DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  var difficulty = "easy";
  var rows = 9;
  var cols = 9;
  var mineCount = 10;
  var cells = [];
  var gameOver = false;
  var won = false;
  var firstClick = true;
  var flagsLeft = 10;
  var revealedCount = 0;
  var timerSec = 0;
  var timerId = null;
  var longPressTimer = null;
  var suppressClick = false;

  var el = function (id) { return document.getElementById(id); };
  var shell = el("ms-shell");
  var boardEl = el("ms-board");
  var minesEl = el("ms-mines");
  var timerEl = el("ms-timer");
  var statusEl = el("ms-status");
  var overlay = el("ms-overlay");
  var overlayTitle = el("ms-overlay-title");
  var overlayText = el("ms-overlay-text");

  function cellSize() {
    if (cols > 20) return 24;
    if (cols > 12) return 28;
    return 32;
  }

  function emptyCells() {
    var grid = [];
    var r, c;
    for (r = 0; r < rows; r++) {
      grid[r] = [];
      for (c = 0; c < cols; c++) {
        grid[r][c] = { mine: false, adjacent: 0, state: "hidden" };
      }
    }
    return grid;
  }

  function inBounds(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
  }

  function neighbors(r, c) {
    var list = [];
    var d, nr, nc;
    for (d = 0; d < DIRS.length; d++) {
      nr = r + DIRS[d][0];
      nc = c + DIRS[d][1];
      if (inBounds(nr, nc)) list.push([nr, nc]);
    }
    return list;
  }

  function computeAdjacent() {
    var r, c, n, i, nr, nc, count;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (cells[r][c].mine) {
          cells[r][c].adjacent = -1;
          continue;
        }
        count = 0;
        n = neighbors(r, c);
        for (i = 0; i < n.length; i++) {
          if (cells[n[i][0]][n[i][1]].mine) count += 1;
        }
        cells[r][c].adjacent = count;
      }
    }
  }

  function placeMines(safeR, safeC) {
    var safe = {};
    var n = neighbors(safeR, safeC);
    var i, key, placed = 0, r, c, idx, flat;
    safe[safeR + "," + safeC] = true;
    for (i = 0; i < n.length; i++) {
      safe[n[i][0] + "," + n[i][1]] = true;
    }
    flat = [];
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (!safe[r + "," + c]) flat.push([r, c]);
      }
    }
    for (i = flat.length - 1; i > 0; i--) {
      idx = Math.floor(Math.random() * (i + 1));
      r = flat[i][0]; c = flat[i][1];
      flat[i] = flat[idx];
      flat[idx] = [r, c];
    }
    for (i = 0; i < mineCount && i < flat.length; i++) {
      cells[flat[i][0]][flat[i][1]].mine = true;
      placed += 1;
    }
    mineCount = placed;
    flagsLeft = mineCount;
    computeAdjacent();
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerSec = 0;
    timerEl.textContent = "0";
    timerId = setInterval(function () {
      timerSec += 1;
      timerEl.textContent = String(timerSec);
    }, 1000);
  }

  function updateHud() {
    minesEl.textContent = String(Math.max(0, flagsLeft));
    if (won) statusEl.textContent = "Cleared!";
    else if (gameOver) statusEl.textContent = "Boom!";
    else if (firstClick) statusEl.textContent = "Ready";
    else statusEl.textContent = "Playing";
  }

  function cellLabel(cell) {
    if (cell.state === "flagged") return '<span class="ms-flag" aria-hidden="true">🚩</span>';
    if (cell.state === "hidden") return "";
    if (cell.mine) return '<span class="ms-bomb" aria-hidden="true">💣</span>';
    if (cell.adjacent === 0) return "";
    return String(cell.adjacent);
  }

  function cellClasses(r, c, cell, exploded) {
    var cls = ["ms-cell"];
    if (cell.state === "hidden") cls.push("is-hidden");
    if (cell.state === "revealed") cls.push("is-revealed");
    if (cell.state === "flagged") cls.push("is-flagged");
    if (cell.mine && (cell.state === "revealed" || exploded)) cls.push("is-mine");
    if (exploded) cls.push("is-exploded");
    if (gameOver && cell.state === "flagged" && !cell.mine) cls.push("is-wrong-flag");
    if (cell.state === "revealed" && !cell.mine && cell.adjacent > 0) cls.push("n" + cell.adjacent);
    return cls.join(" ");
  }

  function renderBoard(explodedR, explodedC) {
    var size = cellSize();
    boardEl.style.setProperty("--ms-size", size + "px");
    boardEl.style.gridTemplateColumns = "repeat(" + cols + ", " + size + "px)";
    var html = "";
    var r, c, cell;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        cell = cells[r][c];
        html += '<button type="button" class="' + cellClasses(r, c, cell, r === explodedR && c === explodedC) + '"' +
          ' data-r="' + r + '" data-c="' + c + '"' +
          ' aria-label="Cell ' + (r + 1) + ',' + (c + 1) + '"' +
          (cell.state === "revealed" ? " disabled" : "") + ">" +
          cellLabel(cell) + "</button>";
      }
    }
    boardEl.innerHTML = html;
  }

  function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function revealAllMines(explodedR, explodedC) {
    var r, c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        if (cells[r][c].mine) cells[r][c].state = "revealed";
        else if (cells[r][c].state === "flagged") cells[r][c].state = "revealed";
      }
    }
    renderBoard(explodedR, explodedC);
  }

  function checkWin() {
    if (revealedCount === rows * cols - mineCount) {
      won = true;
      gameOver = true;
      stopTimer();
      var r, c;
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
          if (cells[r][c].mine) cells[r][c].state = "flagged";
        }
      }
      flagsLeft = 0;
      updateHud();
      renderBoard(-1, -1);
      showOverlay("You win!", "All safe squares cleared in " + timerSec + "s.");
    }
  }

  function floodReveal(startR, startC) {
    var queue = [[startR, startC]];
    var seen = {};
    var r, c, cell, n, i, nr, nc, key;
    while (queue.length) {
      var pos = queue.shift();
      r = pos[0];
      c = pos[1];
      key = r + "," + c;
      if (seen[key]) continue;
      seen[key] = true;
      cell = cells[r][c];
      if (cell.state !== "hidden" || cell.mine) continue;
      cell.state = "revealed";
      revealedCount += 1;
      if (cell.adjacent === 0) {
        n = neighbors(r, c);
        for (i = 0; i < n.length; i++) {
          nr = n[i][0];
          nc = n[i][1];
          if (cells[nr][nc].state === "hidden" && !cells[nr][nc].mine) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  function chordReveal(r, c) {
    var cell = cells[r][c];
    if (cell.state !== "revealed" || cell.adjacent <= 0 || gameOver) return;
    var n = neighbors(r, c);
    var flags = 0;
    var i, nr, nc, ncell;
    for (i = 0; i < n.length; i++) {
      ncell = cells[n[i][0]][n[i][1]];
      if (ncell.state === "flagged") flags += 1;
    }
    if (flags !== cell.adjacent) return;
    for (i = 0; i < n.length; i++) {
      nr = n[i][0];
      nc = n[i][1];
      ncell = cells[nr][nc];
      if (ncell.state === "hidden") reveal(nr, nc);
    }
  }

  function lose(r, c) {
    gameOver = true;
    stopTimer();
    updateHud();
    revealAllMines(r, c);
    showOverlay("Game over", "You hit a mine. Try again!");
  }

  function reveal(r, c) {
    if (gameOver) return;
    var cell = cells[r][c];
    if (cell.state !== "hidden") return;

    if (firstClick) {
      placeMines(r, c);
      firstClick = false;
      startTimer();
    }

    if (cell.mine) {
      cell.state = "revealed";
      lose(r, c);
      return;
    }

    if (cell.adjacent === 0) floodReveal(r, c);
    else {
      cell.state = "revealed";
      revealedCount += 1;
    }

    updateHud();
    renderBoard(-1, -1);
    checkWin();
  }

  function toggleFlag(r, c) {
    if (gameOver || firstClick) return;
    var cell = cells[r][c];
    if (cell.state === "revealed") return;
    if (cell.state === "flagged") {
      cell.state = "hidden";
      flagsLeft += 1;
    } else if (flagsLeft > 0) {
      cell.state = "flagged";
      flagsLeft -= 1;
    }
    updateHud();
    renderBoard(-1, -1);
  }

  function newGame() {
    var diff = DIFFICULTIES[difficulty];
    rows = diff.rows;
    cols = diff.cols;
    mineCount = diff.mines;
    cells = emptyCells();
    gameOver = false;
    won = false;
    firstClick = true;
    flagsLeft = mineCount;
    revealedCount = 0;
    stopTimer();
    timerSec = 0;
    timerEl.textContent = "0";
    hideOverlay();
    updateHud();
    renderBoard(-1, -1);
  }

  boardEl.addEventListener("click", function (e) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    var btn = e.target.closest(".ms-cell");
    if (!btn || btn.disabled) return;
    var r = parseInt(btn.getAttribute("data-r"), 10);
    var c = parseInt(btn.getAttribute("data-c"), 10);
    var cell = cells[r][c];
    if (cell.state === "revealed" && cell.adjacent > 0) {
      chordReveal(r, c);
      return;
    }
    reveal(r, c);
  });

  boardEl.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    var btn = e.target.closest(".ms-cell");
    if (!btn) return;
    toggleFlag(parseInt(btn.getAttribute("data-r"), 10), parseInt(btn.getAttribute("data-c"), 10));
  });

  boardEl.addEventListener("touchstart", function (e) {
    var btn = e.target.closest(".ms-cell");
    if (!btn || btn.disabled) return;
    var r = parseInt(btn.getAttribute("data-r"), 10);
    var c = parseInt(btn.getAttribute("data-c"), 10);
    longPressTimer = setTimeout(function () {
      suppressClick = true;
      toggleFlag(r, c);
    }, 420);
  }, { passive: true });

  boardEl.addEventListener("touchend", function () {
    if (longPressTimer) clearTimeout(longPressTimer);
  });
  boardEl.addEventListener("touchmove", function () {
    if (longPressTimer) clearTimeout(longPressTimer);
  });

  document.querySelectorAll(".ms-mode-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-diff");
      if (!next || next === difficulty) return;
      difficulty = next;
      document.querySelectorAll(".ms-mode-btn").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      newGame();
    });
  });

  el("ms-restart").addEventListener("click", newGame);
  el("ms-overlay-restart").addEventListener("click", newGame);

  newGame();
})();
