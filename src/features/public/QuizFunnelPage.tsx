import { ArrowLeft, ArrowRight, CheckCircle2, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { trackEvent, trackEventOnce } from '../../lib/tracking'
import { homeFor } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import '../../styles/quiz-funnel.css'

type ProfileId = 'service_first' | 'multitask' | 'at_risk'
type QuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5'
type AnswerId = 'A' | 'B' | 'C'

type QuizOption = {
  id: AnswerId
  label: string
  dimension: ProfileId
}

type QuizQuestion = {
  id: QuestionId
  prompt: string
  weight: number
  options: QuizOption[]
}

type QuizProfile = {
  id: ProfileId
  title: string
  body: string[]
  nudge: string
}

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    weight: 2,
    prompt: 'Enquanto você está instalando ou fazendo manutenção, quem atende o cliente que chama no WhatsApp?',
    options: [
      { id: 'A', label: 'O cliente espera eu conseguir responder.', dimension: 'service_first' },
      { id: 'B', label: 'Eu paro o serviço para responder.', dimension: 'multitask' },
      { id: 'C', label: 'Às vezes respondo e o cliente some.', dimension: 'at_risk' },
    ],
  },
  {
    id: 'q2',
    weight: 1,
    prompt: 'Nos dias corridos, o que mais acontece com seu WhatsApp?',
    options: [
      { id: 'A', label: 'As mensagens vão acumulando.', dimension: 'service_first' },
      { id: 'B', label: 'Paro várias vezes para responder.', dimension: 'multitask' },
      { id: 'C', label: 'Alguns clientes somem antes da resposta.', dimension: 'at_risk' },
    ],
  },
  {
    id: 'q3',
    weight: 1,
    prompt: 'Quando um cliente chama durante um serviço, o que você costuma fazer?',
    options: [
      { id: 'A', label: 'Deixo para responder depois.', dimension: 'service_first' },
      { id: 'B', label: 'Paro o que estou fazendo.', dimension: 'multitask' },
      { id: 'C', label: 'Respondo quando dá, mesmo com demora.', dimension: 'at_risk' },
    ],
  },
  {
    id: 'q4',
    weight: 1,
    prompt: 'Hoje, quanto o atendimento da empresa depende de você?',
    options: [
      { id: 'A', label: 'Quase tudo depende de mim.', dimension: 'service_first' },
      { id: 'B', label: 'Eu ainda preciso interromper muito meu trabalho.', dimension: 'multitask' },
      { id: 'C', label: 'Quando aperta, algumas conversas ficam para trás.', dimension: 'at_risk' },
    ],
  },
  {
    id: 'q5',
    weight: 2,
    prompt: 'No fim de um dia cheio, o que mais incomoda?',
    options: [
      { id: 'A', label: 'Ver clientes que ficaram esperando resposta.', dimension: 'service_first' },
      { id: 'B', label: 'Ter parado o serviço várias vezes para atender.', dimension: 'multitask' },
      { id: 'C', label: 'Pensar que algum cliente pode ter fechado com outra empresa.', dimension: 'at_risk' },
    ],
  },
]

const profiles: Record<ProfileId, QuizProfile> = {
  service_first: {
    id: 'service_first',
    title: 'Serviço em primeiro lugar',
    body: [
      'Quando você está no serviço, o atendimento acaba esperando você ficar disponível.',
      'O problema não é falta de atenção com o cliente. É que hoje o WhatsApp depende de você conseguir parar.',
    ],
    nudge: 'Talvez o atendimento da sua empresa não precise esperar você terminar o serviço.',
  },
  multitask: {
    id: 'multitask',
    title: 'Multitarefa',
    body: [
      'Você tenta responder rápido, mas isso significa dividir sua atenção entre o serviço e o WhatsApp.',
      'O cliente é atendido, mas muitas vezes porque você precisa parar o que estava fazendo.',
    ],
    nudge: 'Se o atendimento pudesse continuar sozinho, você não precisaria escolher entre responder e trabalhar.',
  },
  at_risk: {
    id: 'at_risk',
    title: 'Atendimento no Limite',
    body: [
      'Quando o movimento aumenta, algumas respostas demoram mais do que deveriam.',
      'E enquanto você está ocupado, o cliente pode continuar procurando até fechar com outra empresa.',
    ],
    nudge: 'Talvez responder no tempo do cliente não precise depender de você estar com o celular na mão.',
  },
}

const dimensionByAnswer: Record<AnswerId, ProfileId> = {
  A: 'service_first',
  B: 'multitask',
  C: 'at_risk',
}

