import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, CalendarDays, Wine, Users, Plus, LogOut, Sparkles } from 'lucide-react'
import { GuildLogo } from './GuildLogo'
import { useAuth } from '../context/AuthContext'
import { logoutUrl } from '../lib/auth'

const NAV = [
  { to: '/', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/sessions', label: 'Sessions', icon: CalendarDays },
  { to: '/whiskies', label: 'Whiskies', icon: Wine },
  { to: '/ad-hoc', label: 'Ad-Hoc', icon: Sparkles },
  { to: '/members', label: 'Members', icon: Users },
]

export function Layout() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = (user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      {/* Top bar */}
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between px-5 pb-3 pt-3">
        <div className="absolute inset-0 -z-10 backdrop-blur-md [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <NavLink to="/" className="flex items-center gap-3">
          <GuildLogo size={68} />
          <div className="leading-tight">
            <div className="font-display text-[26px] font-semibold text-cream">
              Ealing Whisky Guild
            </div>
            <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted">
              Est. 2026
            </div>
          </div>
        </NavLink>

        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-copper text-sm font-bold text-ink-950"
              aria-label="Account"
            >
              {initials.toUpperCase()}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-xl backdrop-blur-md">
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Signed in as
                    </div>
                    <div className="font-display text-[15px] text-cream">{user.name}</div>
                    {user.email && (
                      <div className="truncate text-xs text-muted">{user.email}</div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      window.location.href = logoutUrl()
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-cream hover:bg-white/5"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Page */}
      <main className="flex-1 px-5 pb-32">
        <Outlet />
      </main>

      {/* Floating action: log a tasting */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate('/taste')}
        className="safe-bottom fixed bottom-[76px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 px-6 py-3.5 font-semibold text-ink-950 shadow-[0_10px_30px_-8px_rgba(217,146,43,0.8)]"
      >
        <Plus size={20} strokeWidth={2.6} />
        Taste a dram
      </motion.button>

      {/* Bottom nav */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-2xl px-4 pb-2">
          <div className="glass flex items-center justify-around rounded-2xl px-2 py-1.5">
            {NAV.map(({ to, label, icon: Icon, end }) => {
              const active = end
                ? location.pathname === to
                : location.pathname.startsWith(to)
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5"
                >
                  <Icon
                    size={22}
                    className={active ? 'text-gold-300' : 'text-muted'}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  <span
                    className={
                      'text-[10px] font-semibold ' +
                      (active ? 'text-cream' : 'text-muted')
                    }
                  >
                    {label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="nav-dot"
                      className="absolute -top-0.5 h-1 w-1 rounded-full bg-gold-300"
                    />
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
