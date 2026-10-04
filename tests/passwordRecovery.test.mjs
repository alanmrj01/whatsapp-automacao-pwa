import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('password recovery routes stay public and explicit', () => {
  const router = read('src/app/router.tsx')
  assert.match(router, /path="\/esqueci-senha"/)
  assert.match(router, /path="\/redefinir-senha"/)
  const protectedIndex = router.indexOf('<Route element={<ProtectedRoute />}>')
  assert.ok(router.indexOf('path="/esqueci-senha"') < protectedIndex)
  assert.ok(router.indexOf('path="/redefinir-senha"') < protectedIndex)
})

test('login exposes password recovery without changing signup path', () => {
  const login = read('src/features/auth/LoginPage.tsx')
  assert.match(login, /to="\/esqueci-senha"/)
  assert.match(login, /Esqueceu sua senha\?/)
  assert.match(login, /to="\/criar-conta"/)
})

test('anonymous password recovery bypasses authenticated refresh flow', () => {
  const client = read('src/lib/httpClient.ts')
  assert.match(client, /async function publicVoid/)
  assert.match(client, /forgotPassword\(email: string\)/)
  assert.match(client, /publicVoid\('\/auth\/password\/forgot'/)
  assert.match(client, /resetPassword\(resetToken: string, newPassword: string\)/)
  assert.match(client, /publicVoid\('\/auth\/password\/reset'/)
  assert.match(client, /async changePassword\(currentPassword: string, newPassword: string\)/)
  assert.match(client, /request<void>\('\/auth\/password\/change'/)
})

test('forgot password keeps account existence undisclosed', () => {
  const pages = read('src/features/auth/PasswordRecoveryPages.tsx')
  assert.match(
    pages,
    /Se existir uma conta com este e-mail, você receberá as instruções para redefinir sua senha\./,
  )
  assert.match(pages, /O link é válido por 30 minutos e pode ser usado uma única vez\./)
  assert.match(pages, /location\.hash\.replace/)
  assert.match(pages, /navigate\('\/redefinir-senha', \{replace:true\}\)/)
  assert.doesNotMatch(pages, /e-mail não cadastrado/i)
  assert.doesNotMatch(pages, /conta não existe/i)
})

test('reset and authenticated change enforce the twelve character policy in the PWA', () => {
  const pages = read('src/features/auth/PasswordRecoveryPages.tsx')
  const account = read('src/features/more/AccountPages.tsx')
  assert.match(pages, /minLength=\{12\}/)
  assert.match(pages, /password\.length < 12/)
  assert.match(account, /minLength=\{12\}/)
  assert.match(account, /newPassword\.length < 12/)
  assert.match(account, /As outras sessões da sua conta foram encerradas\./)
})
