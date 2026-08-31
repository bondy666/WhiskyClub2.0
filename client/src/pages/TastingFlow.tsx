import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, GlassWater, Search, Sparkles, X } from 'lucide-react'
import { api } from '../lib/api'
import type { Session, Tasting, Whisky } from '../types'
import { AROMA_EMOJI, COLOUR_SWATCH, TASTING_STEPS } from '../data/tastingOptions'
import { Pill } from '../components/Pill'
import { ScoreDial } from '../components/ScoreDial'
import { Loader } from '../components/ui'

type Draft = Omit<Tasting, 'id' | 'createdAt' | 'memberId'>

const emptyDraft = (): Draft => ({
  whiskyId: 0,
  sessionId: null,
  score: 7,
  bottle: {},
  appearance: { aromas: [] } as Draft['appearance'] & { aromas?: string[] },
  nose: { aromas: [] },
  palate: {},
  finish: {},
  overallNotes: '',
})

const draftFromTasting = (t: Tasting): Draft => ({
  whiskyId: t.whiskyId,
  sessionId: t.sessionId ?? null,
  score: t.score,
  bottle: t.bottle ?? {},
  appearance: t.appearance ?? {},
  nose: { ...t.nose, aromas: t.nose?.aromas ?? [] },
  palate: t.palate ?? {},
  finish: t.finish ?? {},
  overallNotes: t.overallNotes ?? '',
})

