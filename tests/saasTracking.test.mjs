import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('first-party tracking persists visitor attribution and session identity', () => {
  const tracking = read('src/lib/tracking.ts')

  assert.match(tracking, /alovia_tracking_visitor_id_v1/)
  assert.match(tracking, /alovia_tracking_session_id_v1/)
  assert.match(tracking, /alovia_tracking_first_touch_v1/)
  assert.match(tracking, /alovia_tracking_session_touch_v1/)
  assert.match(tracking, /localStorage/)
  assert.match(tracking, /sessionStorage/)
  assert.match(tracking, /occurred_at/)
  assert.match(tracking, /event_id/)
  assert.match(tracking, /attribution_version:\s*2/)
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
  assert.match(checkoutReturn, /payment_confirmed/)
  assert.match(whatsapp, /whatsapp_connection_started/)
  assert.match(whatsapp, /whatsapp_connection_completed/)
  assert.match(whatsapp, /whatsapp_connection_failed/)
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
