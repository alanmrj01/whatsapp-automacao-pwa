import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppRouter } from './app/router'
import { queryClient } from './app/queryClient'
import { AuthProvider } from './features/auth/AuthProvider'
import { OfflineBanner } from './components/OfflineBanner'
import './styles/global.css'
import './styles/alovia-theme.css'
import './styles/approved-mockups.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OfflineBanner />
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
