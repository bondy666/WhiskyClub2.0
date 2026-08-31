import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { api } from '../lib/api'
import type { Member } from '../types'
import { Card, Loader, PageTitle } from '../components/ui'

const AVATAR_TINTS = [
  'from-amber-glow to-copper',
  'from-gold-300 to-gold-500',
  'from-copper to-ink-600',
  'from-gold-400 to-copper',
]

export function Members() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<Member[]>('/members').then(setMembers).catch(() => setMembers([]))
  }, [])

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const created = await api.post<Member>('/members', {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
      })
      setMembers((prev) => [...(prev ?? []), created])
      setForm({ name: '', email: '' })
      setAdding(false)
    } catch (e) {
      alert('Could not add member. ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!members) return <Loader />

  const ranked = [...members].sort((a, b) => (b.tastingCount ?? 0) - (a.tastingCount ?? 0))

  return (
    <div>
      <div className="flex items-end justify-between">
        <PageTitle title="Members" subtitle={`${members.length} in the Guild`} />
        <button
          onClick={() => setAdding((v) => !v)}
          className="mb-1 flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 px-4 py-2.5 font-semibold text-ink-950"
        >
          {adding ? <X size={19} strokeWidth={2.6} /> : <Plus size={19} strokeWidth={2.6} />}
          {adding ? 'Close' : 'Add'}
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 mt-2 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name"
                className={inputCls}
              />
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email (optional)"
                inputMode="email"
                className={inputCls}
              />
              <button
                disabled={saving || !form.name.trim()}
                onClick={save}
                className="rounded-full bg-gradient-to-br from-gold-300 to-gold-500 py-3 font-semibold text-ink-950 disabled:opacity-60"
              >
                {saving ? 'Adding…' : 'Add member'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-3">
        {ranked.map((m, i) => {
          const initials = m.name
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
            >
              <Card className="flex items-center gap-4 p-4">
                <div className="relative">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${
                      AVATAR_TINTS[i % AVATAR_TINTS.length]
                    } font-bold text-ink-950`}
                  >
                    {initials}
                  </div>
                  {i === 0 && (
                    <span className="absolute -right-1 -top-1 text-base">👑</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-display text-[17px] text-cream">{m.name}</div>
                  <div className="text-sm text-muted">
                    {m.tastingCount ?? 0} tasting{(m.tastingCount ?? 0) === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="font-display text-2xl text-muted/50">#{i + 1}</div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-cream placeholder:text-muted focus:border-gold-300/40 focus:outline-none'
