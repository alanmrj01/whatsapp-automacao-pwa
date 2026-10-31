import { api } from '../../lib/api'

export type AnalyticsStatus =
  | 'ready'
  | 'structuring'
  | 'awaiting_integration'
  | 'awaiting_history'
  | 'insufficient_data'

export type AnalyticsFunnelStep = {
  key:string
  label:string
  value:number|null
  conversion_rate:number|null
  status:'ready'|'awaiting_integration'|'insufficient_data'
  note:string|null
}

export type AnalyticsKpi = {
  key:string
  label:string
  value:number|null
  format:'count'|'currency_brl'|'percent'|'ratio'
  status:AnalyticsStatus
  note:string|null
}

export type AnalyticsBreakdownItem = {
  key:string
  label:string
  value:number
}

export type AnalyticsBreakdown = {
  key:string
  label:string
  status:'ready'|'awaiting_integration'|'insufficient_data'
  note:string|null
  items:AnalyticsBreakdownItem[]
}

export type AnalyticsSeriesPoint = {
  date:string
  lpv:number
  vsl:number
  accounts:number
  activations:number
  subscriptions:number
}

export type PlatformAnalyticsSummary = {
  generated_at:string
  period_days:number
  period_start:string
  period_end:string
  funnel:AnalyticsFunnelStep[]
  kpis:AnalyticsKpi[]
  subscriptions_by_plan:AnalyticsBreakdown
  subscriptions_by_payment_method:AnalyticsBreakdown
  subscriptions_by_placement:AnalyticsBreakdown
  series:AnalyticsSeriesPoint[]
  future_metrics:AnalyticsKpi[]
}

export function getPlatformAnalytics(days:number) {
  return api.request<PlatformAnalyticsSummary>(`/admin/analytics/summary?days=${days}`)
}
