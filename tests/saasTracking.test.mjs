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
  assert.match(tracking, /trackEventOnce/)
})

test('signup checkout and WhatsApp connection expose the core SaaS funnel events', () => {
  const signup = read('src/features/auth/SignupPage.tsx')
  const checkout = read('src/features/billing/CheckoutPage.tsx')
  const checkoutReturn = read('src/features/billing/CheckoutReturnPage.tsx')
  const whatsapp = read('src/features/whatsapp/EmbeddedSignupButton.tsx')

  assert.match(signup, /signup_completed/)
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
})

test('commercial conversion and activation events carry business identity', () => {
  const checkout = read('src/features/billing/CheckoutPage.tsx')
  const checkoutReturn = read('src/features/billing/CheckoutReturnPage.tsx')
  const whatsapp = read('src/features/whatsapp/EmbeddedSignupButton.tsx')

  assert.match(checkout, /businessId:\s*user\?\.active_business_id/)
  assert.match(checkoutReturn, /businessId:\s*membership\?\.business_id/)
  assert.match(whatsapp, /businessId:\s*membership\?\.business_id/)
  assert.match(whatsapp, /funnel_stage:\s*'whatsapp_connected'/)
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
  assert.match(whatsapp, /redirect_start_failed/)
  assert.doesNotMatch(checkout, /trackEvent\([^)]*(?:card_number|card_ccv|payer_cpf_cnpj|pix_payload)/s)
})
