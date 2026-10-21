import { Building2, ChevronLeft, Eye, EyeOff, ExternalLink, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PrimaryButton } from '../../components/PrimaryButton'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
import { useEntitlements } from '../access/useEntitlements'
import { SessionActions } from '../auth/SessionActions'
import { useAuth } from '../auth/useAuth'
import type { MembershipRole } from '../auth/types'

const roleLabels: Record<MembershipRole,string> = {
  owner:'Proprietário',
  admin:'Administrador',
  attendant:'Atendente',
  viewer:'Somente leitura',
}

type SubscriptionStatus = {
  status:'none'|'active'|'past_due'|'canceled'|'suspended'
  payment_method:'credit_card'|'pix'|'pix_automatic'|null
  plan:'basic'|'plus'|null
  cycle:'monthly'|'quarterly'|'annual'|null
  access_until:string|null
  canceled_at:string|null
  cancellation_requested_at:string|null
  guarantee_until:string|null
  guarantee_eligible:boolean
  refund_status:'none'|'requested'|'reconcile_required'|'refunded'
}

function formatBillingDate(value:string|null) {
  if (!value) return null
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle:'short',
    timeStyle:'short',
    timeZone:'America/Sao_Paulo',
  }).format(new Date(value))
}

function AccountHeader({eyebrow,title,description}:{eyebrow:string;title:string;description:string}) {
  return <section className="operational-heading account-heading">
    <div>
      <Link className="account-back" to="/app/mais"><ChevronLeft size={18}/>Configurações</Link>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  </section>
}

