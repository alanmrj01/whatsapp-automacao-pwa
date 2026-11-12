import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { BottomNavigation } from '../components/BottomNavigation'
import { DesktopSidebar } from '../components/DesktopSidebar'
import { BusinessSelector } from '../features/auth/BusinessSelector'
import { UpgradePromptProvider } from '../features/access/UpgradePrompt'
import { useUpgradePrompt } from '../features/access/upgradePromptContext'
import { NotificationCenter } from '../features/notifications/NotificationCenter'
import { ReengagementPrompt } from '../features/notifications/ReengagementPrompt'
import { useSetupStatus } from '../features/operations/api'
import { useConnection } from '../features/whatsapp/useConnection'
import { EmbeddedSignupButton } from '../features/whatsapp/EmbeddedSignupButton'
import { deriveConnectionJourney } from '../features/whatsapp/connectionJourney'
import { useEntitlements } from '../features/access/useEntitlements'
import { DemoDataNotice } from '../features/access/DemoDataNotice'
import { useMessageUsage, useSubscriptionStatus } from '../features/billing/api'
import { useAuth } from '../features/auth/useAuth'

const titles: Record<string, string> = {
  '/app': 'Início',
  '/app/agenda': 'Agenda',
  '/app/conversas': 'Conversas',
  '/app/whatsapp': 'WhatsApp',
  '/app/mais': 'Configurações',
  '/app/mais/empresa': 'Dados da empresa',
  '/app/mais/servicos': 'Catálogo de serviços',
  '/app/mais/catalogo': 'Catálogo da empresa',
  '/app/mais/horarios': 'Horários',
  '/app/mais/automacao': 'Automação',
  '/app/mais/relacionamento': 'Preventivas',
  '/app/mais/equipe': 'Equipe',
  '/app/mais/agenda': 'Configurar agenda',
}

export function AppShell() {
  const { pathname } = useLocation()
  const entitlement = useEntitlements()
  const {syncSession} = useAuth()
  const usage = useMessageUsage()
  const subscription = useSubscriptionStatus()
  const demo = entitlement.usesDemoData
  const isConversationDetail = /^\/app\/conversas\/[^/]+$/.test(pathname)
  const isWhatsAppDetail = pathname.startsWith('/app/whatsapp/')
  const isSettingsDetail = pathname.startsWith('/app/mais/')
  const isDetail = isWhatsAppDetail||isSettingsDetail
  const title = titles[pathname] ?? 'Conectar WhatsApp'

  useEffect(() => {
    const accessUntil = subscription.data?.access_until
    if (!entitlement.isPaid || !accessUntil) return
    let timer:number | undefined
    const synchronizeAtExpiry = () => {
      const remaining = new Date(accessUntil).getTime() - Date.now()
      if (remaining <= 0) {
        void syncSession().catch(() => undefined)
        return
      }
      timer = window.setTimeout(
        synchronizeAtExpiry,
        Math.min(remaining + 1000, 86_400_000),
      )
    }
    synchronizeAtExpiry()
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [entitlement.isPaid, subscription.data?.access_until, syncSession])

  if (isConversationDetail) {
    return (
      <UpgradePromptProvider>
        <div className="conversation-route-shell" id="main-content">
          <NotificationCenter backgroundOnly />
          {demo&&<DemoDataNotice />}
          {entitlement.isReadOnlyRetained&&<RetainedAccessBanner />}
          {!demo&&<WhatsAppPendingBanner />}
          <Outlet />
          <ReengagementPrompt />
        </div>
      </UpgradePromptProvider>
    )
  }

  return (
    <UpgradePromptProvider>
    <div className="app-layout">
      <DesktopSidebar />
      <div className="app-column">
        <AppHeader
          title={title}
          showBack={isDetail}
          backTo={isSettingsDetail?'/app/mais':'/app/whatsapp'}
          brandContent={entitlement.isPaid&&usage.data?.quota_applies&&usage.data.limit!==null
            ? <div className="message-credit" aria-label={`Crédito de Mensagens: ${usage.data.used} de ${usage.data.limit}`}>
                <span>Crédito de Mensagens</span>
                <strong>{usage.data.used.toLocaleString('pt-BR')}/{usage.data.limit.toLocaleString('pt-BR')}</strong>
              </div>
            : undefined}
          actions={<NotificationCenter/>}
        />
        <main className="app-content" id="main-content">
          <div className="page-stack"><BusinessSelector /></div>
          {demo&&<DemoDataNotice />}
          {entitlement.isReadOnlyRetained&&<RetainedAccessBanner />}
          {!demo&&<WhatsAppPendingBanner />}
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
    <ReengagementPrompt />
    </UpgradePromptProvider>
  )
}

function RetainedAccessBanner() {
  const {openUpgrade}=useUpgradePrompt()
  return <section className="app-pending-banner app-retained-access-banner" role="status">
    <div>
      <strong>não deixe seus clientes esperando, ative o assistente virtual</strong>
    </div>
    <button className="compact-button" type="button" onClick={()=>openUpgrade('O Assistente Virtual')}>
      Ativar
    </button>
  </section>
}


function WhatsAppPendingBanner() {
  const setup=useSetupStatus()
  const connection=useConnection()
  const status=connection.data?.status
  const mode=connection.data?.mode
  const journey=deriveConnectionJourney(connection.data)
  const connected=setup.data?.whatsapp===true||status==='connected'
  const pending=setup.data?.onboarding_completed===true&&!connected
  if(!pending)return null

  if(journey.state==='meta_review_pending'){
    return <section className="app-pending-banner" role="status">
      <div>
        <strong>{journey.title}</strong>
        <span>{journey.message}</span>
        <span><b>Sua ação agora:</b> nenhuma. Você pode continuar usando o Alovia enquanto a Meta conclui a análise.</span>
      </div>
    </section>
  }

  if(journey.state==='validating_connection'){
    return <section className="app-pending-banner" role="status">
      <div>
        <strong>{journey.title}</strong>
        <span>{journey.message}</span>
        <span><b>Sua ação agora:</b> nenhuma. A validação continua no servidor e esta tela será atualizada automaticamente.</span>
      </div>
    </section>
  }

  const directMetaAction=journey.nextAction==='continue_authorization'||journey.nextAction==='resolve_connection'

  return <section className="app-pending-banner" role="status">
    <div>
      <strong>{journey.title}</strong>
      <span>{journey.message}</span>
    </div>
    {journey.nextAction==='review_meta_rejection'
      ? <Link className="compact-button" to="/app/whatsapp">Ver orientação</Link>
      : journey.requiresUserAction&&directMetaAction&&mode==='coexistence'
        ? <EmbeddedSignupButton />
        : journey.requiresUserAction&&directMetaAction&&mode==='api_only'
          ? <Link className="compact-button" to="/app/whatsapp/exclusivo">Continuar conexão</Link>
          : journey.requiresUserAction
            ? <Link className="compact-button" to="/app/whatsapp?continuar=1">{journey.ctaLabel??'Continuar'}</Link>
            : null}
  </section>
}
