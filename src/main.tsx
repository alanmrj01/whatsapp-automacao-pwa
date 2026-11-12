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
let swRegistration: ServiceWorkerRegistration | undefined
let refreshPromptHandling = false
let refreshPromptShown = false

function waitForWorkerInstall(worker: ServiceWorker | null) {
  if (!worker || ['installed', 'activated', 'redundant'].includes(worker.state)) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const finish = () => {
      if (!['installed', 'activated', 'redundant'].includes(worker.state)) return
      worker.removeEventListener('statechange', finish)
      window.clearTimeout(timeout)
      resolve()
    }
    const timeout = window.setTimeout(() => {
      worker.removeEventListener('statechange', finish)
      resolve()
    }, 10_000)

    worker.addEventListener('statechange', finish)
  })
}

async function prepareLatestServiceWorker() {
  if (!swRegistration) return

  try {
    await swRegistration.update()
    await waitForWorkerInstall(swRegistration.installing)
  } catch {
    // If the update check fails, keep the already waiting build available.
  }
}

async function handlePwaRefresh() {
  if (refreshPromptHandling || refreshPromptShown) return

  refreshPromptHandling = true
  refreshPromptShown = true

  await prepareLatestServiceWorker()

  const accepted = window.confirm(
    'Uma nova versão da Alovia está disponível. Atualizar agora?',
  )
  if (accepted) {
    await updateSW(true)
  }
}

updateSW = registerSW({
  immediate: true,
  onRegisteredSW: (_swUrl, registration) => {
    swRegistration = registration
  },
  onNeedRefresh: () => {
    void handlePwaRefresh()
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
