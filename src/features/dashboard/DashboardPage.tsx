import {
  Bot,
  CalendarCheck2,
  CalendarDays,
  MessageCircleMore,
  MessagesSquare,
  Snowflake,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { ActionCard } from '../../components/ActionCard'
import { ListRow } from '../../components/ListRow'
import { Section } from '../../components/Section'
import { StatusBadge } from '../../components/StatusBadge'
import { mockDashboard } from '../../lib/mocks'
import { useAuth } from '../auth/useAuth'
import { useConnection } from '../whatsapp/useConnection'
import { ConnectionStatusBadge } from '../whatsapp/ConnectionStatusBadge'

export function DashboardPage() {
  const {membership} = useAuth()
  const connection = useConnection()
  return (
    <div className="page-stack dashboard-page">
      <section className="welcome-block alovia-welcome">
        <span className="vertical-chip"><Snowflake size={14}/> Climatização & refrigeração</span>
        <h1>Olá, {membership?.business_name}</h1>
        <p>Centralize atendimento, agenda técnica e automação em uma operação pensada para o seu serviço.</p>
      </section>

      <section className="operation-card operation-card--hvac" aria-labelledby="operation-title">
        <div className="operation-card__heading">
          <div>
            <span className="eyebrow">Operação técnica</span>
            <h2 id="operation-title">O que precisa de atenção hoje</h2>
          </div>
          <span className="today-chip">Visão do dia</span>
        </div>
        <div className="list-surface list-surface--flush">
          <ListRow
            icon={Bot}
            title="Automação de atendimento"
            subtitle={mockDashboard.automationLabel}
            trailing={<StatusBadge tone="warning">Configurar</StatusBadge>}
          />
          <ListRow
            icon={CalendarCheck2}
            title="Visitas técnicas hoje"
            subtitle="Instalações, manutenções e avaliações"
            trailing={<strong className="metric-value">{mockDashboard.appointmentsToday}</strong>}
            iconTone="violet"
          />
          <ListRow
            icon={MessagesSquare}
            title="Clientes aguardando retorno"
            subtitle="A fila prioritária aparece antes das demais conversas"
            trailing={<strong className="metric-value">{mockDashboard.conversationsToday}</strong>}
            iconTone="slate"
          />
          <ListRow
            icon={MessageCircleMore}
            title="Canal WhatsApp"
            subtitle="Entrada dos pedidos de atendimento"
            trailing={connection.data && !connection.isError ? <ConnectionStatusBadge status={connection.data.status} /> : <StatusBadge>{connection.isError?'Indisponível':'Carregando'}</StatusBadge>}
            to="/app/whatsapp"
          />
        </div>
      </section>

      <Section title="Ações rápidas">
        <div className="quick-actions">
          <ActionCard
            icon={CalendarDays}
            title="Agenda técnica"
            description="Organize visitas e serviços"
            to="/app/agenda"
          />
          <ActionCard
            icon={MessagesSquare}
            title="Fila de atendimento"
            description="Veja quem precisa de resposta"
            to="/app/conversas"
          />
        </div>
      </Section>

      <section className="hvac-context-card" aria-label="Personalização para refrigeração">
        <span className="hvac-context-card__icon"><Wrench size={20}/></span>
        <div>
          <strong>Mais do que uma caixa de mensagens</strong>
          <p>A Alovia foi desenhada para organizar clientes por serviço, equipamento, visita técnica e próximos passos da operação.</p>
        </div>
      </section>

      <section className="next-step-card">
        <span className="next-step-card__icon"><Sparkles size={21} /></span>
        <div>
          <span className="eyebrow">Próximo passo</span>
          <strong>Prepare sua operação técnica</strong>
          <p>Cadastre serviços e horários para a Alovia transformar pedidos do WhatsApp em uma agenda organizada.</p>
        </div>
      </section>
    </div>
  )
}
