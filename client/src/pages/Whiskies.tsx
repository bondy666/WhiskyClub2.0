import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import { api } from '../lib/api'
import type { Whisky } from '../types'
import { Card, EmptyState, Loader, PageTitle } from '../components/ui'
import { ScoreDial } from '../components/ScoreDial'
import { WhiskyImage } from '../components/WhiskyImage'

export function Whiskies() {
  const navigate = useNavigate()
  const [whiskies, setWhiskies] = useState<Whisky[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get<Whisky[]>('/whiskies').then(setWhiskies).catch(() => setWhiskies([]))
  }, [])

  const filtered = useMemo(() => {
    if (!whiskies) return []
    const term = q.trim().toLowerCase()
    if (!term) return whiskies
    return whiskies.filter(
      (w) =>
        w.name.toLowerCase().includes(term) ||
        w.distillery?.toLowerCase().includes(term) ||
        w.region?.toLowerCase().includes(term),
    )
  }, [whiskies, q])

  if (!whiskies) return <Loader />

  return (
    <div>
      <PageTitle title="Whiskies" subtitle={`${whiskies.length} in the cabinet`} />

      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5">
          <Search size={18} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search whiskies…"
            className="w-full bg-transparent text-[15px] text-cream placeholder:text-muted focus:outline-none"
          />
        </div>
        <button
          onClick={() => navigate('/whiskies/new')}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 px-4 py-2.5 font-semibold text-ink-950"
          aria-label="Add whisky"
        >
          <Plus size={19} strokeWidth={2.6} /> Add
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          emoji="🥃"
          title="No whiskies found"
          body="Add a bottle to start tasting."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <Card className="flex items-center gap-4 p-4" onClick={() => navigate(`/whiskies/${w.id}`)}>
                <WhiskyImage url={w.imageUrl} alt={w.name} className="h-14 w-14 rounded-xl" emojiSize="text-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[17px] text-cream">{w.name}</div>
                  <div className="mt-0.5 truncate text-sm text-muted">
                    {[w.distillery, w.region, w.age ? `${w.age}yo` : null, w.abv ? `${w.abv}%` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {w.tastingCount ?? 0} tasting{(w.tastingCount ?? 0) === 1 ? '' : 's'}
                  </div>
                </div>
                {w.avgScore != null ? (
                  <ScoreDial value={w.avgScore} size={50} />
                ) : (
                  <span className="text-xs text-muted">Untasted</span>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
