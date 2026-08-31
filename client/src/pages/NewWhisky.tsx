import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus } from 'lucide-react'
import { api } from '../lib/api'
import type { Whisky } from '../types'
import { WhiskyImage } from '../components/WhiskyImage'
import { Loader } from '../components/ui'
import { fileToCompressedDataUrl } from '../lib/image'

const REGIONS = ['Speyside', 'Islay', 'Highland', 'Lowland', 'Campbeltown', 'Islands', 'Other']

export function NewWhisky() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = Boolean(id)
  const [params] = useSearchParams()
  const sessionId = params.get('session')
  const [form, setForm] = useState({ name: '', distillery: '', region: '', age: '', abv: '', imageUrl: '' })
  const [otherRegion, setOtherRegion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(editing)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    api
      .get<{ whisky: Whisky }>(`/whiskies/${id}`)
      .then(({ whisky }) =>
        setForm({
          name: whisky.name ?? '',
          distillery: whisky.distillery ?? '',
          region: whisky.region ?? '',
          age: whisky.age != null ? String(whisky.age) : '',
          abv: whisky.abv != null ? String(whisky.abv) : '',
          imageUrl: whisky.imageUrl ?? '',
        }),
      )
      .catch(() => alert('Could not load this whisky.'))
      .finally(() => setLoading(false))
  }, [editing, id])

  useEffect(() => {
    if (form.region && !REGIONS.includes(form.region)) setOtherRegion(true)
  }, [form.region])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      set('imageUrl', dataUrl)
    } catch (err) {
      alert('Could not process image. ' + (err as Error).message)
    }
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      distillery: form.distillery.trim() || undefined,
      region: form.region || undefined,
      age: form.age ? Number(form.age) : null,
      abv: form.abv ? Number(form.abv) : null,
      imageUrl: form.imageUrl.trim() || null,
    }
    try {
      if (editing) {
        await api.put<Whisky>(`/whiskies/${id}`, payload)
        navigate(`/whiskies/${id}`, { replace: true })
        return
      }
      const created = await api.post<Whisky>('/whiskies', payload)
      if (sessionId) {
        await api.post(`/sessions/${sessionId}/whiskies`, { whiskyId: created.id })
        navigate(`/sessions/${sessionId}`, { replace: true })
        return
      }
      navigate(`/whiskies/${created.id}`, { replace: true })
    } catch (e) {
      alert('Could not save. ' + (e as Error).message)
      setSaving(false)
    }
  }

  if (loading) return <Loader />

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 mt-1 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-cream"
      >
        <ArrowLeft size={18} />
      </button>
      <h1 className="font-display text-3xl font-semibold text-cream">
        {editing ? 'Edit whisky' : 'Add a whisky'}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {editing
          ? 'Update the details, photo or image URL.'
          : sessionId
            ? 'It will be added to this session’s line-up.'
            : 'Only the name is required.'}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Field label="Name">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Lagavulin 16"
            className={inputCls}
          />
        </Field>
        <Field label="Distillery">
          <input
            value={form.distillery}
            onChange={(e) => set('distillery', e.target.value)}
            placeholder="e.g. Lagavulin"
            className={inputCls}
          />
        </Field>
        <Field label="Region">
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => {
              const active = r === 'Other' ? otherRegion : !otherRegion && form.region === r
              return (
                <button
                  key={r}
                  onClick={() => {
                    if (r === 'Other') {
                      setOtherRegion((v) => !v)
                      set('region', '')
                    } else {
                      setOtherRegion(false)
                      set('region', form.region === r ? '' : r)
                    }
                  }}
                  className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
                    active
                      ? 'bg-gold-300 text-ink-950'
                      : 'border border-white/10 bg-white/[0.03] text-cream-dim'
                  }`}
                >
                  {r}
                </button>
              )
            })}
          </div>
          {otherRegion && (
            <input
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder="Enter region"
              className={`${inputCls} mt-2`}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Age (years)">
            <input
              inputMode="numeric"
              value={form.age}
              onChange={(e) => set('age', e.target.value.replace(/\D/g, ''))}
              placeholder="16"
              className={inputCls}
            />
          </Field>
          <Field label="ABV (%)">
            <input
              inputMode="decimal"
              value={form.abv}
              onChange={(e) => set('abv', e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="43"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Photo">
          <div className="flex items-center gap-3">
            <WhiskyImage url={form.imageUrl.trim()} alt="" className="h-16 w-16 rounded-xl" emojiSize="text-2xl" />
            <div className="flex flex-1 flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-full bg-gold-300/15 px-4 py-3 text-sm font-semibold text-gold-300 ring-1 ring-gold-300/25"
              >
                <ImagePlus size={16} />
                {form.imageUrl && !/^https?:/i.test(form.imageUrl) ? 'Change photo' : 'Upload photo'}
              </button>
              <input
                value={/^https?:/i.test(form.imageUrl) ? form.imageUrl : ''}
                onChange={(e) => set('imageUrl', e.target.value)}
                placeholder="…or paste an image URL"
                className={inputCls}
              />
            </div>
          </div>
        </Field>
      </div>

      <button
        disabled={saving || !form.name.trim()}
        onClick={save}
        className="mt-8 w-full rounded-full bg-gradient-to-br from-gold-300 to-gold-500 py-4 font-semibold text-ink-950 disabled:opacity-60"
      >
        {saving ? 'Saving…' : editing ? 'Save changes' : sessionId ? 'Add to line-up' : 'Add whisky'}
      </button>
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-cream placeholder:text-muted focus:border-gold-300/40 focus:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold uppercase tracking-wide text-cream-dim">
        {label}
      </span>
      {children}
    </label>
  )
}
