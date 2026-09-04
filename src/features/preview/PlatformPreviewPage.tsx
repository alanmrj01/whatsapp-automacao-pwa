import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Headphones,
  Home,
  Menu,
  MessageCircle,
  MessagesSquare,
  Search,
  Snowflake,
  Store,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'

type PreviewTab = 'home' | 'conversations' | 'agenda' | 'more'

const tabs: Array<{id:PreviewTab; label:string; icon: typeof Home}> = [
  {id:'home',label:'Início',icon:Home},
  {id:'conversations',label:'Conversas',icon:MessagesSquare},
  {id:'agenda',label:'Agenda',icon:CalendarDays},
  {id:'more',label:'Mais',icon:Menu},
]

const conversations = [
  {name:'Loja Centro', context:'Manutenção preventiva', detail:'Solicitação de PMOC para 3 aparelhos de ar-condicionado.', time:'09:15', waiting:true, avatar:'LC'},
  {name:'Empresa Alfa', context:'Suporte técnico', detail:'Equipamento não está gelando adequadamente.', time:'08:42', waiting:true, avatar:'EA'},
  {name:'Carlos Mendes', context:'Orçamento • Split 18.000 BTUs', detail:'Cliente busca instalação completa com suporte técnico incluso.', time:'09:32', waiting:false, avatar:'CM'},
  {name:'Ana Paula', context:'Limpeza completa', detail:'Quero agendar limpeza de 2 splits na próxima semana.', time:'Ontem', waiting:false, avatar:'AP'},
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
        <h1>Olá, PEMA TESTE!</h1>
        <p>Tudo pronto para otimizar seus atendimentos em refrigeração.</p>
        <button type="button"><MessageCircle size={18}/> Conectar WhatsApp</button>
      </div>
      <img src="/refrigeration-hero.png" alt="Ar-condicionado e condensadora" />
    </section>

    <h2 className="preview-section-title">Visão geral</h2>
    <div className="preview-metric-grid">
      <article><span><ClipboardList/></span><div><small>Orçamentos em aberto</small><strong>12</strong><em>R$ 18.450,00</em></div></article>
      <article><span><CalendarDays/></span><div><small>Agenda técnica</small><strong>7</strong><em>Serviços hoje</em></div></article>
      <article><span><Bell/></span><div><small>Lembretes de manutenção</small><strong>5</strong><em>Equipamentos</em></div></article>
      <article><span><Headphones/></span><div><small>Atendimentos do dia</small><strong>9</strong><em>3 em andamento</em></div></article>
    </div>

    <section className="preview-card">
      <div className="preview-card__title"><h2>Serviços mais solicitados</h2><button type="button">Ver todos</button></div>
      <div className="preview-service-grid">
        <div><Snowflake/><span>Instalação</span><strong>23%</strong></div>
        <div><Wrench/><span>Manutenção</span><strong>45%</strong></div>
        <div><span className="preview-spark">✦</span><span>Limpeza</span><strong>15%</strong></div>
        <div><span className="preview-gauge">◴</span><span>Carga de gás</span><strong>17%</strong></div>
      </div>
    </section>

    <section className="preview-card">
      <div className="preview-card__title"><h2>Próximos atendimentos</h2><button type="button">Ver agenda</button></div>
      <div className="preview-appointments">
        <div><time>10:00</time><span/><p><strong>Manutenção preventiva</strong><small>AC Split 24.000 BTUs<br/>Cliente: Carlos Mendes</small></p><em>Confirmado</em></div>
        <div><time>14:30</time><span/><p><strong>Instalação</strong><small>AC Split Inverter 18.000 BTUs<br/>Cliente: Ana Paula Silva</small></p><em>Pendente</em></div>
      </div>
    </section>

    <button className="preview-configure" type="button"><Store/><span><strong>Configure sua empresa</strong><small>Complete os dados e personalize sua operação.</small></span><ChevronRight/></button>
  </div>
}

function ConversationsPreview() {
  return <div className="customer-preview__screen">
    <div className="preview-page-title"><h1>Conversas</h1><button type="button">+</button></div>
    <label className="preview-search"><Search size={19}/><input placeholder="Buscar conversas" /></label>
    <div className="preview-filters"><button className="is-active">Leads <span>12</span></button><button>Orçamentos <span>8</span></button><button>Suporte <span>5</span></button><button>Pós-venda</button></div>
    <div className="preview-priority-hint"><span>Fila inteligente</span> Quem aguarda resposta fica no topo.</div>
    <section className="preview-conversation-list">
      {conversations.map((item,index)=><article key={item.name} className={item.waiting ? 'is-waiting' : ''}>
        <div className={`preview-avatar preview-avatar--${index+1}`}>{item.avatar}</div>
        <div className="preview-conversation-copy"><div><strong>{item.name}</strong><time>{item.time}</time></div><b>{item.context}</b><p>{item.detail}</p><span className={item.waiting?'waiting':'answered'}>{item.waiting?'Aguardando resposta':'Respondido'}</span></div>
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
      <div className="preview-calendar__month"><ChevronLeft/><strong>Maio 2025</strong><ChevronRight/></div>
      <div className="preview-calendar__week"><span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span></div>
      <div className="preview-calendar__days"><span/><span/><span/><span/>{calendarDays.map(day=><button key={day} className={day===15?'is-selected':day===20?'has-event':''}>{day}</button>)}</div>
    </section>
    <section className="preview-day-list">
      <div className="preview-card__title"><div><h2>Atendimentos do dia</h2><p>Quinta-feira, 15 de maio de 2025</p></div><button>Ver todos</button></div>
      <article><time>09:00</time><span/><p><strong>Instalação</strong><small>AC Split Inverter 18.000 BTUs<br/>Cliente: Carlos Mendes</small></p><em>Confirmado</em></article>
      <article><time>13:30</time><span/><p><strong>Manutenção</strong><small>Câmara fria 2 portas<br/>Cliente: Padaria Pão Quente</small></p><em>Pendente</em></article>
      <article><time>16:00</time><span/><p><strong>Visita técnica / orçamento</strong><small>Avaliação de instalação<br/>Cliente: Supermercado Minas</small></p><em>Pendente</em></article>
    </section>
  </div>
}

function MorePreview() {
  return <div className="customer-preview__screen">
    <PreviewHeader title="Mais" />
    <section className="preview-company-card"><div className="preview-company-logo">PE</div><div><small>Empresa</small><h1>PEMA TESTE</h1><p>Operação de climatização e refrigeração</p></div></section>
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
