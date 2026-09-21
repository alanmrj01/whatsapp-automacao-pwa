import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('conversation detail owns the full screen without duplicated app chrome', () => {
  const shell = read('src/app/AppShell.tsx')
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  assert.match(shell, /isConversationDetail/)
  assert.match(shell, /conversation-fullscreen-shell/)
  assert.match(shell, /<Outlet \/>/)
  assert.match(detail, /conversation-messenger__header/)
  assert.match(detail, /conversation-messenger__thread/)
  assert.match(detail, /conversation-messenger__composer/)
})

test('conversation composer sends with Enter and preserves Shift+Enter for line breaks', () => {
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  assert.match(detail, /event\.key!==['"]Enter['"]/)
  assert.match(detail, /event\.shiftKey/)
  assert.match(detail, /event\.preventDefault\(\)/)
  assert.match(detail, /onKeyDown=\{handleComposerKeyDown\}/)
})

test('outbound delivery states are presented in Portuguese', () => {
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  for (const label of ['Aguardando envio','Enviada','Entregue','Lida','Não enviada']) {
    assert.match(detail, new RegExp(label))
  }
})

test('message history refreshes even when enqueue returns an error', () => {
  const operations = read('src/features/operations/api.ts')
  const sendHook = operations.slice(
    operations.indexOf('export function useSendConversationMessage'),
    operations.indexOf('export function useBusiness'),
  )
  assert.match(sendHook, /onSettled/)
  assert.match(sendHook, /invalidate\(context\.businessId,'conversations','conversation','dashboard'\)/)
  assert.doesNotMatch(sendHook, /onSuccess:\(\)=>invalidate/)
})

test('messenger layout constrains mobile width and keeps the thread scrollable', () => {
  const styles = read('src/features/conversations/conversation-messenger.css')
  assert.match(styles, /height:\s*100dvh/)
  assert.match(styles, /overflow:\s*hidden/)
  assert.match(styles, /overflow-y:\s*auto/)
  assert.match(styles, /@media \(max-width:\s*430px\)/)
  assert.match(styles, /max-width:\s*88%/)
})
