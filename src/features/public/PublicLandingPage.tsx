import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  MessageCircleMore,
  MessagesSquare,
  UsersRound,
  Wrench,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { homeFor } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import '../../styles/public-landing.css'

const painPoints = [
  {
    icon: MessagesSquare,
    title: 'A conversa some no meio das mensagens',
    description: 'Pedidos, dúvidas e retornos disputam espaço no mesmo histórico.',
  },
  {
    icon: CalendarDays,
    title: 'O horário fica anotado em outro lugar',
    description: 'A conversa está no WhatsApp, mas a agenda depende de outra tela ou do papel.',
  },
  {
    icon: UsersRound,
    title: 'A equipe não sabe quem já respondeu',
    description: 'Sem uma visão comum, o atendimento pode parar ou ser feito em duplicidade.',
  },
  {
    icon: Clock3,
    title: 'O próximo passo depende da memória',
    description: 'Um retorno importante vira mais uma tarefa para lembrar no fim do dia.',
  },
]

const organizationFeatures = [
  {
    icon: MessageCircleMore,
    title: 'Conversas em contexto',
    description: 'Veja o que está aguardando atenção e continue cada atendimento do ponto certo.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda conectada à rotina',
    description: 'Organize horários, visitas e próximos atendimentos em uma visão simples.',
  },
  {
    icon: ClipboardCheck,
    title: 'WhatsApp com processo',
    description: 'Transforme pedidos recebidos em etapas claras, sem perder o jeito humano de atender.',
  },
  {
    icon: LayoutDashboard,
    title: 'Operação visível',
    description: 'Tenha uma leitura rápida do dia para decidir o que precisa acontecer primeiro.',
  },
]

const journeySteps = [
  ['1', 'Crie sua conta', 'Comece grátis e conheça a experiência da Alovia.'],
  ['2', 'Organize sua operação', 'Configure a empresa e entenda como conversas e agenda se encontram.'],
  ['3', 'Conecte quando fizer sentido', 'A conexão com o WhatsApp fica para quando você decidir avançar.'],
]

