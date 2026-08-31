import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface PillProps {
  active: boolean
  onClick: () => void
  children: ReactNode
  swatch?: string
}

// Big, tappable choice pill — the core interaction of the tasting flow.
export function Pill({ active, onClick, children, swatch }: PillProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      aria-pressed={active}
      className={[
        'relative flex items-center gap-2 rounded-full px-4 py-3 text-[15px] font-semibold',
        'border transition-colors duration-150 select-none',
        active
          ? 'border-transparent text-ink-950 shadow-[0_6px_20px_-6px_rgba(217,146,43,0.7)]'
          : 'border-white/10 bg-white/[0.03] text-cream-dim hover:border-white/20 hover:text-cream',
      ].join(' ')}
      style={
        active
          ? { background: 'linear-gradient(120deg, var(--color-gold-300), var(--color-gold-500))' }
          : undefined
      }
    >
      {swatch && (
        <span
          className="h-4 w-4 rounded-full ring-1 ring-black/20"
          style={{ background: swatch }}
        />
      )}
      {children}
      {active && (
        <motion.span
          layoutId={undefined}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-0.5 text-ink-900"
        >
          ✓
        </motion.span>
      )}
    </motion.button>
  )
}
