import type { WhatsAppConnection } from './types'

export type EmbeddedSignupPhase = 'idle' | 'opening' | 'waiting' | 'processing' | 'success' | 'error'

export type EmbeddedSignupObservation = {
  stage: 'sdk_ready' | 'login_opened' | 'login_callback_received'
    | 'wa_session_event_received' | 'intermediate_step_received'
    | 'page_hidden' | 'page_visible' | 'window_focus' | 'pageshow'
    | 'popup_closed' | 'embedded_signup_ready_to_complete'
    | 'complete_request_started' | 'complete_request_succeeded'
    | 'complete_request_failed' | 'timeout'
  authorization_code_received?: boolean
  waba_id_received?: boolean
  phone_number_id_received?: boolean
  intermediate_step_received?: boolean
}

type EmbeddedSignupHooks = {
  attemptKey?: string
  onObservation?: (observation: EmbeddedSignupObservation) => void
  onResumeRequired?: () => void
}

export type EmbeddedSignupConfiguration = {
  app_id: string
  configuration_id: string
  graph_version: string
  embedded_signup_version: string
  mode: 'coexistence'
}

export type EmbeddedSignupResult = {
  authorization_code: string
  waba_id: string
  phone_number_id?: string
}

type FacebookLoginResponse = {
  authResponse?: { code?: string }
}

type FacebookSdk = {
  init(configuration: {appId:string; cookie:false; xfbml:false; version:string}): void
  login(
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ): void
}

type EmbeddedSignupWindow = Window & {
  FB?: FacebookSdk
  fbAsyncInit?: () => void
  console?: Pick<Console, 'info'>
}

let activeAttempt: {
  key?: string
  resume: () => boolean
  cancel: () => void
} | null = null

export function resumeMetaEmbeddedSignup(attemptKey?: string) {
  if (!activeAttempt || activeAttempt.key !== attemptKey) return false
  return activeAttempt.resume()
}

export function cancelMetaEmbeddedSignup(attemptKey?: string) {
  if (!activeAttempt || activeAttempt.key !== attemptKey) return false
  activeAttempt.cancel()
  return true
}

export class EmbeddedSignupCancelledError extends Error {
  constructor() {
    super('Conexão cancelada. Você pode tentar novamente quando quiser.')
    this.name = 'EmbeddedSignupCancelledError'
  }
}

export class EmbeddedSignupError extends Error {
  constructor() {
    super('Não foi possível concluir a conexão. Tente novamente.')
    this.name = 'EmbeddedSignupError'
  }
}

export function canStartEmbeddedSignup(
  accessMode: 'free' | 'paid' | undefined,
  role: 'owner' | 'admin' | 'attendant' | 'viewer' | undefined,
) {
  return accessMode === 'paid' && (role === 'owner' || role === 'admin')
}

export function launchMetaEmbeddedSignup(
  configuration: EmbeddedSignupConfiguration,
  runtime: EmbeddedSignupWindow = window,
  hooks: EmbeddedSignupHooks = {},
): Promise<EmbeddedSignupResult> {
  validateConfiguration(configuration)
  if (runtime.FB) {
    initializeSdk(runtime.FB, configuration, runtime, hooks.onObservation)
    return openEmbeddedSignup(runtime.FB, configuration, runtime, hooks)
  }
  return prepareMetaEmbeddedSignup(configuration, runtime, hooks.onObservation).then(
    sdk => openEmbeddedSignup(sdk, configuration, runtime, hooks),
  )
}

