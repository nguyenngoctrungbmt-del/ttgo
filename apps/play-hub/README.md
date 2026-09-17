# TTGO Play Hub (Vite + React)

Source for new React browser games. Built output is published to `/play-hub/` at the site root.

## Commands

```bash
cd apps/play-hub
npm install
npm run dev      # http://localhost:5173/play-hub/
npm run build    # writes to ../../play-hub
```

## Add a game

1. Create `src/games/your-game/`
2. Register it in `src/games/registry.js`
3. Add a route in `src/App.jsx`
4. Add a tile in root `ttgo-config.json` + homepage if needed
5. Run `npm run build`
