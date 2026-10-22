import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
import { useAuth } from '../auth/useAuth'

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
  refund_provider_status:'pending'|'done'|'cancelled'|'partial'|'unknown'|null
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
  const {membership} = useAuth()
  const [subscription,setSubscription] = useState<SubscriptionStatus|null>(null)
  const [billingLoading,setBillingLoading] = useState(false)
  const [billingBusy,setBillingBusy] = useState(false)
  const [billingError,setBillingError] = useState('')
  const [billingSuccess,setBillingSuccess] = useState('')
  const [confirmation,setConfirmation] = useState<'refund'|'cancel'|null>(null)
  const canManageBilling = membership?.role === 'owner' || membership?.role === 'admin'

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
      if (action==='refund') {
        setBillingSuccess(
          updated.refund_status==='refunded'
            ? 'Reembolso confirmado pelo provedor financeiro.'
            : updated.refund_status==='reconcile_required'
              ? 'Solicitação registrada, mas a confirmação financeira precisa de conferência.'
              : 'Solicitação enviada. A Alovia acompanhará a confirmação do Asaas antes de considerar o valor devolvido.',
        )
      } else {
        setBillingSuccess('Solicitação de cancelamento registrada. O acesso já pago permanece disponível até a data informada.')
      }
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
  const refundPending=subscription?.refund_status==='requested'
  const refundReconcile=subscription?.refund_status==='reconcile_required'
  const refundCompleted=subscription?.refund_status==='refunded'
  const cancellationPending=!!subscription?.cancellation_requested_at&&!refundPending&&!refundReconcile&&!refundCompleted&&subscription.status!=='canceled'
  const canRequestCancellation=!!subscription&&!subscription.guarantee_eligible&&!refundPending&&!refundReconcile&&!refundCompleted&&!subscription.cancellation_requested_at&&(subscription.status==='active'||subscription.status==='past_due')

  if (!canManageBilling || (!billingLoading&&!billingError&&!hasCommercialSubscription)) return null

  return <section className="account-action-section account-billing-section" aria-label="Assinatura e garantia">
    <h2>Assinatura e garantia</h2>
    {billingLoading&&<p>Carregando dados da assinatura…</p>}
    {!billingLoading&&hasCommercialSubscription&&<>
      {subscription.guarantee_eligible&&guaranteeUntil&&<div className="account-guarantee-state is-active">
        <strong>Garantia até {guaranteeUntil}</strong>
        <span>Se a Alovia não fizer sentido para sua operação dentro desse prazo, você pode solicitar o cancelamento e a devolução integral do valor pago.</span>
      </div>}
      {refundPending&&<div className="account-guarantee-state">
        <strong>{subscription.refund_provider_status==='pending'?'Reembolso em processamento no Asaas':'Reembolso enviado ao Asaas'}</strong>
        <span>{subscription.refund_provider_status==='pending'
          ? 'O Asaas confirmou que o estorno está em processamento. O valor só será considerado devolvido quando o provedor concluir a operação.'
          : 'A solicitação foi enviada. A Alovia está aguardando a confirmação financeira do Asaas antes de considerar o valor devolvido.'}</span>
      </div>}
      {refundReconcile&&<div className="account-guarantee-state">
        <strong>Reembolso precisa de conferência</strong>
        <span>Não foi possível confirmar automaticamente o resultado completo no Asaas. Nenhum novo estorno será disparado automaticamente; a operação precisa ser conciliada com o pagamento original.</span>
      </div>}
      {refundCompleted&&<div className="account-guarantee-state">
        <strong>Reembolso confirmado</strong>
        <span>A devolução do pagamento foi confirmada pelo provedor financeiro e o acesso comercial foi encerrado.</span>
      </div>}
      {cancellationPending&&<div className="account-guarantee-state">
        <strong>Cancelamento solicitado</strong>
        <span>A renovação está em processamento. O acesso já pago permanece até {accessUntil??'o fim do período contratado'}.</span>
      </div>}
      {subscription.status==='canceled'&&!refundPending&&!refundReconcile&&!refundCompleted&&<div className="account-guarantee-state">
        <strong>Assinatura cancelada</strong>
        <span>Não haverá nova renovação. Seu acesso permanece até {accessUntil??'o fim do período já pago'}.</span>
      </div>}
      {subscription.status==='past_due'&&!refundPending&&!refundReconcile&&<div className="account-guarantee-state">
        <strong>Pagamento pendente</strong>
        <span>O acesso operacional está pausado enquanto a situação financeira estiver pendente.</span>
      </div>}
      {subscription.guarantee_eligible&&!refundPending&&!refundReconcile&&!refundCompleted&&!subscription.cancellation_requested_at&&<button className="secondary-button account-financial-action" type="button" disabled={billingBusy} onClick={()=>setConfirmation('refund')}>Solicitar cancelamento e reembolso</button>}
      {canRequestCancellation&&<button className="secondary-button account-financial-action" type="button" disabled={billingBusy} onClick={()=>setConfirmation('cancel')}>Solicitar cancelamento</button>}
      {confirmation==='refund'&&<div className="account-financial-confirmation" role="alertdialog" aria-label="Confirmar solicitação de reembolso">
        <strong>Confirmar cancelamento e devolução?</strong>
        <p>Você está solicitando o cancelamento e a devolução integral dentro da garantia de 7 dias. A devolução só será considerada concluída após confirmação financeira do Asaas.</p>
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
