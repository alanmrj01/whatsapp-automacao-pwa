import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Eye,
  HelpCircle,
  House,
  Lightbulb,
  MapPin,
  Menu,
  MessageCircle,
  Play,
  Send,
  Snowflake,
  UserRound,
  Wrench,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { trackEvent } from '../../lib/tracking'
import { homeFor } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import '../../styles/public-landing.css'

const technicianPhoto = '/landing/technician-hvac.webp'

function TrackedLink({ source, className, children }: { source: string; className: string; children: ReactNode }) {
  return (
    <Link
      className={className}
      to="/criar-conta"
      onClick={() => trackEvent('landing_cta_click', { source }, { surface: 'landing' })}
    >
      {children}
    </Link>
  )
}

function PhonePreview() {
  return (
    <div className="landing-phone" aria-label="Exemplo de conversa conduzida pela Alovia">
      <span className="landing-phone__speaker" aria-hidden="true" />
      <div className="landing-phone__screen">
        <div className="landing-phone__status"><span>9:41</span><span>● ● ●</span></div>
        <div className="landing-phone__header">
          <span className="landing-phone__back">‹</span>
          <span className="landing-phone__avatar">A</span>
          <span className="landing-phone__title"><strong>Alovia</strong><small>online</small></span>
          <span className="landing-phone__menu">•••</span>
        </div>
        <div className="landing-phone__conversation">
          <div className="landing-chat landing-chat--client">Olá! Preciso de manutenção no meu ar-condicionado.</div>
          <div className="landing-chat landing-chat--alovia">Olá! 👋 Vou te ajudar! Qual é o tipo de serviço que você precisa?</div>
          <div className="landing-options">
            <span><Wrench /> Manutenção</span>
            <span><Snowflake /> Instalação</span>
            <span><Snowflake /> Limpeza</span>
            <span><ClipboardList /> Orçamento</span>
          </div>
        </div>
        <div className="landing-composer"><span>Digite uma mensagem...</span><b aria-hidden="true"><Send /></b></div>
      </div>
    </div>
  )
}

function VideoPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [started, setStarted] = useState(false)

  const startVideo = () => {
    if (started) return
    setStarted(true)
    trackEvent('landing_vsl_play_intent', {}, { surface: 'landing' })
    iframeRef.current?.contentWindow?.postMessage({ method: 'play' }, 'https://player.vimeo.com')
  }

  return (
    <div className="public-video" aria-label="Assistir demonstração da Alovia">
      <iframe
        ref={iframeRef}
        src="https://player.vimeo.com/video/1240828681?badge=0&autopause=0&player_id=0&app_id=58479"
        title="Alovia"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
      {!started && (
        <button
          type="button"
          className="public-video__start"
          aria-label="Reproduzir vídeo da Alovia"
          onClick={startVideo}
        >
          <span className="public-video__play" aria-hidden="true"><Play fill="currentColor" /></span>
        </button>
      )}
    </div>
  )
}

function AppScreenHeader({ title }: { title: string }) {
  return (
    <div className="landing-real-header">
      <BrandMark />
      <strong>{title}</strong>
      <b>Alovia</b>
    </div>
  )
}

function AppBottomNav({ active }: { active: 'conversations' | 'agenda' }) {
  return (
    <nav className="landing-real-nav" aria-label="Navegação da prévia demonstrativa">
      <span><House />Início</span>
      <span className={active === 'conversations' ? 'is-active' : ''}><MessageCircle />Conversas</span>
      <span className={active === 'agenda' ? 'is-active' : ''}><CalendarCheck2 />Agenda</span>
      <span><Menu />Configurações</span>
    </nav>
  )
}

function ConversationsScreen() {
  const conversations = [
    { initials: 'CM', name: 'Carlos Mendes', preview: 'Qual é o CEP do endereço?', time: '09:18', status: 'Aguardando', tone: 'waiting', unread: true },
    { initials: 'AP', name: 'Ana Paula', preview: 'O ponto elétrico já está pronto?', time: '09:04', status: 'Em atendimento', tone: 'active' },
    { initials: 'JR', name: 'Juliana Rocha', preview: 'Agendamento confirmado para sábado, 24/10, às 14h.', time: '08:42', status: 'Respondida', tone: 'answered' },
    { initials: 'PP', name: 'Padaria Pão Quente', preview: 'Qual é o CEP e o número da padaria?', time: '08:23', status: 'Aguardando', tone: 'waiting', unread: true },
    { initials: 'LC', name: 'Loja Centro', preview: 'Agendamento confirmado para segunda-feira, 19/10.', time: '5 dias atrás', status: 'Respondida', tone: 'answered' },
    { initials: 'RL', name: 'Rafael Lima', preview: 'Reagendamento confirmado para domingo, 25/10.', time: 'Ontem', status: 'Respondida', tone: 'answered' },
  ]

  return (
    <div className="landing-app-screen landing-app-screen--real">
      <AppScreenHeader title="Conversas" />
      <div className="landing-real-list">
        {conversations.map(item => (
          <div className="landing-real-conversation" key={item.name}>
            <span className="landing-real-avatar">{item.initials}</span>
            <span className="landing-real-conversation__copy">
              <b>{item.name}</b>
              <small>{item.preview}</small>
              <em>Alovia</em>
            </span>
            <span className="landing-real-conversation__meta">
              <time>{item.time}</time>
              {item.unread && <i>1</i>}
              <small className={`is-${item.tone}`}>● {item.status}</small>
            </span>
          </div>
        ))}
      </div>
      <AppBottomNav active="conversations" />
    </div>
  )
}

