import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { useEntitlements } from '../features/access/useEntitlements'
import { ProtectedRoute, RoleGuard } from '../features/auth/ProtectedRoute'
import { useSetupStatus } from '../features/operations/api'

const AgendaPage = lazy(async () => ({default:(await import('../features/appointments/AgendaPage')).AgendaPage}))
const ConversationsPage = lazy(async () => ({default:(await import('../features/conversations/ConversationsPage')).ConversationsPage}))
const ConversationDetailPage = lazy(async () => ({default:(await import('../features/conversations/ConversationDetailPage')).ConversationDetailPage}))
const DashboardPage = lazy(async () => ({default:(await import('../features/dashboard/DashboardPage')).DashboardPage}))
const MorePage = lazy(async () => ({default:(await import('../features/more/MorePage')).MorePage}))
const PlanPage = lazy(async () => ({default:(await import('../features/billing/PlanPage')).PlanPage}))
const CheckoutPage = lazy(async () => ({default:(await import('../features/billing/CheckoutPage')).CheckoutPage}))
const CheckoutReturnPage = lazy(async () => ({default:(await import('../features/billing/CheckoutReturnPage')).CheckoutReturnPage}))
const AccountPages = () => import('../features/more/AccountPages')
const UserSettingsPage = lazy(async () => ({default:(await AccountPages()).UserSettingsPage}))
const SecuritySettingsPage = lazy(async () => ({default:(await AccountPages()).SecuritySettingsPage}))
const PrivacySettingsPage = lazy(async () => ({default:(await AccountPages()).PrivacySettingsPage}))
const AgendaSettingsPage = lazy(async () => ({default:(await import('../features/more/AgendaSettingsPage')).AgendaSettingsPage}))
const AutomationSettingsPage = lazy(async () => ({default:(await import('../features/more/AutomationSettingsPage')).AutomationSettingsPage}))
const CompanySettingsPage = lazy(async () => ({default:(await import('../features/more/CompanySettingsPage')).CompanySettingsPage}))
const ServiceCatalogPage = lazy(async () => ({default:(await import('../features/more/ServiceCatalogPage')).ServiceCatalogPage}))
const MaterialsCatalogPage = lazy(async () => ({default:(await import('../features/more/MaterialsCatalogPage')).MaterialsCatalogPage}))
const TeamSettingsPage = lazy(async () => ({default:(await import('../features/more/TeamSettingsPage')).TeamSettingsPage}))
const WorkingHoursSettingsPage = lazy(async () => ({default:(await import('../features/more/WorkingHoursSettingsPage')).WorkingHoursSettingsPage}))
const OnboardingPage = lazy(async () => ({default:(await import('../features/onboarding/OnboardingPage')).OnboardingPage}))
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


function OnboardingGuard({children}:{children:ReactNode}) {
  const entitlement=useEntitlements()
  const setup=useSetupStatus()
  if(!entitlement.isPaid)return children
  if(setup.isPending)return <div className="route-loading"><LoadingState/></div>
  if(setup.isError)return <div className="route-loading"><ErrorState onRetry={()=>void setup.refetch()}/></div>
  return setup.data?.onboarding_completed ? children : <Navigate to="/app/onboarding" replace/>
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
          <Route path="/app/onboarding" element={<PaidOperationalGuard><OnboardingPage /></PaidOperationalGuard>} />
          <Route path="/app" element={<OnboardingGuard><AppShell /></OnboardingGuard>}>
            <Route index element={<DashboardPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="conversas" element={<ConversationsPage />} />
            <Route path="conversas/:conversationId" element={<PaidOperationalGuard><ConversationDetailPage /></PaidOperationalGuard>} />
            <Route path="whatsapp" element={<WhatsAppPage />} />
            <Route path="whatsapp/business" element={<RoleGuard><CoexistenceInfoPage /></RoleGuard>} />
            <Route path="whatsapp/exclusivo" element={<RoleGuard><ApiOnlyInfoPage /></RoleGuard>} />
            <Route path="mais" element={<MorePage />} />
            <Route path="mais/plano" element={<PlanPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="checkout/retorno" element={<CheckoutReturnPage />} />
            <Route path="mais/usuario" element={<UserSettingsPage />} />
            <Route path="mais/seguranca" element={<SecuritySettingsPage />} />
            <Route path="mais/privacidade" element={<PrivacySettingsPage />} />
            <Route path="mais/empresa" element={<PaidOperationalGuard><CompanySettingsPage /></PaidOperationalGuard>} />
            <Route path="mais/servicos" element={<PaidOperationalGuard><ServiceCatalogPage /></PaidOperationalGuard>} />
            <Route path="mais/catalogo" element={<PaidOperationalGuard><MaterialsCatalogPage /></PaidOperationalGuard>} />
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
