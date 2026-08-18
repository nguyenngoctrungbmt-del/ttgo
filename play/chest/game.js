(() => {
  const BOARD = document.getElementById('chest-board');
  const MOVES = document.getElementById('chest-moves');
  const MATCHES = document.getElementById('chest-matches');
  const TIME = document.getElementById('chest-time');
  const BEST = document.getElementById('chest-best');
  const RESTART = document.getElementById('chest-restart');
  const OVERLAY = document.getElementById('chest-overlay');
  const SUMMARY = document.getElementById('chest-summary');
  const PLAY_AGAIN = document.getElementById('chest-play-again');

  const BEST_KEY = 'ttgo-chest-best';
  const SIZE = 4; // 4x4 grid (8 pairs)
  const EMOJIS = ['💎','🎁','🗝️','🔒','👑','💰','🪙','🌟','🍀','⚓','🧭','🦄'];

  let deck = [];
  let revealed = [];
  let matched = new Set();
  let moves = 0;
  let matches = 0;
  let timer = null;
  let seconds = 0;

  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a}

  function makeDeck(){
    const pairs = (SIZE*SIZE)/2;
    const sel = EMOJIS.slice(0);
    shuffle(sel);
    const pick = sel.slice(0,pairs);
    deck = shuffle(pick.concat(pick));
  }

  function render(){
    BOARD.innerHTML = '';
    deck.forEach((v,i)=>{
      const el = document.createElement('button');
      el.className = 'chest-card';
      el.type = 'button';
      el.setAttribute('data-index', i);
      el.setAttribute('aria-label','Chest card');
      const face = document.createElement('div'); face.className='face'; face.textContent = v;
      el.appendChild(face);
      if(matched.has(i)) el.classList.add('matched');
      if(revealed.includes(i)) el.classList.add('revealed');
      el.addEventListener('click', onCardClick);
      BOARD.appendChild(el);
    });
    MOVES.textContent = moves;
    MATCHES.textContent = matches;
    TIME.textContent = `${seconds}s`;
  }

  function startTimer(){
    if(timer) return;
    timer = setInterval(()=>{seconds++; TIME.textContent = `${seconds}s`;},1000);
  }

  function stopTimer(){ if(timer){clearInterval(timer);timer=null;} }

  function onCardClick(e){
    const btn = e.currentTarget;
    const idx = Number(btn.getAttribute('data-index'));
    if(revealed.includes(idx) || matched.has(idx)) return;
    if(revealed.length === 2) return;
    if(!timer) startTimer();
    revealed.push(idx);
    if(revealed.length===2){
      moves++;
      MOVES.textContent = moves;
      const [a,b] = revealed;
      if(deck[a] === deck[b]){
        matched.add(a); matched.add(b);
        matches += 1;
        MATCHES.textContent = matches;
        revealed = [];
        if(matched.size === deck.length){
          stopTimer();
          showWin();
        }
      } else {
        setTimeout(()=>{ revealed = []; render(); }, 700);
      }
    }
    render();
  }

  function showWin(){
    const summaryText = `Finished in ${moves} moves and ${seconds} seconds.`;
    SUMMARY.textContent = summaryText;
    OVERLAY.hidden = false;
    try{ OVERLAY.style.display = 'flex'; }catch(e){}
    saveBest();
  }

  function hideOverlay(){
    OVERLAY.hidden = true;
    try{ OVERLAY.style.display = 'none'; }catch(e){}
  }

  function restart(){
    stopTimer(); seconds = 0; moves = 0; matches = 0; matched = new Set(); revealed = []; makeDeck(); render(); hideOverlay(); loadBest();
  }

  function saveBest(){
    try{
      const prev = JSON.parse(localStorage.getItem(BEST_KEY) || 'null');
      const score = {moves, seconds};
      if(!prev || score.moves < prev.moves || (score.moves===prev.moves && score.seconds < prev.seconds)){
        localStorage.setItem(BEST_KEY, JSON.stringify(score));
      }
    }catch(e){}
  }

  function loadBest(){
    try{
      const b = JSON.parse(localStorage.getItem(BEST_KEY) || 'null');
      BEST.textContent = b ? `${b.moves} moves • ${b.seconds}s` : '—';
    }catch(e){ BEST.textContent = '—'; }
  }

  RESTART.addEventListener('click', restart);
  PLAY_AGAIN.addEventListener('click', restart);
  OVERLAY.addEventListener('click', (e)=>{ if(e.target===OVERLAY) hideOverlay(); });

  // init
  makeDeck(); loadBest(); render(); hideOverlay();
})();
