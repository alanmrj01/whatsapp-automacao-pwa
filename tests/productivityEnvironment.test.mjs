import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('Netlify API proxy is environment-aware and never hardcodes production backend', () => {
  const config = read('netlify.toml')
  assert.match(config, /ALOVIA_API_ORIGIN/)
  assert.match(config, /ALOVIA_API_ORIGIN_PLACEHOLDER/)
  assert.match(config, /test -n/)
  assert.match(config, /sed -i/)
  assert.doesNotMatch(config, /whatsapp-backend-186627697999\.southamerica-east1\.run\.app/)
})

test('productivity branch runs the same PWA validation workflow as main', () => {
  const workflow = read('.github/workflows/pwa-validation.yml')
  assert.match(workflow, /branches:\s*\[main, productivity\]/)
})
