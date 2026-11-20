import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CircleDollarSign,
  Gauge,
  ListChecks,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { ApiError } from '../../lib/httpClient'
import {
  getPlatformAnalytics,
  type AnalyticsAdPerformance,
  type AnalyticsActivationProgress,
  type AnalyticsTrafficFunnel,
  type AnalyticsBreakdown,
  type AnalyticsConversionBreakdown,
  type AnalyticsKpi,
  type AnalyticsLeadRecovery,
  type AnalyticsQuizQuestion,
  type AnalyticsSeriesPoint,
  type AnalyticsStatus,
  type PlatformAnalyticsSummary,
} from './platformAnalytics'
import './TrackingDashboardPage.css'

const periodOptions = [
  {value:1,label:'Últimas 24 horas'},
  {value:7,label:'Últimos 7 dias'},
  {value:30,label:'Últimos 30 dias'},
  {value:90,label:'Últimos 90 dias'},
]

const acronymTitles:Record<string,string> = {
  MRR:'Monthly Recurring Revenue / receita recorrente mensal',
  CAC:'Customer Acquisition Cost / custo de aquisição de cliente',
  ROAS:'Return on Ad Spend / retorno sobre investimento em anúncios',
  ROI:'Return on Investment / retorno sobre investimento',
  CTR:'Click Through Rate / taxa de cliques',
  CPC:'Cost Per Click / custo por clique',
  CPM:'Cost Per Mille / custo por mil impressões',
  LTV:'Lifetime Value / valor do cliente ao longo do tempo',
  LPV:'Landing Page View / visualização da página',
}

const statusCopy:Record<AnalyticsStatus,string> = {
  ready:'Dados reais',
  structuring:'Em estruturação',
  awaiting_integration:'Aguardando integração',
  awaiting_history:'Aguardando histórico',
  insufficient_data:'Sem dados suficientes',
}

const seriesLabels = {
  quiz_views:'Quiz aberto',
  quiz_completed:'Quiz concluído',
  vsl_started:'VSL iniciada',
  accounts:'Contas',
  demo_entries:'Demonstrações',
  checkout_started:'Checkouts',
  subscriptions:'Vendas',
  activations:'Ativações',
} satisfies Partial<Record<keyof AnalyticsSeriesPoint,string>>

type TrendMetric = keyof typeof seriesLabels

function labelWithMeaning(label:string) {
  const meaning=acronymTitles[label]
  return meaning
    ? <span className="tracking-metric-label"><abbr title={meaning}>{label}</abbr><small>({meaning})</small></span>
    : label
}

function formatNumber(value:number|null,maximumFractionDigits=0) {
  return value===null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits}).format(value)
}

function formatCurrency(value:number|null) {
  return value===null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)
}

function formatPercent(value:number|null) {
  return value===null?'—':`${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value)}%`
}

function formatRatio(value:number|null) {
  return value===null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(value)
}

function formatMetric(metric:AnalyticsKpi) {
  if(metric.format==='currency_brl')return formatCurrency(metric.value)
  if(metric.format==='percent')return formatPercent(metric.value)
  if(metric.format==='ratio')return formatRatio(metric.value)
  return formatNumber(metric.value)
}

function MetricCard({metric,compact=false}:{metric:AnalyticsKpi;compact?:boolean}) {
  const status=metric.status==='ready'&&metric.value===null?'insufficient_data':metric.status
  return <article className={`tracking-kpi${compact?' tracking-kpi--compact':''}${status!=='ready'?' is-future':''}`}>
    <div className="tracking-kpi__heading">
      <span>{labelWithMeaning(metric.label)}</span>
      <i className={`tracking-status is-${status}`}>{statusCopy[status]}</i>
    </div>
    <strong>{formatMetric(metric)}</strong>
    {metric.note&&<small className="tracking-kpi__note">{metric.note}</small>}
  </article>
}

function EmptyBlock({text}:{text:string}) {
  return <div className="tracking-empty-block"><Gauge size={24}/><strong>Sem dados suficientes</strong><span>{text}</span></div>
}