function resolveProfile(answers: Partial<Record<QuestionId, AnswerId>>): QuizProfile {
  const scores: Record<ProfileId, number> = { service_first: 0, multitask: 0, at_risk: 0 }
  for (const question of questions) {
    const answer = answers[question.id]
    if (!answer) continue
    scores[dimensionByAnswer[answer]] += question.weight
  }

  const max = Math.max(...Object.values(scores))
  const tied = (Object.keys(scores) as ProfileId[]).filter(profile => scores[profile] === max)
  if (tied.length === 1) return profiles[tied[0]]

  for (const tieBreaker of ['q5', 'q1'] as const) {
    const answer = answers[tieBreaker]
    if (!answer) continue
    const dimension = dimensionByAnswer[answer]
    if (tied.includes(dimension)) return profiles[dimension]
  }

  return profiles[tied[0] ?? 'service_first']
}

type VimeoPlaybackData = { seconds: number; duration: number; percent: number }
type VimeoPlayerInstance = {
  on: (event: 'play' | 'timeupdate' | 'ended', callback: (data: VimeoPlaybackData) => void) => void
  off: (event: 'play' | 'timeupdate' | 'ended', callback: (data: VimeoPlaybackData) => void) => void
}
type VimeoConstructor = new (element: HTMLIFrameElement) => VimeoPlayerInstance
type VimeoWindow = Window & { Vimeo?: { Player: VimeoConstructor } }

let vimeoSdkPromise: Promise<VimeoConstructor> | null = null

function WhatsAppLogo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16 3C8.82 3 3 8.64 3 15.6c0 2.45.73 4.84 2.11 6.9L3.73 29l6.71-1.76A13.2 13.2 0 0 0 16 28.47c7.18 0 13-5.64 13-12.6C29 8.64 23.18 3 16 3Z"
      />
      <path
        fill="#fff"
        d="M23.23 19.03c-.4-.2-2.35-1.15-2.71-1.28-.36-.13-.63-.2-.89.2-.27.39-1.03 1.28-1.26 1.54-.23.27-.46.3-.86.1-.4-.2-1.68-.61-3.19-1.94-1.18-1.04-1.98-2.32-2.21-2.72-.23-.4-.02-.61.18-.81.18-.18.4-.46.59-.69.2-.23.27-.4.4-.66.13-.27.07-.5-.03-.7-.1-.2-.89-2.14-1.22-2.93-.32-.78-.65-.67-.89-.68h-.76c-.27 0-.7.1-1.06.5-.36.39-1.39 1.35-1.39 3.3 0 1.95 1.42 3.83 1.62 4.1.2.26 2.8 4.23 6.78 5.93.95.41 1.68.65 2.26.83.95.3 1.81.26 2.5.16.76-.12 2.35-.96 2.68-1.89.33-.92.33-1.72.23-1.88-.1-.17-.36-.27-.76-.47Z"
      />
    </svg>
  )
}

function loadVimeoPlayer(): Promise<VimeoConstructor> {
  const current = (window as VimeoWindow).Vimeo?.Player
  if (current) return Promise.resolve(current)
  if (vimeoSdkPromise) return vimeoSdkPromise

  vimeoSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-alovia-vimeo-sdk]')
    const finish = () => {
      const Player = (window as VimeoWindow).Vimeo?.Player
      if (Player) resolve(Player)
      else reject(new Error('Vimeo Player SDK unavailable'))
    }

    if (existing) {
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', () => reject(new Error('Vimeo Player SDK failed to load')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://player.vimeo.com/api/player.js'
    script.async = true
    script.dataset.aloviaVimeoSdk = '1'
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', () => reject(new Error('Vimeo Player SDK failed to load')), { once: true })
    document.head.appendChild(script)
  })

  return vimeoSdkPromise
}

