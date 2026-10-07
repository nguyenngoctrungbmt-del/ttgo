import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { trackEvent } from '../analytics/analytics'
import './playStore.css'

/** The Android app these web games come from. */
export const APP_NAME = 'Today Puzzle: Brain Games'
const PACKAGE_ID = 'com.ttgo.today.puzzle'
const ICON = `${import.meta.env.BASE_URL}today-puzzle-icon.png`
const DISMISS_KEY = 'ttgo.playhub.androidBar.dismissedAt'
const DISMISS_DAYS = 7

export type Placement = 'hub_banner' | 'result' | 'android_bar'

/**
 * Play Store link with an install referrer, so Play Console → Acquisition shows which
 * placement and game brought the install (utm_medium = placement, utm_content = game).
 */
export function playStoreUrl(placement: Placement, gameId?: string) {
  const referrer = new URLSearchParams({
    utm_source: 'ttgo_web',
    utm_medium: placement,
    utm_campaign: 'play_hub',
    ...(gameId ? { utm_content: gameId } : {}),
  })
  return `https://play.google.com/store/apps/details?id=${PACKAGE_ID}&referrer=${encodeURIComponent(referrer.toString())}`
}

function onClick(placement: Placement, gameId?: string) {
  void trackEvent('play_store_click', { placement, game_id: gameId ?? 'none' })
}

/** Game id from a /play/<id> route, if any. */
function useGameId(): string | undefined {
  const { pathname } = useLocation()
  return pathname.match(/^\/play\/([^/]+)/)?.[1]
}

/**
 * "Get the app" button that sits in the action row of end-of-run / level-cleared dialogs,
 * next to Play again — those dialogs are clipped to the board, so it must not add height.
 */
export function ResultPlayCta() {
  const gameId = useGameId()
  return (
    <a
      className="btn gp-result"
      href={playStoreUrl('result', gameId)}
      target="_blank"
      rel="noopener"
      title={`Play offline in ${APP_NAME} — free on Google Play`}
      onClick={() => onClick('result', gameId)}
    >
      <img src={ICON} alt="" width="22" height="22" />
      Get the app
    </a>
  )
}

/** Large promo card for the hub home. */
export function HubPlayBanner() {
  return (
    <a
      className="gp-banner"
      href={playStoreUrl('hub_banner')}
      target="_blank"
      rel="noopener"
      onClick={() => onClick('hub_banner')}
    >
      <img src={ICON} alt={`${APP_NAME} app icon`} width="72" height="72" />
      <span className="gp-banner__copy">
        <strong>Take every game with you</strong>
        <span>
          {APP_NAME} has these games on Android — play offline, no Wi-Fi needed, with daily puzzles and check-in rewards.
        </span>
      </span>
      <span className="gp-banner__btn">▶ Get it on Google Play</span>
    </a>
  )
}

function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return Date.now() - at < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

/** Bottom "open in the app" bar, Android browsers only; hides for a week once dismissed. */
export function AndroidAppBar() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(isAndroid() && !recentlyDismissed())
  }, [])

  if (!show) return null

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // storage blocked — the bar just comes back next visit
    }
  }

  return (
    <div className="gp-bar" role="complementary" aria-label="Get the Android app">
      <button type="button" className="gp-bar__close" aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
      <img src={ICON} alt="" width="40" height="40" />
      <span className="gp-bar__copy">
        <strong>{APP_NAME}</strong>
        <span>Free · Play offline</span>
      </span>
      <a
        className="gp-bar__btn"
        href={playStoreUrl('android_bar')}
        target="_blank"
        rel="noopener"
        onClick={() => onClick('android_bar')}
      >
        Install
      </a>
    </div>
  )
}
