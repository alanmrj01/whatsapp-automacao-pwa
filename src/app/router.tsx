import { Navigate, Route, Routes } from 'react-router-dom'
import { AgendaPage } from '../features/appointments/AgendaPage'
import { ConversationsPage } from '../features/conversations/ConversationsPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { MorePage } from '../features/more/MorePage'
import { ApiOnlyInfoPage } from '../features/whatsapp/ApiOnlyInfoPage'
import { CoexistenceInfoPage } from '../features/whatsapp/CoexistenceInfoPage'
import { WhatsAppPage } from '../features/whatsapp/WhatsAppPage'
import { AppShell } from './AppShell'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="conversas" element={<ConversationsPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="whatsapp/business" element={<CoexistenceInfoPage />} />
        <Route path="whatsapp/exclusivo" element={<ApiOnlyInfoPage />} />
        <Route path="mais" element={<MorePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
