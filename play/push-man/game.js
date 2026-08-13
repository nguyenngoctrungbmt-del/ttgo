// Simple Sokoban (Push Man) with TTGO integration
const mapChars = { '#':'wall',' ':'floor','.':'goal','$':'box','*':'box_on_goal','@':'player','+':'player_on_goal' }

const LEVELS = [
	[
	  '#######',
	  '#     #',
	  '# $ . #',
	  '#  @  #',
	  '#     #',
	  '#######'
	],
  [
    '  #####  ',
    '  #   #  ',
    '  #$  #  ',
    '### . ## ',
    '#  $@  # ',
    '#  .   # ',
    '######## '
  ],
  [
  '########',
  '#      #',
  '#  $   #',
  '#  .@  #',
  '#      #',
  '########'
],
[
  '########',
  '#  .   #',
  '#  $   #',
  '#  $   #',
  '#  .@  #',
  '########'
],
[
  '#########',
  '#       #',
  '#  $ $  #',
  '#   @   #',
  '#  . .  #',
  '#       #',
  '#########'
],[
  '#########',
  '#       #',
  '# ###   #',
  '# $ .   #',
  '#   ### #',
  '#   @   #',
  '#########'
],[
  '#########',
  '#   .   #',
  '# ###$  #',
  '#   $   #',
  '#  . @  #',
  '#       #',
  '#########'
],[
  '##########',
  '#        #',
  '#  ###   #',
  '#  $ .   #',
  '#  $ ### #',
  '#  .  @  #',
  '#        #',
  '##########'
],[
  '##########',
  '#   .    #',
  '#   $    #',
  '# ###    #',
  '#   $ .  #',
  '#   @    #',
  '#        #',
  '##########'
],[
  '###########',
  '#         #',
  '# $  $    #',
  '#   ###   #',
  '# . $  .  #',
  '#    @    #',
  '#    .    #',
  '###########'
]
]

let levelIndex = 0
let levelStr = LEVELS[levelIndex]
let grid, rows, cols, playerPos, goals, history=[]
let moves = 0, pushes = 0, best = 0, gameOver = false
let viewBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
const BEST_KEY_BASE = 'ttgo-push-man-best'

function parseLevel(){
  rows = levelStr.length
  cols = Math.max(...levelStr.map(r=>r.length))
  grid = Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>({type:'floor',hasBox:false,goal:false})))
  goals = []
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const ch = (levelStr[y][x]||' ')
      if(ch==='#') grid[y][x].type='wall'
      if(ch==='.' ) {grid[y][x].goal=true; goals.push([x,y])}
      if(ch==='$') grid[y][x].hasBox=true
      if(ch==='*') {grid[y][x].hasBox=true;grid[y][x].goal=true; goals.push([x,y])}
      if(ch==='@') playerPos=[x,y]
      if(ch==='+'){playerPos=[x,y];grid[y][x].goal=true; goals.push([x,y])}
    }
  }
  markVoidCells()
  computeViewBounds()
}

function markVoidCells(){
  const reachable = Array.from({length:rows},()=>Array(cols).fill(false))
  const queue = [[playerPos[0], playerPos[1]]]
  reachable[playerPos[1]][playerPos[0]] = true
  while(queue.length){
    const [x,y] = queue.shift()
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]]
    for(const [dx,dy] of dirs){
      const nx = x+dx, ny = y+dy
      if(!inBounds(nx,ny)) continue
      if(grid[ny][nx].type==='wall') continue
      if(reachable[ny][nx]) continue
      reachable[ny][nx] = true
      queue.push([nx,ny])
    }
  }
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      if(grid[y][x].type==='wall') continue
      if(!reachable[y][x]) grid[y][x].type = 'void'
    }
  }
}

function computeViewBounds(){
  let minX = cols, minY = rows, maxX = 0, maxY = 0
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      if(grid[y][x].type==='void') continue
      if(x<minX) minX=x
      if(y<minY) minY=y
      if(x>maxX) maxX=x
      if(y>maxY) maxY=y
    }
  }
  viewBounds = { minX, minY, maxX, maxY }
}

function loadBest(){
  const key = BEST_KEY_BASE + '-' + levelIndex
  try{ best = parseInt(localStorage.getItem(key) || '0',10) || 0 }catch(e){ best = 0 }
  document.getElementById('pm-best').textContent = best?String(best):'—'
}

function saveBest(){
  const key = BEST_KEY_BASE + '-' + levelIndex
  if(best === 0 || moves < best){
    best = moves
    try{ localStorage.setItem(key, String(best)) }catch(e){}
    document.getElementById('pm-best').textContent = String(best)
  }
}

function updateHud(){
  const m = document.getElementById('pm-moves')
  if(m) m.textContent = String(moves)
}

