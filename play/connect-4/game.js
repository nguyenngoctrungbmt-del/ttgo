(function () {
  "use strict";

  var ROWS = 6;
  var COLS = 7;
  var EMPTY = 0;
  var P1 = 1;
  var P2 = 2;

  var mode = "ai"; // ai | pvp
  var board = [];
  var current = P1;
  var gameOver = false;
  var winner = 0;
  var winCells = [];
  var scores = { p1: 0, p2: 0 };
  var busy = false;

  var el = function (id) { return document.getElementById(id); };
  var shell = el("c4-shell");
  var columnsEl = el("c4-columns");
  var turnEl = el("c4-turn");
  var score1El = el("c4-score-p1");
  var score2El = el("c4-score-p2");
  var overlay = el("c4-overlay");
  var overlayTitle = el("c4-overlay-title");
  var overlayText = el("c4-overlay-text");

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) {
      b[r] = [];
      for (var c = 0; c < COLS; c++) b[r][c] = EMPTY;
    }
    return b;
  }

  function cloneBoard(src) {
    return src.map(function (row) { return row.slice(); });
  }

  function lowestRow(b, col) {
    for (var r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === EMPTY) return r;
    }
    return -1;
  }

  function checkWin(b, player) {
    var dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1]
    ];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (b[r][c] !== player) continue;
        for (var d = 0; d < dirs.length; d++) {
          var dr = dirs[d][0];
          var dc = dirs[d][1];
          var cells = [[r, c]];
          var ok = true;
          for (var i = 1; i < 4; i++) {
            var nr = r + dr * i;
            var nc = c + dc * i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== player) {
              ok = false;
              break;
            }
            cells.push([nr, nc]);
          }
          if (ok) return cells;
        }
      }
    }
    return null;
  }

  function isFull(b) {
    for (var c = 0; c < COLS; c++) {
      if (b[0][c] === EMPTY) return false;
    }
    return true;
  }

  function validCols(b) {
    var out = [];
    for (var c = 0; c < COLS; c++) {
      if (lowestRow(b, c) !== -1) out.push(c);
    }
    return out;
  }

  function scoreWindow(counts, player) {
    var opp = player === P1 ? P2 : P1;
    var s = 0;
    if (counts[player] === 4) s += 100000;
    else if (counts[player] === 3 && counts[EMPTY] === 1) s += 120;
    else if (counts[player] === 2 && counts[EMPTY] === 2) s += 20;
    if (counts[opp] === 3 && counts[EMPTY] === 1) s -= 100;
    if (counts[opp] === 4) s -= 100000;
    return s;
  }

  function evaluate(b, player) {
    var score = 0;
    var center = Math.floor(COLS / 2);
    for (var r = 0; r < ROWS; r++) {
      if (b[r][center] === player) score += 6;
    }

    function tally(cells) {
      var counts = {};
      counts[EMPTY] = 0; counts[P1] = 0; counts[P2] = 0;
      for (var i = 0; i < cells.length; i++) counts[cells[i]]++;
      score += scoreWindow(counts, player);
    }

    var c, r, i;
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS - 3; c++) {
        tally([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]]);
      }
    }
    for (c = 0; c < COLS; c++) {
      for (r = 0; r < ROWS - 3; r++) {
        tally([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]]);
      }
    }
    for (r = 0; r < ROWS - 3; r++) {
      for (c = 0; c < COLS - 3; c++) {
        tally([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]]);
      }
    }
    for (r = 3; r < ROWS; r++) {
      for (c = 0; c < COLS - 3; c++) {
        tally([b[r][c], b[r - 1][c + 1], b[r - 2][c + 2], b[r - 3][c + 3]]);
      }
    }
    return score;
  }

  function minimax(b, depth, alpha, beta, maximizing) {
    var win1 = checkWin(b, P1);
    var win2 = checkWin(b, P2);
    if (win2) return { score: 1000000 + depth, col: -1 };
    if (win1) return { score: -1000000 - depth, col: -1 };
    var moves = orderMoves(validCols(b));
    if (depth === 0 || !moves.length) {
      return { score: evaluate(b, P2), col: moves[0] != null ? moves[0] : -1 };
    }

    var bestCol = moves[0];
    if (maximizing) {
      var maxEval = -Infinity;
      for (var i = 0; i < moves.length; i++) {
        var col = moves[i];
        var row = lowestRow(b, col);
        var next = cloneBoard(b);
        next[row][col] = P2;
        var res = minimax(next, depth - 1, alpha, beta, false);
        if (res.score > maxEval) {
          maxEval = res.score;
          bestCol = col;
        }
        alpha = Math.max(alpha, res.score);
        if (beta <= alpha) break;
      }
      return { score: maxEval, col: bestCol };
    }

    var minEval = Infinity;
    for (var j = 0; j < moves.length; j++) {
      var col2 = moves[j];
      var row2 = lowestRow(b, col2);
      var next2 = cloneBoard(b);
      next2[row2][col2] = P1;
      var res2 = minimax(next2, depth - 1, alpha, beta, true);
      if (res2.score < minEval) {
        minEval = res2.score;
        bestCol = col2;
      }
      beta = Math.min(beta, res2.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, col: bestCol };
  }

  function orderMoves(moves) {
    var center = Math.floor(COLS / 2);
    return moves.slice().sort(function (a, b) {
      return Math.abs(a - center) - Math.abs(b - center);
    });
  }

  function pickAiMove() {
    var moves = orderMoves(validCols(board));
    var i, col, row, test;
    for (i = 0; i < moves.length; i++) {
      col = moves[i];
      row = lowestRow(board, col);
      test = cloneBoard(board);
      test[row][col] = P2;
      if (checkWin(test, P2)) return col;
    }
    for (i = 0; i < moves.length; i++) {
      col = moves[i];
      row = lowestRow(board, col);
      test = cloneBoard(board);
      test[row][col] = P1;
      if (checkWin(test, P1)) return col;
    }
    // Depth 2 keeps responses snappy while still playing decently
    return minimax(board, 2, -Infinity, Infinity, true).col;
  }

  function setBusy(on) {
    busy = on;
    shell.classList.toggle("is-busy", on);
  }

  function updateHud() {
    score1El.textContent = String(scores.p1);
    score2El.textContent = String(scores.p2);
    if (gameOver) {
      if (winner === P1) turnEl.innerHTML = '<span class="c4-turn-dot p1"></span>You win';
      else if (winner === P2) turnEl.innerHTML = mode === "ai"
        ? '<span class="c4-turn-dot p2"></span>AI wins'
        : '<span class="c4-turn-dot p2"></span>P2 wins';
      else turnEl.textContent = "Draw";
      return;
    }
    if (current === P1) {
      turnEl.innerHTML = '<span class="c4-turn-dot p1"></span>Your turn';
    } else if (mode === "ai") {
      turnEl.innerHTML = '<span class="c4-turn-dot p2"></span>AI…';
    } else {
      turnEl.innerHTML = '<span class="c4-turn-dot p2"></span>P2 turn';
    }
  }

  function dropDurationMs(row) {
    return Math.round(220 + row * 55);
  }

  function renderBoard(animateCell) {
    var html = "";
    for (var c = 0; c < COLS; c++) {
      var disabled = gameOver || busy || (mode === "ai" && current === P2) || lowestRow(board, c) === -1;
      html += '<button type="button" class="c4-col" data-col="' + c + '" aria-label="Drop in column ' + (c + 1) + '"' + (disabled ? " disabled" : "") + ">";
      for (var r = 0; r < ROWS; r++) {
        var v = board[r][c];
        var win = false;
        for (var w = 0; w < winCells.length; w++) {
          if (winCells[w][0] === r && winCells[w][1] === c) win = true;
        }
        var isDrop = animateCell && animateCell.r === r && animateCell.c === c;
        var cellClass = "c4-cell" + (isDrop ? " is-landing" : "");
        var discClass = "c4-disc";
        var style = "";
        if (v === P1 || v === P2) {
          discClass += v === P1 ? " p1" : " p2";
          if (isDrop) {
            // Fall from above the board: ~1 cell per row above + top padding
            var fromPct = -((r + 1) * 118 + 30);
            var dur = (dropDurationMs(r) / 1000).toFixed(2) + "s";
            discClass += " is-dropping";
            style = ' style="--c4-from:' + fromPct + '%;--c4-dur:' + dur + '"';
          } else {
            discClass += " is-settled";
          }
          if (win) discClass += " is-win";
        }
        html += '<div class="' + cellClass + '" data-r="' + r + '" data-c="' + c + '"><div class="' + discClass + '"' + style + "></div></div>";
      }
      html += "</button>";
    }
    columnsEl.innerHTML = html;
  }

  function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function endGame(resultWinner, cells) {
    gameOver = true;
    winner = resultWinner;
    winCells = cells || [];
    if (winner === P1) scores.p1 += 1;
    if (winner === P2) scores.p2 += 1;
    setBusy(false);
    updateHud();
    renderBoard(null);
    if (winner === P1) showOverlay("You win!", "Four in a row—nice drop.");
    else if (winner === P2) showOverlay(mode === "ai" ? "AI wins" : "Player 2 wins", "Start a new round to try again.");
    else showOverlay("Draw", "The board is full. Rematch?");
  }

  function scheduleAi() {
    if (gameOver || mode !== "ai" || current !== P2) return;
    setBusy(true);
    updateHud();
    renderBoard(null);
    window.setTimeout(function () {
      var aiCol = pickAiMove();
      if (aiCol < 0) {
        setBusy(false);
        renderBoard(null);
        return;
      }
      // drop() guards on busy — clear lock first, then place for AI
      busy = false;
      drop(aiCol);
    }, 90);
  }

  function afterDrop(row, col) {
    var cells = checkWin(board, current);
    if (cells) {
      endGame(current, cells);
      return;
    }
    if (isFull(board)) {
      endGame(0, []);
      return;
    }
    current = current === P1 ? P2 : P1;
    setBusy(false);
    updateHud();
    renderBoard(null);
    scheduleAi();
  }

  function drop(col) {
    if (gameOver || busy) return false;
    var row = lowestRow(board, col);
    if (row < 0) return false;
    setBusy(true);
    board[row][col] = current;
    renderBoard({ r: row, c: col });
    window.setTimeout(function () {
      afterDrop(row, col);
    }, dropDurationMs(row) + 40);
    return true;
  }

  function newGame(keepScores) {
    board = emptyBoard();
    current = P1;
    gameOver = false;
    winner = 0;
    winCells = [];
    if (!keepScores) {
      // keep session scores by default
    }
    hideOverlay();
    setBusy(false);
    updateHud();
    renderBoard(null);
  }

  function resetScores() {
    scores.p1 = 0;
    scores.p2 = 0;
    newGame(true);
  }

  columnsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".c4-col");
    if (!btn || btn.disabled) return;
    var col = parseInt(btn.getAttribute("data-col"), 10);
    if (mode === "ai" && current !== P1) return;
    drop(col);
  });

  document.querySelectorAll(".c4-mode-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-mode");
      if (!next || next === mode) return;
      mode = next;
      document.querySelectorAll(".c4-mode-btn").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      el("c4-score-p2-label").textContent = mode === "ai" ? "AI" : "Player 2";
      resetScores();
    });
  });

  el("c4-restart").addEventListener("click", function () { newGame(true); });
  el("c4-overlay-restart").addEventListener("click", function () { newGame(true); });
  el("c4-reset-scores").addEventListener("click", resetScores);

  document.addEventListener("keydown", function (e) {
    if (gameOver || busy) return;
    if (mode === "ai" && current !== P1) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 7) drop(n - 1);
  });

  newGame(true);
})();
