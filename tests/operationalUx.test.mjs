import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { demoAppointments, demoConversations, demoOverview, demoToday, demoTomorrow, shiftDemoDate } from '../src/demo/operationalDemo.ts'
import { DEMO_DATA_NOTICE, entitlementsFor, requirePaidAccess, UpgradeRequiredError } from '../src/features/access/entitlements.ts'
import { deriveProductState } from '../src/features/product/deriveProductState.ts'
import { zonedDateTimeToIso } from '../src/features/operations/timezone.ts'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('operational product states distinguish demo, setup, active and failures', () => {
  assert.equal(deriveProductState({access_mode:'free'}),'FREE_DEMO')
  assert.equal(deriveProductState({access_mode:'paid'},{status:'disconnected'}),'SETUP_PENDING')
  assert.equal(deriveProductState({access_mode:'paid'},{status:'connected'}),'ACTIVE')
  assert.equal(deriveProductState({access_mode:'paid'},{status:'connected'},{},{completed:4,total:5}),'SETUP_PENDING')
  assert.equal(deriveProductState({access_mode:'paid'},{status:'connected'},{},{completed:5,total:5}),'ACTIVE')
  assert.equal(deriveProductState({access_mode:'paid'},{status:'pending'}),'CONNECTION_PENDING')
  assert.equal(deriveProductState({access_mode:'paid'},undefined,{isError:true}),'ERROR')
})

