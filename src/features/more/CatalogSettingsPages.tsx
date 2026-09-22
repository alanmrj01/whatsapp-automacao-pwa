import { CalendarCog, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import {
  useCatalogItems,
  useCreateCatalogItem,
  useCreateService,
  useDeleteCatalogItem,
  useServices,
  useUpdateCatalogItem,
  useUpdateService,
} from '../operations/api'
import type { CatalogItem, Service } from '../operations/types'

function useCanConfigure() {return canConfigureWhatsApp(useAuth().membership?.role)}

export function ServiceCatalogPage() {
  const query=useServices()
  const canEdit=useCanConfigure()
  if(query.isPending)return <SettingsShell><LoadingState/></SettingsShell>
  if(query.isError)return <SettingsShell><ErrorState onRetry={()=>void query.refetch()}/></SettingsShell>
  return <SettingsShell>
    <PageHeading title="Catálogo de serviços" help="Cadastre os serviços que sua empresa oferece. Nome, duração e preço alimentam o Assistente Virtual e o agendamento automático."/>
    <ServiceCreator canEdit={canEdit}/>
    <div className="settings-list">{query.data?.items.map(item=><ServiceEditor service={item} canEdit={canEdit} key={item.id}/>)}{!query.data?.items.length&&<p className="settings-empty">Nenhum serviço cadastrado.</p>}</div>
  </SettingsShell>
}

function ServiceCreator({canEdit}:{canEdit:boolean}) {
  const create=useCreateService()
  const [name,setName]=useState('')
  const [duration,setDuration]=useState(60)
  const [price,setPrice]=useState('')
  const submit=(event:FormEvent)=>{
    event.preventDefault()
    const numeric=Number(price.replace(',','.'))
    if(!Number.isFinite(numeric)||numeric<=0)return
    create.mutate({name,duration_minutes:duration,price:numeric},{onSuccess:()=>{setName('');setPrice('')}})
  }
  if(!canEdit)return null
  return <form className="settings-form settings-form--inline" onSubmit={submit}>
    <label>Novo serviço<input required minLength={2} value={name} onChange={event=>setName(event.target.value)} placeholder="Ex.: Limpeza de ar-condicionado"/></label>
    <label>Duração (min)<input required type="number" min={1} max={1440} value={duration} onChange={event=>setDuration(Number(event.target.value))}/></label>
    <label>Preço<input required inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)} placeholder="Ex.: 180,00"/></label>
    {create.isError&&<MutationError/>}
    <button className="primary-button" disabled={create.isPending}><Plus size={18}/>{create.isPending?'Adicionando…':'Adicionar serviço'}</button>
  </form>
}

function ServiceEditor({service,canEdit}:{service:Service;canEdit:boolean}) {
  const update=useUpdateService()
  const [name,setName]=useState(service.name)
  const [duration,setDuration]=useState(service.duration_minutes)
  const [price,setPrice]=useState(service.price===null?'':String(service.price))
  const [saved,setSaved]=useState(false)
  const save=()=>{
    const numeric=Number(price.replace(',','.'))
    if(!Number.isFinite(numeric)||numeric<=0)return
    setSaved(false)
    update.mutate({id:service.id,values:{name,duration_minutes:duration,price:numeric}},{onSuccess:()=>setSaved(true)})
  }
  return <article className="settings-editor">
    <div className="settings-editor__heading"><CalendarCog/><input aria-label="Nome do serviço" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/><StatusBadge tone={service.active?'success':'neutral'}>{service.active?'Ativo':'Inativo'}</StatusBadge></div>
    <div className="form-grid">
      <label>Duração (minutos)<input type="number" min={1} max={1440} value={duration} disabled={!canEdit} onChange={event=>setDuration(Number(event.target.value))}/></label>
      <label>Preço<input inputMode="decimal" value={price} disabled={!canEdit} onChange={event=>setPrice(event.target.value)}/></label>
    </div>
    <details className="settings-advanced">
      <summary>Como o ALOVIA reconhece este serviço</summary>
      <p className="settings-note">O ALOVIA gera automaticamente formas de interpretar pedidos dos clientes. Você poderá ajustar exemplos no Assistente Virtual.</p>
      <div className="semantic-example-chips">{service.interpretation_examples.slice(0,8).map(example=><span key={example}>{example}</span>)}</div>
    </details>
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Serviço salvo.</p>}
    {canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" disabled={update.isPending} onClick={()=>update.mutate({id:service.id,values:{active:!service.active}})}>{service.active?'Desativar':'Ativar'}</button><button className="compact-button" type="button" disabled={update.isPending} onClick={save}><Save size={16}/>{update.isPending?'Salvando…':'Salvar'}</button></div>}
  </article>
}

