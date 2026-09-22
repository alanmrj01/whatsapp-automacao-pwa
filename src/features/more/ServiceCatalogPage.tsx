import { CalendarCog, Plus, Save } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useCreateService, useServices, useUpdateService } from '../operations/api'
import type { Service } from '../operations/types'

export function ServiceCatalogPage(){
  const services=useServices()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  if(services.isPending)return <Shell><LoadingState/></Shell>
  if(services.isError||!services.data)return <Shell><ErrorState onRetry={()=>void services.refetch()}/></Shell>
  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Catálogo de serviços</h1></div><InfoHelp title="Catálogo de serviços">Preço e duração alimentam o Assistente Virtual e o agendamento automático. O ALOVIA cria exemplos de interpretação quando um serviço é adicionado.</InfoHelp></section>
    <CreateService canEdit={canEdit}/>
    <div className="settings-list">{services.data.items.map(item=><ServiceEditor service={item} canEdit={canEdit} key={item.id}/>)}{!services.data.items.length&&<p className="settings-empty">Nenhum serviço cadastrado.</p>}</div>
  </Shell>
}

function CreateService({canEdit}:{canEdit:boolean}){
  const create=useCreateService()
  const [name,setName]=useState('')
  const [duration,setDuration]=useState(60)
  const [price,setPrice]=useState('')
  if(!canEdit)return null
  const submit=()=>{
    const parsed=Number(price.replace(',','.'))
    if(!name.trim()||!Number.isFinite(parsed))return
    create.mutate({name:name.trim(),duration_minutes:duration,price:parsed},{onSuccess:()=>{setName('');setDuration(60);setPrice('')}})
  }
  return <form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();submit()}}>
    <label>Novo serviço<input required minLength={2} value={name} onChange={event=>setName(event.target.value)} placeholder="Ex.: Limpeza de ar-condicionado"/></label>
    <label>Duração aproximada (min)<input required type="number" min={1} max={1440} value={duration} onChange={event=>setDuration(Number(event.target.value))}/></label>
    <label>Preço (R$)<input required inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)} placeholder="0,00"/></label>
    <p className="settings-note">Ao adicionar, o ALOVIA também cria frases de referência para reconhecer como clientes podem pedir este serviço.</p>
    {create.isError&&<MutationError/>}
    <button className="primary-button" disabled={create.isPending||!name.trim()||!price.trim()}><Plus size={18}/>{create.isPending?'Adicionando…':'Adicionar serviço'}</button>
  </form>
}

function ServiceEditor({service,canEdit}:{service:Service;canEdit:boolean}){
  const update=useUpdateService()
  const [name,setName]=useState(service.name)
  const [duration,setDuration]=useState(service.duration_minutes)
  const [price,setPrice]=useState(service.price==null?'':String(service.price))
  const [saved,setSaved]=useState(false)
  const save=()=>{
    const parsed=price.trim()===''?null:Number(price.replace(',','.'))
    if(parsed!==null&&!Number.isFinite(parsed))return
    setSaved(false)
    update.mutate({id:service.id,values:{name,duration_minutes:duration,price:parsed}},{onSuccess:()=>setSaved(true)})
  }
  return <article className="settings-editor">
    <div className="settings-editor__heading"><CalendarCog/><input aria-label="Nome do serviço" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/><StatusBadge tone={service.active?'success':'neutral'}>{service.active?'Ativo':'Inativo'}</StatusBadge></div>
    <div className="form-grid"><label>Duração aproximada (minutos)<input type="number" min={1} max={1440} value={duration} disabled={!canEdit} onChange={event=>setDuration(Number(event.target.value))}/></label><label>Preço (R$)<input inputMode="decimal" value={price} disabled={!canEdit} onChange={event=>setPrice(event.target.value)} placeholder="Definir preço"/></label></div>
    {service.active&&service.price==null&&<p className="settings-warning">Defina o preço para concluir a configuração inicial.</p>}
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Serviço salvo.</p>}
    {canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" disabled={update.isPending} onClick={()=>update.mutate({id:service.id,values:{active:!service.active}})}>{service.active?'Desativar':'Ativar'}</button><button className="compact-button" type="button" disabled={update.isPending} onClick={save}><Save size={16}/>{update.isPending?'Salvando…':'Salvar'}</button></div>}
  </article>
}

function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