function AgendaScreen() {
  return (
    <div className="landing-app-screen landing-app-screen--real">
      <AppScreenHeader title="Agenda" />
      <div className="landing-agenda-body">
        <div className="landing-demo-banner"><span><strong>Modo demonstração</strong><small>Dados ilustrativos para você visualizar como a Alovia funciona.</small></span><HelpCircle /></div>
        <div className="landing-agenda-title"><span><small>AGENDA DEMONSTRATIVA</small><b>Agenda</b></span><i><CalendarCheck2 /> Novo</i></div>
        <div className="landing-agenda-tip"><Lightbulb /><span>O cliente quer um horário mesmo quando você está com a mão no serviço.</span></div>
        <div className="landing-agenda-back"><CalendarCheck2 /> Voltar ao calendário</div>
        <div className="landing-agenda-date"><b><ChevronLeft /></b><span><strong>Segunda-feira, 19 de outubro</strong><small>19/10/2026</small></span><b><ChevronRight /></b></div>
        <div className="landing-agenda-count"><strong>1 atendimento</strong><HelpCircle /></div>
        <div className="landing-agenda-card"><time>11:30</time><span><b>Loja Centro</b><small>Manutenção preventiva</small><em><UserRound /> Marina</em></span><i>● Confirmado</i></div>
      </div>
      <AppBottomNav active="agenda" />
    </div>
  )
}

function AppPreview() {
  return (
    <div className="landing-app-preview" aria-label="Prévia da conta demonstrativa">
      <div className="landing-device landing-device--conversations"><span className="landing-device__speaker" /><ConversationsScreen /></div>
      <div className="landing-device landing-device--agenda"><span className="landing-device__speaker" /><AgendaScreen /></div>
    </div>
  )
}

