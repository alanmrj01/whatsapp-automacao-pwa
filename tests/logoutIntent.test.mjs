import assert from 'node:assert/strict'
import test from 'node:test'
import { hasPendingLogout, markPendingLogout, clearPendingLogout } from '../src/features/auth/logoutIntent.ts'

test('offline logout persists only a boolean and is cleared after confirmed revocation', () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis,'document')
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis,'location')
  let cookie = '', lastWrite = ''
  Object.defineProperty(globalThis,'document',{configurable:true,value:{
    get cookie() { return cookie },
    set cookie(value) { lastWrite = value; cookie = value.includes('Max-Age=0') ? '' : value.split(';')[0] },
  }})
  Object.defineProperty(globalThis,'location',{configurable:true,value:{protocol:'https:'}})
  try {
    assert.equal(hasPendingLogout(),false)
    markPendingLogout()
    assert.equal(hasPendingLogout(),true)
    assert.match(lastWrite,/^alovia_logout_pending=1;/)
    assert.match(lastWrite,/SameSite=Strict; Secure$/)
    assert.equal(hasPendingLogout(),true)
    clearPendingLogout()
    assert.equal(hasPendingLogout(),false)
    assert.match(lastWrite,/Max-Age=0/)
  } finally {
    if (previousDocument) Object.defineProperty(globalThis,'document',previousDocument)
    else delete globalThis.document
    if (previousLocation) Object.defineProperty(globalThis,'location',previousLocation)
    else delete globalThis.location
  }
})