function QuizDemoVideo({ profile }: { profile: ProfileId }) {
  const videoId = String(import.meta.env.VITE_QUIZ_DEMO_VIMEO_ID ?? '').trim()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const started = useRef(false)
  const completed = useRef(false)
  const progress = useRef(new Set<number>())

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !/^\d{6,12}$/.test(videoId)) return

    let disposed = false
    let player: VimeoPlayerInstance | null = null

    const onPlay = (data: VimeoPlaybackData) => {
      if (started.current) return
      started.current = true
      trackEvent('quiz_demo_started', {
        result_profile: profile,
        video_id: videoId,
        seconds: data.seconds,
        duration_seconds: data.duration,
      }, { surface: 'quiz' })
    }

    const onTimeupdate = (data: VimeoPlaybackData) => {
      for (const milestone of [25, 50, 75]) {
        if (data.percent * 100 < milestone || progress.current.has(milestone)) continue
        progress.current.add(milestone)
        trackEvent('quiz_demo_progress', {
          result_profile: profile,
          video_id: videoId,
          percent: milestone,
          seconds: data.seconds,
          duration_seconds: data.duration,
        }, { surface: 'quiz' })
      }
    }

    const onEnded = (data: VimeoPlaybackData) => {
      if (completed.current) return
      completed.current = true
      trackEvent('quiz_demo_completed', {
        result_profile: profile,
        video_id: videoId,
        percent: 100,
        seconds: data.seconds,
        duration_seconds: data.duration,
      }, { surface: 'quiz' })
    }

    void loadVimeoPlayer().then(Player => {
      if (disposed) return
      player = new Player(iframe)
      player.on('play', onPlay)
      player.on('timeupdate', onTimeupdate)
      player.on('ended', onEnded)
    }).catch(() => undefined)

    return () => {
      disposed = true
      if (!player) return
      player.off('play', onPlay)
      player.off('timeupdate', onTimeupdate)
      player.off('ended', onEnded)
    }
  }, [profile, videoId])

  if (!/^\d{6,12}$/.test(videoId)) {
    return (
      <div className="quiz-video quiz-video--pending" data-testid="quiz-video-pending">
        <span><Play size={24} /></span>
        <strong>Demonstração da Alovia</strong>
        <p>O vídeo final será conectado aqui antes do lançamento.</p>
      </div>
    )
  }

  return (
    <div className="quiz-video" aria-label="Demonstração da Alovia">
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&dnt=1`}
        title="Como a Alovia atende enquanto você continua no serviço"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

function signupTarget(search: string, profile: ProfileId) {
  const params = new URLSearchParams(search)
  params.set('quiz_profile', profile)
  const query = params.toString()
  return `/criar-conta${query ? `?${query}` : ''}`
}

export function QuizFunnelPage() {
  const auth = useAuth()
  const location = useLocation()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, AnswerId>>>({})
  const [selected, setSelected] = useState<AnswerId | null>(null)
  const [result, setResult] = useState<QuizProfile | null>(null)
  const advanceTimer = useRef<number | null>(null)

  const question = questions[currentIndex]
  const progressPercent = ((currentIndex + 1) / questions.length) * 100
  const answer = answers[question?.id]
  const signupUrl = useMemo(
    () => result ? signupTarget(location.search, result.id) : '/criar-conta',
    [location.search, result],
  )

  useEffect(() => {
    trackEventOnce('quiz_viewed', 'quiz_viewed', {
      funnel_stage: 'quiz_viewed',
      question_count: questions.length,
    }, { surface: 'quiz' })
  }, [])

  useEffect(() => {
    if (result || !question) return
    trackEventOnce(`quiz_question_viewed:${question.id}`, 'quiz_question_viewed', {
      funnel_stage: `quiz_${question.id}_viewed`,
      question_id: question.id,
      question_number: currentIndex + 1,
    }, { surface: 'quiz' })
  }, [currentIndex, question, result])

  useEffect(() => {
    if (!result) return
    trackEventOnce(`quiz_result_viewed:${result.id}`, 'quiz_result_viewed', {
      funnel_stage: 'quiz_result',
      result_profile: result.id,
    }, { surface: 'quiz' })
  }, [result])

  useEffect(() => () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
  }, [])

  if (auth.state === 'loading' || auth.state === 'logging_out') {
    return <main className="quiz-page"><div className="quiz-loading">Carregando…</div></main>
  }

  if (auth.user) return <Navigate to={homeFor(auth.user)} replace />

  function choose(option: QuizOption) {
    if (!question || selected) return
    const changedAnswer = Boolean(answers[question.id] && answers[question.id] !== option.id)
    const nextAnswers = { ...answers, [question.id]: option.id }

    trackEventOnce('quiz_started', 'quiz_started', {
      funnel_stage: 'quiz_started',
      first_question_id: question.id,
    }, { surface: 'quiz' })

    trackEvent('quiz_answered', {
      funnel_stage: `quiz_${question.id}_answered`,
      question_id: question.id,
      question_number: currentIndex + 1,
      answer_id: option.id,
      profile_dimension: option.dimension,
      changed_answer: changedAnswer,
    }, { surface: 'quiz' })

    setAnswers(nextAnswers)
    setSelected(option.id)

    advanceTimer.current = window.setTimeout(() => {
      setSelected(null)
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(index => index + 1)
        return
      }

      const resolved = resolveProfile(nextAnswers)
      setResult(resolved)
      trackEvent('quiz_completed', {
        funnel_stage: 'quiz_completed',
        result_profile: resolved.id,
        answered_questions: questions.length,
      }, { surface: 'quiz' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 320)
  }

  function goBack() {
    if (currentIndex === 0 || result) return
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    setSelected(null)
    setCurrentIndex(index => Math.max(0, index - 1))
  }

  if (result) {
    return (
      <main className="quiz-page quiz-page--result">
        <section className="quiz-shell">
          <header className="quiz-brand">
            <span className="quiz-brand__mark"><BrandMark /></span>
            <span><strong>Alovia</strong><small>Atendimento automático pelo WhatsApp</small></span>
          </header>

          <section className="quiz-result" aria-live="polite">
            <span className="quiz-result__check"><CheckCircle2 /></span>
            <span className="quiz-kicker">Seu perfil</span>
            <h1>{result.title}</h1>
            <div className="quiz-result__body">
              {result.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <p className="quiz-result__nudge">
              Você precisa ver isso funcionando. Assista ao vídeo abaixo agora e veja como a Alovia atende seus clientes enquanto você continua no serviço.
            </p>
          </section>

          <section className="quiz-demo-section">
            <span className="quiz-kicker">Veja na prática</span>
            <h2>Veja como a Alovia atende enquanto você continua no serviço.</h2>
            <QuizDemoVideo profile={result.id} />
          </section>

          <section className="quiz-conversion">
            <Link
              className="quiz-primary-cta"
              to={signupUrl}
              data-track-action="quiz_signup_cta"
              onClick={() => trackEvent('quiz_signup_cta_clicked', {
                funnel_stage: 'signup_cta',
                result_profile: result.id,
              }, { surface: 'quiz' })}
            >
              Criar conta grátis
              <ArrowRight size={20} />
            </Link>
            <small>Conheça a Alovia na sua própria operação.</small>
          </section>

          <section className="quiz-whatsapp-help">
            <div>
              <span className="quiz-whatsapp-help__icon"><WhatsAppLogo size={24} /></span>
              <div>
                <strong>Se ainda tiver com dúvidas, tenha um atendimento exclusivo em nosso WhatsApp</strong>
                <p>Fale diretamente com a Alovia antes de criar sua conta.</p>
              </div>
            </div>
            <a
              href="https://wa.me/5512981359722?text=ol%C3%A1%2C%20Quero%20atender%20meus%20clientes%20de%20forma%20autom%C3%A1tica"
              target="_blank"
              rel="noreferrer"
              className="quiz-whatsapp-cta"
              data-track-action="quiz_whatsapp_help"
              onClick={() => trackEvent('quiz_whatsapp_help_clicked', {
                funnel_stage: 'whatsapp_help',
                result_profile: result.id,
              }, { surface: 'quiz' })}
            >
              <span className="quiz-whatsapp-cta__logo"><WhatsAppLogo size={20} /></span>
              Falar no WhatsApp
            </a>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="quiz-page">
      <section className="quiz-shell">
        <header className="quiz-brand">
          <span className="quiz-brand__mark"><BrandMark /></span>
          <span><strong>Alovia</strong><small>Atendimento automático pelo WhatsApp</small></span>
        </header>

        <section className="quiz-hero">
          <span className="quiz-kicker"><Wrench size={15} /> Para quem vive a rotina de refrigeração</span>
          <h1>Refrigerista</h1>
          <p className="quiz-hero__subtitle">Atendimento automático pelo WhatsApp</p>
          <p className="quiz-hero__support">Descubra como o atendimento está impactando sua rotina hoje.</p>
        </section>

        <div className="quiz-progress" aria-label={`Pergunta ${currentIndex + 1} de ${questions.length}`}>
          <div className="quiz-progress__meta">
            <span>Pergunta {currentIndex + 1} de {questions.length}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="quiz-progress__track">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <section className="quiz-question" key={question.id}>
          <h2>{question.prompt}</h2>
          <div className="quiz-options">
            {question.options.map(option => {
              const isSelected = selected === option.id
              const isPrevious = !selected && answer === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`quiz-option${isSelected ? ' is-selected' : ''}${isPrevious ? ' is-previous' : ''}`}
                  onClick={() => choose(option)}
                  disabled={Boolean(selected)}
                  aria-pressed={isSelected || isPrevious}
                >
                  <span className="quiz-option__marker">{option.id}</span>
                  <span>{option.label}</span>
                  <ArrowRight className="quiz-option__arrow" size={19} />
                </button>
              )
            })}
          </div>

          <div className="quiz-question__footer">
            {currentIndex > 0 ? (
              <button type="button" className="quiz-back" onClick={goBack} disabled={Boolean(selected)}>
                <ArrowLeft size={17} />
                Voltar
              </button>
            ) : <span />}
            <small>Escolha a opção que mais parece com sua rotina.</small>
          </div>
        </section>
      </section>
    </main>
  )
}
