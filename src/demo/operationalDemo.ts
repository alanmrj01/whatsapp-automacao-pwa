export type DemoConversation = {
  id: string
  customer: string
  lastMessage: string
  time: string
  status: 'waiting' | 'in_progress' | 'answered'
  assignee: string
  unread: number
  priority: boolean
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
  {id:'conversation-1',customer:'Loja Centro',lastMessage:'Agendamento confirmado para hoje às 11h30.',time:'09:15',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-1',messages:[
    {id:'1-1',direction:'customer',body:'Bom dia, preciso revisar três aparelhos da loja.',time:'08:58'},
    {id:'1-2',direction:'assistant',body:'Claro. É uma manutenção preventiva nos três equipamentos?',time:'09:00'},
    {id:'1-3',direction:'customer',body:'Sim. Estamos na Rua Sete, 120, Centro.',time:'09:05'},
    {id:'1-4',direction:'assistant',body:'Encontrei disponibilidade com a Marina hoje às 11h30. Posso confirmar?',time:'09:08'},
    {id:'1-5',direction:'customer',body:'Pode confirmar.',time:'09:12'},
    {id:'1-6',direction:'system',body:'Agendamento confirmado para hoje às 11h30 com Marina.',time:'09:15'},
  ]},
  {id:'conversation-2',customer:'Carlos Mendes',lastMessage:'Vou verificar os horários da tarde para você.',time:'09:04',status:'in_progress',assignee:'João',unread:0,priority:false,messages:[
    {id:'2-1',direction:'customer',body:'Quero instalar um split de 18.000 BTUs.',time:'08:50'},
    {id:'2-2',direction:'assistant',body:'Para informar o valor correto, preciso saber se o ponto elétrico e a infraestrutura já estão preparados.',time:'08:52'},
    {id:'2-3',direction:'customer',body:'O ponto está pronto. Preciso da instalação completa. Há horário esta semana?',time:'08:57'},
    {id:'2-4',direction:'assistant',body:'Sim. Você prefere atendimento pela manhã ou à tarde?',time:'09:00'},
    {id:'2-5',direction:'customer',body:'Prefiro à tarde.',time:'09:02'},
    {id:'2-6',direction:'assistant',body:'Vou verificar os horários da tarde para você.',time:'09:04'},
  ]},
  {id:'conversation-3',customer:'Padaria Pão Quente',lastMessage:'Pronto, já sei o que enviar. Obrigado!',time:'08:42',status:'answered',assignee:'Alovia',unread:0,priority:false,messages:[
    {id:'3-1',direction:'customer',body:'Quais informações preciso enviar para pedir uma visita técnica?',time:'08:30'},
    {id:'3-2',direction:'assistant',body:'Informe o tipo de equipamento, o problema percebido, o endereço e o melhor período para atendimento.',time:'08:33'},
    {id:'3-3',direction:'customer',body:'Preciso enviar foto?',time:'08:36'},
    {id:'3-4',direction:'assistant',body:'A foto é opcional, mas pode ajudar a equipe a identificar o equipamento antes da visita.',time:'08:39'},
    {id:'3-5',direction:'customer',body:'Pronto, já sei o que enviar. Obrigado!',time:'08:42'},
    {id:'3-6',direction:'system',body:'Dúvida frequente resolvida automaticamente pelo assistente.',time:'08:42'},
  ]},
  {id:'conversation-4',customer:'Ana Paula',lastMessage:'Agendamento criado para hoje às 14h30.',time:'08:20',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-2',messages:[
    {id:'4-1',direction:'customer',body:'Gostaria de agendar uma limpeza completa do split.',time:'08:10'},
    {id:'4-2',direction:'assistant',body:'Tenho disponibilidade hoje às 14h30 com o João. Qual é o endereço?',time:'08:12'},
    {id:'4-3',direction:'customer',body:'Rua das Flores, 45. Esse horário funciona para mim.',time:'08:14'},
    {id:'4-4',direction:'assistant',body:'Perfeito. Vou registrar a limpeza para hoje às 14h30.',time:'08:16'},
    {id:'4-5',direction:'system',body:'Agendamento criado para hoje às 14h30 com João.',time:'08:20'},
  ]},
  {id:'conversation-5',customer:'Juliana Rocha',lastMessage:'Reagendamento concluído para amanhã às 10h.',time:'Ontem',status:'answered',assignee:'Alovia',unread:0,priority:false,appointmentId:'appointment-3',messages:[
    {id:'5-1',direction:'customer',body:'Preciso mudar a visita que estava marcada para hoje.',time:'Ontem 16:20'},
    {id:'5-2',direction:'assistant',body:'Posso ajudar. Amanhã há disponibilidade às 10h ou às 15h.',time:'Ontem 16:22'},
    {id:'5-3',direction:'customer',body:'Amanhã às 10h fica melhor.',time:'Ontem 16:24'},
    {id:'5-4',direction:'assistant',body:'Certo. A visita continua no endereço Avenida Central, 88?',time:'Ontem 16:25'},
    {id:'5-5',direction:'customer',body:'Sim, o endereço é o mesmo.',time:'Ontem 16:27'},
    {id:'5-6',direction:'system',body:'Reagendamento concluído para amanhã às 10h com Marina.',time:'Ontem 16:28'},
  ]},
  {id:'conversation-6',customer:'Empresa Alfa',lastMessage:'Atendemos São José dos Campos. Qual é o CEP?',time:'Ontem',status:'waiting',assignee:'Alovia',unread:1,priority:true,messages:[
    {id:'6-1',direction:'customer',body:'Vocês atendem na região do Jardim Satélite?',time:'Ontem 15:10'},
    {id:'6-2',direction:'assistant',body:'Atendemos São José dos Campos e avaliamos o deslocamento conforme o endereço.',time:'Ontem 15:11'},
    {id:'6-3',direction:'customer',body:'É para uma visita em uma empresa.',time:'Ontem 15:13'},
    {id:'6-4',direction:'assistant',body:'Perfeito. Qual é o CEP do local para eu confirmar o atendimento?',time:'Ontem 15:14'},
    {id:'6-5',direction:'customer',body:'Vou confirmar e envio em seguida.',time:'Ontem 15:15'},
  ]},
]

export const demoAppointments: DemoAppointment[] = [
  {id:'appointment-1',date:demoToday,time:'11:30',customer:'Loja Centro',phone:'(12) 99999-0101',service:'Manutenção preventiva',technician:'Marina',status:'confirmed',notes:'Revisar três aparelhos no endereço informado.',conversationId:'conversation-1'},
  {id:'appointment-2',date:demoToday,time:'14:30',customer:'Ana Paula',phone:'(12) 99999-0202',service:'Limpeza completa',technician:'João',status:'confirmed',notes:'Atendimento confirmado na Rua das Flores, 45.',conversationId:'conversation-4'},
  {id:'appointment-3',date:demoTomorrow,time:'10:00',customer:'Juliana Rocha',phone:'(12) 99999-0303',service:'Visita técnica',technician:'Marina',status:'confirmed',notes:'Reagendado a pedido da cliente; endereço mantido.',conversationId:'conversation-5'},
]

export const demoOverview = {
  appointmentsToday: demoAppointments.filter(item=>item.date===demoToday&&item.status!=='cancelled').length,
  waiting: demoConversations.filter(item=>item.status==='waiting').length,
  inProgress: demoConversations.filter(item=>item.status==='in_progress').length,
  completed: demoConversations.filter(item=>item.status==='answered').length,
} as const
