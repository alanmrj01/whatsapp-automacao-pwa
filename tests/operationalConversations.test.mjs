import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('real conversations use a full paid route with human reply controls', () => {
  const router = read('src/app/router.tsx')
  const list = read('src/features/conversations/ConversationsPage.tsx')
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  const api = read('src/features/operations/api.ts')

  assert.match(router,/path="conversas\/:conversationId"/)
  assert.match(router,/PaidOperationalGuard><ConversationDetailPage/)
  assert.match(list,/to=\{`\/app\/conversas\/\$\{item\.id\}`\}/)
  assert.doesNotMatch(list,/useConversation\(selected\)/)
  assert.match(detail,/conversation-composer/)
  assert.match(detail,/maxLength=\{4096\}/)
  assert.match(detail,/disabled=\{!text\.trim\(\)/)
  assert.match(detail,/navigator\.clipboard\.writeText/)
  assert.match(detail,/Editar nome/)
  assert.match(detail,/Pausar Assistente Virtual/)
  assert.match(detail,/Reativar Assistente Virtual/)
  assert.match(detail,/janela de atendimento está encerrada/i)
  assert.match(api,/Idempotency-Key/)
  assert.match(api,/invalidate\(context\.businessId,'conversations','conversation'/)
})

test('assistant settings and operational team roles are editable without changing RBAC', () => {
  const settings = read('src/features/more/OperationalSettingsPages.tsx')
  const types = read('src/features/operations/types.ts')
  const api = read('src/features/operations/api.ts')

  assert.match(settings,/title="Assistente Virtual"/)
  assert.match(settings,/Assistente Virtual ativo/)
  assert.match(settings,/Mensagem inicial/)
  assert.match(settings,/Mensagem de fallback/)
  assert.match(settings,/Mensagem de encaminhamento/)
  assert.match(settings,/Técnico/)
  assert.match(settings,/Auxiliar/)
  assert.match(settings,/Administrador/)
  assert.match(settings,/Função operacional/)
  assert.doesNotMatch(settings,/Equipe e responsáveis/)
  assert.match(types,/OperationalRole = 'technician'\|'assistant'\|'administrator'/)
  assert.match(api,/operational_role/)
  assert.doesNotMatch(`${settings}${types}${api}`,/SUPER_ADMIN|MembershipRole/)
})

test('conversation layout remains mobile-safe and composer stays above navigation', () => {
  const styles = read('src/styles/operational-app.css')

  assert.match(styles,/\.conversation-detail-page \{[^}]*min-width:0/)
  assert.match(styles,/\.conversation-thread \{[^}]*overflow-wrap:anywhere/)
  assert.match(styles,/bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)/)
  assert.match(styles,/@media \(min-width:900px\)/)
})
