import { Building2, CalendarCog, Clock3, HeartHandshake, PackageOpen, UsersRound, Wrench } from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge'
import { demoBusinessName } from '../../demo/operationalDemo'
import { DemoInsight } from '../access/DemoInsight'
import { useUpgradePrompt } from '../access/upgradePromptContext'

export type DemoSettingsKind = 'company'|'team'|'hours'|'services'|'materials'|'assistant'|'preventives'|'agenda'

const details:Record<DemoSettingsKind,{eyebrow:string;title:string;description:string;feature:string}>={
  company:{eyebrow:'Empresa',title:'Dados da empresa',description:'Informações usadas para organizar a operação e os atendimentos.',feature:'Editar os dados da empresa'},
  team:{eyebrow:'Empresa',title:'Técnicos',description:'Equipe disponível para executar os serviços.',feature:'Gerenciar técnicos'},
  hours:{eyebrow:'Empresa',title:'Horários de funcionamento',description:'Períodos usados para consultar disponibilidade.',feature:'Alterar horários de funcionamento'},
  services:{eyebrow:'Catálogo',title:'Catálogo de serviços',description:'Serviços que podem ser identificados e agendados.',feature:'Editar o catálogo de serviços'},
  materials:{eyebrow:'Catálogo',title:'Equipamentos e materiais',description:'Itens que podem complementar uma proposta de atendimento.',feature:'Editar equipamentos e materiais'},
  assistant:{eyebrow:'Atendimento',title:'Assistente Virtual',description:'Regras visíveis aplicadas durante o atendimento.',feature:'Configurar o Assistente Virtual'},
  preventives:{eyebrow:'Relacionamento',title:'Preventivas',description:'Próximos contatos após serviços concluídos.',feature:'Gerenciar contatos preventivos'},
  agenda:{eyebrow:'Agenda',title:'Agenda e disponibilidade',description:'Preferências usadas para montar horários possíveis.',feature:'Configurar agenda e disponibilidade'},
}

export function DemoSettingsPreviewPage({kind}:{kind:DemoSettingsKind}) {
  const {openUpgrade}=useUpgradePrompt()
  const meta=details[kind]
  return <div className="page-stack operational-page compact-page settings-page demo-settings-preview" data-demo-preview={kind}>
    <section className="operational-heading"><div><span className="eyebrow">{meta.eyebrow}</span><h1>{meta.title}</h1><p>{meta.description}</p></div><StatusBadge tone="info">Somente leitura</StatusBadge></section>
    <PreviewInsight kind={kind}/>
    <PreviewContent kind={kind}/>
    <button className="primary-button demo-preview-action" type="button" onClick={()=>openUpgrade(meta.feature)}>Usar com os dados da minha empresa</button>
  </div>
}

function PreviewInsight({kind}:{kind:DemoSettingsKind}) {
  if(kind==='preventives')return <DemoInsight>O próximo serviço não precisa depender da sua memória.</DemoInsight>
  if(kind==='assistant')return <DemoInsight>Você define as regras. A Alovia conduz o atendimento dentro delas.</DemoInsight>
  if(kind==='services'||kind==='hours')return <DemoInsight>É daqui que a Alovia tira as informações para atender e agendar sem improvisar.</DemoInsight>
  return null
}

function PreviewContent({kind}:{kind:DemoSettingsKind}) {
  if(kind==='company')return <form className="settings-form" aria-label="Prévia dos dados da empresa"><label>Nome da empresa<input readOnly value={demoBusinessName}/></label><label>Responsável<input readOnly value="João Martins"/></label><label>Endereço operacional<input readOnly value="Zona Leste, São José dos Campos - SP"/></label><label>Fuso horário<input readOnly value="America/Sao_Paulo"/></label></form>
  if(kind==='team')return <PreviewList icon={UsersRound} items={[['João Martins','Técnico · Instalação e manutenção'],['Marina Costa','Técnica · Higienização e visita técnica']]}/>
  if(kind==='hours')return <PreviewList icon={Clock3} items={[['Segunda a sexta','08:00–18:00'],['Sábado','08:00–12:00'],['Domingo','Fechado']]}/>
  if(kind==='services')return <PreviewList icon={Wrench} items={[['Instalação','180 min · a partir de R$ 650,00'],['Manutenção','90 min · preço após avaliação'],['Higienização','90 min · R$ 220,00'],['Visita técnica','60 min · R$ 120,00']]}/>
  if(kind==='materials')return <PreviewList icon={PackageOpen} items={[['Tubulação de cobre','Cobrado por metro utilizado'],['Suporte para condensadora','Unidade'],['Split inverter 12.000 BTUs','Equipamento demonstrativo']]}/>
  if(kind==='assistant')return <form className="settings-form" aria-label="Prévia das regras do Assistente Virtual"><label className="check-row"><input type="checkbox" checked readOnly/>Assistente Virtual ativo</label><label>Retomar após atendimento humano<input readOnly value="36 horas"/></label><label>Mensagem inicial<textarea readOnly rows={3} value="Olá. Como posso ajudar com seu ar-condicionado?"/></label><label>Quando precisa de atendimento humano<textarea readOnly rows={3} value="Vou encaminhar seu atendimento para a equipe continuar por aqui."/></label></form>
  if(kind==='preventives')return <PreviewList icon={HeartHandshake} items={[['Carlos Mendes','Higienização · contato em 18 dias'],['Juliana Rocha','Revisão preventiva · contato em 42 dias'],['Loja Centro','Manutenção programada · respondeu']]}/>
  return <><form className="settings-form" aria-label="Prévia das preferências de agenda"><label>Intervalo entre serviços<input readOnly value="30 minutos"/></label><label>Tempo de preparação<input readOnly value="20 minutos"/></label><label>Antecedência mínima<input readOnly value="Automático pelo Alovia"/></label><label>Deslocamento<input readOnly value="Calculado pela rota do atendimento"/></label></form><PreviewList icon={CalendarCog} items={[['Disponibilidade','Seg–sex, 08:00–18:00'],['Duração','Definida por serviço'],['Equipe','João e Marina']]}/></>
}

function PreviewList({icon:Icon,items}:{icon:typeof Building2;items:Array<[string,string]>}) {
  return <div className="settings-list">{items.map(([title,subtitle])=><article className="settings-row" key={title}><Icon/><div><strong>{title}</strong><span>{subtitle}</span></div><StatusBadge tone="info">Exemplo</StatusBadge></article>)}</div>
}
