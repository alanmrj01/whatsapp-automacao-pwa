import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('activation corridor is connection first and payment second', () => {
  const signup=read('src/features/auth/SignupPage.tsx')
  const router=read('src/app/router.tsx')
  const whatsapp=read('src/features/whatsapp/WhatsAppPage.tsx')
  const plan=read('src/features/billing/PlanPage.tsx')

  assert.match(signup,/\/app\/whatsapp\?from=activation/)
  assert.match(router,/pathname === '\/app\/whatsapp'/)
  assert.match(router,/pathname === '\/app\/mais\/plano'/)
  assert.match(whatsapp,/status==='connected'/)
  assert.match(whatsapp,/Escolher plano e ativar a Alovia/)
  assert.doesNotMatch(whatsapp,/activation_paywall_viewed/)
  assert.match(plan,/activation_paywall_viewed/)
  assert.match(plan,/connection\.data\.status!=='connected'/)
  assert.match(plan,/\/app\/checkout\?plan=/)
})

test('connection failures expose only bounded diagnostic metadata to tracking', () => {
  const types=read('src/features/whatsapp/types.ts')
  const coexistence=read('src/features/whatsapp/EmbeddedSignupButton.tsx')

  assert.match(types,/provider_failure_code\?: string/)
  for(const key of [
    'provider_failure_code',
    'onboarding_attempt_state',
    'onboarding_last_stage',
    'next_action',
    'review_status',
  ]) assert.match(coexistence,new RegExp(key))
  assert.doesNotMatch(coexistence,/authorization_code.*trackEvent|access_token.*trackEvent|display_phone_number.*trackEvent/s)
})
