import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { BottomNavigation } from '../components/BottomNavigation'
import { DesktopSidebar } from '../components/DesktopSidebar'
import { BusinessSelector } from '../features/auth/BusinessSelector'

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
  const isWhatsAppDetail = pathname.startsWith('/app/whatsapp/')
  const isSettingsDetail = pathname.startsWith('/app/mais/')
  const isDetail = isWhatsAppDetail||isSettingsDetail
  const title = titles[pathname] ?? 'Conectar WhatsApp'

  return (
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
  )
}