function Funnel({summary}:{summary:PlatformAnalyticsSummary}) {
  return <section className="tracking-card tracking-funnel" aria-labelledby="tracking-funnel-title">
    <header className="tracking-card__header">
      <div>
        <span className="tracking-eyebrow"><BarChart3 size={15}/> CONVERSÃO</span>
        <h2 id="tracking-funnel-title">Funil comercial do MVP</h2>
      </div>
      <span className="tracking-card__hint">Pessoas/empresas únicas sempre que aplicável</span>
    </header>
    <div className="tracking-funnel__scroll">
      <div className="tracking-funnel__steps" style={{gridTemplateColumns:`repeat(${Math.max(1,summary.funnel.length)},minmax(125px,1fr))`,minWidth:summary.funnel.length*125}}>
        {summary.funnel.map((step,index)=><article key={step.key} className={`tracking-funnel__step${step.status!=='ready'?' is-future':''}`}>
          <div className="tracking-funnel__label">{step.label}</div>
          <strong>{formatNumber(step.value)}</strong>
          <span>{index===0?'Base':formatPercent(step.conversion_rate)}</span>
          {step.note&&<small>{step.note}</small>}
        </article>)}
      </div>
    </div>
  </section>
}

function Donut({breakdown}:{breakdown:AnalyticsBreakdown}) {
  const total=breakdown.items.reduce((sum,item)=>sum+item.value,0)
  const palette=['#1687ff','#3dd7be','#d64dff','#ffb547','#7d8cff']
  let cursor=0
  const segments=breakdown.items.map((item,index)=>{
    const start=cursor
    const share=total>0?(item.value/total)*100:0
    cursor+=share
    return `${palette[index%palette.length]} ${start}% ${cursor}%`
  })
  const background=segments.length? `conic-gradient(${segments.join(',')})` : 'conic-gradient(#273348 0 100%)'
  return <section className="tracking-card tracking-breakdown">
    <header className="tracking-card__header">
      <div><span className="tracking-eyebrow"><CircleDollarSign size={15}/> RECEITA</span><h2>{breakdown.label}</h2></div>
      <i className={`tracking-status is-${breakdown.status}`}>{statusCopy[breakdown.status]}</i>
    </header>
    <div className="tracking-donut-layout">
      <div className="tracking-donut" style={{background}}>
        <div><strong>{total||'—'}</strong><span>Total</span></div>
      </div>
      <div className="tracking-legend">
        {breakdown.items.length?breakdown.items.map((item,index)=><div key={item.key}>
          <span className="tracking-legend__dot" style={{background:palette[index%palette.length]}}/>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>):<p>{breakdown.note||'Aguardando dados.'}</p>}
      </div>
    </div>
  </section>
}

function Ranking({breakdown,eyebrow='DIAGNÓSTICO'}:{breakdown:AnalyticsBreakdown;eyebrow?:string}) {
  const max=Math.max(1,...breakdown.items.map(item=>item.value))
  return <section className="tracking-card tracking-ranking">
    <header className="tracking-card__header">
      <div><span className="tracking-eyebrow"><AlertTriangle size={15}/> {eyebrow}</span><h2>{breakdown.label}</h2></div>
      <i className={`tracking-status is-${breakdown.status}`}>{statusCopy[breakdown.status]}</i>
    </header>
    {breakdown.items.length?<div className="tracking-ranking__rows">
      {breakdown.items.map(item=><div className="tracking-ranking__row" key={item.key}>
        <div><span>{item.label}</span><strong>{item.value}</strong></div>
        <div className="tracking-ranking__track"><span style={{width:`${Math.max(5,(item.value/max)*100)}%`}}/></div>
      </div>)}
    </div>:<EmptyBlock text={breakdown.note||'Aguardando dados suficientes.'}/>}
  </section>
}

