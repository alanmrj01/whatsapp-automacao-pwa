import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('pending logout automatically retries instead of deadlocking the app', () => {
  const provider = read('src/features/auth/AuthProvider.tsx')
  const recovery = read('src/features/auth/LogoutRecovery.tsx')
  const context = read('src/features/auth/context.ts')

  assert.match(provider, /const \[state, setState\] = useState<AuthState>\('loading'\)/)
  assert.match(provider, /logoutBlocked\.current.*retryPendingLogout\(\)/s)
  assert.match(provider, /clearPendingLogout\(\).*setState\('anonymous'\)/s)
  assert.doesNotMatch(provider, /hasPendingLogout\(\) \? 'logout_failed' : 'loading'/)
  assert.match(context, /retryPendingLogout:/)
  assert.match(context, /continueToLogin:/)
  assert.match(recovery, /Tentar novamente/)
  assert.match(recovery, /Voltar para entrar/)
  assert.doesNotMatch(recovery, /Confirme a saída/)
})

test('login and signup can recover from a stale logout marker', () => {
  const provider = read('src/features/auth/AuthProvider.tsx')
  assert.match(provider, /async function login\([^)]*\) \{\s*clearPendingLogout\(\)/s)
  assert.match(provider, /async function signup\([^)]*\) \{\s*clearPendingLogout\(\)/s)
})
