import { Check, ChevronLeft } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  billingCycles,
  cyclePrice,
  defaultBillingCycle,
  formatBRL,
  plans,
  type BillingCycle,
  type PlanId,
} from './planCatalog'

function isBillingCycle(value: string | null): value is BillingCycle {
  return value === 'monthly' || value === 'quarterly' || value === 'annual'
}

function planCta(plan: PlanId) {
  return plan === 'basic' ? 'Escolher Basic' : 'Escolher Plus'
}

export function PlanPage() {
  const navigate = useNavigate()
  const [params,setParams] = useSearchParams()
  const cycleParam = params.get('cycle')
  const cycle: BillingCycle = isBillingCycle(cycleParam) ? cycleParam : defaultBillingCycle

  function changeCycle(next: BillingCycle) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('cycle',next)
    nextParams.delete('plan')
    setParams(nextParams,{replace:true})
  }

  function choosePlan(plan: PlanId) {
    navigate(`/app/checkout?plan=${plan}&cycle=${cycle}`)
  }

  return <div className="page-stack operational-page compact-page plan-page">
    <section className="operational-heading account-heading plan-heading">
      <div>
        <Link className="account-back" to="/app/mais"><ChevronLeft size={18}/>Mais</Link>
        <span className="eyebrow">Assinatura</span>
        <h1>Escolha seu plano</h1>
        <p>Comece com o Basic ou escolha o Plus para uma operação com mais equipe e volume.</p>
      </div>
    </section>

    <section className="billing-choice" aria-labelledby="billing-cycle-title">
      <div className="section-title-row billing-choice__heading">
        <div>
          <h2 id="billing-cycle-title">Como você prefere pagar?</h2>
          <p>Troque o período e compare os valores na hora.</p>
        </div>
      </div>
      <div className="billing-cycle-tabs" role="tablist" aria-label="Período de cobrança">
        {billingCycles.map(item=><button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={cycle===item.id}
          className={cycle===item.id?'is-selected':''}
          onClick={()=>changeCycle(item.id)}
        >
          <strong>{item.label}</strong>
          {item.discount>0&&<span>Economize {Math.round(item.discount*100)}%</span>}
          {item.badge&&<small>{item.badge}</small>}
        </button>)}
      </div>
    </section>

    <section className="plan-grid" aria-label="Planos disponíveis">
      {plans.map(plan=>{
        const price = cyclePrice(plan,cycle)
        const cycleLabel = billingCycles.find(item=>item.id===cycle)?.label
        return <article className={`plan-card plan-card--${plan.id}`} key={plan.id}>
          <div className="plan-card__heading">
            <div>
              <span className="eyebrow">ALOVIA</span>
              <h2>{plan.name}</h2>
              <p>{plan.positioning}</p>
            </div>
          </div>

          <div className="plan-price" aria-label={`Preço do plano ${plan.name} no período ${cycleLabel}`}>
            <strong>{formatBRL(price.monthlyEquivalent)}</strong><span>/mês</span>
            <small>{cycle==='monthly'?'Cobrado mensalmente':`Cobrado ${formatBRL(price.total)} ${cycle==='quarterly'?'a cada 3 meses':'por ano'}`}</small>
          </div>

          <ul className="plan-features">
            <li><Check size={17}/>{plan.users===1?'1 usuário':`Até ${plan.users} usuários`}</li>
            <li><Check size={17}/>Até {plan.automaticAttendances.toLocaleString('pt-BR')} atendimentos automáticos/mês</li>
            {plan.features.map(feature=><li key={feature}><Check size={17}/>{feature}</li>)}
          </ul>

          <button className="primary-button plan-card__cta" type="button" onClick={()=>choosePlan(plan.id)}>
            {planCta(plan.id)}
          </button>
        </article>
      })}
    </section>

    <p className="plan-footnote">Você confere plano, período e valor novamente antes de pagar.</p>
  </div>
}
