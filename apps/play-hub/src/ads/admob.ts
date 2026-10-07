/**
 * Web build of the TodayPuzzle ad hooks. The site has no in-game ads, so every call is a
 * no-op and rewarded features are granted for free.
 */
const REWARD_XP = 40

export async function onGameSessionEnded(): Promise<void> {}

export async function showRewardedAd(): Promise<{ rewarded: boolean; xp: number; reason?: string }> {
  return { rewarded: true, xp: REWARD_XP }
}

export function getRewardXpAmount(): number {
  return REWARD_XP
}
