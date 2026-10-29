import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('subscription and guarantee controls live at the end of the Plan page, not User', () => {
  const plan = read('src/features/billing/PlanPage.tsx')
  const billing = read('src/features/billing/SubscriptionManagement.tsx')
  const user = read('src/features/more/AccountPages.tsx')

  assert.match(plan,/SubscriptionManagement/)
  assert.ok(plan.indexOf('<SubscriptionManagement \/>') > plan.indexOf('plan-footnote'))
  assert.doesNotMatch(user,/Assinatura e garantia|refund-request|cancel-request/)
  assert.match(billing,/aria-label="Assinatura e garantia"/)
  assert.match(billing,/Garantia até \{guaranteeUntil\}/)
  assert.match(billing,/Solicitar cancelamento e reembolso/)
})

test('refund status uses protected endpoints, a 24-hour customer notice and session resync', () => {
  const billing = read('src/features/billing/SubscriptionManagement.tsx')
  const css = read('src/styles/account-billing.css')

  assert.match(billing,/api\.request<SubscriptionStatus>\('\/billing\/subscription'\)/)
  assert.match(billing,/\/billing\/subscription\/refund-request/)
  assert.match(billing,/\/billing\/subscription\/cancel-request/)
  assert.match(billing,/refund_deadline_at/)
  assert.match(billing,/Solicitação de reembolso recebida/)
  assert.match(billing,/Processaremos sua solicitação de reembolso em até 24 horas/)
  assert.match(billing,/sua conta voltará automaticamente ao modo gratuito/)
  assert.match(billing,/window\.setInterval\(\(\)=>void loadSubscription\(true\),10_000\)/)
  assert.match(billing,/void syncSession\(\)\.catch/)
  assert.match(css,/\.account-refund-timeline/)
  assert.match(css,/background: #fff4c2/)
  assert.match(billing,/membership\?\.role === 'owner' \|\| membership\?\.role === 'admin'/)
})

test('pending refund never exposes internal Asaas approval details to the customer', () => {
  const billing = read('src/features/billing/SubscriptionManagement.tsx')
  const waitingBlock = billing.slice(
    billing.indexOf('{refundWaiting&&<div'),
    billing.indexOf('{refundCompleted&&<div'),
  )

  assert.match(waitingBlock,/até 24 horas/)
  assert.doesNotMatch(waitingBlock,/Token|aprovação manual|reconcile_required|Asaas criou o estorno/)
  assert.match(billing,/Reembolso concluído/)
  assert.match(billing,/conta voltou ao modo gratuito/)
})
