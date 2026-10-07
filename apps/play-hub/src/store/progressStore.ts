import { create } from 'zustand'
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  type AchievementId,
} from '../data/achievements'
import { GAMES, GAMES_BY_ADDED, type GameId } from '../data/games'
import { LOGIN_CYCLE_DAYS, loginXpForDay } from '../data/loginRewards'
import {
  MISSIONS_PER_TIER,
  getMission,
  missionsFor,
  type MissionDef,
} from '../data/missions'
import {
  ALL_QUESTS,
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  getQuest,
  type QuestDef,
} from '../data/quests'
import { dailyIndex, todayKey, weekKey, yesterdayKey } from '../shared/date'
import { upgradePrice } from '../data/actionKit'
import { dailyChallenges, type DailyChallenge } from '../data/dailyAction'
import { actionInfo } from '../games/registry'
import { loadJson, saveJson } from '../shared/storage'
import { onGameSessionEnded } from '../ads/admob'
import { trackEvent } from '../analytics/analytics'

export type GameStats = {
  plays: number
  bestScore: number
  lastPlayedAt?: string
  clearedToday?: string
  /** Total seconds spent in runs (action games). */
  seconds?: number
}

export type ActionRunReport = {
  score: number
  cleared: boolean
  stats: Record<string, number>
  coins: number
  seconds: number
  revived: boolean
}

export type ActionRunResult = {
  fresh: string[]
  newBest: boolean
  prevBest: number
  coins: number
  daily: DailyChallenge | null
}

type Persisted = {
  streak: number
  lastDailyClear?: string
  games: Record<GameId, GameStats>
  favorites: GameId[]
  recent: GameId[]
  checkIns: string[]
  achievements: AchievementId[]
  xp: number
  /** Last claimed day in the 7-day cycle (1–7). 0 = never. */
  loginDay: number
  lastLoginDate?: string
  /** Date the login bonus ad was claimed. */
  loginBonusDate?: string
  /** Quest period keys — reset counters when they change. */
  questDailyKey?: string
  questWeeklyKey?: string
  questCounts: Record<string, number>
  questClaimed: string[]
  questAdClaimed: string[]
  /** Distinct games played in the current week (for variety quest). */
  questWeekGames: GameId[]
  /** Per-game mission progress (best for run missions, sum for total missions). */
  missionProgress: Record<string, number>
  missionClaimed: string[]
  /** Arcade wallet earned in action games, spent on permanent upgrades. */
  coins: number
  /** Upgrade levels keyed `${game}:${upgradeId}`. */
  upgrades: Record<string, number>
  dailyActionKey?: string
  /** Games whose daily action challenge is done today. */
  dailyActionDone: GameId[]
  /** Level-based games: highest cleared level and best stars per level (index = level - 1). */
  levelProgress: Record<string, LevelRecord>
}

export type LevelRecord = { cleared: number; stars: number[] }

export type LevelClearResult = { firstClear: boolean; improved: boolean; cleared: number }

export type MissionView = {
  mission: MissionDef
  progress: number
  complete: boolean
  claimed: boolean
}

export type MissionBoard = {
  /** Current tier (1-based); equals tiers + 1 when everything is claimed. */
  tier: number
  tiers: number
  views: MissionView[]
  allDone: boolean
  ready: number
}

export type LoginClaimResult =
  | { ok: true; already: false; day: number; xpGain: number }
  | { ok: false; already: true; day: number; xpGain: 0 }

export type LoginBonusResult =
  | { ok: true; xpGain: number }
  | { ok: false; reason: 'claim_first' | 'already' | 'invalid' }

export type LoginView = {
  claimedToday: boolean
  bonusClaimedToday: boolean
  nextDay: number
  nextXp: number
  /** Days 1..N already claimed in the current cycle (for UI). */
  completedThrough: number
}

export type QuestClaimResult =
  | { ok: true; already: false; xpGain: number }
  | { ok: false; reason: 'incomplete' | 'already' | 'unknown' }

export type QuestAdResult =
  | { ok: true; xpGain: number }
  | { ok: false; reason: 'claim_first' | 'already' | 'incomplete' | 'unknown' | 'invalid' }

