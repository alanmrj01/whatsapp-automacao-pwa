import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('commercial plans expose 500 and 900 monthly Alovia message allowances', () => {
  const catalog=read('src/features/billing/planCatalog.ts')
  const page=read('src/features/billing/PlanPage.tsx')
  const checkout=read('src/features/billing/CheckoutPage.tsx')

  assert.match(catalog,/id:'basic'[\s\S]*monthlyMessages:500/)
  assert.match(catalog,/id:'plus'[\s\S]*monthlyMessages:900/)
  assert.match(catalog,/return plan === 'basic' \|\| plan === 'plus'/)
  assert.doesNotMatch(page,/Disponível em breve/)
  assert.match(page,/mensagens enviadas pela Alovia\/mês/)
  assert.match(checkout,/plan\.monthlyMessages/)
})

test('paid tenants see quota warnings and a guarded Plus upgrade path', () => {
  const usage=read('src/features/billing/MessageUsage.tsx')
  const hook=read('src/features/billing/useMessageUsage.ts')
  const shell=read('src/app/AppShell.tsx')

  assert.match(hook,/\/billing\/usage/)
  assert.match(usage,/ratio\(data\.used,data\.limit\) < 0\.8/)
  assert.match(usage,/message_quota_exhausted_viewed/)
  assert.match(usage,/message_quota_upgrade_clicked/)
  assert.match(usage,/\/billing\/subscription\/upgrade/)
  assert.match(usage,/Migrar para Plus · 900 mensagens\/mês/)
  assert.match(usage,/Entradas dos clientes e reações não consomem esta franquia/)
  assert.match(shell,/MessageQuotaBanner/)
})
