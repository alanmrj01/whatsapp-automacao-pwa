type TrackContext = {
  businessId?: string | null
  userId?: string | null
  surface?: string
  path?: string
}

type TrackProperties = Record<string, string | number | boolean | null | undefined>

let visitorId: string | null = null
let sessionId: string | null = null
let attribution: Record<string,string> | null = null

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

function ids() {
  visitorId ??= newUuid()
  sessionId ??= newUuid()
  return {visitorId, sessionId}
}

function firstTouch(): Record<string,string> {
  if (attribution) return attribution
  try {
    const params = new URLSearchParams(window.location.search)
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid']
    const value: Record<string,string> = {}
    for (const key of keys) {
      const item = params.get(key)
      if (item) value[key] = item.slice(0,180)
    }
    if (document.referrer) value.referrer_host = new URL(document.referrer).host.slice(0,180)
    attribution = value
    return value
  } catch {
    attribution = {}
    return attribution
  }
}

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL?.trim() ?? '').replace(/\/$/,'')
}

export function trackEvent(
  eventName: string,
  properties: TrackProperties = {},
  context: TrackContext = {},
) {
  if (typeof window === 'undefined') return
  try {
    const identity = ids()
    const payload = {
      visitor_id: identity.visitorId,
      session_id: identity.sessionId,
      event_name: eventName,
      surface: context.surface ?? 'app',
      path: context.path ?? window.location.pathname,
      business_id: context.businessId ?? null,
      user_id: context.userId ?? null,
      referrer: document.referrer || null,
      properties: {
        event_id: newUuid(),
        event_time_ms: Date.now(),
        ...firstTouch(),
        ...Object.fromEntries(Object.entries(properties).filter(([,value])=>value !== undefined)),
      },
    }
    void fetch(`${apiBase()}/api/v1/marketing/events`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    }).catch(()=>undefined)
  } catch {
    // Tracking must never interrupt the commercial/product flow.
  }
}
