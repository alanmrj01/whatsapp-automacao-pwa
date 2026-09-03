import {
  Bot,
  CalendarCheck2,
  CalendarDays,
  MessageCircleMore,
  MessagesSquare,
  Sparkles,
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
      <section className="welcome-block">
        <span className="eyebrow">Visão geral</span>
        <h1>Olá, {membership?.business_name}</h1>
        <p>Veja o que precisa da sua atenção agora.</p>
      </section>

      <section className="operation-card" aria-labelledby="operation-title">
        <div className="operation-card__heading">
          <div>
            <span className="eyebrow">Operação</span>
            <h2 id="operation-title">Hoje</h2>
          </div>
          <span className="today-chip">Em dia</span>
        </div>
        <div className="list-surface list-surface--flush">
          <ListRow
            icon={Bot}
            title="Automação"
            subtitle={mockDashboard.automationLabel}
            trailing={<StatusBadge tone="warning">Configurar</StatusBadge>}
          />
          <ListRow
            icon={CalendarCheck2}
            title="Agendamentos de hoje"
            subtitle="Nenhum compromisso previsto"
            trailing={<strong className="metric-value">{mockDashboard.appointmentsToday}</strong>}
            iconTone="violet"
          />
          <ListRow
            icon={MessagesSquare}
            title="Conversas"
            subtitle="Nenhuma conversa nova"
            trailing={<strong className="metric-value">{mockDashboard.conversationsToday}</strong>}
            iconTone="slate"
          />
          <ListRow
            icon={MessageCircleMore}
            title="WhatsApp"
            subtitle="Seu canal de atendimento"
            trailing={connection.data && !connection.isError ? <ConnectionStatusBadge status={connection.data.status} /> : <StatusBadge>{connection.isError?'Indisponível':'Carregando'}</StatusBadge>}
            to="/app/whatsapp"
          />
        </div>
      </section>

      <Section title="Ações rápidas">
        <div className="quick-actions">
          <ActionCard
            icon={CalendarDays}
            title="Abrir agenda"
            description="Consulte seus horários"
            to="/app/agenda"
          />
          <ActionCard
            icon={MessageCircleMore}
            title="Abrir WhatsApp"
            description="Consulte seu canal"
            to="/app/whatsapp"
          />
        </div>
      </Section>

      <section className="next-step-card">
        <span className="next-step-card__icon"><Sparkles size={21} /></span>
        <div>
          <span className="eyebrow">Próximo passo</span>
          <strong>Acompanhe seu WhatsApp</strong>
          <p>Consulte a situação do seu canal. Agenda e resumo operacional ainda usam dados demonstrativos.</p>
        </div>
      </section>
    </div>
  )
}
