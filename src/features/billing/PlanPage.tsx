import { Check, ChevronLeft } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEntitlements } from '../access/useEntitlements'
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

function isPlanId(value: string | null): value is PlanId {
  return value === 'basic' || value === 'plus'
}

export function PlanPage() {
  const [params,setParams] = useSearchParams()
  const entitlement = useEntitlements()
  const cycleParam = params.get('cycle')
  const planParam = params.get('plan')
  const cycle: BillingCycle = isBillingCycle(cycleParam) ? cycleParam : defaultBillingCycle
  const selectedPlan: PlanId | null = isPlanId(planParam) ? planParam : null

  function changeCycle(next: BillingCycle) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('cycle',next)
    setParams(nextParams,{replace:true})
  }

  function choosePlan(plan: PlanId) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('plan',plan)
    nextParams.set('cycle',cycle)
    setParams(nextParams,{replace:true})
  }

  const selected = plans.find(plan=>plan.id===selectedPlan)

  return <div className="page-stack operational-page compact-page plan-page">
    <section className="operational-heading account-heading">
      <div>
        <Link className="account-back" to="/app/mais"><ChevronLeft size={18}/>Mais</Link>
        <span className="eyebrow">Assinatura</span>
        <h1>Plano</h1>
        <p>Escolha o plano e o período que combinam com sua operação.</p>
      </div>
    </section>

    {entitlement.isPaid && <section className="account-note" role="status">
      <strong>Acesso operacional liberado</strong>
      <span>O plano comercial da sua conta ainda não está registrado. A liberação atual continua funcionando normalmente.</span>
    </section>}

    {entitlement.isReadOnlyRetained && <section className="account-note" role="status">
      <strong>Seus dados continuam preservados</strong>
      <span>Você pode consultar seu histórico. Uma assinatura reativa as funções operacionais.</span>
    </section>}

    <section aria-labelledby="billing-cycle-title">
      <div className="section-title-row"><h2 id="billing-cycle-title">Período de cobrança</h2></div>
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
          {item.discount>0&&<span>{Math.round(item.discount*100)}% OFF</span>}
          {item.badge&&<small>{item.badge}</small>}
        </button>)}
      </div>
    </section>

    <section className="plan-grid" aria-label="Planos disponíveis">
      {plans.map(plan=>{
        const price = cyclePrice(plan,cycle)
        const chosen = selectedPlan===plan.id
        return <article className={`plan-card ${chosen?'is-selected':''}`} key={plan.id}>
          <div className="plan-card__heading">
            <div><span className="eyebrow">ALOVIA</span><h2>{plan.name}</h2><p>{plan.positioning}</p></div>
            {cycle==='quarterly'&&<span className="plan-badge">Mais popular</span>}
          </div>
          <div className="plan-price">
            <strong>{formatBRL(price.monthlyEquivalent)}</strong><span>/mês</span>
            <small>{cycle==='monthly'?'Cobrança mensal':`Cobrado ${formatBRL(price.total)} ${cycle==='quarterly'?'a cada 3 meses':'por ano'}`}</small>
          </div>
          <ul className="plan-features">
            <li><Check size={17}/>{plan.users===1?'1 usuário':`Até ${plan.users} usuários`}</li>
            <li><Check size={17}/>Até {plan.automaticAttendances.toLocaleString('pt-BR')} atendimentos automáticos/mês</li>
            {plan.features.map(feature=><li key={feature}><Check size={17}/>{feature}</li>)}
          </ul>
          <button className={chosen?'compact-button':'primary-button'} type="button" onClick={()=>choosePlan(plan.id)}>
            {chosen?`${plan.name} selecionado`:`Escolher ${plan.name}`}
          </button>
        </article>
      })}
    </section>

    {selected&&<section className="plan-selection-summary" aria-live="polite">
      <div><span className="eyebrow">Sua escolha</span><strong>ALOVIA {selected.name} · {billingCycles.find(item=>item.id===cycle)?.label}</strong></div>
      <p>A cobrança só será criada depois da confirmação na etapa de pagamento.</p>
    </section>}
  </div>
}
