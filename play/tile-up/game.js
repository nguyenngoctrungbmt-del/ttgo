(function () {
  "use strict";

  var SIZE = 4;
  var MERGE_MIN = 3;
  var EPOCH = Date.UTC(2026, 0, 1); // Daily Puzzle #1 = 2026-01-01 UTC
  var DIRS = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  var animating = false;

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

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function cellCenter(r, c) {
    var cell = document.querySelector('.tu-cell[data-r="' + r + '"][data-c="' + c + '"]');
    var layer = el("tu-fx");
    if (!cell || !layer) return null;
    var cb = cell.getBoundingClientRect();
    var lb = layer.getBoundingClientRect();
    return {
      x: cb.left - lb.left + cb.width / 2,
      y: cb.top - lb.top + cb.height / 2,
      w: cb.width,
      h: cb.height,
    };
  }

  /**
   * Find connected groups of identical tiles (size >= MERGE_MIN).
   * Returns merge descriptors; does not mutate board.
   */
  function findMergeGroups(board) {
    var visited = {};
    var groups = [];

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

        if (cells.length < MERGE_MIN) continue;

        cells.sort(function (a, b) {
          var da = Math.abs(a[0] - 1.5) + Math.abs(a[1] - 1.5);
          var db = Math.abs(b[0] - 1.5) + Math.abs(b[1] - 1.5);
          return da - db;
        });

        var keep = cells[0];
        var triples = Math.floor(cells.length / MERGE_MIN);
        var result = val;
        for (var t = 0; t < triples; t++) result *= 2;

        groups.push({
          cells: cells,
          keep: keep,
          val: val,
          result: result,
          score: result * triples,
        });
      }
    }

    return groups;
  }

  /** Apply all current merge groups once. Returns score gained. */
  function applyMergeGroups(board, groups) {
    var gained = 0;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      for (var j = 0; j < g.cells.length; j++) {
        board[g.cells[j][0]][g.cells[j][1]] = 0;
      }
      board[g.keep[0]][g.keep[1]] = g.result;
      gained += g.score;
    }
    return gained;
  }

  /** Resolve all cascades instantly (used on daily start / no FX needed). */
  function resolveMerges(board) {
    var gained = 0;
    var guard = 0;
    while (guard++ < 40) {
      var groups = findMergeGroups(board);
      if (!groups.length) break;
      gained += applyMergeGroups(board, groups);
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

  function startDaily() {
    if (animating) return;
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

    render({ animatePlace: false });
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

  function bumpScore(amount) {
    state.score += amount;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest();
    }
    el("tu-score").textContent = String(state.score);
    el("tu-best").textContent = String(state.best);
    var scoreEl = el("tu-score");
    scoreEl.classList.remove("tu-score-pop");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("tu-score-pop");
  }

  function showScoreFloat(r, c, points) {
    var layer = el("tu-fx");
    var pos = cellCenter(r, c);
    if (!layer || !pos) return;
    var floatEl = document.createElement("div");
    floatEl.className = "tu-score-float";
    floatEl.textContent = "+" + points;
    floatEl.style.left = pos.x + "px";
    floatEl.style.top = pos.y + "px";
    layer.appendChild(floatEl);
    setTimeout(function () {
      if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
    }, 700);
  }

  function spawnBurst(r, c) {
    var layer = el("tu-fx");
    var pos = cellCenter(r, c);
    if (!layer || !pos) return;
    var burst = document.createElement("div");
    burst.className = "tu-burst";
    burst.style.left = pos.x + "px";
    burst.style.top = pos.y + "px";
    layer.appendChild(burst);
    setTimeout(function () {
      if (burst.parentNode) burst.parentNode.removeChild(burst);
    }, 500);
  }

  async function animateMergePass(groups) {
    var i;
    var j;

    // Pulse tiles about to merge
    for (i = 0; i < groups.length; i++) {
      for (j = 0; j < groups[i].cells.length; j++) {
        var cell = groups[i].cells[j];
        var elCell = document.querySelector(
          '.tu-cell[data-r="' + cell[0] + '"][data-c="' + cell[1] + '"]'
        );
        if (elCell) elCell.classList.add("tu-merging");
      }
    }
    await wait(280);

    // Fly non-keep tiles toward keep, then clear
    var layer = el("tu-fx");
    var ghosts = [];

    for (i = 0; i < groups.length; i++) {
      var g = groups[i];
      var keepPos = cellCenter(g.keep[0], g.keep[1]);
      if (!keepPos) continue;

      for (j = 0; j < g.cells.length; j++) {
        var rc = g.cells[j];
        var isKeep = rc[0] === g.keep[0] && rc[1] === g.keep[1];
        var from = cellCenter(rc[0], rc[1]);
        var srcCell = document.querySelector(
          '.tu-cell[data-r="' + rc[0] + '"][data-c="' + rc[1] + '"] .tu-tile'
        );
        if (!from || !srcCell) continue;

        if (isKeep) {
          srcCell.classList.add("tu-tile-absorb");
          continue;
        }

        var ghost = srcCell.cloneNode(true);
        ghost.className = "tu-tile tu-tile-fly " + tileClass(g.val);
        ghost.style.left = from.x - from.w / 2 + "px";
        ghost.style.top = from.y - from.h / 2 + "px";
        ghost.style.width = from.w + "px";
        ghost.style.height = from.h + "px";
        ghost.style.setProperty("--tu-dx", keepPos.x - from.x + "px");
        ghost.style.setProperty("--tu-dy", keepPos.y - from.y + "px");
        layer.appendChild(ghost);
        ghosts.push(ghost);
        srcCell.style.opacity = "0";
      }
    }

    await wait(320);

    for (i = 0; i < ghosts.length; i++) {
      if (ghosts[i].parentNode) ghosts[i].parentNode.removeChild(ghosts[i]);
    }

    applyMergeGroups(state.board, groups);

    for (i = 0; i < groups.length; i++) {
      bumpScore(groups[i].score);
      showScoreFloat(groups[i].keep[0], groups[i].keep[1], groups[i].score);
      spawnBurst(groups[i].keep[0], groups[i].keep[1]);
    }

    render({
      animatePlace: false,
      mergeKeeps: groups.map(function (g) {
        return g.keep[0] + "," + g.keep[1];
      }),
    });

    await wait(380);
  }

  async function runMergeCascades() {
    var guard = 0;
    while (guard++ < 40) {
      var groups = findMergeGroups(state.board);
      if (!groups.length) break;
      await animateMergePass(groups);
    }
  }

  async function placeAt(r, c) {
    if (animating || state.over) return;
    if (state.board[r][c]) return;
    var tile = currentTile();
    if (!tile) return;

    animating = true;
    el("tu-shell").classList.add("is-busy");

    pushHistory();
    state.board[r][c] = tile;
    state.queue.shift();
    if (state.queue.length < 8) {
      state.queue = state.queue.concat(makeQueue(state.rng, 24));
    }
    state.moves += 1;
    bumpScore(tile);

    render({
      animatePlace: true,
      placeAt: r + "," + c,
    });
    await wait(180);

    try {
      await runMergeCascades();
    } finally {
      if (countEmpty(state.board) === 0) {
        state.over = true;
        saveBest();
      }
      render({ animatePlace: false });
      animating = false;
      el("tu-shell").classList.remove("is-busy");
    }
  }

  function undoMove() {
    if (animating || !state.undo) return;
    var u = state.undo;
    state.board = u.board;
    state.queue = u.queue;
    state.score = u.score;
    state.moves = u.moves;
    state.bombs = u.bombs;
    state.over = u.over;
    state.undo = null;
    render({ animatePlace: false });
  }

  function useBomb() {
    if (animating || state.over || state.bombs <= 0) return;
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
    render({ animatePlace: false });
    var cell = document.querySelector('.tu-cell[data-r="' + t[0] + '"][data-c="' + t[1] + '"]');
    if (cell) {
      cell.classList.add("flash");
    }
  }

  function renderMini(value, extraClass) {
    var span = document.createElement("span");
    span.className = "tu-mini " + tileClass(value) + (extraClass ? " " + extraClass : "");
    span.textContent = value;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  function render(opts) {
    opts = opts || {};
    var mergeKeeps = opts.mergeKeeps || [];
    var placeAtKey = opts.placeAt || "";

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
          var tileEl = document.createElement("div");
          var key = r + "," + c;
          tileEl.className = "tu-tile " + tileClass(state.board[r][c]);
          if (mergeKeeps.indexOf(key) !== -1) {
            tileEl.classList.add("tu-tile-born");
          } else if (opts.animatePlace && key === placeAtKey) {
            tileEl.classList.add("tu-tile-place");
          } else if (!opts.animatePlace) {
            tileEl.style.animation = "none";
          }
          tileEl.textContent = state.board[r][c];
          cell.appendChild(tileEl);
        }
        cell.addEventListener("click", onCellClick);
        boardEl.appendChild(cell);
      }
    }

    el("tu-undo").disabled = animating || !state.undo;
    el("tu-bomb").disabled = animating || state.over || state.bombs <= 0;
    el("tu-bomb").textContent = "Clear low tile (" + state.bombs + ")";
    el("tu-restart").disabled = animating;

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
      startDaily();
    });
    el("tu-undo").addEventListener("click", undoMove);
    el("tu-bomb").addEventListener("click", useBomb);
  }

  bind();
  startDaily();
})();
