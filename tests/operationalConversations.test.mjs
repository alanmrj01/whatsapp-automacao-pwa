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
  assert.match(detail,/conversation-composer/)
  assert.match(detail,/maxLength=\{4096\}/)
  assert.match(detail,/navigator\.clipboard\.writeText/)
  assert.match(detail,/Dados do contato/)
  assert.match(detail,/conversation-contact-name-form/)
  assert.match(detail,/Assistente nesta conversa/)
  assert.match(detail,/Respostas automáticas permanentes/)
  assert.match(detail,/Nunca responder automaticamente/)
  assert.match(detail,/Agendar/)
  assert.match(detail,/janela de atendimento está encerrada/i)
  assert.match(api,/Idempotency-Key/)
  assert.match(api,/onSettled:\(\)=>invalidate\(context\.businessId,'conversations','conversation','dashboard'\)/)
})

test('assistant settings expose semantic recognition and permanent human-only contacts', () => {
  const settings = read('src/features/more/AutomationSettingsPage.tsx')
  const team = read('src/features/more/TeamSettingsPage.tsx')
  const types = read('src/features/operations/types.ts')
  const api = read('src/features/operations/api.ts')

  assert.match(settings,/Assistente Virtual ativo/)
  assert.match(settings,/Mensagem inicial/)
  assert.match(settings,/Como o ALOVIA reconhece seus serviços/)
  assert.match(settings,/Frases de referência/)
  assert.match(settings,/Contatos sem resposta automática/)
  assert.match(settings,/Nunca responder automaticamente/)
  assert.match(team,/Técnico/)
  assert.match(team,/Auxiliar/)
  assert.match(team,/Administrador/)
  assert.match(team,/Função operacional/)
  assert.match(team,/pode ser alocado em qualquer serviço/)
  assert.match(types,/OperationalRole = 'technician'\|'assistant'\|'administrator'/)
  assert.match(api,/operational_role/)
  assert.match(api,/\/automation\/exclusions/)
})

test('conversation layout remains mobile-safe and composer stays inside the full-screen route', () => {
  const css = read('src/features/conversations/conversation-detail.css')
  assert.match(css,/height:\s*100dvh/)
  assert.match(css,/overflow:\s*hidden/)
  assert.match(css,/\.conversation-route-shell \.conversation-composer/)
  assert.match(css,/@media \(max-width: 430px\)/)
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
  assert.match(detail,/useDeleteConversation/)
  assert.match(api,/\/conversations\/\$\{id\}\/actions/)
  assert.match(api,/method:'DELETE'/)
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
  const settings = read('src/features/more/AutomationSettingsPage.tsx')
  const api = read('src/features/operations/api.ts')

  assert.match(settings,/Contatos sem resposta automática/)
  assert.match(settings,/mode:'human_only'/)
  assert.match(api,/\/automation\/exclusions/)
})
