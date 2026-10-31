import { ArrowLeft, BarChart3, CircleDollarSign, Gauge, RefreshCw, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { ApiError } from '../../lib/httpClient'
import {
  getPlatformAnalytics,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsSeriesPoint,
  type AnalyticsStatus,
  type PlatformAnalyticsSummary,
} from './platformAnalytics'
import './TrackingDashboardPage.css'

const periodOptions = [
  {value:1,label:'Hoje'},
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

const seriesLabels:Record<keyof Omit<AnalyticsSeriesPoint,'date'>,string> = {
  lpv:'LPV',
  vsl:'VSL',
  accounts:'Contas',
  activations:'Ativações',
  subscriptions:'Assinaturas',
}

function labelWithMeaning(label:string) {
  const meaning=acronymTitles[label]
  return meaning ? <abbr title={meaning}>{label}</abbr> : label
}

function formatMetric(metric:AnalyticsKpi) {
  if(metric.value===null)return '—'
  if(metric.format==='currency_brl')return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(metric.value)
  if(metric.format==='percent')return `${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(metric.value)}%`
  if(metric.format==='ratio')return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(metric.value)
  return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(metric.value)
}

function MetricCard({metric,compact=false}:{metric:AnalyticsKpi;compact?:boolean}) {
  return <article className={`tracking-kpi${compact?' tracking-kpi--compact':''}${metric.status!=='ready'?' is-future':''}`}>
    <div className="tracking-kpi__heading">
      <span>{labelWithMeaning(metric.label)}</span>
      <i className={`tracking-status is-${metric.status}`}>{statusCopy[metric.status]}</i>
    </div>
    <strong>{formatMetric(metric)}</strong>
    {metric.note&&<small>{metric.note}</small>}
  </article>
}

function Funnel({summary}:{summary:PlatformAnalyticsSummary}) {
  return <section className="tracking-card tracking-funnel" aria-labelledby="tracking-funnel-title">
    <header className="tracking-card__header">
      <div>
        <span className="tracking-eyebrow"><BarChart3 size={15}/> CONVERSÃO</span>
        <h2 id="tracking-funnel-title">Funil de Conversão</h2>
      </div>
      <span className="tracking-card__hint">Volumes do período</span>
    </header>
    <div className="tracking-funnel__steps">
      {summary.funnel.map((step,index)=><article key={step.key} className={`tracking-funnel__step${step.status!=='ready'?' is-future':''}`}>
        <div className="tracking-funnel__label">{labelWithMeaning(step.label)}</div>
        <strong>{step.value===null?'—':new Intl.NumberFormat('pt-BR').format(step.value)}</strong>
        <span>{index===0?'Base':step.conversion_rate===null?'—':`${step.conversion_rate.toLocaleString('pt-BR')}%`}</span>
        {step.note&&<small>{step.note}</small>}
      </article>)}
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

function Ranking({breakdown}:{breakdown:AnalyticsBreakdown}) {
  const max=Math.max(1,...breakdown.items.map(item=>item.value))
  return <section className="tracking-card tracking-ranking">
    <header className="tracking-card__header">
      <div><span className="tracking-eyebrow"><TrendingUp size={15}/> ATRIBUIÇÃO</span><h2>{breakdown.label}</h2></div>
      <i className={`tracking-status is-${breakdown.status}`}>{statusCopy[breakdown.status]}</i>
    </header>
    {breakdown.items.length?<div className="tracking-ranking__rows">
      {breakdown.items.map(item=><div className="tracking-ranking__row" key={item.key}>
        <div><span>{item.label}</span><strong>{item.value}</strong></div>
        <div className="tracking-ranking__track"><span style={{width:`${Math.max(5,(item.value/max)*100)}%`}}/></div>
      </div>)}
    </div>:<div className="tracking-empty-block"><Gauge size={24}/><strong>Em estruturação</strong><span>{breakdown.note||'Aguardando atribuição suficiente.'}</span></div>}
  </section>
}

function TrendChart({series}:{series:AnalyticsSeriesPoint[]}) {
  const [metric,setMetric]=useState<keyof Omit<AnalyticsSeriesPoint,'date'>>('lpv')
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
        {(Object.keys(seriesLabels) as (keyof typeof seriesLabels)[]).map(key=><button key={key} type="button" className={metric===key?'is-active':''} onClick={()=>setMetric(key)}>{labelWithMeaning(seriesLabels[key])}</button>)}
      </div>
    </header>
    <div className="tracking-trend__summary"><strong>{new Intl.NumberFormat('pt-BR').format(total)}</strong><span>{labelWithMeaning(seriesLabels[metric])} no período</span></div>
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
  const [days,setDays]=useState(30)
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

  const futureByKey=useMemo(()=>new Map(summary?.future_metrics.map(metric=>[metric.key,metric])??[]),[summary])
  const readyByKey=useMemo(()=>new Map(summary?.kpis.map(metric=>[metric.key,metric])??[]),[summary])
  const headline=[
    readyByKey.get('mrr'),
    futureByKey.get('roas'),
    futureByKey.get('ad_spend'),
    readyByKey.get('revenue_received'),
    futureByKey.get('cac'),
    futureByKey.get('roi'),
    futureByKey.get('margin'),
    readyByKey.get('subscriptions'),
  ].filter((item):item is AnalyticsKpi=>!!item)

  return <>
    <AppHeader title="Indicadores" />
    <main className="tracking-dashboard">
      <section className="tracking-topbar">
        <button className="tracking-back" type="button" onClick={()=>navigate('/admin')}><ArrowLeft size={18}/> Administração</button>
        <div>
          <span className="tracking-eyebrow">ALOVIA · GROWTH</span>
          <h1>Resumo</h1>
          <p>Funil comercial, ativação e receita com dados próprios da Alovia.</p>
        </div>
        <button className="tracking-refresh" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={17}/>{loading?'Atualizando…':'Atualizar'}</button>
      </section>

      <section className="tracking-filters" aria-label="Filtros do dashboard">
        <label>Período de visualização
          <select value={days} onChange={event=>setDays(Number(event.target.value))}>
            {periodOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>Conta de anúncios
          <select disabled><option>Em estruturação</option></select>
        </label>
        <label>Fonte de tráfego
          <select disabled><option>Aguardando Meta Ads</option></select>
        </label>
        <label>Plataforma
          <select disabled><option>Qualquer</option></select>
        </label>
        <label>Produto
          <select disabled><option>Qualquer</option></select>
        </label>
      </section>

      {error&&<div className="tracking-error" role="alert"><span>{error}</span><button type="button" onClick={()=>void load()}>Tentar novamente</button></div>}

      {loading&&!summary?<div className="tracking-loading">Carregando indicadores…</div>:summary&&<>
        <section className="tracking-overview">
          <Funnel summary={summary}/>
          <div className="tracking-kpi-grid">{headline.map(metric=><MetricCard key={metric.key} metric={metric}/>)}</div>
        </section>

        <section className="tracking-secondary-grid">
          <Donut breakdown={summary.subscriptions_by_payment_method}/>
          <Ranking breakdown={summary.subscriptions_by_placement}/>
          <section className="tracking-card tracking-quick-metrics">
            <header className="tracking-card__header"><div><span className="tracking-eyebrow">PRODUTO</span><h2>Conversão interna</h2></div></header>
            {['lpv','vsl_started','accounts','activations'].map(key=>{
              const metric=readyByKey.get(key)
              return metric?<MetricCard key={key} metric={metric} compact/>:null
            })}
          </section>
        </section>

        <TrendChart series={summary.series}/>

        <section className="tracking-bottom-grid">
          <Donut breakdown={summary.subscriptions_by_plan}/>
          <section className="tracking-card tracking-future">
            <header className="tracking-card__header">
              <div><span className="tracking-eyebrow">PRÓXIMAS CAMADAS</span><h2>Indicadores já posicionados</h2></div>
              <span className="tracking-card__hint">Sem números estimados</span>
            </header>
            <div className="tracking-future__grid">
              {summary.future_metrics.filter(metric=>!['roas','ad_spend','cac','roi','margin'].includes(metric.key)).map(metric=><MetricCard key={metric.key} metric={metric} compact/>)}
            </div>
          </section>
        </section>

        <footer className="tracking-footer">
          <span>Atualizado em {new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(summary.generated_at))}</span>
          <span>Ativação operacional = conexão do WhatsApp concluída.</span>
        </footer>
      </>}
    </main>
  </>
}
