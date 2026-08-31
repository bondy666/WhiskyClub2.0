import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Gift, GlassWater, ImagePlus, Lock, MapPin, MessageCircle, Play, Plus, Search, Trash2, Unlock, User, X } from 'lucide-react'
import { api } from '../lib/api'
import type { Session, SessionLineupEntry, Whisky } from '../types'
import { Card, Loader, StatusBadge } from '../components/ui'
import { ScoreDial } from '../components/ScoreDial'
import { openSessionPoll } from '../lib/whatsapp'
import { fileToCompressedDataUrl } from '../lib/image'
import { useAuth } from '../context/AuthContext'

interface Detail {
  session: Session
  whiskies: Whisky[]
  lineup: SessionLineupEntry[]
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const [picking, setPicking] = useState(false)
  const [cabinet, setCabinet] = useState<Whisky[] | null>(null)
  const [q, setQ] = useState('')
  const [freeName, setFreeName] = useState('')
  const [freeDistillery, setFreeDistillery] = useState('')
  const [claimTarget, setClaimTarget] = useState<SessionLineupEntry | null>(null)

  useEffect(() => {
    api.get<Detail>(`/sessions/${id}`).then(setData).catch(() => setData(null))
  }, [id])

  const openPicker = () => {
    setPicking(true)
    if (!cabinet) api.get<Whisky[]>('/whiskies').then(setCabinet).catch(() => setCabinet([]))
  }

  const closePicker = () => {
    setPicking(false)
    setQ('')
    setFreeName('')
    setFreeDistillery('')
  }

