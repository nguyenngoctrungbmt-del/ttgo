# TTGO Play Hub (Vite + React + TypeScript)

Source for the React browser games. Built output is published to `/play-hub/` at the site root
(routes use a hash: `play-hub/#/play/<game>`).

Most games were ported from the TodayPuzzle app (`src/games`, `src/shared`, `src/data`, `src/store`).
Native pieces (AdMob, Firebase, Capacitor haptics/preferences) are replaced with web versions in
`src/ads`, `src/analytics`, `src/shared/haptics.ts` and `src/shared/storage.ts`.
The original Flappy Bird and Snake live in `src/classic/`.

## Commands

```bash
cd apps/play-hub
npm install
npm run dev        # http://localhost:5173/
npm run build      # type-check, sync the site catalog, write ../../play-hub
npm run sync-site  # only regenerate covers + ttgo-config.json + homepage tiles
```

`sync-site` renders every game's `Cover.tsx` to `public/covers/<id>.svg`, rewrites the
`play-hub/#/play/...` entries in the root `ttgo-config.json`, and refreshes the static tiles
between the `play-hub:games` markers in the root `index.html`.

## Add a game

1. Create `src/games/your-game/` (game component, `info.ts`, optional `Cover.tsx`)
2. Register it in `src/data/games.ts` (or `src/games/registry.ts` for action games) and `src/games/coverMap.ts`
3. Add its route to `src/games/routes.ts`
4. Run `npm run build`
