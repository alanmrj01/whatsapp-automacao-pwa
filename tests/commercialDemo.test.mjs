import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { demoConversations } from '../src/demo/operationalDemo.ts'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('free demo conversation opens a dedicated route without mounting paid data hooks', () => {
  const router=read('src/app/router.tsx')
  const list=read('src/features/conversations/ConversationsPage.tsx')
  const detail=read('src/features/conversations/DemoConversationDetailPage.tsx')
  assert.match(router,/DemoOrPaidRoute demo=\{<DemoConversationDetailPage\/>\} paid=\{<ConversationDetailPage\/>\}/)
  assert.match(list,/navigate\(`\/app\/conversas\/\$\{item\.id\}`\)/)
  assert.doesNotMatch(list,/conversation-detail-toolbar|>Anterior<|>Próxima</)
  assert.doesNotMatch(detail,/useConversation|useConversationMessages|useSendConversationMessage|api\.request/)
  assert.match(detail,/conversation-detail-header/)
  assert.match(detail,/conversation-thread/)
  assert.match(detail,/conversation-composer/)
})

test('demo detail exposes product actions but every mutation routes to upgrade', () => {
  const detail=read('src/features/conversations/DemoConversationDetailPage.tsx')
  for(const action of ['Responder uma conversa','Criar um agendamento','Fixar uma conversa','Alterar o status de leitura','Alterar o nome do contato','Pausar ou ativar o Assistente Virtual','Excluir uma conversa']) assert.match(detail,new RegExp(action))
  assert.match(detail,/openUpgrade\(feature\)/)
  assert.doesNotMatch(detail,/\.mutate\(|method=['"](?:POST|PATCH|PUT|DELETE)/)
})

test('demo conversations are plausible first contacts and remain isolated fixtures', () => {
  assert.equal(demoConversations.length,6)
  assert.ok(demoConversations.every(item=>item.phone&&item.messages.length>=5))
  assert.ok(demoConversations.some(item=>/não está gelando/i.test(JSON.stringify(item.messages))))
  assert.ok(demoConversations.some(item=>/CEP/i.test(JSON.stringify(item.messages))))
  assert.ok(demoConversations.some(item=>item.status==='waiting'))
  assert.ok(demoConversations.some(item=>item.status==='answered'))
})

test('the application shell owns the single global demo warning', () => {
  const shell=read('src/app/AppShell.tsx')
  const notice=read('src/features/access/DemoDataNotice.tsx')
  assert.equal(shell.match(/demo&&<DemoDataNotice \/>/g)?.length,2,'one mutually exclusive banner per shell layout')
  assert.match(notice,/Estes exemplos são fictícios, não são salvos e nunca se misturam aos dados reais da sua empresa/)
  for(const page of ['DashboardPage.tsx','appointments/AgendaPage.tsx','conversations/ConversationsPage.tsx','whatsapp/WhatsAppPage.tsx','more/MorePage.tsx','billing/PlanPage.tsx']) {
    const path=page.includes('/')?`src/features/${page}`:`src/features/dashboard/${page}`
    assert.doesNotMatch(read(path),/DemoDataNotice/)
  }
})

test('More lets demo accounts navigate to isolated read-only previews', () => {
  const more=read('src/features/more/MorePage.tsx')
  const router=read('src/app/router.tsx')
  const preview=read('src/features/more/DemoSettingsPreviewPage.tsx')
  assert.match(more,/const canExplore=paid\|\|entitlement\.usesDemoData/)
  for(const [route,kind] of [['empresa','company'],['equipe','team'],['horarios','hours'],['servicos','services'],['catalogo','materials'],['automacao','assistant'],['relacionamento','preventives'],['agenda','agenda']]) {
    assert.match(router,new RegExp(`mais/${route}[^\n]+DemoSettingsPreviewPage kind="${kind}"`))
  }
  assert.doesNotMatch(preview,/useQuery|useMutation|api\.request|\.mutate\(/)
  assert.match(preview,/Somente leitura/)
  assert.match(preview,/PEMA Ar Condicionado|demoBusinessName/)
  assert.match(preview,/openUpgrade\(meta\.feature\)/)
})

test('paid components stay on the paid side of every entitlement route', () => {
  const router=read('src/app/router.tsx')
  for(const page of ['ConversationDetailPage','CompanySettingsPage','ServiceCatalogPage','MaterialsCatalogPage','WorkingHoursSettingsPage','AutomationSettingsPage','CustomerOutreachPage','TeamSettingsPage','AgendaSettingsPage']) assert.match(router,new RegExp(`paid=\\{<${page}`))
  assert.match(router,/if\(entitlement\.isPaid\)return paid/)
})

test('commercial copy matches the Basic MVP and planned Plus offer', () => {
  const prompt=read('src/features/access/UpgradePrompt.tsx')
  const page=read('src/features/billing/PlanPage.tsx')
  const catalog=read('src/features/billing/planCatalog.ts')
  const landing=read('src/features/public/PublicLandingPage.tsx')
  const coexistence=read('src/features/whatsapp/EmbeddedSignupButton.tsx')
  const apiOnly=read('src/features/whatsapp/ApiOnlyEmbeddedSignupButton.tsx')

  assert.match(prompt,/600 mensagens de serviço/)
  assert.match(page,/Em breve/)
  assert.match(catalog,/monthlyMessageLimit:600/)
  assert.match(catalog,/monthlyMessageLimit:1000/)
  assert.match(catalog,/Até 300 mensagens de utilidade\/mês/)
  assert.match(catalog,/return plan === 'basic'/)

  assert.match(landing,/Até 600 mensagens por mês/)
  assert.match(landing,/Até 1\.000 mensagens por mês/)
  assert.match(landing,/Oferta automática de manutenção preventiva para clientes já atendidos/)
  assert.match(landing,/Oferta automática de PMOC para clientes com histórico de PMOC/)
  assert.match(landing,/Lembretes de limpeza e retomada de atendimentos parados/)

  for (const signup of [coexistence,apiOnly]) {
    assert.match(signup,/Adicionar forma de pagamento/)
    assert.match(signup,/Toque em “Concluir”/)
    assert.match(signup,/não é o pagamento da Alovia/)
  }
})
