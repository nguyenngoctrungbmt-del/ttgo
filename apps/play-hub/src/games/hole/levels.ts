/**
 * Hand-designed Black Hole cities (levels 1–30). Levels beyond the list are generated.
 *
 * `grid` rows are city blocks: P park, H houses, Z plaza, D downtown (shops, a tower from
 * level 3), C core (skyscraper from level 4), L landmark (a colossal monument).
 * `f` is the share of the city's total "mass" you must swallow for the target size
 * (stars at f + 0.14 and f + 0.27). `rivals` = rival holes, `time` = round clock.
 * Every city is cleared by the scripted bot in scratch/lv4/bot-hole.js with time to spare.
 */

export type HoleLevel = {
  name: string
  tip?: string
  theme: number
  grid: string[]
  f: number
  rivals?: number
  time?: number
}

export const HOLE_LEVELS: HoleLevel[] = [
  // ── Sunny Suburbs: learn to grow ────────────────────────────
  { name: 'Quiet Park', tip: 'small things first — you grow as you swallow', theme: 0, grid: ['PHP', 'HPH', 'PHP'], f: 0.32 },
  { name: 'Cul-de-sac', tip: 'grow big enough for the houses', theme: 0, grid: ['HHH', 'HPH', 'HHH'], f: 0.36 },
  { name: 'Town Square', tip: 'a rival hole — red rim means run', theme: 0, grid: ['PHZ', 'HZH', 'ZHP'], f: 0.38, rivals: 1 },
  { name: 'Main Street', tip: 'shops and a tower downtown', theme: 0, grid: ['HDH', 'DZD', 'HDH'], f: 0.4, rivals: 1 },
  { name: 'The Monument', tip: 'boss city — swallow the great monument', theme: 0, grid: ['PHPH', 'HZDP', 'PLZH', 'HPHP'], f: 0.42, rivals: 1, time: 100 },
  // ── Golden Hour: towers ─────────────────────────────────────
  { name: 'Skyline', tip: 'skyscrapers need a huge hole', theme: 1, grid: ['DCD', 'ZPZ', 'DCD'], f: 0.4, rivals: 1 },
  { name: 'Ring Road', tip: 'traffic loops around the park', theme: 1, grid: ['HHHH', 'HPPH', 'HPPH', 'HHHH'], f: 0.42, rivals: 1 },
  { name: 'Garden Party', tip: 'breather — parks and plazas', theme: 1, grid: ['PZP', 'ZPZ', 'PZP'], f: 0.36 },
  { name: 'Twin Towers', tip: 'two rivals hunt the shops', theme: 1, grid: ['HDZD', 'DCPH', 'HPCD', 'DZDH'], f: 0.44, rivals: 2 },
  { name: 'Golden Landmark', tip: 'boss city — the monument at dusk', theme: 1, grid: ['ZDHDZ', 'DPHPD', 'HHLHH', 'DPHPD', 'ZDHDZ'], f: 0.44, rivals: 2, time: 110 },
  // ── Neon Night ──────────────────────────────────────────────
  { name: 'Night Market', tip: 'plazas full of people', theme: 2, grid: ['ZZZ', 'ZDZ', 'ZZZ'], f: 0.42, rivals: 1 },
  { name: 'Neon Core', tip: 'the core is all skyscrapers', theme: 2, grid: ['DDDD', 'DCCD', 'DCCD', 'DDDD'], f: 0.44, rivals: 2 },
  { name: 'Backstreets', tip: 'houses hide between the shops', theme: 2, grid: ['HDHD', 'DHDH', 'HDHD', 'DHDH'], f: 0.45, rivals: 2 },
  { name: 'Moonlit Park', tip: 'breather — a sleepy park', theme: 2, grid: ['PPP', 'PZP', 'PPP'], f: 0.38 },
  { name: 'Neon Monument', tip: 'boss city — three rivals circle the monument', theme: 2, grid: ['DCDCD', 'CZHZC', 'DHLHD', 'CZHZC', 'DCDCD'], f: 0.45, rivals: 3, time: 110 },
  // ── Snow Day ────────────────────────────────────────────────
  { name: 'First Snow', tip: 'a snowy suburb', theme: 3, grid: ['HPHP', 'PHPH', 'HPHP', 'PHPH'], f: 0.44, rivals: 1 },
  { name: 'Ski Village', tip: 'kiosks and statues on every square', theme: 3, grid: ['ZHZ', 'HZH', 'ZHZ'], f: 0.45, rivals: 2 },
  { name: 'Frozen Lake', tip: 'breather — open parks', theme: 3, grid: ['PPPP', 'PZZP', 'PZZP', 'PPPP'], f: 0.4, rivals: 1 },
  { name: 'Icy Downtown', tip: 'towers in the snow', theme: 3, grid: ['DCDC', 'CDCD', 'DCDC', 'CDCD'], f: 0.46, rivals: 2 },
  { name: 'Winter Palace', tip: 'boss city — the frozen monument', theme: 3, grid: ['PZHZP', 'ZDCDZ', 'HCLCH', 'ZDCDZ', 'PZHZP'], f: 0.46, rivals: 3, time: 115 },
  // ── Big cities ─────────────────────────────────────────────
  { name: 'Metro', tip: 'a bigger city — keep moving', theme: 0, grid: ['HDHDH', 'DPZPD', 'HZCZH', 'DPZPD', 'HDHDH'], f: 0.46, rivals: 2 },
  { name: 'Harbour Town', tip: 'long avenues of shops', theme: 1, grid: ['DDDDD', 'HHHHH', 'ZZPZZ', 'HHHHH', 'DDDDD'], f: 0.47, rivals: 3 },
  { name: 'Checkerboard', tip: 'parks and towers in turn', theme: 2, grid: ['PCPCP', 'CPCPC', 'PCPCP', 'CPCPC', 'PCPCP'], f: 0.47, rivals: 3 },
  { name: 'Snow Fair', tip: 'breather — plazas and parks', theme: 3, grid: ['PZPZ', 'ZPZP', 'PZPZ', 'ZPZP'], f: 0.42, rivals: 1 },
  { name: 'Capital', tip: 'boss city — two monuments, four rivals', theme: 2, grid: ['DCDCDC', 'CLZZPD', 'DZHHZC', 'CZHHZD', 'DPZZLC', 'CDCDCD'], f: 0.47, rivals: 4, time: 130 },
  // ── Megacities ─────────────────────────────────────────────
  { name: 'Suburban Sprawl', tip: 'endless houses — sweep them fast', theme: 0, grid: ['HHHHHH', 'HPHHPH', 'HHZZHH', 'HHZZHH', 'HPHHPH', 'HHHHHH'], f: 0.46, rivals: 3, time: 110 },
  { name: 'Tower Forest', tip: 'skyscrapers everywhere', theme: 1, grid: ['CDCDC', 'DCDCD', 'CDZDC', 'DCDCD', 'CDCDC'], f: 0.48, rivals: 3 },
  { name: 'Evening Stroll', tip: 'breather — a small, calm town', theme: 1, grid: ['PHZH', 'HPHP', 'ZHPH', 'HPHZ'], f: 0.42, rivals: 1 },
  { name: 'Blizzard', tip: 'snow city with hungry rivals', theme: 3, grid: ['HDZDH', 'DCHCD', 'ZHPHZ', 'DCHCD', 'HDZDH'], f: 0.48, rivals: 4 },
  { name: 'Black Hole Day', tip: 'final boss — swallow the whole city', theme: 2, grid: ['LDCDCDL', 'DZHPHZD', 'CHDCDHC', 'DPCLCPD', 'CHDCDHC', 'DZHPHZD', 'LDCDCDL'], f: 0.48, rivals: 4, time: 150 },
]

export const HOLE_AUTHORED = HOLE_LEVELS.length
