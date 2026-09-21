import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('conversation detail bypasses the regular application chrome', () => {
  const shell = read('src/app/AppShell.tsx')
  assert.match(shell,/isConversationDetail/)
  assert.match(shell,/conversation-route-shell/)
  assert.match(shell,/^\s*if \(isConversationDetail\)/m)
})

test('conversation detail uses messenger header and anchors history at the bottom', () => {
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  assert.match(detail,/conversation-detail-avatar/)
  assert.match(detail,/conversation-detail-header__actions/)
  assert.match(detail,/threadEndRef/)
  assert.match(detail,/scrollIntoView/)
  assert.match(detail,/Histórico da conversa/)
})

test('manual send supports Enter while preserving Shift+Enter for line breaks', () => {
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  assert.match(detail,/event\.key==='Enter'/)
  assert.match(detail,/!event\.shiftKey/)
  assert.match(detail,/event\.preventDefault\(\)/)
  assert.match(detail,/submitMessage\(\)/)
})

test('outbound statuses are presented in Portuguese', () => {
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  for (const label of ['Aguardando envio','Enviada','Entregue','Lida','Não enviada']) {
    assert.match(detail,new RegExp(label))
  }
})

test('conversation history refreshes even when enqueue confirmation fails', () => {
  const operations = read('src/features/operations/api.ts')
  assert.match(operations,/useSendConversationMessage/)
  assert.match(operations,/onSettled:\(\)=>invalidate\(context\.businessId,'conversations','conversation','dashboard'\)/)
  assert.match(operations,/refetchInterval:context\.enabled&&id\?5_000:false/)
})

test('conversation layout owns the full viewport without duplicated navigation', () => {
  const css = read('src/features/conversations/conversation-detail.css')
  assert.match(css,/height:\s*100dvh/)
  assert.match(css,/overflow:\s*hidden/)
  assert.match(css,/\.conversation-route-shell \.conversation-composer \{[\s\S]*position:\s*relative/)
  assert.match(css,/@media \(max-width: 430px\)/)
  assert.match(css,/@media \(min-width: 900px\)/)
})
