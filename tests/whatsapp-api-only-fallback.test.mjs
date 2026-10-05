import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('coexistence keeps its Meta launch selector while api-only omits it', async () => {
  const source = await read('src/features/whatsapp/embeddedSignup.ts')
  assert.match(source, /configuration\.mode === 'coexistence'/)
  assert.match(source, /featureType: 'whatsapp_business_app_onboarding'/)
  assert.match(source, /mode: 'coexistence' \| 'api_only'/)
  assert.match(source, /setup: \{\}/)
})

test('coexistence only offers exclusive fallback after repeated real failures', async () => {
  const source = await read('src/features/whatsapp/EmbeddedSignupButton.tsx')
  assert.match(source, /failedAttempts >= 2/)
  assert.match(source, /EmbeddedSignupCancelledError/)
  assert.match(source, /\/app\/whatsapp\/exclusivo\?origem=coexistence/)
  assert.match(source, /Usar este número somente na Alovia/)
})

test('existing-number fallback explains the operational impact in plain language', async () => {
  const source = await read('src/features/whatsapp/ApiOnlyInfoPage.tsx')
  assert.match(source, /use_existing_number_platform_only/)
  assert.match(source, /impactConfirmed/)
  assert.match(source, /appRemovedConfirmed/)
  assert.match(source, /Seus clientes continuam usando o mesmo número/)
  assert.match(source, /Você atende dentro da Alovia/)
  assert.match(source, /não fica disponível no app WhatsApp Business/)
  assert.match(source, /O número continua sendo da sua empresa/)
  assert.match(source, /Quero usar outro número/)
  assert.match(source, /As conversas antigas do aplicativo não são transferidas para a Alovia/)
  assert.doesNotMatch(source, /Cloud API|WABA|API only/i)
})

test('api-only completion sends confirmation and PIN only to the backend', async () => {
  const source = await read('src/features/whatsapp/ApiOnlyEmbeddedSignupButton.tsx')
  assert.match(source, /\/whatsapp\/onboarding\/api-only\/start/)
  assert.match(source, /\/whatsapp\/onboarding\/api-only\/complete/)
  assert.match(source, /platform_only_impact_confirmed/)
  assert.match(source, /registration_pin/)
  assert.match(source, /type="password"/)
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i)
})


test('pending onboarding can enter only the WhatsApp connection detail routes', async () => {
  const router = await read('src/app/router.tsx')
  assert.match(router, /pathname === '\/app\/whatsapp\/business'/)
  assert.match(router, /pathname === '\/app\/whatsapp\/exclusivo'/)
  assert.match(router, /onboarding_completed \|\| whatsappOnboardingRoute/)
  assert.match(router, /Navigate to="\/app\/onboarding" replace/)
})

test('step seven preserves onboarding origin and resumes the persisted step', async () => {
  const onboarding = await read('src/features/onboarding/OnboardingPage.tsx')
  const sheet = await read('src/features/whatsapp/ConnectWhatsAppSheet.tsx')
  assert.match(onboarding, /source="onboarding"/)
  assert.match(onboarding, /next_step!=='company'/)
  assert.match(sheet, /\?from=onboarding/)
})

test('WhatsApp setup returns directly to step seven after success or back navigation', async () => {
  const shell = await read('src/app/AppShell.tsx')
  const coexistence = await read('src/features/whatsapp/EmbeddedSignupButton.tsx')
  const exclusive = await read('src/features/whatsapp/ApiOnlyEmbeddedSignupButton.tsx')
  assert.match(shell, /fromOnboarding/)
  assert.match(shell, /'\/app\/onboarding'/)
  assert.match(coexistence, /phase === 'success' && fromOnboarding/)
  assert.match(coexistence, /navigate\('\/app\/onboarding', \{replace:true\}\)/)
  assert.match(exclusive, /phase === 'success' && fromOnboarding/)
  assert.match(exclusive, /navigate\('\/app\/onboarding', \{replace:true\}\)/)
})

test('initial WhatsApp choice uses customer-facing operational language', async () => {
  const source = await read('src/features/whatsapp/ConnectWhatsAppSheet.tsx')
  assert.match(source, /Continuar usando o WhatsApp Business/)
  assert.match(source, /O número continua no aplicativo e também funciona com a Alovia/)
  assert.match(source, /Usar este número somente na Alovia/)
  assert.match(source, /As conversas serão vistas e respondidas dentro da Alovia/)
  assert.doesNotMatch(source, /API only|Cloud API|WABA/i)
})

test('exclusive connection PIN helper avoids infrastructure jargon', async () => {
  const source = await read('src/features/whatsapp/ApiOnlyEmbeddedSignupButton.tsx')
  assert.match(source, /PIN de segurança do número/)
  assert.match(source, /proteger a conexão deste número/)
  assert.doesNotMatch(source, /Cloud API|WABA|API only/i)
})
