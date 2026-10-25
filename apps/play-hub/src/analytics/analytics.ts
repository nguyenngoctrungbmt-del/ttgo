/**
 * Firebase Analytics for the Play Hub (same project as the static pages: assets/js/firebase.js).
 * The SDK loads lazily after first paint; events fired before it is ready are queued.
 */
import type { Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyAYxl1qzV4vYUqS5l_Skfob-lGHlXGcwN8',
  authDomain: 'ttgowebsite-5e1eb.firebaseapp.com',
  projectId: 'ttgowebsite-5e1eb',
  storageBucket: 'ttgowebsite-5e1eb.firebasestorage.app',
  messagingSenderId: '1071099133386',
  appId: '1:1071099133386:web:0220168648f4f386172333',
  measurementId: 'G-MN7NJXZWXF',
}

type Params = Record<string, string | number>
type Logger = (name: string, params?: Params) => void

const queue: [string, Params | undefined][] = []
let log: Logger | null = null
let started = false

function start() {
  if (started) return
  started = true
  void Promise.all([import('firebase/app'), import('firebase/analytics')])
    .then(async ([{ initializeApp }, { getAnalytics, isSupported, logEvent }]) => {
      if (!(await isSupported())) return
      const analytics: Analytics = getAnalytics(initializeApp(firebaseConfig))
      log = (name, params) => logEvent(analytics, name, params)
      for (const [name, params] of queue.splice(0)) log(name, params)
    })
    .catch(() => {
      // Blocked by an ad blocker or offline — the games work without analytics.
    })
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') setTimeout(start, 0)
  else window.addEventListener('load', () => setTimeout(start, 0), { once: true })
}

function send(name: string, params?: Params) {
  if (log) log(name, params)
  else queue.push([name, params])
}

/** Hash-route page view (Firebase only records the first page load by itself). */
export async function trackScreen(screenName: string, path: string): Promise<void> {
  send('page_view', {
    page_title: document.title,
    page_location: location.href,
    page_path: `${location.pathname}#${path}`,
    screen_name: screenName,
  })
}

export async function trackEvent(name: string, params?: Params): Promise<void> {
  send(name, params)
}
