import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getRepo } from './repo/index.js'
import { getCurrentUser } from './auth.js'
import type { Repo } from './repo/types.js'

try {
  // Node 20.6+ built-in .env loader
  process.loadEnvFile?.()
} catch {
  /* no .env file — rely on process env */
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '8mb' })) // large enough for compressed photo data URLs

const asyncH =
  (fn: (req: express.Request, res: express.Response) => Promise<unknown>) =>
  (req: express.Request, res: express.Response) =>
    fn(req, res).catch((err) => {
      console.error(err)
      res.status(500).json({ error: (err as Error).message })
    })

/* ---------- Auth ---------- */
app.get('/.auth/me', (req, res) => {
  const user = getCurrentUser(req)
  if (!user) return res.json({ clientPrincipal: null })
  res.json({
    clientPrincipal: {
      identityProvider: user.provider,
      userId: user.userId,
      userDetails: user.email ?? user.name,
      claims: [{ typ: 'name', val: user.name }],
    },
  })
})

// In local dev these just bounce home; in Azure, EasyAuth owns these paths.
app.get('/.auth/login/:provider', (_req, res) => res.redirect('/'))
app.get('/.auth/logout', (_req, res) => res.redirect('/'))

/* ---------- API ---------- */
const api = express.Router()

api.get('/stats', asyncH(async (_req, res) => res.json(await (await getRepo()).stats())))

// Identity + membership for the signed-in user. `member` is null for
// authenticated accounts that are not registered Guild members.
api.get('/me', asyncH(async (req, res) => {
  const repo = await getRepo()
  const user = getCurrentUser(req)
  const mid = await optionalMemberId(repo, req)
  const member =
    mid != null ? (await repo.listMembers()).find((m) => m.id === mid) ?? null : null
  res.json({
    user,
    member: member ? { id: member.id, name: member.name } : null,
    isMember: member != null,
  })
}))

api.get('/members', asyncH(async (_req, res) => res.json(await (await getRepo()).listMembers())))

api.post('/members', asyncH(async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'Name is required' })
  const email = String(req.body?.email ?? '').trim() || undefined
  const created = await (await getRepo()).createMember({ name, email })
  res.status(201).json(created)
}))
api.get('/whiskies', asyncH(async (_req, res) => res.json(await (await getRepo()).listWhiskies())))

api.get('/whiskies/:id', asyncH(async (req, res) => {
  const data = await (await getRepo()).getWhisky(Number(req.params.id))
  if (!data) return res.status(404).json({ error: 'Whisky not found' })
  res.json(data)
}))

api.post('/whiskies', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(403).json({ error: 'Only Guild members can add whiskies' })
  const created = await repo.createWhisky({ ...req.body, addedByMemberId: mid })
  res.status(201).json(created)
}))

api.put('/whiskies/:id', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(403).json({ error: 'Only Guild members can edit whiskies' })
  const updated = await repo.updateWhisky(Number(req.params.id), req.body)
  if (!updated) return res.status(404).json({ error: 'Whisky not found' })
  res.json(updated)
}))

api.get('/sessions', asyncH(async (_req, res) => res.json(await (await getRepo()).listSessions())))

api.get('/sessions/active', asyncH(async (_req, res) => res.json(await (await getRepo()).activeSession())))

api.get('/sessions/:id', asyncH(async (req, res) => {
  const data = await (await getRepo()).getSession(Number(req.params.id))
  if (!data) return res.status(404).json({ error: 'Session not found' })
  res.json(data)
}))

api.post('/sessions', asyncH(async (req, res) => {
  const created = await (await getRepo()).createSession(req.body)
  res.status(201).json(created)
}))

api.post('/sessions/:id/status', asyncH(async (req, res) => {
  const status = String(req.body?.status ?? '')
  if (!['planned', 'active', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  const updated = await (await getRepo()).updateSessionStatus(Number(req.params.id), status as never)
  if (!updated) return res.status(404).json({ error: 'Session not found' })
  res.json(updated)
}))

api.post('/sessions/:id/photos', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(401).json({ error: 'Sign in to add photos' })
  const raw = Array.isArray(req.body?.photoUrls) ? req.body.photoUrls : [req.body?.photoUrl]
  const photoUrls = raw.filter((u: unknown): u is string => typeof u === 'string' && u.length > 0)
  if (photoUrls.length === 0) return res.status(400).json({ error: 'No photos provided' })
  const updated = await repo.addSessionPhotos(Number(req.params.id), photoUrls)
  if (!updated) return res.status(404).json({ error: 'Session not found' })
  res.json(updated)
}))