export type QuestView = {
  quest: QuestDef
  progress: number
  target: number
  complete: boolean
  claimed: boolean
  adClaimed: boolean
}

type ProgressState = Persisted & {
  hydrated: boolean
  hydrate: () => Promise<void>
  recordPlay: (id: GameId, score: number, cleared: boolean) => void
  grantXp: (amount: number) => void
  toggleFavorite: (id: GameId) => void
  checkInToday: () => LoginClaimResult
  claimLoginReward: () => LoginClaimResult
  claimLoginAdBonus: (xp: number) => LoginBonusResult
  loginView: () => LoginView
  questViews: () => QuestView[]
  claimQuestReward: (id: string) => QuestClaimResult
  claimQuestAdBonus: (id: string, xp: number) => QuestAdResult
  /** Feed a finished run's stats into the game's missions; returns newly completed ids. */
  reportRun: (game: GameId, stats: Record<string, number>) => string[]
  claimMission: (id: string) => number
  /** Commit a finished action run: play record, missions, coins, playtime, daily challenge, analytics. */
  commitActionRun: (game: GameId, report: ActionRunReport) => ActionRunResult
  buyUpgrade: (game: GameId, upgradeId: string) => boolean
  upgradeLevel: (game: GameId, upgradeId: string) => number
  dailyActionDoneToday: () => GameId[]
  /** Record a cleared level (stars 0–3). Unlocks the next level and keeps the best stars. */
  completeLevel: (game: GameId, level: number, stars: number) => LevelClearResult
  todayGameId: () => GameId
  level: () => number
  xpIntoLevel: () => { current: number; need: number; level: number }
}

const STORAGE_KEY = 'ttgo.playhub.progress.v2'
const XP_PER_LEVEL = 100

const emptyGames = (): Record<GameId, GameStats> =>
  Object.fromEntries(GAMES.map((g) => [g.id, { plays: 0, bestScore: 0 }])) as Record<
    GameId,
    GameStats
  >

function persistSlice(state: ProgressState): Persisted {
  return {
    streak: state.streak,
    lastDailyClear: state.lastDailyClear,
    games: state.games,
    favorites: state.favorites,
    recent: state.recent,
    checkIns: state.checkIns,
    achievements: state.achievements,
    xp: state.xp,
    loginDay: state.loginDay,
    lastLoginDate: state.lastLoginDate,
    loginBonusDate: state.loginBonusDate,
    questDailyKey: state.questDailyKey,
    questWeeklyKey: state.questWeeklyKey,
    questCounts: state.questCounts,
    questClaimed: state.questClaimed,
    questAdClaimed: state.questAdClaimed,
    questWeekGames: state.questWeekGames,
    missionProgress: state.missionProgress,
    missionClaimed: state.missionClaimed,
    coins: state.coins,
    upgrades: state.upgrades,
    dailyActionKey: state.dailyActionKey,
    dailyActionDone: state.dailyActionDone,
    levelProgress: state.levelProgress,
  }
}

export function buildMissionBoard(
  game: GameId,
  progress: Record<string, number>,
  claimed: string[],
): MissionBoard {
  const all = missionsFor(game)
  const tiers = Math.ceil(all.length / MISSIONS_PER_TIER)
  const toView = (mission: MissionDef): MissionView => {
    const p = Math.min(mission.target, progress[mission.id] ?? 0)
    return {
      mission,
      progress: p,
      complete: p >= mission.target,
      claimed: claimed.includes(mission.id),
    }
  }
  let tier = 1
  while (tier <= tiers && all.filter((m) => m.tier === tier).every((m) => claimed.includes(m.id))) {
    tier += 1
  }
  const allDone = tier > tiers
  const views = all.filter((m) => m.tier === (allDone ? tiers : tier)).map(toView)
  return {
    tier,
    tiers,
    views,
    allDone,
    ready: views.filter((v) => v.complete && !v.claimed).length,
  }
}

