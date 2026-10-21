import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('admin distinguishes commercial billing from administrative access', () => {
  const api = read('src/features/auth/platformAdmin.ts')
  const page = read('src/features/auth/AdminPage.tsx')

  assert.match(api, /commercial_access_active: boolean/)
  assert.match(api, /commercial_plan_code: 'basic' \| 'plus' \| null/)
  assert.match(api, /commercial_billing_cycle: 'monthly' \| 'quarterly' \| 'annual' \| null/)
  assert.match(api, /commercial_subscription_status:/)
  assert.match(api, /commercial_access_until: string \| null/)

  assert.match(page, /basic: 'Básico'/)
  assert.match(page, /monthly: 'mensal'/)
  assert.match(page, /return 'Pago'/)
  assert.match(page, /Plano \$\{plan\} \$\{cycle\}/)
  assert.match(page, /!business\.commercial_access_active&&<button/)
  assert.match(page, /Liberação administrativa ativa, sem assinatura comercial vinculada\./)
})

test('admin does not relabel a commercial subscription as an administrative grant', () => {
  const page = read('src/features/auth/AdminPage.tsx')
  const commercialBlock = page.slice(
    page.indexOf('function commercialAccessText'),
    page.indexOf('const emptyForm'),
  )
  assert.match(commercialBlock, /commercial_access_active/)
  assert.match(commercialBlock, /commercial_subscription_status/)
  assert.doesNotMatch(commercialBlock, /setPlatformBusinessAccess/)
})
