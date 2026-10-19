type TrackContext = {
  businessId?: string | null
  userId?: string | null
  surface?: string
}

type TrackProperties = Record<string, string | number | boolean | null | undefined>

let visitorId: string | null = null
let sessionId: string | null = null
let attribution: Record<string,string> | null = null

function ids() {
  visitorId ??= crypto.randomUUID()
  sessionId ??= crypto.randomUUID()
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
  if (typeof window === 'undefined' || typeof crypto === 'undefined') return
  try {
    const identity = ids()
    const payload = {
      visitor_id: identity.visitorId,
      session_id: identity.sessionId,
      event_name: eventName,
      surface: context.surface ?? 'app',
      path: window.location.pathname,
      business_id: context.businessId ?? null,
      user_id: context.userId ?? null,
      referrer: document.referrer || null,
      properties: {
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
