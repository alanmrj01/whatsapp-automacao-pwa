export type BillingCycle = 'monthly' | 'quarterly' | 'annual'
export type PlanId = 'basic' | 'plus'

export type Plan = {
  id: PlanId
  name: string
  positioning: string
  monthlyPrice: number
  users: number
  automaticAttendances: number
  features: string[]
}

export const billingCycles: Array<{
  id: BillingCycle
  label: string
  discount: number
  badge?: string
}> = [
  {id:'monthly',label:'Mensal',discount:0},
  {id:'quarterly',label:'Trimestral',discount:0.10,badge:'Mais popular'},
  {id:'annual',label:'Anual',discount:0.15,badge:'Maior economia'},
]

export const plans: Plan[] = [
  {
    id:'basic',
    name:'Basic',
    positioning:'Para quem toca a operação de perto.',
    monthlyPrice:197,
    users:1,
    automaticAttendances:500,
    features:['1 WhatsApp','Assistente virtual completo','Conversas e agenda reais','Dashboard operacional'],
  },
  {
    id:'plus',
    name:'Plus',
    positioning:'Para empresas que já trabalham em equipe.',
    monthlyPrice:297,
    users:5,
    automaticAttendances:1500,
    features:['1 WhatsApp','Assistente virtual completo','Conversas e agenda reais','Gestão de equipe'],
  },
]

export const defaultBillingCycle: BillingCycle = 'quarterly'

export function isPurchasablePlan(plan: PlanId) {
  return plan === 'basic'
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function cyclePrice(plan: Plan, cycle: BillingCycle) {
  const months = cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12
  const discount = billingCycles.find(item=>item.id===cycle)?.discount ?? 0
  const total = roundMoney(plan.monthlyPrice * months * (1-discount))
  return {
    months,
    total,
    monthlyEquivalent: roundMoney(total/months),
  }
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)
}
