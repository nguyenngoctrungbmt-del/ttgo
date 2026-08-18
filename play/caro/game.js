// Simple Caro (Gomoku) two-player game
const SIZE = 15
let board = Array.from({length:SIZE}, ()=>Array(SIZE).fill(null))
let current = 'X'
let gameOver = false
let mode = 'ai' // default to 'ai' for Play vs AI

const boardEl = document.getElementById('caro-board')
const turnEl = document.getElementById('caro-turn')
const overlay = document.getElementById('caro-overlay')
const overlayTitle = document.getElementById('caro-overlay-title')
const overlayText = document.getElementById('caro-overlay-text')

function render(){
  boardEl.innerHTML = ''
  boardEl.style.gridTemplateColumns = `repeat(${SIZE}, var(--caro-cell))`
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'caro-cell'
      btn.dataset.r = r
      btn.dataset.c = c
      const v = board[r][c]
      if(v){ btn.textContent = v; btn.classList.add(v==='X'?'is-x':'is-o'); btn.disabled = true }
      btn.addEventListener('click', onCellClick)
      boardEl.appendChild(btn)
    }
  }
  turnEl.textContent = current
}

function onCellClick(e){
  if(gameOver) return
  const r = parseInt(e.currentTarget.dataset.r,10)
  const c = parseInt(e.currentTarget.dataset.c,10)
  if(board[r][c]) return
  board[r][c] = current
  if(checkWin(r,c,current)){
    gameOver = true
    showOverlay(current + ' wins!', `Player ${current} connected five.`)
  } else {
    current = current === 'X' ? 'O' : 'X'
    turnEl.textContent = current
  }
  render()
  // if playing vs AI and it's AI's turn, schedule AI move
  if(!gameOver && mode === 'ai' && current === 'O'){
    setTimeout(aiMove, 250)
  }
}

function checkWin(r,c,p){
  // check 4 directions: horiz, vert, diag1, diag2
  const dirs = [[1,0],[0,1],[1,1],[1,-1]]
  for(const [dx,dy] of dirs){
    let count = 1
    // forward
    let x = c+dx, y = r+dy
    while(y>=0 && y<SIZE && x>=0 && x<SIZE && board[y][x]===p){ count++; x+=dx; y+=dy }
    // backward
    x = c-dx; y = r-dy
    while(y>=0 && y<SIZE && x>=0 && x<SIZE && board[y][x]===p){ count++; x-=dx; y-=dy }
    if(count>=5) return true
  }
  return false
}

function restart(){
  board = Array.from({length:SIZE}, ()=>Array(SIZE).fill(null))
  current = 'X'
  gameOver = false
  hideOverlay()
  render()
}

function showOverlay(title,text){
  overlayTitle.textContent = title
  overlayText.textContent = text
  overlay.hidden = false
}

function hideOverlay(){ if(overlay) overlay.hidden = true }

document.getElementById('caro-restart').addEventListener('click', restart)
document.getElementById('caro-overlay-restart').addEventListener('click', restart)

// AI helpers
function findWinningMove(player){
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      if(board[r][c]) continue
      board[r][c] = player
      const win = checkWin(r,c,player)
      board[r][c] = null
      if(win) return [r,c]
    }
  }
  return null
}

function heuristicScore(r,c,player){
  const dirs = [[1,0],[0,1],[1,1],[1,-1]]
  let score = 0
  for(const [dx,dy] of dirs){
    let cnt = 1
    let x = c+dx, y = r+dy
    while(y>=0 && y<SIZE && x>=0 && x<SIZE && board[y][x]===player){ cnt++; x+=dx; y+=dy }
    x = c-dx; y = r-dy
    while(y>=0 && y<SIZE && x>=0 && x<SIZE && board[y][x]===player){ cnt++; x-=dx; y-=dy }
    score += cnt*cnt
  }
  return score
}

function bestHeuristicMove(){
  let best = null, bestScore = -Infinity
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      if(board[r][c]) continue
      const s = heuristicScore(r,c,'O') + 0.5*heuristicScore(r,c,'X')
      if(s>bestScore){ bestScore = s; best=[r,c] }
    }
  }
  if(best) return best
  // fallback random
  const empties = []
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(!board[r][c]) empties.push([r,c])
  if(empties.length===0) return null
  return empties[Math.floor(Math.random()*empties.length)]
}

function aiMove(){
  if(gameOver) return
  // win if possible
  let mv = findWinningMove('O')
  if(!mv) mv = findWinningMove('X') // block
  if(!mv) mv = bestHeuristicMove()
  if(!mv) return
  const [r,c] = mv
  board[r][c] = 'O'
  if(checkWin(r,c,'O')){
    gameOver = true
    showOverlay('O wins!', 'AI connected five.')
  } else {
    current = 'X'
  }
  render()
}

// mode toggle
const modeBtn = document.getElementById('caro-toggle-ai')
if(modeBtn){
  // initialize button state from default mode
  modeBtn.textContent = mode === 'ai' ? 'Play vs AI: On' : 'Play vs AI: Off'
  modeBtn.setAttribute('aria-pressed', mode === 'ai')
  modeBtn.addEventListener('click', ()=>{
    mode = mode === 'pvp' ? 'ai' : 'pvp'
    modeBtn.textContent = mode === 'ai' ? 'Play vs AI: On' : 'Play vs AI: Off'
    modeBtn.setAttribute('aria-pressed', mode === 'ai')
    // if switching to AI and it's AI's turn, trigger move
    if(mode === 'ai' && !gameOver && current === 'O') setTimeout(aiMove, 200)
  })
  // if AI default and it's AI's turn, run AI
  if(mode === 'ai' && !gameOver && current === 'O') setTimeout(aiMove, 200)
}

render()
