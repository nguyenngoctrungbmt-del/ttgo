/**
 * Publishes the Play Hub game catalog to the static TTGO site:
 *   1. public/covers/<id>.svg  — each game's cover art (emoji tile when it has none)
 *   2. ttgo-config.json        — `playGames` entries for every hub game
 *   3. index.html              — static tiles between the play-hub markers (SEO / no-JS)
 * Run with `npm run sync-site` (also part of `npm run build`).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const siteDir = path.resolve(appDir, '../..')
const coversDir = path.join(appDir, 'public/covers')
const configPath = path.join(siteDir, 'ttgo-config.json')
const indexPath = path.join(siteDir, 'index.html')
const HUB_PREFIX = 'play-hub/#/play/'
const MARK_START = '<!-- play-hub:games:start -->'
const MARK_END = '<!-- play-hub:games:end -->'

/** TodayPuzzle tags → homepage category chips (index.html #cat-bar). */
const TAG_TO_CATEGORY = {
  Action: 'action',
  Arcade: 'action',
  Reflex: 'action',
  Puzzle: 'puzzle',
  Building: 'puzzle',
  Logic: 'strategy',
  Brain: 'strategy',
  Merge: 'merge',
  Memory: 'memory',
  Focus: 'memory',
  Cards: 'classic',
  Word: 'puzzle',
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function emojiCover(game) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${game.accent}"/><stop offset="1" stop-color="#0b1430"/>
  </linearGradient></defs>
  <rect width="120" height="120" rx="26" fill="url(#g)"/>
  <text x="60" y="64" font-size="58" text-anchor="middle" dominant-baseline="middle">${escapeHtml(game.icon)}</text>
</svg>
`
}

function categoriesFor(game) {
  const cats = new Set(game.tags.map((t) => TAG_TO_CATEGORY[t]).filter(Boolean))
  if (game.isNew) cats.add('new')
  return [...cats]
}

const server = await createServer({
  root: appDir,
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})

try {
  const { GAMES } = await server.ssrLoadModule('/src/data/games.ts')
  const { COVER_MAP } = await server.ssrLoadModule('/src/games/coverMap.ts')

  fs.rmSync(coversDir, { recursive: true, force: true })
  fs.mkdirSync(coversDir, { recursive: true })

  const entries = GAMES.map((game) => {
    const Cover = COVER_MAP[game.id]
    const svg = Cover
      ? renderToStaticMarkup(createElement(Cover)).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      : emojiCover(game)
    fs.writeFileSync(path.join(coversDir, `${game.id}.svg`), svg)
    const route = game.path.replace(/^\/play\//, '')
    return {
      id: `hub-${game.id}`,
      name: game.title,
      path: `${HUB_PREFIX}${route}`,
      categories: categoriesFor(game),
      icon: `play-hub/covers/${game.id}.svg`,
      shortDesc: game.blurb,
      ...(game.trending ? { badge: 'HOT' } : game.isNew ? { badge: 'NEW' } : {}),
    }
  })

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  config.playGames = [...config.playGames.filter((g) => !String(g.path).startsWith(HUB_PREFIX)), ...entries]
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')

  const tiles = entries
    .map(
      (g) => `          <a
            class="game-tile"
            role="listitem"
            href="${g.path}"
            data-id="${g.id}"
            data-name="${escapeHtml(g.name)}"
            data-categories="${g.categories.join(' ')}"
          >
${g.badge ? `            <span class="game-tile-badge">${g.badge}</span>\n` : ''}            <span class="game-tile-icon">
              <img src="${g.icon}" alt="${escapeHtml(g.name)} game icon" width="128" height="128" loading="lazy" />
            </span>
            <span class="game-tile-name">${escapeHtml(g.name)}</span>
            <span class="game-tile-desc">${escapeHtml(g.shortDesc)}</span>
          </a>`,
    )
    .join('\n')

  // index.html uses CRLF line endings; keep them.
  const html = fs.readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n')
  const start = html.indexOf(MARK_START)
  const end = html.indexOf(MARK_END)
  if (start < 0 || end < start) throw new Error(`index.html is missing the ${MARK_START} / ${MARK_END} markers`)
  const updated = `${html.slice(0, start + MARK_START.length)}\n${tiles}\n          ${html.slice(end)}`
  fs.writeFileSync(indexPath, updated.replace(/\n/g, '\r\n'))

  console.log(`sync-site: ${entries.length} games → covers, ttgo-config.json, index.html`)
} finally {
  await server.close()
}