function openEmbeddedSignup(
  sdk: FacebookSdk,
  configuration: EmbeddedSignupConfiguration,
  runtime: EmbeddedSignupWindow,
  hooks: EmbeddedSignupHooks,
): Promise<EmbeddedSignupResult> {
  return new Promise((resolve, reject) => {
    let authorizationCode: string | null = null
    let assets: {waba_id:string; phone_number_id?:string} | null = null
    let settled = false
    let loginInProgress = false
    let loginGeneration = 0
    let emptyCallbackReceived = false
    let pageWasHidden = false
    let returnedToApp = false
    let resumeNotified = false
    let popupWindow: Window | null = null
    let popupPoll: number | null = null

    const observe = (
      stage: EmbeddedSignupObservation['stage'],
      fields: Omit<EmbeddedSignupObservation, 'stage'> = {},
    ) => traceMetaSignup(runtime, stage, fields, hooks.onObservation)

    const timeout = runtime.setTimeout(() => {
      observe('timeout')
      finish(new EmbeddedSignupError())
    }, 120_000)

    const stopPopupWatch = () => {
      if (popupPoll !== null) {
        runtime.clearInterval(popupPoll)
        popupPoll = null
      }
    }
    const cleanup = () => {
      runtime.clearTimeout(timeout)
      runtime.removeEventListener('message', sessionListener)
      runtime.removeEventListener('pagehide', pageHideListener)
      runtime.removeEventListener('pageshow', pageShowListener)
      runtime.removeEventListener('focus', focusListener)
      runtime.document.removeEventListener?.('visibilitychange', visibilityListener)
      stopPopupWatch()
      if (activeAttempt?.resume === resumeLogin) activeAttempt = null
    }
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (error) reject(error)
      else if (authorizationCode && assets) resolve({authorization_code:authorizationCode, ...assets})
      else reject(new EmbeddedSignupError())
    }
    const maybeFinish = () => {
      if (authorizationCode && assets) {
        observe('embedded_signup_ready_to_complete', {
          authorization_code_received: true,
          waba_id_received: true,
          phone_number_id_received: assets.phone_number_id !== undefined,
        })
        finish()
      }
    }
    const notifyResume = () => {
      if (settled || loginInProgress || resumeNotified || !returnedToApp) return
      resumeNotified = true
      hooks.onResumeRequired?.()
    }
    function pageHideListener() {
      pageWasHidden = true
      observe('page_hidden')
    }
    function pageShowListener() {
      returnedToApp = true
      loginInProgress = false
      observe('pageshow')
      notifyResume()
    }
    function focusListener() {
      if (popupWindow && !popupWindow.closed) {
        observe('window_focus')
        return
      }
      if (pageWasHidden || emptyCallbackReceived || authorizationCode || assets) {
        returnedToApp = true
        loginInProgress = false
      }
      observe('window_focus')
      notifyResume()
    }
    function visibilityListener() {
      if (runtime.document.visibilityState === 'hidden') {
        pageWasHidden = true
        observe('page_hidden')
        return
      }
      returnedToApp = pageWasHidden || returnedToApp
      if (returnedToApp) loginInProgress = false
      observe('page_visible')
      notifyResume()
    }
    function sessionListener(event: MessageEvent) {
      const originHostname = trustedMetaOriginHostname(event.origin)
      if (!originHostname) return
      const payload = parseSessionMessage(event.data)
      if (!payload) return
      const wabaId = numericMetaId(payload.data?.waba_id)
      const phoneNumberId = optionalNumericMetaId(payload.data?.phone_number_id)
      const hasCurrentStep = payload.data?.current_step !== undefined
      observe('wa_session_event_received', {
        waba_id_received: wabaId !== null,
        phone_number_id_received: phoneNumberId !== undefined,
        intermediate_step_received: hasCurrentStep,
      })
      if (payload.event === 'CANCEL') {
        finish(new EmbeddedSignupCancelledError())
        return
      }
      if (payload.event === 'ERROR') {
        finish(new EmbeddedSignupError())
        return
      }
      if (hasCurrentStep) {
        observe('intermediate_step_received', {intermediate_step_received:true})
        return
      }
      // The current Meta sample treats WA_EMBEDDED_SIGNUP SessionInfo as
      // complete based on its assets, not on a closed list of event names.
      // Messages that only describe an intermediate current_step remain open.
      if (!wabaId) return
      assets ??= {waba_id:wabaId, ...(phoneNumberId ? {phone_number_id:phoneNumberId} : {})}
      maybeFinish()
    }

    runtime.addEventListener('message', sessionListener)
    runtime.addEventListener('pagehide', pageHideListener)
    runtime.addEventListener('pageshow', pageShowListener)
    runtime.addEventListener('focus', focusListener)
    runtime.document.addEventListener?.('visibilitychange', visibilityListener)

    const loginOptions = {
        config_id: configuration.configuration_id,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: '3',
          version: configuration.embedded_signup_version,
          featureType: 'whatsapp_business_app_onboarding',
        },
      }
    const requestLogin = (resume: boolean) => {
      if (settled || loginInProgress) return false
      loginInProgress = true
      const generation = ++loginGeneration
      resumeNotified = false
      returnedToApp = false
      const originalWindowOpen = typeof runtime.open === 'function'
        ? runtime.open.bind(runtime)
        : null
      if (originalWindowOpen) {
        runtime.open = ((url?: string | URL, target?: string, features?: string) => {
          const popup = originalWindowOpen(url, target, features)
          if (popup) popupWindow = popup
          return popup
        }) as typeof runtime.open
      }
      try {
        observe('login_opened')
        sdk.login((response) => {
          if (settled || generation !== loginGeneration) return
          loginInProgress = false
          const code = response.authResponse?.code?.trim()
          observe('login_callback_received', {
            authorization_code_received: Boolean(code),
          })
          if (!code) {
            // The SDK callback is single-shot. Mobile/PWA can return it empty
            // after switching apps, so the same attempt remains resumable.
            emptyCallbackReceived = true
            notifyResume()
            return
          }
          authorizationCode ??= code
          emptyCallbackReceived = false
          maybeFinish()
        }, loginOptions)
      } catch {
        loginInProgress = false
        if (resume) {
          returnedToApp = true
          notifyResume()
          return false
        }
        finish(new EmbeddedSignupError())
        return false
      } finally {
        if (originalWindowOpen) runtime.open = originalWindowOpen as typeof runtime.open
      }
      return true
    }

    function resumeLogin() {
      return requestLogin(true)
    }
    activeAttempt = {
      key: hooks.attemptKey,
      resume: resumeLogin,
      cancel: () => finish(new EmbeddedSignupCancelledError()),
    }
    requestLogin(false)

    if (settled || !popupWindow) return
    popupPoll = runtime.setInterval(() => {
      if (settled) return
      if (popupWindow?.closed) {
        returnedToApp = true
        loginInProgress = false
        observe('popup_closed')
        stopPopupWatch()
        notifyResume()
      }
    }, 500)
  })
}

