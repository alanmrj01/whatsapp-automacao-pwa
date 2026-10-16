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

export const demoToday = localDateKey(new Date())
export const demoTomorrow = shiftDemoDate(demoToday, 1)
export const demoBusinessName = 'PEMA Ar Condicionado'

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
  {id:'conversation-3',customer:'Juliana Rocha',phone:'(12) 99763-0303',assistantEnabled:true,lastMessage:'Agendamento confirmado para hoje às 14h30.',time:'08:42',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-2',messages:[
    {id:'3-1',direction:'customer',body:'Bom dia, queria fazer uma limpeza no ar do quarto.',time:'08:26'},
    {id:'3-2',direction:'assistant',body:'Bom dia. É um aparelho split? Quantos aparelhos precisam de higienização?',time:'08:28'},
    {id:'3-3',direction:'customer',body:'É split, só um.',time:'08:31'},
    {id:'3-4',direction:'assistant',body:'Tenho disponibilidade hoje às 14h30. Esse horário funciona para você?',time:'08:34'},
    {id:'3-5',direction:'customer',body:'Funciona. O CEP é 12230-000.',time:'08:38'},
    {id:'3-6',direction:'assistant',body:'Certo. Confirma a higienização hoje às 14h30 nesse endereço?',time:'08:39'},
    {id:'3-7',direction:'customer',body:'Confirmo.',time:'08:41'},
    {id:'3-8',direction:'system',body:'Agendamento confirmado para hoje às 14h30 com João.',time:'08:42'},
  ]},
  {id:'conversation-4',customer:'Padaria Pão Quente',phone:'(12) 99654-0404',assistantEnabled:true,lastMessage:'Qual é o CEP e o número da padaria?',time:'08:23',status:'waiting',assignee:'Alovia',unread:1,priority:false,messages:[
    {id:'4-1',direction:'customer',body:'Preciso de um orçamento para os ares da padaria.',time:'08:12'},
    {id:'4-2',direction:'assistant',body:'Posso organizar uma visita técnica. É para manutenção, instalação ou ainda precisa avaliar o serviço?',time:'08:14'},
    {id:'4-3',direction:'customer',body:'Precisa avaliar. Alguns não gelam direito.',time:'08:16'},
    {id:'4-4',direction:'assistant',body:'Entendi. Quantos equipamentos precisam ser avaliados?',time:'08:20'},
    {id:'4-5',direction:'customer',body:'São quatro aparelhos, todos na mesma padaria.',time:'08:22'},
    {id:'4-6',direction:'assistant',body:'Certo. Qual é o CEP e o número da padaria para eu verificar a visita técnica?',time:'08:23'},
  ]},
  {id:'conversation-5',customer:'Loja Centro',phone:'(12) 99545-0505',assistantEnabled:true,lastMessage:'Agendamento confirmado para hoje às 11h30.',time:'Ontem',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-1',messages:[
    {id:'5-1',direction:'customer',body:'Olá, preciso fazer manutenção preventiva em três aparelhos da loja.',time:'Ontem 16:20'},
    {id:'5-2',direction:'assistant',body:'Olá. Os três aparelhos ficam no mesmo endereço?',time:'Ontem 16:21'},
    {id:'5-3',direction:'customer',body:'Sim. Fica no Centro.',time:'Ontem 16:23'},
    {id:'5-4',direction:'assistant',body:'Qual é o CEP e o número do local?',time:'Ontem 16:24'},
    {id:'5-5',direction:'customer',body:'12210-000, número 120.',time:'Ontem 16:26'},
    {id:'5-6',direction:'assistant',body:'Há disponibilidade hoje às 11h30. Posso confirmar?',time:'Ontem 16:27'},
    {id:'5-7',direction:'customer',body:'Pode.',time:'Ontem 16:28'},
    {id:'5-8',direction:'system',body:'Agendamento confirmado para hoje às 11h30 com Marina.',time:'Ontem 16:29'},
  ]},
  {id:'conversation-6',customer:'Rafael Lima',phone:'(12) 99436-0606',assistantEnabled:true,lastMessage:'Reagendamento confirmado para amanhã às 10h.',time:'Ontem',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-3',messages:[
    {id:'6-1',direction:'customer',body:'Boa tarde. Não vou conseguir receber o técnico hoje.',time:'Ontem 15:10'},
    {id:'6-2',direction:'assistant',body:'Tudo bem. Você quer reagendar o atendimento?',time:'Ontem 15:11'},
    {id:'6-3',direction:'customer',body:'Quero. Pode ser amanhã de manhã?',time:'Ontem 15:13'},
    {id:'6-4',direction:'assistant',body:'Amanhã há disponibilidade às 10h. O endereço continua o mesmo?',time:'Ontem 15:14'},
    {id:'6-5',direction:'customer',body:'Sim, o mesmo endereço.',time:'Ontem 15:16'},
    {id:'6-6',direction:'assistant',body:'Confirma o reagendamento para amanhã às 10h?',time:'Ontem 15:17'},
    {id:'6-7',direction:'customer',body:'Confirmo.',time:'Ontem 15:18'},
    {id:'6-8',direction:'system',body:'Reagendamento confirmado para amanhã às 10h com Marina.',time:'Ontem 15:19'},
  ]},
]

export const demoAppointments: DemoAppointment[] = [
  {id:'appointment-1',date:demoToday,time:'11:30',customer:'Loja Centro',phone:'(12) 99545-0505',service:'Manutenção preventiva',technician:'Marina',status:'confirmed',notes:'Revisar três aparelhos no endereço informado.',conversationId:'conversation-5'},
  {id:'appointment-2',date:demoToday,time:'14:30',customer:'Juliana Rocha',phone:'(12) 99763-0303',service:'Higienização',technician:'João',status:'confirmed',notes:'Higienização de um aparelho split.',conversationId:'conversation-3'},
  {id:'appointment-3',date:demoTomorrow,time:'10:00',customer:'Rafael Lima',phone:'(12) 99436-0606',service:'Visita técnica',technician:'Marina',status:'confirmed',rescheduled:true,notes:'Reagendado a pedido do cliente; endereço mantido.',conversationId:'conversation-6'},
]

export const demoOverview = {
  appointmentsToday: demoAppointments.filter(item=>item.date===demoToday&&item.status!=='cancelled').length,
  waiting: demoConversations.filter(item=>item.status==='waiting').length,
  inProgress: demoConversations.filter(item=>item.status==='in_progress').length,
  completed: demoConversations.filter(item=>item.status==='answered').length,
} as const
