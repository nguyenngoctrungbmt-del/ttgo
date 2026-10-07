export type QuestPeriod = 'daily' | 'weekly'

export type QuestGoalType = 'plays' | 'clears' | 'clear_daily' | 'check_in' | 'distinct_games'

export type QuestDef = {
  id: string
  period: QuestPeriod
  title: string
  blurb: string
  icon: string
  goalType: QuestGoalType
  target: number
  xpReward: number
}

export const DAILY_QUESTS: QuestDef[] = [
  {
    id: 'd_plays',
    period: 'daily',
    title: 'Warm-up plays',
    blurb: 'Play any 3 games today.',
    icon: '▶',
    goalType: 'plays',
    target: 3,
    xpReward: 30,
  },
  {
    id: 'd_clear',
    period: 'daily',
    title: 'One clear',
    blurb: 'Clear any game once today.',
    icon: '✓',
    goalType: 'clears',
    target: 1,
    xpReward: 40,
  },
  {
    id: 'd_featured',
    period: 'daily',
    title: 'Daily puzzle',
    blurb: 'Clear today’s featured puzzle.',
    icon: '⭐',
    goalType: 'clear_daily',
    target: 1,
    xpReward: 50,
  },
  {
    id: 'd_login',
    period: 'daily',
    title: 'Daily login',
    blurb: 'Claim your 7-day login reward.',
    icon: '📅',
    goalType: 'check_in',
    target: 1,
    xpReward: 25,
  },
]

export const WEEKLY_QUESTS: QuestDef[] = [
  {
    id: 'w_plays',
    period: 'weekly',
    title: 'Play streak week',
    blurb: 'Finish 15 play sessions this week.',
    icon: '🔥',
    goalType: 'plays',
    target: 15,
    xpReward: 100,
  },
  {
    id: 'w_clears',
    period: 'weekly',
    title: 'Clear five',
    blurb: 'Clear any game 5 times this week.',
    icon: '🏆',
    goalType: 'clears',
    target: 5,
    xpReward: 120,
  },
  {
    id: 'w_variety',
    period: 'weekly',
    title: 'Try something new',
    blurb: 'Play 5 different games this week.',
    icon: '🎲',
    goalType: 'distinct_games',
    target: 5,
    xpReward: 100,
  },
]

export const ALL_QUESTS: QuestDef[] = [...DAILY_QUESTS, ...WEEKLY_QUESTS]

export function getQuest(id: string): QuestDef | undefined {
  return ALL_QUESTS.find((q) => q.id === id)
}

export function questsForPeriod(period: QuestPeriod): QuestDef[] {
  return period === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS
}
