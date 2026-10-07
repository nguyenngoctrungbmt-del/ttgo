import { ACTION_INFOS } from '../games/registry'

export type GameId =
  | 'connect4'
  | 'reversi'
  | 'caro'
  | 'chess'
  | 'memory'
  | '2048'
  | 'sequence'
  | 'reaction'
  | 'whack'
  | 'slide'
  | 'colors'
  | 'taprace'
  | 'guess'
  | 'odd'
  | 'balloon'
  | 'math'
  | 'order'
  | 'lights'
  | 'scramble'
  | 'sum'
  | 'maze'
  | 'gauge'
  | 'arrow'
  | 'echo'
  | 'same'
  | 'hold'
  | 'safe'
  | 'rps'
  | 'hop'
  | 'sokoban'
  | 'watersort'
  | 'pipes'
  | 'nonogram'
  | 'patches'
  | 'shooter'
  | 'sudoku'
  | 'match3'
  | 'code'
  | 'snake'
  | 'stack'
  | 'xiangqi'
  | 'checkers'
  | 'wordle'
  | 'solitaire'
  | 'dodge'
  | 'flap'
  | 'breakout'
  | 'runner'
  | 'climb'
  | 'rally'
  | 'slash'
  | 'asteroids'
  | 'tank'
  | 'ninja'
  | 'orbit'
  | 'parry'
  | 'defense'
  | 'swing'
  | 'zombie'
  | 'knife'
  | 'jetpack'
  | 'pulse'
  | 'brawler'
  | 'archer'
  | 'goalie'
  | 'boxing'
  | 'helix'
  | 'hoops'
  | 'racer'
  | 'drift'
  | 'slither'
  | 'hole'
  | 'bubble'
  | 'pinball'
  | 'galaga'
  | 'bullet'
  | 'copter'
  | 'hopper'
  | 'catapult'
  | 'bowduel'
  | 'towerdef'
  | 'mech'
  | 'dungeon'
  | 'ski'
  | 'surf'
  | 'bmx'
  | 'sumo'
  | 'hockey'
  | 'fisher'
  | 'miner'
  | 'spinner'
  | 'paint'
  | 'blocks'
  | 'smash'
  | 'beats'
  | 'dogfight'
  | 'gravity'
  | 'bouncy'
  | 'lumber'
  | 'sniper'
  | 'matrix'
  | 'cups'
  | 'darkmaze'
  | 'changed'
  | 'nback'
  | 'flashcount'
  | 'faces'
  | 'melody'
  | 'recipe'
  | 'route'
  | 'crane'
  | 'bridge'
  | 'tinycity'
  | 'tumble'
  | 'roads'
  | 'sandcastle'
  | 'blueprint'
  | 'domino'
  | 'mergetown'
  | 'rocket'
  | 'fruitmerge'
  | 'dropmerge'
  | 'chainmerge'
  | 'hexsort'
  | 'mergedefense'
  | 'gunmerge'
  | 'carmerge'
  | 'planetmerge'
  | 'farmmerge'
  | 'potionmerge'
  | 'busjam'
  | 'parkingjam'
  | 'blockjam'
  | 'arrowescape'
  | 'sandblast'
  | 'goodssort'
  | 'screwjam'
  | 'numbermerge'
  | 'allinhole'
  | 'lanedefense'

export type GameMeta = {
  id: GameId
  title: string
  blurb: string
  path: string
  accent: string
  eta: string
  tag: string
  tags: string[]
  icon: string
  howTo: string[]
  isNew?: boolean
  /** Shown in the hub's Trending rail with a HOT badge. */
  trending?: boolean
  popularity: number
  addedAt: string
}