  const bringWhisky = async (whiskyId: number) => {
    setBusy(true)
    try {
      const updated = await api.post<Detail>(`/sessions/${id}/whiskies`, { whiskyId })
      setData(updated)
      closePicker()
    } catch (e) {
      alert('Could not add to the line-up. ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const bringFreestyle = async () => {
    const name = freeName.trim()
    if (!name) return
    setBusy(true)
    try {
      const created = await api.post<Whisky>('/whiskies', {
        name,
        distillery: freeDistillery.trim() || undefined,
      })
      const updated = await api.post<Detail>(`/sessions/${id}/whiskies`, { whiskyId: created.id })
      setData(updated)
      setCabinet((c) => (c ? [created, ...c] : c))
      closePicker()
    } catch (e) {
      alert('Could not add to the line-up. ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const claimBottle = async (whiskyId: number) => {
    setBusy(true)
    try {
      const updated = await api.post<Detail>(`/sessions/${id}/whiskies`, { whiskyId })
      setData(updated)
      setClaimTarget(null)
    } catch (e) {
      alert('Could not claim this bottle. ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (status: Session['status']) => {
    setBusy(true)
    try {
      const updated = await api.post<Session>(`/sessions/${id}/status`, { status })
      setData((d) => (d ? { ...d, session: updated } : d))
    } catch (e) {
      alert('Could not update session. ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const deleteSession = async () => {
    if (!confirm('Delete this session? This cannot be undone.')) return
    setBusy(true)
    try {
      await api.del(`/sessions/${id}`)
      navigate('/sessions')
    } catch (e) {
      alert('Could not delete session. ' + (e as Error).message)
      setBusy(false)
    }
  }

  const uploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      const photoUrls = await Promise.all(files.map((f) => fileToCompressedDataUrl(f)))
      const updated = await api.post<Session>(`/sessions/${id}/photos`, { photoUrls })
      setData((d) => (d ? { ...d, session: updated } : d))
    } catch (err) {
      alert('Could not upload photos. ' + (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = async (photoUrl: string) => {
    if (!confirm('Remove this photo?')) return
    setBusy(true)
    try {
      const updated = await api.del<Session>(`/sessions/${id}/photos`, { photoUrl })
      setData((d) => (d ? { ...d, session: updated } : d))
    } catch (err) {
      alert('Could not remove photo. ' + (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <Loader />
  const { session, whiskies, lineup } = data
  const photos = session.photoUrls?.length ? session.photoUrls : session.photoUrl ? [session.photoUrl] : []
  // Whiskies tasted in the session but never explicitly claimed in the line-up.
  const lineupIds = new Set(lineup.map((e) => e.whisky.id))
  const extras = whiskies.filter((w) => !lineupIds.has(w.id))
  // Every session whisky, shown identically so all are claimable and consistent.
  const allEntries: SessionLineupEntry[] = [
    ...lineup,
    ...extras.map((w) => ({ whisky: w, broughtByMemberId: null, broughtByName: null })),
  ]

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 mt-1 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-cream"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl leading-tight text-cream">{session.name}</h1>
          <StatusBadge status={session.status} />
        </div>
        <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted">
          <span>🗓️ {fmtDate(session.date)}</span>
          {session.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} /> {session.location}
            </span>
          )}
          {session.hostName && (
            <span className="inline-flex items-center gap-1.5">
              <User size={14} /> Hosted by {session.hostName}
            </span>
          )}
        </div>

        {session.status !== 'completed' && (
          <button
            onClick={() => openSessionPoll(session)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366]/15 px-4 py-3 text-sm font-semibold text-[#4ff08e] ring-1 ring-[#25D366]/25"
          >
            <MessageCircle size={17} /> Start a WhatsApp poll
          </button>
        )}

        {user && session.status !== 'completed' && (
          <button
            onClick={openPicker}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gold-300/15 px-4 py-3 text-sm font-semibold text-gold-300 ring-1 ring-gold-300/25"
          >
            <Gift size={17} /> Bring a bottle
          </button>
        )}

        {session.status === 'active' && (
          <button
            onClick={() => navigate(`/taste?session=${session.id}`)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 px-4 py-3 text-sm font-semibold text-ink-950"
          >
            <GlassWater size={17} /> Log a dram to this session
          </button>
        )}

        {session.status === 'planned' && (
          <button
            disabled={busy}
            onClick={() => setStatus('active')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 px-4 py-3 text-sm font-semibold text-ink-950 disabled:opacity-60"
          >
            <Play size={17} /> Start session
          </button>
        )}

        {session.status === 'active' && (
          <button
            disabled={busy}
            onClick={() => setStatus('completed')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-cream disabled:opacity-60"
          >
            <Lock size={17} /> End session
          </button>
        )}

        {session.status === 'completed' && (
          <button
            disabled={busy}
            onClick={() => setStatus('active')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-cream disabled:opacity-60"
          >
            <Unlock size={17} /> Reopen session
          </button>
        )}

        {user && (
          <button
            disabled={busy}
            onClick={deleteSession}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 disabled:opacity-60"
          >
            <Trash2 size={17} /> Delete session
          </button>
        )}
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl text-cream">Memory</h2>
      <input ref={photoRef} type="file" accept="image/*" multiple onChange={uploadPhotos} className="hidden" />
      {photos.length > 0 ? (
        <div>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((url) => (
              <div key={url} className="relative overflow-hidden rounded-2xl">
                <img src={url} alt="Session memory" className="aspect-square w-full object-cover" />
                {user && (
                  <button
                    disabled={busy}
                    onClick={() => removePhoto(url)}
                    aria-label="Remove photo"
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink-950/70 text-cream ring-1 ring-white/10 disabled:opacity-60"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {user && (
            <button
              disabled={busy}
              onClick={() => photoRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-cream disabled:opacity-60"
            >
              <ImagePlus size={17} /> {busy ? 'Uploading…' : 'Add photos'}
            </button>
          )}
        </div>
      ) : user ? (
        <button
          disabled={busy}
          onClick={() => photoRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-300/15 px-4 py-4 text-sm font-semibold text-gold-300 ring-1 ring-gold-300/25 disabled:opacity-60"
        >
          <ImagePlus size={18} />
          {busy ? 'Uploading…' : 'Add photos'}
        </button>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-muted">
          No photos yet.
        </p>
      )}

      <h2 className="mb-1 mt-8 font-display text-xl text-cream">Line-up</h2>
      <p className="mb-3 text-sm text-muted">
        Claim the bottle you’re bringing so nobody doubles up.
      </p>
      {allEntries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-muted">
          No bottles claimed yet. Be the first to bring one.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {allEntries.map((e) => (
            <Card
              key={e.whisky.id}
              className="flex items-center gap-4 p-4"
              onClick={() => navigate(`/whiskies/${e.whisky.id}`)}
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ink-700 to-ink-900 text-xl">
                🥃
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[16px] text-cream">{e.whisky.name}</div>
                <div className="truncate text-sm text-muted">
                  {[e.whisky.distillery, e.whisky.region].filter(Boolean).join(' · ') || 'Whisky'}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-300">
                  <Gift size={13} />
                  {e.broughtByName
                    ? `Brought by ${e.broughtByName === user?.name ? 'you' : e.broughtByName}`
                    : 'Unclaimed'}
                </div>
              </div>
              <div
                className="flex shrink-0 items-center gap-2"
                onClick={(ev) => ev.stopPropagation()}
              >
                {user && !e.broughtByName && (
                  <button
                    disabled={busy}
                    onClick={() => setClaimTarget(e)}
                    className="rounded-full bg-gold-300 px-3 py-1.5 text-xs font-semibold text-ink-950 disabled:opacity-60"
                  >
                    Claim
                  </button>
                )}
                {session.status === 'active' && (
                  <button
                    onClick={() => navigate(`/taste?whisky=${e.whisky.id}&session=${session.id}`)}
                    className="rounded-full bg-gold-300/15 px-3 py-1.5 text-xs font-semibold text-gold-300"
                  >
                    Taste
                  </button>
                )}
                {e.whisky.avgScore != null && <ScoreDial value={e.whisky.avgScore} size={46} />}
              </div>
            </Card>
          ))}
        </div>
      )}

      {user && (
        <button
          onClick={openPicker}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-white/12 px-4 py-4 text-sm font-semibold text-gold-300"
        >
          <Plus size={17} strokeWidth={2.6} /> Bring a bottle
        </button>
      )}

      {picking && (
        <BringBottleSheet
          cabinet={cabinet}
          claimed={lineup}
          userName={user?.name}
          busy={busy}
          q={q}
          setQ={setQ}
          freeName={freeName}
          setFreeName={setFreeName}
          freeDistillery={freeDistillery}
          setFreeDistillery={setFreeDistillery}
          onPick={bringWhisky}
          onFreestyle={bringFreestyle}
          onClose={closePicker}
        />
      )}

      {claimTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-5 backdrop-blur-sm"
          onClick={() => !busy && setClaimTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold-300/15 text-gold-300">
              <Gift size={20} />
            </div>
            <h3 className="font-display text-xl text-cream">Claim this bottle?</h3>
            <p className="mt-2 text-sm text-muted">
              You’re confirming that <span className="font-semibold text-cream-dim">you’re bringing {claimTarget.whisky.name}</span> to this session. Only claim it if it’s really yours.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                disabled={busy}
                onClick={() => setClaimTarget(null)}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-cream disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => claimBottle(claimTarget.whisky.id)}
                className="flex-1 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 py-3 text-sm font-semibold text-ink-950 disabled:opacity-60"
              >
                {busy ? 'Claiming…' : 'Yes, it’s mine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BringBottleSheet({
  cabinet,
  claimed,
  userName,
  busy,
  q,
  setQ,
  freeName,
  setFreeName,
  freeDistillery,
  setFreeDistillery,
  onPick,
  onFreestyle,
  onClose,
}: {
  cabinet: Whisky[] | null
  claimed: SessionLineupEntry[]
  userName?: string
  busy: boolean
  q: string
  setQ: (v: string) => void
  freeName: string
  setFreeName: (v: string) => void
  freeDistillery: string
  setFreeDistillery: (v: string) => void
  onPick: (whiskyId: number) => void
  onFreestyle: () => void
  onClose: () => void
}) {
  const claimedBy = useMemo(() => {
    const m = new Map<number, string | null>()
    claimed.forEach((e) => m.set(e.whisky.id, e.broughtByName))
    return m
  }, [claimed])

  const filtered = useMemo(() => {
    if (!cabinet) return []
    const t = q.trim().toLowerCase()
    if (!t) return cabinet
    return cabinet.filter(
      (w) => w.name.toLowerCase().includes(t) || w.distillery?.toLowerCase().includes(t),
    )
  }, [cabinet, q])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mt-auto max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-cream">Bring a bottle</h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3">
          <Search size={18} className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the cabinet first…"
            className="w-full bg-transparent text-[15px] text-cream placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          {cabinet == null ? (
            <p className="py-6 text-center text-sm text-muted">Loading the cabinet…</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No matches. Add it as a new bottle below.
            </p>
          ) : (
            filtered.map((w) => {
              const isClaimed = claimedBy.has(w.id)
              const by = claimedBy.get(w.id)
              return (
                <button
                  key={w.id}
                  disabled={busy || isClaimed}
                  onClick={() => onPick(w.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left ${
                    isClaimed
                      ? 'border-white/5 bg-white/[0.02] opacity-60'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ink-700 to-ink-900 text-lg">
                    🥃
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[15px] text-cream">{w.name}</div>
                    <div className="truncate text-sm text-muted">
                      {[w.distillery, w.region].filter(Boolean).join(' · ') || 'Whisky'}
                    </div>
                  </div>
                  {isClaimed && (
                    <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                      {by ? `${by === userName ? 'You' : by} bringing` : 'In line-up'}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-sm font-bold uppercase tracking-wide text-cream-dim">
            Not in the cabinet?
          </div>
          <p className="mt-1 text-xs text-muted">Add it by hand and we’ll pop it in the cabinet.</p>
          <input
            value={freeName}
            onChange={(e) => setFreeName(e.target.value)}
            placeholder="Bottle name (e.g. Lagavulin 16)"
            className={`${inputCls} mt-3`}
          />
          <input
            value={freeDistillery}
            onChange={(e) => setFreeDistillery(e.target.value)}
            placeholder="Distillery (optional)"
            className={`${inputCls} mt-2`}
          />
          <button
            disabled={busy || !freeName.trim()}
            onClick={onFreestyle}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 py-3 text-sm font-semibold text-ink-950 disabled:opacity-60"
          >
            <Plus size={16} strokeWidth={2.6} /> {busy ? 'Adding…' : 'Add my bottle'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-cream placeholder:text-muted focus:border-gold-300/40 focus:outline-none'
