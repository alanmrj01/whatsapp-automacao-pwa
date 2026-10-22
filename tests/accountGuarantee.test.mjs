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

test('refund status uses protected endpoints and distinguishes provider reconciliation', () => {
  const billing = read('src/features/billing/SubscriptionManagement.tsx')

  assert.match(billing,/api\.request<SubscriptionStatus>\('\/billing\/subscription'\)/)
  assert.match(billing,/\/billing\/subscription\/refund-request/)
  assert.match(billing,/\/billing\/subscription\/cancel-request/)
  assert.match(billing,/refund_provider_status/)
  assert.match(billing,/Reembolso aguardando autorização no Asaas/)
  assert.match(billing,/Reembolso em processamento no Asaas/)
  assert.match(billing,/Reembolso precisa de conferência/)
  assert.match(billing,/Reembolso confirmado/)
  assert.match(billing,/membership\?\.role === 'owner' \|\| membership\?\.role === 'admin'/)
})

test('pending refund is never presented as completed', () => {
  const billing = read('src/features/billing/SubscriptionManagement.tsx')
  const pendingBlock = billing.slice(
    billing.indexOf('{refundPending&&<div'),
    billing.indexOf('{refundReconcile&&<div'),
  )

  assert.match(pendingBlock,/Reembolso em processamento no Asaas|Reembolso enviado ao Asaas/)
  assert.match(pendingBlock,/só será considerado devolvido quando o provedor concluir|aguardando a confirmação financeira do Asaas/)
  assert.doesNotMatch(pendingBlock,/Reembolso confirmado/)
})
