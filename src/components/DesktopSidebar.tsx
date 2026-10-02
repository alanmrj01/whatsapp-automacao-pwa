import { NavLink } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { navigationItems } from './navigation'

export function DesktopSidebar() {
  return (
    <aside className="desktop-sidebar">
      <div className="desktop-sidebar__brand">
        <BrandMark />
        <div>
          <strong>Alovia</strong>
          <span>Operação organizada</span>
        </div>
      </div>
      <nav aria-label="Navegação principal">
        {navigationItems.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `desktop-sidebar__link${isActive ? ' is-active' : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
