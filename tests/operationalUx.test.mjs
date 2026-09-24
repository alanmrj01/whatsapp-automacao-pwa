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
  assert.equal(deriveProductState({access_mode:'paid'},{status:'connected'},{},{completed:6,total:7}),'SETUP_PENDING')
  assert.equal(deriveProductState({access_mode:'paid'},{status:'connected'},{},{completed:7,total:7}),'ACTIVE')
  assert.equal(deriveProductState({access_mode:'paid'},{status:'pending'}),'CONNECTION_PENDING')
  assert.equal(deriveProductState({access_mode:'paid'},undefined,{isError:true}),'ERROR')
})

test('paid operation uses authenticated public APIs while free mode disables every operational query', () => {
  const operations = read('src/features/operations/api.ts')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const conversations = read('src/features/conversations/ConversationsPage.tsx')
  const conversationDetail = read('src/features/conversations/ConversationDetailPage.tsx')
  assert.match(operations,/entitlementsFor\(membership\)\.canReadOperationalData/)
  assert.match(operations,/enabled:context\.enabled/)
  assert.match(operations,/requirePaidAccess\(context\.membership\)/)
  assert.doesNotMatch(operations,/\/internal\//)
  assert.match(dashboard,/useDashboardToday/)
  assert.match(agenda,/useAppointments/)
  assert.match(agenda,/useSaveAppointment/)
  assert.match(conversations,/useConversations/)
  assert.match(conversationDetail,/useConversation/)
})

test('paid accounts are guided through seven persisted onboarding steps before normal navigation', () => {
  const operations = read('src/features/operations/api.ts')
  const router = read('src/app/router.tsx')
  const onboarding = read('src/features/onboarding/OnboardingPage.tsx')
  for (const route of ['empresa','servicos','catalogo','horarios','automacao','equipe','agenda']) assert.match(router,new RegExp(`mais/${route}`))
  assert.match(operations,/\/setup\/status/)
  assert.match(operations,/\/setup\/complete/)
  assert.match(router,/OnboardingGuard/)
  assert.match(router,/\/app\/onboarding/)
  assert.match(onboarding,/Etapa \{step\} de \{TOTAL_STEPS\}/)
  assert.match(onboarding,/const TOTAL_STEPS=7/)
  assert.match(onboarding,/As funcionalidades da sua conta estão liberadas/)
  assert.match(onboarding,/7 etapas · leva poucos minutos/)
  assert.match(onboarding,/<SessionActions\/>/)
  assert.match(onboarding,/<Navigate to="\/app" replace\/>/)
  assert.match(onboarding,/!result\.onboarding_completed\|\|!result\.onboarding_completed_at/)
  assert.match(onboarding,/connection\.data\?\.status==='connected'\|\|setup\.data\?\.whatsapp===true/)
  assert.match(router,/setup\.data\?\.onboarding_completed \? children : <Navigate to="\/app\/onboarding" replace\/>/)
})

test('company hours are configured independently from technicians and support weekdays plus weekends', () => {
  const onboarding = read('src/features/onboarding/OnboardingPage.tsx')
  const settings = read('src/features/more/WorkingHoursSettingsPage.tsx')
  const operations = read('src/features/operations/api.ts')
  assert.match(onboarding,/Dias da semana/)
  assert.match(onboarding,/Selecionar segunda a sexta/)
  assert.doesNotMatch(onboarding,/label>Técnico<select/)
  assert.match(onboarding,/finais de semana e feriados nacionais/i)
  assert.match(settings,/useBusinessHours/)
  assert.match(operations,/\/business-hours/)
})

test('paid WhatsApp connection supports explicit disconnect without keeping marketing content', () => {
  const whatsapp = read('src/features/whatsapp/WhatsAppPage.tsx')
  const connection = read('src/features/whatsapp/useConnection.ts')
  assert.match(whatsapp,/Desconectar WhatsApp/)
  assert.match(whatsapp,/Confirmar desconexão/)
  assert.match(connection,/\/whatsapp\/disconnect/)
  const paidSection = whatsapp.slice(whatsapp.indexOf("if (connection.isPending)"))
  assert.doesNotMatch(paidSection,/O diferencial da Alovia/)
})

test('materials onboarding supports an explicit no-separate-charge decision and simple units', () => {
  const onboarding = read('src/features/onboarding/OnboardingPage.tsx')
  const materials = read('src/features/more/MaterialsCatalogPage.tsx')
  const operations = read('src/features/operations/api.ts')
  assert.match(onboarding,/Minha empresa não cobra materiais adicionais separadamente/)
  assert.match(onboarding,/materials_catalog_reviewed:true/)
  assert.match(onboarding,/remove\.mutateAsync\(item\.id\)/)
  assert.match(materials,/Minha empresa não cobra materiais adicionais separadamente/)
  for (const unit of ['metro','unidade','kit','valor fixo']) assert.match(materials,new RegExp(`value:'${unit}'`))
  assert.match(materials,/unit_label:newUnit/)
  assert.match(materials,/unit_label:draft\.unit/)
  assert.match(operations,/'materials_catalog_reviewed'/)
})

test('completed onboarding stays unlocked and exposes configuration warnings without reblocking', () => {
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const more = read('src/features/more/MorePage.tsx')
  const router = read('src/app/router.tsx')
  for (const source of [dashboard,more]) {
    assert.match(source,/blocking_reasons/)
    assert.match(source,/Revise sua configuração/)
  }
  assert.match(dashboard,/Corrigir configuração/)
  assert.match(router,/setup\.data\?\.onboarding_completed \? children/)
})

test('automatic booking notifications use authenticated polling and honest browser-local alerts', () => {
  const operations = read('src/features/operations/api.ts')
  const center = read('src/features/notifications/NotificationCenter.tsx')
  const shell = read('src/app/AppShell.tsx')
  assert.match(operations,/\/notifications\?unread_only=/)
  assert.match(operations,/\/notifications\/\$\{id\}\/read/)
  assert.match(operations,/refetchInterval:30_000/)
  assert.match(center,/Notification\.requestPermission\(\)/)
  assert.match(center,/permission==='granted'/)
  assert.match(center,/Alertas em segundo plano exigem infraestrutura Web Push/)
  assert.match(center,/safeTarget/)
  assert.match(shell,/<NotificationCenter\/>/)
  assert.match(shell,/<NotificationCenter backgroundOnly \/>/)
})

test('mutations invalidate only tenant operational resources that changed', () => {
  const operations = read('src/features/operations/api.ts')
  assert.match(operations,/invalidate\(context\.businessId,'appointments','appointments-range','dashboard','setup'\)/)
  assert.match(operations,/invalidate\(context\.businessId,'working-hours','setup'\)/)
  assert.match(operations,/invalidate\(context\.businessId,'automation','setup'\)/)
  assert.match(operations,/invalidate\(context\.businessId,'employees','setup'\)/)
})

test('main navigation stays focused and WhatsApp setup remains available from More', () => {
  const navigation = read('src/components/navigation.ts')
  const more = read('src/features/more/MorePage.tsx')
  assert.deepEqual([...navigation.matchAll(/label: '([^']+)'/g)].map(match=>match[1]),['Início','Conversas','Agenda','Mais'])
  assert.match(more, /to="\/app\/whatsapp"/)
  assert.match(more, /Configuração inicial concluída/)
})

test('never-activated free dashboard is populated from isolated demo data and points to setup', () => {
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const conversations = read('src/features/conversations/ConversationsPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const connection = read('src/features/whatsapp/useConnection.ts')
  assert.match(dashboard, /demoOverview/)
  assert.match(dashboard, /\/app\/mais#configuracao/)
  assert.match(dashboard, /\/app\/agenda\?action=new/)
  assert.doesNotMatch(`${dashboard}${conversations}${agenda}`, /api\.request/)
  assert.match(connection, /canReadOperationalData/)
  assert.match(connection, /enabled:!!membership && canRead/)
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

test('blocked free actions open the compact subscription prompt instead of becoming dead controls', () => {
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const agenda = read('src/features/appointments/AgendaPage.tsx')
  const more = read('src/features/more/MorePage.tsx')
  const conversations = read('src/features/conversations/ConversationsPage.tsx')
  const whatsapp = read('src/features/whatsapp/WhatsAppPage.tsx')
  const prompt = read('src/features/access/UpgradePrompt.tsx')
  for (const source of [dashboard,agenda,more,conversations,whatsapp]) assert.match(source,/openUpgrade/)
  assert.match(prompt,/Disponível com assinatura/)
  assert.match(prompt,/Assine para usar esta função com os dados reais da sua empresa\./)
  assert.match(prompt,/Ver planos/)
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
  assert.match(more,/title="Assistente Virtual"/)
  assert.match(more,/title="Técnicos e responsáveis"/)
  assert.doesNotMatch(more,/Equipe e responsáveis/)
  assert.ok(more.indexOf('title="Dados da empresa"') < more.indexOf('title="Técnicos e responsáveis"'))
})

test('company data, services and materials are separated into simple focused screens', () => {
  const company = read('src/features/more/CompanySettingsPage.tsx')
  const services = read('src/features/more/ServiceCatalogPage.tsx')
  const materials = read('src/features/more/MaterialsCatalogPage.tsx')
  const agenda = read('src/features/more/AgendaSettingsPage.tsx')
  assert.match(company,/Responsável pela empresa/)
  assert.match(company,/Endereço de saída para o primeiro atendimento/)
  assert.doesNotMatch(company,/Novo serviço/)
  assert.match(services,/Catálogo de serviços/)
  assert.match(services,/Preço \(R\$\)/)
  assert.match(materials,/Catálogo de equipamentos e materiais/)
  assert.match(materials,/Descrição/)
  assert.match(agenda,/Automático pelo ALOVIA/)
  assert.doesNotMatch(agenda,/Deslocamento entre atendimentos/)
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


test('required markers stay compact and catalog saves reject incomplete visible items', () => {
  const required = read('src/components/RequiredLabel.tsx')
  const onboarding = read('src/features/onboarding/OnboardingPage.tsx')
  const services = read('src/features/more/ServiceCatalogPage.tsx')
  const materials = read('src/features/more/MaterialsCatalogPage.tsx')

  assert.match(required,/required-field-star/)
  assert.match(required,/>\*</)
  assert.doesNotMatch(required,/Obrigatório/)

  assert.match(onboarding,/catalogInvalid/)
  assert.match(onboarding,/if\(catalogInvalid\)return false/)
  assert.match(onboarding,/Descrição<\/span><span className="optional-label">Opcional/)
  assert.doesNotMatch(onboarding,/<RequiredLabel>Descrição<\/RequiredLabel>/)

  assert.match(services,/if\(catalogInvalid\)return/)
  assert.match(services,/<RequiredLabel>Serviço<\/RequiredLabel>/)
  assert.match(materials,/if\(catalogInvalid\)return/)
  assert.match(materials,/optional-label/)
  assert.doesNotMatch(materials,/<RequiredLabel>Descrição<\/RequiredLabel>/)
})


test('WhatsApp is the only onboarding step that can be deferred and remains visibly pending', () => {
  const onboarding = read('src/features/onboarding/OnboardingPage.tsx')
  const shell = read('src/app/AppShell.tsx')
  const dashboard = read('src/features/dashboard/DashboardPage.tsx')
  const more = read('src/features/more/MorePage.tsx')

  assert.match(onboarding,/Conectar Whatsapp Depois/)
  assert.match(onboarding,/onFinished\(deferred\)/)
  assert.match(onboarding,/A conexão com o WhatsApp ficou pendente/)
  assert.match(shell,/Conexão com WhatsApp pendente/)
  assert.match(shell,/setup\.data\?\.onboarding_completed===true&&!connected/)
  assert.match(shell,/to="\/app\/whatsapp"/)
  assert.match(dashboard,/nonWhatsAppBlockingReasons/)
  assert.match(more,/whatsappPending/)
})


test('company settings preserve the structured validated address workflow after onboarding', () => {
  const page = read('src/features/more/CompanySettingsPage.tsx')

  assert.match(page,/lookupPostalCode/)
  assert.match(page,/<RequiredLabel>CEP<\/RequiredLabel>/)
  assert.match(page,/<RequiredLabel>Rua<\/RequiredLabel>/)
  assert.match(page,/<RequiredLabel>Bairro<\/RequiredLabel>/)
  assert.match(page,/<RequiredLabel>Número<\/RequiredLabel>/)
  assert.match(page,/<RequiredLabel>Cidade<\/RequiredLabel>/)
  assert.match(page,/service_origin_postal_code/)
  assert.match(page,/service_origin_street/)
  assert.match(page,/service_origin_neighborhood/)
  assert.match(page,/service_origin_number/)
  assert.match(page,/service_origin_city/)
  assert.match(page,/service_origin_state/)
  assert.doesNotMatch(page,/Endereço de saída para o primeiro atendimento/)
})
