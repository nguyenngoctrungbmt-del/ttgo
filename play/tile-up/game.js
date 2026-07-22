(function () {
  "use strict";

  var SIZE = 4;
  var EPOCH = Date.UTC(2026, 0, 1); // Daily Puzzle #1 = 2026-01-01 UTC
  var DIRS = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function utcDateKey(d) {
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }

  function dailyNumber(d) {
    var day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return Math.floor((day - EPOCH) / 86400000) + 1;
  }

  function hashString(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tileClass(v) {
    var known = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
    if (known.indexOf(v) !== -1) return "tu-v" + v;
    return "tu-v4096";
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.slice();
    });
  }

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      b[r] = [];
      for (var c = 0; c < SIZE; c++) b[r][c] = 0;
    }
    return b;
  }

  function countEmpty(board) {
    var n = 0;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) if (!board[r][c]) n++;
    }
    return n;
  }

  function nextTileValue(rng) {
    var roll = rng();
    if (roll < 0.72) return 2;
    if (roll < 0.94) return 4;
    return 8;
  }

  function makeQueue(rng, count) {
    var q = [];
    for (var i = 0; i < count; i++) q.push(nextTileValue(rng));
    return q;
  }

  /** Merge all connected groups of size >= 2 into a single doubled tile. Returns score gained. */
  function resolveMerges(board) {
    var gained = 0;
    var changed = true;
    var guard = 0;

    while (changed && guard++ < 40) {
      changed = false;
      var visited = {};

      for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) {
          var val = board[r][c];
          if (!val) continue;
          var key = r + "," + c;
          if (visited[key]) continue;

          var stack = [[r, c]];
          var cells = [];
          visited[key] = true;

          while (stack.length) {
            var cur = stack.pop();
            cells.push(cur);
            for (var d = 0; d < DIRS.length; d++) {
              var nr = cur[0] + DIRS[d][0];
              var nc = cur[1] + DIRS[d][1];
              if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) continue;
              var nk = nr + "," + nc;
              if (visited[nk]) continue;
              if (board[nr][nc] !== val) continue;
              visited[nk] = true;
              stack.push([nr, nc]);
            }
          }

          if (cells.length < 2) continue;

          // Keep the "center-most" cell; clear the rest; write doubled value.
          cells.sort(function (a, b) {
            var da = Math.abs(a[0] - 1.5) + Math.abs(a[1] - 1.5);
            var db = Math.abs(b[0] - 1.5) + Math.abs(b[1] - 1.5);
            return da - db;
          });
          var keep = cells[0];
          var merges = cells.length - 1;
          // Each extra connected tile doubles once (2+2→4, 2+2+2→8).
          var result = val;
          for (var m = 0; m < merges; m++) result *= 2;

          for (var i = 0; i < cells.length; i++) {
            board[cells[i][0]][cells[i][1]] = 0;
          }
          board[keep[0]][keep[1]] = result;
          gained += result * merges;
          changed = true;
        }
      }
    }

    return gained;
  }

  function el(id) {
    return document.getElementById(id);
  }

  var state = {
    dateKey: "",
    puzzleNo: 0,
    board: emptyBoard(),
    queue: [],
    score: 0,
    best: 0,
    moves: 0,
    over: false,
    undo: null,
    bombs: 1,
    rng: null,
  };

  function storageKey(dateKey) {
    return "ttgo-tile-up-" + dateKey;
  }

  function loadBest(dateKey) {
    try {
      var raw = localStorage.getItem(storageKey(dateKey));
      if (!raw) return 0;
      var data = JSON.parse(raw);
      return data && typeof data.best === "number" ? data.best : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(
        storageKey(state.dateKey),
        JSON.stringify({ best: state.best, score: state.score, moves: state.moves })
      );
    } catch (e) {}
  }

  function startDaily(forceNew) {
    var now = new Date();
    var dateKey = utcDateKey(now);
    var puzzleNo = dailyNumber(now);
    var seed = hashString("tile-up|" + dateKey);
    var rng = mulberry32(seed);

    state.dateKey = dateKey;
    state.puzzleNo = puzzleNo;
    state.board = emptyBoard();
    state.queue = makeQueue(rng, 48);
    state.score = 0;
    state.moves = 0;
    state.over = false;
    state.undo = null;
    state.bombs = 1;
    state.rng = rng;
    state.best = loadBest(dateKey);

    // Seed a few starter tiles so the board isn't empty (deterministic).
    if (!forceNew) {
      /* always fresh board for new day / restart with same seed sequence */
    }
    var starters = 2;
    while (starters--) {
      var empties = [];
      for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) if (!state.board[r][c]) empties.push([r, c]);
      }
      if (!empties.length) break;
      var pick = empties[Math.floor(rng() * empties.length)];
      state.board[pick[0]][pick[1]] = nextTileValue(rng);
    }
    resolveMerges(state.board);

    render(true);
  }

  function currentTile() {
    return state.queue[0] || 0;
  }

  function pushHistory() {
    state.undo = {
      board: cloneBoard(state.board),
      queue: state.queue.slice(),
      score: state.score,
      moves: state.moves,
      bombs: state.bombs,
      over: state.over,
    };
  }

  function placeAt(r, c) {
    if (state.over) return;
    if (state.board[r][c]) return;
    var tile = currentTile();
    if (!tile) return;

    pushHistory();
    state.board[r][c] = tile;
    state.queue.shift();
    if (state.queue.length < 8) {
      state.queue = state.queue.concat(makeQueue(state.rng, 24));
    }
    state.moves += 1;

    var gained = resolveMerges(state.board);
    state.score += gained + tile;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest();
    }

    if (countEmpty(state.board) === 0) {
      // One more merge pass chance already done; if still full → over.
      state.over = true;
      saveBest();
    }

    render(true);
    flashCell(r, c);
  }

  function undoMove() {
    if (!state.undo) return;
    var u = state.undo;
    state.board = u.board;
    state.queue = u.queue;
    state.score = u.score;
    state.moves = u.moves;
    state.bombs = u.bombs;
    state.over = u.over;
    state.undo = null;
    render(true);
  }

  function useBomb() {
    if (state.over || state.bombs <= 0) return;
    // Remove the lowest-value occupied tile (prefer edges).
    var candidates = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (state.board[r][c]) candidates.push([r, c, state.board[r][c]]);
      }
    }
    if (!candidates.length) return;
    candidates.sort(function (a, b) {
      if (a[2] !== b[2]) return a[2] - b[2];
      return a[0] + a[1] - (b[0] + b[1]);
    });
    pushHistory();
    var t = candidates[0];
    state.board[t[0]][t[1]] = 0;
    state.bombs -= 1;
    state.over = false;
    render(true);
    flashCell(t[0], t[1]);
  }

  function flashCell(r, c) {
    var cell = document.querySelector('.tu-cell[data-r="' + r + '"][data-c="' + c + '"]');
    if (!cell) return;
    cell.classList.remove("flash");
    void cell.offsetWidth;
    cell.classList.add("flash");
  }

  function renderMini(value, extraClass) {
    var span = document.createElement("span");
    span.className = "tu-mini " + tileClass(value) + (extraClass ? " " + extraClass : "");
    span.textContent = value;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  function render(animate) {
    el("tu-puzzle-no").textContent = "#" + state.puzzleNo;
    el("tu-score").textContent = String(state.score);
    el("tu-best").textContent = String(state.best);
    el("tu-moves").textContent = String(state.moves);
    el("tu-date").textContent = state.dateKey + " UTC";

    var next = el("tu-next");
    next.innerHTML = "";
    var cur = currentTile();
    if (cur) next.appendChild(renderMini(cur, "is-current"));
    for (var i = 1; i < 4; i++) {
      if (state.queue[i]) next.appendChild(renderMini(state.queue[i], "is-ghost"));
    }

    var boardEl = el("tu-board");
    boardEl.innerHTML = "";
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "tu-cell" + (state.board[r][c] ? " filled" : "");
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.setAttribute(
          "aria-label",
          state.board[r][c]
            ? "Tile " + state.board[r][c]
            : "Empty cell, place " + (cur || "tile")
        );
        if (state.board[r][c]) {
          var tile = document.createElement("div");
          tile.className = "tu-tile " + tileClass(state.board[r][c]);
          if (!animate) tile.style.animation = "none";
          tile.textContent = state.board[r][c];
          cell.appendChild(tile);
        }
        cell.addEventListener("click", onCellClick);
        boardEl.appendChild(cell);
      }
    }

    el("tu-undo").disabled = !state.undo;
    el("tu-bomb").disabled = state.over || state.bombs <= 0;
    el("tu-bomb").textContent = "Clear low tile (" + state.bombs + ")";

    var shell = el("tu-shell");
    shell.classList.toggle("is-over", state.over);

    var banner = el("tu-banner");
    if (state.over) {
      banner.classList.add("show");
      el("tu-banner-title").textContent = "Board full — daily run over";
      el("tu-banner-text").textContent =
        "Score " + state.score + " · Best today " + state.best + " · Moves " + state.moves;
    } else {
      banner.classList.remove("show");
    }
  }

  function onCellClick(ev) {
    var btn = ev.currentTarget;
    var r = Number(btn.dataset.r);
    var c = Number(btn.dataset.c);
    placeAt(r, c);
  }

  function bind() {
    el("tu-restart").addEventListener("click", function () {
      startDaily(true);
    });
    el("tu-undo").addEventListener("click", undoMove);
    el("tu-bomb").addEventListener("click", useBomb);
  }

  bind();
  startDaily(false);
})();
