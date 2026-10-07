/**
 * Captures a real gameplay screenshot of every hub game into public/shots/<id>.jpg
 * (used by the SEO landing pages, og:image and blog posts).
 *
 *   npm run build            # shots are taken from the built play-hub/
 *   npm run capture-shots    # needs Chrome; override with CHROME_PATH=...
 *   npm run capture-shots -- slash bubble   # only some games
 *   npm run capture-shots -- snake --wait=400  # shorter wait after Play (ms)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { preview } from 'vite'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const shotsDir = path.join(appDir, 'public/shots')
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const routes = [...fs.readFileSync(path.join(appDir, 'src/games/routes.ts'), 'utf8').matchAll(/^  '?(\w+)'?: lazy/gm)].map((m) => m[1])
const args = process.argv.slice(2)
const waitArg = args.find((a) => a.startsWith('--wait='))
const waitMs = waitArg ? Number(waitArg.slice(7)) : 1800
const only = args.filter((a) => !a.startsWith('--'))
const todo = only.length ? routes.filter((r) => only.includes(r)) : routes

fs.mkdirSync(shotsDir, { recursive: true })
const server = await preview({ root: appDir, preview: { port: 4319, strictPort: true }, logLevel: 'error' })
const browser = await puppeteer.launch({ executablePath: chrome, headless: true })

async function capture(route) {
  const page = await browser.newPage()
  await page.setViewport({ width: 430, height: 760, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.goto(`http://localhost:4319/#/play/${route}`, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 600))
  await page.evaluate(() => {
    const play = [...document.querySelectorAll('button')].find((b) => /^\s*(▶\s*)?(Play|Start)\b/i.test(b.textContent || ''))
    play?.click()
  })
  await new Promise((r) => setTimeout(r, waitMs))
  await page.screenshot({ path: path.join(shotsDir, `${route}.jpg`), type: 'jpeg', quality: 78 })
  await page.close()
}

try {
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(todo.slice(i, i + 4).map(capture))
  }
  console.log(`capture-shots: ${todo.length} screenshots → public/shots`)
} finally {
  await browser.close()
  server.httpServer.close()
}
