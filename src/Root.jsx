import { Suspense, lazy, useEffect } from 'react'
import App from './App.jsx'
import { pageView } from './lib/tags.js'
import { AI_VISIBILITY_PATH } from '../shared/ai-visibility-route.js'
import { PAID_ADS_PATH } from '../shared/paid-ads-route.js'
import { WEBSITE_PATH } from '../shared/dealer-websites-route.js'

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const PayApp = lazy(() => import('./pay/PayApp.jsx'))
const TeamApp = lazy(() => import('./team/TeamApp.jsx'))
const AiVisibilityApp = lazy(() => import('./ai/AiVisibilityApp.jsx'))
const PaidAdsApp = lazy(() => import('./ads/PaidAdsApp.jsx'))
const DealerWebsitesApp = lazy(() => import('./websites/DealerWebsitesApp.jsx'))

function isAdminPath() {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/admin')
}

function isPayPath() {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/pay')
}

// Exact /team only (the dealer-team landing page), so no other path can ever route here.
function isTeamPath() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === '/team' || path === '/team/'
}

// Exact AI_VISIBILITY_PATH only (the AEO and GEO page with the free AI Visibility Scan), for the same reason.
// The retired /ai-visibility/ is a 301 (Worker) or a build-time redirect stub, never this app.
function isAiVisibilityPath() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === AI_VISIBILITY_PATH || path === AI_VISIBILITY_PATH.slice(0, -1)
}

// Exact PAID_ADS_PATH only (paid ads + AI commercials for car dealers).
function isPaidAdsPath() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === PAID_ADS_PATH || path === PAID_ADS_PATH.slice(0, -1)
}

// The website service owns this exact landing page, never nested or similarly named paths.
function isDealerWebsitesPath() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === WEBSITE_PATH || path === WEBSITE_PATH.slice(0, -1)
}

export default function Root() {
  useEffect(() => {
    // No-op on /admin and other no-track paths: tracker is disabled there.
    pageView()
  }, [])

  if (isAdminPath()) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    )
  }

  if (isPayPath()) {
    return (
      <Suspense fallback={null}>
        <PayApp />
      </Suspense>
    )
  }

  if (isTeamPath()) {
    return (
      <Suspense fallback={null}>
        <TeamApp />
      </Suspense>
    )
  }

  if (isAiVisibilityPath()) {
    return (
      <Suspense fallback={null}>
        <AiVisibilityApp />
      </Suspense>
    )
  }

  if (isPaidAdsPath()) {
    return (
      <Suspense fallback={null}>
        <PaidAdsApp />
      </Suspense>
    )
  }

  if (isDealerWebsitesPath()) {
    return (
      <Suspense fallback={null}>
        <DealerWebsitesApp />
      </Suspense>
    )
  }

  return <App />
}