test('paid operation uses authenticated public APIs while free mode disables every operational query', () => {
  const operations = read('src/features/operations/api.ts')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const conversations = read('src/features/conversations/ConversationsPage.tsx')
  assert.match(operations,/entitlementsFor\(membership\)\.canReadOperationalData/)
  assert.match(operations,/enabled:context\.enabled/)
  assert.match(operations,/requirePaidAccess\(context\.membership\)/)
  assert.doesNotMatch(operations,/\/internal\//)
  assert.match(dashboard,/useDashboardToday/)
  assert.match(agenda,/useAppointments/)
  assert.match(agenda,/useSaveAppointment/)
  assert.match(conversations,/useConversations/)
  assert.match(conversations,/useConversation/)
})

test('setup and More routes are backed by real data and configuration mutations', () => {
  const operations = read('src/features/operations/api.ts')
  const router = read('src/app/router.tsx')
  const more = read('src/features/more/MorePage.tsx')
  const settings = read('src/features/more/OperationalSettingsPages.tsx')
  for (const route of ['empresa','horarios','automacao','equipe','agenda']) assert.match(router,new RegExp(`mais/${route}`))
  assert.match(operations,/\/setup\/status/)
  assert.match(more,/setup\.data\?\.completed/)
  for (const hook of ['useUpdateBusiness','useCreateWorkingHours','useUpdateAutomation','useCreateEmployee','useCreateService']) assert.match(settings,new RegExp(hook))
})

test('mutations invalidate only tenant operational resources that changed', () => {
  const operations = read('src/features/operations/api.ts')
  assert.match(operations,/invalidate\(context\.businessId,'appointments','dashboard','setup'\)/)
  assert.match(operations,/invalidate\(context\.businessId,'working-hours','setup'\)/)
  assert.match(operations,/invalidate\(context\.businessId,'automation','setup'\)/)
  assert.match(operations,/invalidate\(context\.businessId,'employees','setup'\)/)
})

test('main navigation stays focused and WhatsApp setup remains available from More', () => {
  const navigation = read('src/components/navigation.ts')
  const more = read('src/features/more/MorePage.tsx')
  assert.deepEqual([...navigation.matchAll(/label: '([^']+)'/g)].map(match=>match[1]),['Início','Conversas','Agenda','Mais'])
  assert.match(more, /to="\/app\/whatsapp"/)
  assert.match(more, /Configuração \{completed\} de 5/)
})

test('free dashboard is populated from isolated demo data and points to setup', () => {
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const conversations = read('src/features/conversations/ConversationsPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const connection = read('src/features/whatsapp/useConnection.ts')
  assert.match(dashboard, /demoOverview/)
  assert.match(dashboard, /\/app\/mais#configuracao/)
  assert.match(dashboard, /\/app\/agenda\?action=new/)
  assert.doesNotMatch(`${dashboard}${conversations}${agenda}`, /api\.request/)
  assert.match(connection, /enabled:!!membership && paid/)
})

test('one entitlement policy separates free demo from paid operational access', () => {
  const free = entitlementsFor({access_mode:'free',role:'owner'})
  const paid = entitlementsFor({access_mode:'paid',role:'owner'})
  assert.equal(free.usesDemoData,true)
  assert.equal(free.canReadOperationalData,false)
  assert.equal(free.canMutateOperationalData,false)
  assert.equal(paid.usesDemoData,false)
  assert.equal(paid.canReadOperationalData,true)
  assert.doesNotThrow(()=>requirePaidAccess({access_mode:'paid',role:'owner'}))
  assert.throws(()=>requirePaidAccess({access_mode:'free',role:'owner'}),UpgradeRequiredError)
})

test('every free operational screen shows the exact fictitious-data warning', () => {
  const notice = read('src/features/access/DemoDataNotice.tsx')
  assert.equal(DEMO_DATA_NOTICE,'Modo demonstração — dados ilustrativos para você visualizar como o ALOVIA funciona.')
  assert.match(notice,/DEMO_DATA_NOTICE/)
  for (const page of ['DashboardPage.tsx','appointments/AgendaPage.tsx','conversations/ConversationsPage.tsx']) {
    const path = page.includes('/') ? `src/features/${page}` : `src/features/dashboard/${page}`
    assert.match(read(path),/DemoDataNotice/)
  }
})

test('demo dates roll with the current day instead of expiring on a fixed calendar date', () => {
  const source = read('src/demo/operationalDemo.ts')
  const preview = read('src/features/preview/PlatformPreviewPage.tsx')
  assert.match(demoToday,/^\d{4}-\d{2}-\d{2}$/)
  assert.equal(demoTomorrow,shiftDemoDate(demoToday,1))
  assert.equal(demoAppointments.at(-1).date,demoTomorrow)
  assert.doesNotMatch(source,/demoToday\s*=\s*['"]\d{4}-\d{2}-\d{2}['"]/)
  assert.doesNotMatch(preview,/Setembro 2026|8 de setembro de 2026/)
  assert.match(preview,/demoMonthLabel/)
  assert.match(preview,/demoDayLabel/)
})

test('demo agenda is static, opens details and routes every mutation to upgrade', () => {
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  assert.match(agenda,/setSelectedDemo\(item\)/)
  assert.match(agenda,/openUpgrade\('Criar um novo agendamento'\)/)
  assert.match(agenda,/Exemplo somente para visualização/)
  assert.doesNotMatch(agenda,/saveDemoAppointment|cancelDemoAppointment|setAppointments/)
  assert.equal(demoAppointments.length,3)
  assert.ok(demoAppointments.every(item => demoConversations.some(conversation => conversation.id===item.conversationId && conversation.appointmentId===item.id)))
})

test('demo conversations cover the service journey and route reply actions to upgrade', () => {
  const page = read('src/features/conversations/ConversationsPage.tsx')
  assert.ok(demoConversations.every(item=>item.messages.length>=5))
  assert.ok(demoConversations.some(item=>item.messages.some(message=>message.direction==='assistant'&&/agendamento|disponibilidade/i.test(message.body))))
  for (const scenario of ['valor correto','disponibilidade','endereço','Agendamento','Reagendamento','Dúvida frequente resolvida']) {
    assert.match(JSON.stringify(demoConversations),new RegExp(scenario,'i'))
  }
  assert.ok(demoConversations.some(item=>item.messages.some(message=>message.direction==='system')))
  assert.match(page,/selectDemo\(item\.id\)/)
  assert.match(page,/Assistente ALOVIA/)
  assert.match(page,/Atualização do atendimento/)
  assert.match(page,/>Anterior</)
  assert.match(page,/>Próxima</)
  assert.match(page,/openUpgrade\('Responder ou assumir uma conversa'\)/)
  assert.equal(demoOverview.waiting,demoConversations.filter(item=>item.status==='waiting').length)
  assert.equal(demoOverview.inProgress,demoConversations.filter(item=>item.status==='in_progress').length)
  assert.equal(demoOverview.appointmentsToday,demoAppointments.filter(item=>item.date===demoToday).length)
})

test('blocked free actions open the shared acquisition prompt instead of becoming dead controls', () => {
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const more = read('src/features/more/MorePage.tsx')
  const conversations = read('src/features/conversations/ConversationsPage.tsx')
  const whatsapp = read('src/features/whatsapp/WhatsAppPage.tsx')
  const prompt = read('src/features/access/UpgradePrompt.tsx')
  for (const source of [dashboard,agenda,more,conversations,whatsapp]) assert.match(source,/openUpgrade/)
  assert.match(prompt,/Disponível no plano pago/)
  assert.match(prompt,/nenhuma cobrança é criada/i)
})

test('WhatsApp status is contextual and connection data avoids refetch on every tab focus', () => {
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const whatsapp = read('src/features/whatsapp/WhatsAppPage.tsx')
  const connection = read('src/features/whatsapp/useConnection.ts')
  assert.match(dashboard,/whatsapp-summary/)
  for (const state of ['disconnected','pending','connected','error']) assert.match(whatsapp,new RegExp(state))
  assert.match(whatsapp,/connection-facts/)
  assert.match(connection,/staleTime:60_000/)
  assert.match(connection,/gcTime:5\s*\*\s*60_000/)
  assert.match(connection,/refetchOnWindowFocus:false/)
})

test('paid agenda reads the hydrated membership without loading unused product setup data', () => {
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  assert.match(agenda,/useAuth\(\)/)
  assert.doesNotMatch(agenda,/useProductState/)
})

test('More prioritizes WhatsApp before the remaining operational setup', () => {
  const more = read('src/features/more/MorePage.tsx')
  assert.ok(more.indexOf('<Section title="WhatsApp">') < more.indexOf('<Section title="Atendimento">'))
})

test('real agenda converts company-local schedules to an absolute instant', () => {
  assert.equal(zonedDateTimeToIso('2026-09-09','09:00','America/Sao_Paulo'),'2026-09-09T12:00:00.000Z')
})

test('information help is reusable and accessible on pointer and touch layouts', () => {
  const info = read('src/components/InfoHelp.tsx')
  assert.match(info, /aria-label=\{`Mais informações sobre/)
  assert.match(info, /aria-expanded=\{open\}/)
  assert.match(info, /event\.key === 'Escape'/)
  assert.match(info, /<BottomSheet open=\{open\}/)
  assert.match(info, /triggerRef\.current\?\.focus\(\)/)
})

test('admin preview consumes the same isolated demo dataset without financial claims', () => {
  const preview = read('src/features/preview/PlatformPreviewPage.tsx')
  assert.match(preview, /demoAppointments, demoBusinessName, demoConversations, demoOverview/)
  assert.doesNotMatch(preview, /R\$|faturamento|receita/i)
})

test('routes are lazy-loaded so the initial shell does not bundle every feature eagerly', () => {
  const router = read('src/app/router.tsx')
  assert.match(router,/lazy\(async/)
  assert.match(router,/Suspense/)
  assert.doesNotMatch(router,/import \{ DashboardPage \}/)
})
