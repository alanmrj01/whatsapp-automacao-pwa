import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
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
        <Link className="public-brand" to="/" aria-label="Alovia">
          <BrandMark/><strong>Alovia</strong>
        </Link>
        <Link className="public-login-link" to="/login" onClick={()=>trackEvent('landing_login_click',{}, {surface:'landing'})}>Entrar</Link>
      </div>
    </header>

    <main>
      <section className="public-hero" data-track-section="hero">
        <div className="public-container public-hero__grid">
          <div className="public-hero__copy">
            <span className="public-pill"><Snowflake size={15}/> Feito para Refrigeiristas</span>
            <h1>Enquanto você está no serviço, outro cliente pode estar esperando no WhatsApp</h1>
            <p>A Alovia faz todo atendimento e agendamento organizado pelo WhatsApp, tudo enquanto você está trabalhando.</p>
            <TrackedLink source="hero" className="public-button public-button--hero">Experimente a Alovia grátis <ArrowRight size={18}/></TrackedLink>
            <div className="public-proof-row" aria-label="Condições para experimentar">
              <span><CheckCircle2/> Teste grátis</span>
              <span><ClipboardList/> Dados demonstrativos</span>
              <span><CheckCircle2/> Sem cartão</span>
            </div>
          </div>

          <div className="public-hero__visual" aria-label="Exemplo de atendimento da Alovia">
            <img src="/refrigeration-hero.webp" width="720" height="540" alt="Equipamento de ar-condicionado em ambiente de refrigeração"/>
            <div className="public-hero__glow" aria-hidden="true"/>
            <div className="public-phone">
              <div className="public-phone__top">
                <span className="public-phone__avatar">A</span>
                <span><strong>Alovia</strong><small>online</small></span>
              </div>
              <div className="public-chat public-chat--client">Olá! Preciso de manutenção no meu ar-condicionado.</div>
              <div className="public-chat public-chat--alovia">Olá! Vou te ajudar. Qual é o tipo de serviço que você precisa?</div>
              <div className="public-chat-options">
                <span>Manutenção</span><span>Instalação</span><span>Limpeza</span><span>Orçamento</span>
              </div>
              <div className="public-phone__composer">Digite uma mensagem... <span>›</span></div>
            </div>
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
              <img src="/refrigeration-hero.webp" width="960" height="540" alt="Demonstração visual da Alovia para refrigeração"/>
              <span className="public-video__shade" aria-hidden="true"/>
              <span className="public-video__play"><Play fill="currentColor"/></span>
              <span className="public-video__duration">2:18</span>
            </button>
          </div>
        </div>
      </section>

      <section className="public-section public-practical" data-track-section="practical">
        <div className="public-container">
          <div className="public-section__heading">
            <h2>O que acontece na prática</h2>
            <p className="public-section__lead">Quando a resposta depende de você parar o serviço toda vez, as mensagens se acumulam e o próximo cliente pode esperar mais do que deveria.</p>
          </div>

          <div className="public-flow">
            <article className="public-flow__card">
              <span className="public-step">1</span>
              <h3>O cliente chama</h3>
              <div className="public-mini-message">Preciso de manutenção no ar-condicionado.</div>
              <p className="public-flow__note"><MessageCircle/> O cliente fala pelo WhatsApp como sempre.</p>
            </article>

            <article className="public-flow__card public-flow__card--accent">
              <span className="public-step">2</span>
              <h3>A Alovia conduz o atendimento</h3>
              <div className="public-mini-message public-mini-message--green">Faz as perguntas, coleta as informações e organiza o próximo passo.</div>
              <ul><li>Tipo de serviço</li><li>Modelo do equipamento</li><li>Endereço</li><li>Data e horário</li></ul>
            </article>

            <article className="public-flow__card">
              <span className="public-step">3</span>
              <h3>O agendamento fica organizado</h3>
              <div className="public-success"><CheckCircle2/> Tudo registrado e pronto na sua agenda.</div>
              <ul><li>Data e horário agendados</li><li>Informações do serviço</li><li>Cliente salvo no sistema</li></ul>
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

          <div className="public-device-stage" aria-label="Prévia da conta demonstrativa">
            <div className="public-device public-device--conversations">
              <div className="public-device__status">9:41 <strong>Alovia</strong></div>
              <div className="public-device__title">Conversas</div>
              <div className="public-device__tabs"><strong>Todas</strong><span>Não lidas</span><span>Agendadas</span></div>
              <div className="public-device__row"><MessageCircle/><span><strong>Carlos Silva</strong><small>Manutenção de split</small></span><em>10:24</em></div>
              <div className="public-device__row"><MessageCircle/><span><strong>Mariana Costa</strong><small>Orçamento</small></span><em>09:50</em></div>
              <div className="public-device__row"><MessageCircle/><span><strong>Rafael Almeida</strong><small>Instalação</small></span><em>Ontem</em></div>
            </div>

            <div className="public-device public-device--agenda">
              <div className="public-device__status">9:41 <strong>Alovia</strong></div>
              <div className="public-device__title">Agenda</div>
              <div className="public-device__date">Hoje, 14 de mar</div>
              <div className="public-agenda-row"><span>08:00</span><strong>Manutenção</strong></div>
              <div className="public-agenda-row"><span>10:30</span><strong>Instalação</strong></div>
              <div className="public-agenda-row"><span>13:00</span><strong>Orçamento</strong></div>
              <div className="public-agenda-row"><span>15:30</span><strong>Limpeza</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section public-final" data-track-section="final">
        <div className="public-container">
          <div className="public-final__grid">
            <div className="public-final__copy">
              <h2>Seu atendimento pode continuar enquanto você está no serviço.</h2>
              <p>Com a Alovia, as conversas avançam, o agendamento se organiza e você continua focado no que importa: realizar um bom serviço.</p>
              <TrackedLink source="final" className="public-button">Experimente a Alovia grátis <ArrowRight size={18}/></TrackedLink>
            </div>
            <div className="public-final__visual">
              <img src="/refrigeration-hero.webp" width="720" height="540" alt="Equipamento de refrigeração"/>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
}