export async function prepareMetaEmbeddedSignup(
  configuration: EmbeddedSignupConfiguration,
  runtime: EmbeddedSignupWindow = window,
  observer?: (observation: EmbeddedSignupObservation) => void,
): Promise<FacebookSdk> {
  validateConfiguration(configuration)
  const sdk = await loadFacebookSdk(runtime)
  initializeSdk(sdk, configuration, runtime, observer)
  return sdk
}

function initializeSdk(
  sdk: FacebookSdk,
  configuration: EmbeddedSignupConfiguration,
  runtime: EmbeddedSignupWindow,
  observer?: (observation: EmbeddedSignupObservation) => void,
) {
  sdk.init({
    appId: configuration.app_id,
    cookie: false,
    xfbml: false,
    version: configuration.graph_version,
  })
  traceMetaSignup(runtime, 'sdk_ready', {}, observer)
}

function validateConfiguration(configuration: EmbeddedSignupConfiguration) {
  if (!/^\d{1,32}$/.test(configuration.app_id)
      || !/^\d{1,32}$/.test(configuration.configuration_id)
      || !/^v\d{1,3}\.\d{1,3}$/.test(configuration.graph_version)
      || !/^v(?:2|3|4)(?:-public-preview)?$/.test(configuration.embedded_signup_version)
      || configuration.mode !== 'coexistence') {
    throw new EmbeddedSignupError()
  }
}