const BASE_GAMES: GameMeta[] = [
  {
    id: 'connect4',
    title: 'Connect Four',
    blurb: 'Drop discs and connect four before the CPU does.',
    path: '/play/connect4',
    accent: '#E11D48',
    eta: '2–6 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Brain', 'Quick'],
    icon: '🔴',
    howTo: [
      'You play red. Tap a column to drop your disc.',
      'Connect four discs in a row — horizontal, vertical, or diagonal.',
      'The CPU plays yellow after each of your moves.',
      'Win the match for a high score.',
    ],
    isNew: true,
    popularity: 96,
    addedAt: '2026-09-20',
  },
  {
    id: 'reversi',
    title: 'Reversi',
    blurb: 'Flip discs on an 8×8 board and outscore the CPU.',
    path: '/play/reversi',
    accent: '#0F766E',
    eta: '3–8 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Brain', 'Focus'],
    icon: '⚫',
    howTo: [
      'You play black. Place a disc that sandwiches enemy discs.',
      'All sandwiched discs flip to your color.',
      'Only legal flips are allowed — highlighted cells show moves.',
      'When neither side can move, the higher disc count wins.',
    ],
    isNew: true,
    popularity: 95,
    addedAt: '2026-09-20',
  },
  {
    id: 'caro',
    title: 'Caro',
    blurb: 'Classic five-in-a-row duel against a crafty CPU.',
    path: '/play/caro',
    accent: '#2563EB',
    eta: '3–10 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Brain', 'Focus'],
    icon: '⭕',
    howTo: [
      'You play X. Tap an empty cell to place your mark.',
      'Get five in a row — horizontal, vertical, or diagonal — to win.',
      'Block the CPU while building your own line.',
      'Clear the board without five-in-a-row for a draw.',
    ],
    isNew: true,
    popularity: 97,
    addedAt: '2026-09-20',
  },
  {
    id: 'chess',
    title: 'Chess',
    blurb: 'Play classic chess against a simple CPU opponent.',
    path: '/play/chess',
    accent: '#78716C',
    eta: '5–15 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Brain', 'Focus'],
    icon: '♟️',
    howTo: [
      'You play white. Tap a piece, then tap a highlighted square to move.',
      'Capture the black king’s position by checkmate to win.',
      'Legal moves only — including castling and pawn promotion to queen.',
      'The CPU replies after each of your moves.',
    ],
    isNew: true,
    popularity: 98,
    addedAt: '2026-09-20',
  },
  {
    id: 'memory',
    title: 'Flip Match',
    blurb: 'Find every pair before the timer climbs.',
    path: '/play/memory',
    accent: '#0D9488',
    eta: '2–4 min',
    tag: 'Focus',
    tags: ['Focus', 'Memory', 'Cards', 'Quick'],
    icon: '🃏',
    howTo: [
      'Tap a card to flip it over.',
      'Flip a second card and try to find a matching pair.',
      'Matched pairs stay open. Clear the whole board.',
      'Fewer moves and faster time mean a higher score.',
    ],
    popularity: 92,
    addedAt: '2026-01-10',
  },
  {
    id: '2048',
    title: 'Merge 2048',
    blurb: 'Swipe tiles, merge powers of two, chase a high score.',
    path: '/play/2048',
    accent: '#0284C7',
    eta: '3–8 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Swipe', 'Score'],
    icon: '🔢',
    howTo: [
      'Swipe on the board (or use keyboard arrows) to slide all tiles.',
      'When two tiles with the same number collide, they merge into one.',
      'Each merge adds to your score. Reach 2048 to clear the daily goal.',
      'Plan ahead — the game ends when no moves are left.',
    ],
    popularity: 98,
    addedAt: '2026-03-01',
  },
  {
    id: 'sequence',
    title: 'Pulse Sequence',
    blurb: 'Watch the pulse, then tap the pattern back.',
    path: '/play/sequence',
    accent: '#45C486',
    eta: '1–3 min',
    tag: 'Memory',
    tags: ['Memory', 'Rhythm', 'Reflex', 'Quick'],
    icon: '🎵',
    howTo: [
      'Press Start and watch the glowing pads carefully.',
      'Repeat the exact sequence by tapping the pads.',
      'Each round adds one more step to the pattern.',
      'Reach level 12 to master the game, or miss once to end.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-03-12',
  },
  {
    id: 'reaction',
    title: 'Flash Reflex',
    blurb: 'Wait for green, then tap as fast as you can.',
    path: '/play/reaction',
    accent: '#0284C7',
    eta: '1–2 min',
    tag: 'Reflex',
    tags: ['Reflex', 'Quick', 'Focus'],
    icon: '⚡',
    howTo: [
      'Tap Start and wait. The pad stays warm orange while waiting.',
      'When it flashes green, tap immediately.',
      'Tap too early and that try is void — stay patient.',
      'Best (lowest) reaction time is saved as your score.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-03-18',
  },
  {
    id: 'whack',
    title: 'Pop Targets',
    blurb: 'Pop the glowing targets before they vanish.',
    path: '/play/whack',
    accent: '#FF6B6B',
    eta: '1–2 min',
    tag: 'Reflex',
    tags: ['Reflex', 'Arcade', 'Quick', 'Score'],
    icon: '🎯',
    howTo: [
      'Targets pop up on the 3×3 grid for a short moment.',
      'Tap a lit target to score points and hear a pop.',
      'Missed targets cost a life. You have 3 lives and 30 seconds.',
      'Chain pops for bonus points before time runs out.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-03-18',
  },
  {
    id: 'slide',
    title: 'Slide Tile',
    blurb: 'Slide tiles into order from 1 to 8.',
    path: '/play/slide',
    accent: '#0D9488',
    eta: '2–5 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Focus'],
    icon: '🧩',
    howTo: [
      'Tap a tile next to the empty space to slide it in.',
      'Arrange numbers 1–8 in reading order, empty at the bottom-right.',
      'Every slide counts as a move — fewer is better.',
      'Clear the board to earn a completion score.',
    ],
    isNew: true,
    popularity: 84,
    addedAt: '2026-03-19',
  },
  {
    id: 'colors',
    title: 'Color Clash',
    blurb: 'Tap the ink color — ignore what the word says.',
    path: '/play/colors',
    accent: '#FFC83D',
    eta: '1–3 min',
    tag: 'Focus',
    tags: ['Focus', 'Reflex', 'Quick', 'Brain'],
    icon: '🎨',
    howTo: [
      'A color name appears, but the text may be painted in another color.',
      'Tap the button that matches the ink color, not the written word.',
      'You have a limited time per round — stay sharp.',
      'Build a streak for bonus score before you miss thrice.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-03-19',
  },
  {
    id: 'taprace',
    title: 'Tap Rush',
    blurb: 'Mash the button as fast as you can before time runs out.',
    path: '/play/taprace',
    accent: '#0D9488',
    eta: '1 min',
    tag: 'Arcade',
    tags: ['Arcade', 'Reflex', 'Quick', 'Score'],
    icon: '👆',
    howTo: [
      'Press Start to begin a 10-second rush.',
      'Tap the big button as many times as possible.',
      'Each tap adds to your score — keep a steady rhythm.',
      'Beat your best tap count to climb the leaderboard locally.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-03-20',
  },
  {
    id: 'guess',
    title: 'Number Nest',
    blurb: 'Guess the secret number with higher / lower hints.',
    path: '/play/guess',
    accent: '#0284C7',
    eta: '1–3 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Focus', 'Brain'],
    icon: '🎲',
    howTo: [
      'A secret number is picked between 1 and 100.',
      'Enter a guess, then follow the Higher / Lower hint.',
      'Find it in as few tries as you can.',
      'Clear within 8 guesses for a strong score.',
    ],
    isNew: true,
    popularity: 83,
    addedAt: '2026-03-20',
  },
  {
    id: 'odd',
    title: 'Spot Odd',
    blurb: 'Find the one tile that does not match the rest.',
    path: '/play/odd',
    accent: '#45C486',
    eta: '1–2 min',
    tag: 'Focus',
    tags: ['Focus', 'Quick', 'Reflex', 'Brain'],
    icon: '👁',
    howTo: [
      'A grid of shapes appears — almost all are identical.',
      'Tap the one odd tile as fast as you can.',
      'Each correct find grows your streak and score.',
      'Three misses end the round.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-03-20',
  },
  {
    id: 'balloon',
    title: 'Balloon Pop',
    blurb: 'Pop only the target-color balloons before they float away.',
    path: '/play/balloon',
    accent: '#FF6B6B',
    eta: '1–2 min',
    tag: 'Arcade',
    tags: ['Arcade', 'Reflex', 'Quick', 'Focus'],
    icon: '🎈',
    howTo: [
      'Watch the target color shown at the top.',
      'Pop balloons that match the target color.',
      'Wrong pops cost a life. Missed targets also hurt.',
      'Survive 30 seconds and stack combos for a high score.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-03-20',
  },
  {
    id: 'math',
    title: 'Quick Calc',
    blurb: 'Solve fast arithmetic before the timer hits zero.',
    path: '/play/math',
    accent: '#0D9488',
    eta: '1–2 min',
    tag: 'Brain',
    tags: ['Brain', 'Focus', 'Quick', 'Logic'],
    icon: '➕',
    howTo: [
      'A simple math question appears with four answers.',
      'Tap the correct result before time runs out.',
      'Each correct answer grows your streak and score.',
      'Three wrong answers or timeouts end the round.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-03-21',
  },
  {
    id: 'order',
    title: 'Count Order',
    blurb: 'Tap numbers in ascending order before they reshuffle.',
    path: '/play/order',
    accent: '#0284C7',
    eta: '1–3 min',
    tag: 'Focus',
    tags: ['Focus', 'Memory', 'Quick', 'Puzzle'],
    icon: '1️⃣',
    howTo: [
      'Numbers are scattered on the board.',
      'Tap them in order: 1, then 2, then 3…',
      'A wrong tap resets the current level.',
      'Clear higher counts for bigger scores.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-03-21',
  },
  {
    id: 'lights',
    title: 'Lights Out',
    blurb: 'Toggle tiles until every light turns off.',
    path: '/play/lights',
    accent: '#FFC83D',
    eta: '2–5 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Focus', 'Brain'],
    icon: '💡',
    howTo: [
      'Tap a tile to flip it and its neighbors.',
      'Lit tiles glow — your goal is an all-dark board.',
      'Fewer moves earn a higher score.',
      'Use Shuffle for a fresh solvable layout.',
    ],
    isNew: true,
    popularity: 84,
    addedAt: '2026-03-21',
  },
  {
    id: 'scramble',
    title: 'Word Scramble',
    blurb: 'Unscramble the letters to form the hidden word.',
    path: '/play/scramble',
    accent: '#45C486',
    eta: '1–3 min',
    tag: 'Brain',
    tags: ['Brain', 'Focus', 'Puzzle', 'Quick'],
    icon: '🔤',
    howTo: [
      'Letters of a word are jumbled on screen.',
      'Type the correct word and submit.',
      'Skip if stuck — but skipping costs points.',
      'Clear several words to finish strong.',
    ],
    isNew: true,
    popularity: 85,
    addedAt: '2026-03-21',
  },
  {
    id: 'sum',
    title: 'Sum Duo',
    blurb: 'Pick two numbers that add up to the target.',
    path: '/play/sum',
    accent: '#0D9488',
    eta: '1–2 min',
    tag: 'Brain',
    tags: ['Brain', 'Logic', 'Quick', 'Focus'],
    icon: '🧮',
    howTo: [
      'A target sum appears at the top.',
      'Tap two numbers on the board that add up to it.',
      'Correct pairs raise your streak and score.',
      'Three wrong pairs end the round.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-09-18',
  },
  {
    id: 'maze',
    title: 'Grid Maze',
    blurb: 'Navigate from S to E through shrinking corridors.',
    path: '/play/maze',
    accent: '#0284C7',
    eta: '2–4 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Logic', 'Focus'],
    icon: '🗺️',
    howTo: [
      'You start at S. Reach the E tile.',
      'Swipe on the board or use keyboard arrows to move.',
      'Walls block movement — plan a short path.',
      'Clear larger mazes for a bigger score.',
    ],
    isNew: true,
    popularity: 84,
    addedAt: '2026-09-18',
  },
  {
    id: 'gauge',
    title: 'Perfect Stop',
    blurb: 'Stop the sliding marker inside the green zone.',
    path: '/play/gauge',
    accent: '#45C486',
    eta: '1–2 min',
    tag: 'Reflex',
    tags: ['Reflex', 'Focus', 'Quick', 'Arcade'],
    icon: '🎚️',
    howTo: [
      'Watch the marker bounce across the track.',
      'Tap Stop when it sits inside the green zone.',
      'Closer to the center earns more points.',
      'The zone shrinks and speed rises each level.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-09-18',
  },
  {
    id: 'arrow',
    title: 'Arrow Rush',
    blurb: 'Match the direction before time runs out.',
    path: '/play/arrow',
    accent: '#FF6B6B',
    eta: '1–2 min',
    tag: 'Reflex',
    tags: ['Reflex', 'Arcade', 'Quick'],
    icon: '➡️',
    howTo: [
      'A big arrow appears on screen.',
      'Swipe or press the matching arrow key before time runs out.',
      'Be quick — the timer gets tighter each hit.',
      'Three mistakes or timeouts end the round.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-09-18',
  },
  {
    id: 'echo',
    title: 'Pattern Echo',
    blurb: 'Find the color sequence on the grid, in order.',
    path: '/play/echo',
    accent: '#FFC83D',
    eta: '1–3 min',
    tag: 'Focus',
    tags: ['Focus', 'Memory', 'Brain', 'Quick'],
    icon: '🌈',
    howTo: [
      'Study the color swatches at the top.',
      'Tap matching colors on the grid in the same order.',
      'Wrong colors cost a life and reshuffle the board.',
      'Longer patterns appear as you climb levels.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-09-18',
  },
  {
    id: 'same',
    title: 'Color Sweep',
    blurb: 'Clear every tile that matches the target color.',
    path: '/play/same',
    accent: '#0D9488',
    eta: '1–2 min',
    tag: 'Focus',
    tags: ['Focus', 'Quick', 'Reflex'],
    icon: '🧹',
    howTo: [
      'A target color appears at the top.',
      'Tap every tile that matches it before time runs out.',
      'Wrong colors cost a life.',
      'Boards grow and timers shrink as you climb.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-09-18',
  },
  {
    id: 'hold',
    title: 'Hold Beat',
    blurb: 'Hold the button and release right on the mark.',
    path: '/play/hold',
    accent: '#0284C7',
    eta: '1–2 min',
    tag: 'Focus',
    tags: ['Focus', 'Reflex', 'Quick'],
    icon: '⏱️',
    howTo: [
      'Press and hold the big button.',
      'Watch the fill rise toward the green mark.',
      'Release as close to the target time as you can.',
      'Three misses end the round.',
    ],
    isNew: true,
    popularity: 85,
    addedAt: '2026-09-18',
  },
  {
    id: 'safe',
    title: 'Mine Safe',
    blurb: 'Reveal safe tiles and dodge the hidden bombs.',
    path: '/play/safe',
    accent: '#45C486',
    eta: '2–4 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Focus', 'Brain'],
    icon: '💣',
    howTo: [
      'Tap a tile to reveal it.',
      'Numbers show how many bombs sit next door.',
      'Hit a bomb and the run ends.',
      'Clear every safe tile to win.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-09-18',
  },
  {
    id: 'rps',
    title: 'Hand Duel',
    blurb: 'Rock, paper, scissors — beat the CPU fast.',
    path: '/play/rps',
    accent: '#FF6B6B',
    eta: '1–2 min',
    tag: 'Arcade',
    tags: ['Arcade', 'Quick', 'Reflex'],
    icon: '✊',
    howTo: [
      'Pick rock, paper, or scissors before time runs out.',
      'Win the round to grow your streak and score.',
      'Draws replay the same level.',
      'Three losses or timeouts end the duel.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-09-18',
  },
  {
    id: 'hop',
    title: 'Pad Hop',
    blurb: 'Watch the path light up, then hop it back.',
    path: '/play/hop',
    accent: '#FFC83D',
    eta: '1–3 min',
    tag: 'Memory',
    tags: ['Memory', 'Reflex', 'Focus', 'Quick'],
    icon: '🦶',
    howTo: [
      'Watch the pads light up in order.',
      'When it is your turn, tap the same path.',
      'Paths get longer each clear.',
      'One wrong hop costs a life.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-09-18',
  },
  {
    id: 'sokoban',
    title: 'Crate Push',
    blurb: 'Push every crate onto a goal — plan ahead, no rushing.',
    path: '/play/sokoban',
    accent: '#B45309',
    eta: '5–15 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Focus', 'Brain'],
    icon: '📦',
    howTo: [
      'Swipe on the board or use keyboard arrows to move. You can only push one crate at a time.',
      'Push every crate onto a marked goal tile.',
      'Crates cannot be pulled — think before you shove.',
      'Clear all handcrafted levels for a completion bonus.',
    ],
    isNew: true,
    popularity: 82,
    addedAt: '2026-09-19',
  },
  {
    id: 'watersort',
    title: 'Color Pour',
    blurb: 'Pour colors until each tube is a single shade.',
    path: '/play/watersort',
    accent: '#0284C7',
    eta: '5–12 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Logic', 'Focus', 'Brain'],
    icon: '🧪',
    howTo: [
      'Tap a tube to select it, then tap another to pour.',
      'You can only pour onto the same color, or into an empty tube.',
      'A pour moves the top run of matching color until space runs out.',
      'Sort every tube into one solid color to clear the level.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-09-19',
  },
  {
    id: 'pipes',
    title: 'Pipe Link',
    blurb: 'Rotate pipes until water flows from start to end.',
    path: '/play/pipes',
    accent: '#0D9488',
    eta: '4–10 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Focus'],
    icon: '🔧',
    howTo: [
      'Tap any pipe to rotate it 90°.',
      'Connect the blue start valve to the amber end valve.',
      'Only straight and elbow pipes — line them up to carry the flow.',
      'Clear all maps to finish the campaign — fewer rotates score higher.',
    ],
    isNew: true,
    popularity: 85,
    addedAt: '2026-09-19',
  },
  {
    id: 'nonogram',
    title: 'Dot Grid',
    blurb: 'Paint cells from the number clues — classic picross.',
    path: '/play/nonogram',
    accent: '#7C3AED',
    eta: '5–15 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Logic', 'Focus', 'Brain'],
    icon: '⬛',
    howTo: [
      'Row and column numbers show runs of filled cells.',
      'Tap a cell to fill it; long-press (or use Mark) to X it out.',
      'Match the full picture to clear the puzzle.',
      'Boards grow from 5×5 up to 10×10 across stages.',
    ],
    isNew: true,
    popularity: 84,
    addedAt: '2026-09-19',
  },
  {
    id: 'patches',
    title: 'Flood It',
    blurb: 'Flood the board one color at a time before moves run out.',
    path: '/play/patches',
    accent: '#0D9488',
    eta: '1–3 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Logic', 'Brain', 'Quick'],
    icon: '🌊',
    howTo: [
      'The flood starts from the top-left cell (subtle inset).',
      'Pick a color to recolor the whole connected region from that corner.',
      'Fill the board with one color before moves run out.',
      'Levels are endless — the grid grows and moves tighten as you go.',
    ],
    isNew: true,
    popularity: 80,
    addedAt: '2026-09-24',
  },
  {
    id: 'shooter',
    title: 'Sky Strike',
    blurb: 'Dodge, shoot, and upgrade between waves from above.',
    path: '/play/shooter',
    accent: '#1D4ED8',
    eta: '2–5 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🚀',
    howTo: [
      'Move left/right and shoot enemies falling from above.',
      'Clear the wave kill quota to finish the level.',
      'Pick a gun or ship upgrade before the next stage.',
      'Lose all lives and the run ends — try again for a higher score.',
    ],
    isNew: true,
    popularity: 78,
    addedAt: '2026-09-25',
  },
  {
    id: 'sudoku',
    title: 'Nano Sudoku',
    blurb: 'Fill a 4×4 grid — no repeats in rows, columns, or 2×2 boxes.',
    path: '/play/sudoku',
    accent: '#0369A1',
    eta: '1–3 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Brain', 'Focus'],
    icon: '4️⃣',
    howTo: [
      'Tap an empty cell, then pick a number 1–4.',
      'Each row, column, and 2×2 box may use each digit only once.',
      'Given cells (bold) stay locked — fill the rest to clear.',
      'Higher levels hide more digits. Clear all 5 stages for the run.',
    ],
    isNew: true,
    popularity: 82,
    addedAt: '2026-09-25',
  },
  {
    id: 'match3',
    title: 'Gem Match',
    blurb: 'Swap neighboring gems and clear runs of three or more.',
    path: '/play/match3',
    accent: '#DB2777',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Arcade', 'Brain', 'Quick'],
    icon: '💎',
    howTo: [
      'Tap one gem, then an adjacent gem to swap them.',
      'Match three or more of the same color in a row or column.',
      'Gems fall and refill — chain clears for bigger scores.',
      'Clear the target before moves run out to advance.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-09-25',
  },
  {
    id: 'code',
    title: 'Code Crack',
    blurb: 'Guess the secret color code with peg feedback each try.',
    path: '/play/code',
    accent: '#7C3AED',
    eta: '2–4 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Brain', 'Focus'],
    icon: '🔐',
    howTo: [
      'Build a 4-peg guess from the color palette, then lock it in.',
      'Black means right color in the right spot; white means right color, wrong spot.',
      'Crack the code within the attempt limit to clear the level.',
      'Later stages mix more colors into the secret.',
    ],
    isNew: true,
    popularity: 79,
    addedAt: '2026-09-25',
  },
  {
    id: 'snake',
    title: 'Grid Snake',
    blurb: 'Slither, eat apples, and grow without hitting yourself.',
    path: '/play/snake',
    accent: '#16A34A',
    eta: '1–3 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🐍',
    howTo: [
      'Swipe or use arrow keys to steer the snake.',
      'Eat apples to grow and raise your score.',
      'Hitting a wall or your own body ends the run.',
      'Speed picks up as you clear more apples.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-09-25',
  },
  {
    id: 'stack',
    title: 'Peak Stack',
    blurb: 'Stop the sliding block and stack it as high as you can.',
    path: '/play/stack',
    accent: '#EA580C',
    eta: '1–2 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🏗️',
    howTo: [
      'Tap to drop the moving block onto the tower.',
      'Only the overlapping part stays — miss and the run ends.',
      'Perfect alignments keep full width and boost your combo.',
      'Stack higher for a bigger score before the block shrinks away.',
    ],
    isNew: true,
    popularity: 85,
    addedAt: '2026-09-25',
  },
  {
    id: 'xiangqi',
    title: 'Chinese Chess',
    blurb: 'Xiangqi duel — checkmate the general across the river.',
    path: '/play/xiangqi',
    accent: '#C2410C',
    eta: '5–15 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Brain', 'Focus'],
    icon: '🀄',
    howTo: [
      'You play Red. Tap a piece, then a highlighted square to move.',
      'Generals and advisors stay in the palace; elephants cannot cross the river.',
      'Cannons move like chariots but capture by jumping exactly one piece.',
      'Checkmate the enemy general — facing generals on an open file is illegal.',
    ],
    isNew: true,
    popularity: 93,
    addedAt: '2026-09-25',
  },
  {
    id: 'checkers',
    title: 'Checkers',
    blurb: 'Jump and crown pieces in a classic draughts match.',
    path: '/play/checkers',
    accent: '#B45309',
    eta: '3–10 min',
    tag: 'Logic',
    tags: ['Logic', 'Puzzle', 'Brain', 'Quick'],
    icon: '🟠',
    howTo: [
      'You play red on the dark squares. Men move diagonally forward only.',
      'Jumps are mandatory. Men jump forward; kings jump any diagonal.',
      'Reach the far row to become a king — you may keep jumping if more captures remain.',
      'Capture all CPU pieces or leave them with no moves to win.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-09-25',
  },
  {
    id: 'wordle',
    title: 'Word Nest',
    blurb: 'Guess the five-letter word in six tries with color clues.',
    path: '/play/wordle',
    accent: '#16A34A',
    eta: '2–5 min',
    tag: 'Word',
    tags: ['Word', 'Puzzle', 'Brain', 'Focus'],
    icon: '🟩',
    howTo: [
      'Type a five-letter guess, then hit Enter to lock it in.',
      'Green = right letter, right spot. Yellow = right letter, wrong spot. Gray = not in the word.',
      'You have six tries each level. Win streak rises when you clear a word and resets if you fail.',
      'Stuck? Watch an ad during play to skip to the next word.',
    ],
    isNew: true,
    popularity: 94,
    addedAt: '2026-09-26',
  },
  {
    id: 'solitaire',
    title: 'Klondike',
    blurb: 'Classic solitaire — build foundations from ace to king.',
    path: '/play/solitaire',
    accent: '#0F766E',
    eta: '5–15 min',
    tag: 'Cards',
    tags: ['Cards', 'Puzzle', 'Brain', 'Focus'],
    icon: '🃏',
    howTo: [
      'Tap the stock to flip cards onto the waste pile.',
      'Build tableau columns down in alternating colors; move face-up runs together.',
      'Foundations build up by suit from Ace to King — empty columns take Kings only.',
      'Clear all four foundations to win. Use New deal anytime.',
    ],
    isNew: true,
    popularity: 92,
    addedAt: '2026-09-26',
  },
  {
    id: 'dodge',
    title: 'Meteor Rush',
    blurb: 'Shoot descending foes, dodge their fire, and grow stronger.',
    path: '/play/dodge',
    accent: '#EA580C',
    eta: '2–5 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '☄️',
    howTo: [
      'Drag left/right to steer — your ship auto-fires upward.',
      'Enemies dive from above and shoot back. Dodge their bullets and ramming hits.',
      'You and the enemies grow larger over time. Kills fill your XP bar.',
      'Fill the XP bar to level up and pick an upgrade (damage, fire rate, multishot, and more).',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-09-26',
  },
  {
    id: 'flap',
    title: 'Sky Hop',
    blurb: 'Tap to flap through moving pipe gaps in the sky.',
    path: '/play/flap',
    accent: '#CA8A04',
    eta: '1–2 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🐥',
    howTo: [
      'Tap (or press Space) to flap upward — gravity pulls you down.',
      'Fly through the green gaps. After a few gates, pipes start sliding up and down.',
      'Gaps stay wide enough to fit through — track the opening as it moves.',
      'One crash ends the run — try for a longer streak.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-09-26',
  },
  {
    id: 'breakout',
    title: 'Brick Bash',
    blurb: 'Smash bricks, catch falling power-ups, and dodge bomber foes.',
    path: '/play/breakout',
    accent: '#0891B2',
    eta: '2–5 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🧱',
    howTo: [
      'Slide to move the paddle. Tap once to serve the ball.',
      'Break bricks — power-ups may drop. Catch them: wide, multi-ball, slow, life, fireball, score.',
      'Enemies fly across and drop bombs — dodge or lose a life. Hit enemies with the ball for bonus points.',
      'You have 3 lives. Lose them all and the run restarts from level 1.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-09-26',
  },
  {
    id: 'runner',
    title: 'Lane Rush',
    blurb: 'Switch lanes at speed and dodge the hazards racing toward you.',
    path: '/play/runner',
    accent: '#0E7490',
    eta: '1–3 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🏎️',
    howTo: [
      'Swipe or tap left/right to switch between three lanes.',
      'Obstacles rush toward you — avoid crates, blocks, and spikes.',
      'Later waves spawn two hazards at once and move faster.',
      'Each clear hazard raises your score. Survive for a long streak.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-09-26',
  },
  {
    id: 'climb',
    title: 'Cliff Climb',
    blurb: 'Swap walls and dodge enemies racing down the cliff.',
    path: '/play/climb',
    accent: '#15803D',
    eta: '1–3 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🧗',
    howTo: [
      'Tap anywhere (or press Space) to swap between the left and right walls.',
      'Enemies start after 1 second and pack tighter as you survive — speed ramps up.',
      'Grab glowing specials: 💎 gem (+5 score), 🛡️ shield (block one hit), ❄️ slow-mo.',
      'Swap to the clear wall before an enemy reaches you. Score rises for each dodge.',
    ],
    isNew: true,
    popularity: 84,
    addedAt: '2026-09-26',
  },
  {
    id: 'rally',
    title: 'Paddle Rally',
    blurb: 'Classic court duel — bounce the ball past the CPU paddle.',
    path: '/play/rally',
    accent: '#16A34A',
    eta: '1–3 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🏓',
    howTo: [
      'Drag (or use arrow keys) to move your paddle along the bottom.',
      'Bounce the ball past the yellow CPU paddle to score.',
      'Hit angle depends on where the ball meets your paddle.',
      `First to 7 points wins the match.`,
    ],
    isNew: true,
    popularity: 85,
    addedAt: '2026-09-26',
  },
]

/** Catalog order: action games first, then the classic hub games. */
export const GAMES: GameMeta[] = [...ACTION_INFOS.map((i) => i.meta), ...BASE_GAMES]

/** Original add order — keeps the daily-puzzle pick stable when the catalog is reordered. */
export const GAMES_BY_ADDED: GameMeta[] = [...BASE_GAMES, ...ACTION_INFOS.map((i) => i.meta)]

export function getGame(id: GameId): GameMeta {
  const game = GAMES.find((g) => g.id === id)
  if (!game) throw new Error(`Unknown game: ${id}`)
  return game
}

export function searchGames(query: string): GameMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return GAMES
  return GAMES.filter((game) => {
    const haystack = [game.title, game.blurb, game.tag, game.icon, ...game.tags]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}
