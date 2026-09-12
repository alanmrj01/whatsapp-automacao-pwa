import { ChevronLeft, ChevronRight, LockKeyhole, MessageCircleMore, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState'
import { BottomSheet } from '../../components/BottomSheet'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { demoConversations } from '../../demo/operationalDemo'
import { DemoDataNotice } from '../access/DemoDataNotice'
import { useEntitlements } from '../access/useEntitlements'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import { useBusiness, useConversation, useConversations } from '../operations/api'
import type { Conversation, ConversationStatus } from '../operations/types'

const labels = {waiting:'Aguardando',in_progress:'Em atendimento',answered:'Respondida'} as const

export function ConversationsPage() {
  const entitlement = useEntitlements()
  const {openUpgrade} = useUpgradePrompt()
  const [searchParams,setSearchParams] = useSearchParams()
  const [search,setSearch] = useState('')
  const [filter,setFilter] = useState<'all'|ConversationStatus>('all')
  const [selected,setSelected] = useState<string|null>(null)
  const demo = entitlement.usesDemoData
  const realConversations=useConversations(search,filter==='all'?'':filter)
  const detail=useConversation(selected)
  const business=useBusiness()
  const conversations = useMemo(()=>demoConversations.filter(item=>{
    const matchesFilter = filter==='all'||item.status===filter
    const value = `${item.customer} ${item.lastMessage} ${item.assignee}`.toLocaleLowerCase('pt-BR')
    return matchesFilter && value.includes(search.toLocaleLowerCase('pt-BR'))
  }),[filter,search])
  const requestedDemoId = demo ? searchParams.get('conversation') : null
  const demoDetail = demoConversations.find(item=>item.id===requestedDemoId)
  const demoDetailIndex = demoDetail ? demoConversations.findIndex(item=>item.id===demoDetail.id) : -1

  const selectDemo = (id:string) => {
    const next = new URLSearchParams(searchParams)
    next.set('conversation',id)
    setSearchParams(next,{replace:true})
  }
  const closeDemo = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('conversation')
    setSearchParams(next,{replace:true})
  }

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">Fila de atendimento</span><h1>Conversas</h1></div>{demo&&<StatusBadge tone="info">Demo</StatusBadge>}</section>

    {demo ? <>
      <DemoDataNotice />
      <div className="toolbar-row">
        <label className="search-field"><Search size={19}/><span className="sr-only">Buscar conversa</span><input value={search} onChange={event=>setSearch(event.target.value)} type="search" placeholder="Buscar conversa" /></label>
        <InfoHelp title="Ordem da fila">Conversas prioritárias e não lidas aparecem primeiro. Os dados desta fila são demonstrativos.</InfoHelp>
      </div>
      <ConversationFilters filter={filter} setFilter={setFilter}/>
      <section className="conversation-list" aria-live="polite">
        {conversations.map(item=><article className={item.priority?'conversation-row is-priority':'conversation-row'} key={item.id}>
          <div className="conversation-avatar" aria-hidden="true">{item.customer.split(' ').map(value=>value[0]).join('').slice(0,2)}</div>
          <button type="button" className="conversation-copy conversation-copy--button" onClick={()=>selectDemo(item.id)} aria-label={`Abrir conversa fictícia com ${item.customer}`}><div><strong>{item.customer}</strong><time>{item.time}</time></div><p>{item.lastMessage}</p><footer><span>{item.assignee}</span><StatusBadge tone={item.status==='waiting'?'warning':item.status==='answered'?'success':'info'}>{labels[item.status]}</StatusBadge></footer></button>
          {item.unread>0&&<span className="unread-count" aria-label={`${item.unread} mensagens não lidas`}>{item.unread}</span>}
        </article>)}
        {!conversations.length&&<div className="inline-empty">Nenhuma conversa encontrada.</div>}
      </section>
      <BottomSheet open={!!demoDetail} title={demoDetail?.customer??'Conversa fictícia'} description="Atendimento demonstrativo somente para leitura." onClose={closeDemo}>
        {demoDetail&&<>
          <div className="conversation-detail-toolbar" aria-label="Navegar entre conversas fictícias">
            <button type="button" disabled={demoDetailIndex<=0} onClick={()=>selectDemo(demoConversations[demoDetailIndex-1].id)}><ChevronLeft size={18}/>Anterior</button>
            <span>{demoDetailIndex+1} de {demoConversations.length}</span>
            <button type="button" disabled={demoDetailIndex>=demoConversations.length-1} onClick={()=>selectDemo(demoConversations[demoDetailIndex+1].id)}>Próxima<ChevronRight size={18}/></button>
          </div>
          <div className="message-history">{demoDetail.messages.map(message=><article className={`message-history__item message-history__item--${message.direction==='customer'?'inbound':message.direction==='assistant'?'outbound':'event'}`} key={message.id}><span>{message.direction==='customer'?'Cliente':message.direction==='assistant'?'Assistente ALOVIA':'Atualização do atendimento'}</span><p>{message.body}</p><time>{message.time}</time></article>)}</div>
          <button className="demo-locked-action" type="button" onClick={()=>openUpgrade('Responder ou assumir uma conversa')}><LockKeyhole size={17}/>Responder</button>
        </>}
      </BottomSheet>
    </> : <>
      <div className="toolbar-row"><label className="search-field"><Search size={19}/><span className="sr-only">Buscar conversa</span><input value={search} onChange={event=>setSearch(event.target.value)} type="search" placeholder="Buscar conversa" /></label><InfoHelp title="Fila real">A fila usa somente conversas da empresa ativa e ordena itens não lidos primeiro.</InfoHelp></div>
      <ConversationFilters filter={filter} setFilter={setFilter}/>
      {(realConversations.isPending||business.isPending)&&<LoadingState/>}
      {(realConversations.isError||business.isError)&&<ErrorState onRetry={()=>{void realConversations.refetch();void business.refetch()}}/>}
      {realConversations.data&&business.data&&<RealConversationList items={realConversations.data.items} onSelect={setSelected} timezone={business.data.timezone}/>}
      <BottomSheet open={!!selected} title={detail.data?.customer_name??'Conversa'} description={detail.data?.customer_phone??'Histórico da conversa'} onClose={()=>setSelected(null)}>
        {detail.isPending&&<LoadingState/>}
        {detail.isError&&<ErrorState onRetry={()=>void detail.refetch()}/>}
        {detail.data&&<div className="message-history">{detail.data.messages.map(message=><article className={`message-history__item message-history__item--${message.direction}`} key={message.id}><span>{message.direction==='inbound'?'Cliente':'Empresa'}</span><p>{message.body??`Mensagem ${message.message_type}`}</p><time>{formatMoment(message.created_at,business.data?.timezone)}</time></article>)}</div>}
      </BottomSheet>
    </>}
  </div>
}

