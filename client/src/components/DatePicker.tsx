import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtChip = (key: string) =>
  new Date(key + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

// Always-visible calendar that lets you toggle one or more dates.
// `values` / `onChange` use sorted YYYY-MM-DD strings.
export function DatePicker({
  values,
  onChange,
}: {
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [view, setView] = useState(() =>
    values[0] ? new Date(values[0] + 'T00:00:00') : new Date(),
  )

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toKey(new Date())
  const selected = new Set(values)

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  const toggle = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange([...next].sort())
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
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
          <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase text-muted">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const key = toKey(d)
          const isSelected = selected.has(key)
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`grid h-9 place-items-center rounded-lg text-sm transition-colors ${
                isSelected
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

      {values.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {values.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-300/15 px-3 py-1.5 text-xs font-semibold text-gold-300 ring-1 ring-gold-300/25"
            >
              {fmtChip(key)}
              <X size={13} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