export function PublicLandingPage() {
  const auth = useAuth()

  if (auth.state === 'authenticated' && auth.user) {
    return <Navigate to={homeFor(auth.user)} replace />
  }

  return (
    <div className="public-landing">
      <a className="public-skip-link" href="#conteudo-principal">Pular para o conteúdo</a>

      <header className="public-header">
        <div className="public-container public-header__inner">
          <Link className="public-brand" to="/" aria-label="Alovia — página inicial">
            <BrandMark />
            <span>Alovia</span>
          </Link>
          <nav className="public-header__actions" aria-label="Acesso à plataforma">
            <Link className="public-login-link" to="/login">Entrar</Link>
            <Link className="public-button public-button--compact" to="/criar-conta">
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>

      <main id="conteudo-principal">
        <section className="public-hero" aria-labelledby="public-hero-title">
          <div className="public-container public-hero__grid">
            <div className="public-hero__copy">
              <span className="public-eyebrow">Atendimento e agenda para pequenas operações</span>
              <h1 id="public-hero-title">Conversa, agenda e rotina. Tudo no mesmo lugar.</h1>
              <p className="public-hero__premise">
                Atender pelo WhatsApp não é o problema. O problema começa quando conversa,
                agenda e rotina ficam espalhadas.
              </p>
              <p className="public-hero__support">
                A Alovia ajuda sua equipe a transformar cada pedido em um próximo passo claro,
                sem complicar o atendimento que já funciona hoje.
              </p>
              <div className="public-hero__actions">
                <Link className="public-button" to="/criar-conta">
                  Criar conta grátis <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className="public-button public-button--secondary" to="/login">Entrar</Link>
              </div>
              <p className="public-hero__note">
                Explore primeiro. Conecte o WhatsApp somente quando decidir avançar.
              </p>
            </div>

            <div className="public-product" aria-label="Prévia ilustrativa da organização no produto">
              <p className="sr-only">Prévia ilustrativa do produto, sem dados reais.</p>
              <div className="public-product__window">
                <div className="public-product__topbar">
                  <span className="public-product__brand">
                    <BrandMark />
                    <strong>Alovia</strong>
                  </span>
                  <span className="public-product__status">
                    <span aria-hidden="true" /> Fluxo organizado
                  </span>
                </div>

                <div className="public-product__intro">
                  <div>
                    <small>Visão de hoje</small>
                    <strong>O que precisa da sua atenção</strong>
                  </div>
                  <span><LayoutDashboard size={19} aria-hidden="true" /></span>
                </div>

                <div className="public-product__columns">
                  <article className="public-product__panel">
                    <div className="public-product__panel-title">
                      <MessageCircleMore size={18} aria-hidden="true" />
                      <strong>Conversas</strong>
                    </div>
                    <div className="public-product__row">
                      <span className="public-product__avatar"><Wrench size={16} aria-hidden="true" /></span>
                      <span>
                        <strong>Novo pedido de atendimento</strong>
                        <small>Definir o próximo passo</small>
                      </span>
                      <em>Novo</em>
                    </div>
                    <div className="public-product__row">
                      <span className="public-product__avatar public-product__avatar--soft"><Building2 size={16} aria-hidden="true" /></span>
                      <span>
                        <strong>Retorno de orçamento</strong>
                        <small>Aguardando atendimento</small>
                      </span>
                      <em>Hoje</em>
                    </div>
                  </article>

                  <article className="public-product__panel">
                    <div className="public-product__panel-title">
                      <CalendarDays size={18} aria-hidden="true" />
                      <strong>Agenda</strong>
                    </div>
                    <div className="public-product__schedule">
                      <span>09:00</span>
                      <div>
                        <strong>Visita confirmada</strong>
                        <small>Equipe e horário organizados</small>
                      </div>
                      <CheckCircle2 size={17} aria-label="Confirmado" />
                    </div>
                    <div className="public-product__schedule">
                      <span>14:30</span>
                      <div>
                        <strong>Próximo atendimento</strong>
                        <small>Detalhes reunidos em um só lugar</small>
                      </div>
                      <Clock3 size={17} aria-label="Agendado" />
                    </div>
                  </article>
                </div>

                <div className="public-product__footer-note">
                  <ClipboardCheck size={19} aria-hidden="true" />
                  <span><strong>Menos improviso na rotina</strong>Conversa e agenda seguindo o mesmo fluxo.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section public-section--pain" aria-labelledby="public-pain-title">
          <div className="public-container">
            <div className="public-section__heading">
              <span className="public-eyebrow">Quando tudo fica espalhado</span>
              <h2 id="public-pain-title">O atendimento cresce. A organização precisa acompanhar.</h2>
              <p>São situações pequenas, mas repetidas todos os dias elas tiram tempo e clareza da operação.</p>
            </div>
            <div className="public-card-grid public-card-grid--pain">
              {painPoints.map(({ icon: Icon, title, description }) => (
                <article className="public-card public-pain-card" key={title}>
                  <span className="public-card__icon"><Icon size={21} aria-hidden="true" /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section" id="como-organiza" aria-labelledby="public-organization-title">
          <div className="public-container public-organization">
            <div className="public-section__heading public-section__heading--left">
              <span className="public-eyebrow">Como a Alovia organiza</span>
              <h2 id="public-organization-title">Uma visão contínua do pedido ao atendimento</h2>
              <p>
                Em vez de espalhar a rotina em mais ferramentas, a Alovia reúne os pontos que
                sua equipe consulta para trabalhar.
              </p>
            </div>
            <div className="public-feature-list">
              {organizationFeatures.map(({ icon: Icon, title, description }) => (
                <article className="public-feature" key={title}>
                  <span className="public-card__icon"><Icon size={22} aria-hidden="true" /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section public-section--steps" aria-labelledby="public-steps-title">
          <div className="public-container">
            <div className="public-section__heading">
              <span className="public-eyebrow">Comece sem complicação</span>
              <h2 id="public-steps-title">Conheça a plataforma no seu ritmo</h2>
            </div>
            <ol className="public-steps">
              {journeySteps.map(([number, title, description]) => (
                <li key={number}>
                  <span className="public-steps__number">{number}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="public-section" aria-labelledby="public-audience-title">
          <div className="public-container public-audience">
            <div className="public-audience__copy">
              <span className="public-eyebrow">Feita para quem está na operação</span>
              <h2 id="public-audience-title">Para equipes pequenas que atendem, organizam e entregam</h2>
              <p>
                A Alovia é para negócios que recebem pedidos pelo WhatsApp e precisam transformar
                conversas em trabalho bem acompanhado — no escritório, na loja ou em campo.
              </p>
            </div>
            <ul className="public-audience__list">
              <li><CheckCircle2 aria-hidden="true" /> Prestadores de serviços e equipes técnicas</li>
              <li><CheckCircle2 aria-hidden="true" /> Pequenos comércios com atendimento recorrente</li>
              <li><CheckCircle2 aria-hidden="true" /> Operações que agendam visitas, entregas ou horários</li>
              <li><CheckCircle2 aria-hidden="true" /> Empresas que querem crescer sem perder o contexto</li>
            </ul>
          </div>
        </section>

        <section className="public-final-cta" aria-labelledby="public-final-title">
          <div className="public-container public-final-cta__inner">
            <span className="public-final-cta__mark"><BrandMark inverse /></span>
            <div>
              <span className="public-eyebrow">Seu próximo passo pode ser simples</span>
              <h2 id="public-final-title">Conheça a ALOVIA antes de decidir.</h2>
              <p>Crie sua conta gratuita e veja como a rotina pode ficar mais clara.</p>
            </div>
            <Link className="public-button public-button--light" to="/criar-conta">
              Criar conta grátis <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-container public-footer__inner">
          <span>© {new Date().getFullYear()} Alovia</span>
          <Link to="/login">Entrar na plataforma</Link>
        </div>
      </footer>
    </div>
  )
}