export function MaterialCatalogPage() {
  const query=useCatalogItems()
  const canEdit=useCanConfigure()
  if(query.isPending)return <SettingsShell><LoadingState/></SettingsShell>
  if(query.isError)return <SettingsShell><ErrorState onRetry={()=>void query.refetch()}/></SettingsShell>
  return <SettingsShell>
    <PageHeading title="Catálogo da empresa" help="Adicione somente materiais e equipamentos cobrados à parte. Nome e preço são obrigatórios; descrição é opcional."/>
    <p className="settings-note">Itens sugeridos do segmento começam desativados e sem preço. O ALOVIA nunca inventa valores para sua empresa.</p>
    <MaterialCreator canEdit={canEdit}/>
    <div className="catalog-table" role="table" aria-label="Materiais e equipamentos">
      <div className="catalog-table__head" role="row"><span>Material ou equipamento</span><span>Descrição</span><span>Preço</span><span>Ações</span></div>
      {query.data?.items.map(item=><MaterialRow item={item} canEdit={canEdit} key={item.id}/>)}
    </div>
  </SettingsShell>
}

function MaterialCreator({canEdit}:{canEdit:boolean}) {
  const create=useCreateCatalogItem()
  const [name,setName]=useState('')
  const [description,setDescription]=useState('')
  const [price,setPrice]=useState('')
  const [unit,setUnit]=useState<'unit'|'meter'>('unit')
  const submit=(event:FormEvent)=>{
    event.preventDefault()
    const numeric=Number(price.replace(',','.'))
    if(!Number.isFinite(numeric)||numeric<0)return
    create.mutate({name,description:description.trim()||null,price:numeric,unit,active:true},{onSuccess:()=>{setName('');setDescription('');setPrice('');setUnit('unit')}})
  }
  if(!canEdit)return null
  return <form className="settings-form catalog-create-form" onSubmit={submit}>
    <label>Nome<input required minLength={2} value={name} onChange={event=>setName(event.target.value)}/></label>
    <label>Descrição (opcional)<input value={description} onChange={event=>setDescription(event.target.value)}/></label>
    <label>Preço<input required inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)}/></label>
    <label>Cobrança<select value={unit} onChange={event=>setUnit(event.target.value as 'unit'|'meter')}><option value="unit">Por unidade</option><option value="meter">Por metro</option></select></label>
    {create.isError&&<MutationError/>}
    <button className="primary-button" disabled={create.isPending}><Plus size={18}/>Adicionar item</button>
  </form>
}

function MaterialRow({item,canEdit}:{item:CatalogItem;canEdit:boolean}) {
  const update=useUpdateCatalogItem()
  const remove=useDeleteCatalogItem()
  const [name,setName]=useState(item.name)
  const [description,setDescription]=useState(item.description??'')
  const [price,setPrice]=useState(item.price===null?'':String(item.price))
  const [active,setActive]=useState(item.active)
  const [saved,setSaved]=useState(false)
  const save=()=>{
    const numeric=price.trim()===''?null:Number(price.replace(',','.'))
    if(active&&(numeric===null||!Number.isFinite(numeric)))return
    setSaved(false)
    update.mutate({id:item.id,values:{name,description:description.trim()||null,price:numeric,active}},{onSuccess:()=>setSaved(true)})
  }
  return <div className="catalog-table__row" role="row">
    <label><span className="sr-only">Nome</span><input value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/></label>
    <label><span className="sr-only">Descrição</span><input value={description} disabled={!canEdit} onChange={event=>setDescription(event.target.value)}/></label>
    <label><span className="sr-only">Preço</span><input inputMode="decimal" value={price} disabled={!canEdit} onChange={event=>setPrice(event.target.value)} placeholder="Definir preço"/><small>{item.unit==='meter'?'por metro':'por unidade'}</small></label>
    <div className="catalog-table__actions">
      <label className="check-row"><input type="checkbox" checked={active} disabled={!canEdit} onChange={event=>setActive(event.target.checked)}/>Usar</label>
      {canEdit&&<button className="compact-button" type="button" disabled={update.isPending} onClick={save}><Save size={15}/>{update.isPending?'Salvando…':'Salvar'}</button>}
      {canEdit&&!item.preset_key&&<button className="danger-button" type="button" disabled={remove.isPending} onClick={()=>remove.mutate(item.id)} aria-label={`Excluir ${item.name}`}><Trash2 size={15}/></button>}
      {saved&&<small className="form-success">Salvo.</small>}
    </div>
  </div>
}

function PageHeading({title,help}:{title:string;help:string}) {return <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>{title}</h1></div><InfoHelp title={title}>{help}</InfoHelp></section>}
function SettingsShell({children}:{children:React.ReactNode}) {return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
function MutationError() {return <p className="form-error" role="alert">Não foi possível salvar. Revise os dados e tente novamente.</p>}
