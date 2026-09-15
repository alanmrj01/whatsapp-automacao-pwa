import { Check, CheckCircle2, ChevronLeft, Copy, CreditCard, LockKeyhole, QrCode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import {
  billingCycles,
  cyclePrice,
  formatBRL,
  plans,
  type BillingCycle,
  type PlanId,
} from './planCatalog'

type PaymentMethod = 'credit_card' | 'pix_automatic'

type CheckoutResponse = {
  checkout_id:string
  payment_method:PaymentMethod
  checkout_url?:string | null
  pix_authorization_id?:string | null
  pix_payload?:string | null
  pix_expires_at?:string | null
  plan:PlanId
  cycle:BillingCycle
  amount_cents:number
}

type CheckoutStatus = {
  checkout_id:string
  status:'creating'|'active'|'paid'|'canceled'|'expired'|'failed'
  payment_method:PaymentMethod
  plan:PlanId
  cycle:BillingCycle
}

function isBillingCycle(value: string | null): value is BillingCycle {
  return value === 'monthly' || value === 'quarterly' || value === 'annual'
}

function isPlanId(value: string | null): value is PlanId {
  return value === 'basic' || value === 'plus'
}

function chargeLabel(cycle: BillingCycle, total: number) {
  if (cycle === 'monthly') return `${formatBRL(total)} por mês`
  if (cycle === 'quarterly') return `${formatBRL(total)} a cada 3 meses`
  return `${formatBRL(total)} por ano`
}

function isAsaasCheckoutUrl(value:string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'asaas.com' || url.hostname.endsWith('.asaas.com'))
  } catch {
    return false
  }
}

