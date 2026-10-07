/** XP for claiming login day 1–7 (index 0 = day 1). */
export const LOGIN_DAY_XP = [25, 35, 45, 55, 70, 90, 150] as const

export const LOGIN_CYCLE_DAYS = LOGIN_DAY_XP.length

export function loginXpForDay(day: number): number {
  if (day < 1 || day > LOGIN_CYCLE_DAYS) return LOGIN_DAY_XP[0]
  return LOGIN_DAY_XP[day - 1]
}