type QuestSlice = Pick<
  Persisted,
  | 'questDailyKey'
  | 'questWeeklyKey'
  | 'questCounts'
  | 'questClaimed'
  | 'questAdClaimed'
  | 'questWeekGames'
>

function stripQuestIds(ids: string[], period: 'daily' | 'weekly'): string[] {
  const keep = new Set(
    (period === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS).map((q) => q.id),
  )
  return ids.filter((id) => !keep.has(id))
}

function stripQuestCounts(
  counts: Record<string, number>,
  period: 'daily' | 'weekly',
): Record<string, number> {
  const drop = new Set(
    (period === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS).map((q) => q.id),
  )
  const next: Record<string, number> = {}
  for (const [id, value] of Object.entries(counts)) {
    if (!drop.has(id)) next[id] = value
  }
  return next
}

/** Reset daily/weekly quest counters when the period rolls over. */
function syncQuestPeriods(slice: QuestSlice): QuestSlice {
  const today = todayKey()
  const week = weekKey()
  let { questCounts, questClaimed, questAdClaimed, questWeekGames } = slice
  let questDailyKey = slice.questDailyKey
  let questWeeklyKey = slice.questWeeklyKey

  if (questDailyKey !== today) {
    questCounts = stripQuestCounts(questCounts, 'daily')
    questClaimed = stripQuestIds(questClaimed, 'daily')
    questAdClaimed = stripQuestIds(questAdClaimed, 'daily')
    questDailyKey = today
  }

  if (questWeeklyKey !== week) {
    questCounts = stripQuestCounts(questCounts, 'weekly')
    questClaimed = stripQuestIds(questClaimed, 'weekly')
    questAdClaimed = stripQuestIds(questAdClaimed, 'weekly')
    questWeekGames = []
    questWeeklyKey = week
  }

  return {
    questDailyKey,
    questWeeklyKey,
    questCounts,
    questClaimed,
    questAdClaimed,
    questWeekGames,
  }
}

function bumpQuest(
  counts: Record<string, number>,
  id: string,
  amount = 1,
  cap?: number,
): Record<string, number> {
  const prev = counts[id] ?? 0
  const next = cap != null ? Math.min(cap, prev + amount) : prev + amount
  if (next === prev) return counts
  return { ...counts, [id]: next }
}

function applyPlayQuests(
  slice: QuestSlice,
  gameId: GameId,
  cleared: boolean,
  dailyGameId: GameId,
): QuestSlice {
  const synced = syncQuestPeriods(slice)
  let { questCounts, questWeekGames } = synced

  for (const q of ALL_QUESTS) {
    if (q.goalType === 'plays') {
      questCounts = bumpQuest(questCounts, q.id, 1, q.target)
    }
    if (cleared && q.goalType === 'clears') {
      questCounts = bumpQuest(questCounts, q.id, 1, q.target)
    }
    if (cleared && gameId === dailyGameId && q.goalType === 'clear_daily') {
      questCounts = bumpQuest(questCounts, q.id, 1, q.target)
    }
  }

  if (!questWeekGames.includes(gameId)) {
    questWeekGames = [...questWeekGames, gameId]
    const variety = ALL_QUESTS.find((q) => q.goalType === 'distinct_games')
    if (variety) {
      questCounts = {
        ...questCounts,
        [variety.id]: Math.min(variety.target, questWeekGames.length),
      }
    }
  }

  return { ...synced, questCounts, questWeekGames }
}

function applyCheckInQuest(slice: QuestSlice): QuestSlice {
  const synced = syncQuestPeriods(slice)
  let { questCounts } = synced
  for (const q of ALL_QUESTS) {
    if (q.goalType === 'check_in') {
      questCounts = bumpQuest(questCounts, q.id, 1, q.target)
    }
  }
  return { ...synced, questCounts }
}

function buildQuestViews(slice: QuestSlice): QuestView[] {
  const synced = syncQuestPeriods(slice)
  return ALL_QUESTS.map((quest) => {
    const progress = Math.min(quest.target, synced.questCounts[quest.id] ?? 0)
    const complete = progress >= quest.target
    return {
      quest,
      progress,
      target: quest.target,
      complete,
      claimed: synced.questClaimed.includes(quest.id),
      adClaimed: synced.questAdClaimed.includes(quest.id),
    }
  })
}

