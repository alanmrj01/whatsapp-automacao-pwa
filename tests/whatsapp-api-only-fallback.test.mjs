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

test('existing-number fallback requires explicit impact confirmation', async () => {
  const source = await read('src/features/whatsapp/ApiOnlyInfoPage.tsx')
  assert.match(source, /use_existing_number_platform_only/)
  assert.match(source, /impactConfirmed/)
  assert.match(source, /appRemovedConfirmed/)
  assert.match(source, /Entendi a mudança deste número/)
  assert.match(source, /O número já não está ativo no WhatsApp Business app/)
  assert.match(source, /Prefiro usar outro número/)
  assert.match(source, /histórico existente do aplicativo não será migrado/)
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
