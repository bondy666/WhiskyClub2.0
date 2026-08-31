import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GlassWater, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import type { Tasting, Whisky, Member } from '../types'
import { AROMA_EMOJI, COLOUR_SWATCH } from '../data/tastingOptions'
import { Card, Loader } from '../components/ui'
import { ScoreDial } from '../components/ScoreDial'
import { WhiskyImage } from '../components/WhiskyImage'
import { useAuth } from '../context/AuthContext'

interface Detail {
  whisky: Whisky
  tastings: Tasting[]
  members: Member[]
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function WhiskyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<Detail | null>(null)

  useEffect(() => {
    api.get<Detail>(`/whiskies/${id}`).then(setData).catch(() => setData(null))
  }, [id])

  if (!data) return <Loader />
  const { whisky, tastings, members } = data
  const nameOf = (mid: number) => members.find((m) => m.id === mid)?.name ?? 'Member'

  const myMemberId = (() => {
    if (!user) return null
    const byEmail = user.email
      ? members.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase())
      : undefined
    const match = byEmail ?? members.find((m) => m.name.toLowerCase() === user.name.toLowerCase())
    return match?.id ?? null
  })()

  const handleDelete = async (tastingId: number) => {
    if (!confirm('Delete this tasting note? This cannot be undone.')) return
    try {
      await api.del(`/tastings/${tastingId}`)
      setData((d) => (d ? { ...d, tastings: d.tastings.filter((t) => t.id !== tastingId) } : d))
    } catch {
      alert('Could not delete this tasting note.')
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 mt-1 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-cream"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <WhiskyImage url={whisky.imageUrl} alt={whisky.name} className="h-20 w-20 rounded-2xl" emojiSize="text-4xl" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight text-cream">{whisky.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {[whisky.distillery, whisky.region, whisky.age ? `${whisky.age}yo` : null, whisky.abv ? `${whisky.abv}%` : null]
                .filter(Boolean)
                .join(' · ') || 'Whisky'}
            </p>
          </div>
          {whisky.avgScore != null && <ScoreDial value={whisky.avgScore} size={58} />}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => navigate(`/taste?whisky=${whisky.id}`)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 py-3.5 font-semibold text-ink-950"
          >
            <Plus size={19} strokeWidth={2.6} /> Add your tasting
          </button>
          <button
            onClick={() => navigate(`/whiskies/${whisky.id}/edit`)}
            aria-label="Edit whisky"
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white/5 text-cream ring-1 ring-white/10"
          >
            <Pencil size={18} />
          </button>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl text-cream">
        Tasting Notes {tastings.length > 0 && <span className="text-muted">· {tastings.length}</span>}
      </h2>

      {tastings.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-muted">
          Be the first to taste this dram.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tastings.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[15px] text-cream">{nameOf(t.memberId)}</span>
                  <span className="text-xs text-muted">{fmtDate(t.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-gold-300/15 px-2.5 py-0.5 font-display text-sm font-semibold text-gold-300">
                    {t.score % 1 === 0 ? t.score : t.score.toFixed(1)}/10
                  </div>
                  {myMemberId === t.memberId && (
                    <button
                      onClick={() => navigate('/taste', { state: { tasting: t } })}
                      aria-label="Edit tasting note"
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-muted ring-1 ring-white/10 transition hover:text-gold-300"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {myMemberId === t.memberId && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      aria-label="Delete tasting note"
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-muted ring-1 ring-white/10 transition hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {t.sessionName && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted">
                  <GlassWater size={13} className="text-gold-300" /> Tasted at {t.sessionName}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.appearance.colour && (
                  <Tag swatch={COLOUR_SWATCH[t.appearance.colour]}>{t.appearance.colour}</Tag>
                )}
                {t.nose.intensity && <Tag>{t.nose.intensity} nose</Tag>}
                {t.nose.aromas?.map((a) => (
                  <Tag key={a}>
                    {AROMA_EMOJI[a] ?? ''} {a}
                  </Tag>
                ))}
                {t.palate.body && <Tag>{t.palate.body} body</Tag>}
                {t.palate.sweetness && <Tag>{t.palate.sweetness}</Tag>}
                {t.finish.length && <Tag>{t.finish.length} finish</Tag>}
              </div>

              {(t.appearance.notes || t.nose.notes || t.palate.notes || t.finish.notes) && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {t.appearance.notes && <SectionNote label="Appearance">{t.appearance.notes}</SectionNote>}
                  {t.nose.notes && <SectionNote label="Nose">{t.nose.notes}</SectionNote>}
                  {t.palate.notes && <SectionNote label="Palate">{t.palate.notes}</SectionNote>}
                  {t.finish.notes && <SectionNote label="Finish">{t.finish.notes}</SectionNote>}
                </div>
              )}

              {t.overallNotes && (
                <div className="mt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Overall impression
                  </div>
                  <p className="mt-0.5 text-sm italic text-cream-dim">“{t.overallNotes}”</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Tag({ children, swatch }: { children: React.ReactNode; swatch?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-cream-dim ring-1 ring-white/8">
      {swatch && <span className="h-2.5 w-2.5 rounded-full" style={{ background: swatch }} />}
      {children}
    </span>
  )
}

function SectionNote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-sm text-cream-dim">
      <span className="font-semibold uppercase tracking-wide text-muted">{label}: </span>
      <span className="italic">{children}</span>
    </p>
  )
}
