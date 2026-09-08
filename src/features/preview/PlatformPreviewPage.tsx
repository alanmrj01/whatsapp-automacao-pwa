import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gauge,
  Headphones,
  Home,
  Menu,
  MessageCircle,
  MessagesSquare,
  Search,
  Snowflake,
  Sparkles,
  Store,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { demoAppointments, demoBusinessName, demoConversations, demoOverview, demoServiceMix, demoToday } from '../../demo/operationalDemo'

type PreviewTab = 'home' | 'conversations' | 'agenda' | 'more'

const tabs: Array<{id:PreviewTab; label:string; icon: typeof Home}> = [
  {id:'home',label:'Início',icon:Home},
  {id:'conversations',label:'Conversas',icon:MessagesSquare},
  {id:'agenda',label:'Agenda',icon:CalendarDays},
  {id:'more',label:'Mais',icon:Menu},
]

function PreviewHeader({title}: {title:string}) {
  return <header className="customer-preview__header">
    <div className="customer-preview__header-left"><BrandMark/><strong>{title}</strong></div>
    <span className="customer-preview__wordmark">Alovia</span>
  </header>
}

function HomePreview() {
  return <div className="customer-preview__screen">
    <PreviewHeader title="Início" />
    <section className="preview-home-hero">
      <div>
        <h1>Olá, {demoBusinessName}!</h1>
        <p>Tudo pronto para otimizar seus atendimentos em refrigeração.</p>
        <button type="button"><MessageCircle size={18}/> Conectar WhatsApp</button>
      </div>
      <img src="/refrigeration-hero.webp" width="720" height="540" alt="Ar-condicionado split e condensadora" />
    </section>

    <h2 className="preview-section-title">Visão geral</h2>
    <div className="preview-metric-grid">
      <article><span><ClipboardList/></span><div><small>Aguardando atendimento</small><strong>{demoOverview.waiting}</strong><em>Fila prioritária</em></div></article>
      <article><span><CalendarDays/></span><div><small>Agenda técnica</small><strong>{demoOverview.appointmentsToday}</strong><em>Serviços hoje</em></div></article>
      <article><span><Bell/></span><div><small>Em atendimento</small><strong>{demoOverview.inProgress}</strong><em>Agora</em></div></article>
      <article><span><Headphones/></span><div><small>Concluídos</small><strong>{demoOverview.completed}</strong><em>No dia</em></div></article>
    </div>

    <section className="preview-card">
      <div className="preview-card__title"><h2>Serviços mais solicitados</h2><button type="button">Ver todos</button></div>
      <div className="preview-service-grid">
        <div><Snowflake/><span>Instalação</span><strong>{demoServiceMix.installation}%</strong></div>
        <div><Wrench/><span>Manutenção</span><strong>{demoServiceMix.maintenance}%</strong></div>
        <div><Sparkles aria-hidden="true"/><span>Limpeza</span><strong>{demoServiceMix.cleaning}%</strong></div>
        <div><Gauge aria-hidden="true"/><span>Carga de gás</span><strong>{demoServiceMix.gasCharge}%</strong></div>
      </div>
    </section>

    <section className="preview-card">
      <div className="preview-card__title"><h2>Próximos atendimentos</h2><button type="button">Ver agenda</button></div>
      <div className="preview-appointments">
        {demoAppointments.filter(item=>item.date===demoToday).slice(0,2).map(item=><div key={item.id}><time>{item.time}</time><span/><p><strong>{item.service}</strong><small>Cliente: {item.customer}<br/>Técnico: {item.technician}</small></p><em>{item.status==='confirmed'?'Confirmado':'Pendente'}</em></div>)}
      </div>
    </section>

    <button className="preview-configure" type="button"><Store/><span><strong>Configure sua empresa</strong><small>Complete os dados e personalize sua operação.</small></span><ChevronRight/></button>
  </div>
}

