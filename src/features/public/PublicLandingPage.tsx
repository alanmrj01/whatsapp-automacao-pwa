import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Eye,
  MapPin,
  MessageCircle,
  Play,
  Snowflake,
  Wrench,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
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
        <div className="landing-composer"><span>Digite uma mensagem...</span><b>›</b></div>
      </div>
    </div>
  )
}

function ConversationsScreen() {
  return (
    <div className="landing-app-screen">
      <div className="landing-app-screen__status"><span>9:41</span><span>Alovia</span></div>
      <h3>Conversas</h3>
      <div className="landing-tabs"><b>Todas</b><span>Não lidas</span><span>Agendadas</span></div>
      <div className="landing-contact"><span className="landing-contact__avatar">C</span><span><b>Carlos Silva</b><small>Manutenção de split</small></span><em>10:24</em></div>
      <div className="landing-contact"><span className="landing-contact__avatar">M</span><span><b>Mariana Costa</b><small>Orçamento</small></span><em>09:50</em></div>
      <div className="landing-contact"><span className="landing-contact__avatar">R</span><span><b>Rafael Almeida</b><small>Instalação</small></span><em>Ontem</em></div>
      <div className="landing-contact"><span className="landing-contact__avatar">F</span><span><b>Fernanda Souza</b><small>Limpeza</small></span><em>Ontem</em></div>
      <div className="landing-app-nav"><b>Conversas</b><span>Agenda</span><span>Ajustes</span></div>
    </div>
  )
}

function AgendaScreen() {
  return (
    <div className="landing-app-screen">
      <div className="landing-app-screen__status"><span>9:41</span><span>Alovia</span></div>
      <h3>Agenda</h3>
      <p>Hoje, 14 de mar</p>
      <div className="landing-slot landing-slot--blue"><span>08:00</span><b>Manutenção</b><small>João Silva</small></div>
      <div className="landing-slot landing-slot--orange"><span>10:30</span><b>Instalação</b><small>Mariana Costa</small></div>
      <div className="landing-slot landing-slot--green"><span>13:00</span><b>Orçamento</b><small>Rafael Almeida</small></div>
      <div className="landing-slot landing-slot--purple"><span>15:30</span><b>Limpeza</b><small>Fernanda Souza</small></div>
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
              <span className="public-pill"><Snowflake /> Feito para Refrigeiristas</span>
              <h1>Enquanto você está no serviço, outro cliente pode estar esperando no WhatsApp</h1>
              <p>A Alovia continua o atendimento, coleta as informações do serviço e ajuda a organizar o agendamento enquanto você está trabalhando.</p>
              <TrackedLink source="hero" className="public-button">Experimente a Alovia grátis <ArrowRight /></TrackedLink>
              <div className="public-proof-row" aria-label="Condições do teste">
                <span><CheckCircle2 /> Teste grátis</span>
                <span><BarChart3 /> Dados demonstrativos</span>
                <span><CreditCard /> Sem cartão</span>
              </div>
            </div>

            <div className="public-hero__scene">
              <img
                className="public-hero__photo"
                src={technicianPhoto}
                alt="Refrigerista fazendo manutenção em um ar-condicionado"
                width="1672"
                height="941"
                fetchPriority="high"
              />
              <span className="public-hero__wash" aria-hidden="true" />
              <PhonePreview />
            </div>
          </div>
        </section>

        <section className="public-section public-vsl" data-track-section="vsl">
          <div className="public-container">
            <div className="public-vsl__shell">
              <h2>Como a Alovia atende enquanto você está no serviço</h2>
              <button
                type="button"
                className="public-video"
                aria-label="Assistir demonstração da Alovia"
                onClick={() => trackEvent('landing_vsl_play_intent', {}, { surface: 'landing' })}
              >
                <img src={technicianPhoto} alt="" width="1672" height="941" loading="lazy" />
                <span className="public-video__shade" aria-hidden="true" />
                <span className="public-video__play"><Play fill="currentColor" /></span>
                <span className="public-video__duration">2:18</span>
              </button>
            </div>
          </div>
        </section>

        <section className="public-section public-practical" data-track-section="practical">
          <div className="public-container">
            <h2>O que acontece na prática</h2>
            <p className="public-section__lead">Quando a resposta depende de você parar o serviço toda vez, as mensagens se acumulam e o próximo cliente pode esperar mais do que deveria.</p>

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
              <p>Veja como o atendimento funciona, como as informações são organizadas e como fica sua agenda — tudo com dados demonstrativos, sem precisar conectar seu WhatsApp ainda.</p>
              <TrackedLink source="demo" className="public-button">Criar conta grátis <ArrowRight /></TrackedLink>
            </div>
            <AppPreview />
          </div>
        </section>

        <section className="public-section public-final" data-track-section="final">
          <div className="public-container">
            <div className="public-final__grid">
              <div className="public-final__copy">
                <h2>Seu atendimento pode continuar enquanto você está no serviço.</h2>
                <p>Com a Alovia, as conversas avançam, o agendamento se organiza e você continua focado no que importa: realizar um bom serviço.</p>
                <TrackedLink source="final" className="public-button">Experimente grátis <ArrowRight /></TrackedLink>
              </div>
              <div className="public-final__scene">
                <img src={technicianPhoto} alt="Refrigerista trabalhando" width="1672" height="941" loading="lazy" />
                <span className="public-final__fade" aria-hidden="true" />
                <span className="public-final__scribble">Mais atendimento.<br />Mais tempo<br />para o que<br />importa.</span>
              </div>
              <span className="public-final__check" aria-hidden="true"><Check /></span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