function ConversionTable({breakdown}:{breakdown:AnalyticsConversionBreakdown}) {
  return <section className="tracking-card tracking-conversion-table">
    <header className="tracking-card__header">
      <div><span className="tracking-eyebrow"><Target size={15}/> ATRIBUIÇÃO</span><h2>{breakdown.label}</h2></div>
      <i className={`tracking-status is-${breakdown.status}`}>{statusCopy[breakdown.status]}</i>
    </header>
    {breakdown.items.length?<div className="tracking-table-wrap">
      <table>
        <thead><tr><th>Origem</th><th>Quiz</th><th>Contas</th><th>Vendas</th><th>Ativações</th><th>Receita</th></tr></thead>
        <tbody>{breakdown.items.map(item=><tr key={item.key}>
          <td><strong>{item.label}</strong></td>
          <td>{item.quiz_visitors}</td>
          <td>{item.accounts}</td>
          <td>{item.subscriptions}</td>
          <td>{item.activations}</td>
          <td>{formatCurrency(item.revenue_brl)}</td>
        </tr>)}</tbody>
      </table>
    </div>:<EmptyBlock text={breakdown.note||'Aguardando atribuição suficiente.'}/>}
  </section>
}


const trafficStages = [
  ['quiz_views','Quiz aberto'],
  ['quiz_started','Quiz iniciado'],
  ['quiz_completed','Quiz concluído'],
  ['vsl_started','Vídeo iniciado'],
  ['vsl_completed','Vídeo concluído'],
  ['accounts','Contas'],
  ['demo_entries','Demonstrações'],
  ['checkout_started','Checkouts'],
  ['subscriptions','Vendas'],
  ['activations','Ativações comerciais'],
] as const

function TrafficFunnels({items}:{items?:AnalyticsTrafficFunnel[]}) {
  return <section className="tracking-card tracking-diagnostic-panel">
    <header className="tracking-card__header">
      <div><span className="tracking-eyebrow"><Target size={15}/> ORIGENS</span><h2>Funil por origem</h2></div>
    </header>
    {items?.length?<div className="tracking-table-wrap tracking-table-wrap--wide">
      <table>
        <thead><tr><th>Etapa</th>{items.map(item=><th key={item.key}>{item.label}</th>)}</tr></thead>
        <tbody>{trafficStages.map(([key,label])=><tr key={key}>
          <td><strong>{label}</strong></td>
          {items.map(item=><td key={item.key}>{formatNumber(item[key])}</td>)}
        </tr>)}</tbody>
      </table>
    </div>:<EmptyBlock text="Separação por origem ainda indisponível."/>}
    <p className="tracking-diagnostic-note">Contagens independentes por etapa. Tráfego sem atribuição não é considerado orgânico. Visitantes de diferentes origens podem coincidir.</p>
  </section>
}

const activationGroups = [
  {
    label:'Conta e demonstração',
    stages:[
      ['accounts','Contas criadas'],
      ['demo_entries','Demonstrações'],
      ['demo_interactions','Interação na demonstração'],
    ],
  },
  {
    label:'Conexão do WhatsApp',
    stages:[
      ['connection_attempted','Tentaram conectar'],
      ['connection_failed','Falhas registradas'],
      ['connection_blocked','Bloqueios registrados'],
      ['connection_completed_event','Evento de conclusão'],
      ['connection_confirmed','Conexões registradas no banco'],
    ],
  },
  {
    label:'Oferta e checkout',
    stages:[
      ['plan_views','Planos exibidos'],
      ['plan_selected','Planos selecionados'],
      ['checkout_started','Checkouts iniciados'],
      ['checkout_created','Cobranças criadas'],
    ],
  },
  {
    label:'Pagamento e ativação',
    stages:[
      ['payment_submitted','Pagamentos submetidos'],
      ['payment_failed','Falhas de pagamento'],
      ['paid_businesses','Empresas pagantes'],
      ['commercially_activated','Ativação comercial'],
    ],
  },
] as const

function ActivationProgress({progress}:{progress?:AnalyticsActivationProgress}) {
  return <section className="tracking-card tracking-diagnostic-panel">
    <header className="tracking-card__header">
      <div><span className="tracking-eyebrow"><ListChecks size={15}/> ATIVAÇÃO</span><h2>Etapas de ativação</h2></div>
      <span className="tracking-card__hint">Empresas cadastradas no período</span>
    </header>
    {progress?<div className="tracking-activation-grid">
      {activationGroups.map(group=><article key={group.label} className="tracking-activation-group">
        <h3>{group.label}</h3>
        {group.stages.map(([key,label])=><div key={key}>
          <span>{label}</span>
          <strong>{formatNumber(progress[key])}</strong>
        </div>)}
      </article>)}
    </div>:<EmptyBlock text="Detalhamento de ativação ainda indisponível."/>}
    <p className="tracking-diagnostic-note">Etapas independentes: uma empresa pode ter falhado e conectado depois. Ativação comercial não comprova atendimento realizado.</p>
  </section>
}

