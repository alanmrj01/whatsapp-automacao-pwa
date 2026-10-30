import { api } from './api'

type TrackContext = {
  businessId?: string | null
  userId?: string | null
  surface?: string
  path?: string
  eventId?: string
}

type TrackProperties = Record<string, string | number | boolean | null | undefined>
type TrackOnceScope = 'visitor' | 'session'

type MetaFbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    fbq?: MetaFbq
    _fbq?: MetaFbq
  }
}

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '1432131901730735'
const META_PIXEL_HOSTS = new Set(
  (import.meta.env.VITE_META_PIXEL_PRODUCTION_HOSTS || 'alovia.netlify.app')
    .split(',')
    .map((host:string)=>host.trim().toLowerCase())
    .filter(Boolean),
)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type MetaBrowserEvent = {
  name:string
  custom:boolean
  parameters:Record<string,string|number|boolean>
}

const completedOnce = new Set<string>()
const pendingOnce = new Set<string>()

function newUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

function isMetaProductionHost() {
  return typeof window !== 'undefined'
    && META_PIXEL_HOSTS.has(window.location.hostname.toLowerCase())
    && /^\d{10,20}$/.test(META_PIXEL_ID)
}

function ensureMetaPixel(): MetaFbq | null {
  if (!isMetaProductionHost()) return null
  if (window.fbq) return window.fbq

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  }) as MetaFbq
  fbq.queue = []
  fbq.loaded = true
  fbq.version = '2.0'
  window.fbq = fbq
  window._fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  script.id = 'meta-pixel-script'
  document.head.appendChild(script)

  fbq('init', META_PIXEL_ID)
  return fbq
}

function metaBrowserEvent(
  eventName:string,
  properties:TrackProperties,
):MetaBrowserEvent|null {
  if(eventName==='page_view'){
    const routeGroup=properties.route_group
    if(!['landing','signup','checkout','plan'].includes(String(routeGroup ?? '')))return null
    return {name:'PageView',custom:false,parameters:{}}
  }
  if(eventName==='landing_vsl_started'){
    return {
      name:'VSLStarted',
      custom:true,
      parameters:{video_id:String(properties.video_id ?? '').slice(0,64)},
    }
  }
  if(eventName==='landing_vsl_progress'){
    const percent=Number(properties.percent)
    if(![25,50,75].includes(percent))return null
    return {name:'VSLProgress',custom:true,parameters:{progress_percent:percent}}
  }
  if(eventName==='landing_vsl_completed'){
    return {name:'VSLCompleted',custom:true,parameters:{progress_percent:100}}
  }
  if(eventName==='signup_completed'){
    return {
      name:'CompleteRegistration',
      custom:false,
      parameters:{content_name:'alovia_account'},
    }
  }
  if(eventName==='whatsapp_connection_completed'){
    const parameters:Record<string,string|number|boolean>={}
    if(typeof properties.mode==='string'&&properties.mode.trim()){
      parameters.connection_mode=properties.mode.trim().slice(0,64)
    }
    return {name:'WhatsAppConnected',custom:true,parameters}
  }
  if(eventName==='checkout_started'){
    const parameters:Record<string,string|number|boolean>={content_category:'saas_subscription'}
    if(typeof properties.plan==='string')parameters.content_name=properties.plan
    if(typeof properties.billing_cycle==='string')parameters.billing_cycle=properties.billing_cycle
    return {name:'InitiateCheckout',custom:false,parameters}
  }
  if(eventName==='payment_confirmed'){
    const amountCents=Number(properties.amount_cents)
    const checkoutId=typeof properties.checkout_id==='string'?properties.checkout_id:''
    if(!Number.isInteger(amountCents)||amountCents<=0||!UUID_PATTERN.test(checkoutId))return null
    const parameters:Record<string,string|number|boolean>={
      currency:'BRL',
      value:amountCents/100,
      order_id:checkoutId,
      content_type:'product',
    }
    if(typeof properties.plan==='string')parameters.content_name=properties.plan
    return {name:'Purchase',custom:false,parameters}
  }
  return null
}

function trackMetaBrowserEvent(
  eventName:string,
  eventId:string,
  properties:TrackProperties,
) {
  const mapped=metaBrowserEvent(eventName,properties)
  if(!mapped)return
  const fbq=ensureMetaPixel()
  if(!fbq)return
  fbq(
    mapped.custom?'trackSingleCustom':'trackSingle',
    META_PIXEL_ID,
    mapped.name,
    mapped.parameters,
    {eventID:eventId},
  )
}

function currentAttribution(): Record<string,string|number> {
  try {
    const params = new URLSearchParams(window.location.search)
    const keys = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'utm_id',
      'utm_source_platform',
      'utm_creative_format',
      'campaign_id',
      'adset_id',
      'ad_id',
      'placement',
      'fbclid',
      'gclid',
    ]
    const value: Record<string,string|number> = {attribution_version: 3}
    for (const key of keys) {
      const item = params.get(key)
      if (item) value[key] = item.slice(0,180)
    }
    if (document.referrer) value.referrer_host = new URL(document.referrer).host.slice(0,180)
    value.landing_path = window.location.pathname.slice(0,255)
    return value
  } catch {
    return {attribution_version: 3}
  }
}

export function trackEvent(
  eventName: string,
  properties: TrackProperties = {},
  context: TrackContext = {},
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  try {
    const eventId = context.eventId && UUID_PATTERN.test(context.eventId)
      ? context.eventId
      : newUuid()
    const payload = {
      event_id: eventId,
      occurred_at: new Date().toISOString(),
      // Visitor/session identity is assigned by the first-party backend and
      // persisted only in HttpOnly cookies. Null keeps backward compatibility
      // with the request contract while client code remains storage-free.
      visitor_id: null,
      session_id: null,
      event_name: eventName,
      surface: context.surface ?? 'app',
      path: context.path ?? window.location.pathname,
      business_id: context.businessId ?? null,
      user_id: context.userId ?? null,
      referrer: document.referrer || null,
      properties: {
        event_time_ms: Date.now(),
        ...currentAttribution(),
        ...Object.fromEntries(Object.entries(properties).filter(([,value])=>value !== undefined)),
      },
    }
    trackMetaBrowserEvent(eventName,eventId,properties)
    return api.request<{accepted:boolean}>('/marketing/events', {
      method: 'POST',
      keepalive: true,
      body: JSON.stringify(payload),
    }).then(response => response.accepted === true).catch(()=>false)
  } catch {
    // Tracking must never interrupt the commercial/product flow.
    return Promise.resolve(false)
  }
}

export function trackEventOnce(
  eventKey: string,
  eventName: string,
  properties: TrackProperties = {},
  context: TrackContext = {},
  _scope: TrackOnceScope = 'visitor',
) {
  if (typeof window === 'undefined') return
  if (completedOnce.has(eventKey) || pendingOnce.has(eventKey)) return
  pendingOnce.add(eventKey)
  void trackEvent(eventName, properties, context).then(success => {
    pendingOnce.delete(eventKey)
    if (success) completedOnce.add(eventKey)
  })
}
