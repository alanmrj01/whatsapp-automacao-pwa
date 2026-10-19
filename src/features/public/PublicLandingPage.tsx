import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
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

function TrackedLink({source, className, children}:{source:string; className:string; children:ReactNode}) {
  return <Link
    className={className}
    to="/criar-conta"
    onClick={()=>trackEvent('landing_cta_click',{source},{surface:'landing'})}
  >{children}</Link>
}

function TechnicianArt({compact=false}:{compact?:boolean}) {
  return (
    <svg
      className={compact ? 'landing-tech-art landing-tech-art--compact' : 'landing-tech-art'}
      viewBox="0 0 420 520"
      role="img"
      aria-label="Refrigerista trabalhando em um equipamento de ar-condicionado"
    >
      <defs>
        <linearGradient id="shirt" x1="0" x2="1">
          <stop offset="0" stopColor="#0f3f77"/>
          <stop offset="1" stopColor="#071d3f"/>
        </linearGradient>
        <linearGradient id="skin" x1="0" x2="1">
          <stop offset="0" stopColor="#d89a75"/>
          <stop offset="1" stopColor="#b96f4c"/>
        </linearGradient>
      </defs>
      <rect x="10" y="34" width="252" height="100" rx="14" fill="#eef3f8"/>
      <rect x="25" y="49" width="222" height="52" rx="8" fill="#fff"/>
      <rect x="45" y="110" width="180" height="8" rx="4" fill="#d4dce6"/>
      <path d="M309 98c20 0 38 17 40 38l3 30-75 5-4-35c-2-21 14-38 36-38Z" fill="#0b2b58"/>
      <path d="M269 133c7-13 19-21 35-21 22 0 41 18 41 40 0 23-19 42-42 42-15 0-28-8-35-20-9-15-8-28 1-41Z" fill="url(#skin)"/>
      <path d="M272 125c10-23 35-33 58-21 10 5 17 13 21 23-19-7-43-5-79-2Z" fill="#0b2b58"/>
      <rect x="254" y="181" width="103" height="157" rx="42" fill="url(#shirt)"/>
      <path d="M279 205h55l28 88-67 17Z" fill="#123f73"/>
      <path d="M289 212c16 10 26 19 34 30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8"/>
      <circle cx="303" cy="225" r="11" fill="none" stroke="#fff" strokeWidth="3" opacity=".9"/>
      <path d="M303 218v14M296 225h14M298 220l10 10M308 220l-10 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9"/>
      <path d="M330 242c16 28 26 57 29 83" stroke="#c48261" strokeWidth="18" strokeLinecap="round"/>
      <path d="M345 313c-4 17-8 34-15 50" stroke="#c48261" strokeWidth="17" strokeLinecap="round"/>
      <path d="M326 359c15-10 26-22 37-35" stroke="#0b2b58" strokeWidth="12" strokeLinecap="round"/>
      <rect x="249" y="319" width="108" height="34" rx="10" fill="#12243f"/>
      <rect x="268" y="327" width="14" height="72" rx="5" fill="#f6a40b"/>
      <rect x="291" y="323" width="13" height="83" rx="5" fill="#d45f1f"/>
      <rect x="317" y="330" width="11" height="68" rx="5" fill="#f5c84e"/>
      <path d="M260 350c0 42-5 89-12 134" stroke="#142d50" strokeWidth="28" strokeLinecap="round"/>
      <path d="M335 350c3 44 11 88 17 134" stroke="#142d50" strokeWidth="28" strokeLinecap="round"/>
      <path d="M236 485h35" stroke="#0f1828" strokeWidth="20" strokeLinecap="round"/>
      <path d="M339 485h38" stroke="#0f1828" strokeWidth="20" strokeLinecap="round"/>
      <path d="M250 188c-17 20-32 39-45 62" stroke="#c48261" strokeWidth="18" strokeLinecap="round"/>
      <path d="M206 251c-18-8-34-9-52-5" stroke="#c48261" strokeWidth="14" strokeLinecap="round"/>
      <path d="M151 242l-18 18" stroke="#13233c" strokeWidth="8" strokeLinecap="round"/>
      <rect x="119" y="254" width="36" height="16" rx="4" fill="#f6a40b"/>
    </svg>
  )
}

