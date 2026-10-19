type TrackContext = {
  businessId?: string | null
  userId?: string | null
  surface?: string
}

type TrackProperties = Record<string, string | number | boolean | null | undefined>

const VISITOR_KEY = 'alovia_visitor_id'
const SESSION_KEY = 'alovia_session_id'
const ATTRIBUTION_KEY = 'alovia_first_touch'

function uuid(storage: Storage, key: string) {
  let value = storage.getItem(key)
  if (!value) {
    value = crypto.randomUUID()
    storage.setItem(key, value)
  }
  return value
}

function firstTouch(): Record<string,string> {
  try {
    const stored = localStorage.getItem(ATTRIBUTION_KEY)
    if (stored) return JSON.parse(stored) as Record<string,string>
    const params = new URLSearchParams(window.location.search)
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid']
    const value: Record<string,string> = {}
    for (const key of keys) {
      const item = params.get(key)
      if (item) value[key] = item.slice(0,180)
    }
    if (document.referrer) value.referrer_host = new URL(document.referrer).host.slice(0,180)
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value))
    return value
  } catch {
    return {}
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
    const payload = {
      visitor_id: uuid(localStorage, VISITOR_KEY),
      session_id: uuid(sessionStorage, SESSION_KEY),
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
