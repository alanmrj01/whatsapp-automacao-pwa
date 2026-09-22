import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { BottomNavigation } from '../components/BottomNavigation'
import { DesktopSidebar } from '../components/DesktopSidebar'
import { BusinessSelector } from '../features/auth/BusinessSelector'
import { UpgradePromptProvider } from '../features/access/UpgradePrompt'
import { useEntitlements } from '../features/access/useEntitlements'
import { useSetupStatus } from '../features/operations/api'

const titles: Record<string, string> = {
  '/app': 'Início',
  '/app/agenda': 'Agenda',
  '/app/conversas': 'Conversas',
  '/app/whatsapp': 'WhatsApp',
  '/app/mais': 'Mais',
  '/app/mais/empresa': 'Dados da empresa',
  '/app/mais/horarios': 'Horários',
  '/app/mais/automacao': 'Automação',
  '/app/mais/equipe': 'Equipe',
  '/app/mais/agenda': 'Configurar agenda',
}

export function AppShell() {
  const { pathname } = useLocation()
  const entitlement = useEntitlements()
  const setup = useSetupStatus()
  const isOnboarding = pathname === '/app/onboarding'
  const onboardingRequired = entitlement.isPaid && setup.data && !setup.data.onboarding_completed
  const isConversationDetail = /^\/app\/conversas\/[^/]+$/.test(pathname)
  const isWhatsAppDetail = pathname.startsWith('/app/whatsapp/')
  const isSettingsDetail = pathname.startsWith('/app/mais/')
  const isDetail = isWhatsAppDetail||isSettingsDetail
  const title = titles[pathname] ?? 'Conectar WhatsApp'

  if (onboardingRequired && !isOnboarding) {
    return <Navigate to="/app/onboarding" replace />
  }

  if (isOnboarding) {
    return (
      <UpgradePromptProvider>
        <Outlet />
      </UpgradePromptProvider>
    )
  }

  if (isConversationDetail) {
    return (
      <UpgradePromptProvider>
        <div className="conversation-route-shell" id="main-content">
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
        <AppHeader title={title} showBack={isDetail} backTo={isSettingsDetail?'/app/mais':'/app/whatsapp'} />
        <main className="app-content" id="main-content">
          <div className="page-stack"><BusinessSelector /></div>
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
    </UpgradePromptProvider>
  )
}