function formatDateTime(value:string|null|undefined) {
  if(!value)return '—'
  const date=new Date(value)
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{
    dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo',
  }).format(date)
}

const connectionEventLabels:Record<string,string> = {
  whatsapp_connection_started:'Tentativa iniciada',
  whatsapp_connection_failed:'Falha registrada',
  whatsapp_connection_blocked:'Bloqueio registrado',
  whatsapp_connection_completed:'Conclusão informada',
}

function LeadConnection({item}:{item:AnalyticsLeadRecovery}) {
  if(item.whatsapp_connection_last_event===undefined)return <span>Não informado pela versão atual</span>
  const event=item.whatsapp_connection_last_event
  return <>
    <strong>{event?connectionEventLabels[event]??'Evento registrado':'Sem tentativa registrada'}</strong>
    {item.whatsapp_connection_last_event_at&&<small>Último evento: {formatDateTime(item.whatsapp_connection_last_event_at)}</small>}
    {item.whatsapp_connection_started_at&&<small>Tentativa: {formatDateTime(item.whatsapp_connection_started_at)}</small>}
    {item.whatsapp_connected_at&&<small>Conexão registrada: {formatDateTime(item.whatsapp_connected_at)}</small>}
  </>
}

function AdPerformanceTable({items,metaStatus,metaNote}:{items:AnalyticsAdPerformance[];metaStatus:PlatformAnalyticsSummary['meta_ads_status'];metaNote:string|null}) {
  return <section className="tracking-card tracking-ad-performance">
    <header className="tracking-card__header">
      <div><span className="tracking-eyebrow"><Megaphone size={15}/> CRIATIVOS</span><h2>Desempenho por anúncio</h2></div>
      <i className={`tracking-status is-${metaStatus==='ready'?'ready':'awaiting_integration'}`}>{metaStatus==='ready'?'Meta Ads conectada':'Aguardando Meta Ads'}</i>
    </header>
    {items.length?<div className="tracking-table-wrap tracking-table-wrap--wide">
      <table>
        <thead><tr>
          <th>Anúncio</th><th>Gasto</th><th>Cliques</th><th>{labelWithMeaning('CTR')}</th><th>Quiz aberto</th><th>Quiz iniciado</th><th>Quiz concluído</th><th>VSL iniciada</th><th>VSL concluída</th><th>Contas</th><th>Conversão em conta</th><th>Vendas</th><th>Ativações</th><th>Receita líquida</th><th>{labelWithMeaning('CAC')}</th><th>{labelWithMeaning('ROAS')}</th>
        </tr></thead>
        <tbody>{items.map(item=><tr key={item.ad_id}>
          <td><strong>{item.ad_name}</strong><small>{item.ad_id}</small></td>
          <td>{formatCurrency(item.spend_brl)}</td>
          <td>{formatNumber(item.link_clicks)}</td>
          <td>{formatPercent(item.ctr)}</td>
          <td>{item.quiz_visitors}</td>
          <td>{formatNumber(item.quiz_started??null)}</td>
          <td>{item.quiz_completed}</td>
          <td>{formatNumber(item.vsl_started??null)}</td>
          <td>{formatNumber(item.vsl_completed??null)}</td>
          <td>{item.accounts}</td>
          <td>{formatPercent(item.account_conversion_rate)}</td>
          <td>{item.subscriptions}</td>
          <td>{item.activations}</td>
          <td>{formatCurrency(item.revenue_brl)}</td>
          <td>{formatCurrency(item.cac_brl)}</td>
          <td>{formatRatio(item.roas)}</td>
        </tr>)}</tbody>
      </table>
    </div>:<EmptyBlock text={metaNote||'Os anúncios aparecerão aqui assim que houver tráfego identificado.'}/>}
  </section>
}

