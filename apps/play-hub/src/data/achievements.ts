import { GAMES, type GameId } from './games'

export type AchievementId =
  | 'first_play'
  | 'plays_10'
  | 'plays_50'
  | 'daily_clear'
  | 'streak_3'
  | 'streak_7'
  | 'checkin_7'
  | 'checkin_30'
  | 'favorite_1'
  | 'explore_all'
  | 'score_hunter'
  | 'sequence_5'
  | 'arcade_10m'
  | 'arcade_1h'
  | 'arcade_5h'
  | 'arcade_explorer'

export type AchievementDef = {
  id: AchievementId
  title: string
  description: string
  xp: number
  icon: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_play',
    title: 'First Move',
    description: 'Finish your first mini-game session.',
    xp: 20,
    icon: '▶',
  },
  {
    id: 'plays_10',
    title: 'Warming Up',
    description: 'Reach 10 total plays across the hub.',
    xp: 40,
    icon: '10',
  },
  {
    id: 'plays_50',
    title: 'Puzzle Regular',
    description: 'Hit 50 total plays.',
    xp: 80,
    icon: '50',
  },
  {
    id: 'daily_clear',
    title: 'Daily Hero',
    description: 'Clear today’s featured puzzle once.',
    xp: 30,
    icon: '☀',
  },
  {
    id: 'streak_3',
    title: 'On a Roll',
    description: 'Keep a 3-day daily streak.',
    xp: 35,
    icon: '3',
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Keep a 7-day daily streak.',
    xp: 70,
    icon: '7',
  },
  {
    id: 'checkin_7',
    title: 'Check-in Club',
    description: 'Check in on 7 different days.',
    xp: 40,
    icon: '✓',
  },
  {
    id: 'checkin_30',
    title: 'Month Master',
    description: 'Fill 30 check-in days.',
    xp: 120,
    icon: '30',
  },
  {
    id: 'favorite_1',
    title: 'Heart Picked',
    description: 'Save a game to favorites.',
    xp: 15,
    icon: '♥',
  },
  {
    id: 'explore_all',
    title: 'Tour Guide',
    description: 'Play every mini-game in the hub at least once.',
    xp: 50,
    icon: '★',
  },
  {
    id: 'score_hunter',
    title: 'Score Hunter',
    description: 'Reach 500+ best score in Merge 2048.',
    xp: 45,
    icon: '↑',
  },
  {
    id: 'sequence_5',
    title: 'Pulse Pro',
    description: 'Reach level 5 in Pulse Sequence.',
    xp: 45,
    icon: '◎',
  },
  {
    id: 'arcade_10m',
    title: 'Arcade Regular',
    description: 'Spend 10 minutes in action games.',
    xp: 40,
    icon: '🕹️',
  },
  {
    id: 'arcade_1h',
    title: 'Arcade Addict',
    description: 'Spend a full hour in action games.',
    xp: 120,
    icon: '⏱️',
  },
  {
    id: 'arcade_5h',
    title: 'Arcade Legend',
    description: 'Spend 5 hours in action games.',
    xp: 300,
    icon: '👑',
  },
  {
    id: 'arcade_explorer',
    title: 'Action Explorer',
    description: 'Try 20 different action games.',
    xp: 100,
    icon: '🧭',
  },
]

export function getAchievement(id: AchievementId): AchievementDef {
  const item = ACHIEVEMENTS.find((a) => a.id === id)
  if (!item) throw new Error(`Unknown achievement: ${id}`)
  return item
}

export type ProgressSnapshot = {
  streak: number
  totalPlays: number
  checkInCount: number
  favorites: GameId[]
  games: Record<GameId, { plays: number; bestScore: number; seconds?: number }>
  playedIds: GameId[]
}

export function evaluateAchievements(snapshot: ProgressSnapshot): AchievementId[] {
  const unlocked: AchievementId[] = []

  if (snapshot.totalPlays >= 1) unlocked.push('first_play')
  if (snapshot.totalPlays >= 10) unlocked.push('plays_10')
  if (snapshot.totalPlays >= 50) unlocked.push('plays_50')
  if (snapshot.streak >= 1) unlocked.push('daily_clear')
  if (snapshot.streak >= 3) unlocked.push('streak_3')
  if (snapshot.streak >= 7) unlocked.push('streak_7')
  if (snapshot.checkInCount >= 7) unlocked.push('checkin_7')
  if (snapshot.checkInCount >= 30) unlocked.push('checkin_30')
  if (snapshot.favorites.length >= 1) unlocked.push('favorite_1')
  if (snapshot.playedIds.length >= GAMES.length) unlocked.push('explore_all')
  if ((snapshot.games['2048']?.bestScore ?? 0) >= 500) unlocked.push('score_hunter')
  if ((snapshot.games.sequence?.bestScore ?? 0) >= 5) unlocked.push('sequence_5')

  const arcadeSeconds = Object.values(snapshot.games).reduce((sum, g) => sum + (g.seconds ?? 0), 0)
  if (arcadeSeconds >= 600) unlocked.push('arcade_10m')
  if (arcadeSeconds >= 3600) unlocked.push('arcade_1h')
  if (arcadeSeconds >= 18000) unlocked.push('arcade_5h')
  const actionPlayed = snapshot.playedIds.filter((id) => GAMES.find((g) => g.id === id)?.tag === 'Action').length
  if (actionPlayed >= 20) unlocked.push('arcade_explorer')

  return unlocked
}
