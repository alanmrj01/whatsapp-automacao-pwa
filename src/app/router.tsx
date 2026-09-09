import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AgendaPage } from '../features/appointments/AgendaPage'
import { ConversationsPage } from '../features/conversations/ConversationsPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { MorePage } from '../features/more/MorePage'
import { AgendaSettingsPage, AutomationSettingsPage, CompanySettingsPage, TeamSettingsPage, WorkingHoursSettingsPage } from '../features/more/OperationalSettingsPages'
import { ApiOnlyInfoPage } from '../features/whatsapp/ApiOnlyInfoPage'
import { CoexistenceInfoPage } from '../features/whatsapp/CoexistenceInfoPage'
import { WhatsAppPage } from '../features/whatsapp/WhatsAppPage'
import { AppShell } from './AppShell'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { AdminPage } from '../features/auth/AdminPage'
import { ProtectedRoute, RoleGuard } from '../features/auth/ProtectedRoute'
import { PlatformPreviewPage } from '../features/preview/PlatformPreviewPage'
import { PublicLandingPage } from '../features/public/PublicLandingPage'
import { useAuth } from '../features/auth/useAuth'

function PaidOperationalGuard({children}:{children:ReactNode}) {
  const {membership}=useAuth()
  return membership?.access_mode==='paid'?children:<Navigate to="/app/mais" replace/>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/criar-conta" element={<SignupPage />} />
      <Route element={<ProtectedRoute platform />}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/preview" element={<PlatformPreviewPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
      <Route path="/app" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="conversas" element={<ConversationsPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="whatsapp/business" element={<RoleGuard><CoexistenceInfoPage /></RoleGuard>} />
        <Route path="whatsapp/exclusivo" element={<RoleGuard><ApiOnlyInfoPage /></RoleGuard>} />
        <Route path="mais" element={<MorePage />} />
        <Route path="mais/empresa" element={<PaidOperationalGuard><CompanySettingsPage /></PaidOperationalGuard>} />
        <Route path="mais/horarios" element={<PaidOperationalGuard><WorkingHoursSettingsPage /></PaidOperationalGuard>} />
        <Route path="mais/automacao" element={<PaidOperationalGuard><AutomationSettingsPage /></PaidOperationalGuard>} />
        <Route path="mais/equipe" element={<PaidOperationalGuard><TeamSettingsPage /></PaidOperationalGuard>} />
        <Route path="mais/agenda" element={<PaidOperationalGuard><AgendaSettingsPage /></PaidOperationalGuard>} />
      </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
