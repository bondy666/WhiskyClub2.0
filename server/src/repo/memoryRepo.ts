import type { AdHocTasting, DashboardStats, Member, PlanNight, Repo, Session, Tasting, Whisky } from './types.js'
import { AD_HOC_SESSION_NAME } from './types.js'
import {
  counters,
  members,
  nightVotes,
  proposedNights,
  sessions,
  tastings,
  whiskies,
} from './seed.js'

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function whiskyStats(id: number) {
  const ts = tastings.filter((t) => t.whiskyId === id)
  const avg = ts.length ? round1(ts.reduce((s, t) => s + t.score, 0) / ts.length) : null
  return { avgScore: avg, tastingCount: ts.length }
}

function decorateWhisky(w: Whisky): Whisky {
  return { ...w, ...whiskyStats(w.id) }
}

function decorateMember(m: Member): Member {
  return { ...m, tastingCount: tastings.filter((t) => t.memberId === m.id).length }
}

// In-memory bringer attribution keyed by `${sessionId}:${whiskyId}`.
const bringers = new Map<string, number>()

export class MemoryRepo implements Repo {
  async listMembers(): Promise<Member[]> {
    return members.map(decorateMember)
  }

  async createMember(input: { name: string; email?: string }): Promise<Member> {
    const m: Member = { id: ++counters.member, name: input.name, email: input.email }
    members.push(m)
    return decorateMember(m)
  }