export function TastingFlow() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const editTasting = (location.state as { tasting?: Tasting } | null)?.tasting
  const [editId] = useState<number | null>(editTasting?.id ?? null)
  const [whiskies, setWhiskies] = useState<Whisky[] | null>(null)
  const [draft, setDraft] = useState<Draft>(() => (editTasting ? draftFromTasting(editTasting) : emptyDraft()))
  const [step, setStep] = useState(editTasting ? 1 : 0) // 0 = pick, 1..4 = notes, 5 = score
  const [saving, setSaving] = useState(false)
  const [attribution, setAttribution] = useState<string | null>(editTasting?.sessionName ?? null) // session name, or null = ad-hoc

  useEffect(() => {
    api.get<Whisky[]>('/whiskies').then(setWhiskies).catch(() => setWhiskies([]))
  }, [])

  useEffect(() => {
    if (editId) return
    const wid = Number(params.get('whisky'))
    const sid = Number(params.get('session'))
    if (wid) setDraft((d) => ({ ...d, whiskyId: wid }))
    if (wid) setStep(1)
    ;(async () => {
      if (sid) {
        setDraft((d) => ({ ...d, sessionId: sid }))
        try {
          const det = await api.get<{ session: Session }>(`/sessions/${sid}`)
          setAttribution(det.session.name)
        } catch {
          setAttribution(null)
        }
        return
      }
      try {
        const active = await api.get<Session | null>('/sessions/active')
        if (active) {
          setDraft((d) => ({ ...d, sessionId: active.id }))
          setAttribution(active.name)
        } else {
          setAttribution(null)
        }
      } catch {
        setAttribution(null)
      }
    })()
  }, [params, editId])

  const TOTAL = TASTING_STEPS.length + 2 // pick + 4 notes + score
  const selectedWhisky = whiskies?.find((w) => w.id === draft.whiskyId)

  // A notes step is complete once every category has a selection, or a freestyle note is written.
  const currentStepComplete = (() => {
    if (step < 1 || step > TASTING_STEPS.length) return true
    const stepDef = TASTING_STEPS[step - 1]
    const data = draft[stepDef.key] as Record<string, unknown> & { notes?: string }
    if (data?.notes && String(data.notes).trim()) return true
    return stepDef.groups.every((g) => {
      const v = data?.[g.key]
      return g.multi ? Array.isArray(v) && v.length > 0 : v != null && v !== ''
    })
  })()

  const submit = async () => {
    setSaving(true)
    try {
      if (editId) {
        await api.put<Tasting>(`/tastings/${editId}`, draft)
      } else {
        await api.post<Tasting>('/tastings', draft)
      }
      navigate(`/whiskies/${draft.whiskyId}`, { replace: true })
    } catch (e) {
      alert('Could not save tasting. ' + (e as Error).message)
      setSaving(false)
    }
  }

  if (!whiskies) return <Loader />

  return (
    <div className="mx-auto max-w-2xl overflow-x-clip px-5 pb-4">
      {/* Header + progress */}
      <div className="sticky top-0 z-10 -mx-5 mb-4 bg-ink-950/70 px-5 pb-3 pt-1 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-cream"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-muted">
            Step {step + 1} of {TOTAL}
          </span>
          <button
            onClick={() => navigate('/')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500"
            animate={{ width: `${((step + 1) / TOTAL) * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold">
          {attribution ? (
            <span className="inline-flex items-center gap-1.5 text-gold-300">
              <GlassWater size={13} /> Logging to {attribution}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Sparkles size={13} /> Ad-hoc tasting
            </span>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <WhiskyPicker
              whiskies={whiskies}
              selectedId={draft.whiskyId}
              onSelect={(id) => {
                setDraft((d) => ({ ...d, whiskyId: id }))
                setStep(1)
              }}
              onAdd={() => navigate('/whiskies/new')}
            />
          )}

          {step >= 1 && step <= TASTING_STEPS.length && (
            <NotesStep
              stepIndex={step - 1}
              draft={draft}
              setDraft={setDraft}
            />
          )}

          {step === TASTING_STEPS.length + 1 && (
            <ScoreStep
              draft={draft}
              setDraft={setDraft}
              whiskyName={selectedWhisky?.name ?? 'this dram'}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer nav */}
      {step > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink-950 via-ink-950/90 to-transparent px-5 pb-4 pt-8">
          <div className="mx-auto max-w-2xl">
            {step < TASTING_STEPS.length + 1 ? (
              <button
                disabled={!currentStepComplete}
                onClick={() => currentStepComplete && setStep((s) => s + 1)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 py-4 font-semibold text-ink-950 disabled:opacity-60"
              >
                Continue <ArrowRight size={18} strokeWidth={2.6} />
              </button>
            ) : (
              <button
                disabled={saving || !draft.whiskyId}
                onClick={submit}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 py-4 font-semibold text-ink-950 disabled:opacity-60"
              >
                <Check size={19} strokeWidth={2.8} />
                {saving ? 'Saving…' : editId ? 'Save changes' : 'Save tasting'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Step 0: whisky picker ---------- */
function WhiskyPicker({
  whiskies,
  selectedId,
  onSelect,
  onAdd,
}: {
  whiskies: Whisky[]
  selectedId: number
  onSelect: (id: number) => void
  onAdd: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return whiskies
    return whiskies.filter(
      (w) => w.name.toLowerCase().includes(t) || w.distillery?.toLowerCase().includes(t),
    )
  }, [whiskies, q])

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-cream">What are you tasting?</h1>
      <p className="mt-1 text-sm text-muted">Pick a dram to begin your notes.</p>

      <div className="mt-5 mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3">
        <Search size={18} className="text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the cabinet…"
          className="w-full bg-transparent text-[15px] text-cream placeholder:text-muted focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        {filtered.map((w) => (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className={`glass flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors ${
              selectedId === w.id ? 'ring-1 ring-gold-300' : ''
            }`}
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ink-700 to-ink-900 text-xl">
              🥃
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[16px] text-cream">{w.name}</div>
              <div className="truncate text-sm text-muted">
                {[w.distillery, w.region].filter(Boolean).join(' · ') || 'Whisky'}
              </div>
            </div>
          </button>
        ))}

        <button
          onClick={onAdd}
          className="rounded-2xl border border-dashed border-white/12 py-4 text-sm font-semibold text-gold-300"
        >
          + Add a new whisky
        </button>
      </div>
    </div>
  )
}

/* ---------- Steps 1-4: guided notes ---------- */
type StepData = Record<string, unknown> & { aromas?: string[]; notes?: string }

function NotesStep({
  stepIndex,
  draft,
  setDraft,
}: {
  stepIndex: number
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
}) {
  const step = TASTING_STEPS[stepIndex]
  const [showNote, setShowNote] = useState(false)
  const data = draft[step.key] as StepData

  const update = (patch: Partial<StepData>) =>
    setDraft((d) => ({ ...d, [step.key]: { ...(d[step.key] as StepData), ...patch } }))

  const toggleMulti = (groupKey: string, value: string) => {
    const current = (data[groupKey] as string[] | undefined) ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    update({ [groupKey]: next })
  }

  return (
    <div>
      <div className="mb-1 text-4xl">{step.emoji}</div>
      <h1 className="font-display text-3xl font-semibold text-cream">{step.title}</h1>
      <p className="mt-1 text-sm text-muted">{step.blurb}</p>

      <div className="mt-6 flex flex-col gap-7">
        {step.groups.map((group) => (
          <div key={group.key}>
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-cream-dim">
                {group.label}
              </h3>
              {group.hint && <span className="text-xs text-muted">{group.hint}</span>}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {group.options.map((opt) => {
                const active = group.multi
                  ? ((data[group.key] as string[] | undefined) ?? []).includes(opt)
                  : data[group.key] === opt
                return (
                  <Pill
                    key={opt}
                    active={active}
                    swatch={group.key === 'colour' ? COLOUR_SWATCH[opt] : undefined}
                    onClick={() =>
                      group.multi
                        ? toggleMulti(group.key, opt)
                        : update({ [group.key]: active ? undefined : opt })
                    }
                  >
                    {group.key === 'aromas' && AROMA_EMOJI[opt] ? `${AROMA_EMOJI[opt]} ` : ''}
                    {opt}
                  </Pill>
                )
              })}
            </div>
          </div>
        ))}

        {/* Freestyle note */}
        {showNote || data.notes ? (
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-cream-dim">
              Freestyle note
            </h3>
            <textarea
              value={data.notes ?? ''}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
              placeholder={`Anything else about the ${step.title.toLowerCase()}?`}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[15px] text-cream placeholder:text-muted focus:border-gold-300/40 focus:outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowNote(true)}
            className="self-start text-sm font-semibold text-gold-300"
          >
            + Add a freestyle note
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- Final: score ---------- */
function ScoreStep({
  draft,
  setDraft,
  whiskyName,
}: {
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
  whiskyName: string
}) {
  const setScore = (v: number) =>
    setDraft((d) => ({ ...d, score: Math.round(Math.max(0, Math.min(10, v)) * 2) / 2 }))

  return (
    <div>
      <div className="mb-1 text-4xl">⭐</div>
      <h1 className="font-display text-3xl font-semibold text-cream">Your verdict</h1>
      <p className="mt-1 text-sm text-muted">How does {whiskyName} score out of 10?</p>

      <div className="mt-8 flex flex-col items-center">
        <ScoreDial value={draft.score} size={150} />

        <div className="mt-6 flex w-full items-center gap-4">
          <button
            onClick={() => setScore(draft.score - 0.5)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-xl text-cream"
          >
            −
          </button>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={draft.score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-gold-400)]"
          />
          <button
            onClick={() => setScore(draft.score + 0.5)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-xl text-cream"
          >
            +
          </button>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((n) => (
            <Pill key={n} active={draft.score === n} onClick={() => setScore(n)}>
              {n % 1 === 0 ? n : n.toFixed(1)}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-cream-dim">
          Overall notes
        </h3>
        <textarea
          value={draft.overallNotes ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, overallNotes: e.target.value }))}
          rows={3}
          placeholder="Would you pour it again?"
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[15px] text-cream placeholder:text-muted focus:border-gold-300/40 focus:outline-none"
        />
      </div>
    </div>
  )
}
