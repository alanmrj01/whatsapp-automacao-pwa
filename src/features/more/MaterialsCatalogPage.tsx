import { Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useBusiness, useCatalogItems, useCreateCatalogItem, useDeleteCatalogItem, useUpdateBusiness, useUpdateCatalogItem } from '../operations/api'
import type { CatalogItem } from '../operations/types'

const unitOptions=[
  {value:'metro',label:'Por metro'},
  {value:'unidade',label:'Por unidade'},
  {value:'kit',label:'Por kit'},
  {value:'valor fixo',label:'Valor fixo'},
] as const

type Draft={kind:'material'|'equipment';name:string;description:string;price:string;unit:string}

export function MaterialsCatalogPage(){
  const items=useCatalogItems()
  const business=useBusiness()
  const create=useCreateCatalogItem()
  const update=useUpdateCatalogItem()
  const remove=useDeleteCatalogItem()
  const updateBusiness=useUpdateBusiness()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const [drafts,setDrafts]=useState<Record<string,Draft>>({})
  const [adding,setAdding]=useState(false)
  const [newKind,setNewKind]=useState<'material'|'equipment'>('material')
  const [newName,setNewName]=useState('')
  const [newDescription,setNewDescription]=useState('')
  const [newPrice,setNewPrice]=useState('')
  const [newUnit,setNewUnit]=useState('unidade')
  const [addAttempted,setAddAttempted]=useState(false)
  const [saveAttempted,setSaveAttempted]=useState(false)
  const active=useMemo(()=>items.data?.items.filter(item=>item.active)??[],[items.data])

  useEffect(()=>{
    if(!items.data)return
    setDrafts(Object.fromEntries(items.data.items.filter(item=>item.active).map(item=>[item.id,toDraft(item)])))
  },[items.data])

  if(items.isPending||business.isPending)return <Shell><LoadingState/></Shell>
  if(items.isError||business.isError||!items.data||!business.data)return <Shell><ErrorState onRetry={()=>{void items.refetch();void business.refetch()}}/></Shell>
  const optedOut=business.data.materials_catalog_reviewed&&!active.length
  const draftInvalid=(id:string)=>{
    const draft=drafts[id]
    return !draft||!draft.kind||draft.name.trim().length<2||parseMoney(draft.price)===null||!draft.unit
  }
  const catalogInvalid=active.some(item=>draftInvalid(item.id))

  const toggleOptOut=async(checked:boolean)=>{
    if(checked){
      for(const item of active)await remove.mutateAsync(item.id)
      await updateBusiness.mutateAsync({materials_catalog_reviewed:true})
    }else{
      await updateBusiness.mutateAsync({materials_catalog_reviewed:false})
    }
    setSaveAttempted(false)
    await items.refetch()
  }
  const add=async()=>{
    setAddAttempted(true)
    const price=parseMoney(newPrice)
    if(!newKind||newName.trim().length<2||price===null||!newUnit)return
    await create.mutateAsync({kind:newKind,name:newName.trim(),description:newDescription.trim()||null,price,unit_label:newUnit})
    setNewKind('material');setNewName('');setNewDescription('');setNewPrice('');setNewUnit('unidade');setAdding(false);setAddAttempted(false)
  }
  const save=async()=>{
    setSaveAttempted(true)
    if(catalogInvalid)return
    for(const item of active){
      const draft=drafts[item.id]
      const price=parseMoney(draft.price)
      await update.mutateAsync({id:item.id,values:{kind:draft.kind,name:draft.name.trim(),description:draft.description.trim()||null,price:price!,unit_label:draft.unit}})
    }
    await updateBusiness.mutateAsync({materials_catalog_reviewed:true})
    setSaveAttempted(false)
  }

  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Catálogo de equipamentos e materiais</h1></div><InfoHelp title="Catálogo da empresa">Mantenha somente materiais e equipamentos cobrados separadamente. Você pode editar sugestões, excluir itens e criar novos.</InfoHelp></section>
    {canEdit&&<label className="settings-editor materials-opt-out">
      <span>Política de cobrança</span>
      <span className="settings-checkbox"><input type="checkbox" checked={optedOut} disabled={updateBusiness.isPending||remove.isPending} onChange={event=>void toggleOptOut(event.target.checked)}/><strong>Minha empresa não cobra materiais adicionais separadamente</strong></span>
      <small>A lista pode ficar vazia e a opção de adicionar itens continua disponível.</small>
    </label>}
    {canEdit&&<div className="catalog-toolbar"><button className="compact-button" type="button" onClick={()=>{setAdding(value=>!value);setAddAttempted(false)}}><Plus size={16}/>Adicionar material ou equipamento</button></div>}
    {canEdit&&adding&&<div className="settings-form settings-form--inline">
      <label><RequiredLabel>Tipo</RequiredLabel><select value={newKind} onChange={event=>setNewKind(event.target.value as 'material'|'equipment')}><option value="material">Material</option><option value="equipment">Equipamento</option></select></label>
      <label><RequiredLabel>Nome</RequiredLabel><input className={addAttempted&&newName.trim().length<2?'field-invalid':''} value={newName} onChange={event=>setNewName(event.target.value)} placeholder="Ex.: Tubulação adicional"/>{addAttempted&&newName.trim().length<2&&<small className="field-error">Informe o nome do item.</small>}</label>
      <label><span className="field-label-row"><span>Descrição</span><span className="optional-label">Opcional</span></span><input value={newDescription} onChange={event=>setNewDescription(event.target.value)} placeholder="Quando é usado ou cobrado"/></label>
      <div className="form-grid"><label><RequiredLabel>Preço (R$)</RequiredLabel><input className={addAttempted&&parseMoney(newPrice)===null?'field-invalid':''} inputMode="decimal" value={newPrice} onChange={event=>setNewPrice(event.target.value)} placeholder="0,00"/>{addAttempted&&parseMoney(newPrice)===null&&<small className="field-error">Informe o preço.</small>}</label><label><RequiredLabel>Unidade</RequiredLabel><select value={newUnit} onChange={event=>setNewUnit(event.target.value)}>{unitOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
      <button className="primary-button" type="button" disabled={create.isPending} onClick={()=>void add()}>{create.isPending?'Adicionando…':'Adicionar à lista'}</button>
    </div>}
    <div className="catalog-table-list">
      {active.map(item=>{
        const draft=drafts[item.id]??toDraft(item)
        const invalidName=draft.name.trim().length<2,invalidPrice=parseMoney(draft.price)===null,invalidUnit=!draft.unit
        return <article className="catalog-table-row catalog-table-row--material" key={item.id}>
          <div><RequiredLabel>Item</RequiredLabel><input aria-label="Nome" className={saveAttempted&&invalidName?'field-invalid':''} value={draft.name} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,name:event.target.value}}))}/><span className="catalog-kind">{draft.kind==='material'?'Material':'Equipamento'}</span>{saveAttempted&&invalidName&&<small className="field-error">Informe o nome do item.</small>}</div>
          <div><span className="field-label-row"><span>Descrição</span><span className="optional-label">Opcional</span></span><input aria-label="Descrição" value={draft.description} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,description:event.target.value}}))}/></div>
          <div className="catalog-material-fields">
            <label><RequiredLabel>Preço (R$)</RequiredLabel><input aria-label="Preço" className={saveAttempted&&invalidPrice?'field-invalid':''} inputMode="decimal" value={draft.price} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,price:event.target.value}}))} placeholder="0,00"/>{saveAttempted&&invalidPrice&&<small className="field-error">Informe o preço.</small>}</label>
            <label><RequiredLabel>Unidade</RequiredLabel><select aria-label="Unidade" className={saveAttempted&&invalidUnit?'field-invalid':''} value={draft.unit} disabled={!canEdit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,unit:event.target.value}}))}>{unitOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>{saveAttempted&&invalidUnit&&<small className="field-error">Selecione a unidade.</small>}</label>
          </div>
          {canEdit&&<button className="catalog-icon-danger" type="button" aria-label={`Excluir ${item.name}`} disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}><Trash2 size={17}/></button>}
        </article>
      })}
      {!active.length&&<p className="settings-empty">{optedOut?'Nenhum material é cobrado separadamente. Você pode adicionar um item quando precisar.':'Nenhum material ou equipamento cadastrado.'}</p>}
    </div>
    {saveAttempted&&catalogInvalid&&<p className="form-error" role="alert">Preencha todos os campos obrigatórios de todos os itens antes de salvar.</p>}
    {(create.isError||update.isError||remove.isError||updateBusiness.isError)&&<MutationError/>}
    {(update.isSuccess||updateBusiness.isSuccess)&&!catalogInvalid&&<p className="form-success">Catálogo salvo.</p>}
    {canEdit&&!!active.length&&<button className="primary-button" type="button" disabled={update.isPending} onClick={()=>void save()}><Save size={17}/>{update.isPending?'Salvando…':'Salvar itens'}</button>}
  </Shell>
}

function toDraft(item:CatalogItem):Draft{return {kind:item.kind,name:item.name,description:item.description??'',price:item.price==null?'':String(item.price),unit:item.unit_label??'unidade'}}
function parseMoney(value:string){if(!value.trim())return null;const parsed=Number(value.replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:null}
function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Revise os dados e tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