api.delete('/sessions/:id/photos', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(401).json({ error: 'Sign in to remove photos' })
  const photoUrl = String(req.body?.photoUrl ?? '')
  if (!photoUrl) return res.status(400).json({ error: 'No photo provided' })
  const updated = await repo.removeSessionPhoto(Number(req.params.id), photoUrl)
  if (!updated) return res.status(404).json({ error: 'Session not found' })
  res.json(updated)
}))

api.post('/sessions/:id/whiskies', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(401).json({ error: 'Sign in to edit the line-up' })
  const whiskyId = Number(req.body?.whiskyId)
  if (!whiskyId) return res.status(400).json({ error: 'whiskyId is required' })
  const updated = await repo.addSessionWhisky(Number(req.params.id), whiskyId)
  if (!updated) return res.status(404).json({ error: 'Session not found' })
  res.json(updated)
}))

api.delete('/sessions/:id', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(401).json({ error: 'Sign in to delete a session' })
  const ok = await repo.deleteSession(Number(req.params.id))
  if (!ok) return res.status(404).json({ error: 'Session not found' })
  res.json({ ok: true })
}))

api.post('/tastings', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(403).json({ error: 'Only Guild members can log tastings' })
  const created = await repo.createTasting(req.body, mid)
  res.status(201).json(created)
}))

api.put('/tastings/:id', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(403).json({ error: 'Only Guild members can edit tastings' })
  const updated = await repo.updateTasting(Number(req.params.id), req.body, mid)
  if (!updated) return res.status(404).json({ error: 'Tasting not found or not yours to edit' })
  res.json(updated)
}))

api.delete('/tastings/:id', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(403).json({ error: 'Only Guild members can delete tastings' })
  const ok = await repo.deleteTasting(Number(req.params.id), mid)
  if (!ok) return res.status(404).json({ error: 'Tasting not found or not yours to delete' })
  res.json({ ok: true })
}))

api.get('/adhoc', asyncH(async (_req, res) => res.json(await (await getRepo()).listAdHocTastings())))

/* ---------- Plan the next night (propose + vote) ---------- */
// Resolve the signed-in member, or null when not authenticated.
async function optionalMemberId(repo: Repo, req: express.Request): Promise<number | null> {
  const user = getCurrentUser(req)
  if (!user) return null
  const members = await repo.listMembers()
  if (user.email) {
    const m = members.find((x) => x.email?.toLowerCase() === user.email?.toLowerCase())
    if (m) return m.id
  }
  if (user.name) {
    const m = members.find((x) => x.name.toLowerCase() === user.name.toLowerCase())
    if (m) return m.id
  }
  return null
}

api.get('/plan', asyncH(async (req, res) => {
  const repo = await getRepo()
  res.json(await repo.listPlan(await optionalMemberId(repo, req)))
}))

api.post('/plan', asyncH(async (req, res) => {
  const date = String(req.body?.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date' })
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(401).json({ error: 'Sign in to propose a date' })
  res.status(201).json(await repo.proposeNight(date, mid))
}))

api.delete('/plan/:id', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(401).json({ error: 'Sign in to edit dates' })
  res.json(await repo.removeNight(Number(req.params.id)))
}))

api.post('/plan/:id/vote', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(401).json({ error: 'Sign in to vote' })
  res.json(await repo.toggleVote(Number(req.params.id), mid))
}))

api.post('/plan/:id/lock', asyncH(async (req, res) => {
  const repo = await getRepo()
  const mid = await optionalMemberId(repo, req)
  if (mid == null) return res.status(403).json({ error: 'Only Guild members can lock in a night' })
  const name = String(req.body?.name ?? '').trim() || 'Guild Night'
  const session = await repo.lockInNight(Number(req.params.id), name)
  if (!session) return res.status(404).json({ error: 'Proposed night not found' })
  res.status(201).json(session)
}))

app.use('/api', api)

/* ---------- Serve built client in production ---------- */
const clientDist = path.resolve(__dirname, '../../client/dist')
app.use(express.static(clientDist))
app.get('/{*any}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client build not found. Run `npm run build` in /client.')
  })
})

const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => console.log(`🥃 Whisky Guild API on http://localhost:${port}`))
// Warm the repo without blocking startup so the worker binds the port even if SQL is slow/unreachable.
getRepo().catch((err) => console.error('Repo init failed:', err))