function ConversationsPreview() {
  return <div className="customer-preview__screen">
    <div className="preview-page-title"><h1>Conversas</h1><button type="button">+</button></div>
    <label className="preview-search"><Search size={19}/><input placeholder="Buscar conversas" /></label>
    <div className="preview-filters"><button className="is-active">Aguardando atendimento <span>{demoOverview.waiting}</span></button><button>Orçamentos</button><button>Suporte</button><button>Pós-venda</button></div>
    <div className="preview-priority-hint"><span>Fila inteligente</span> Quem aguarda resposta fica no topo.</div>
    <section className="preview-conversation-list">
      {demoConversations.map((item,index)=><article key={item.id} className={item.status==='waiting' ? 'is-waiting' : ''}>
        <div className={`preview-avatar preview-avatar--${index+1}`}>{item.customer.split(' ').map(value=>value[0]).join('').slice(0,2)}</div>
        <div className="preview-conversation-copy"><div><strong>{item.customer}</strong><time>{item.time}</time></div><b>Responsável: {item.assignee}</b><p>{item.lastMessage}</p><span className={item.status==='waiting'?'waiting':'answered'}>{item.status==='waiting'?'Aguardando resposta':'Em andamento'}</span></div>
      </article>)}
    </section>
    <aside className="preview-context-note"><Snowflake/><p><strong>Alovia organiza por contexto de serviço</strong><span>Atendimentos são separados por etapa para sua equipe ganhar tempo e vender mais.</span></p></aside>
  </div>
}

const calendarDays = Array.from({length:31},(_,i)=>i+1)
function AgendaPreview() {
  return <div className="customer-preview__screen">
    <PreviewHeader title="Agenda" />
    <section className="preview-calendar">
      <div className="preview-calendar__month"><ChevronLeft/><strong>Setembro 2026</strong><ChevronRight/></div>
      <div className="preview-calendar__week"><span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span></div>
      <div className="preview-calendar__days"><span/><span/>{calendarDays.map(day=><button key={day} className={day===8?'is-selected':day===9?'has-event':''}>{day}</button>)}</div>
    </section>
    <section className="preview-day-list">
      <div className="preview-card__title"><div><h2>Atendimentos do dia</h2><p>Terça-feira, 8 de setembro de 2026</p></div><button>Ver todos</button></div>
      {demoAppointments.filter(item=>item.date===demoToday).slice(0,3).map(item=><article key={item.id}><time>{item.time}</time><span/><p><strong>{item.service}</strong><small>Cliente: {item.customer}<br/>Técnico: {item.technician}</small></p><em>{item.status==='confirmed'?'Confirmado':'Pendente'}</em></article>)}
    </section>
  </div>
}

function MorePreview() {
  return <div className="customer-preview__screen">
    <PreviewHeader title="Mais" />
    <section className="preview-company-card"><div className="preview-company-logo">PE</div><div><small>Empresa</small><h1>{demoBusinessName}</h1><p>Operação de climatização e refrigeração</p></div></section>
    <h2 className="preview-section-title">Sua operação</h2>
    <div className="preview-more-list">
      <button><Wrench/><span><strong>Serviços e preços</strong><small>Instalação, manutenção, limpeza e outros</small></span><ChevronRight/></button>
      <button><Snowflake/><span><strong>Equipamentos</strong><small>Histórico e lembretes por equipamento</small></span><ChevronRight/></button>
      <button><Headphones/><span><strong>Equipe técnica</strong><small>Técnicos, disponibilidade e atendimentos</small></span><ChevronRight/></button>
      <button><Building2/><span><strong>Área de atendimento</strong><small>Regiões, deslocamentos e horários</small></span><ChevronRight/></button>
      <button><MessageCircle/><span><strong>Conexão do WhatsApp</strong><small>Canal de entrada dos pedidos</small></span><ChevronRight/></button>
    </div>
  </div>
}

export function PlatformPreviewPage() {
  const navigate = useNavigate()
  const [tab,setTab] = useState<PreviewTab>('home')
  return <main className="platform-preview-page">
    <div className="platform-preview-toolbar">
      <button type="button" onClick={()=>navigate('/admin')}><ArrowLeft size={18}/> Administração</button>
      <span>Prévia demonstrativa • dados fictícios</span>
    </div>
    <section className="customer-preview">
      {tab==='home' && <HomePreview/>}
      {tab==='conversations' && <ConversationsPreview/>}
      {tab==='agenda' && <AgendaPreview/>}
      {tab==='more' && <MorePreview/>}
      <nav className="customer-preview__nav" aria-label="Navegação da prévia">
        {tabs.map(({id,label,icon:Icon})=><button type="button" key={id} className={tab===id?'is-active':''} onClick={()=>setTab(id)}><Icon size={22}/><span>{label}</span></button>)}
      </nav>
    </section>
  </main>
}