function computeLoginView(
  loginDay: number,
  lastLoginDate: string | undefined,
  loginBonusDate: string | undefined,
): LoginView {
  const today = todayKey()
  const yesterday = yesterdayKey()
  const claimedToday = lastLoginDate === today
  const bonusClaimedToday = loginBonusDate === today
  const continued = lastLoginDate === yesterday || claimedToday

  if (!lastLoginDate || (!continued && !claimedToday)) {
    return {
      claimedToday: false,
      bonusClaimedToday: false,
      nextDay: 1,
      nextXp: loginXpForDay(1),
      completedThrough: 0,
    }
  }

  if (claimedToday) {
    return {
      claimedToday: true,
      bonusClaimedToday,
      nextDay: loginDay,
      nextXp: loginXpForDay(loginDay),
      completedThrough: loginDay,
    }
  }

  const nextDay = loginDay >= LOGIN_CYCLE_DAYS ? 1 : loginDay + 1
  return {
    claimedToday: false,
    bonusClaimedToday: false,
    nextDay,
    nextXp: loginXpForDay(nextDay),
    completedThrough: loginDay >= LOGIN_CYCLE_DAYS ? 0 : loginDay,
  }
}

function nextStreak(
  prev: Pick<Persisted, 'streak' | 'lastDailyClear'>,
  clearedToday: boolean,
): Pick<Persisted, 'streak' | 'lastDailyClear'> {
  if (!clearedToday) {
    return { streak: prev.streak, lastDailyClear: prev.lastDailyClear }
  }

  const today = todayKey()
  if (prev.lastDailyClear === today) {
    return { streak: prev.streak, lastDailyClear: today }
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const continued = prev.lastDailyClear === todayKey(yesterday)

  return {
    streak: continued ? prev.streak + 1 : 1,
    lastDailyClear: today,
  }
}

function mergeAchievements(
  current: AchievementId[],
  snapshot: Parameters<typeof evaluateAchievements>[0],
  xp: number,
): { achievements: AchievementId[]; xp: number; gained: AchievementId[] } {
  const nextIds = evaluateAchievements(snapshot)
  const gained = nextIds.filter((id) => !current.includes(id))
  const bonus = gained.reduce((sum, id) => {
    const def = ACHIEVEMENTS.find((a) => a.id === id)
    return sum + (def?.xp ?? 0)
  }, 0)

  return {
    achievements: Array.from(new Set([...current, ...nextIds])),
    xp: xp + bonus,
    gained,
  }
}

function buildSnapshot(state: {
  streak: number
  games: Record<GameId, GameStats>
  favorites: GameId[]
  checkIns: string[]
}): Parameters<typeof evaluateAchievements>[0] {
  const totalPlays = Object.values(state.games).reduce((sum, g) => sum + g.plays, 0)
  const playedIds = GAMES.map((g) => g.id).filter((id) => (state.games[id]?.plays ?? 0) > 0)

  return {
    streak: state.streak,
    totalPlays,
    checkInCount: state.checkIns.length,
    favorites: state.favorites,
    games: state.games,
    playedIds,
  }
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  hydrated: false,
  streak: 0,
  lastDailyClear: undefined,
  games: emptyGames(),
  favorites: [],
  recent: [],
  checkIns: [],
  achievements: [],
  xp: 0,
  loginDay: 0,
  lastLoginDate: undefined,
  loginBonusDate: undefined,
  questDailyKey: undefined,
  questWeeklyKey: undefined,
  questCounts: {},
  questClaimed: [],
  questAdClaimed: [],
  questWeekGames: [],
  missionProgress: {},
  missionClaimed: [],
  coins: 0,
  upgrades: {},
  dailyActionKey: undefined,
  dailyActionDone: [],
  levelProgress: {},

  hydrate: async () => {
    const data = await loadJson<Partial<Persisted>>(STORAGE_KEY, {})
    const questSlice = syncQuestPeriods({
      questDailyKey: data.questDailyKey,
      questWeeklyKey: data.questWeeklyKey,
      questCounts: data.questCounts ?? {},
      questClaimed: data.questClaimed ?? [],
      questAdClaimed: data.questAdClaimed ?? [],
      questWeekGames: data.questWeekGames ?? [],
    })
    set({
      hydrated: true,
      streak: data.streak ?? 0,
      lastDailyClear: data.lastDailyClear,
      games: { ...emptyGames(), ...data.games },
      favorites: data.favorites ?? [],
      recent: data.recent ?? [],
      checkIns: data.checkIns ?? [],
      achievements: data.achievements ?? [],
      xp: data.xp ?? 0,
      loginDay: typeof data.loginDay === 'number' ? data.loginDay : 0,
      lastLoginDate: data.lastLoginDate,
      loginBonusDate: data.loginBonusDate,
      missionProgress: data.missionProgress ?? {},
      missionClaimed: data.missionClaimed ?? [],
      coins: data.coins ?? 0,
      upgrades: data.upgrades ?? {},
      dailyActionKey: data.dailyActionKey,
      dailyActionDone: data.dailyActionKey === todayKey() ? (data.dailyActionDone ?? []) : [],
      levelProgress: data.levelProgress ?? {},
      ...questSlice,
    })
  },

  recordPlay: (id, score, cleared) => {
    const state = get()
    const current = state.games[id] ?? { plays: 0, bestScore: 0 }
    const today = todayKey()

    const games: Record<GameId, GameStats> = {
      ...state.games,
      [id]: {
        plays: current.plays + 1,
        bestScore: Math.max(current.bestScore, score),
        lastPlayedAt: new Date().toISOString(),
        clearedToday: cleared ? today : current.clearedToday,
      },
    }

    const recent = [id, ...state.recent.filter((g) => g !== id)].slice(0, 8)
    const dailyId = state.todayGameId()
    const streakUpdate = nextStreak(state, cleared && id === dailyId)
    const questUpdate = applyPlayQuests(
      {
        questDailyKey: state.questDailyKey,
        questWeeklyKey: state.questWeeklyKey,
        questCounts: state.questCounts,
        questClaimed: state.questClaimed,
        questAdClaimed: state.questAdClaimed,
        questWeekGames: state.questWeekGames,
      },
      id,
      cleared,
      dailyId,
    )

    let xp = state.xp + 8 + Math.min(Math.floor(score / 50), 20)
    if (cleared) xp += 12

    const achievementUpdate = mergeAchievements(
      state.achievements,
      buildSnapshot({
        streak: streakUpdate.streak,
        games,
        favorites: state.favorites,
        checkIns: state.checkIns,
      }),
      xp,
    )

    const next = {
      ...streakUpdate,
      ...questUpdate,
      games,
      recent,
      achievements: achievementUpdate.achievements,
      xp: achievementUpdate.xp,
    }

    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
    void onGameSessionEnded()
    void trackEvent('game_complete', {
      game_id: id,
      score,
      cleared: cleared ? 1 : 0,
    })
  },

  grantXp: (amount) => {
    if (amount <= 0) return
    const state = get()
    const xp = state.xp + amount
    const achievementUpdate = mergeAchievements(
      state.achievements,
      buildSnapshot({
        streak: state.streak,
        games: state.games,
        favorites: state.favorites,
        checkIns: state.checkIns,
      }),
      xp,
    )
    const next = {
      xp: achievementUpdate.xp,
      achievements: achievementUpdate.achievements,
    }
    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
  },

  toggleFavorite: (id) => {
    const state = get()
    const favorites = state.favorites.includes(id)
      ? state.favorites.filter((g) => g !== id)
      : [...state.favorites, id]

    const achievementUpdate = mergeAchievements(
      state.achievements,
      buildSnapshot({
        streak: state.streak,
        games: state.games,
        favorites,
        checkIns: state.checkIns,
      }),
      state.xp,
    )

    const next = {
      favorites,
      achievements: achievementUpdate.achievements,
      xp: achievementUpdate.xp,
    }

    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
  },

  checkInToday: () => get().claimLoginReward(),

  claimLoginReward: () => {
    const state = get()
    const view = computeLoginView(state.loginDay, state.lastLoginDate, state.loginBonusDate)
    if (view.claimedToday) {
      return { ok: false, already: true, day: view.nextDay, xpGain: 0 }
    }

    const today = todayKey()
    const day = view.nextDay
    const xpGain = view.nextXp
    const checkIns = state.checkIns.includes(today)
      ? state.checkIns
      : [today, ...state.checkIns].slice(0, 120)
    let xp = state.xp + xpGain

    const questUpdate = applyCheckInQuest({
      questDailyKey: state.questDailyKey,
      questWeeklyKey: state.questWeeklyKey,
      questCounts: state.questCounts,
      questClaimed: state.questClaimed,
      questAdClaimed: state.questAdClaimed,
      questWeekGames: state.questWeekGames,
    })

    const achievementUpdate = mergeAchievements(
      state.achievements,
      buildSnapshot({
        streak: state.streak,
        games: state.games,
        favorites: state.favorites,
        checkIns,
      }),
      xp,
    )

    const next = {
      checkIns,
      loginDay: day,
      lastLoginDate: today,
      achievements: achievementUpdate.achievements,
      xp: achievementUpdate.xp,
      ...questUpdate,
    }

    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
    void trackEvent('login_claim', { day, xp_gain: xpGain })
    void trackEvent('check_in', { xp_gain: xpGain, day_count: checkIns.length })
    return { ok: true, already: false, day, xpGain }
  },

  claimLoginAdBonus: (amount) => {
    if (amount <= 0) return { ok: false, reason: 'invalid' }
    const state = get()
    const today = todayKey()
    if (state.lastLoginDate !== today) {
      return { ok: false, reason: 'claim_first' }
    }
    if (state.loginBonusDate === today) {
      return { ok: false, reason: 'already' }
    }

    const xp = state.xp + amount
    const achievementUpdate = mergeAchievements(
      state.achievements,
      buildSnapshot({
        streak: state.streak,
        games: state.games,
        favorites: state.favorites,
        checkIns: state.checkIns,
      }),
      xp,
    )

    const next = {
      loginBonusDate: today,
      xp: achievementUpdate.xp,
      achievements: achievementUpdate.achievements,
    }
    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
    void trackEvent('login_bonus_ad', { xp_gain: amount })
    return { ok: true, xpGain: amount }
  },

  loginView: () => {
    const state = get()
    return computeLoginView(state.loginDay, state.lastLoginDate, state.loginBonusDate)
  },

  questViews: () => {
    const state = get()
    const synced = syncQuestPeriods({
      questDailyKey: state.questDailyKey,
      questWeeklyKey: state.questWeeklyKey,
      questCounts: state.questCounts,
      questClaimed: state.questClaimed,
      questAdClaimed: state.questAdClaimed,
      questWeekGames: state.questWeekGames,
    })
    if (
      synced.questDailyKey !== state.questDailyKey ||
      synced.questWeeklyKey !== state.questWeeklyKey
    ) {
      set(synced)
      void persistGuarded(persistSlice({ ...state, ...synced }))
    }
    return buildQuestViews(synced)
  },

  claimQuestReward: (id) => {
    const quest = getQuest(id)
    if (!quest) return { ok: false, reason: 'unknown' }

    const state = get()
    const synced = syncQuestPeriods({
      questDailyKey: state.questDailyKey,
      questWeeklyKey: state.questWeeklyKey,
      questCounts: state.questCounts,
      questClaimed: state.questClaimed,
      questAdClaimed: state.questAdClaimed,
      questWeekGames: state.questWeekGames,
    })

    if (synced.questClaimed.includes(id)) {
      return { ok: false, reason: 'already' }
    }

    const progress = synced.questCounts[id] ?? 0
    if (progress < quest.target) {
      return { ok: false, reason: 'incomplete' }
    }

    const xpGain = quest.xpReward
    const xp = state.xp + xpGain
    const achievementUpdate = mergeAchievements(
      state.achievements,
      buildSnapshot({
        streak: state.streak,
        games: state.games,
        favorites: state.favorites,
        checkIns: state.checkIns,
      }),
      xp,
    )

    const next = {
      ...synced,
      questClaimed: [...synced.questClaimed, id],
      achievements: achievementUpdate.achievements,
      xp: achievementUpdate.xp,
    }

    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
    void trackEvent('quest_claim', { quest_id: id, xp_gain: xpGain, period: quest.period })
    return { ok: true, already: false, xpGain }
  },

  claimQuestAdBonus: (id, amount) => {
    if (amount <= 0) return { ok: false, reason: 'invalid' }
    const quest = getQuest(id)
    if (!quest) return { ok: false, reason: 'unknown' }

    const state = get()
    const synced = syncQuestPeriods({
      questDailyKey: state.questDailyKey,
      questWeeklyKey: state.questWeeklyKey,
      questCounts: state.questCounts,
      questClaimed: state.questClaimed,
      questAdClaimed: state.questAdClaimed,
      questWeekGames: state.questWeekGames,
    })

    if (!synced.questClaimed.includes(id)) {
      return { ok: false, reason: 'claim_first' }
    }
    if (synced.questAdClaimed.includes(id)) {
      return { ok: false, reason: 'already' }
    }

    const progress = synced.questCounts[id] ?? 0
    if (progress < quest.target) {
      return { ok: false, reason: 'incomplete' }
    }

    const xp = state.xp + amount
    const achievementUpdate = mergeAchievements(
      state.achievements,
      buildSnapshot({
        streak: state.streak,
        games: state.games,
        favorites: state.favorites,
        checkIns: state.checkIns,
      }),
      xp,
    )

    const next = {
      ...synced,
      questAdClaimed: [...synced.questAdClaimed, id],
      achievements: achievementUpdate.achievements,
      xp: achievementUpdate.xp,
    }

    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
    void trackEvent('quest_bonus_ad', { quest_id: id, xp_gain: amount, period: quest.period })
    return { ok: true, xpGain: amount }
  },

  reportRun: (game, stats) => {
    const state = get()
    const missionProgress = { ...state.missionProgress }
    const gained: string[] = []
    for (const m of missionsFor(game)) {
      const value = Math.max(0, stats[m.stat] ?? 0)
      const prev = missionProgress[m.id] ?? 0
      const next = Math.min(m.target, m.mode === 'run' ? Math.max(prev, value) : prev + value)
      if (next === prev) continue
      missionProgress[m.id] = next
      if (prev < m.target && next >= m.target) gained.push(m.id)
    }
    set({ missionProgress })
    void persistGuarded(persistSlice({ ...state, missionProgress }))
    for (const id of gained) void trackEvent('mission_complete', { game_id: game, mission_id: id })
    return gained
  },

  claimMission: (id) => {
    const mission = getMission(id)
    const state = get()
    if (!mission || state.missionClaimed.includes(id)) return 0
    if ((state.missionProgress[id] ?? 0) < mission.target) return 0
    const xp = state.xp + mission.xp
    const achievementUpdate = mergeAchievements(
      state.achievements,
      buildSnapshot({
        streak: state.streak,
        games: state.games,
        favorites: state.favorites,
        checkIns: state.checkIns,
      }),
      xp,
    )
    const next = {
      missionClaimed: [...state.missionClaimed, id],
      xp: achievementUpdate.xp,
      achievements: achievementUpdate.achievements,
    }
    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
    void trackEvent('mission_claim', { game_id: mission.game, mission_id: id, xp_gain: mission.xp })
    return mission.xp
  },

  commitActionRun: (game, report) => {
    const prevBest = get().games[game]?.bestScore ?? 0
    get().recordPlay(game, report.score, report.cleared)
    const fresh = get().reportRun(game, { ...report.stats, score: report.score })

    const state = get()
    const today = todayKey()
    let dailyDone = state.dailyActionKey === today ? state.dailyActionDone : []
    let coins = state.coins + Math.max(0, Math.round(report.coins))
    let xp = state.xp
    let daily: DailyChallenge | null = null
    const challenge = dailyChallenges().find((c) => c.game === game)
    if (challenge && !dailyDone.includes(game)) {
      const value = challenge.stat === 'score' ? report.score : (report.stats[challenge.stat] ?? 0)
      if (value >= challenge.target) {
        daily = challenge
        dailyDone = [...dailyDone, game]
        coins += challenge.coins
        xp += challenge.xp
        void trackEvent('daily_action_complete', { game_id: game, stat: challenge.stat, target: challenge.target })
      }
    }
    const current = state.games[game] ?? { plays: 0, bestScore: 0 }
    const games = {
      ...state.games,
      [game]: { ...current, seconds: (current.seconds ?? 0) + Math.round(report.seconds) },
    }
    const next = { coins, xp, games, dailyActionKey: today, dailyActionDone: dailyDone }
    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
    void trackEvent('action_end', {
      game_id: game,
      score: report.score,
      duration_s: Math.round(report.seconds),
      coins: Math.round(report.coins),
      revived: report.revived ? 1 : 0,
      cleared: report.cleared ? 1 : 0,
      new_best: report.score > prevBest ? 1 : 0,
    })
    return { fresh, newBest: report.score > prevBest && prevBest > 0, prevBest, coins: Math.round(report.coins), daily }
  },

  buyUpgrade: (game, upgradeId) => {
    const def = actionInfo(game)?.upgrades.find((u) => u.id === upgradeId)
    const state = get()
    if (!def) return false
    const key = `${game}:${upgradeId}`
    const level = state.upgrades[key] ?? 0
    if (level >= def.max) return false
    const price = upgradePrice(def, level)
    if (state.coins < price) return false
    const next = { coins: state.coins - price, upgrades: { ...state.upgrades, [key]: level + 1 } }
    set(next)
    void persistGuarded(persistSlice({ ...state, ...next }))
    void trackEvent('upgrade_buy', { game_id: game, upgrade_id: upgradeId, level: level + 1, price })
    return true
  },

  upgradeLevel: (game, upgradeId) => get().upgrades[`${game}:${upgradeId}`] ?? 0,

  completeLevel: (game, level, stars) => {
    const state = get()
    const prev = state.levelProgress[game] ?? { cleared: 0, stars: [] }
    const lv = Math.max(1, Math.floor(level))
    const st = Math.max(0, Math.min(3, Math.round(stars)))
    const firstClear = lv > prev.cleared
    const oldStars = prev.stars[lv - 1] ?? 0
    const improved = st > oldStars
    if (!firstClear && !improved) return { firstClear, improved, cleared: prev.cleared }
    const nextStars = prev.stars.slice()
    while (nextStars.length < lv) nextStars.push(0)
    nextStars[lv - 1] = Math.max(oldStars, st)
    const record: LevelRecord = { cleared: Math.max(prev.cleared, lv), stars: nextStars }
    const levelProgress = { ...state.levelProgress, [game]: record }
    set({ levelProgress })
    void persistGuarded(persistSlice({ ...state, levelProgress }))
    void trackEvent('level_complete', { game_id: game, level: lv, stars: st, first_clear: firstClear ? 1 : 0 })
    return { firstClear, improved, cleared: record.cleared }
  },

  dailyActionDoneToday: () => {
    const state = get()
    return state.dailyActionKey === todayKey() ? state.dailyActionDone : []
  },

  todayGameId: () => GAMES_BY_ADDED[dailyIndex(GAMES_BY_ADDED.length)].id,

  level: () => Math.floor(get().xp / XP_PER_LEVEL) + 1,

  xpIntoLevel: () => {
    const xp = get().xp
    const level = Math.floor(xp / XP_PER_LEVEL) + 1
    const current = xp % XP_PER_LEVEL
    return { current, need: XP_PER_LEVEL, level }
  },
}))

/** Never write before saved data has loaded — an empty store would overwrite real progress. */
function persistGuarded(slice: Persisted): Promise<void> {
  if (!useProgressStore.getState().hydrated) return Promise.resolve()
  return saveJson(STORAGE_KEY, slice)
}