function PhonePreview() {
  return (
    <div className="landing-phone" aria-label="Exemplo de conversa conduzida pela Alovia">
      <div className="landing-phone__status"><span>9:41</span><span>•••</span></div>
      <div className="landing-phone__header">
        <span className="landing-phone__avatar">A</span>
        <span><strong>Alovia</strong><small>online</small></span>
      </div>
      <div className="landing-chat landing-chat--client">Olá! Preciso de manutenção no meu ar-condicionado.</div>
      <div className="landing-chat landing-chat--alovia">Olá! 👋 Vou te ajudar! Qual é o tipo de serviço que você precisa?</div>
      <div className="landing-options">
        <span><Wrench/> Manutenção</span>
        <span><Snowflake/> Instalação</span>
        <span><Snowflake/> Limpeza</span>
        <span><ClipboardList/> Orçamento</span>
      </div>
      <div className="landing-composer"><span>Digite uma mensagem...</span><b>›</b></div>
    </div>
  )
}

function AppPreview() {
  return (
    <div className="landing-app-preview" aria-label="Prévia da conta demonstrativa">
      <div className="landing-app-card">
        <div className="landing-app-card__top"><span>9:41</span><strong>Alovia</strong></div>
        <h3>Conversas</h3>
        <div className="landing-tabs"><b>Todas</b><span>Não lidas</span><span>Agendadas</span></div>
        <div className="landing-contact"><span className="landing-contact__avatar">C</span><span><b>Carlos Silva</b><small>Manutenção de split</small></span><em>10:24</em></div>
        <div className="landing-contact"><span className="landing-contact__avatar">M</span><span><b>Mariana Costa</b><small>Orçamento</small></span><em>09:50</em></div>
        <div className="landing-contact"><span className="landing-contact__avatar">R</span><span><b>Rafael Almeida</b><small>Instalação</small></span><em>Ontem</em></div>
      </div>
      <div className="landing-app-card landing-app-card--agenda">
        <div className="landing-app-card__top"><span>9:41</span><strong>Alovia</strong></div>
        <h3>Agenda</h3>
        <p>Hoje, 14 de mar</p>
        <div className="landing-slot landing-slot--blue"><span>08:00</span><b>Manutenção</b></div>
        <div className="landing-slot landing-slot--orange"><span>10:30</span><b>Instalação</b></div>
        <div className="landing-slot landing-slot--green"><span>13:00</span><b>Orçamento</b></div>
        <div className="landing-slot landing-slot--purple"><span>15:30</span><b>Limpeza</b></div>
      </div>
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
        trackEvent('landing_section_view',{section:name},{surface:'landing'})
      }
    },{threshold:0.35})
    document.querySelectorAll<HTMLElement>('[data-track-section]').forEach(element=>observer.observe(element))

    const thresholds=[25,50,75,90]
    const sent=new Set<number>()
    const onScroll=()=>{
      const height=document.documentElement.scrollHeight-window.innerHeight
      if(height<=0)return
      const depth=Math.round((window.scrollY/height)*100)
      for(const threshold of thresholds){
        if(depth>=threshold&&!sent.has(threshold)){
          sent.add(threshold)
          trackEvent('landing_scroll_depth',{percent:threshold},{surface:'landing'})
        }
      }
    }
    window.addEventListener('scroll',onScroll,{passive:true})
    return ()=>{observer.disconnect();window.removeEventListener('scroll',onScroll)}
  },[])

  if (auth.state === 'authenticated' && auth.user) {
    return <Navigate to={homeFor(auth.user)} replace />
  }

  return <div className="public-landing">
    <header className="public-header">
      <div className="public-container public-header__inner">
        <Link className="public-brand" to="/" aria-label="Alovia"><BrandMark/><strong>Alovia</strong></Link>
        <Link className="public-login-link" to="/login" onClick={()=>trackEvent('landing_login_click',{}, {surface:'landing'})}>Entrar</Link>
      </div>
    </header>

    <main>
      <section className="public-hero" data-track-section="hero">
        <div className="public-container public-hero__grid">
          <div className="public-hero__copy">
            <span className="public-pill"><Snowflake size={15}/> Feito para Refrigeiristas</span>
            <h1>Enquanto você está no serviço, outro cliente pode estar esperando no WhatsApp</h1>
            <p>A Alovia continua o atendimento, coleta as informações do serviço e ajuda a organizar o agendamento enquanto você está trabalhando.</p>
            <TrackedLink source="hero" className="public-button">Experimente a Alovia grátis <ArrowRight size={18}/></TrackedLink>
            <div className="public-proof-row">
              <span><CheckCircle2/> Teste grátis</span>
              <span><ClipboardList/> Dados demonstrativos</span>
              <span><CheckCircle2/> Sem cartão</span>
            </div>
          </div>

          <div className="public-hero__scene">
            <div className="public-hero__ac" aria-hidden="true">
              <img src="/refrigeration-hero.webp" alt=""/>
            </div>
            <PhonePreview/>
            <TechnicianArt/>
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
              onClick={()=>trackEvent('landing_vsl_play_intent',{}, {surface:'landing'})}
            >
              <div className="public-video__scene">
                <div className="public-video__ac"><img src="/refrigeration-hero.webp" alt=""/></div>
                <TechnicianArt compact/>
              </div>
              <span className="public-video__shade" aria-hidden="true"/>
              <span className="public-video__play"><Play fill="currentColor"/></span>
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
              <p className="public-flow__note"><MessageCircle/> O cliente fala pelo WhatsApp como sempre.</p>
            </article>
            <article>
              <span className="public-step">2</span>
              <h3>A Alovia conduz o atendimento</h3>
              <div className="public-mini-message public-mini-message--green">A Alovia faz as perguntas, coleta as informações e qualifica o serviço.</div>
              <ul>
                <li><Wrench/> Tipo de serviço</li>
                <li><Snowflake/> Modelo do equipamento</li>
                <li><MapPin/> Endereço</li>
                <li><CalendarCheck2/> Data e horário</li>
              </ul>
            </article>
            <article>
              <span className="public-step">3</span>
              <h3>O agendamento fica organizado</h3>
              <div className="public-success"><CheckCircle2/> Tudo registrado e pronto na sua agenda.</div>
              <ul>
                <li><CalendarCheck2/> Data e horário agendados</li>
                <li><ClipboardList/> Informações do serviço completas</li>
                <li><MessageCircle/> Cliente salvo no sistema</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="public-section public-demo" data-track-section="demo">
        <div className="public-container public-demo__grid">
          <div className="public-demo__copy">
            <span className="public-pill public-pill--plain"><Eye size={15}/> Veja na prática</span>
            <h2>Conheça na prática como seus clientes serão atendidos</h2>
            <p>Veja como o atendimento funciona, como as informações são organizadas e como fica sua agenda — tudo com dados demonstrativos, sem precisar conectar seu WhatsApp ainda.</p>
            <TrackedLink source="demo" className="public-button">Criar conta grátis <ArrowRight size={18}/></TrackedLink>
          </div>
          <AppPreview/>
        </div>
      </section>

      <section className="public-section public-final" data-track-section="final">
        <div className="public-container">
          <div className="public-final__grid">
            <div className="public-final__copy">
              <h2>Seu atendimento pode continuar enquanto você está no serviço.</h2>
              <p>Com a Alovia, as conversas avançam, o agendamento se organiza e você continua focado no que importa: realizar um bom serviço.</p>
              <TrackedLink source="final" className="public-button">Experimente grátis <ArrowRight size={18}/></TrackedLink>
            </div>
            <div className="public-final__scene">
              <TechnicianArt compact/>
              <span className="public-final__scribble">Mais atendimento.<br/>Mais tempo<br/>para o que<br/>importa.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
}
