import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('former operational tenants use real data in read-only mode instead of demo fixtures', () => {
  const entitlements = read('src/features/access/entitlements.ts')
  const productState = read('src/features/product/deriveProductState.ts')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const operations = read('src/features/operations/api.ts')

  assert.match(entitlements, /isReadOnlyRetained/)
  assert.match(entitlements, /usesDemoData: isFree && !hasHistory/)
  assert.match(entitlements, /canReadOperationalData: isPaid \|\| hasHistory/)
  assert.match(productState, /READ_ONLY_RETAINED/)
  assert.match(dashboard, /Somente leitura/)
  assert.match(operations, /canReadOperationalData/)
})

test('plan page exposes monthly quarterly and annual periods with quarterly default', () => {
  const catalog = read('src/features/billing/planCatalog.ts')
  const page = read('src/features/billing/PlanPage.tsx')

  assert.match(catalog, /defaultBillingCycle.*quarterly/s)
  assert.match(catalog, /monthly/)
  assert.match(catalog, /quarterly/)
  assert.match(catalog, /annual/)
  assert.match(page, /Período de cobrança/)
  assert.match(page, /role="tablist"/)
})

test('upgrade prompt stays compact and routes to plans', () => {
  const prompt = read('src/features/access/UpgradePrompt.tsx')
  assert.match(prompt, /Disponível com assinatura/)
  assert.match(prompt, /Ver planos/)
  assert.match(prompt, /\/app\/mais\/plano/)
  assert.doesNotMatch(prompt, /Sua conta gratuita continua sem cobrança/)
})
