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

export type AnalyticsConversionBreakdownItem = {
  key:string
  label:string
  quiz_visitors:number
  accounts:number
  subscriptions:number
  activations:number
  revenue_brl:number
}

export type AnalyticsConversionBreakdown = {
  key:string
  label:string
  status:'ready'|'awaiting_integration'|'insufficient_data'
  note:string|null
  items:AnalyticsConversionBreakdownItem[]
}

export type AnalyticsQuizAnswer = {
  answer_id:string
  profile_dimension:string
  responses:number
  share:number|null
  accounts:number
  account_conversion_rate:number|null
  subscriptions:number
  purchase_conversion_rate:number|null
}

export type AnalyticsQuizQuestion = {
  question_id:string
  label:string
  responses:number
  answers:AnalyticsQuizAnswer[]
}

export type AnalyticsAdPerformance = {
  campaign_id:string|null
  campaign_name:string|null
  adset_id:string|null
  adset_name:string|null
  ad_id:string
  ad_name:string
  spend_brl:number|null
  impressions:number|null
  reach:number|null
  link_clicks:number|null
  ctr:number|null
  cpc:number|null
  cpm:number|null
  quiz_visitors:number
  quiz_completed:number
  accounts:number
  subscriptions:number
  activations:number
  revenue_brl:number
  account_conversion_rate:number|null
  cac_brl:number|null
  roas:number|null
}

export type AnalyticsSeriesPoint = {
  date:string
  lpv:number
  vsl:number
  quiz_views:number
  quiz_completed:number
  vsl_started:number
  vsl_completed:number
  accounts:number
  demo_entries:number
  checkout_started:number
  subscriptions:number
  activations:number
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
  conversions_by_angle:AnalyticsConversionBreakdown
  conversions_by_quiz_profile:AnalyticsConversionBreakdown
  onboarding_issues:AnalyticsBreakdown
  quiz_questions:AnalyticsQuizQuestion[]
  ad_performance:AnalyticsAdPerformance[]
  meta_ads_status:'ready'|'awaiting_integration'
  meta_ads_note:string|null
  series:AnalyticsSeriesPoint[]
  future_metrics:AnalyticsKpi[]
}

export function getPlatformAnalytics(days:number) {
  return api.request<PlatformAnalyticsSummary>(`/admin/analytics/summary?days=${days}`)
}
