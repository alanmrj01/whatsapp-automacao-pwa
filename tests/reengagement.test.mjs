import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('account reengagement popup is global, conversational and action-driven', () => {
  const shell=read('src/app/AppShell.tsx')
  const prompt=read('src/features/notifications/ReengagementPrompt.tsx')

  assert.match(shell,/ReengagementPrompt/)
  assert.match(prompt,/\/reengagement\/claim/)
  assert.match(prompt,/\/reengagement\/\$\{id\}\/\$\{action\}/)
  assert.match(prompt,/campaign:'upgrade'\|'whatsapp_activation'/)
  assert.match(prompt,/Um próximo passo para sua operação/)
  assert.match(prompt,/Falta pouco para ativar o canal/)
  assert.match(prompt,/Agora não/)
  assert.match(prompt,/cta_label/)
  assert.match(prompt,/safeTarget/)
})

test('free users are not excluded from lifecycle prompts by operational entitlements', () => {
  const prompt=read('src/features/notifications/ReengagementPrompt.tsx')
  assert.match(prompt,/membership\?\.role==='owner'\|\|membership\?\.role==='admin'/)
  assert.doesNotMatch(prompt,/canReadOperationalData/)
  assert.doesNotMatch(prompt,/isPaid/)
})