export function createEmbeddedSignupRunner(dependencies: {
  start: () => EmbeddedSignupConfiguration | Promise<EmbeddedSignupConfiguration>
  launch: (configuration: EmbeddedSignupConfiguration) => Promise<EmbeddedSignupResult>
  complete: (result: EmbeddedSignupResult) => Promise<WhatsAppConnection>
  onPhase: (phase: EmbeddedSignupPhase, error?: Error) => void
  onConnected: (connection: WhatsAppConnection) => Promise<void>
  onObservation?: (observation: EmbeddedSignupObservation) => void
}) {
  let inFlight: Promise<WhatsAppConnection> | null = null
  return () => {
    if (inFlight) return inFlight
    const execute = async () => {
      dependencies.onPhase('opening')
      const started = dependencies.start()
      const configuration = started instanceof Promise ? await started : started
      const launched = dependencies.launch(configuration)
      const result = await launched
      dependencies.onPhase('processing')
      dependencies.onObservation?.({stage:'complete_request_started'})
      let connection: WhatsAppConnection
      try {
        connection = await dependencies.complete(result)
      } catch (error) {
        dependencies.onObservation?.({stage:'complete_request_failed'})
        throw error
      }
      dependencies.onObservation?.({stage:'complete_request_succeeded'})
      await dependencies.onConnected(connection)
      dependencies.onPhase('success')
      return connection
    }
    inFlight = execute().catch((error: unknown) => {
      const safeError = error instanceof EmbeddedSignupCancelledError
        ? error
        : new EmbeddedSignupError()
      dependencies.onPhase('error', safeError)
      throw safeError
    }).finally(() => { inFlight = null })
    return inFlight
  }
}

function parseSessionMessage(value: unknown): {type?:string; event?:string; data?:Record<string,unknown>} | null {
  try {
    const payload = typeof value === 'string' ? JSON.parse(value) : value
    if (!payload || typeof payload !== 'object') return null
    const typed = payload as {type?:unknown; event?:unknown; data?:unknown}
    if (typed.type !== 'WA_EMBEDDED_SIGNUP') return null
    return {
      type: typed.type,
      event: typeof typed.event === 'string' ? typed.event : undefined,
      data: typed.data && typeof typed.data === 'object' ? typed.data as Record<string,unknown> : undefined,
    }
  } catch {
    return null
  }
}

export function trustedMetaOriginHostname(origin: string): string | null {
  try {
    const url = new URL(origin)
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
    if (url.protocol !== 'https:'
        || (url.port && url.port !== '443')
        || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash) return null
    if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com')) {
      return hostname
    }
  } catch {
    return null
  }
  return null
}

function traceMetaSignup(
  runtime: EmbeddedSignupWindow,
  stage: EmbeddedSignupObservation['stage'],
  fields: Omit<EmbeddedSignupObservation, 'stage'> = {},
  observer?: (observation: EmbeddedSignupObservation) => void,
) {
  try {
    runtime.console?.info('meta_embedded_signup', {stage, ...fields})
  } catch {
    // Diagnostics must never interfere with onboarding.
  }
  try {
    observer?.({stage, ...fields})
  } catch {
    // Diagnostics must never interfere with onboarding.
  }
}

function numericMetaId(value: unknown): string | null {
  return typeof value === 'string' && /^\d{1,32}$/.test(value) ? value : null
}

function optionalNumericMetaId(value: unknown): string | undefined {
  return value === undefined ? undefined : numericMetaId(value) ?? undefined
}

function loadFacebookSdk(runtime: EmbeddedSignupWindow): Promise<FacebookSdk> {
  if (runtime.FB) return Promise.resolve(runtime.FB)
  return new Promise((resolve, reject) => {
    const existing = runtime.document.getElementById('facebook-jssdk') as HTMLScriptElement | null
    const timeout = runtime.setTimeout(() => reject(new EmbeddedSignupError()), 15_000)
    const ready = () => {
      runtime.clearTimeout(timeout)
      if (runtime.FB) resolve(runtime.FB)
      else reject(new EmbeddedSignupError())
    }
    runtime.fbAsyncInit = ready
    if (existing) {
      existing.addEventListener('load', ready, {once:true})
      existing.addEventListener('error', () => reject(new EmbeddedSignupError()), {once:true})
      return
    }
    const script = runtime.document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    script.addEventListener('error', () => reject(new EmbeddedSignupError()), {once:true})
    runtime.document.head.appendChild(script)
  })
}
