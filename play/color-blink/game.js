(function () {
  "use strict";

  var COLORS = [
    { name: "Red", key: "1" },
    { name: "Green", key: "2" },
    { name: "Blue", key: "3" },
    { name: "Yellow", key: "4" }
  ];

  var BLINK_MS = 520;
  var GAP_MS = 180;

  var sequence = [];
  var inputIndex = 0;
  var round = 0;
  var best = 0;
  var playing = false;
  var watching = false;
  var busy = false;

  var el = function (id) { return document.getElementById(id); };
  var shell = el("cb-shell");
  var padEl = el("cb-pad");
  var statusEl = el("cb-status");
  var roundEl = el("cb-round");
  var bestEl = el("cb-best");
  var lengthEl = el("cb-length");
  var overlay = el("cb-overlay");
  var overlayTitle = el("cb-overlay-title");
  var overlayText = el("cb-overlay-text");

  function setBusy(on) {
    busy = on;
    shell.classList.toggle("is-busy", on);
    padEl.querySelectorAll(".cb-btn").forEach(function (btn) {
      btn.disabled = on || watching || !playing;
    });
  }

  function setStatus(text, active) {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-active", !!active);
  }

  function updateHud() {
    roundEl.textContent = String(round);
    bestEl.textContent = String(best);
    lengthEl.textContent = String(sequence.length);
  }

  function renderPad() {
    padEl.innerHTML = COLORS.map(function (color, i) {
      return (
        '<button type="button" class="cb-btn" data-color="' + i + '" aria-label="' + color.name + ' color"></button>'
      );
    }).join("");
  }

  function blinkButton(index) {
    return new Promise(function (resolve) {
      var btn = padEl.querySelector('.cb-btn[data-color="' + index + '"]');
      if (!btn) {
        resolve();
        return;
      }
      btn.classList.add("is-lit");
      window.setTimeout(function () {
        btn.classList.remove("is-lit");
        window.setTimeout(resolve, GAP_MS);
      }, BLINK_MS);
    });
  }

  function playSequence() {
    watching = true;
    setBusy(true);
    setStatus("Watch the pattern…", true);
    var chain = Promise.resolve();
    var i;
    for (i = 0; i < sequence.length; i++) {
      (function (idx) {
        chain = chain.then(function () { return blinkButton(sequence[idx]); });
      })(i);
    }
    return chain.then(function () {
      watching = false;
      inputIndex = 0;
      setBusy(false);
      setStatus("Your turn — repeat the pattern", true);
      padEl.querySelectorAll(".cb-btn").forEach(function (btn) {
        btn.disabled = false;
      });
    });
  }

  function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function endGame() {
    playing = false;
    setBusy(true);
    if (round > best) {
      best = round;
      updateHud();
    }
    showOverlay(
      "Game over",
      "You reached round " + round + " with a sequence of " + sequence.length + "."
    );
    setStatus("Wrong color — tap Play again", false);
  }

  function nextRound() {
    round += 1;
    sequence.push(Math.floor(Math.random() * COLORS.length));
    updateHud();
    return playSequence();
  }

  function startGame() {
    sequence = [];
    inputIndex = 0;
    round = 0;
    playing = true;
    hideOverlay();
    updateHud();
    setStatus("Get ready…", true);
    setBusy(true);
    window.setTimeout(function () {
      nextRound();
    }, 500);
  }

  function onColorTap(index) {
    if (!playing || watching || busy) return;
    var btn = padEl.querySelector('.cb-btn[data-color="' + index + '"]');
    if (sequence[inputIndex] !== index) {
      btn.classList.add("is-wrong");
      window.setTimeout(function () {
        btn.classList.remove("is-wrong");
        endGame();
      }, 350);
      return;
    }

    blinkButton(index).then(function () {
      inputIndex += 1;
      if (inputIndex >= sequence.length) {
        setBusy(true);
        setStatus("Nice! Next round…", true);
        window.setTimeout(function () {
          nextRound();
        }, 700);
      }
    });
  }

  padEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".cb-btn");
    if (!btn || btn.disabled) return;
    onColorTap(parseInt(btn.getAttribute("data-color"), 10));
  });

  document.addEventListener("keydown", function (e) {
    if (!playing || watching || busy) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) onColorTap(n - 1);
  });

  el("cb-start").addEventListener("click", startGame);
  el("cb-overlay-restart").addEventListener("click", startGame);
  el("cb-reset-best").addEventListener("click", function () {
    best = 0;
    updateHud();
  });

  renderPad();
  updateHud();
  setStatus("Tap Start to play", false);
  setBusy(true);
})();
