import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('first-party tracking delegates durable identity to HttpOnly backend cookies', () => {
  const tracking = read('src/lib/tracking.ts')

  assert.match(tracking, /visitor_id:\s*null/)
  assert.match(tracking, /session_id:\s*null/)
  assert.match(tracking, /HttpOnly cookies/)
  assert.doesNotMatch(tracking, /\b(localStorage|sessionStorage|indexedDB)\b/)
  assert.match(tracking, /occurred_at/)
  assert.match(tracking, /event_id/)
  assert.match(tracking, /attribution_version:\s*3/)
  for (const key of ['campaign_id','adset_id','ad_id','placement','fbclid','gclid']) {
    assert.match(tracking, new RegExp(key))
  }
  assert.match(tracking, /trackEventOnce/)
  assert.match(tracking, /import \{ api \} from '\.\/api'/)
  assert.match(tracking, /api\.optionalAuthRequest<\{accepted:boolean\}>\('\/marketing\/events'/)

  const httpClient = read('src/lib/httpClient.ts')
  assert.match(httpClient, /async function optionalAuthRequest<T>/)
  assert.match(httpClient, /return body<T>\(await raw\(path, options, token\)\)/)
  assert.match(httpClient, /request, optionalAuthRequest, requestBlob/)
})

test('signup checkout and WhatsApp connection expose the core SaaS funnel events', () => {
  const signup = read('src/features/auth/SignupPage.tsx')
  const checkout = read('src/features/billing/CheckoutPage.tsx')
  const checkoutReturn = read('src/features/billing/CheckoutReturnPage.tsx')
  const whatsapp = read('src/features/whatsapp/EmbeddedSignupButton.tsx')
  const apiOnly = read('src/features/whatsapp/ApiOnlyEmbeddedSignupButton.tsx')
  const plan = read('src/features/billing/PlanPage.tsx')

  assert.match(signup, /signupTracking/)
  assert.match(signup, /eventId:key/)
  const funnelTracker = read('src/lib/FunnelTracker.tsx')
  assert.match(funnelTracker, /signup_completed/)
  assert.match(funnelTracker, /signup_completed/)
  assert.match(funnelTracker, /preactivation_started/)
  assert.match(funnelTracker, /signupTracking\.preactivation === true/)
  assert.match(funnelTracker, /businessId !== auth\.user\.active_business_id/)
  assert.match(checkout, /checkout_started/)
  assert.match(checkout, /checkout_created/)
  assert.match(checkout, /checkout_redirected/)
  assert.match(checkout, /payment_submitted/)
  assert.match(checkout, /payment_confirmed/)
  assert.match(checkout, /checkout_profile_failed/)
  assert.match(checkout, /checkout_creation_failed/)
  assert.match(checkout, /checkout_validation_failed/)
  assert.match(checkout, /payment_failed/)
  assert.match(checkoutReturn, /payment_confirmed/)
  assert.match(checkoutReturn, /payment_terminal/)
  assert.match(whatsapp, /whatsapp_connection_started/)
  assert.match(whatsapp, /whatsapp_connection_completed/)
  assert.match(whatsapp, /whatsapp_connection_failed/)
  assert.match(whatsapp, /whatsapp_connection_blocked/)
  assert.match(apiOnly, /whatsapp_connection_started/)
  assert.match(apiOnly, /whatsapp_connection_completed/)
  assert.match(apiOnly, /whatsapp_connection_failed/)
  assert.match(apiOnly, /trackEvent\(\s*'whatsapp_connection_started'/)
  assert.match(apiOnly, /trackEvent\(\s*'whatsapp_connection_failed'/)
  assert.match(plan, /activation_paywall_viewed/)
  assert.match(plan, /plan_selected/)
})

test('commercial conversion and activation events carry business identity', () => {
  const checkout = read('src/features/billing/CheckoutPage.tsx')
  const checkoutReturn = read('src/features/billing/CheckoutReturnPage.tsx')
  const whatsapp = read('src/features/whatsapp/EmbeddedSignupButton.tsx')

  assert.match(checkout, /businessId:\s*user\?\.active_business_id/)
  assert.match(checkoutReturn, /businessId:\s*membership\?\.business_id/)
  assert.match(whatsapp, /businessId:\s*membership\?\.business_id/)
  assert.match(whatsapp, /funnel_stage:\s*'whatsapp_connected'/)
  assert.match(whatsapp, /provider_failure_code/)
  assert.match(whatsapp, /onboarding_attempt_state/)
  assert.match(whatsapp, /onboarding_last_stage/)
  assert.match(checkout, /funnel_stage:\s*'subscription_paid'/)
})


test('diagnostic events use bounded reason codes instead of sensitive form values', () => {
  const checkout = read('src/features/billing/CheckoutPage.tsx')
  const whatsapp = read('src/features/whatsapp/EmbeddedSignupButton.tsx')

  for (const reason of [
    'session_expired',
    'network_error',
    'server_error',
    'pix_automatic_reconciliation',
    'pix_automatic_unavailable',
    'pix_conflict',
    'checkout_conflict',
    'card_not_authorized',
    'checkout_expired',
    'payment_reconciliation_pending',
  ]) {
    assert.match(checkout, new RegExp(reason))
  }
  assert.match(whatsapp, /pending_state/)
  assert.match(whatsapp, /next_action/)
  assert.match(whatsapp, /review_status/)
  assert.match(whatsapp, /embedded_signup_error/)\n  assert.doesNotMatch(whatsapp, /redirect_start_failed/)
  assert.doesNotMatch(checkout, /trackEvent\([^)]*(?:card_number|card_ccv|payer_cpf_cnpj|pix_payload)/s)
})

test('landing VSL tracks real Vimeo playback and completion milestones', () => {
  const landing = read('src/features/public/PublicLandingPage.tsx')

  assert.match(landing,/landing_vsl_play_intent/)
  assert.match(landing,/landing_vsl_started/)
  assert.match(landing,/landing_vsl_progress/)
  assert.match(landing,/landing_vsl_completed/)
  assert.match(landing,/\[25, 50, 75\]/)
  assert.match(landing,/https:\/\/player\.vimeo\.com\/api\/player\.js/)
  assert.match(landing,/player\.on\('play',onPlay\)/)
  assert.match(landing,/player\.on\('timeupdate',onTimeupdate\)/)
  assert.match(landing,/player\.on\('ended',onEnded\)/)
  assert.match(landing,/getCurrentTime/)
  assert.match(landing,/getDuration/)
  assert.match(landing,/player_poll/)
  assert.match(landing,/setInterval/)
  const netlify = read('netlify.toml')
  assert.match(netlify,/script-src[^\n]*https:\/\/player\.vimeo\.com/)
})

test('Meta Pixel uses the official web dataset and shared event IDs only on production hosts', () => {
  const tracking = read('src/lib/tracking.ts')

  assert.match(tracking,/1432131901730735/)
  assert.match(tracking,/alovia\.netlify\.app/)
  assert.match(tracking,/trackSingle/)
  assert.match(tracking,/trackSingleCustom/)
  assert.match(tracking,/\{eventID:eventId\}/)
  assert.match(tracking,/context\.eventId/)
  assert.match(tracking,/connect\.facebook\.net\/en_US\/fbevents\.js/)
  assert.match(tracking,/META_PIXEL_HOSTS\.has\(window\.location\.hostname\.toLowerCase\(\)\)/)
})

test('Meta Pixel sends only truthful acquisition and conversion event mappings', () => {
  const tracking = read('src/lib/tracking.ts')

  for (const eventName of [
    'PageView',
    'VSLStarted',
    'VSLProgress',
    'VSLCompleted',
    'CompleteRegistration',
    'WhatsAppConnected',
    'InitiateCheckout',
    'Purchase',
  ]) {
    assert.match(tracking,new RegExp(eventName))
  }
  assert.match(tracking,/eventName==='payment_confirmed'/)
  assert.match(tracking,/amountCents<=0/)
  assert.match(tracking,/currency:'BRL'/)
  assert.doesNotMatch(tracking,/\bLead\b/)
  assert.doesNotMatch(tracking,/payer_cpf_cnpj/)
})

test('browser Purchase uses exact backend amount and checkout UUID for deduplication', () => {
  const checkout = read('src/features/billing/CheckoutPage.tsx')
  const checkoutReturn = read('src/features/billing/CheckoutReturnPage.tsx')

  assert.match(checkout,/amount_cents:number/)
  assert.match(checkout,/amount_cents:\s*current\.amount_cents/)
  assert.match(checkout,/eventId:\s*checkoutId/)
  assert.match(checkoutReturn,/amount_cents:number/)
  assert.match(checkoutReturn,/amount_cents:\s*current\.amount_cents/)
  assert.match(checkoutReturn,/eventId:\s*checkoutId/)
})



test('checkout CSP allows the Meta Pixel endpoints used by browser conversion tracking', () => {
  const netlify = read('netlify.toml')
  const checkoutBlock = netlify.match(/\[\[headers\]\]\s*\n\s*for = "\/app\/checkout\*"[\s\S]*?\n\[\[headers\]\]/)?.[0] ?? ''

  assert.match(checkoutBlock,/script-src[^\n]*https:\/\/connect\.facebook\.net/)
  assert.match(checkoutBlock,/connect-src[^\n]*https:\/\/www\.facebook\.com/)
  assert.match(checkoutBlock,/connect-src[^\n]*https:\/\/graph\.facebook\.com/)
})