export function UserSettingsPage() {
  const {user,membership} = useAuth()
  const entitlement = useEntitlements()
  const [subscription,setSubscription] = useState<SubscriptionStatus|null>(null)
  const [billingLoading,setBillingLoading] = useState(false)
  const [billingBusy,setBillingBusy] = useState(false)
  const [billingError,setBillingError] = useState('')
  const [billingSuccess,setBillingSuccess] = useState('')
  const [confirmation,setConfirmation] = useState<'refund'|'cancel'|null>(null)
  const canManageBilling = membership?.role === 'owner' || membership?.role === 'admin'
  const accessLabel = entitlement.isPaid ? 'Acesso operacional liberado' : entitlement.isReadOnlyRetained ? 'Acesso pausado · dados preservados' : 'Conta gratuita demonstrativa'

  useEffect(() => {
    let cancelled=false
    if (!canManageBilling) {
      setSubscription(null)
      return () => { cancelled=true }
    }
    setBillingLoading(true)
    setBillingError('')
    void api.request<SubscriptionStatus>('/billing/subscription')
      .then(value=>{if(!cancelled)setSubscription(value)})
      .catch(()=>{if(!cancelled)setBillingError('Não foi possível carregar os dados da assinatura.')})
      .finally(()=>{if(!cancelled)setBillingLoading(false)})
    return () => { cancelled=true }
  },[canManageBilling])

  async function requestBillingAction(action:'refund'|'cancel') {
    if (billingBusy) return
    setBillingBusy(true)
    setBillingError('')
    setBillingSuccess('')
    try {
      const updated=await api.request<SubscriptionStatus>(
        action==='refund'?'/billing/subscription/refund-request':'/billing/subscription/cancel-request',
        {method:'POST'},
      )
      setSubscription(updated)
      setConfirmation(null)
      setBillingSuccess(action==='refund'
        ? 'Solicitação registrada. A devolução só será considerada concluída após a confirmação financeira.'
        : 'Solicitação de cancelamento registrada. O acesso já pago permanece disponível até a data informada.')
    } catch(failure) {
      const detail=failure instanceof ApiError?failure.detail:undefined
      setBillingError(
        failure instanceof ApiError&&failure.status===409&&detail==='Seven-day guarantee is no longer available'
          ? 'O prazo da garantia de 7 dias já terminou.'
          : failure instanceof ApiError&&failure.status===409&&detail==='Payment reference requires support review'
            ? 'Não foi possível confirmar com segurança o pagamento original. A solicitação precisa de revisão do suporte antes de qualquer estorno.'
            : 'Não foi possível registrar a solicitação agora. Tente novamente em alguns instantes.',
      )
    } finally {
      setBillingBusy(false)
    }
  }

  const guaranteeUntil=formatBillingDate(subscription?.guarantee_until??null)
  const accessUntil=formatBillingDate(subscription?.access_until??null)
  const hasCommercialSubscription=subscription&&subscription.status!=='none'
  const refundPending=subscription?.refund_status==='requested'||subscription?.refund_status==='reconcile_required'
  const refundCompleted=subscription?.refund_status==='refunded'
  const cancellationPending=!!subscription?.cancellation_requested_at&&!refundPending&&!refundCompleted&&subscription.status!=='canceled'
  const canRequestCancellation=!!subscription&&!subscription.guarantee_eligible&&!refundPending&&!refundCompleted&&!subscription.cancellation_requested_at&&(subscription.status==='active'||subscription.status==='past_due')

  return <div className="page-stack operational-page compact-page account-page">
    <AccountHeader eyebrow="Conta" title="Usuário" description="Informações da sua conta e do acesso atual."/>
    <section className="account-card">
      <div className="account-detail"><span className="account-detail__icon"><Mail size={19}/></span><div><span>E-mail</span><strong>{user?.email??'—'}</strong></div></div>
      <div className="account-detail"><span className="account-detail__icon"><Building2 size={19}/></span><div><span>Empresa</span><strong>{membership?.business_name??'—'}</strong></div></div>
      <div className="account-detail"><span className="account-detail__icon"><UserRound size={19}/></span><div><span>Perfil</span><strong>{membership?roleLabels[membership.role]:'—'}</strong></div></div>
      <div className="account-detail"><span className="account-detail__icon"><ShieldCheck size={19}/></span><div><span>Acesso</span><strong>{accessLabel}</strong></div></div>
    </section>

    {canManageBilling&&(billingLoading||billingError||hasCommercialSubscription)&&<section className="account-action-section account-billing-section" aria-label="Assinatura e garantia">
      <h2>Assinatura e garantia</h2>
      {billingLoading&&<p>Carregando dados da assinatura…</p>}
      {!billingLoading&&hasCommercialSubscription&&<>
        {subscription.guarantee_eligible&&guaranteeUntil&&<div className="account-guarantee-state is-active">
          <strong>Garantia até {guaranteeUntil}</strong>
          <span>Se a Alovia não fizer sentido para sua operação dentro desse prazo, você pode solicitar o cancelamento e a devolução integral do valor pago.</span>
        </div>}
        {refundPending&&<div className="account-guarantee-state">
          <strong>Reembolso solicitado</strong>
          <span>A solicitação está sendo processada. O dinheiro só será considerado devolvido depois da confirmação financeira.</span>
        </div>}
        {refundCompleted&&<div className="account-guarantee-state">
          <strong>Reembolso confirmado</strong>
          <span>A devolução do pagamento foi confirmada e o acesso comercial foi encerrado.</span>
        </div>}
        {cancellationPending&&<div className="account-guarantee-state">
          <strong>Cancelamento solicitado</strong>
          <span>A renovação está em processamento. O acesso já pago permanece até {accessUntil??'o fim do período contratado'}.</span>
        </div>}
        {subscription.status==='canceled'&&!refundPending&&!refundCompleted&&<div className="account-guarantee-state">
          <strong>Assinatura cancelada</strong>
          <span>Não haverá nova renovação. Seu acesso permanece até {accessUntil??'o fim do período já pago'}.</span>
        </div>}
        {subscription.status==='past_due'&&!refundPending&&<div className="account-guarantee-state">
          <strong>Pagamento pendente</strong>
          <span>O acesso operacional está pausado enquanto a situação financeira estiver pendente.</span>
        </div>}
        {subscription.guarantee_eligible&&!refundPending&&!refundCompleted&&!subscription.cancellation_requested_at&&<button className="secondary-button account-financial-action" type="button" disabled={billingBusy} onClick={()=>setConfirmation('refund')}>Solicitar cancelamento e reembolso</button>}
        {canRequestCancellation&&<button className="secondary-button account-financial-action" type="button" disabled={billingBusy} onClick={()=>setConfirmation('cancel')}>Solicitar cancelamento</button>}
        {confirmation==='refund'&&<div className="account-financial-confirmation" role="alertdialog" aria-label="Confirmar solicitação de reembolso">
          <strong>Confirmar cancelamento e devolução?</strong>
          <p>Você está solicitando o cancelamento e a devolução integral dentro da garantia de 7 dias. A devolução só será considerada concluída após confirmação financeira.</p>
          <div><button className="secondary-button" type="button" disabled={billingBusy} onClick={()=>setConfirmation(null)}>Voltar</button><button className="primary-button" type="button" disabled={billingBusy} onClick={()=>void requestBillingAction('refund')}>{billingBusy?'Registrando…':'Confirmar solicitação'}</button></div>
        </div>}
        {confirmation==='cancel'&&<div className="account-financial-confirmation" role="alertdialog" aria-label="Confirmar solicitação de cancelamento">
          <strong>Confirmar cancelamento?</strong>
          <p>A renovação será cancelada. O acesso já pago permanece até {accessUntil??'o fim do período contratado'} e não há reembolso automático fora da garantia.</p>
          <div><button className="secondary-button" type="button" disabled={billingBusy} onClick={()=>setConfirmation(null)}>Voltar</button><button className="primary-button" type="button" disabled={billingBusy} onClick={()=>void requestBillingAction('cancel')}>{billingBusy?'Registrando…':'Confirmar cancelamento'}</button></div>
        </div>}
      </>}
      {billingError&&<p className="form-error" role="alert">{billingError}</p>}
      {billingSuccess&&<p className="form-success" role="status">{billingSuccess}</p>}
    </section>}

    <section className="account-action-section">
      <h2>Sair da conta</h2>
      <p>Encerra a sessão atual e revoga o acesso deste navegador.</p>
      <SessionActions />
    </section>
  </div>
}

