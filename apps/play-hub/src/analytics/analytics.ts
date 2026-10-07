/** Web build: forwards events to Google Analytics when the page has gtag, otherwise no-op. */
type Gtag = (cmd: 'event', name: string, params?: Record<string, string | number>) => void

function gtag(): Gtag | null {
  const fn = (window as unknown as { gtag?: Gtag }).gtag
  return typeof fn === 'function' ? fn : null
}

export async function trackScreen(screenName: string): Promise<void> {
  gtag()?.('event', 'screen_view', { screen_name: screenName })
}

export async function trackEvent(name: string, params?: Record<string, string | number>): Promise<void> {
  gtag()?.('event', name, params)
}
