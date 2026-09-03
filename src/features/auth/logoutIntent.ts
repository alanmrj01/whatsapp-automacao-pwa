// A non-sensitive boolean, never a token or user identifier. Keeping the intent
// across reloads prevents an unrevoked HttpOnly cookie from silently signing the
// user back in after an offline logout. Only a confirmed revocation clears it.
const marker = 'atende_logout_pending'

export function hasPendingLogout(): boolean {
  return typeof document !== 'undefined' && document.cookie.split(';').some(value => value.trim() === `${marker}=1`)
}

export function markPendingLogout(): void {
  document.cookie = `${marker}=1; Path=/; Max-Age=2592000; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`
}

export function clearPendingLogout(): void {
  document.cookie = `${marker}=; Path=/; Max-Age=0; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`
}
