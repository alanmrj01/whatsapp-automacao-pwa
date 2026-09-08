export type DemoConversation = {
  id: string
  customer: string
  lastMessage: string
  time: string
  status: 'waiting' | 'in_progress' | 'answered'
  assignee: string
  unread: number
  priority: boolean
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

export const demoToday = '2026-09-08'
export const demoBusinessName = 'PEMA Ar Condicionado'

export const demoOverview = {
  appointmentsToday: 4,
  waiting: 3,
  inProgress: 2,
  completed: 5,
} as const

export const demoServiceMix = {
  installation: 23,
  maintenance: 45,
  cleaning: 15,
  gasCharge: 17,
} as const

export const demoConversations: DemoConversation[] = [
  {id:'conversation-1',customer:'Loja Centro',lastMessage:'Preciso confirmar a visita de manutenção.',time:'09:15',status:'waiting',assignee:'Marina',unread:2,priority:true},
  {id:'conversation-2',customer:'Carlos Mendes',lastMessage:'O técnico consegue vir no período da tarde?',time:'09:04',status:'waiting',assignee:'João',unread:1,priority:true},
  {id:'conversation-3',customer:'Padaria Pão Quente',lastMessage:'Enviei as informações do equipamento.',time:'08:42',status:'in_progress',assignee:'Marina',unread:0,priority:false},
  {id:'conversation-4',customer:'Ana Paula',lastMessage:'Obrigada, ficou agendado.',time:'Ontem',status:'answered',assignee:'João',unread:0,priority:false},
]

export const demoAppointments: DemoAppointment[] = [
  {id:'appointment-1',date:demoToday,time:'09:00',customer:'Carlos Mendes',phone:'(12) 99999-0101',service:'Instalação de split',technician:'João',status:'confirmed',notes:'Confirmar acesso à área externa.'},
  {id:'appointment-2',date:demoToday,time:'11:30',customer:'Loja Centro',phone:'(12) 99999-0202',service:'Manutenção preventiva',technician:'Marina',status:'confirmed',notes:'Verificar três equipamentos.'},
  {id:'appointment-3',date:demoToday,time:'14:30',customer:'Ana Paula',phone:'(12) 99999-0303',service:'Limpeza completa',technician:'João',status:'pending',notes:'Cliente prefere o período da tarde.'},
  {id:'appointment-4',date:'2026-09-09',time:'10:00',customer:'Empresa Alfa',phone:'(12) 99999-0404',service:'Visita técnica',technician:'Marina',status:'confirmed',notes:'Avaliar equipamento sem refrigeração.'},
]

export function saveDemoAppointment(list: DemoAppointment[], appointment: DemoAppointment) {
  const exists = list.some(item => item.id === appointment.id)
  return exists ? list.map(item => item.id === appointment.id ? appointment : item) : [...list, appointment]
}

export function cancelDemoAppointment(list: DemoAppointment[], id: string) {
  return list.map(item => item.id === id ? {...item,status:'cancelled' as const} : item)
}
