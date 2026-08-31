import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GuildLogo } from '../components/GuildLogo'
import { loginUrl } from '../lib/auth'
import { api } from '../lib/api'
import type { DashboardStats } from '../types'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-semibold text-gold-300">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  )
}

export function Landing() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    api.get<DashboardStats>('/stats').then(setStats).catch(() => {})
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 py-14 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <GuildLogo size={84} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-3"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
          Est. 2026 · Ealing, London
        </div>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-[1.05] text-cream">
          Ealing
          <br />
          <span className="gold-text">Whisky Guild</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-cream-dim">
          Taste, score and remember every dram. Guided tasting notes in seconds —
          then share the night with the Guild.
        </p>
      </motion.div>

      {stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="glass mt-8 grid w-full grid-cols-3 gap-2 rounded-2xl px-4 py-5"
        >
          <Stat value={String(stats.whiskyCount)} label="Whiskies" />
          <Stat value={String(stats.tastingCount)} label="Tastings" />
          <Stat
            value={stats.avgScore != null ? stats.avgScore.toFixed(1) : '—'}
            label="Avg Score"
          />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-9 flex w-full flex-col gap-3"
      >
        <a
          href={loginUrl('aad')}
          className="flex items-center justify-center gap-3 rounded-full bg-cream px-5 py-3.5 font-semibold text-ink-950 transition-transform active:scale-[0.98]"
        >
          <MicrosoftIcon /> Continue with Microsoft
        </a>
        <a
          href={loginUrl('google')}
          className="flex items-center justify-center gap-3 rounded-full border border-white/12 bg-white/[0.03] px-5 py-3.5 font-semibold text-cream transition-transform active:scale-[0.98]"
        >
          <GoogleIcon /> Continue with Google
        </a>
      </motion.div>

      <p className="mt-8 text-xs text-muted">Members only · Please drink responsibly.</p>
    </div>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.3 5.2C39.9 36.5 44 31 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}
