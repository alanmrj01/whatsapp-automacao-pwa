import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('new prospects keep demo access while WhatsApp connection remains available before payment', () => {
  const signup=read('src/features/auth/SignupPage.tsx')
  const router=read('src/app/router.tsx')
  const shell=read('src/app/AppShell.tsx')
  const whatsapp=read('src/features/whatsapp/WhatsAppPage.tsx')
  const dashboard=read('src/features/dashboard/DashboardPage.tsx')
  const more=read('src/features/more/MorePage.tsx')
  const plan=read('src/features/billing/PlanPage.tsx')

  assert.match(signup,/navigate\(homeFor\(createdUser\)/)
  assert.match(signup,/funnel_stage:'demo_access_ready'/)
  assert.doesNotMatch(signup,/navigate\('\/app\/whatsapp\?from=activation'/)

  assert.doesNotMatch(router,/allowedPreactivationRoute/)
  assert.doesNotMatch(router,/\/app\/whatsapp\?from=activation/)
  assert.match(router,/if\(!entitlement\.isPaid\)return children/)

  assert.match(shell,/const demo = entitlement\.usesDemoData/)
  assert.doesNotMatch(shell,/usesDemoData && !entitlement\.isPreactivation/)

  assert.match(whatsapp,/const preactivation = entitlement\.isPreactivation/)
  assert.doesNotMatch(whatsapp,/A conexão oficial está disponível com assinatura/)
  assert.match(whatsapp,/entitlement\.isPaid \|\| preactivation/)
  assert.doesNotMatch(dashboard,/openUpgrade\('Conectar o WhatsApp'\)/)
  assert.match(dashboard,/to="\/app\/whatsapp"/)
  assert.doesNotMatch(more,/FREE_DEMO'\?'Disponível com assinatura'/)
  assert.match(whatsapp,/status==='connected'/)
  assert.match(whatsapp,/Escolher plano e ativar a Alovia/)

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
