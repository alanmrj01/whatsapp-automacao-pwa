export type DemoConversation = {
  id: string
  customer: string
  lastMessage: string
  time: string
  status: 'waiting' | 'in_progress' | 'answered'
  assignee: string
  unread: number
  priority: boolean
  messages: DemoMessage[]
}

export type DemoMessage = {
  id: string
  direction: 'customer' | 'assistant'
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

export const demoOverview = {
  appointmentsToday: 3,
  waiting: 2,
  inProgress: 1,
  completed: 1,
} as const

export const demoServiceMix = {
  installation: 23,
  maintenance: 45,
  cleaning: 15,
  gasCharge: 17,
} as const

export const demoConversations: DemoConversation[] = [
  {id:'conversation-1',customer:'Loja Centro',lastMessage:'Pode confirmar a visita de manutenção?',time:'09:15',status:'waiting',assignee:'Marina',unread:2,priority:true,messages:[
    {id:'1-1',direction:'customer',body:'Bom dia, preciso revisar três aparelhos da loja.',time:'08:58'},
    {id:'1-2',direction:'assistant',body:'Claro. É uma manutenção preventiva nos três equipamentos?',time:'09:00'},
    {id:'1-3',direction:'customer',body:'Sim, todos são splits e a loja fica no Centro.',time:'09:05'},
    {id:'1-4',direction:'assistant',body:'Encontrei disponibilidade com a Marina hoje às 11h30.',time:'09:08'},
    {id:'1-5',direction:'customer',body:'Pode confirmar a visita de manutenção?',time:'09:15'},
  ]},
  {id:'conversation-2',customer:'Carlos Mendes',lastMessage:'Vou verificar uma opção no período da tarde.',time:'09:04',status:'in_progress',assignee:'João',unread:0,priority:false,messages:[
    {id:'2-1',direction:'customer',body:'Quero instalar um split de 18.000 BTUs.',time:'08:50'},
    {id:'2-2',direction:'assistant',body:'Perfeito. O ponto elétrico e a infraestrutura já estão preparados?',time:'08:52'},
    {id:'2-3',direction:'customer',body:'O ponto está pronto. Preciso da instalação completa.',time:'08:57'},
    {id:'2-4',direction:'assistant',body:'O técnico consegue vir no período da manhã ou da tarde?',time:'09:00'},
    {id:'2-5',direction:'customer',body:'Prefiro à tarde.',time:'09:02'},
    {id:'2-6',direction:'assistant',body:'Vou verificar uma opção no período da tarde.',time:'09:04'},
  ]},
  {id:'conversation-3',customer:'Padaria Pão Quente',lastMessage:'Enviei as informações do equipamento.',time:'08:42',status:'waiting',assignee:'Marina',unread:1,priority:true,messages:[
    {id:'3-1',direction:'customer',body:'A câmara fria não está mantendo a temperatura.',time:'08:30'},
    {id:'3-2',direction:'assistant',body:'Entendi. O equipamento liga normalmente e apresenta algum alerta?',time:'08:33'},
    {id:'3-3',direction:'customer',body:'Liga, mas a temperatura continua subindo.',time:'08:36'},
    {id:'3-4',direction:'assistant',body:'Pode informar o modelo e enviar a descrição do alerta, se houver?',time:'08:39'},
    {id:'3-5',direction:'customer',body:'Enviei as informações do equipamento.',time:'08:42'},
  ]},
  {id:'conversation-4',customer:'Ana Paula',lastMessage:'Obrigada, ficou agendado.',time:'Ontem',status:'answered',assignee:'João',unread:0,priority:false,messages:[
    {id:'4-1',direction:'customer',body:'Gostaria de agendar uma limpeza completa do split.',time:'Ontem 14:10'},
    {id:'4-2',direction:'assistant',body:'Tenho disponibilidade amanhã às 14h30 com o João.',time:'Ontem 14:12'},
    {id:'4-3',direction:'customer',body:'Esse horário funciona para mim.',time:'Ontem 14:14'},
    {id:'4-4',direction:'assistant',body:'Agendamento criado para amanhã às 14h30. Você receberá os detalhes por aqui.',time:'Ontem 14:15'},
    {id:'4-5',direction:'customer',body:'Obrigada, ficou agendado.',time:'Ontem 14:16'},
  ]},
]

export const demoAppointments: DemoAppointment[] = [
  {id:'appointment-1',date:demoToday,time:'09:00',customer:'Carlos Mendes',phone:'(12) 99999-0101',service:'Instalação de split',technician:'João',status:'confirmed',notes:'Confirmar acesso à área externa.'},
  {id:'appointment-2',date:demoToday,time:'11:30',customer:'Loja Centro',phone:'(12) 99999-0202',service:'Manutenção preventiva',technician:'Marina',status:'confirmed',notes:'Verificar três equipamentos.'},
  {id:'appointment-3',date:demoToday,time:'14:30',customer:'Ana Paula',phone:'(12) 99999-0303',service:'Limpeza completa',technician:'João',status:'pending',notes:'Cliente prefere o período da tarde.'},
  {id:'appointment-4',date:demoTomorrow,time:'10:00',customer:'Empresa Alfa',phone:'(12) 99999-0404',service:'Visita técnica',technician:'Marina',status:'confirmed',notes:'Avaliar equipamento sem refrigeração.'},
]