function ConversationFilters({filter,setFilter}:{filter:'all'|ConversationStatus;setFilter:(value:'all'|ConversationStatus)=>void}) {
  return <div className="segmented-control" aria-label="Filtrar conversas">{[
    ['all','Todas'],['waiting','Aguardando'],['in_progress','Em atendimento'],['answered','Respondidas'],
  ].map(([value,label])=><button type="button" key={value} className={filter===value?'is-active':''} onClick={()=>setFilter(value as 'all'|ConversationStatus)}>{label}</button>)}</div>
}

function formatMoment(value:string|null,timeZone?:string) {
  if(!value)return 'Sem mensagens'
  return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone}).format(new Date(value))
}

function RealConversationList({items,onSelect,timezone}:{items:Conversation[];onSelect:(id:string)=>void;timezone:string}) {
  if(!items.length)return <EmptyState icon={MessageCircleMore} title="Nenhuma conversa" description="A fila não possui itens para este filtro."/>
  return <section className="conversation-list" aria-live="polite">{items.map(item=><article className={item.priority?'conversation-row is-priority':'conversation-row'} key={item.id}><div className="conversation-avatar" aria-hidden="true">{item.customer_name.split(' ').map(value=>value[0]).join('').slice(0,2)}</div><button type="button" className="conversation-copy conversation-copy--button" onClick={()=>onSelect(item.id)}><div><strong>{item.customer_name}</strong><time>{formatMoment(item.last_message_at,timezone)}</time></div><p>{item.last_content??'Sem conteúdo textual'}</p><footer><span>{item.assignee_name??'Sem responsável'}</span><StatusBadge tone={item.status==='waiting'?'warning':item.status==='answered'?'success':'info'}>{labels[item.status]}</StatusBadge></footer></button>{item.unread_count>0&&<span className="unread-count" aria-label={`${item.unread_count} mensagens não lidas`}>{item.unread_count}</span>}</article>)}</section>
}
