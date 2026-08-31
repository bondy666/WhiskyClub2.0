import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import type { AdHocTasting } from '../types'
import { AROMA_EMOJI, COLOUR_SWATCH } from '../data/tastingOptions'
import { Card, EmptyState, Loader, PageTitle } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function AdHocTastings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tastings, setTastings] = useState<AdHocTasting[] | null>(null)

  useEffect(() => {
    api.get<AdHocTasting[]>('/adhoc').then(setTastings).catch(() => setTastings([]))
  }, [])

  if (!tastings) return <Loader />

  const isMine = (t: AdHocTasting) =>
    !!user && t.memberName.toLowerCase() === user.name.toLowerCase()

  const handleDelete = async (e: React.MouseEvent, tastingId: number) => {
    e.stopPropagation()
    if (!confirm('Delete this tasting note? This cannot be undone.')) return
    try {
      await api.del(`/tastings/${tastingId}`)
      setTastings((list) => (list ? list.filter((t) => t.id !== tastingId) : list))
    } catch {
      alert('Could not delete this tasting note.')
    }
  }

  return (
    <div>
      <PageTitle title="Ad-Hoc Tastings" subtitle="Drams tasted outside a Guild night" />

      {tastings.length === 0 ? (
        <EmptyState
          emoji="🥃"
          title="No ad-hoc tastings yet"
          body="Tap “Taste a dram” to log one on the go."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {tastings.map((t) => (
            <Card
              key={t.id}
              className="p-4"
              onClick={() => navigate(`/whiskies/${t.whiskyId}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-display text-[16px] text-cream">{t.whiskyName}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span>{t.memberName}</span>
                    <span>·</span>
                    <span>{fmtDate(t.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-gold-300/15 px-2.5 py-0.5 font-display text-sm font-semibold text-gold-300">
                    {t.score % 1 === 0 ? t.score : t.score.toFixed(1)}/10
                  </div>
                  {isMine(t) && (
                    <button
                      onClick={(e) => handleDelete(e, t.id)}
                      aria-label="Delete tasting note"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-muted ring-1 ring-white/10 transition hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

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
