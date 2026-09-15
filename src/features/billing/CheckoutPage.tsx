import { Check, ChevronLeft, LockKeyhole } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
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

export function CheckoutPage() {
  const [params] = useSearchParams()
  const planId = params.get('plan')
  const cycleParam = params.get('cycle')

  if (!isPlanId(planId) || !isBillingCycle(cycleParam)) {
    return <Navigate to="/app/mais/plano" replace />
  }

  const plan = plans.find(item=>item.id===planId)
  if (!plan) return <Navigate to="/app/mais/plano" replace />

  const price = cyclePrice(plan,cycleParam)
  const cycle = billingCycles.find(item=>item.id===cycleParam)

  return <div className="page-stack operational-page compact-page checkout-page">
    <section className="operational-heading account-heading checkout-heading">
      <div>
        <Link className="account-back" to={`/app/mais/plano?cycle=${cycleParam}`}><ChevronLeft size={18}/>Planos</Link>
        <span className="eyebrow">Checkout</span>
        <h1>Finalize sua assinatura</h1>
        <p>Confira sua escolha antes de seguir para o pagamento.</p>
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
        <p>Na próxima etapa você escolhe a forma de pagamento e conclui a assinatura.</p>
      </div>
      <button className="primary-button checkout-payment-button" type="button" disabled>
        Continuar para pagamento
      </button>
    </section>
  </div>
}