export function SecuritySettingsPage() {
  const {state} = useAuth()
  const [currentPassword,setCurrentPassword] = useState('')
  const [newPassword,setNewPassword] = useState('')
  const [confirmation,setConfirmation] = useState('')
  const [visible,setVisible] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [success,setSuccess] = useState('')

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (newPassword.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (currentPassword === newPassword) {
      setError('A nova senha precisa ser diferente da senha atual.')
      return
    }
    if (newPassword !== confirmation) {
      setError('As novas senhas precisam ser iguais.')
      return
    }
    setBusy(true)
    try {
      await api.changePassword(currentPassword,newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSuccess('Senha alterada. As outras sessões da sua conta foram encerradas.')
    } catch(failure) {
      const detail = failure instanceof ApiError ? failure.detail : undefined
      setError(
        failure instanceof ApiError && failure.status === 400 && detail === 'Current password is incorrect'
          ? 'A senha atual está incorreta.'
          : failure instanceof ApiError && failure.status === 400 && detail === 'New password must be different'
            ? 'A nova senha precisa ser diferente da senha atual.'
            : failure instanceof ApiError && failure.status === 503
              ? 'A alteração de senha está temporariamente indisponível.'
              : 'Não foi possível alterar sua senha. Verifique a conexão e tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }

  return <div className="page-stack operational-page compact-page account-page">
    <AccountHeader eyebrow="Conta" title="Segurança" description="Sessão e acesso ao ALOVIA."/>
    <section className="account-card">
      <div className="account-detail"><span className="account-detail__icon"><LockKeyhole size={19}/></span><div><span>Sessão</span><strong>{state==='authenticated'?'Ativa e autenticada':'Verificando sessão'}</strong><small>Seu acesso é validado pelo servidor a cada sessão.</small></div></div>
    </section>
    <section className="account-action-section account-password-section">
      <h2>Alterar senha</h2>
      <p>Use pelo menos 8 caracteres. Por segurança, as outras sessões da sua conta serão encerradas.</p>
      <form className="account-password-form" onSubmit={event=>void submit(event)}>
        <label htmlFor="current-password">Senha atual</label>
        <div className="password-field">
          <input id="current-password" type={visible?'text':'password'} autoComplete="current-password" maxLength={1024} required value={currentPassword} onChange={event=>{setCurrentPassword(event.target.value);setError('');setSuccess('')}} disabled={busy}/>
          <button type="button" className="icon-button" aria-label={visible?'Ocultar senhas':'Mostrar senhas'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button>
        </div>
        <label htmlFor="new-password">Nova senha</label>
        <input id="new-password" type={visible?'text':'password'} autoComplete="new-password" minLength={8} maxLength={1024} required value={newPassword} onChange={event=>{setNewPassword(event.target.value);setError('');setSuccess('')}} disabled={busy} placeholder="Mínimo de 8 caracteres"/>
        <label htmlFor="new-password-confirmation">Confirme a nova senha</label>
        <input id="new-password-confirmation" type={visible?'text':'password'} autoComplete="new-password" minLength={8} maxLength={1024} required value={confirmation} onChange={event=>{setConfirmation(event.target.value);setError('');setSuccess('')}} disabled={busy}/>
        {error&&<p className="form-error" role="alert">{error}</p>}
        {success&&<p className="form-success" role="status">{success}</p>}
        <PrimaryButton type="submit" fullWidth disabled={busy} aria-busy={busy}>{busy?'Alterando…':'Alterar senha'}</PrimaryButton>
      </form>
    </section>
  </div>
}

export function PrivacySettingsPage() {
  return <div className="page-stack operational-page compact-page account-page">
    <AccountHeader eyebrow="Conta" title="Privacidade" description="Documentos e controles relacionados aos seus dados."/>
    <section className="account-links" aria-label="Documentos de privacidade">
      <a href="https://politica-de-privacidade-alovia.netlify.app/politica-de-privacidade/" target="_blank" rel="noreferrer"><span><ShieldCheck size={19}/><strong>Política de Privacidade</strong></span><ExternalLink size={17}/></a>
      <a href="https://politica-de-privacidade-alovia.netlify.app/termos-de-uso/" target="_blank" rel="noreferrer"><span><ShieldCheck size={19}/><strong>Termos de Uso</strong></span><ExternalLink size={17}/></a>
      <a href="https://politica-de-privacidade-alovia.netlify.app/exclusao-de-dados/" target="_blank" rel="noreferrer"><span><ShieldCheck size={19}/><strong>Exclusão de dados</strong></span><ExternalLink size={17}/></a>
    </section>
  </div>
}