import { Navigate, Route, Routes } from 'react-router-dom'
import { AgendaPage } from '../features/appointments/AgendaPage'
import { ConversationsPage } from '../features/conversations/ConversationsPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { MorePage } from '../features/more/MorePage'
import { ApiOnlyInfoPage } from '../features/whatsapp/ApiOnlyInfoPage'
import { CoexistenceInfoPage } from '../features/whatsapp/CoexistenceInfoPage'
import { WhatsAppPage } from '../features/whatsapp/WhatsAppPage'
import { AppShell } from './AppShell'
import { LoginPage } from '../features/auth/LoginPage'
import { AdminPage } from '../features/auth/AdminPage'
import { ProtectedRoute, RoleGuard } from '../features/auth/ProtectedRoute'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute platform />}>
        <Route path="/admin" element={<AdminPage />} />
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
      </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