export function PublicLandingPage() {
  const auth = useAuth()

  useEffect(() => {
    const viewed = new Set<string>()
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const name = (entry.target as HTMLElement).dataset.trackSection
        if (!name || viewed.has(name)) continue
        viewed.add(name)
        trackEvent('landing_section_view', { section: name }, { surface: 'landing' })
      }
    }, { threshold: 0.35 })
    document.querySelectorAll<HTMLElement>('[data-track-section]').forEach(element => observer.observe(element))

    const thresholds = [25, 50, 75, 90]
    const sent = new Set<number>()
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight
      if (height <= 0) return
      const depth = Math.round((window.scrollY / height) * 100)
      for (const threshold of thresholds) {
        if (depth >= threshold && !sent.has(threshold)) {
          sent.add(threshold)
          trackEvent('landing_scroll_depth', { percent: threshold }, { surface: 'landing' })
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  if (auth.state === 'authenticated' && auth.user) {
    return <Navigate to={homeFor(auth.user)} replace />
  }

  return (
    <div className="public-landing">
      <header className="public-header">
        <div className="public-container public-header__inner">
          <Link className="public-brand" to="/" aria-label="Alovia"><BrandMark /><strong>Alovia</strong></Link>
          <Link className="public-login-link" to="/login" onClick={() => trackEvent('landing_login_click', {}, { surface: 'landing' })}>Entrar</Link>
        </div>
      </header>

      <main>
        <section className="public-hero" data-track-section="hero">
          <div className="public-container public-hero__grid">
            <div className="public-hero__copy">
              <span className="public-pill"><Snowflake /> Feito para Refrigeristas</span>
              <h1>Enquanto você está no serviço, outro cliente pode estar esperando no WhatsApp</h1>
              <p>Enquanto você cuida do serviço, a Alovia responde, coleta os dados e encaminha o agendamento — sem deixar o próximo cliente esfriar.</p>
              <TrackedLink source="hero" className="public-button">Conheça a Alovia grátis <ArrowRight /></TrackedLink>
              <div className="public-proof-row" aria-label="Condições do teste">
                <span><CheckCircle2 /> Modo demonstração grátis</span>
                <span><BarChart3 /> Dados demonstrativos</span>
                <span><CreditCard /> Sem cartão</span>
              </div>
            </div>

            <div className="public-hero__video" data-track-section="vsl">
              <div className="public-vsl__shell public-vsl__shell--hero">
                <h2>Como a Alovia atende enquanto você está no serviço</h2>
                <VideoPreview />
              </div>
            </div>
          </div>
        </section>

        <section className="public-section public-static-composition" aria-label="Atendimento da Alovia em ação">
          <div className="public-container">
            <div className="public-vsl__scene">
              <img
                className="public-hero__photo"
                src={technicianPhoto}
                alt="Refrigerista fazendo manutenção em um ar-condicionado"
                width="1672"
                height="941"
                loading="lazy"
              />
              <span className="public-hero__wash" aria-hidden="true" />
              <PhonePreview />
            </div>
          </div>
        </section>

        <section className="public-section public-practical" data-track-section="practical">
          <div className="public-container">
            <h2>O que acontece na prática</h2>
            <p className="public-section__lead">Se você precisa parar o serviço para responder, a conversa esfria. A Alovia mantém o próximo atendimento em movimento.</p>

            <div className="public-flow">
              <article>
                <span className="public-step">1</span>
                <h3>O cliente chama</h3>
                <div className="public-mini-message">Preciso de manutenção no ar-condicionado.</div>
                <p className="public-flow__note"><MessageCircle /> O cliente fala pelo WhatsApp como sempre.</p>
              </article>
              <article>
                <span className="public-step">2</span>
                <h3>A Alovia conduz o atendimento</h3>
                <div className="public-mini-message public-mini-message--green">A Alovia faz as perguntas, coleta as informações e qualifica o serviço.</div>
                <ul>
                  <li><Wrench /> Tipo de serviço</li>
                  <li><Snowflake /> Modelo do equipamento</li>
                  <li><MapPin /> Endereço</li>
                  <li><CalendarCheck2 /> Data e horário</li>
                </ul>
              </article>
              <article>
                <span className="public-step">3</span>
                <h3>O agendamento fica organizado</h3>
                <div className="public-success"><CheckCircle2 /> Tudo registrado e pronto na sua agenda.</div>
                <ul>
                  <li><CalendarCheck2 /> Data e horário agendados</li>
                  <li><ClipboardList /> Informações do serviço completas</li>
                  <li><MessageCircle /> Cliente salvo no sistema</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="public-section public-demo" data-track-section="demo">
          <div className="public-container public-demo__grid">
            <div className="public-demo__copy">
              <span className="public-pill public-pill--plain"><Eye /> Veja na prática</span>
              <h2>Conheça na prática como seus clientes serão atendidos</h2>
              <p>Veja conversas e agendamentos funcionando com dados demonstrativos. Você entende o fluxo antes de conectar seu WhatsApp.</p>
              <TrackedLink source="demo" className="public-button">Criar conta grátis <ArrowRight /></TrackedLink>
            </div>
            <AppPreview />
          </div>
        </section>

        <section className="public-section public-practical" data-track-section="plans">
          <div className="public-container">
            <h2>Planos pensados para o volume da sua operação</h2>
            <p className="public-section__lead">No lançamento, o Basic atende quando o cliente chama. O Plus acrescentará mensagens proativas de utilidade depois que essa etapa estiver pronta.</p>
            <div className="public-flow">
              <article>
                <span className="public-step">Basic</span>
                <h3>R$ 197/mês</h3>
                <ul>
                  <li><CheckCircle2 /> Até 600 mensagens de serviço por mês</li>
                  <li><MessageCircle /> Atendimento automático iniciado pelo cliente</li>
                  <li><CalendarCheck2 /> Conversas e agendamentos organizados</li>
                </ul>
              </article>
              <article>
                <span className="public-step">Plus</span>
                <h3>R$ 397/mês · em breve</h3>
                <ul>
                  <li><CheckCircle2 /> Até 1.000 mensagens por mês no total</li>
                  <li><MessageCircle /> Até 300 mensagens de utilidade dentro da franquia</li>
                  <li><Snowflake /> Lembretes de limpeza e retomada de atendimentos parados</li>
                </ul>
              </article>
              <article>
                <span className="public-step">Franquia</span>
                <h3>Você acompanha o uso</h3>
                <ul>
                  <li><CheckCircle2 /> Mensagens recebidas não consomem a franquia</li>
                  <li><BarChart3 /> O consumo fica visível na conta</li>
                  <li><CalendarCheck2 /> A franquia é renovada mensalmente</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="public-section public-final" data-track-section="final">
          <div className="public-container">
            <div className="public-final__grid">
              <div className="public-final__copy">
                <h2>Seu atendimento pode continuar enquanto você está no serviço.</h2>
                <p>A Alovia mantém a conversa avançando e deixa o agendamento organizado enquanto você conclui o serviço.</p>
                <TrackedLink source="final" className="public-button">Criar conta grátis <ArrowRight /></TrackedLink>
              </div>
              <div className="public-final__scene">
                <img src={technicianPhoto} alt="Refrigerista trabalhando" width="1672" height="941" loading="lazy" />
                <span className="public-final__fade" aria-hidden="true" />
                <span className="public-final__scribble">Mais atendimento.<br />Mais tempo<br />para o que<br />importa.</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