function render(){
  const el = document.getElementById('pm-board')
  const cell = getComputedStyle(document.getElementById('pm-shell')).getPropertyValue('--pm-cell').trim() || '48px'
  const { minX, minY, maxX, maxY } = viewBounds
  const viewCols = maxX - minX + 1
  const viewRows = maxY - minY + 1
  el.style.gridTemplateColumns = `repeat(${viewCols}, ${cell})`
  el.style.gridTemplateRows = `repeat(${viewRows}, ${cell})`
  el.innerHTML = ''
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      const c = grid[y][x]
      const div = document.createElement('div')
      div.className = 'pm-cell'
      if(c.type==='void'){
        div.classList.add('pm-void')
        el.appendChild(div)
        continue
      }
      if(c.type==='wall') div.classList.add('pm-wall')
      else div.classList.add('pm-floor')
      if(c.goal) div.classList.add('pm-goal')
      if(c.hasBox){
        div.classList.add('pm-box')
        if(c.goal) div.classList.add('pm-box-on-goal')
      }
      if(playerPos[0]===x && playerPos[1]===y){
        const p = document.createElement('div')
        p.className='pm-player'
        p.textContent='🙂'
        div.appendChild(p)
      }
      el.appendChild(div)
    }
  }
  updateHud()
}

function inBounds(x,y){return y>=0 && y<rows && x>=0 && x<cols}

function tryMove(dx,dy){
  if(gameOver) return
  const [x,y]=playerPos
  const nx=x+dx, ny=y+dy
  if(!inBounds(nx,ny)) return
  const target = grid[ny][nx]
  if(target.type==='wall' || target.type==='void') return
  const prevMoves = moves, prevPushes = pushes
  // if box, try push
  if(target.hasBox){
    const bx=nx+dx, by=ny+dy
    if(!inBounds(bx,by)) return
    const beyond = grid[by][bx]
    if(beyond.type==='wall' || beyond.type==='void' || beyond.hasBox) return
    // push
    history.push({player:[x,y],push:[nx,ny],prevMoves,prevPushes})
    beyond.hasBox = true
    target.hasBox = false
    playerPos=[nx,ny]
    pushes += 1
    moves += 1
  } else {
    history.push({player:[x,y],push:null,prevMoves,prevPushes})
    playerPos=[nx,ny]
    moves += 1
  }
  render()
  if(checkWin()) onWin()
}

function undo(){
  const step = history.pop()
  if(!step) return
  playerPos = step.player
  moves = step.prevMoves || 0
  pushes = step.prevPushes || 0
  if(step.push){
    // move box back to original push tile
    const [bx,by]=step.push
    const dx = bx - playerPos[0], dy = by - playerPos[1]
    const fromX = bx+dx, fromY = by+dy
    if(inBounds(fromX,fromY) && grid[fromY][fromX].hasBox){
      grid[fromY][fromX].hasBox = false
      grid[by][bx].hasBox = true
    } else {
      grid[by][bx].hasBox = false
    }
  }
  gameOver = false
  render()
}

function checkWin(){
  return goals.every(g=>grid[g[1]][g[0]].hasBox)
}

function showOverlay(title,text){
  const ov = document.getElementById('pm-overlay')
  if(!ov) return
  document.getElementById('pm-overlay-title').textContent = title
  document.getElementById('pm-overlay-text').textContent = text
  ov.hidden = false
}

function hideOverlay(){
  const ov = document.getElementById('pm-overlay')
  if(ov) ov.hidden = true
}

function onWin(){
  gameOver = true
  saveBest()
  showOverlay('You win!', 'Moves: ' + moves + ' · Pushes: ' + pushes)
}

function restart(){history=[];moves=0;pushes=0;gameOver=false;parseLevel();loadBest();render();hideOverlay()}

function populateLevelSelect(){
  const sel = document.getElementById('pm-level-select')
  if(!sel) return
  sel.innerHTML = ''
  LEVELS.forEach((lvl, i)=>{
    const opt = document.createElement('option')
    opt.value = String(i)
    opt.textContent = 'Level ' + (i+1)
    sel.appendChild(opt)
  })
  sel.value = String(levelIndex)
}

function setLevel(i) {
  levelIndex = i
  levelStr = LEVELS[levelIndex]
  restart()
  const sel = document.getElementById('pm-level-select')
  if(sel) sel.value = String(levelIndex)
}

function prevLevel(){
  setLevel((levelIndex - 1 + LEVELS.length) % LEVELS.length)
}

function nextLevel(){
  setLevel((levelIndex + 1) % LEVELS.length)
}

document.addEventListener('keydown',e=>{
  const key = e.key
  if(key==='ArrowUp' || key==='w') tryMove(0,-1)
  if(key==='ArrowDown' || key==='s') tryMove(0,1)
  if(key==='ArrowLeft' || key==='a') tryMove(-1,0)
  if(key==='ArrowRight' || key==='d') tryMove(1,0)
  if(key==='u') undo()
})

document.addEventListener('click',e=>{
  const b = e.target.closest('button[data-dir]')
  if(b){
    const [dx,dy] = b.dataset.dir.split(',').map(Number)
    tryMove(dx,dy)
  }
})

document.getElementById('undo').addEventListener('click',undo)
document.getElementById('restart').addEventListener('click',restart)
document.getElementById('pm-overlay-restart').addEventListener('click',restart)
document.getElementById('pm-prev-level').addEventListener('click',prevLevel)
document.getElementById('pm-next-level').addEventListener('click',nextLevel)

document.getElementById('pm-level-select').addEventListener('change', (e)=>{
  levelIndex = parseInt(e.target.value,10)
  setLevel(levelIndex)
})

parseLevel()
populateLevelSelect()
loadBest()
render()
hideOverlay()
