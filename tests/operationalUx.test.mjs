import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { cancelDemoAppointment, demoAppointments, demoToday, demoTomorrow, saveDemoAppointment, shiftDemoDate } from '../src/demo/operationalDemo.ts'
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
  assert.match(operations,/membership\?\.access_mode==='paid'/)
  assert.match(operations,/enabled:context\.enabled/)
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

test('demo agenda supports deterministic create, edit and cancel operations', () => {
  const created = {...demoAppointments[0],id:'appointment-test',customer:'Cliente Demo'}
  const withCreated = saveDemoAppointment(demoAppointments,created)
  assert.equal(withCreated.at(-1).customer,'Cliente Demo')
  const edited = {...created,time:'17:00'}
  assert.equal(saveDemoAppointment(withCreated,edited).find(item=>item.id===created.id).time,'17:00')
  assert.equal(cancelDemoAppointment(withCreated,created.id).find(item=>item.id===created.id).status,'cancelled')
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
