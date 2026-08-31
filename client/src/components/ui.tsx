import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-3 pb-5 pt-2">
      <div>
        <h1 className="font-display text-3xl font-semibold text-cream">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      className={`glass rounded-2xl ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function Loader({ label = 'Pouring…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="h-8 w-8 rounded-full border-2 border-white/10 border-t-gold-300"
      />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-14 text-center">
      <div className="text-4xl">{emoji}</div>
      <div>
        <h3 className="font-display text-lg text-cream">{title}</h3>
        {body && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{body}</p>}
      </div>
      {action}
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  planned: 'bg-sky-400/10 text-sky-300 ring-sky-400/20',
  active: 'bg-gold-300/15 text-gold-300 ring-gold-300/25',
  completed: 'bg-white/5 text-muted ring-white/10',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${
        STATUS_STYLE[status] ?? STATUS_STYLE.completed
      }`}
    >
      {status}
    </span>
  )
}
