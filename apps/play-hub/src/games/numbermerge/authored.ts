import type { AuthoredLevel } from './levels'

/**
 * Hand-designed Number Merge levels. Board tokens: '.' empty, '#' blocked, 'S' stone, number = tile.
 * Arc: 1–5 merging & chains, 6–10 stones, 11–15 shaped boards, 16–20 rainbow jokers, 21–25 bombs,
 * 26–30 everything. Every 5th level is HARD. `par` = placements for 3 stars, set from a beam-search
 * solution of the level's fixed piece sequence (so every level is verified clearable).
 */
export const AUTHORED: AuthoredLevel[] = [
  {
    name: 'First Merge', goal: 16, pool: [2, 4], seed: 1, opening: '2 2 4 2 4', par: 6, tip: 'tap a cell next to an equal block',
    board: ['. . . . .', '. 2 . 4 .', '. . . . .', '. 4 . 2 .', '. . . . .'],
  },
  {
    name: 'Chain Reaction', goal: 32, pool: [2, 4], seed: 2, opening: '2', par: 4, tip: 'merges chain — find the magic cell',
    board: ['. . . . .', '. . 4 . .', '. 2 . 8 .', '. . 16 . .', '. . . . .'],
  },
  {
    name: 'Triple Up', goal: 64, pool: [2, 4], seed: 3, opening: '4 2 2', par: 12, tip: '3 equal blocks merge into a 4× block',
    board: ['. . . . .', '. 4 . 4 .', '. . 16 . .', '. 2 . 2 .', '. . . . .'],
  },
  {
    name: 'Corner Plan', goal: 64, pool: [2, 4, 8], seed: 4, par: 18, tip: 'build big numbers in a corner',
    board: ['. . . . .', '. . . . .', '. . 4 . .', '. . . . .', '8 . . . .'],
  },
  {
    name: 'Century', goal: 128, pool: [2, 4, 8, 16], seed: 5, par: 31,
    board: ['2 . 8 . 4', '. 4 . 2 .', '8 . . . 8', '. 2 . 4 .', '4 . 8 . 2'],
  },
  {
    name: 'Stone Wall', goal: 64, pool: [2, 4, 8], seed: 6, par: 18, tip: 'merges crack nearby stones — twice breaks them',
    board: ['. . . . .', 'S S . S S', '. . . . .', '. 4 . 8 .', '. . . . .'],
  },
  {
    name: 'Quarry', goal: 128, pool: [4, 8, 16], seed: 7, par: 23,
    board: ['S . . . S', '. 2 . 4 .', '. . S . .', '. 8 . 2 .', 'S . . . S'],
  },
  {
    name: 'Rock Garden', goal: 128, pool: [4, 8, 16], seed: 8, par: 18,
    board: ['. . . . .', '. S S S .', '. S 16 S .', '. S . S .', '. . . . .'],
  },
  {
    name: 'Boulder Pass', goal: 128, pool: [4, 8, 16], seed: 9, par: 10, tip: 'break a path through the rocks',
    board: ['S S . S S', 'S 8 . 4 S', '. . . . .', 'S 2 . 16 S', 'S S . S S'],
  },
  {
    name: 'Landslide', goal: 512, pool: [8, 16, 32], seed: 10, par: 58,
    board: ['S . 4 . S', '. 8 . 2 .', '4 . S . 8', '. 2 . 16 .', 'S . 8 . S'],
  },
  {
    name: 'Plus Sign', goal: 128, pool: [2, 4, 8], seed: 11, par: 32, tip: 'dark cells can’t hold blocks',
    board: ['# . . . #', '. . 4 . .', '. 8 . 2 .', '. . . . .', '# . . . #'],
  },
  {
    name: 'Donut', goal: 128, pool: [4, 8, 16], seed: 12, par: 19,
    board: ['. . . . .', '. 2 . 4 .', '. . # . .', '. 8 . . .', '. . . . .'],
  },
  {
    name: 'Hourglass', goal: 128, pool: [4, 8, 16], seed: 13, par: 32,
    board: ['. . . 4 .', '# . 8 . #', '# . . . #', '# . 2 . #', '. 16 . . .'],
  },
  {
    name: 'Zigzag', goal: 256, pool: [8, 16, 32], seed: 14, par: 28,
    board: ['. . # . .', '. 4 . 8 #', '# . . . .', '. 2 . 16 #', '. . # . .'],
  },
  {
    name: 'Fortress', goal: 512, pool: [16, 32, 64], seed: 15, par: 38,
    board: ['# S . S #', 'S . 8 . S', '. 4 # 16 .', 'S . 32 . S', '# S . S #'],
  },
  {
    name: 'Wild Card', goal: 128, pool: [2, 4, 8], seed: 16, opening: 'J', jokerEvery: 5, par: 9, tip: 'a rainbow joker copies its best neighbour',
    board: ['. . . . .', '. 8 . 8 .', '. . . . .', '. 4 2 4 .', '. . . . .'],
  },
  {
    name: 'Jester', goal: 256, pool: [4, 8, 16], seed: 17, jokerEvery: 6, par: 18,
    board: ['4 . . . 8', '. 16 . 4 .', '. . . . .', '. 8 . 32 .', '8 . . . 4'],
  },
  {
    name: 'Joker Quarry', goal: 256, pool: [4, 8, 16], seed: 18, jokerEvery: 6, par: 18,
    board: ['S . . . S', '. S 16 S .', '. . . . .', '. S 8 S .', 'S . . . S'],
  },
  {
    name: 'Joker Ring', goal: 256, pool: [4, 8, 16], seed: 19, jokerEvery: 7, par: 21,
    board: ['8 . . . 4', '. . 16 . .', '. 4 # 8 .', '. . 32 . .', '4 . . . 8'],
  },
  {
    name: 'Royal Flush', goal: 1024, pool: [4, 8, 16], seed: 20, jokerEvery: 8, par: 34,
    board: ['# . S . #', '. 16 . 32 .', 'S . 4 . S', '. 8 . 64 .', '# . S . #'],
  },
  {
    name: 'Demolition', goal: 128, pool: [4, 8, 16], seed: 21, opening: 'B', bombEvery: 8, par: 28, tip: 'bombs blast a 3×3 area — clear the clutter',
    board: ['S 2 S 4 S', '8 S 4 S 2', 'S 4 S 2 S', '. . . . .', '. . 16 . .'],
  },
  {
    name: 'Blast Mine', goal: 256, pool: [8, 16, 32], seed: 22, bombEvery: 9, par: 25,
    board: ['S S . S S', 'S 8 . 4 S', '. . . . .', 'S 4 . 32 S', 'S S . S S'],
  },
  {
    name: 'Narrow Way', goal: 256, pool: [8, 16, 32], seed: 23, bombEvery: 10, par: 17,
    board: ['# . . . #', '# . 8 . #', '# . . . #', '# 16 . 4 #', '# . . . #'],
  },
  {
    name: 'Minefield', goal: 512, pool: [4, 8, 16], seed: 24, jokerEvery: 7, bombEvery: 11, par: 21,
    board: ['S . 8 . S', '. 32 . 4 .', '16 . S . 16', '. 4 . 64 .', 'S . 8 . S'],
  },
  {
    name: 'Big Bang', goal: 1024, pool: [8, 16, 32], seed: 25, jokerEvery: 8, bombEvery: 12, par: 44,
    board: ['S . . . S', '. 64 . 16 .', '. . # . .', '. 32 . 128 .', 'S . . . S'],
  },
  {
    name: 'Cool Down', goal: 256, pool: [8, 16, 32], seed: 26, par: 18,
    board: ['. . . . .', '. 16 . . .', '. . . . .', '. . . 64 .', '. . . . .'],
  },
  {
    name: 'Spiral', goal: 512, pool: [8, 16, 32], seed: 27, jokerEvery: 9, par: 26,
    board: ['. . . . .', '# # # # .', '. 32 . # .', '. # # # .', '. 64 . . .'],
  },
  {
    name: 'Checkmate', goal: 1024, pool: [16, 32, 64], seed: 28, bombEvery: 10, par: 48,
    board: ['S . S . S', '. 32 . 16 .', 'S . 64 . S', '. 16 . 32 .', 'S . S . S'],
  },
  {
    name: 'Gauntlet', goal: 1024, pool: [16, 32, 64], seed: 29, jokerEvery: 8, bombEvery: 13, par: 23,
    board: ['# S . S #', '. 64 . 128 .', '. . # . .', '. 32 . 64 .', '# S . S #'],
  },
  {
    name: 'Grand Total', goal: 4096, pool: [16, 32, 64], seed: 30, jokerEvery: 9, bombEvery: 14, par: 38, tip: 'the final sum — make 4096!',
    board: ['S . # . S', '. 128 . 64 .', '# . S . #', '. 256 . 512 .', 'S . # . S'],
  },
]