function formatLeadWhatsApp(value:string) {
  const digits=value.replace(/\D/g,'')
  const local=digits.startsWith('55')?digits.slice(2):digits
  if(local.length===11)return `+55 (${local.slice(0,2)}) ${local.slice(2,7)}-${local.slice(7)}`
  if(local.length===10)return `+55 (${local.slice(0,2)}) ${local.slice(2,6)}-${local.slice(6)}`
  return value
}

function LeadRecoveryTable({items}:{items:AnalyticsLeadRecovery[]}) {
  return <section className="tracking-card tracking-leads">
    <header className="tracking-card__header">
      <div>
        <span className="tracking-eyebrow"><MessageCircle size={15}/> RECUPERAÇÃO</span>
        <h2>Leads e ponto de abandono</h2>
      </div>
      <span className="tracking-card__hint">Oportunidades sem compra aparecem primeiro</span>
    </header>
    {items.length?<div className="tracking-table-wrap tracking-table-wrap--wide">
      <table>
        <thead><tr>
          <th>Lead</th><th>WhatsApp</th><th>Empresa</th><th>Etapa comercial</th><th>Conexão do WhatsApp</th><th>Última atividade</th><th>Status</th><th>Ação</th>
        </tr></thead>
        <tbody>{items.map(item=>{
          const digits=item.whatsapp_e164.replace(/\D/g,'')
          const refundPriority=item.stage_key==='refund_requested'||item.stage_key==='refunded'
          return <tr key={item.business_id} className={refundPriority?'is-refund-priority':undefined}>
            <td><strong>{item.lead_name}</strong>{item.ad_name&&<small>{item.ad_name}</small>}</td>
            <td>{formatLeadWhatsApp(item.whatsapp_e164)}</td>
            <td>{item.business_name}</td>
            <td><strong>{item.stage_label}</strong>{item.angle&&<small>{item.angle.replaceAll('_',' ')}</small>}</td>
            <td><LeadConnection item={item}/></td>
            <td>{new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(item.last_activity_at))}</td>
            <td><span className={`tracking-lead-status ${item.needs_follow_up?'is-followup':'is-customer'}`}>{item.needs_follow_up?'Recuperar':'Cliente'}</span></td>
            <td><a className="tracking-whatsapp-link" href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer"><MessageCircle size={14}/> Abrir WhatsApp</a></td>
          </tr>
        })}</tbody>
      </table>
    </div>:<EmptyBlock text="Novos cadastros com nome e WhatsApp aparecerão aqui automaticamente."/>}
  </section>
}

function QuizQuestions({questions}:{questions:AnalyticsQuizQuestion[]}) {
  return <section className="tracking-card tracking-quiz">
    <header className="tracking-card__header">
      <div><span className="tracking-eyebrow"><ListChecks size={15}/> QUIZ</span><h2>Respostas do quiz e qualidade do lead</h2></div>
      <span className="tracking-card__hint">Resposta → conta → venda</span>
    </header>
    {questions.length?<div className="tracking-quiz__grid">{questions.map(question=><article key={question.question_id} className="tracking-question">
      <header><span>{question.question_id.toUpperCase()}</span><strong>{question.label}</strong><small>{question.responses} respostas</small></header>
      <div className="tracking-question__answers">{question.answers.map(answer=><div key={answer.answer_id} className="tracking-answer">
        <div><strong>{answer.answer_id}</strong><span>{answer.profile_dimension.replaceAll('_',' ')}</span><b>{formatPercent(answer.share)}</b></div>
        <div className="tracking-answer__stats">
          <span>Respostas <strong>{answer.responses}</strong></span>
          <span>Conta <strong>{formatPercent(answer.account_conversion_rate)}</strong></span>
          <span>Venda <strong>{formatPercent(answer.purchase_conversion_rate)}</strong></span>
        </div>
      </div>)}</div>
    </article>)}</div>:<EmptyBlock text="As perguntas aparecerão após respostas reais do quiz."/>}
  </section>
}

