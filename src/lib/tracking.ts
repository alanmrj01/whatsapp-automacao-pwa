import { api } from './api'

type TrackContext = {
  businessId?: string | null
  userId?: string | null
  surface?: string
  path?: string
}

type TrackProperties = Record<string, string | number | boolean | null | undefined>
type TrackOnceScope = 'visitor' | 'session'

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
    const eventId = newUuid()
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
