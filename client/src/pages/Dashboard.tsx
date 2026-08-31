import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Flame, TrendingUp, Wine } from 'lucide-react'
import { api } from '../lib/api'
import type { DashboardStats } from '../types'
import { Card, Loader, StatusBadge } from '../components/ui'
import { ScoreDial } from '../components/ScoreDial'
import { useAuth } from '../context/AuthContext'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    api.get<DashboardStats>('/stats').then(setStats).catch(() => {})
  }, [])

  if (!stats) return <Loader />

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div>
      <div className="pb-4 pt-2">
        <p className="text-sm text-muted">Welcome back,</p>
        <h1 className="font-display text-3xl font-semibold text-cream">{firstName} 🥃</h1>
      </div>

      {/* Hero highlights */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4" onClick={() => navigate('/whiskies')}>
          <div className="flex items-center gap-2 text-gold-300">
            <Trophy size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">Top Whisky</span>
          </div>
          {stats.topWhisky ? (
            <div className="mt-3 flex items-center justify-between">
              <div className="font-display text-lg leading-tight text-cream">
                {stats.topWhisky.name}
              </div>
              <ScoreDial value={stats.topWhisky.score} size={48} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No scores yet</p>
          )}
        </Card>

        <Card className="p-4" onClick={() => navigate('/members')}>
          <div className="flex items-center gap-2 text-copper">
            <Flame size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">Most Active</span>
          </div>
          {stats.mostActiveMember ? (
            <div className="mt-3">
              <div className="font-display text-lg leading-tight text-cream">
                {stats.mostActiveMember.name}
              </div>
              <div className="mt-1 text-sm text-muted">
                {stats.mostActiveMember.count} tastings
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">—</p>
          )}
        </Card>
      </div>

      {/* Stat strip */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { label: 'Sessions', value: stats.sessionCount, icon: null },
          { label: 'Whiskies', value: stats.whiskyCount, icon: Wine },
          { label: 'Members', value: stats.activeMembers, icon: null },
          {
            label: 'Avg',
            value: stats.avgScore != null ? stats.avgScore.toFixed(1) : '—',
            icon: TrendingUp,
          },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl px-2 py-3 text-center">
            <div className="font-display text-xl font-semibold text-cream">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="font-display text-xl text-cream">Recent Sessions</h2>
        <button onClick={() => navigate('/sessions')} className="text-sm font-semibold text-gold-300">
          See all
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {stats.recentSessions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="flex items-center justify-between p-4" onClick={() => navigate(`/sessions/${s.id}`)}>
              <div>
                <div className="font-display text-[17px] text-cream">{s.name}</div>
                <div className="mt-0.5 text-sm text-muted">
                  {s.location ? `${s.location} · ` : ''}
                  {fmtDate(s.date)}
                </div>
              </div>
              <StatusBadge status={s.status} />
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
