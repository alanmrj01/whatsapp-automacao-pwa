import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppRouter } from './app/router'
import { queryClient } from './app/queryClient'
import { AuthProvider } from './features/auth/AuthProvider'
import { OfflineBanner } from './components/OfflineBanner'
import { FunnelTracker } from './lib/FunnelTracker'
import './styles/global.css'
import './styles/alovia-theme.css'
import './styles/approved-mockups.css'
import './styles/free-access-foundations.css'
import './styles/operational-app.css'
import './styles/account-billing.css'
import './styles/billing-payment.css'

let updateSW = (_reloadPage?: boolean) => Promise.resolve()
updateSW = registerSW({
  immediate: true,
  // Never reload an active form automatically, but never keep a stale build
  // silently either. The user explicitly chooses when to activate the update.
  onNeedRefresh: () => {
    const accepted = window.confirm(
      'Uma nova versão da Alovia está disponível. Atualizar agora?',
    )
    if (accepted) void updateSW(true)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <FunnelTracker />
          <OfflineBanner />
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)