/**
 * Publishes the Play Hub game catalog to the static TTGO site:
 *   1. public/covers/<id>.svg       — each game's cover art (emoji tile when it has none)
 *   2. public/game/<id>/index.html  — crawlable SEO landing page per game (→ play-hub/game/<id>/)
 *   3. ttgo-config.json             — `playGames` entries for every hub game
 *   4. index.html                   — static tiles + JSON-LD ItemList on the homepage
 *   5. sitemap.xml                  — one <url> per landing page
 *   6. apps/play-hub/index.html     — <noscript> links to every landing page
 * Run with `npm run sync-site` (also part of `npm run build`).
 * Screenshots (public/shots) come from `npm run capture-shots`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { escapeHtml, pageUrl, renderGamePage } from './game-page.mjs'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const siteDir = path.resolve(appDir, '../..')
const coversDir = path.join(appDir, 'public/covers')
const pagesDir = path.join(appDir, 'public/game')
const shotsDir = path.join(appDir, 'public/shots')
const configPath = path.join(siteDir, 'ttgo-config.json')
const indexPath = path.join(siteDir, 'index.html')
const sitemapPath = path.join(siteDir, 'sitemap.xml')
const hubIndexPath = path.join(appDir, 'index.html')
const HUB_ID_PREFIX = 'hub-'
const MARKER = 'play-hub:games'
const today = new Date().toISOString().slice(0, 10)

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

/** Same primary tag first, then shared tags; most popular wins ties. */
function relatedGames(game, all, count = 8) {
  const score = (g) => (g.tag === game.tag ? 10 : 0) + g.tags.filter((t) => game.tags.includes(t)).length
  return all
    .filter((g) => g.id !== game.id)
    .sort((a, b) => score(b) - score(a) || b.popularity - a.popularity)
    .slice(0, count)
}

/** Replace the lines between `<!-- play-hub:games:start -->` and `…:end -->`, keeping the file's EOL. */
function replaceBetweenMarkers(file, body, indent) {
  const raw = fs.readFileSync(file, 'utf8')
  const crlf = raw.includes('\r\n')
  const text = raw.replace(/\r\n/g, '\n')
  const startTag = `<!-- ${MARKER}:start -->`
  const endTag = `<!-- ${MARKER}:end -->`
  const start = text.indexOf(startTag)
  const end = text.indexOf(endTag)
  if (start < 0 || end < start) throw new Error(`${path.basename(file)} is missing the ${startTag} / ${endTag} markers`)
  const out = `${text.slice(0, start + startTag.length)}\n${body}\n${indent}${text.slice(end)}`
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out)
}

/** Rewrites the homepage ItemList JSON-LD: keeps the hand-written entries, appends every hub game. */
function updateItemList(file, games) {
  const raw = fs.readFileSync(file, 'utf8')
  const crlf = raw.includes('\r\n')
  const text = raw.replace(/\r\n/g, '\n')
  const re = /(<script type="application\/ld\+json">\n)([\s\S]*?)(\n\s*<\/script>)/
  const match = text.match(re)
  if (!match) throw new Error('index.html has no JSON-LD block')
  const data = JSON.parse(match[2])
  const list = data['@graph'].find((n) => n['@type'] === 'ItemList')
  const manual = list.itemListElement.filter((i) => !i.url.includes('/play-hub/game/'))
  list.itemListElement = [...manual, ...games.map((g) => ({ '@type': 'ListItem', url: pageUrl(g), name: g.title }))].map(
    (item, i) => ({ '@type': 'ListItem', position: i + 1, url: item.url, name: item.name }),
  )
  list.numberOfItems = list.itemListElement.length
  const json = JSON.stringify(data, null, 2)
    // One line per ListItem keeps the homepage source readable.
    .replace(
      /\{\n\s+"@type": "ListItem",\n\s+"position": (\d+),\n\s+"url": (".*?"),\n\s+"name": (".*?")\n\s+\}/g,
      '{ "@type": "ListItem", "position": $1, "url": $2, "name": $3 }',
    )
    .replace(/^/gm, '  ')
  const out = text.replace(re, `$1${json}$3`)
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out)
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
  const { actionInfo } = await server.ssrLoadModule('/src/games/registry.ts')

  for (const dir of [coversDir, pagesDir]) {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
  }

  const missingShots = []
  const entries = GAMES.map((game) => {
    const Cover = COVER_MAP[game.id]
    const svg = Cover
      ? renderToStaticMarkup(createElement(Cover)).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      : emojiCover(game)
    fs.writeFileSync(path.join(coversDir, `${game.id}.svg`), svg)

    const route = game.path.replace(/^\/play\//, '')
    if (!fs.existsSync(path.join(shotsDir, `${route}.jpg`))) missingShots.push(route)
    const pageDir = path.join(pagesDir, game.id)
    fs.mkdirSync(pageDir, { recursive: true })
    fs.writeFileSync(path.join(pageDir, 'index.html'), renderGamePage(game, actionInfo(game.id), relatedGames(game, GAMES), today))

    return {
      id: `${HUB_ID_PREFIX}${game.id}`,
      name: game.title,
      path: `play-hub/game/${game.id}/`,
      categories: categoriesFor(game),
      icon: `play-hub/covers/${game.id}.svg`,
      shortDesc: game.blurb,
      ...(game.trending ? { badge: 'HOT' } : game.isNew ? { badge: 'NEW' } : {}),
    }
  })

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  config.playGames = [...config.playGames.filter((g) => !String(g.id).startsWith(HUB_ID_PREFIX)), ...entries]
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
  replaceBetweenMarkers(indexPath, tiles, '          ')
  updateItemList(indexPath, GAMES)

  const urls = GAMES.map(
    (g) => `  <url>
    <loc>${pageUrl(g)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
  ).join('\n')
  replaceBetweenMarkers(sitemapPath, urls, '  ')

  const links = GAMES.map((g) => `        <li><a href="./game/${g.id}/">${escapeHtml(g.title)}</a></li>`).join('\n')
  replaceBetweenMarkers(hubIndexPath, links, '        ')

  console.log(`sync-site: ${entries.length} games → covers, landing pages, ttgo-config.json, index.html, sitemap.xml`)
  if (missingShots.length) console.warn(`sync-site: no screenshot yet for ${missingShots.join(', ')} — run npm run capture-shots`)
} finally {
  await server.close()
}
