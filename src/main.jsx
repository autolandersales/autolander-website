import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.jsx'
import { stashCheckoutSessionFromLocation } from './pay/lib/checkout-session.js'
import { pickBoot } from './lib/boot.js'
import { pageView } from './lib/tags.js'

// Must run before Root's pageView() so the Stripe session id never reaches Meta Pixel/CAPI
// (tracker.js sourceUrl, identity.js current_page): on a /pay/<token>?session_id=cs_… return
// it moves into sessionStorage and leaves the address bar. Effects run after render, so this
// beats every tracking call. A no-op on every other URL.
stashCheckoutSessionFromLocation()

const container = document.getElementById('root')
const boot = pickBoot(container?.getAttribute('data-al-hydrate'), window.location.pathname)

if (boot === 'spa') {
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  )
} else {
  // Prerendered marketing routes (see lib/boot.js). Root is not mounted on this path, so its one
  // PageView is sent here instead. If the route chunk fails to load, the static page stays fully usable.
  pageView()
  const route = boot === 'ai-visibility'
    ? import('./ai/AiVisibilityApp.jsx').then((m) => m.hydrateAiVisibility(container))
    : boot === 'paid-ads'
      ? import('./ads/PaidAdsApp.jsx').then((m) => m.bootPaidAds(container))
      : boot === 'dealer-websites'
        ? import('./websites/DealerWebsitesApp.jsx').then((m) => m.bootDealerWebsites(container))
        : import('./team/TeamApp.jsx').then((m) => m.bootTeam(container))
  route.catch(() => {})
}
