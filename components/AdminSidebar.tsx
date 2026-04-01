'use client'
import { useRouter, usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '⊞' },
  { section: 'Manage' },
  { href: '/admin/helpers', label: 'Swasthya Bondhu', icon: '👥' },
  { href: '/admin/patients', label: 'Patients', icon: '🏥' },
  { href: '/admin/receptionists', label: 'Receptionists', icon: '🖥' },
  { section: 'Config' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙' },
  { section: 'View' },
  { href: '/view', label: 'Public View Panel', icon: '↗', external: true },
]

export default function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>Rogmukto Bangla</h1>
        <p>Admin Panel</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if ('section' in item) {
            return <div key={i} className="nav-section-label">{item.section}</div>
          }
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href!)
          return (
            <button
              key={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => item.external ? window.open(item.href, '_blank') : router.push(item.href!)}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item" onClick={handleLogout}>
          <span style={{ fontSize: 15 }}>→</span>
          Logout
        </button>
      </div>
    </div>
  )
}