function TrendChart({series}:{series:AnalyticsSeriesPoint[]}) {
  const [metric,setMetric]=useState<TrendMetric>('quiz_views')
  const points=useMemo(()=>{
    const values=series.map(item=>item[metric])
    const max=Math.max(1,...values)
    if(series.length===1)return [{x:50,y:100-(values[0]/max)*100}]
    return series.map((item,index)=>({
      x:(index/(series.length-1))*100,
      y:100-(item[metric]/max)*100,
    }))
  },[metric,series])
  const polyline=points.map(point=>`${point.x},${point.y}`).join(' ')
  const total=series.reduce((sum,item)=>sum+item[metric],0)

  return <section className="tracking-card tracking-trend">
    <header className="tracking-card__header tracking-card__header--wrap">
      <div><span className="tracking-eyebrow"><TrendingUp size={15}/> EVOLUÇÃO</span><h2>Evolução do funil</h2></div>
      <div className="tracking-segmented">
        {(Object.keys(seriesLabels) as TrendMetric[]).map(key=><button key={key} type="button" className={metric===key?'is-active':''} onClick={()=>setMetric(key)}>{seriesLabels[key]}</button>)}
      </div>
    </header>
    <div className="tracking-trend__summary"><strong>{formatNumber(total)}</strong><span>{seriesLabels[metric]} · soma diária</span></div>
    <div className="tracking-trend__chart" role="img" aria-label={`Evolução de ${seriesLabels[metric]}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="0" x2="100" y1="25" y2="25"/>
        <line x1="0" x2="100" y1="50" y2="50"/>
        <line x1="0" x2="100" y1="75" y2="75"/>
        {points.length>1&&<polyline points={polyline}/>}
        {points.map((point,index)=><circle key={index} cx={point.x} cy={point.y} r="1.6"/>)}
      </svg>
    </div>
    <div className="tracking-trend__axis">
      <span>{series[0]?.date?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(`${series[0].date}T12:00:00`)):'—'}</span>
      <span>{series.at(-1)?.date?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(`${series.at(-1)!.date}T12:00:00`)):'—'}</span>
    </div>
  </section>
}

export function TrackingDashboardPage() {
  const navigate=useNavigate()
  const [days,setDays]=useState(7)
  const [summary,setSummary]=useState<PlatformAnalyticsSummary|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  async function load(selectedDays=days) {
    setLoading(true)
    setError('')
    try {
      setSummary(await getPlatformAnalytics(selectedDays))
    } catch (requestError) {
      setError(requestError instanceof ApiError
        ? requestError.message
        : 'Não foi possível carregar os indicadores agora.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{void load(days)},[days])

  const readyByKey=useMemo(()=>new Map(summary?.kpis.map(metric=>[metric.key,metric])??[]),[summary])
  const headlineKeys=['ad_spend','cac','roas','net_revenue','subscriptions','accounts','activations','mrr']
  const acquisitionKeys=['impressions','link_clicks','ctr','cpc','cpm','quiz_views','quiz_views_all','quiz_completion_rate','vsl_completion_rate']
  const internalKeys=['signup_cta','signup_conversion_rate','demo_entries','plan_views','checkout_started','trial_to_paid','activation_rate','refunds']
  const headline=headlineKeys.map(key=>readyByKey.get(key)).filter((item):item is AnalyticsKpi=>!!item)
  const acquisition=acquisitionKeys.map(key=>readyByKey.get(key)).filter((item):item is AnalyticsKpi=>!!item)
  const internal=internalKeys.map(key=>readyByKey.get(key)).filter((item):item is AnalyticsKpi=>!!item)

  return <>
    <AppHeader title="Indicadores" />
    <main className="tracking-dashboard">
      <section className="tracking-topbar">
        <button className="tracking-back" type="button" onClick={()=>navigate('/admin')}><ArrowLeft size={18}/> Administração</button>
        <div>
          <span className="tracking-eyebrow">ALOVIA · GROWTH</span>
          <h1>Indicadores do MVP</h1>
          <p>Funil comercial, comportamento, ativação e receita. Dados próprios da Alovia; mídia importada da Meta Ads quando conectada.</p>
        </div>
        <button className="tracking-refresh" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={17}/>{loading?'Atualizando…':'Atualizar'}</button>
      </section>

      <section className="tracking-controls" aria-label="Filtros e fontes do dashboard">
        <label>Período
          <select value={days} onChange={event=>setDays(Number(event.target.value))}>
            {periodOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className={`tracking-source ${summary?.meta_ads_status==='ready'?'is-ready':'is-pending'}`}>
          <span>Meta Ads</span>
          <strong>{summary?.meta_ads_status==='ready'?'Conectada':'Aguardando integração'}</strong>
          {summary?.meta_ads_note&&<small>{summary.meta_ads_note}</small>}
        </div>
        <div className="tracking-source is-ready">
          <span>Alovia + pagamentos</span>
          <strong>Fonte de verdade</strong>
          <small>Funil first-party, vendas e reembolsos.</small>
        </div>
      </section>

      {error&&<div className="tracking-error" role="alert"><span>{error}</span><button type="button" onClick={()=>void load()}>Tentar novamente</button></div>}

      {loading&&!summary?<div className="tracking-loading">Carregando indicadores…</div>:summary&&<>
        <section className="tracking-headline-grid">{headline.map(metric=><MetricCard key={metric.key} metric={metric}/>)}</section>

        <section className="tracking-diagnostic-panel tracking-period-note">
          <strong>Período efetivo: {formatDateTime(summary.period_start)} até {formatDateTime(summary.period_end)}</strong>
          <span>Horário de Brasília. A Meta reporta por dia e pode incluir horas anteriores ao início do período.</span>
          <span>VSL = Video Sales Letter / vídeo de vendas. Taxas indisponíveis não significam conversão zero.</span>
          {!summary.activation_progress&&<span>Versão anterior do backend: os indicadores podem utilizar a metodologia anterior.</span>}
        </section>

        <Funnel summary={summary}/>

        <TrafficFunnels items={summary.traffic_funnels}/>

        <section className="tracking-section">
          <header className="tracking-section__header">
            <div><span className="tracking-eyebrow"><Megaphone size={15}/> AQUISIÇÃO</span><h2>Saúde do tráfego</h2></div>
            <span>O topo do funil explica o custo; o fundo decide o vencedor.</span>
          </header>
          <div className="tracking-metric-grid">{acquisition.map(metric=><MetricCard key={metric.key} metric={metric} compact/>)}</div>
        </section>

        <AdPerformanceTable items={summary.ad_performance} metaStatus={summary.meta_ads_status} metaNote={summary.meta_ads_note}/>

        <LeadRecoveryTable items={summary.lead_recovery}/>

        <ActivationProgress progress={summary.activation_progress}/>

        <section className="tracking-dual-grid">
          <ConversionTable breakdown={summary.conversions_by_angle}/>
          <ConversionTable breakdown={summary.conversions_by_quiz_profile}/>
        </section>

        <QuizQuestions questions={summary.quiz_questions}/>

        <section className="tracking-section">
          <header className="tracking-section__header">
            <div><span className="tracking-eyebrow"><Target size={15}/> PRODUTO</span><h2>Conversão interna</h2></div>
            <span>Conta gratuita → demonstração → checkout → compra → ativação.</span>
          </header>
          <div className="tracking-metric-grid">{internal.map(metric=><MetricCard key={metric.key} metric={metric} compact/>)}</div>
        </section>

        <section className="tracking-secondary-grid">
          <Ranking breakdown={summary.onboarding_issues}/>
          <Donut breakdown={summary.subscriptions_by_payment_method}/>
          <Donut breakdown={summary.subscriptions_by_plan}/>
        </section>

        <TrendChart series={summary.series}/>

        <section className="tracking-bottom-grid">
          <Ranking breakdown={summary.subscriptions_by_placement} eyebrow="ATRIBUIÇÃO"/>
          <section className="tracking-card tracking-future">
            <header className="tracking-card__header">
              <div><span className="tracking-eyebrow">HISTÓRICO</span><h2>Indicadores que amadurecem com recorrência</h2></div>
              <span className="tracking-card__hint">Sem números inventados</span>
            </header>
            <div className="tracking-future__grid">
              {summary.future_metrics.map(metric=><MetricCard key={metric.key} metric={metric} compact/>)}
            </div>
          </section>
        </section>

        <footer className="tracking-footer">
          <span>Atualizado em {new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(summary.generated_at))}</span>
          <span>Ativação = pagamento confirmado + WhatsApp conectado (registro histórico). Não comprova atendimento realizado. Receita líquida = recebimentos − reembolsos confirmados.</span>
        </footer>
      </>}
    </main>
  </>
}
