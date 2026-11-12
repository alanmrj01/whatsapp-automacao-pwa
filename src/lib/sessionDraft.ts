const DEFAULT_DRAFT_TTL_MS = 4 * 60 * 60 * 1000

type DraftEnvelope<T> = {
  version: 1
  expiresAt: number
  value: T
}

export function readSessionDraft<T>(key:string):T|null {
  if(typeof window==='undefined')return null
  try {
    const raw=window.sessionStorage.getItem(key)
    if(!raw)return null
    const parsed=JSON.parse(raw) as DraftEnvelope<T>
    if(
      parsed?.version!==1||
      typeof parsed.expiresAt!=='number'||
      parsed.expiresAt<=Date.now()||
      parsed.value===undefined
    ){
      window.sessionStorage.removeItem(key)
      return null
    }
    return parsed.value
  } catch {
    try { window.sessionStorage.removeItem(key) } catch {}
    return null
  }
}

export function writeSessionDraft<T>(
  key:string,
  value:T,
  ttlMs=DEFAULT_DRAFT_TTL_MS,
):void {
  if(typeof window==='undefined')return
  try {
    const envelope:DraftEnvelope<T>={
      version:1,
      expiresAt:Date.now()+ttlMs,
      value,
    }
    window.sessionStorage.setItem(key,JSON.stringify(envelope))
  } catch {}
}

export function clearSessionDraft(key:string):void {
  if(typeof window==='undefined')return
  try { window.sessionStorage.removeItem(key) } catch {}
}
