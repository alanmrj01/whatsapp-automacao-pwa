import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const netlify = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('production headers enforce a strict same-origin browser boundary', () => {
  assert.match(netlify, /Content-Security-Policy\s*=\s*"[^"]*default-src 'self'/)
  assert.match(netlify, /script-src 'self'/)
  assert.match(netlify, /connect-src 'self'/)
  assert.match(netlify, /object-src 'none'/)
  assert.match(netlify, /frame-ancestors 'none'/)
  assert.match(netlify, /base-uri 'self'/)
  assert.match(netlify, /form-action 'self'/)
  assert.match(netlify, /worker-src 'self'/)
  assert.doesNotMatch(netlify, /script-src[^"\n]*'unsafe-inline'/)
  assert.doesNotMatch(netlify, /script-src[^"\n]*'unsafe-eval'/)
})

test('transport and browser capabilities are hardened without changing app routes', () => {
  assert.match(netlify, /Strict-Transport-Security\s*=\s*"max-age=31536000"/)
  assert.match(netlify, /Permissions-Policy\s*=\s*"camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\)"/)
  assert.match(netlify, /X-Content-Type-Options\s*=\s*"nosniff"/)
  assert.match(netlify, /X-Frame-Options\s*=\s*"DENY"/)
  assert.match(netlify, /Referrer-Policy\s*=\s*"strict-origin-when-cross-origin"/)
  assert.match(netlify, /from = "\/api\/v1\/auth\/login"/)
  assert.match(netlify, /from = "\/api\/\*"/)
})

test('app shell has no inline scripts or remote asset URLs that strict CSP would block', () => {
  assert.doesNotMatch(index, /<script(?![^>]*\bsrc=)[^>]*>/i)
  assert.doesNotMatch(index, /<style\b/i)
  assert.doesNotMatch(index, /(?:src|href)=["']https?:\/\//i)
})
