import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
import { useAuth } from '../auth/useAuth'

type MessageUsage = {
  plan:'basic'|'plus'|null
  period_start:string
  resets_at:string
  used:number
  limit:number|null
  remaining:number|null
  exhausted:boolean
  quota_applies:boolean
  upgrade_plan:'basic'|'plus'|null
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
  refund_provider_status:'awaiting_authorization'|'pending'|'done'|'cancelled'|'partial'|'unknown'|null
  refund_deadline_at:string|null
}

function formatBillingDate(value:string|null) {
  if (!value) return null
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle:'short',
    timeStyle:'short',
    timeZone:'America/Sao_Paulo',
  }).format(new Date(value))
}

export function SubscriptionManagement() {
  const {membership,syncSession} = useAuth()
  const [subscription,setSubscription] = useState<SubscriptionStatus|null>(null)
  const [usage,setUsage] = useState<MessageUsage|null>(null)
  const [billingLoading,setBillingLoading] = useState(false)
  const [billingBusy,setBillingBusy] = useState(false)
  const [billingError,setBillingError] = useState('')
  const [billingSuccess,setBillingSuccess] = useState('')
  const [confirmation,setConfirmation] = useState<'refund'|'cancel'|null>(null)
  const canManageBilling = membership?.role === 'owner' || membership?.role === 'admin'

  const loadSubscription=useCallback(async(silent=false)=>{
    if (!canManageBilling) {
      setSubscription(null)
      setUsage(null)
      return
    }
    if (!silent)setBillingLoading(true)
    if (!silent)setBillingError('')
    try {
      const [nextSubscription,nextUsage] = await Promise.all([
        api.request<SubscriptionStatus>('/billing/subscription'),
        api.request<MessageUsage>('/billing/usage'),
      ])
      setSubscription(nextSubscription)
      setUsage(nextUsage)
    } catch {
      if (!silent)setBillingError('Não foi possível carregar os dados da assinatura.')
    } finally {
      if (!silent)setBillingLoading(false)
    }
  },[canManageBilling])

  useEffect(() => {
    void loadSubscription()
  },[loadSubscription])

  const guaranteeUntil=formatBillingDate(subscription?.guarantee_until??null)
  const accessUntil=formatBillingDate(subscription?.access_until??null)
  const refundDeadline=formatBillingDate(subscription?.refund_deadline_at??null)
  const usageResetsAt=formatBillingDate(usage?.resets_at??null)
  const hasCommercialSubscription=subscription&&subscription.status!=='none'
  const refundPending=subscription?.refund_status==='requested'
  const refundReconcile=subscription?.refund_status==='reconcile_required'
  const refundWaiting=refundPending||refundReconcile
  const refundCompleted=subscription?.refund_status==='refunded'
  const cancellationPending=!!subscription?.cancellation_requested_at&&!refundWaiting&&!refundCompleted&&subscription.status!=='canceled'
  const canRequestCancellation=!!subscription&&!subscription.guarantee_eligible&&!refundWaiting&&!refundCompleted&&!subscription.cancellation_requested_at&&(subscription.status==='active'||subscription.status==='past_due')

  useEffect(()=>{
    if(!refundWaiting&&!cancellationPending)return
    const timer=window.setInterval(()=>void loadSubscription(true),10_000)
    return()=>window.clearInterval(timer)
  },[cancellationPending,loadSubscription,refundWaiting])

  useEffect(()=>{
    if(!refundCompleted)return
    void syncSession().catch(()=>undefined)
  },[refundCompleted,syncSession])

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
        ? 'Solicitação de reembolso registrada.'
        : 'Solicitação de cancelamento registrada. O acesso já pago permanece disponível até a data informada.')
    } catch(failure) {
      const detail=failure instanceof ApiError?failure.detail:undefined
      setBillingError(
        failure instanceof ApiError&&failure.status===409&&detail==='Seven-day guarantee is no longer available'
          ? 'O prazo da garantia de 7 dias já terminou.'
          : failure instanceof ApiError&&failure.status===409&&detail==='Payment reference requires support review'
            ? 'Não foi possível confirmar com segurança o pagamento original. A solicitação precisa de revisão do suporte antes de qualquer estorno.'
            : action==='cancel'&&failure instanceof ApiError&&failure.status===502
              ? 'Ainda não foi possível confirmar o cancelamento no provedor. Você pode tentar novamente com segurança.'
              : 'Não foi possível registrar a solicitação agora. Tente novamente em alguns instantes.',
      )
      if(action==='cancel')void loadSubscription(true)
    } finally {
      setBillingBusy(false)
    }
  }

  if (!canManageBilling || (!billingLoading&&!billingError&&!hasCommercialSubscription)) return null

  return <section className="account-action-section account-billing-section" aria-label="Assinatura e garantia">
    <h2>Assinatura e garantia</h2>
    {billingLoading&&<p>Carregando dados da assinatura…</p>}
    {!billingLoading&&hasCommercialSubscription&&<>
      {usage?.quota_applies&&usage.limit!==null&&<div className="account-guarantee-state">
        <strong>Mensagens do mês: {usage.used.toLocaleString('pt-BR')} de {usage.limit.toLocaleString('pt-BR')}</strong>
        <span>{usage.exhausted
          ? usage.plan==='basic'
            ? 'Sua franquia do Basic chegou ao limite. Os novos envios ficam pausados até a renovação mensal. O Plus, com mensagens proativas, será liberado após o lançamento.'
            : 'Sua franquia do Plus chegou ao limite. Os novos envios ficam pausados até a renovação mensal.'
          : `Restam ${(usage.remaining??0).toLocaleString('pt-BR')} mensagens enviadas pela Alovia neste mês.`}</span>
        {usageResetsAt&&<small>A franquia renova em {usageResetsAt}.</small>}
      </div>}
      {subscription.guarantee_eligible&&guaranteeUntil&&!refundWaiting&&<div className="account-guarantee-state is-active">
        <strong>Garantia até {guaranteeUntil}</strong>
        <span>Se a Alovia não fizer sentido para sua operação dentro desse prazo, você pode solicitar o cancelamento e a devolução integral do valor pago.</span>
      </div>}
      {refundWaiting&&<div className="account-refund-timeline" role="status" aria-live="polite">
        <strong>Solicitação de reembolso recebida</strong>
        <span>Seu reembolso será concluído em até 24 horas.</span>
        <small>{refundDeadline?<>Previsão limite: {refundDeadline}. </>:null}Assim que a devolução for confirmada, sua conta voltará automaticamente ao modo gratuito.</small>
      </div>}
      {refundCompleted&&<div className="account-guarantee-state">
        <strong>Reembolso concluído</strong>
        <span>A devolução foi confirmada e sua conta voltou ao modo gratuito.</span>
      </div>}
      {cancellationPending&&<div className="account-guarantee-state">
        <strong>Cancelamento solicitado</strong>
        <span>A renovação está em processamento. O acesso já pago permanece até {accessUntil??'o fim do período contratado'}.</span>
      </div>}
      {subscription.status==='canceled'&&!refundWaiting&&!refundCompleted&&<div className="account-guarantee-state">
        <strong>Assinatura cancelada</strong>
        <span>Não haverá nova renovação. Seu acesso permanece até {accessUntil??'o fim do período já pago'}.</span>
      </div>}
      {subscription.status==='past_due'&&!refundWaiting&&<div className="account-guarantee-state">
        <strong>Pagamento pendente</strong>
        <span>O acesso operacional está pausado enquanto a situação financeira estiver pendente.</span>
      </div>}
      {subscription.guarantee_eligible&&!refundWaiting&&!refundCompleted&&!subscription.cancellation_requested_at&&<button className="secondary-button account-financial-action" type="button" disabled={billingBusy} onClick={()=>setConfirmation('refund')}>Solicitar cancelamento e reembolso</button>}
      {canRequestCancellation&&<button className="secondary-button account-financial-action" type="button" disabled={billingBusy} onClick={()=>setConfirmation('cancel')}>Solicitar cancelamento</button>}
      {cancellationPending&&<button className="secondary-button account-financial-action" type="button" disabled={billingBusy} onClick={()=>setConfirmation('cancel')}>Tentar cancelar novamente</button>}
      {confirmation==='refund'&&<div className="account-financial-confirmation" role="alertdialog" aria-label="Confirmar solicitação de reembolso">
        <strong>Confirmar cancelamento e devolução?</strong>
        <p>Você está solicitando o cancelamento e a devolução integral dentro da garantia de 7 dias. Após a solicitação, o reembolso será concluído em até 24 horas.</p>
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
  </section>
}
