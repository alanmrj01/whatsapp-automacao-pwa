import { Check, ChevronLeft, LockKeyhole } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import {
  billingCycles,
  cyclePrice,
  formatBRL,
  plans,
  type BillingCycle,
  type PlanId,
} from './planCatalog'

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

type CheckoutResponse = {
  checkout_id:string
  checkout_url:string
  plan:PlanId
  cycle:BillingCycle
  amount_cents:number
}

export function CheckoutPage() {
  const [params] = useSearchParams()
  const planId = params.get('plan')
  const cycleParam = params.get('cycle')
  const requestKey = useRef<string>(crypto.randomUUID())
  const [sending,setSending] = useState(false)
  const [error,setError] = useState<string | null>(null)

  if (!isPlanId(planId) || !isBillingCycle(cycleParam)) {
    return <Navigate to="/app/mais/plano" replace />
  }

  const plan = plans.find(item=>item.id===planId)
  if (!plan) return <Navigate to="/app/mais/plano" replace />

  const price = cyclePrice(plan,cycleParam)
  const cycle = billingCycles.find(item=>item.id===cycleParam)

  async function continueToPayment() {
    if (sending) return
    setSending(true)
    setError(null)
    try {
      const checkout = await api.request<CheckoutResponse>('/billing/checkouts',{
        method:'POST',
        headers:{'Idempotency-Key':requestKey.current},
        body:JSON.stringify({
          plan:planId,
          cycle:cycleParam,
          return_origin:window.location.origin,
        }),
      })
      const destination = new URL(checkout.checkout_url)
      if (destination.protocol !== 'https:' || !destination.hostname.endsWith('asaas.com')) {
        throw new Error('invalid checkout host')
      }
      window.location.assign(destination.toString())
    } catch {
      setError('Não foi possível abrir o pagamento agora. Tente novamente.')
      setSending(false)
    }
  }

  return <div className="page-stack operational-page compact-page checkout-page">
    <section className="operational-heading account-heading checkout-heading">
      <div>
        <Link className="account-back" to={`/app/mais/plano?cycle=${cycleParam}`}><ChevronLeft size={18}/>Planos</Link>
        <span className="eyebrow">Checkout</span>
        <h1>Finalize sua assinatura</h1>
        <p>Confira sua escolha e siga para o pagamento seguro.</p>
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
        <h2 id="checkout-payment-title">Pagamento seguro</h2>
        <p>Você será direcionado ao ambiente seguro do Asaas para concluir a assinatura com cartão de crédito.</p>
      </div>
      {error&&<p className="form-error checkout-payment-error" role="alert">{error}</p>}
      <button className="primary-button checkout-payment-button" type="button" onClick={continueToPayment} disabled={sending}>
        {sending?'Abrindo pagamento…':'Continuar para pagamento'}
      </button>
    </section>
  </div>
}
