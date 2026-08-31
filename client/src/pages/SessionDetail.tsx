import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GlassWater, ImagePlus, Lock, MapPin, MessageCircle, Play, Plus, Trash2, Unlock, User, X } from 'lucide-react'
import { api } from '../lib/api'
import type { Session, Whisky } from '../types'
import { Card, Loader, StatusBadge } from '../components/ui'
import { ScoreDial } from '../components/ScoreDial'
import { openSessionPoll } from '../lib/whatsapp'
import { fileToCompressedDataUrl } from '../lib/image'
import { useAuth } from '../context/AuthContext'

interface Detail {
  session: Session
  whiskies: Whisky[]
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

  useEffect(() => {
    api.get<Detail>(`/sessions/${id}`).then(setData).catch(() => setData(null))
  }, [id])

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
  const { session, whiskies } = data
  const photos = session.photoUrls?.length ? session.photoUrls : session.photoUrl ? [session.photoUrl] : []

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

      <h2 className="mb-3 mt-8 font-display text-xl text-cream">Line-up</h2>
      {whiskies.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-muted">
          No whiskies added to this session yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {whiskies.map((w) => (
            <Card
              key={w.id}
              className="flex items-center gap-4 p-4"
              onClick={() => navigate(`/whiskies/${w.id}`)}
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
              {w.avgScore != null ? (
                <ScoreDial value={w.avgScore} size={46} />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/taste?whisky=${w.id}&session=${session.id}`)
                  }}
                  className="rounded-full bg-gold-300/15 px-3 py-1.5 text-xs font-semibold text-gold-300"
                >
                  Taste
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {user && (
        <button
          onClick={() => navigate(`/whiskies/new?session=${session.id}`)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-white/12 px-4 py-4 text-sm font-semibold text-gold-300"
        >
          <Plus size={17} strokeWidth={2.6} /> Add a whisky to the line-up
        </button>
      )}
    </div>
  )
}
