import type { WhatsAppConnection } from './types'

export type EmbeddedSignupPhase = 'idle' | 'opening' | 'processing' | 'success' | 'error'

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
): Promise<EmbeddedSignupResult> {
  validateConfiguration(configuration)
  if (runtime.FB) {
    initializeSdk(runtime.FB, configuration)
    return openEmbeddedSignup(runtime.FB, configuration, runtime)
  }
  return prepareMetaEmbeddedSignup(configuration, runtime).then(
    sdk => openEmbeddedSignup(sdk, configuration, runtime),
  )
}

function openEmbeddedSignup(
  sdk: FacebookSdk,
  configuration: EmbeddedSignupConfiguration,
  runtime: EmbeddedSignupWindow,
): Promise<EmbeddedSignupResult> {
  return new Promise((resolve, reject) => {
    let authorizationCode: string | null = null
    let assets: {waba_id:string; phone_number_id?:string} | null = null
    let settled = false
    let popupWindow: Window | null = null
    let popupPoll: number | null = null
    let popupCloseGrace: number | null = null
    let loginReturnedWithoutCode = false

    const timeout = runtime.setTimeout(() => finish(new EmbeddedSignupError()), 120_000)

    const stopPopupWatch = () => {
      if (popupPoll !== null) {
        runtime.clearInterval(popupPoll)
        popupPoll = null
      }
      if (popupCloseGrace !== null) {
        runtime.clearTimeout(popupCloseGrace)
        popupCloseGrace = null
      }
    }
    const cleanup = () => {
      runtime.clearTimeout(timeout)
      runtime.removeEventListener('message', sessionListener)
      stopPopupWatch()
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
      if (authorizationCode && assets) finish()
    }
    const schedulePopupClosedResolution = () => {
      if (settled || popupCloseGrace !== null) return
      popupCloseGrace = runtime.setTimeout(() => {
        popupCloseGrace = null
        if (settled) return
        if (authorizationCode && assets) {
          finish()
          return
        }
        finish(loginReturnedWithoutCode
          ? new EmbeddedSignupCancelledError()
          : new EmbeddedSignupError())
      }, 1_500)
    }
    function sessionListener(event: MessageEvent) {
      if (!META_MESSAGE_ORIGINS.has(event.origin)) return
      const payload = parseSessionMessage(event.data)
      if (!payload) return
      if (payload.event === 'CANCEL') {
        finish(new EmbeddedSignupCancelledError())
        return
      }
      if (payload.event === 'ERROR') {
        finish(new EmbeddedSignupError())
        return
      }
      if (!payload.event || !META_SUCCESS_EVENTS.has(payload.event)) return
      const wabaId = numericMetaId(payload.data?.waba_id)
      const phoneNumberId = optionalNumericMetaId(payload.data?.phone_number_id)
      if (!wabaId) {
        finish(new EmbeddedSignupError())
        return
      }
      assets = {waba_id:wabaId, ...(phoneNumberId ? {phone_number_id:phoneNumberId} : {})}
      maybeFinish()
    }

    runtime.addEventListener('message', sessionListener)

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
      sdk.login((response) => {
        const code = response.authResponse?.code?.trim()
        if (!code) {
          // Mobile browsers and installed PWAs can return an empty login
          // callback while the Meta flow is still open in another tab/window.
          // Only an explicit Meta CANCEL, the popup closing, or the timeout
          // should classify the flow as cancelled/failed.
          loginReturnedWithoutCode = true
          if (popupWindow?.closed) schedulePopupClosedResolution()
          return
        }
        authorizationCode = code
        maybeFinish()
      }, {
        config_id: configuration.configuration_id,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: '3',
          version: configuration.embedded_signup_version,
          featureType: 'whatsapp_business_app_onboarding',
        },
      })
    } catch {
      finish(new EmbeddedSignupError())
    } finally {
      if (originalWindowOpen) runtime.open = originalWindowOpen as typeof runtime.open
    }

    if (settled || !popupWindow) return
    popupPoll = runtime.setInterval(() => {
      if (settled) return
      if (popupWindow?.closed) schedulePopupClosedResolution()
    }, 500)
  })
}

export async function prepareMetaEmbeddedSignup(
  configuration: EmbeddedSignupConfiguration,
  runtime: EmbeddedSignupWindow = window,
): Promise<FacebookSdk> {
  validateConfiguration(configuration)
  const sdk = await loadFacebookSdk(runtime)
  initializeSdk(sdk, configuration)
  return sdk
}

function initializeSdk(
  sdk: FacebookSdk,
  configuration: EmbeddedSignupConfiguration,
) {
  sdk.init({
    appId: configuration.app_id,
    cookie: false,
    xfbml: false,
    version: configuration.graph_version,
  })
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
      const connection = await dependencies.complete(result)
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

const META_MESSAGE_ORIGINS = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
])
const META_SUCCESS_EVENTS = new Set([
  'FINISH',
  'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
])

function parseSessionMessage(value: unknown): {type?:string; event?:string; data?:Record<string,unknown>} | null {
  try {
    const payload = typeof value === 'string' ? JSON.parse(value) : value
    if (!payload || typeof payload !== 'object') return null
    const typed = payload as {type?:unknown; event?:unknown; data?:unknown}
    if (typed.type !== 'WA_EMBEDDED_SIGNUP' || typeof typed.event !== 'string') return null
    return {
      type: typed.type,
      event: typed.event,
      data: typed.data && typeof typed.data === 'object' ? typed.data as Record<string,unknown> : undefined,
    }
  } catch {
    return null
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
