import { useEffect } from 'react'
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
  useBrowserViewportGuard()
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


function useBrowserViewportGuard() {
  useEffect(() => {
    const root=document.documentElement
    const viewport=window.visualViewport

    const update=()=>{
      if(!viewport){
        root.style.setProperty('--browser-ui-bottom-offset','0px')
        return
      }

      const obstruction=Math.max(
        0,
        window.innerHeight-viewport.height-viewport.offsetTop,
      )

      // Browser bars/prompts are usually short. A much larger obstruction is
      // normally the virtual keyboard; the bottom navigation must not jump
      // above the keyboard and cover form content.
      const browserUiOffset=obstruction>0&&obstruction<=120
        ? Math.ceil(obstruction)
        : 0

      root.style.setProperty('--browser-ui-bottom-offset',`${browserUiOffset}px`)
    }

    update()
    window.addEventListener('resize',update)
    viewport?.addEventListener('resize',update)
    viewport?.addEventListener('scroll',update)

    return ()=>{
      window.removeEventListener('resize',update)
      viewport?.removeEventListener('resize',update)
      viewport?.removeEventListener('scroll',update)
      root.style.removeProperty('--browser-ui-bottom-offset')
    }
  },[])
}
