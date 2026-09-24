import { Link, Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { BottomNavigation } from '../components/BottomNavigation'
import { DesktopSidebar } from '../components/DesktopSidebar'
import { BusinessSelector } from '../features/auth/BusinessSelector'
import { UpgradePromptProvider } from '../features/access/UpgradePrompt'
import { NotificationCenter } from '../features/notifications/NotificationCenter'
import { useSetupStatus } from '../features/operations/api'
import { useConnection } from '../features/whatsapp/useConnection'

const titles: Record<string, string> = {
  '/app': 'Início',
  '/app/agenda': 'Agenda',
  '/app/conversas': 'Conversas',
  '/app/whatsapp': 'WhatsApp',
  '/app/mais': 'Mais',
  '/app/mais/empresa': 'Dados da empresa',
  '/app/mais/servicos': 'Catálogo de serviços',
  '/app/mais/catalogo': 'Catálogo da empresa',
  '/app/mais/horarios': 'Horários',
  '/app/mais/automacao': 'Automação',
  '/app/mais/equipe': 'Equipe',
  '/app/mais/agenda': 'Configurar agenda',
}

export function AppShell() {
  const { pathname } = useLocation()
  const isConversationDetail = /^\/app\/conversas\/[^/]+$/.test(pathname)
  const isWhatsAppDetail = pathname.startsWith('/app/whatsapp/')
  const isSettingsDetail = pathname.startsWith('/app/mais/')
  const isDetail = isWhatsAppDetail||isSettingsDetail
  const title = titles[pathname] ?? 'Conectar WhatsApp'

  if (isConversationDetail) {
    return (
      <UpgradePromptProvider>
        <div className="conversation-route-shell" id="main-content">
          <NotificationCenter backgroundOnly />
          <WhatsAppPendingBanner />
          <Outlet />
        </div>
      </UpgradePromptProvider>
    )
  }

  return (
    <UpgradePromptProvider>
    <div className="app-layout">
      <DesktopSidebar />
      <div className="app-column">
        <AppHeader title={title} showBack={isDetail} backTo={isSettingsDetail?'/app/mais':'/app/whatsapp'} actions={<NotificationCenter/>} />
        <main className="app-content" id="main-content">
          <div className="page-stack"><BusinessSelector /></div>
          <WhatsAppPendingBanner />
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
    </UpgradePromptProvider>
  )
}


function WhatsAppPendingBanner() {
  const setup=useSetupStatus()
  const connection=useConnection()
  const connected=setup.data?.whatsapp===true||connection.data?.status==='connected'
  const pending=setup.data?.onboarding_completed===true&&!connected
  if(!pending)return null
  return <section className="app-pending-banner" role="status">
    <div>
      <strong>Conexão com WhatsApp pendente</strong>
      <span>Você pode visualizar o ALOVIA, mas o atendimento automático pelo WhatsApp ficará indisponível até concluir a conexão.</span>
    </div>
    <Link className="compact-button" to="/app/whatsapp">Conectar WhatsApp</Link>
  </section>
}
