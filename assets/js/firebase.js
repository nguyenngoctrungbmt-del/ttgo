/*
 * Firebase Analytics for the static TTGO pages.
 * - page_view is sent automatically on load.
 * - store_click: any click to Google Play / Steam / YouTube (store, app_id, placement, page).
 * - video_play: sent by yt-lite.js through window.ttgoTrack.
 * The Play Hub React app has its own init (apps/play-hub/src/analytics/analytics.ts) with the same config.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'
import { getAnalytics, isSupported, logEvent } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js'

const firebaseConfig = {
  apiKey: 'AIzaSyAYxl1qzV4vYUqS5l_Skfob-lGHlXGcwN8',
  authDomain: 'ttgowebsite-5e1eb.firebaseapp.com',
  projectId: 'ttgowebsite-5e1eb',
  storageBucket: 'ttgowebsite-5e1eb.firebasestorage.app',
  messagingSenderId: '1071099133386',
  appId: '1:1071099133386:web:0220168648f4f386172333',
  measurementId: 'G-MN7NJXZWXF',
}

// Events fired before Analytics is ready are queued, then flushed.
const queue = []
window.ttgoTrack = (name, params) => queue.push([name, params])

isSupported()
  .then((ok) => {
    if (!ok) return
    const analytics = getAnalytics(initializeApp(firebaseConfig))
    window.ttgoTrack = (name, params) => logEvent(analytics, name, params)
    queue.splice(0).forEach(([name, params]) => logEvent(analytics, name, params))
  })
  .catch(() => {
    // Blocked by an ad blocker or privacy mode — the site works without analytics.
  })

function storeOf(url) {
  if (url.hostname === 'play.google.com') return 'google_play'
  if (url.hostname.endsWith('steampowered.com')) return 'steam'
  if (url.hostname.endsWith('youtube.com') || url.hostname === 'youtu.be') return 'youtube'
  return null
}

/** Where on the page the link sits: utm_medium from the link if present, else the nearest labelled section. */
function placementOf(link, url) {
  const referrer = url.searchParams.get('referrer')
  const medium = referrer && new URLSearchParams(referrer).get('utm_medium')
  if (medium) return medium
  const section = link.closest('section[aria-labelledby], section[aria-label], header, footer, nav, article')
  if (!section) return 'page'
  return section.getAttribute('aria-labelledby') || section.getAttribute('aria-label') || section.tagName.toLowerCase()
}

document.addEventListener(
  'click',
  (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!link) return
    let url
    try {
      url = new URL(link.href)
    } catch {
      return
    }
    const store = storeOf(url)
    if (!store) return
    window.ttgoTrack('store_click', {
      store,
      app_id: url.searchParams.get('id') || url.pathname.split('/').filter(Boolean).slice(0, 2).join('/') || 'channel',
      placement: placementOf(link, url).slice(0, 100),
      page: location.pathname,
    })
  },
  { capture: true },
)
