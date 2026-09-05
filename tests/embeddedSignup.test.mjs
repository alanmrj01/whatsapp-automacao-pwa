import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canStartEmbeddedSignup,
  createEmbeddedSignupRunner,
  EmbeddedSignupCancelledError,
  EmbeddedSignupError,
  launchMetaEmbeddedSignup,
} from '../src/features/whatsapp/embeddedSignup.ts'

const configuration = {
  app_id: '111111111111111',
  configuration_id: '222222222222222',
  graph_version: 'v23.0',
  embedded_signup_version: 'v4',
  mode: 'coexistence',
}

function runtimeFor(login) {
  const listeners = new Set()
  const runtime = {
    FB: undefined,
    fbAsyncInit: undefined,
    setTimeout,
    clearTimeout,
    addEventListener(type, listener) { if (type === 'message') listeners.add(listener) },
    removeEventListener(type, listener) { if (type === 'message') listeners.delete(listener) },
    document: {
      getElementById() { return null },
      createElement() {
        return {
          addEventListener() {},
          id: '', async: false, defer: false, crossOrigin: '', src: '',
        }
      },
      head: {
        appendChild() {
          runtime.FB = {
            init(value) { runtime.initialized = value },
            login(callback, options) {
              runtime.loginOptions = options
              login({runtime, listeners, callback})
            },
          }
          queueMicrotask(() => runtime.fbAsyncInit())
        },
      },
    },
  }
  return runtime
}

function send(listeners, event, origin = 'https://www.facebook.com') {
  for (const listener of listeners) listener({origin, data:JSON.stringify(event)})
}

test('paid owner/admin inicia Meta; free e perfis de leitura nunca iniciam', () => {
  assert.equal(canStartEmbeddedSignup('paid', 'owner'), true)
  assert.equal(canStartEmbeddedSignup('paid', 'admin'), true)
  assert.equal(canStartEmbeddedSignup('free', 'owner'), false)
  assert.equal(canStartEmbeddedSignup('paid', 'attendant'), false)
  assert.equal(canStartEmbeddedSignup('paid', 'viewer'), false)
})

test('coexistence usa os parâmetros oficiais e combina code com sessão Meta', async () => {
  const runtime = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code:'short-lived-code'}})
    send(listeners, {
      type:'WA_EMBEDDED_SIGNUP',
      event:'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
      data:{waba_id:'333333333333333', phone_number_id:'444444444444444'},
    })
  })
  const result = await launchMetaEmbeddedSignup(configuration, runtime)
  assert.deepEqual(result, {
    authorization_code:'short-lived-code',
    waba_id:'333333333333333',
    phone_number_id:'444444444444444',
  })
  assert.deepEqual(runtime.initialized, {
    appId:configuration.app_id, cookie:false, xfbml:false, version:'v23.0',
  })
  assert.deepEqual(runtime.loginOptions, {
    config_id:configuration.configuration_id,
    response_type:'code',
    override_default_response_type:true,
    extras:{sessionInfoVersion:'3', version:'v4', featureType:'whatsapp_business_app_onboarding'},
  })
})

test('cancelamento e erro da Meta são tratados sem payload sensível', async () => {
  const cancelled = runtimeFor(({callback}) => callback({}))
  await assert.rejects(
    launchMetaEmbeddedSignup(configuration, cancelled),
    EmbeddedSignupCancelledError,
  )

  const failed = runtimeFor(({listeners, callback}) => {
    callback({authResponse:{code:'short-lived-code'}})
    send(listeners, {type:'WA_EMBEDDED_SIGNUP', event:'ERROR', data:{error_message:'private'}})
  })
  await assert.rejects(
    launchMetaEmbeddedSignup(configuration, failed),
    EmbeddedSignupError,
  )
})

test('duplo clique compartilha uma única conclusão e atualiza o status uma vez', async () => {
  let starts = 0
  let launches = 0
  let completions = 0
  let updates = 0
  const phases = []
  let release
  const gate = new Promise(resolve => { release = resolve })
  const run = createEmbeddedSignupRunner({
    async start() { starts++; await gate; return configuration },
    async launch() {
      launches++
      return {authorization_code:'code', waba_id:'333333333333333'}
    },
    async complete() {
      completions++
      return {status:'connected', mode:'coexistence', display_phone_number:'•••• 1234'}
    },
    onPhase(phase) { phases.push(phase) },
    async onConnected(connection) {
      updates++
      assert.equal(connection.status, 'connected')
    },
  })
  const first = run()
  const second = run()
  assert.equal(first, second)
  release()
  await Promise.all([first, second])
  assert.deepEqual({starts, launches, completions, updates}, {
    starts:1, launches:1, completions:1, updates:1,
  })
  assert.deepEqual(phases, ['opening', 'processing', 'success'])
})
