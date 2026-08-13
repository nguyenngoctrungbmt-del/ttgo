(function () {
  "use strict";

  var SIZE = 8;
  var EMPTY = 0;
  var BLACK = 1;
  var WHITE = 2;

  var DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  var CORNERS = [[0, 0], [0, 7], [7, 0], [7, 7]];

  var mode = "ai";
  var board = [];
  var current = BLACK;
  var gameOver = false;
  var validMap = {};
  var busy = false;
  var cellEls = [];
  var boardBuilt = false;

  var el = function (id) { return document.getElementById(id); };
  var shell = el("rev-shell");
  var boardEl = el("rev-board");
  var turnEl = el("rev-turn");
  var blackCountEl = el("rev-black-count");
  var whiteCountEl = el("rev-white-count");
  var overlay = el("rev-overlay");
  var overlayTitle = el("rev-overlay-title");
  var overlayText = el("rev-overlay-text");

  function emptyBoard() {
    var b = [];
    var r, c;
    for (r = 0; r < SIZE; r++) {
      b[r] = [];
      for (c = 0; c < SIZE; c++) b[r][c] = EMPTY;
    }
    b[3][3] = WHITE;
    b[3][4] = BLACK;
    b[4][3] = BLACK;
    b[4][4] = WHITE;
    return b;
  }

  function cloneBoard(src) {
    return src.map(function (row) { return row.slice(); });
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function opponent(player) {
    return player === BLACK ? WHITE : BLACK;
  }

  function getFlips(b, r, c, player) {
    if (!inBounds(r, c) || b[r][c] !== EMPTY) return null;
    var opp = opponent(player);
    var all = [];
    var d, dr, dc, nr, nc, line;

    for (d = 0; d < DIRS.length; d++) {
      dr = DIRS[d][0];
      dc = DIRS[d][1];
      line = [];
      nr = r + dr;
      nc = c + dc;
      while (inBounds(nr, nc) && b[nr][nc] === opp) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length && inBounds(nr, nc) && b[nr][nc] === player) {
        all = all.concat(line);
      }
    }
    return all.length ? all : null;
  }

  function computeValidMap(b, player) {
    var map = {};
    var r, c, flips;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        flips = getFlips(b, r, c, player);
        if (flips) map[r + "," + c] = flips;
      }
    }
    return map;
  }

  function countDiscs(b) {
    var counts = { black: 0, white: 0 };
    var r, c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (b[r][c] === BLACK) counts.black += 1;
        else if (b[r][c] === WHITE) counts.white += 1;
      }
    }
    return counts;
  }

  function applyMove(b, r, c, player, flips) {
    var next = cloneBoard(b);
    next[r][c] = player;
    var i;
    for (i = 0; i < flips.length; i++) {
      next[flips[i][0]][flips[i][1]] = player;
    }
    return next;
  }

  function evaluate(b, player) {
    var counts = countDiscs(b);
    var my = player === BLACK ? counts.black : counts.white;
    var opp = player === BLACK ? counts.white : counts.black;
    var score = 0;
    var r, c, i, vm, vmOpp;

    for (i = 0; i < CORNERS.length; i++) {
      r = CORNERS[i][0];
      c = CORNERS[i][1];
      if (b[r][c] === player) score += 120;
      else if (b[r][c] === opponent(player)) score -= 100;
    }

    vm = computeValidMap(b, player);
    vmOpp = computeValidMap(b, opponent(player));
    score += Object.keys(vm).length * 8;
    score -= Object.keys(vmOpp).length * 6;
    score += (my - opp) * 2;
    return score;
  }

  function minimax(b, depth, alpha, beta, player, maximizingPlayer) {
    var vm = computeValidMap(b, player);
    var keys = Object.keys(vm);
    var opp = opponent(player);
    var vmOpp = computeValidMap(b, opp);
    var oppKeys = Object.keys(vmOpp);

    if (!keys.length && !oppKeys.length) {
      var counts = countDiscs(b);
      var diff = counts.black - counts.white;
      var terminal = maximizingPlayer === BLACK ? diff : -diff;
      return { score: terminal * 1000, move: null };
    }

    if (!keys.length) {
      return minimax(b, depth, alpha, beta, opp, maximizingPlayer);
    }

    if (depth === 0) {
      return { score: evaluate(b, maximizingPlayer), move: keys[0] || null };
    }

    var bestMove = null;
    var bestScore = player === maximizingPlayer ? -Infinity : Infinity;
    var i, key, parts, r, c, next, res;

    keys.sort(function (a, b) {
      return movePriority(b.split(",").map(Number), maximizingPlayer)
        - movePriority(a.split(",").map(Number), maximizingPlayer);
    });

    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      parts = key.split(",");
      r = parseInt(parts[0], 10);
      c = parseInt(parts[1], 10);
      next = applyMove(b, r, c, player, vm[key]);
      res = minimax(next, depth - 1, alpha, beta, opp, maximizingPlayer);

      if (player === maximizingPlayer) {
        if (res.score > bestScore) {
          bestScore = res.score;
          bestMove = key;
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (res.score < bestScore) {
          bestScore = res.score;
          bestMove = key;
        }
        beta = Math.min(beta, bestScore);
      }
      if (beta <= alpha) break;
    }

    return { score: bestScore, move: bestMove };
  }

  function movePriority(rc) {
    var r = rc[0];
    var c = rc[1];
    var score = 0;
    if ((r === 0 || r === 7) && (c === 0 || c === 7)) score += 100;
    else if (r === 0 || r === 7 || c === 0 || c === 7) score += 12;
    if ((r === 1 && (c === 1 || c === 6)) || (r === 6 && (c === 1 || c === 6))) score -= 40;
    return score;
  }

  function pickAiMove() {
    var keys = Object.keys(validMap);
    if (!keys.length) return null;
    var parts, r, c, i, key;
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      parts = key.split(",");
      r = parseInt(parts[0], 10);
      c = parseInt(parts[1], 10);
      if (movePriority([r, c]) >= 100) return { r: r, c: c };
    }
    var result = minimax(board, 3, -Infinity, Infinity, WHITE, WHITE);
    if (!result.move) {
      parts = keys[0].split(",");
      return { r: parseInt(parts[0], 10), c: parseInt(parts[1], 10) };
    }
    parts = result.move.split(",");
    return { r: parseInt(parts[0], 10), c: parseInt(parts[1], 10) };
  }

  function setBusy(on) {
    busy = on;
    shell.classList.toggle("is-busy", on);
  }

  function refreshValid() {
    validMap = computeValidMap(board, current);
  }

  function updateHud() {
    var counts = countDiscs(board);
    blackCountEl.textContent = String(counts.black);
    whiteCountEl.textContent = String(counts.white);

    if (gameOver) {
      if (counts.black > counts.white) {
        turnEl.innerHTML = '<span class="rev-turn-dot black"></span>Black wins';
      } else if (counts.white > counts.black) {
        turnEl.innerHTML = mode === "ai"
          ? '<span class="rev-turn-dot white"></span>AI wins'
          : '<span class="rev-turn-dot white"></span>White wins';
      } else {
        turnEl.textContent = "Draw";
      }
      return;
    }

    if (current === BLACK) {
      turnEl.innerHTML = '<span class="rev-turn-dot black"></span>Black turn';
    } else if (mode === "ai") {
      turnEl.innerHTML = '<span class="rev-turn-dot white"></span>AI…';
    } else {
      turnEl.innerHTML = '<span class="rev-turn-dot white"></span>White turn';
    }
  }

  function discColor(el) {
    if (!el) return EMPTY;
    if (el.classList.contains("black")) return BLACK;
    if (el.classList.contains("white")) return WHITE;
    return EMPTY;
  }

  function setDisc(btn, color, anim) {
    var disc = btn.querySelector(".rev-disc");
    var prev = discColor(disc);

    if (color === EMPTY) {
      if (disc) disc.remove();
      return;
    }

    if (!disc) {
      disc = document.createElement("span");
      btn.appendChild(disc);
      anim = anim || "new";
    } else if (prev !== color) {
      anim = anim || "flip";
    }

    disc.className = "rev-disc " + (color === BLACK ? "black" : "white");
    disc.classList.remove("is-new", "is-flip");
    if (anim === "new") disc.classList.add("is-new");
    else if (anim === "flip") {
      disc.classList.add("is-flip");
      disc.addEventListener("animationend", function onEnd() {
        disc.classList.remove("is-flip");
        disc.removeEventListener("animationend", onEnd);
      });
    }
  }

  function syncCellMeta(r, c) {
    var btn = cellEls[r][c];
    var key = r + "," + c;
    var valid = !!validMap[key];
    var disabled = gameOver || busy || !valid || (mode === "ai" && current === WHITE);
    btn.disabled = disabled;
    btn.classList.toggle("is-valid", valid && board[r][c] === EMPTY);
  }

  function syncBoardMeta() {
    var r, c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) syncCellMeta(r, c);
    }
  }

  function syncDisc(r, c, anim) {
    setDisc(cellEls[r][c], board[r][c], anim);
    syncCellMeta(r, c);
  }

  function buildBoardOnce() {
    if (boardBuilt) return;
    boardEl.innerHTML = "";
    cellEls = [];
    var r, c, btn;
    for (r = 0; r < SIZE; r++) {
      cellEls[r] = [];
      for (c = 0; c < SIZE; c++) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "rev-cell";
        btn.setAttribute("data-r", String(r));
        btn.setAttribute("data-c", String(c));
        btn.setAttribute("aria-label", "Row " + (r + 1) + " column " + (c + 1));
        boardEl.appendChild(btn);
        cellEls[r][c] = btn;
      }
    }
    boardBuilt = true;
  }

  function renderBoard(changed) {
    buildBoardOnce();
    var r, c, key, parts;
    if (!changed) {
      for (r = 0; r < SIZE; r++) {
        for (c = 0; c < SIZE; c++) {
          setDisc(cellEls[r][c], board[r][c], null);
          syncCellMeta(r, c);
        }
      }
      return;
    }
    for (key in changed) {
      if (!changed.hasOwnProperty(key)) continue;
      parts = key.split(",");
      syncDisc(parseInt(parts[0], 10), parseInt(parts[1], 10), changed[key]);
    }
    syncBoardMeta();
  }

  function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function finishGame() {
    gameOver = true;
    var counts = countDiscs(board);
    if (counts.black > counts.white) {
      showOverlay("Black wins!", counts.black + " – " + counts.white + " discs.");
    } else if (counts.white > counts.black) {
      showOverlay(
        mode === "ai" ? "AI wins" : "White wins",
        counts.white + " – " + counts.black + " discs."
      );
    } else {
      showOverlay("Draw", counts.black + " – " + counts.white + " discs.");
    }
    setBusy(false);
    updateHud();
    syncBoardMeta();
  }

  function maybePass() {
    refreshValid();
    if (Object.keys(validMap).length) return false;
    var oppMoves = computeValidMap(board, opponent(current));
    if (!Object.keys(oppMoves).length) {
      finishGame();
      return true;
    }
    current = opponent(current);
    updateHud();
    syncBoardMeta();
    scheduleAi();
    return true;
  }

  function playMove(r, c) {
    var flips = validMap[r + "," + c];
    if (!flips || gameOver || busy) return;

    setBusy(true);
    var player = current;
    board = applyMove(board, r, c, player, flips);
    current = opponent(current);
    refreshValid();
    updateHud();

    var changed = {};
    changed[r + "," + c] = "new";
    var i;
    for (i = 0; i < flips.length; i++) {
      changed[flips[i][0] + "," + flips[i][1]] = "flip";
    }
    renderBoard(changed);

    window.setTimeout(function () {
      if (maybePass()) return;
      setBusy(false);
      updateHud();
      syncBoardMeta();
      scheduleAi();
    }, 120);
  }

  function scheduleAi() {
    if (gameOver || mode !== "ai" || current !== WHITE) return;
    if (!Object.keys(validMap).length) {
      maybePass();
      return;
    }
    setBusy(true);
    updateHud();
    syncBoardMeta();
    window.setTimeout(function () {
      var move = pickAiMove();
      if (!move) {
        maybePass();
        return;
      }
      busy = false;
      playMove(move.r, move.c);
    }, 220);
  }

  function newGame() {
    board = emptyBoard();
    current = BLACK;
    gameOver = false;
    hideOverlay();
    setBusy(false);
    refreshValid();
    updateHud();
    renderBoard();
    scheduleAi();
  }

  function resetScores() {
    newGame();
  }

  boardEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".rev-cell");
    if (!btn || btn.disabled) return;
    if (mode === "ai" && current !== BLACK) return;
    playMove(parseInt(btn.getAttribute("data-r"), 10), parseInt(btn.getAttribute("data-c"), 10));
  });

  document.querySelectorAll(".rev-mode-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-mode");
      if (!next || next === mode) return;
      mode = next;
      document.querySelectorAll(".rev-mode-btn").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      el("rev-white-label").textContent = mode === "ai" ? "AI" : "White";
      resetScores();
    });
  });

  el("rev-restart").addEventListener("click", newGame);
  el("rev-overlay-restart").addEventListener("click", newGame);
  el("rev-reset-scores").addEventListener("click", resetScores);

  newGame();
})();
