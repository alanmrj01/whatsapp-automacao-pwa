import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {entitlementsFor} from '../src/features/access/entitlements.ts'
import {billingCycles,cyclePrice,defaultBillingCycle,plans} from '../src/features/billing/planCatalog.ts'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('free demo and former operational account are different states', () => {
  const neverActivated = entitlementsFor({access_mode:'free',role:'owner',has_had_operational_access:false})
  assert.equal(neverActivated.usesDemoData,true)
  assert.equal(neverActivated.canReadOperationalData,false)
  assert.equal(neverActivated.canMutateOperationalData,false)

  const formerOperational = entitlementsFor({access_mode:'free',role:'owner',has_had_operational_access:true})
  assert.equal(formerOperational.usesDemoData,false)
  assert.equal(formerOperational.isReadOnlyRetained,true)
  assert.equal(formerOperational.canReadOperationalData,true)
  assert.equal(formerOperational.canMutateOperationalData,false)

  const active = entitlementsFor({access_mode:'paid',role:'owner',has_had_operational_access:true})
  assert.equal(active.usesDemoData,false)
  assert.equal(active.canReadOperationalData,true)
  assert.equal(active.canMutateOperationalData,true)
})

test('commercial catalog uses Basic and Plus with quarterly as default', () => {
  assert.equal(defaultBillingCycle,'quarterly')
  assert.deepEqual(plans.map(plan=>[plan.id,plan.monthlyPrice]),[['basic',197],['plus',297]])
  assert.equal(billingCycles.find(item=>item.id==='quarterly')?.discount,0.10)
  assert.equal(billingCycles.find(item=>item.id==='quarterly')?.badge,'Mais popular')
  assert.equal(billingCycles.find(item=>item.id==='annual')?.discount,0.15)
  assert.equal(billingCycles.find(item=>item.id==='annual')?.badge,'Maior economia')

  const basic = plans.find(plan=>plan.id==='basic')
  const plus = plans.find(plan=>plan.id==='plus')
  assert.equal(cyclePrice(basic,'quarterly').total,531.9)
  assert.equal(cyclePrice(basic,'annual').total,2009.4)
  assert.equal(cyclePrice(plus,'quarterly').total,801.9)
  assert.equal(cyclePrice(plus,'annual').total,3029.4)
})

test('plan switching, compact upgrade prompt and account routes are explicit', () => {
  const plan = read('src/features/billing/PlanPage.tsx')
  const prompt = read('src/features/access/UpgradePrompt.tsx')
  const router = read('src/app/router.tsx')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')

  assert.match(plan,/role="tablist"/)
  assert.match(plan,/aria-selected=\{cycle===item\.id\}/)
  assert.match(plan,/Mais popular/)
  assert.match(prompt,/Disponível com assinatura/)
  assert.match(prompt,/Ver planos/)
  assert.doesNotMatch(prompt,/Sua conta gratuita continua sem cobrança/)
  assert.match(router,/mais\/plano/)
  assert.match(router,/mais\/usuario/)
  assert.match(router,/mais\/seguranca/)
  assert.match(router,/mais\/privacidade/)
  assert.match(dashboard,/<h1>Dashboard<\/h1>/)
  assert.match(dashboard,/dashboard-business-name/)
})
