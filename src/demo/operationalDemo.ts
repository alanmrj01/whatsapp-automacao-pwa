export type DemoConversation = {
  id: string
  customer: string
  lastMessage: string
  time: string
  status: 'waiting' | 'in_progress' | 'answered'
  assignee: string
  unread: number
  priority: boolean
  phone: string
  assistantEnabled: boolean
  appointmentId?: string
  messages: DemoMessage[]
}

export type DemoMessage = {
  id: string
  direction: 'customer' | 'assistant' | 'system'
  body: string
  time: string
}

export type DemoAppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type DemoAppointment = {
  id: string
  date: string
  time: string
  customer: string
  phone: string
  service: string
  technician: string
  status: DemoAppointmentStatus
  rescheduled?: boolean
  notes: string
  conversationId: string
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shiftDemoDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

export function demoDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`)
  const weekday = new Intl.DateTimeFormat('pt-BR', {weekday:'long'}).format(date)
  const dayAndMonth = new Intl.DateTimeFormat('pt-BR', {day:'2-digit', month:'2-digit'}).format(date)
  return `${weekday}, ${dayAndMonth}`
}

export const demoToday = localDateKey(new Date())
export const demoTomorrow = shiftDemoDate(demoToday, 1)
export const demoBookingDate2 = shiftDemoDate(demoToday, 5)
export const demoRescheduleDate = shiftDemoDate(demoToday, 6)
export const demoBusinessName = 'PEMA Ar Condicionado'

const demoTodayLabel = demoDateLabel(demoToday)
const demoBookingLabel2 = demoDateLabel(demoBookingDate2)
const demoRescheduleLabel = demoDateLabel(demoRescheduleDate)

export const demoServiceMix = {
  installation: 23,
  maintenance: 45,
  cleaning: 15,
  gasCharge: 17,
} as const

export const demoConversations: DemoConversation[] = [
  {id:'conversation-1',customer:'Carlos Mendes',phone:'(12) 99941-0101',assistantEnabled:true,lastMessage:'Qual é o CEP do endereço?',time:'09:18',status:'waiting',assignee:'Alovia',unread:1,priority:true,messages:[
    {id:'1-1',direction:'customer',body:'Boa tarde, meu ar liga mas não está gelando.',time:'09:08'},
    {id:'1-2',direction:'assistant',body:'Boa tarde. É um aparelho split?',time:'09:09'},
    {id:'1-3',direction:'customer',body:'Sim, 12 mil BTUs.',time:'09:11'},
    {id:'1-4',direction:'assistant',body:'Entendi. Ele liga normalmente e apenas não refrigera ou também apresenta ruído ou vazamento?',time:'09:12'},
    {id:'1-5',direction:'customer',body:'Liga normal e não faz barulho. Só parou de gelar.',time:'09:15'},
    {id:'1-6',direction:'assistant',body:'Certo. Para verificar atendimento e deslocamento, qual é o CEP do endereço?',time:'09:18'},
  ]},
  {id:'conversation-2',customer:'Ana Paula',phone:'(12) 99872-0202',assistantEnabled:true,lastMessage:'O ponto elétrico já está pronto?',time:'09:04',status:'in_progress',assignee:'Alovia',unread:0,priority:false,messages:[
    {id:'2-1',direction:'customer',body:'Oi, quero instalar um ar de 18 mil na sala.',time:'08:54'},
    {id:'2-2',direction:'assistant',body:'Olá. O aparelho já foi comprado?',time:'08:55'},
    {id:'2-3',direction:'customer',body:'Já, é um split inverter.',time:'08:57'},
    {id:'2-4',direction:'assistant',body:'Perfeito. O ponto elétrico e a passagem da tubulação já estão preparados?',time:'08:58'},
    {id:'2-5',direction:'customer',body:'A tubulação não. Sobre o ponto elétrico eu preciso confirmar.',time:'09:02'},
    {id:'2-6',direction:'assistant',body:'Sem problema. Quando confirmar o ponto elétrico, me informe também o CEP para eu verificar a visita.',time:'09:04'},
  ]},
  {id:'conversation-3',customer:'Juliana Rocha',phone:'(12) 99763-0303',assistantEnabled:true,lastMessage:`Agendamento confirmado para ${demoBookingLabel2}, às 14h30.`,time:'08:42',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-2',messages:[
    {id:'3-1',direction:'customer',body:'Bom dia, queria fazer uma limpeza no ar do quarto.',time:'08:26'},
    {id:'3-2',direction:'assistant',body:'Bom dia. É um aparelho split? Quantos aparelhos precisam de higienização?',time:'08:28'},
    {id:'3-3',direction:'customer',body:'É split, só um.',time:'08:31'},
    {id:'3-4',direction:'assistant',body:`Tenho disponibilidade para ${demoBookingLabel2}, às 14h30. Esse horário funciona para você?`,time:'08:34'},
    {id:'3-5',direction:'customer',body:'Funciona. O CEP é 12230-000.',time:'08:38'},
    {id:'3-6',direction:'assistant',body:`Certo. Confirma a higienização para ${demoBookingLabel2}, às 14h30, nesse endereço?`,time:'08:39'},
    {id:'3-7',direction:'customer',body:'Confirmo.',time:'08:41'},
    {id:'3-8',direction:'system',body:`Agendamento confirmado para ${demoBookingLabel2}, às 14h30, com João.`,time:'08:42'},
  ]},
  {id:'conversation-4',customer:'Padaria Pão Quente',phone:'(12) 99654-0404',assistantEnabled:true,lastMessage:'Qual é o CEP e o número da padaria?',time:'08:23',status:'waiting',assignee:'Alovia',unread:1,priority:false,messages:[
    {id:'4-1',direction:'customer',body:'Preciso de um orçamento para os ares da padaria.',time:'08:12'},
    {id:'4-2',direction:'assistant',body:'Posso organizar uma visita técnica. É para manutenção, instalação ou ainda precisa avaliar o serviço?',time:'08:14'},
    {id:'4-3',direction:'customer',body:'Precisa avaliar. Alguns não gelam direito.',time:'08:16'},
    {id:'4-4',direction:'assistant',body:'Entendi. Quantos equipamentos precisam ser avaliados?',time:'08:20'},
    {id:'4-5',direction:'customer',body:'São quatro aparelhos, todos na mesma padaria.',time:'08:22'},
    {id:'4-6',direction:'assistant',body:'Certo. Qual é o CEP e o número da padaria para eu verificar a visita técnica?',time:'08:23'},
  ]},
  {id:'conversation-5',customer:'Loja Centro',phone:'(12) 99545-0505',assistantEnabled:true,lastMessage:`Agendamento confirmado para ${demoTodayLabel}, às 11h30.`,time:'5 dias atrás',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-1',messages:[
    {id:'5-1',direction:'customer',body:'Olá, preciso fazer manutenção preventiva em três aparelhos da loja.',time:'5 dias atrás · 16:20'},
    {id:'5-2',direction:'assistant',body:'Olá. Os três aparelhos ficam no mesmo endereço?',time:'5 dias atrás · 16:21'},
    {id:'5-3',direction:'customer',body:'Sim. Fica no Centro.',time:'5 dias atrás · 16:23'},
    {id:'5-4',direction:'assistant',body:'Qual é o CEP e o número do local?',time:'5 dias atrás · 16:24'},
    {id:'5-5',direction:'customer',body:'12210-000, número 120.',time:'5 dias atrás · 16:26'},
    {id:'5-6',direction:'assistant',body:`Há disponibilidade para ${demoTodayLabel}, às 11h30. Posso confirmar?`,time:'5 dias atrás · 16:27'},
    {id:'5-7',direction:'customer',body:'Pode.',time:'5 dias atrás · 16:28'},
    {id:'5-8',direction:'system',body:`Agendamento confirmado para ${demoTodayLabel}, às 11h30, com Marina.`,time:'5 dias atrás · 16:29'},
  ]},
  {id:'conversation-6',customer:'Rafael Lima',phone:'(12) 99436-0606',assistantEnabled:true,lastMessage:`Reagendamento confirmado para ${demoRescheduleLabel}, às 10h.`,time:'Ontem',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-3',messages:[
    {id:'6-1',direction:'customer',body:'Boa tarde. Não vou conseguir receber o técnico na data marcada.',time:'Ontem 15:10'},
    {id:'6-2',direction:'assistant',body:'Tudo bem. Você quer reagendar o atendimento?',time:'Ontem 15:11'},
    {id:'6-3',direction:'customer',body:'Quero. Pode ser na próxima semana pela manhã?',time:'Ontem 15:13'},
    {id:'6-4',direction:'assistant',body:`Há disponibilidade para ${demoRescheduleLabel}, às 10h. O endereço continua o mesmo?`,time:'Ontem 15:14'},
    {id:'6-5',direction:'customer',body:'Sim, o mesmo endereço.',time:'Ontem 15:16'},
    {id:'6-6',direction:'assistant',body:`Confirma o reagendamento para ${demoRescheduleLabel}, às 10h?`,time:'Ontem 15:17'},
    {id:'6-7',direction:'customer',body:'Confirmo.',time:'Ontem 15:18'},
    {id:'6-8',direction:'system',body:`Reagendamento confirmado para ${demoRescheduleLabel}, às 10h, com Marina.`,time:'Ontem 15:19'},
  ]},
]

export const demoAppointments: DemoAppointment[] = [
  {id:'appointment-1',date:demoToday,time:'08:00',customer:'Mercado São Lucas',phone:'(12) 99110-1010',service:'Manutenção preventiva',technician:'Marina',status:'confirmed',notes:'Preventiva em dois splits da área de vendas.',conversationId:'conversation-5'},
  {id:'appointment-2',date:demoToday,time:'10:00',customer:'Carlos Mendes',phone:'(12) 99941-0101',service:'Diagnóstico técnico',technician:'João',status:'confirmed',notes:'Equipamento liga, mas não está refrigerando.',conversationId:'conversation-1'},
  {id:'appointment-3',date:demoToday,time:'13:30',customer:'Clínica Sorriso',phone:'(12) 99110-1313',service:'Higienização',technician:'Marina',status:'confirmed',notes:'Higienização de dois aparelhos split.',conversationId:'conversation-3'},
  {id:'appointment-4',date:demoToday,time:'16:00',customer:'Loja Centro',phone:'(12) 99545-0505',service:'Manutenção preventiva',technician:'João',status:'confirmed',notes:'Revisar três aparelhos no endereço informado.',conversationId:'conversation-5'},

  {id:'appointment-5',date:demoTomorrow,time:'08:30',customer:'Ana Paula',phone:'(12) 99872-0202',service:'Instalação de split',technician:'João',status:'confirmed',notes:'Instalação de split inverter de 18 mil BTUs.',conversationId:'conversation-2'},
  {id:'appointment-6',date:demoTomorrow,time:'11:00',customer:'Padaria Pão Quente',phone:'(12) 99654-0404',service:'Visita técnica',technician:'Marina',status:'confirmed',notes:'Avaliar quatro equipamentos da padaria.',conversationId:'conversation-4'},
  {id:'appointment-7',date:demoTomorrow,time:'15:30',customer:'Residencial Oliveira',phone:'(12) 99110-1515',service:'Carga de gás',technician:'João',status:'pending',notes:'Confirmar diagnóstico antes da carga.',conversationId:'conversation-1'},

  {id:'appointment-8',date:shiftDemoDate(demoToday,2),time:'09:00',customer:'Escritório Vale',phone:'(12) 99110-2020',service:'Higienização',technician:'Marina',status:'confirmed',notes:'Higienização de três evaporadoras.',conversationId:'conversation-3'},
  {id:'appointment-9',date:shiftDemoDate(demoToday,2),time:'14:00',customer:'Rafael Lima',phone:'(12) 99436-0606',service:'Visita técnica',technician:'João',status:'confirmed',notes:'Verificar ruído informado pelo cliente.',conversationId:'conversation-6'},

  {id:'appointment-10',date:shiftDemoDate(demoToday,3),time:'08:00',customer:'Academia Movimento',phone:'(12) 99110-3030',service:'Manutenção preventiva',technician:'Marina',status:'confirmed',notes:'Preventiva programada em quatro equipamentos.',conversationId:'conversation-5'},
  {id:'appointment-11',date:shiftDemoDate(demoToday,3),time:'10:30',customer:'Juliana Rocha',phone:'(12) 99763-0303',service:'Higienização',technician:'João',status:'confirmed',notes:'Higienização de um aparelho split.',conversationId:'conversation-3'},
  {id:'appointment-12',date:shiftDemoDate(demoToday,3),time:'13:00',customer:'Farmácia Central',phone:'(12) 99110-3131',service:'Diagnóstico técnico',technician:'Marina',status:'confirmed',notes:'Avaliar baixa refrigeração no salão.',conversationId:'conversation-1'},
  {id:'appointment-13',date:shiftDemoDate(demoToday,3),time:'16:30',customer:'Condomínio Horizonte',phone:'(12) 99110-3232',service:'Limpeza preventiva',technician:'João',status:'pending',notes:'Atendimento na sala administrativa.',conversationId:'conversation-4'},

  {id:'appointment-14',date:demoBookingDate2,time:'08:30',customer:'Restaurante da Praça',phone:'(12) 99110-5050',service:'Manutenção corretiva',technician:'Marina',status:'confirmed',notes:'Equipamento da cozinha com baixa refrigeração.',conversationId:'conversation-1'},
  {id:'appointment-15',date:demoBookingDate2,time:'11:00',customer:'Ótica Visão',phone:'(12) 99110-5151',service:'Higienização',technician:'João',status:'confirmed',notes:'Higienização preventiva do salão.',conversationId:'conversation-3'},
  {id:'appointment-16',date:demoBookingDate2,time:'14:30',customer:'Juliana Rocha',phone:'(12) 99763-0303',service:'Higienização',technician:'João',status:'confirmed',notes:'Higienização de um aparelho split.',conversationId:'conversation-3'},
  {id:'appointment-17',date:demoBookingDate2,time:'17:00',customer:'Pet Shop Amigo',phone:'(12) 99110-5252',service:'Visita técnica',technician:'Marina',status:'confirmed',notes:'Avaliar aparelho da recepção.',conversationId:'conversation-4'},

  {id:'appointment-18',date:demoRescheduleDate,time:'08:00',customer:'Café Estação',phone:'(12) 99110-6060',service:'Instalação de split',technician:'João',status:'confirmed',notes:'Instalação em área de atendimento.',conversationId:'conversation-2'},
  {id:'appointment-19',date:demoRescheduleDate,time:'10:00',customer:'Rafael Lima',phone:'(12) 99436-0606',service:'Visita técnica',technician:'Marina',status:'confirmed',rescheduled:true,notes:'Reagendado a pedido do cliente; endereço mantido.',conversationId:'conversation-6'},
  {id:'appointment-20',date:demoRescheduleDate,time:'14:30',customer:'Salão Bella',phone:'(12) 99110-6262',service:'Carga de gás',technician:'João',status:'pending',notes:'Diagnóstico prévio já realizado.',conversationId:'conversation-1'},

  {id:'appointment-21',date:shiftDemoDate(demoToday,8),time:'08:30',customer:'Hotel Jardim',phone:'(12) 99110-8080',service:'Manutenção preventiva',technician:'Marina',status:'confirmed',notes:'Preventiva nos equipamentos da recepção.',conversationId:'conversation-5'},
  {id:'appointment-22',date:shiftDemoDate(demoToday,8),time:'10:30',customer:'Studio Pilates',phone:'(12) 99110-8181',service:'Higienização',technician:'João',status:'confirmed',notes:'Higienização de dois splits.',conversationId:'conversation-3'},
  {id:'appointment-23',date:shiftDemoDate(demoToday,8),time:'13:30',customer:'Papelaria Avenida',phone:'(12) 99110-8282',service:'Diagnóstico técnico',technician:'Marina',status:'confirmed',notes:'Verificar equipamento sem refrigeração.',conversationId:'conversation-1'},
  {id:'appointment-24',date:shiftDemoDate(demoToday,8),time:'16:00',customer:'Consultório Vida',phone:'(12) 99110-8383',service:'Manutenção preventiva',technician:'João',status:'confirmed',notes:'Preventiva de rotina.',conversationId:'conversation-5'},

  {id:'appointment-25',date:shiftDemoDate(demoToday,-1),time:'09:00',customer:'Oficina Norte',phone:'(12) 99110-9090',service:'Visita técnica',technician:'João',status:'completed',notes:'Diagnóstico concluído.',conversationId:'conversation-4'},
  {id:'appointment-26',date:shiftDemoDate(demoToday,-1),time:'11:30',customer:'Boutique Bela',phone:'(12) 99110-9191',service:'Higienização',technician:'Marina',status:'completed',notes:'Higienização concluída.',conversationId:'conversation-3'},
  {id:'appointment-27',date:shiftDemoDate(demoToday,-1),time:'15:00',customer:'Auto Peças Sul',phone:'(12) 99110-9292',service:'Manutenção corretiva',technician:'João',status:'completed',notes:'Atendimento concluído.',conversationId:'conversation-1'},
]

export const demoOverview = {
  appointmentsToday: demoAppointments.filter(item=>item.date===demoToday&&item.status!=='cancelled').length,
  waiting: demoConversations.filter(item=>item.status==='waiting').length,
  inProgress: demoConversations.filter(item=>item.status==='in_progress').length,
  completed: demoConversations.filter(item=>item.status==='answered').length,
} as const
