type TrackContext = {
  businessId?: string | null
  userId?: string | null
  surface?: string
  path?: string
}

type TrackProperties = Record<string, string | number | boolean | null | undefined>
type TrackOnceScope = 'visitor' | 'session'

const VISITOR_KEY = 'alovia_tracking_visitor_id_v1'
const SESSION_KEY = 'alovia_tracking_session_id_v1'
const FIRST_TOUCH_KEY = 'alovia_tracking_first_touch_v1'
const SESSION_TOUCH_KEY = 'alovia_tracking_session_touch_v1'
const ONCE_PREFIX = 'alovia_tracking_once_v1:'

let visitorId: string | null = null
let sessionId: string | null = null
let firstAttribution: Record<string,string> | null = null
let sessionAttribution: Record<string,string> | null = null
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

function storedUuid(storage: Storage | undefined, key: string) {
  if (!storage) return newUuid()
  try {
    const existing = storage.getItem(key)
    if (existing) return existing
    const created = newUuid()
    storage.setItem(key, created)
    return created
  } catch {
    return newUuid()
  }
}

function ids() {
  visitorId ??= storedUuid(typeof localStorage !== 'undefined' ? localStorage : undefined, VISITOR_KEY)
  sessionId ??= storedUuid(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, SESSION_KEY)
  return {visitorId, sessionId}
}

function captureAttribution(timestampKey: 'first_touch_at' | 'session_touch_at'): Record<string,string> {
  try {
    const params = new URLSearchParams(window.location.search)
    const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid']
    const value: Record<string,string> = {}
    for (const key of keys) {
      const item = params.get(key)
      if (item) value[key] = item.slice(0,180)
    }
    if (document.referrer) value.referrer_host = new URL(document.referrer).host.slice(0,180)
    value.landing_path = window.location.pathname.slice(0,255)
    value[timestampKey] = new Date().toISOString()
    return value
  } catch {
    return {[timestampKey]:new Date().toISOString()}
  }
}

function storedAttribution(
  storage: Storage | undefined,
  key: string,
  timestampKey: 'first_touch_at' | 'session_touch_at',
) {
  if (!storage) return captureAttribution(timestampKey)
  try {
    const existing = storage.getItem(key)
    if (existing) {
      const parsed = JSON.parse(existing)
      if (parsed && typeof parsed === 'object') return parsed as Record<string,string>
    }
    const captured = captureAttribution(timestampKey)
    storage.setItem(key, JSON.stringify(captured))
    return captured
  } catch {
    return captureAttribution(timestampKey)
  }
}

function attributionProperties() {
  firstAttribution ??= storedAttribution(
    typeof localStorage !== 'undefined' ? localStorage : undefined,
    FIRST_TOUCH_KEY,
    'first_touch_at',
  )
  sessionAttribution ??= storedAttribution(
    typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
    SESSION_TOUCH_KEY,
    'session_touch_at',
  )
  return {
    ...firstAttribution,
    ...Object.fromEntries(
      Object.entries(sessionAttribution).map(([key,value]) => [`session_${key}`, value]),
    ),
    attribution_version: 2,
  }
}

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL?.trim() ?? '').replace(/\/$/,'')
}

export function trackEvent(
  eventName: string,
  properties: TrackProperties = {},
  context: TrackContext = {},
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  try {
    const identity = ids()
    const eventId = newUuid()
    const payload = {
      event_id: eventId,
      occurred_at: new Date().toISOString(),
      visitor_id: identity.visitorId,
      session_id: identity.sessionId,
      event_name: eventName,
      surface: context.surface ?? 'app',
      path: context.path ?? window.location.pathname,
      business_id: context.businessId ?? null,
      user_id: context.userId ?? null,
      referrer: document.referrer || null,
      properties: {
        event_time_ms: Date.now(),
        ...attributionProperties(),
        ...Object.fromEntries(Object.entries(properties).filter(([,value])=>value !== undefined)),
      },
    }
    return fetch(`${apiBase()}/api/v1/marketing/events`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    }).then(response => response.ok).catch(()=>false)
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
  scope: TrackOnceScope = 'visitor',
) {
  if (typeof window === 'undefined') return
  const storage = scope === 'session'
    ? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined)
    : (typeof localStorage !== 'undefined' ? localStorage : undefined)
  const marker = `${ONCE_PREFIX}${eventKey}`
  try {
    if (storage?.getItem(marker) || pendingOnce.has(marker)) return
    pendingOnce.add(marker)
    void trackEvent(eventName, properties, context).then(success => {
      pendingOnce.delete(marker)
      if (success) {
        try { storage?.setItem(marker, new Date().toISOString()) } catch { /* no-op */ }
      }
    })
  } catch {
    pendingOnce.delete(marker)
    void trackEvent(eventName, properties, context)
  }
}
