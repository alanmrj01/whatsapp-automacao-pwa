import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useEntitlements } from '../features/access/useEntitlements'
import { ProtectedRoute, RoleGuard } from '../features/auth/ProtectedRoute'

const AgendaPage = lazy(async () => ({default:(await import('../features/appointments/AgendaPage')).AgendaPage}))
const ConversationsPage = lazy(async () => ({default:(await import('../features/conversations/ConversationsPage')).ConversationsPage}))
const DashboardPage = lazy(async () => ({default:(await import('../features/dashboard/DashboardPage')).DashboardPage}))
const MorePage = lazy(async () => ({default:(await import('../features/more/MorePage')).MorePage}))
const OperationalSettings = () => import('../features/more/OperationalSettingsPages')
const AgendaSettingsPage = lazy(async () => ({default:(await OperationalSettings()).AgendaSettingsPage}))
const AutomationSettingsPage = lazy(async () => ({default:(await OperationalSettings()).AutomationSettingsPage}))
const CompanySettingsPage = lazy(async () => ({default:(await OperationalSettings()).CompanySettingsPage}))
const TeamSettingsPage = lazy(async () => ({default:(await OperationalSettings()).TeamSettingsPage}))
const WorkingHoursSettingsPage = lazy(async () => ({default:(await OperationalSettings()).WorkingHoursSettingsPage}))
const ApiOnlyInfoPage = lazy(async () => ({default:(await import('../features/whatsapp/ApiOnlyInfoPage')).ApiOnlyInfoPage}))
const CoexistenceInfoPage = lazy(async () => ({default:(await import('../features/whatsapp/CoexistenceInfoPage')).CoexistenceInfoPage}))
const WhatsAppPage = lazy(async () => ({default:(await import('../features/whatsapp/WhatsAppPage')).WhatsAppPage}))
const AppShell = lazy(async () => ({default:(await import('./AppShell')).AppShell}))
const LoginPage = lazy(async () => ({default:(await import('../features/auth/LoginPage')).LoginPage}))
const SignupPage = lazy(async () => ({default:(await import('../features/auth/SignupPage')).SignupPage}))
const AdminPage = lazy(async () => ({default:(await import('../features/auth/AdminPage')).AdminPage}))
const PlatformPreviewPage = lazy(async () => ({default:(await import('../features/preview/PlatformPreviewPage')).PlatformPreviewPage}))
const PublicLandingPage = lazy(async () => ({default:(await import('../features/public/PublicLandingPage')).PublicLandingPage}))

function Deferred({children}:{children:ReactNode}) {
  return <Suspense fallback={<div className="route-loading"><LoadingState /></div>}>{children}</Suspense>
}

function PaidOperationalGuard({children}:{children:ReactNode}) {
  const entitlement = useEntitlements()
  return entitlement.isPaid ? children : <Navigate to="/app/mais" replace/>
}

export function AppRouter() {
  return (
    <Deferred>
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
    </Deferred>
  )
}
