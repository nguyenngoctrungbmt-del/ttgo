/** Static, crawlable landing page for one hub game: play-hub/game/<id>/index.html. */
const SITE = 'https://ttgo.io.vn/'

export const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const pageUrl = (game) => `${SITE}play-hub/game/${game.id}/`

function clip(text, max) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

function description(game) {
  return clip(`${game.blurb} Play ${game.title} free in your browser — no download, works on phone and desktop.`, 160)
}

/**
 * @param game     GameMeta from src/data/games.ts
 * @param info     ActionInfo (missions / upgrades) or undefined for classic hub games
 * @param related  a few other GameMeta to cross-link
 * @param updated  ISO date for dateModified
 */
export function renderGamePage(game, info, related, updated) {
  const url = pageUrl(game)
  const route = game.path.replace(/^\/play\//, '')
  const playHref = `../../#/play/${route}`
  const shot = `${SITE}play-hub/shots/${route}.jpg`
  const desc = description(game)
  const title = `${game.title} — Play Free Online | TTGO Play`
  const keywords = [game.title, `${game.title} online`, `play ${game.title} free`, ...game.tags.map((t) => `${t.toLowerCase()} game`), 'free browser game', 'no download', 'TTGO play']
  const missions = info?.missions?.map((m) => m[3]) ?? []
  const upgrades = info?.upgrades ?? []

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'VideoGame',
        name: game.title,
        description: desc,
        url,
        image: shot,
        genre: game.tags,
        gamePlatform: 'Web browser',
        applicationCategory: 'Game',
        operatingSystem: 'Any',
        playMode: 'SinglePlayer',
        inLanguage: 'en',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@type': 'Organization', name: 'TTGO / AVTFINITY', url: SITE },
        dateModified: updated,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Play Hub', item: `${SITE}play-hub/` },
          { '@type': 'ListItem', position: 3, name: game.title, item: url },
        ],
      },
    ],
  }

  const relatedTiles = related
    .map(
      (g) => `          <a class="game-tile" role="listitem" href="../${g.id}/">
            <span class="game-tile-icon"><img src="../../covers/${g.id}.svg" alt="${escapeHtml(g.title)} icon" width="128" height="128" loading="lazy" /></span>
            <span class="game-tile-name">${escapeHtml(g.title)}</span>
            <span class="game-tile-desc">${escapeHtml(g.blurb)}</span>
          </a>`,
    )
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="TTGO / AVTFINITY" />
  <meta name="theme-color" content="#070A12" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" type="image/svg+xml" href="../../covers/${game.id}.svg" />
  <meta property="og:title" content="${escapeHtml(`${game.title} — Free Online Game | TTGO Play`)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:site_name" content="TTGO Play" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${shot}" />
  <meta property="og:image:width" content="430" />
  <meta property="og:image:height" content="760" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(`${game.title} — Free Online Game`)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${shot}" />
  <link rel="stylesheet" href="../../../assets/css/site.css?v=20261007" />
  <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>
    <div class="container">
      <div class="nav">
        <a class="brand" href="../../../" aria-label="TTGO home">
          <div class="logo" aria-hidden="true"></div>
          <div>TTGO</div>
        </a>
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="../../../">Home</a></li>
            <li><a href="../../">Play Hub</a></li>
            <li><a href="../../../blog/">Blog</a></li>
            <li><a href="../../../apps/">Apps</a></li>
          </ul>
        </nav>
      </div>
    </div>
  </header>

  <main id="main">
    <div class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="../../../">Home</a><span class="sep" aria-hidden="true">/</span></li>
          <li><a href="../../">Play Hub</a><span class="sep" aria-hidden="true">/</span></li>
          <li aria-current="page">${escapeHtml(game.title)}</li>
        </ol>
      </nav>

      <div class="page-hero">
        <div class="page-hero-icon">
          <img src="../../covers/${game.id}.svg" alt="${escapeHtml(game.title)} cover art" width="96" height="96" />
        </div>
        <div>
          <div class="badge-row">
            ${game.tags.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join('\n            ')}
            <span class="badge">${escapeHtml(game.eta)}</span>
          </div>
          <h1>${escapeHtml(game.title)}</h1>
          <p class="lead">${escapeHtml(game.blurb)}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="${playHref}">▶ Play ${escapeHtml(game.title)} now</a>
            <a class="btn" href="../../">All games</a>
          </div>
        </div>
      </div>

      <div class="game-landing">
        <figure class="game-landing-shot">
          <a href="${playHref}"><img src="../../shots/${route}.jpg" alt="${escapeHtml(game.title)} gameplay screenshot" width="430" height="760" loading="lazy" /></a>
          <figcaption>Real in-game screenshot · tap to play</figcaption>
        </figure>

        <article class="prose">
          <h2>How to play ${escapeHtml(game.title)}</h2>
          <ol>
            ${game.howTo.map((step) => `<li>${escapeHtml(step)}</li>`).join('\n            ')}
          </ol>
${
  missions.length
    ? `
          <h2>Missions to chase</h2>
          <p>Every run counts toward missions that pay out XP. Clear a tier to unlock the next one:</p>
          <ul>
            ${missions.slice(0, 6).map((m) => `<li>${escapeHtml(m)}</li>`).join('\n            ')}
          </ul>
`
    : ''
}${
  upgrades.length
    ? `
          <h2>Upgrades</h2>
          <p>Coins you earn buy permanent upgrades for ${escapeHtml(game.title)}:</p>
          <ul>
            ${upgrades.map((u) => `<li><strong>${escapeHtml(u.icon)} ${escapeHtml(u.label)}</strong> — ${escapeHtml(u.desc)}</li>`).join('\n            ')}
          </ul>
`
    : ''
}
          <h2>Good to know</h2>
          <ul>
            <li><strong>Free and instant:</strong> runs in your browser on phone, tablet or desktop — nothing to install.</li>
            <li><strong>Session length:</strong> about ${escapeHtml(game.eta)} per round, perfect for a short break.</li>
            <li><strong>Progress saves automatically</strong> in this browser: best scores, missions and favorites.</li>
          </ul>
          <p><a href="${playHref}">Start playing ${escapeHtml(game.title)}</a> or browse <a href="../../">all Play Hub games</a>.</p>
        </article>
      </div>

      <section class="also-like" aria-labelledby="related-title">
        <h2 id="related-title" class="section-title">More ${escapeHtml(game.tag.toLowerCase())} games</h2>
        <div class="game-grid" role="list">
${relatedTiles}
        </div>
      </section>
    </div>
  </main>

  <footer>
    <div class="container">
      <div class="footer-row">
        <div>© <span id="year"></span> TTGO • Free browser &amp; Android games</div>
        <div><a href="../../">Play Hub</a> · <a href="../../../blog/">Blog</a> · <a href="../../../about/">About</a> · <a href="../../../contact/">Contact</a> · <a href="../../../privacy/">Privacy</a> · <a href="../../../terms/">Terms</a></div>
      </div>
    </div>
  </footer>
  <script>document.getElementById('year').textContent = new Date().getFullYear();</script>
</body>
</html>
`
}
