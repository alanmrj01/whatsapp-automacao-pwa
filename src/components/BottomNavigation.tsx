import { NavLink } from 'react-router-dom'
import { navigationItems } from './navigation'

export function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {navigationItems.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' is-active' : ''}`
          }
        >
          <Icon size={21} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