  async listWhiskies(): Promise<Whisky[]> {
    return whiskies.map(decorateWhisky).sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))
  }

  async getWhisky(id: number) {
    const whisky = whiskies.find((w) => w.id === id)
    if (!whisky) return null
    const nameOfSession = (sid: number | null | undefined) => {
      if (sid == null) return null
      const s = sessions.find((x) => x.id === sid)
      return s && s.name !== AD_HOC_SESSION_NAME ? s.name : null
    }
    const ts = tastings
      .filter((t) => t.whiskyId === id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((t) => ({ ...t, sessionName: nameOfSession(t.sessionId) }))
    return { whisky: decorateWhisky(whisky), tastings: ts, members: members.map(decorateMember) }
  }

  async createWhisky(input: Omit<Whisky, 'id'>): Promise<Whisky> {
    const w: Whisky = { ...input, id: ++counters.whisky }
    whiskies.push(w)
    return decorateWhisky(w)
  }

  async updateWhisky(id: number, input: Partial<Omit<Whisky, 'id'>>): Promise<Whisky | null> {
    const w = whiskies.find((x) => x.id === id)
    if (!w) return null
    if (input.name !== undefined) w.name = input.name
    if (input.distillery !== undefined) w.distillery = input.distillery
    if (input.region !== undefined) w.region = input.region
    if (input.age !== undefined) w.age = input.age
    if (input.abv !== undefined) w.abv = input.abv
    if (input.imageUrl !== undefined) w.imageUrl = input.imageUrl
    return decorateWhisky(w)
  }

  async listSessions(): Promise<Session[]> {
    return [...sessions]
      .filter((s) => s.name !== AD_HOC_SESSION_NAME)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }

  async getSession(id: number) {
    const session = sessions.find((s) => s.id === id)
    if (!session) return null
    const ids = new Set<number>(session.whiskyIds ?? [])
    for (const t of tastings) if (t.sessionId === id) ids.add(t.whiskyId)
    const ws = [...ids]
      .map((wid) => whiskies.find((w) => w.id === wid))
      .filter((w): w is Whisky => Boolean(w))
      .map(decorateWhisky)
    const lineup = (session.whiskyIds ?? [])
      .map((wid) => whiskies.find((w) => w.id === wid))
      .filter((w): w is Whisky => Boolean(w))
      .map((w) => {
        const mid = bringers.get(`${id}:${w.id}`) ?? null
        return {
          whisky: decorateWhisky(w),
          broughtByMemberId: mid,
          broughtByName: mid != null ? members.find((m) => m.id === mid)?.name ?? null : null,
        }
      })
    return { session, whiskies: ws, lineup }
  }

  async createSession(input: Omit<Session, 'id'>): Promise<Session> {
    const s: Session = { ...input, id: ++counters.session, whiskyIds: input.whiskyIds ?? [] }
    sessions.push(s)
    return s
  }

  async updateSessionStatus(id: number, status: Session['status']): Promise<Session | null> {
    const s = sessions.find((x) => x.id === id)
    if (!s) return null
    s.status = status
    return s
  }

  async deleteSession(id: number): Promise<boolean> {
    const idx = sessions.findIndex((s) => s.id === id)
    if (idx === -1) return false
    sessions.splice(idx, 1)
    for (let i = tastings.length - 1; i >= 0; i--) {
      if (tastings[i].sessionId === id) tastings.splice(i, 1)
    }
    return true
  }

  async activeSession(): Promise<Session | null> {
    return (
      [...sessions]
        .filter((s) => s.status === 'active' && s.name !== AD_HOC_SESSION_NAME)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0] ?? null
    )
  }

  async addSessionWhisky(sessionId: number, whiskyId: number, broughtByMemberId: number | null = null) {
    const s = sessions.find((x) => x.id === sessionId)
    if (!s) return null
    s.whiskyIds = s.whiskyIds ?? []
    if (!s.whiskyIds.includes(whiskyId)) s.whiskyIds.push(whiskyId)
    if (broughtByMemberId != null) bringers.set(`${sessionId}:${whiskyId}`, broughtByMemberId)
    return this.getSession(sessionId)
  }

  async addSessionPhotos(id: number, photoUrls: string[]): Promise<Session | null> {
    const s = sessions.find((x) => x.id === id)
    if (!s) return null
    s.photoUrls = [...(s.photoUrls ?? []), ...photoUrls.filter(Boolean)]
    s.photoUrl = s.photoUrls[0] ?? null
    return s
  }

  async removeSessionPhoto(id: number, photoUrl: string): Promise<Session | null> {
    const s = sessions.find((x) => x.id === id)
    if (!s) return null
    s.photoUrls = (s.photoUrls ?? []).filter((u) => u !== photoUrl)
    s.photoUrl = s.photoUrls[0] ?? null
    return s
  }

  async createTasting(
    input: Omit<Tasting, 'id' | 'createdAt' | 'memberId'>,
    memberId: number,
  ): Promise<Tasting> {
    const live = await this.activeSession()
    const t: Tasting = {
      ...input,
      sessionId: input.sessionId ?? live?.id ?? null,
      id: ++counters.tasting,
      memberId,
      createdAt: new Date().toISOString(),
      nose: { ...input.nose, aromas: input.nose?.aromas ?? [] },
    }
    tastings.push(t)
    return t
  }

  async updateTasting(
    id: number,
    input: Omit<Tasting, 'id' | 'createdAt' | 'memberId'>,
    memberId: number,
  ): Promise<Tasting | null> {
    const t = tastings.find((x) => x.id === id && x.memberId === memberId)
    if (!t) return null
    t.score = input.score
    t.bottle = input.bottle ?? {}
    t.appearance = input.appearance ?? {}
    t.nose = { ...input.nose, aromas: input.nose?.aromas ?? [] }
    t.palate = input.palate ?? {}
    t.finish = input.finish ?? {}
    t.overallNotes = input.overallNotes
    return t
  }

  async deleteTasting(id: number, memberId: number): Promise<boolean> {
    const idx = tastings.findIndex((t) => t.id === id && t.memberId === memberId)
    if (idx === -1) return false
    tastings.splice(idx, 1)
    return true
  }

  async listAdHocTastings(): Promise<AdHocTasting[]> {
    const adHocIds = new Set(sessions.filter((s) => s.name === AD_HOC_SESSION_NAME).map((s) => s.id))
    return tastings
      .filter((t) => t.sessionId == null || adHocIds.has(t.sessionId))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((t) => ({
        ...t,
        whiskyName: whiskies.find((w) => w.id === t.whiskyId)?.name ?? 'Whisky',
        memberName: members.find((m) => m.id === t.memberId)?.name ?? 'Member',
      }))
  }

  async listPlan(memberId: number | null): Promise<PlanNight[]> {
    return proposedNights
      .map((n) => {
        const votes = nightVotes.filter((v) => v.nightId === n.id)
        const voters = votes
          .map((v) => members.find((m) => m.id === v.memberId))
          .filter((m): m is Member => Boolean(m))
          .map((m) => ({ id: m.id, name: m.name }))
        return {
          id: n.id,
          date: n.date,
          voteCount: votes.length,
          voters,
          votedByMe: memberId != null && votes.some((v) => v.memberId === memberId),
        }
      })
      .sort((a, b) => b.voteCount - a.voteCount || a.date.localeCompare(b.date))
  }

  async proposeNight(date: string, memberId: number): Promise<PlanNight[]> {
    if (!proposedNights.some((n) => n.date === date)) {
      proposedNights.push({ id: ++counters.night, date, proposedByMemberId: memberId })
    }
    return this.listPlan(memberId)
  }

  async removeNight(id: number): Promise<PlanNight[]> {
    const idx = proposedNights.findIndex((n) => n.id === id)
    if (idx !== -1) proposedNights.splice(idx, 1)
    for (let i = nightVotes.length - 1; i >= 0; i--) {
      if (nightVotes[i].nightId === id) nightVotes.splice(i, 1)
    }
    return this.listPlan(null)
  }

  async toggleVote(nightId: number, memberId: number): Promise<PlanNight[]> {
    const idx = nightVotes.findIndex((v) => v.nightId === nightId && v.memberId === memberId)
    if (idx !== -1) nightVotes.splice(idx, 1)
    else if (proposedNights.some((n) => n.id === nightId)) {
      nightVotes.push({ id: ++counters.vote, nightId, memberId })
    }
    return this.listPlan(memberId)
  }

  async lockInNight(nightId: number, name: string): Promise<Session | null> {
    const night = proposedNights.find((n) => n.id === nightId)
    if (!night) return null
    const session = await this.createSession({
      name,
      date: `${night.date}T19:00:00`,
      status: 'planned',
    } as Omit<Session, 'id'>)
    // The night is chosen — clear the whole planning board for a fresh start.
    proposedNights.length = 0
    nightVotes.length = 0
    return session
  }

  async stats(): Promise<DashboardStats> {
    const avgScore = tastings.length
      ? round1(tastings.reduce((s, t) => s + t.score, 0) / tastings.length)
      : null

    const scored = whiskies
      .map((w) => ({ w, ...whiskyStats(w.id) }))
      .filter((x) => x.avgScore != null)
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    const topWhisky = scored[0]
      ? { name: scored[0].w.name, score: scored[0].avgScore as number }
      : null

    const memberCounts = members
      .map((m) => ({ m, count: tastings.filter((t) => t.memberId === m.id).length }))
      .sort((a, b) => b.count - a.count)
    const mostActiveMember = memberCounts[0]?.count
      ? { name: memberCounts[0].m.name, count: memberCounts[0].count }
      : null

    const activeMembers = members.filter((m) =>
      tastings.some((t) => t.memberId === m.id),
    ).length

    const recentSessions = [...sessions]
      .filter((s) => s.name !== AD_HOC_SESSION_NAME)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 3)

    return {
      sessionCount: sessions.filter((s) => s.name !== AD_HOC_SESSION_NAME).length,
      whiskyCount: whiskies.length,
      activeMembers,
      tastingCount: tastings.length,
      avgScore,
      topWhisky,
      mostActiveMember,
      recentSessions,
    }
  }
}
