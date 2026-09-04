import {
  CalendarDays,
  Home,
  Menu,
  MessagesSquare,
} from 'lucide-react'

export const navigationItems = [
  { label: 'Início', to: '/app', icon: Home, end: true },
  { label: 'Conversas', to: '/app/conversas', icon: MessagesSquare, end: false },
  { label: 'Agenda', to: '/app/agenda', icon: CalendarDays, end: false },
  { label: 'Mais', to: '/app/mais', icon: Menu, end: false },
] as const