export function CheckoutPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const {user,reconnect} = useAuth()
  const planId = params.get('plan')
  const cycleParam = params.get('cycle')
  const membership = user?.memberships.find(item=>item.business_id===user.active_business_id)
  const requestKey = useRef<string>(crypto.randomUUID())
  const [paymentMethod,setPaymentMethod] = useState<PaymentMethod>('credit_card')
  const [payerName,setPayerName] = useState(membership?.business_name??'')
  const [payerDocument,setPayerDocument] = useState('')
  const [sending,setSending] = useState(false)
  const [error,setError] = useState<string | null>(null)
  const [pixCheckout,setPixCheckout] = useState<CheckoutResponse | null>(null)
  const [pixStatus,setPixStatus] = useState<CheckoutStatus['status'] | null>(null)
  const [copied,setCopied] = useState(false)

  useEffect(()=>{
    if (!payerName && membership?.business_name) setPayerName(membership.business_name)
  },[membership?.business_name,payerName])

  useEffect(()=>{
    if (!pixCheckout || !['active','creating'].includes(pixStatus??'active')) return
    let cancelled = false
    const checkStatus = async () => {
      try {
        const status = await api.request<CheckoutStatus>(`/billing/checkouts/${pixCheckout.checkout_id}`)
        if (cancelled) return
        setPixStatus(status.status)
        if (status.status === 'paid') {
          await reconnect()
          if (!cancelled) navigate('/app',{replace:true})
        } else if (['canceled','expired','failed'].includes(status.status)) {
          setError('A autorização não foi concluída. Você pode tentar novamente.')
        }
      } catch {
        // A autorização continua válida no Asaas mesmo se uma consulta pontual falhar.
      }
    }
    void checkStatus()
    const timer = window.setInterval(()=>void checkStatus(),4000)
    return ()=>{
      cancelled = true
      window.clearInterval(timer)
    }
  },[navigate,pixCheckout,pixStatus,reconnect])

  if (!isPlanId(planId) || !isBillingCycle(cycleParam)) {
    return <Navigate to="/app/mais/plano" replace />
  }

  const plan = plans.find(item=>item.id===planId)
  if (!plan) return <Navigate to="/app/mais/plano" replace />

  const price = cyclePrice(plan,cycleParam)
  const cycle = billingCycles.find(item=>item.id===cycleParam)

  function choosePayment(method:PaymentMethod) {
    if (sending || method===paymentMethod) return
    requestKey.current = crypto.randomUUID()
    setPaymentMethod(method)
    setError(null)
    setPixCheckout(null)
    setPixStatus(null)
    setCopied(false)
  }

  async function continueToPayment() {
    if (sending) return
    if (paymentMethod==='pix_automatic' && (!payerName.trim() || !payerDocument.trim())) {
      setError('Informe nome e CPF ou CNPJ para autorizar o Pix Automático.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const checkout = await api.request<CheckoutResponse>('/billing/checkouts',{
        method:'POST',
        headers:{'Idempotency-Key':requestKey.current},
        body:JSON.stringify({
          plan:planId,
          cycle:cycleParam,
          payment_method:paymentMethod,
          return_origin:window.location.origin,
          ...(paymentMethod==='pix_automatic'?{
            payer_name:payerName.trim(),
            payer_cpf_cnpj:payerDocument.trim(),
          }:{}),
        }),
      })
      if (checkout.payment_method==='credit_card') {
        if (!checkout.checkout_url || !isAsaasCheckoutUrl(checkout.checkout_url)) throw new Error('invalid checkout host')
        window.location.assign(checkout.checkout_url)
        return
      }
      if (!checkout.pix_payload || !checkout.pix_authorization_id) throw new Error('invalid pix response')
      setPixCheckout(checkout)
      setPixStatus('active')
      setSending(false)
    } catch {
      setError('Não foi possível iniciar o pagamento agora. Tente novamente.')
      setSending(false)
    }
  }

  async function copyPix() {
    if (!pixCheckout?.pix_payload) return
    try {
      await navigator.clipboard.writeText(pixCheckout.pix_payload)
      setCopied(true)
    } catch {
      setError('Não foi possível copiar automaticamente. Selecione o código abaixo e copie.')
    }
  }

  return <div className="page-stack operational-page compact-page checkout-page">
    <section className="operational-heading account-heading checkout-heading">
      <div>
        <Link className="account-back" to={`/app/mais/plano?cycle=${cycleParam}`}><ChevronLeft size={18}/>Planos</Link>
        <span className="eyebrow">Checkout</span>
        <h1>Finalize sua assinatura</h1>
        <p>Escolha como prefere pagar. A renovação fica automática nos dois meios.</p>
      </div>
    </section>

    <section className="checkout-summary" aria-labelledby="checkout-summary-title">
      <div className="checkout-summary__top">
        <div>
          <span className="eyebrow">ALOVIA</span>
          <h2 id="checkout-summary-title">{plan.name}</h2>
          <p>{plan.positioning}</p>
        </div>
        <strong className="checkout-cycle">{cycle?.label}</strong>
      </div>

      <div className="checkout-price">
        <div><strong>{formatBRL(price.monthlyEquivalent)}</strong><span>/mês</span></div>
        <small>{chargeLabel(cycleParam,price.total)}</small>
      </div>

      <div className="checkout-includes">
        <span><Check size={16}/>{plan.users===1?'1 usuário':`Até ${plan.users} usuários`}</span>
        <span><Check size={16}/>Até {plan.automaticAttendances.toLocaleString('pt-BR')} atendimentos automáticos/mês</span>
      </div>
    </section>

    <section className="checkout-payment-card" aria-labelledby="checkout-payment-title">
      <div className="checkout-payment-card__icon" aria-hidden="true"><LockKeyhole size={19}/></div>
      <div>
        <h2 id="checkout-payment-title">Forma de pagamento</h2>
        <p>Pagamento seguro processado pelo Asaas.</p>
      </div>

      <div className="payment-method-grid" role="radiogroup" aria-label="Forma de pagamento">
        <button className={`payment-method${paymentMethod==='credit_card'?' is-selected':''}`} type="button" role="radio" aria-checked={paymentMethod==='credit_card'} onClick={()=>choosePayment('credit_card')}>
          <CreditCard size={20}/><span><strong>Cartão de crédito</strong><small>Cobrança recorrente no cartão</small></span>
        </button>
        <button className={`payment-method${paymentMethod==='pix_automatic'?' is-selected':''}`} type="button" role="radio" aria-checked={paymentMethod==='pix_automatic'} onClick={()=>choosePayment('pix_automatic')}>
          <QrCode size={20}/><span><strong>Pix Automático</strong><small>Autorize uma vez e renove automaticamente</small></span>
        </button>
      </div>

      {paymentMethod==='pix_automatic'&&!pixCheckout&&<div className="pix-payer-fields">
        <label><span>Nome ou razão social</span><input autoComplete="name" value={payerName} onChange={event=>setPayerName(event.target.value)} placeholder="Nome do pagador"/></label>
        <label><span>CPF ou CNPJ</span><input inputMode="numeric" autoComplete="off" value={payerDocument} onChange={event=>setPayerDocument(event.target.value)} placeholder="CPF ou CNPJ do pagador"/></label>
        <small>Esses dados são enviados ao Asaas para criar a autorização. O ALOVIA não armazena seu CPF ou CNPJ neste checkout.</small>
      </div>}

      {pixCheckout?<div className="pix-authorization">
        <div className="pix-authorization__heading"><QrCode size={21}/><div><strong>Autorize no seu banco</strong><span>Copie o código Pix abaixo, pague o primeiro ciclo e aprove a autorização automática.</span></div></div>
        <textarea readOnly aria-label="Código Pix Copia e Cola" value={pixCheckout.pix_payload??''}/>
        <button className="secondary-button pix-copy-button" type="button" onClick={copyPix}>{copied?<><CheckCircle2 size={17}/>Copiado</>:<><Copy size={17}/>Copiar código Pix</>}</button>
        <p className="pix-waiting"><span className="status-dot"/>Aguardando confirmação do Pix Automático…</p>
      </div>:<>
        {error&&<p className="form-error checkout-payment-error" role="alert">{error}</p>}
        <button className="primary-button checkout-payment-button" type="button" onClick={continueToPayment} disabled={sending}>
          {sending?'Preparando pagamento…':paymentMethod==='pix_automatic'?'Gerar Pix Automático':'Continuar com cartão'}
        </button>
      </>}
      {pixCheckout&&error&&<p className="form-error checkout-payment-error" role="alert">{error}</p>}
    </section>
  </div>
}
