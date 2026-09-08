import { MessageCircleMore, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState'
import { InfoHelp } from '../../components/InfoHelp'
import { StatusBadge } from '../../components/StatusBadge'
import { demoConversations } from '../../demo/operationalDemo'
import { useProductState } from '../product/productState'

const labels = {waiting:'Aguardando',in_progress:'Em atendimento',answered:'Respondida'} as const

export function ConversationsPage() {
  const {state} = useProductState()
  const [search,setSearch] = useState('')
  const [filter,setFilter] = useState<'all'|'waiting'>('all')
  const demo = state==='FREE_DEMO'
  const conversations = useMemo(()=>demoConversations.filter(item=>{
    const matchesFilter = filter==='all'||item.status==='waiting'
    const value = `${item.customer} ${item.lastMessage} ${item.assignee}`.toLocaleLowerCase('pt-BR')
    return matchesFilter && value.includes(search.toLocaleLowerCase('pt-BR'))
  }),[filter,search])

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">Fila de atendimento</span><h1>Conversas</h1></div>{demo&&<StatusBadge tone="info">Demo</StatusBadge>}</section>

    {demo ? <>
      <div className="toolbar-row">
        <label className="search-field"><Search size={19}/><span className="sr-only">Buscar conversa</span><input value={search} onChange={event=>setSearch(event.target.value)} type="search" placeholder="Buscar conversa" /></label>
        <InfoHelp title="Ordem da fila">Conversas prioritárias e não lidas aparecem primeiro. Os dados desta fila são demonstrativos.</InfoHelp>
      </div>
      <div className="segmented-control" aria-label="Filtrar conversas">
        <button className={filter==='all'?'is-active':''} onClick={()=>setFilter('all')}>Todas</button>
        <button className={filter==='waiting'?'is-active':''} onClick={()=>setFilter('waiting')}>Aguardando</button>
      </div>
      <section className="conversation-list" aria-live="polite">
        {conversations.map(item=><article className={item.priority?'conversation-row is-priority':'conversation-row'} key={item.id}>
          <div className="conversation-avatar" aria-hidden="true">{item.customer.split(' ').map(value=>value[0]).join('').slice(0,2)}</div>
          <div className="conversation-copy"><div><strong>{item.customer}</strong><time>{item.time}</time></div><p>{item.lastMessage}</p><footer><span>{item.assignee}</span><StatusBadge tone={item.status==='waiting'?'warning':item.status==='answered'?'success':'info'}>{labels[item.status]}</StatusBadge></footer></div>
          {item.unread>0&&<span className="unread-count" aria-label={`${item.unread} mensagens não lidas`}>{item.unread}</span>}
        </article>)}
        {!conversations.length&&<div className="inline-empty">Nenhuma conversa encontrada.</div>}
      </section>
    </> : state==='ACTIVE' ? <EmptyState icon={MessageCircleMore} title="Fila pronta para dados reais" description="O backend público ainda não oferece leitura de conversas. Nenhum dado demonstrativo é misturado à conta ativa." /> : <EmptyState icon={MessageCircleMore} title="Conecte o WhatsApp para receber conversas" description="A fila será liberada quando a conexão estiver pronta." action={<Link className="primary-button" to="/app/whatsapp">Conectar WhatsApp</Link>} />}
  </div>
}
