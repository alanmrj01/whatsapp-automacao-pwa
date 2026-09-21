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
  assert.match(detail,/Dados do contato/)
  assert.match(detail,/conversation-contact-name-form/)
  assert.match(detail,/Assistente Virtual/)
  assert.match(detail,/Respondendo automaticamente/)
  assert.match(detail,/Pausado neste contato/)
  assert.match(detail,/Agendar/)
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
  assert.match(settings,/Mensagem quando não entende o pedido/)
  assert.match(settings,/Mensagem ao encaminhar para atendimento humano/)
  assert.match(settings,/Contatos sem resposta automática/)
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


test('conversation inbox exposes pin, read state and safe logical deletion', () => {
  const list = read('src/features/conversations/ConversationsPage.tsx')
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  const api = read('src/features/operations/api.ts')

  assert.match(list,/Fixar conversa/)
  assert.match(list,/Marcar como lida/)
  assert.match(list,/Excluir conversa/)
  assert.match(detail,/useSetConversationPinned/)
  assert.match(detail,/useSetConversationRead/)
  assert.match(detail,/useArchiveConversation/)
  assert.match(api,/\/conversations\/\$\{id\}\/pinned/)
  assert.match(api,/\/conversations\/\$\{id\}\/read/)
})

test('conversation contact panel shortcuts appointment creation with the current customer', () => {
  const detail = read('src/features/conversations/ConversationDetailPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')

  assert.match(detail,/URLSearchParams\(\{action:'new',customer:conversation\.customer_id\}\)/)
  assert.match(agenda,/requestedCustomer/)
  assert.match(agenda,/realDraft\(selectedDate,timezone,undefined,requestedCustomer\)/)
})

test('agenda defaults to calendar navigation with month, week and day detail', () => {
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const css = read('src/features/appointments/agenda-calendar.css')

  assert.match(agenda,/useState<CalendarView>\('month'\)/)
  assert.match(agenda,/Calendário mensal/)
  assert.match(agenda,/Calendário semanal/)
  assert.match(agenda,/Voltar ao calendário/)
  assert.match(agenda,/useAppointmentsRange/)
  assert.match(css,/\.agenda-calendar__grid/)
})

test('assistant exclusions use existing customers and human-only operational API', () => {
  const settings = read('src/features/more/OperationalSettingsPages.tsx')
  const api = read('src/features/operations/api.ts')

  assert.match(settings,/Contatos sem resposta automática/)
  assert.match(settings,/Nunca responder automaticamente/)
  assert.match(api,/\/automation\/exclusions/)
})
