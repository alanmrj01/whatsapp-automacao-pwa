import { Check, ChevronLeft } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { trackEventOnce } from '../../lib/tracking'
import { useEntitlements } from '../access/useEntitlements'
import { useAuth } from '../auth/useAuth'
import { useConnection } from '../whatsapp/useConnection'
import { SubscriptionManagement } from './SubscriptionManagement'
import {
  billingCycles,
  cyclePrice,
  defaultBillingCycle,
  formatBRL,
  isPurchasablePlan,
  plans,
  type BillingCycle,
  type PlanId,
} from './planCatalog'

function isBillingCycle(value: string | null): value is BillingCycle {
  return value === 'monthly' || value === 'quarterly' || value === 'annual'
}

function planCta(plan: PlanId) {
  return plan === 'basic' ? 'Escolher Basic' : 'Disponível em breve'
}

export function PlanPage() {
  const navigate = useNavigate()
  const {membership,user} = useAuth()
  const entitlement = useEntitlements()
  const connection = useConnection()
  const activationFlow = entitlement.isPreactivation
  const [params,setParams] = useSearchParams()
  const cycleParam = params.get('cycle')
  const cycle: BillingCycle = isBillingCycle(cycleParam) ? cycleParam : defaultBillingCycle

  function changeCycle(next: BillingCycle) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('cycle',next)
    nextParams.delete('plan')
    setParams(nextParams,{replace:true})
  }

  useEffect(()=>{
    if(!activationFlow || connection.data?.status!=='connected')return
    trackEventOnce(
      `activation_paywall_viewed:${membership?.business_id ?? 'unknown'}`,
      'activation_paywall_viewed',
      {funnel_stage:'activation_paywall',whatsapp_mode:connection.data.mode},
      {
        surface:'plan_selection',
        businessId:membership?.business_id,
        userId:user?.id,
      },
      'session',
    )
  },[activationFlow,connection.data?.mode,connection.data?.status,membership?.business_id,user?.id])

  function choosePlan(plan: PlanId) {
    if (!isPurchasablePlan(plan)) {
      const nextParams = new URLSearchParams(params)
      nextParams.set('cycle',cycle)
      nextParams.set('unavailable',plan)
      setParams(nextParams,{replace:true})
      return
    }
    trackEventOnce(
      `plan_selected:${membership?.business_id ?? 'unknown'}:${plan}:${cycle}`,
      'plan_selected',
      {
        plan,
        billing_cycle:cycle,
        funnel_stage:'plan_selected',
        activation_flow:activationFlow,
      },
      {
        surface:'plan_selection',
        businessId:membership?.business_id,
        userId:user?.id,
      },
      'session',
    )
    navigate(`/app/checkout?plan=${plan}&cycle=${cycle}`)
  }

  if(activationFlow&&connection.isPending)return <div className="page-stack"><LoadingState /></div>
  if(activationFlow&&(connection.isError||!connection.data))return <div className="page-stack"><ErrorState onRetry={()=>void connection.refetch()} /></div>
  if(activationFlow&&connection.data.status!=='connected')return <Navigate to="/app/whatsapp?from=activation" replace/>

  return <div className="page-stack operational-page compact-page plan-page">
    <section className="operational-heading account-heading plan-heading">
      <div>
        <Link className="account-back" to={activationFlow?'/app/whatsapp':'/app/mais'}>
          <ChevronLeft size={18}/>{activationFlow?'WhatsApp':'Configurações'}
        </Link>
        <span className="eyebrow">{activationFlow?'WhatsApp conectado':'Assinatura'}</span>
        <h1>{activationFlow?'Agora ative a Alovia':'Escolha seu plano'}</h1>
        <p>{activationFlow
          ? 'Seu WhatsApp já está conectado. Escolha o plano para liberar a automação e continuar a configuração da operação.'
          : 'Comece com o Basic. O Plus, pensado para operações em equipe, chega em breve.'}</p>
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
        const comingSoon = plan.id === 'plus'
        return <article className={`plan-card plan-card--${plan.id}${comingSoon?' is-coming-soon':''}`} key={plan.id}>
          <div className="plan-card__heading">
            <div>
              <span className="eyebrow">ALOVIA</span>
              <h2>{plan.name}</h2>
              <p>{plan.positioning}</p>
            </div>
            {comingSoon&&<span className="plan-coming-soon-badge">Em breve</span>}
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

          <button className="primary-button plan-card__cta" type="button" disabled={comingSoon} onClick={()=>choosePlan(plan.id)}>
            {planCta(plan.id)}
          </button>
          {comingSoon&&<p className="plan-coming-soon" role="status">O plano Plus estará disponível em breve. Para começar agora, escolha o plano Basic.</p>}
        </article>
      })}
    </section>

    <p className="plan-footnote">Você confere plano, período e valor novamente antes de pagar. Basic inclui 7 dias de garantia.</p>
    {!activationFlow&&<SubscriptionManagement />}
  </div>
}
