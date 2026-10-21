import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('account settings place guarantee controls immediately before logout', () => {
  const page = read('src/features/more/AccountPages.tsx')
  const guarantee = page.indexOf('aria-label="Assinatura e garantia"')
  const logout = page.indexOf('<h2>Sair da conta</h2>')

  assert.ok(guarantee > 0)
  assert.ok(logout > guarantee)
  assert.match(page, /Garantia até \{guaranteeUntil\}/)
  assert.match(page, /Solicitar cancelamento e reembolso/)
  assert.match(page, /A devolução só será considerada concluída após confirmação financeira/)
  assert.match(page, /não há reembolso automático fora da garantia/)
})

test('account guarantee uses server status and protected request endpoints', () => {
  const page = read('src/features/more/AccountPages.tsx')

  assert.match(page, /api\.request<SubscriptionStatus>\('\/billing\/subscription'\)/)
  assert.match(page, /\/billing\/subscription\/refund-request/)
  assert.match(page, /\/billing\/subscription\/cancel-request/)
  assert.match(page, /subscription\.guarantee_eligible/)
  assert.match(page, /refund_status==='requested'/)
  assert.match(page, /refund_status==='refunded'/)
  assert.match(page, /membership\?\.role === 'owner' \|\| membership\?\.role === 'admin'/)
})

test('account guarantee never presents a refund request as completed payment reversal', () => {
  const page = read('src/features/more/AccountPages.tsx')
  const pendingBlock = page.slice(
    page.indexOf("{refundPending&&<div"),
    page.indexOf("{refundCompleted&&<div"),
  )

  assert.match(pendingBlock, /Reembolso solicitado/)
  assert.match(pendingBlock, /só será considerado devolvido depois da confirmação financeira/)
  assert.doesNotMatch(pendingBlock, /Reembolso confirmado/)
})
