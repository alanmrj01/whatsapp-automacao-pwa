import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { canConfigureWhatsApp, homeFor } from '../src/features/auth/types.ts'

test('only owner/admin can configure; platform role redirects separately', () => {
  for (const role of ['owner','admin']) assert.equal(canConfigureWhatsApp(role), true)
  for (const role of ['attendant','viewer',undefined,'super_admin']) assert.equal(canConfigureWhatsApp(role), false)
  assert.equal(homeFor({platform_role:'super_admin'}), '/admin')
  assert.equal(homeFor({platform_role:null}), '/app')
})

test('service worker uses only static precache and excludes private routes', () => {
  const config = readFileSync(new URL('../vite.config.ts', import.meta.url),'utf8')
  assert.match(config, /runtimeCaching:\s*\[\]/)
  assert.match(config, /navigateFallbackDenylist:.*api.*auth.*internal/)
  assert.match(config, /globPatterns: \['\*\*\/\*\.\{js,css,html,svg,woff2\}'\]/)
})

test('client source has no persistent token storage or internal API calls', () => {
  function sources(dir) {
    return readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory()
      ? sources(join(dir,entry.name)) : /\.[jt]sx?$/.test(entry.name) ? [join(dir,entry.name)] : [])
  }
  for (const file of sources(fileURLToPath(new URL('../src/', import.meta.url)))) {
    const content = readFileSync(file,'utf8')
    assert.doesNotMatch(content, /\b(localStorage|sessionStorage|indexedDB)\b/, file)
    assert.doesNotMatch(content, /['"`]\/internal\//, file)
  }
})
