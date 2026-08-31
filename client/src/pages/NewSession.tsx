import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, Check, ChevronLeft, ChevronRight, KeyRound, MessageCircle, Trophy, X } from 'lucide-react'
import { api } from '../lib/api'
import type { PlanNight, Session } from '../types'
import { openPlanShare } from '../lib/whatsapp'
import { useAuth } from '../context/AuthContext'
import { loginUrl } from '../lib/auth'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtLong = (key: string) =>
  new Date(key + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export function NewSession() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [nights, setNights] = useState<PlanNight[]>([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      setNights(await api.get<PlanNight[]>('/plan'))
    } catch {
      /* leave existing */
    }
  }

  useEffect(() => {
    load()
  }, [])

  const proposed = new Set(nights.map((n) => n.date))
  const frontRunner = nights[0] && nights[0].voteCount > 0 ? nights[0] : null

  const guard = () => {
    if (!user) {
      window.location.href = loginUrl('aad', '/sessions/new')
      return false
    }
    return true
  }

  const toggleDay = async (key: string) => {
    if (!guard() || busy) return
    setBusy(true)
    try {
      if (proposed.has(key)) {
        const night = nights.find((n) => n.date === key)!
        if (night.voteCount > 0 && !confirm('This night already has votes. Remove it?')) return
        setNights(await api.del<PlanNight[]>(`/plan/${night.id}`))
      } else {
        setNights(await api.post<PlanNight[]>('/plan', { date: key }))
      }
    } catch (e) {
      alert('Could not update. ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const vote = async (night: PlanNight) => {
    if (!guard() || busy) return
    setBusy(true)
    try {
      setNights(await api.post<PlanNight[]>(`/plan/${night.id}/vote`, {}))
    } catch (e) {
      alert('Could not vote. ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const removeNight = async (night: PlanNight) => {
    if (!guard() || busy) return
    if (night.voteCount > 0 && !confirm('This night already has votes. Remove it?')) return
    setBusy(true)
    try {
      setNights(await api.del<PlanNight[]>(`/plan/${night.id}`))
    } catch (e) {
      alert('Could not remove. ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const lockIn = async (night: PlanNight) => {
    if (!guard() || busy) return
    const name = prompt('Name this session', 'Guild Night')
    if (name == null) return
    setBusy(true)
    try {
      const session = await api.post<Session>(`/plan/${night.id}/lock`, { name: name.trim() || 'Guild Night' })
      navigate(`/sessions/${session.id}`)
    } catch (e) {
      alert('Could not lock in the night. ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
        className="mb-4 mt-1 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-cream"
      >
        <ArrowLeft size={18} />
      </button>

      <h1 className="font-display text-3xl font-semibold text-cream">Plan the Next Night</h1>
      <p className="mt-1 text-sm text-muted">
        Propose dates, vote for the ones you can make, then lock in the night.
      </p>

      <div className="mt-5 flex justify-center">
        <button
          onClick={() => openPlanShare(nights)}
          disabled={nights.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-50"
        >
          <MessageCircle size={17} /> Share on WhatsApp
        </button>
      </div>

      {!user && (
        <div className="mt-5 rounded-2xl border border-gold-300/25 bg-gold-300/[0.06] px-4 py-3 text-center text-sm text-cream-dim">
          <KeyRound size={14} className="mr-1 inline text-gold-300" />
          <a href={loginUrl('aad', '/sessions/new')} className="font-semibold text-gold-300 underline">
            Sign in
          </a>{' '}
          to propose dates and vote.
        </div>
      )}

      {frontRunner && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-gold-300/30 bg-gradient-to-r from-gold-300/[0.12] to-copper/[0.08] px-4 py-3">
          <Trophy size={18} className="text-gold-300" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-300">Front-runner</span>
          <span className="font-display text-[15px] font-semibold text-cream">{fmtLong(frontRunner.date)}</span>
          <span className="text-xs text-muted">
            {frontRunner.voteCount} vote{frontRunner.voteCount === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Calendar proposed={proposed} onToggle={toggleDay} disabled={busy} />

        <div className="flex flex-col gap-3">
          {nights.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-muted">
              No nights proposed yet. Tap a day on the calendar to propose one.
            </div>
          )}
          {nights.map((night, i) => {
            const isTop = i === 0 && night.voteCount > 0
            return (
              <div
                key={night.id}
                className={`rounded-2xl border p-4 ${
                  isTop ? 'border-gold-300/40 bg-gold-300/[0.06]' : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-[15px] font-semibold text-cream">
                      {fmtLong(night.date)}
                    </div>
                    {isTop && (
                      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-300">
                        Most popular
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => vote(night)}
                    disabled={busy}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-60 ${
                      night.votedByMe
                        ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-ink-950'
                        : 'bg-white/5 text-cream ring-1 ring-white/10'
                    }`}
                  >
                    {night.votedByMe ? <Check size={13} /> : null}
                    Vote
                    <span
                      className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] ${
                        night.votedByMe ? 'bg-ink-950/20 text-ink-950' : 'bg-white/10 text-cream'
                      }`}
                    >
                      {night.voteCount}
                    </span>
                  </button>
                </div>

                {night.voters.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {night.voters.map((v) => (
                      <span
                        key={v.id}
                        className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-cream-dim ring-1 ring-white/10"
                      >
                        {v.name}
                      </span>
                    ))}
                  </div>
                )}

                {user && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => lockIn(night)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-950 disabled:opacity-60"
                    >
                      <CalendarCheck size={13} /> Lock in this night
                    </button>
                    <button
                      onClick={() => removeNight(night)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-cream disabled:opacity-60"
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Calendar({
  proposed,
  onToggle,
  disabled,
}: {
  proposed: Set<string>
  onToggle: (key: string) => void
  disabled: boolean
}) {
  const [view, setView] = useState(() => new Date())
  const year = view.getFullYear()
  const month = view.getMonth()
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toKey(new Date())

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  return (
    <div className="h-fit rounded-2xl border border-white/10 bg-ink-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-cream"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-display text-[15px] text-cream">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-cream"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-semibold uppercase text-muted">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const key = toKey(d)
          const isProposed = proposed.has(key)
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              disabled={disabled}
              className={`grid h-10 place-items-center rounded-lg text-sm transition-colors disabled:opacity-60 ${
                isProposed
                  ? 'bg-gradient-to-br from-gold-300 to-gold-500 font-semibold text-ink-950'
                  : isToday
                    ? 'text-gold-300 ring-1 ring-gold-300/40'
                    : 'text-cream hover:bg-white/5'
              }`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Highlighted days are proposed. Tap a day to add or remove.
      </p>
    </div>
  )
}
