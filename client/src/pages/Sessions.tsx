import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, ChevronRight, MapPin, Plus, Trophy } from 'lucide-react'
import { api } from '../lib/api'
import type { PlanNight, Session } from '../types'
import { Card, EmptyState, Loader, PageTitle, StatusBadge } from '../components/ui'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

const fmtPlanDate = (key: string) =>
  new Date(key + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

export function Sessions() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [plan, setPlan] = useState<PlanNight[]>([])

  useEffect(() => {
    api.get<Session[]>('/sessions').then(setSessions).catch(() => setSessions([]))
    api.get<PlanNight[]>('/plan').then(setPlan).catch(() => setPlan([]))
  }, [])

  if (!sessions) return <Loader />

  const totalVotes = plan.reduce((s, n) => s + n.voteCount, 0)
  const frontRunner = plan[0] && plan[0].voteCount > 0 ? plan[0] : null

  return (
    <div>
      <PageTitle
        title="Sessions"
        subtitle="Nights of the Guild"
        action={
          <button
            onClick={() => navigate('/sessions/new')}
            className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-ink-950"
            aria-label="Plan session"
          >
            <Plus size={22} strokeWidth={2.6} />
          </button>
        }
      />

      {plan.length > 0 && (
        <button
          onClick={() => navigate('/sessions/new')}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-gold-300/30 bg-gradient-to-r from-gold-300/[0.12] to-copper/[0.08] px-4 py-3 text-left"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-300/15 text-gold-300">
            <CalendarClock size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-semibold text-cream">Planning the next night</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
              {frontRunner ? (
                <>
                  <Trophy size={12} className="text-gold-300" />
                  <span className="text-cream-dim">{fmtPlanDate(frontRunner.date)} leading</span>
                  <span>· {totalVotes} vote{totalVotes === 1 ? '' : 's'} in</span>
                </>
              ) : (
                <span>{plan.length} night{plan.length === 1 ? '' : 's'} proposed — cast your vote</span>
              )}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-gold-300" />
        </button>
      )}

      {sessions.length === 0 ? (
        <EmptyState emoji="📅" title="No sessions yet" body="Plan the first night of the Guild." />
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s, i) => {
            const winnerPhotos =
              s.status === 'completed' && s.winnerImageUrls?.length ? s.winnerImageUrls : null
            const heroPhotos = winnerPhotos ?? (s.photoUrl ? [s.photoUrl] : [])
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
              >
                <Card className="overflow-hidden p-0">
                  {heroPhotos.length > 0 && (
                    <div
                      className="relative cursor-pointer"
                      onClick={() => navigate(`/sessions/${s.id}`)}
                    >
                      <div className={`grid ${heroPhotos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {heroPhotos.slice(0, 4).map((url) => (
                          <img key={url} src={url} alt="" className="h-36 w-full object-cover" />
                        ))}
                      </div>
                      {winnerPhotos && (
                        <span className="absolute left-2 top-2 inline-flex max-w-[80%] items-center gap-1 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-semibold text-gold-300 ring-1 ring-gold-300/25">
                          <Trophy size={12} className="shrink-0" />
                          <span className="truncate">
                            Winner{winnerPhotos.length > 1 ? 's' : ''}
                            {s.winnerName ? `: ${s.winnerName}` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => navigate(`/sessions/${s.id}`)}
                    >
                      <div className="font-display text-lg text-cream">{s.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                        <span>{fmtDate(s.date)}</span>
                        {s.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={13} /> {s.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
