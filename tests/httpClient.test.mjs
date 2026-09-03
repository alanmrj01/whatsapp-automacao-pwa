import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { ApiError, createApiClient } from '../src/lib/httpClient.ts'

const response = (status, body = {}) => new Response(status === 204 ? null : JSON.stringify(body), {status})
const secret = () => randomBytes(32).toString('hex')

test('login sends credentials without storage and subsequent calls use memory only', async () => {
  const token = secret(), password = secret(), calls = []
  const api = createApiClient('https://api.example.test/', async (url, options) => {
    calls.push({url, options})
    return url.endsWith('/login') ? response(200, {access_token: token}) : response(200, {ok:true})
  })
  await api.login('member@example.test', password)
  assert.deepEqual(await api.request('/me'), {ok:true})
  assert.equal(calls[0].options.headers.Authorization, undefined)
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${token}`)
  assert.equal(calls[1].url, 'https://api.example.test/api/v1/me')
  for (const call of calls) {
    assert.equal(call.options.cache, 'no-store')
    assert.equal(call.options.credentials, 'include')
    assert.equal(call.url.includes(password), false)
  }
})

test('simultaneous 401s share one refresh then retry each request once', async () => {
  const token = secret(), calls = []
  const api = createApiClient('', async (url, options) => {
    calls.push(url)
    if (url.endsWith('/refresh')) return response(200, {access_token: token})
    return options.headers.Authorization ? response(200, {ok:true}) : response(401)
  })
  assert.deepEqual(await Promise.all([api.request('/me'), api.request('/whatsapp/connection')]), [{ok:true},{ok:true}])
  assert.equal(calls.filter(url => url.endsWith('/refresh')).length, 1)
  assert.equal(calls.length, 5)
})

test('refresh failure expires session without retry loops', async () => {
  let calls = 0, expired = 0
  const api = createApiClient('', async () => { calls++; return response(401) })
  api.onExpired(() => expired++)
  await assert.rejects(api.request('/me'), error => error instanceof ApiError && error.status === 401)
  assert.equal(calls, 2)
  assert.equal(expired, 1)
})

test('second 401 expires session with exactly one refresh', async () => {
  let calls = 0, expired = 0
  const api = createApiClient('', async url => {
    calls++
    return url.endsWith('/refresh') ? response(200, {access_token:secret()}) : response(401)
  })
  api.onExpired(() => expired++)
  await assert.rejects(api.request('/me'), {status:401})
  assert.equal(calls, 3)
  assert.equal(expired, 1)
})

test('late login cannot restore cleared session', async () => {
  let finish
  const api = createApiClient('', () => new Promise(resolve => { finish = resolve }))
  const login = api.login('member@example.test', secret())
  api.clear()
  finish(response(200, {access_token:secret()}))
  await assert.rejects(login, {status:401})
})

test('late unauthorized response after clear cannot start a refresh', async () => {
  let finish, calls = 0
  const api = createApiClient('', () => { calls++; return new Promise(resolve => { finish = resolve }) })
  const pending = api.request('/me')
  api.clear()
  finish(response(401))
  await assert.rejects(pending, {status:401})
  assert.equal(calls, 1)
})

test('logout revokes remotely and clears local bearer', async () => {
  const calls = []
  const api = createApiClient('', async (url, options) => {
    calls.push({url, options})
    if (url.endsWith('/login')) return response(200, {access_token:secret()})
    return response(204)
  })
  await api.login('member@example.test', secret())
  await api.logout()
  await assert.rejects(api.request('/me'), {status:401})
  assert.equal(calls[1].url, '/api/v1/auth/logout')
  assert.equal(calls.length, 2)
})

test('malformed responses and network errors never expose server details', async () => {
  const sensitive = secret()
  for (const fetcher of [
    async () => new Response(sensitive, {status:500}),
    async () => new Response(sensitive, {status:200}),
    async () => { throw new Error(sensitive) },
  ]) {
    await assert.rejects(createApiClient('', fetcher).request('/me'), error =>
      error instanceof ApiError && !String(error).includes(sensitive))
  }
  await assert.rejects(createApiClient('', async () => response(200, {})).refresh(), {status:502})
})

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return {promise, resolve, reject}
}

test('logout invalidates immediately while server response is still pending', async () => {
  const pending = deferred()
  let calls = 0
  const api = createApiClient('', async url => {
    calls++
    return url.endsWith('/login') ? response(200, {access_token:secret()}) : pending.promise
  })
  await api.login('member@example.test', secret())
  const leaving = api.logout()
  await assert.rejects(api.request('/me'), {status:401})
  await assert.rejects(api.refresh(), {status:401})
  await assert.rejects(api.login('member@example.test', secret()), {status:401})
  pending.resolve(response(204))
  await leaving
  assert.equal(calls, 2)
})

test('network failure on logout keeps all private calls blocked until explicit login', async () => {
  const calls = []
  const api = createApiClient('', async url => {
    calls.push(url)
    if (url.endsWith('/logout')) throw new TypeError('offline')
    if (url.endsWith('/login')) return response(200, {access_token:secret()})
    return response(200, {ok:true})
  })
  await api.login('member@example.test', secret())
  await assert.rejects(api.logout(), {status:0})
  await assert.rejects(api.request('/me'), {status:401})
  await assert.rejects(api.refresh(), {status:401})
  assert.equal(calls.length, 2)
  await api.login('member@example.test', secret())
  assert.deepEqual(await api.request('/me'), {ok:true})
})

for (const operation of ['login', 'refresh']) {
  test(`late ${operation} cannot reauthenticate after logout; latest cookie is revoked afterwards`, async () => {
    const pending = deferred(), calls = []
    let expired = 0
    const api = createApiClient('', async url => {
      calls.push(url)
      return url.endsWith('/logout') ? response(204) : pending.promise
    })
    api.onExpired(() => expired++)
    const authenticating = operation === 'login' ? api.login('member@example.test', secret()) : api.refresh()
    const rejected = assert.rejects(authenticating, {status:401})
    const leaving = api.logout()
    await assert.rejects(api.request('/me'), {status:401})
    pending.resolve(response(200, {access_token:secret()}))
    await Promise.all([rejected, leaving])
    assert.deepEqual(calls, [`/api/v1/auth/${operation}`, '/api/v1/auth/logout'])
    assert.equal(expired, 0) // stale failure cannot overwrite logout recovery UI
    await assert.rejects(api.refresh(), {status:401})
  })
}

test('late me body cannot return private data after logout', async () => {
  const pending = deferred()
  const api = createApiClient('', async url => url.endsWith('/logout') ? response(204) :
    {ok:true, status:200, json:() => pending.promise})
  const me = api.request('/me')
  const rejected = assert.rejects(me, {status:401})
  await api.logout()
  pending.resolve({id:'stale-user'})
  await rejected
})

test('concurrent bootstraps share one refresh; logout blocks all late results', async () => {
  const pending = deferred()
  let refreshCalls = 0
  const api = createApiClient('', async url => {
    if (url.endsWith('/logout')) return response(204)
    refreshCalls++
    return pending.promise
  })
  const first = assert.rejects(api.refresh(), {status:401})
  const second = assert.rejects(api.refresh(), {status:401})
  const leaving = api.logout()
  pending.resolve(response(200, {access_token:secret()}))
  await Promise.all([first, second, leaving])
  assert.equal(refreshCalls, 1)
})

test('failed refresh by network clears session and does not retry', async () => {
  let calls = 0, expired = 0
  const api = createApiClient('', async url => {
    calls++
    if (url.endsWith('/refresh')) throw new Error('offline')
    return response(401)
  })
  api.onExpired(() => expired++)
  await assert.rejects(api.request('/me'), {status:0})
  await assert.rejects(api.request('/me'), {status:401})
  assert.equal(calls, 2)
  assert.equal(expired, 1)
})
