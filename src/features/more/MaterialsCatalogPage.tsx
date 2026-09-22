import { PackagePlus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useCatalogItems, useCreateCatalogItem, useDeleteCatalogItem, useUpdateCatalogItem } from '../operations/api'
import type { CatalogItem } from '../operations/types'

export function MaterialsCatalogPage(){
  const items=useCatalogItems()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  if(items.isPending)return <Shell><LoadingState/></Shell>
  if(items.isError||!items.data)return <Shell><ErrorState onRetry={()=>void items.refetch()}/></Shell>
  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Catálogo de equipamentos e materiais</h1></div><InfoHelp title="Catálogo da empresa">Adicione somente materiais e equipamentos cobrados à parte. Nome e preço são obrigatórios; descrição é opcional.</InfoHelp></section>
    <CreateItem canEdit={canEdit}/>
    <div className="catalog-table-list" role="table" aria-label="Materiais e equipamentos">
      <div className="catalog-table-head" role="row"><span>Item</span><span>Descrição</span><span>Preço</span><span>Ações</span></div>
      {items.data.items.map(item=><ItemRow item={item} canEdit={canEdit} key={item.id}/>)}
      {!items.data.items.length&&<p className="settings-empty">Nenhum material ou equipamento cadastrado.</p>}
    </div>
  </Shell>
}

function CreateItem({canEdit}:{canEdit:boolean}){
  const create=useCreateCatalogItem()
  const [kind,setKind]=useState<'material'|'equipment'>('material')
  const [name,setName]=useState('')
  const [description,setDescription]=useState('')
  const [price,setPrice]=useState('')
  if(!canEdit)return null
  const submit=()=>{
    const parsed=Number(price.replace(',','.'))
    if(!name.trim()||!Number.isFinite(parsed))return
    create.mutate({kind,name:name.trim(),description:description.trim()||null,price:parsed,unit_label:null},{onSuccess:()=>{setName('');setDescription('');setPrice('')}})
  }
  return <form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();submit()}}>
    <label>Tipo<select value={kind} onChange={event=>setKind(event.target.value as 'material'|'equipment')}><option value="material">Material</option><option value="equipment">Equipamento</option></select></label>
    <label>Nome<input required value={name} onChange={event=>setName(event.target.value)} placeholder="Ex.: Metro adicional de tubulação"/></label>
    <label>Descrição <span className="optional-label">opcional</span><input value={description} onChange={event=>setDescription(event.target.value)} placeholder="Quando é usado ou cobrado"/></label>
    <label>Preço (R$)<input required inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)} placeholder="0,00"/></label>
    {create.isError&&<MutationError/>}
    <button className="primary-button" disabled={create.isPending||!name.trim()||!price.trim()}><PackagePlus size={18}/>{create.isPending?'Adicionando…':'Adicionar item'}</button>
  </form>
}

function ItemRow({item,canEdit}:{item:CatalogItem;canEdit:boolean}){
  const update=useUpdateCatalogItem(),remove=useDeleteCatalogItem()
  const [name,setName]=useState(item.name)
  const [description,setDescription]=useState(item.description??'')
  const [price,setPrice]=useState(item.price==null?'':String(item.price))
  const [saved,setSaved]=useState(false)
  const save=()=>{
    const parsed=price.trim()===''?null:Number(price.replace(',','.'))
    if(parsed!==null&&!Number.isFinite(parsed))return
    setSaved(false)
    update.mutate({id:item.id,values:{name,description:description.trim()||null,price:parsed}},{onSuccess:()=>setSaved(true)})
  }
  return <article className={item.active?'catalog-table-row':'catalog-table-row is-inactive'} role="row">
    <div><span className="catalog-kind">{item.kind==='material'?'Material':'Equipamento'}</span><input aria-label="Nome" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/>{item.preset_key&&<small>Sugestão do ALOVIA</small>}</div>
    <div><input aria-label="Descrição" value={description} disabled={!canEdit} onChange={event=>setDescription(event.target.value)} placeholder="Descrição opcional"/></div>
    <div><input aria-label="Preço" inputMode="decimal" value={price} disabled={!canEdit} onChange={event=>setPrice(event.target.value)} placeholder="Definir preço"/>{item.unit_label&&<small>por {item.unit_label}</small>}</div>
    <div className="catalog-row-actions">
      {saved&&<span className="form-success">Salvo</span>}
      {canEdit&&<button className="compact-button" type="button" disabled={update.isPending} onClick={save}><Save size={15}/></button>}
      {canEdit&&<button className="compact-button" type="button" disabled={update.isPending||(!item.active&&!price.trim())} onClick={()=>update.mutate({id:item.id,values:{active:!item.active}})}>{item.active?'Desativar':'Usar item'}</button>}
      {canEdit&&!item.preset_key&&<button className="danger-button" type="button" disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}><Trash2 size={15}/></button>}
    </div>
    {(update.isError||remove.isError)&&<MutationError/>}
  </article>
}

function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
