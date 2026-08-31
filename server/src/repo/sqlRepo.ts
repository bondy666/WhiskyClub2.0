import sql from 'mssql'
import type { AdHocTasting, DashboardStats, Member, PlanNight, Repo, Session, Tasting, Whisky } from './types.js'
import { AD_HOC_SESSION_NAME } from './types.js'

function round1(n: number) {
  return Math.round(n * 10) / 10
}

const splitAromas = (v: string | null): string[] =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []

// Maps the app model onto the existing WhiskyClubDb schema:
//   ClubMembers · Whiskies · TastingSessions · TastingEntries
export class SqlRepo implements Repo {
  constructor(private pool: sql.ConnectionPool) {}

  private mapWhisky = (r: Record<string, unknown>): Whisky => ({
    id: r.Id as number,
    name: r.Name as string,
    distillery: (r.Distillery as string) ?? undefined,
    region: (r.Region as string) ?? undefined,
    age: (r.AgeYears as number) ?? null,
    abv: r.ABV != null ? Number(r.ABV) : null,
    imageUrl: (r.ImageUrl as string) ?? null,
    avgScore: r.AvgScore != null ? round1(Number(r.AvgScore)) : null,
    tastingCount: (r.TastingCount as number) ?? 0,
  })

  private mapSession = (r: Record<string, unknown>): Session => ({
    id: r.Id as number,
    name: r.Name as string,
    location: (r.Theme as string) ?? undefined,
    date: (r.SessionDate as Date).toISOString(),
    status: (r.Status as Session['status']) ?? 'planned',
    photoUrl: (r.PhotoUrl as string) ?? null,
  })

  private mapTasting = (r: Record<string, unknown>): Tasting => ({
    id: r.Id as number,
    whiskyId: r.WhiskyId as number,
    memberId: (r.ClubMemberId as number) ?? 0,
    sessionId: (r.TastingSessionId as number) ?? null,
    sessionName: (r.SessionName as string) ?? null,
    score: r.OverallScore != null ? Number(r.OverallScore) : Number(r.Score ?? 0),
    createdAt: (r.CreatedAt as Date).toISOString(),
    bottle: {
      presence: (r.BottlePresence as string) ?? undefined,
      style: splitAromas((r.BottleStyle as string) ?? null),
      notes: (r.BottleNotes as string) ?? undefined,
    },
    appearance: {
      colour: (r.AppearanceColour as string) ?? undefined,
      clarity: (r.AppearanceClarity as string) ?? undefined,
      notes: (r.AppearanceNotes as string) ?? undefined,
    },
    nose: {
      intensity: (r.NoseIntensity as string) ?? undefined,
      aromas: splitAromas((r.NoseAromas as string) ?? null),
      notes: (r.NoseNotes as string) ?? undefined,
    },
    palate: {
      sweetness: (r.PalateSweetness as string) ?? undefined,
      body: (r.PalateBody as string) ?? undefined,
      notes: (r.PalateNotes as string) ?? undefined,
    },
    finish: {
      length: (r.FinishLength as string) ?? undefined,
      notes: (r.FinishNotes as string) ?? undefined,
    },
    overallNotes: (r.OverallNotes as string) ?? undefined,
  })

  async listMembers(): Promise<Member[]> {
    const r = await this.pool.request().query(`
      SELECT m.Id, m.Name, m.Email,
        (SELECT COUNT(*) FROM dbo.TastingEntries t WHERE t.ClubMemberId = m.Id) AS TastingCount
      FROM dbo.ClubMembers m
      WHERE m.IsActive = 1
      ORDER BY m.Name`)
    return r.recordset.map((x) => ({
      id: x.Id, name: x.Name, email: x.Email ?? undefined, tastingCount: x.TastingCount,
    }))
  }

  async createMember(input: { name: string; email?: string }): Promise<Member> {
    const r = await this.pool.request()
      .input('name', sql.NVarChar, input.name)
      .input('email', sql.NVarChar, input.email ?? null)
      .query(`INSERT INTO dbo.ClubMembers (Name, Email, IsActive, CreatedAt)
              OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email
              VALUES (@name, @email, 1, SYSUTCDATETIME())`)
    const x = r.recordset[0]
    return { id: x.Id, name: x.Name, email: x.Email ?? undefined, tastingCount: 0 }
  }

  async listWhiskies(): Promise<Whisky[]> {
    const r = await this.pool.request().query(`
      SELECT w.*,
        (SELECT AVG(CAST(t.OverallScore AS FLOAT)) FROM dbo.TastingEntries t WHERE t.WhiskyId = w.Id) AS AvgScore,
        (SELECT COUNT(*) FROM dbo.TastingEntries t WHERE t.WhiskyId = w.Id) AS TastingCount
      FROM dbo.Whiskies w
      ORDER BY AvgScore DESC`)
    return r.recordset.map(this.mapWhisky)
  }

  async getWhisky(id: number) {
    const wr = await this.pool.request().input('id', sql.Int, id).query(`
      SELECT w.*,
        (SELECT AVG(CAST(t.OverallScore AS FLOAT)) FROM dbo.TastingEntries t WHERE t.WhiskyId = w.Id) AS AvgScore,
        (SELECT COUNT(*) FROM dbo.TastingEntries t WHERE t.WhiskyId = w.Id) AS TastingCount
      FROM dbo.Whiskies w WHERE w.Id = @id`)
    if (!wr.recordset[0]) return null
    const tr = await this.pool.request()
      .input('id', sql.Int, id)
      .input('adhoc', sql.NVarChar, AD_HOC_SESSION_NAME)
      .query(`SELECT te.*,
                CASE WHEN s.Name = @adhoc THEN NULL ELSE s.Name END AS SessionName
              FROM dbo.TastingEntries te
              LEFT JOIN dbo.TastingSessions s ON s.Id = te.TastingSessionId
              WHERE te.WhiskyId = @id ORDER BY te.CreatedAt DESC`)
    const members = await this.listMembers()
    return {
      whisky: this.mapWhisky(wr.recordset[0]),
      tastings: tr.recordset.map(this.mapTasting),
      members,
    }
  }

  async createWhisky(input: Omit<Whisky, 'id'>): Promise<Whisky> {
    const r = await this.pool.request()
      .input('name', sql.NVarChar, input.name)
      .input('distillery', sql.NVarChar, input.distillery ?? null)
      .input('region', sql.NVarChar, input.region ?? null)
      .input('age', sql.Int, input.age ?? null)
      .input('abv', sql.Decimal(5, 1), input.abv ?? null)
      .input('img', sql.NVarChar(sql.MAX), input.imageUrl ?? null)
      .query(`INSERT INTO dbo.Whiskies (Name, Distillery, Region, AgeYears, ABV, ImageUrl)
              OUTPUT INSERTED.* VALUES (@name, @distillery, @region, @age, @abv, @img)`)
    return this.mapWhisky({ ...r.recordset[0], AvgScore: null, TastingCount: 0 })
  }

  async updateWhisky(id: number, input: Partial<Omit<Whisky, 'id'>>): Promise<Whisky | null> {
    const r = await this.pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, input.name ?? null)
      .input('distillery', sql.NVarChar, input.distillery ?? null)
      .input('region', sql.NVarChar, input.region ?? null)
      .input('age', sql.Int, input.age ?? null)
      .input('abv', sql.Decimal(5, 1), input.abv ?? null)
      .input('img', sql.NVarChar(sql.MAX), input.imageUrl ?? null)
      .query(`UPDATE dbo.Whiskies
              SET Name = @name, Distillery = @distillery, Region = @region,
                  AgeYears = @age, ABV = @abv, ImageUrl = @img
              WHERE Id = @id;
              SELECT w.*,
                (SELECT AVG(CAST(t.OverallScore AS FLOAT)) FROM dbo.TastingEntries t WHERE t.WhiskyId = w.Id) AS AvgScore,
                (SELECT COUNT(*) FROM dbo.TastingEntries t WHERE t.WhiskyId = w.Id) AS TastingCount
              FROM dbo.Whiskies w WHERE w.Id = @id`)
    if (!r.recordset[0]) return null
    return this.mapWhisky(r.recordset[0])
  }

  async listSessions(): Promise<Session[]> {
    const r = await this.pool.request()
      .input('adhoc', sql.NVarChar, AD_HOC_SESSION_NAME)
      .query(`SELECT * FROM dbo.TastingSessions WHERE Name <> @adhoc ORDER BY SessionDate DESC`)
    return r.recordset.map(this.mapSession)
  }

  async getSession(id: number) {
    const sr = await this.pool.request().input('id', sql.Int, id)
      .query(`SELECT * FROM dbo.TastingSessions WHERE Id = @id`)
    if (!sr.recordset[0]) return null
    // Line-up = whiskies explicitly added to the session plus any that were tasted in it.
    const wr = await this.pool.request().input('id', sql.Int, id).query(`
      SELECT w.*,
        (SELECT AVG(CAST(t2.OverallScore AS FLOAT)) FROM dbo.TastingEntries t2 WHERE t2.WhiskyId = w.Id) AS AvgScore,
        (SELECT COUNT(*) FROM dbo.TastingEntries t2 WHERE t2.WhiskyId = w.Id) AS TastingCount
      FROM dbo.Whiskies w
      WHERE w.Id IN (
        SELECT WhiskyId FROM dbo.SessionWhiskies WHERE TastingSessionId = @id
        UNION
        SELECT DISTINCT WhiskyId FROM dbo.TastingEntries WHERE TastingSessionId = @id
      )
      ORDER BY w.Name`)
    const session = this.mapSession(sr.recordset[0])
    session.photoUrls = await this.listSessionPhotos(id)
    return { session, whiskies: wr.recordset.map(this.mapWhisky) }
  }

  private async listSessionPhotos(id: number): Promise<string[]> {
    const r = await this.pool.request().input('id', sql.Int, id)
      .query(`SELECT ImageUrl FROM dbo.SessionPhotos WHERE TastingSessionId = @id ORDER BY CreatedAt, Id`)
    return r.recordset.map((x) => x.ImageUrl as string)
  }

  async createSession(input: Omit<Session, 'id'>): Promise<Session> {
    const r = await this.pool.request()
      .input('name', sql.NVarChar, input.name)
      .input('date', sql.Date, new Date(input.date))
      .input('theme', sql.NVarChar, input.location ?? input.hostName ?? null)
      .input('status', sql.NVarChar, input.status)
      .query(`INSERT INTO dbo.TastingSessions (Name, SessionDate, Theme, Status)
              OUTPUT INSERTED.* VALUES (@name, @date, @theme, @status)`)
    return this.mapSession(r.recordset[0])
  }

  async updateSessionStatus(id: number, status: Session['status']): Promise<Session | null> {
    const r = await this.pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE dbo.TastingSessions SET Status = @status
              OUTPUT INSERTED.* WHERE Id = @id`)
    return r.recordset[0] ? this.mapSession(r.recordset[0]) : null
  }

  async addSessionWhisky(sessionId: number, whiskyId: number) {
    const exists = await this.pool.request().input('id', sql.Int, sessionId)
      .query(`SELECT 1 FROM dbo.TastingSessions WHERE Id = @id`)
    if (!exists.recordset[0]) return null
    await this.pool.request()
      .input('sid', sql.Int, sessionId)
      .input('wid', sql.Int, whiskyId)
      .query(`IF NOT EXISTS (SELECT 1 FROM dbo.SessionWhiskies WHERE TastingSessionId = @sid AND WhiskyId = @wid)
                INSERT INTO dbo.SessionWhiskies (TastingSessionId, WhiskyId) VALUES (@sid, @wid)`)
    return this.getSession(sessionId)
  }

  async addSessionPhotos(id: number, photoUrls: string[]): Promise<Session | null> {
    const sr = await this.pool.request().input('id', sql.Int, id)
      .query(`SELECT * FROM dbo.TastingSessions WHERE Id = @id`)
    if (!sr.recordset[0]) return null
    for (const url of photoUrls) {
      if (!url) continue
      await this.pool.request()
        .input('id', sql.Int, id)
        .input('photo', sql.NVarChar(sql.MAX), url)
        .query(`INSERT INTO dbo.SessionPhotos (TastingSessionId, ImageUrl) VALUES (@id, @photo)`)
    }
    const session = this.mapSession(sr.recordset[0])
    session.photoUrls = await this.listSessionPhotos(id)
    return session
  }

  async removeSessionPhoto(id: number, photoUrl: string): Promise<Session | null> {
    const sr = await this.pool.request().input('id', sql.Int, id)
      .query(`SELECT * FROM dbo.TastingSessions WHERE Id = @id`)
    if (!sr.recordset[0]) return null
    await this.pool.request()
      .input('id', sql.Int, id)
      .input('photo', sql.NVarChar(sql.MAX), photoUrl)
      .query(`DELETE FROM dbo.SessionPhotos WHERE TastingSessionId = @id AND ImageUrl = @photo`)
    const session = this.mapSession(sr.recordset[0])
    session.photoUrls = await this.listSessionPhotos(id)
    return session
  }

  async deleteSession(id: number): Promise<boolean> {
    await this.pool.request().input('id', sql.Int, id)
      .query(`DELETE FROM dbo.TastingEntries WHERE TastingSessionId = @id`)
    const r = await this.pool.request().input('id', sql.Int, id)
      .query(`DELETE FROM dbo.TastingSessions WHERE Id = @id`)
    return (r.rowsAffected[0] ?? 0) > 0
  }

  async activeSession(): Promise<Session | null> {
    const r = await this.pool.request()
      .input('adhoc', sql.NVarChar, AD_HOC_SESSION_NAME)
      .query(`SELECT TOP 1 * FROM dbo.TastingSessions
              WHERE Status = 'active' AND Name <> @adhoc
              ORDER BY SessionDate DESC, Id DESC`)
    return r.recordset[0] ? this.mapSession(r.recordset[0]) : null
  }

  // Where a dram is logged when no session is chosen: the live session, else the ad-hoc catch-all.
  private async attributionSessionId(): Promise<number> {
    const active = await this.activeSession()
    return active ? active.id : this.defaultSessionId()
  }

  private async defaultSessionId(): Promise<number> {
    const existing = await this.pool.request()
      .input('adhoc', sql.NVarChar, AD_HOC_SESSION_NAME)
      .query(`SELECT TOP 1 Id FROM dbo.TastingSessions WHERE Name = @adhoc`)
    if (existing.recordset[0]) return existing.recordset[0].Id
    const created = await this.pool.request()
      .input('adhoc', sql.NVarChar, AD_HOC_SESSION_NAME)
      .query(`
      INSERT INTO dbo.TastingSessions (Name, SessionDate, Status)
      OUTPUT INSERTED.Id VALUES (@adhoc, CAST(SYSUTCDATETIME() AS DATE), 'active')`)
    return created.recordset[0].Id
  }

  async listAdHocTastings(): Promise<AdHocTasting[]> {
    const r = await this.pool.request()
      .input('adhoc', sql.NVarChar, AD_HOC_SESSION_NAME)
      .query(`
        SELECT te.*, w.Name AS WhiskyName, m.Name AS MemberName
        FROM dbo.TastingEntries te
        JOIN dbo.TastingSessions s ON s.Id = te.TastingSessionId AND s.Name = @adhoc
        JOIN dbo.Whiskies w ON w.Id = te.WhiskyId
        LEFT JOIN dbo.ClubMembers m ON m.Id = te.ClubMemberId
        ORDER BY te.CreatedAt DESC`)
    return r.recordset.map((row) => ({
      ...this.mapTasting(row),
      whiskyName: (row.WhiskyName as string) ?? 'Whisky',
      memberName: (row.MemberName as string) ?? 'Member',
    }))
  }

  async createTasting(
    input: Omit<Tasting, 'id' | 'createdAt' | 'memberId'>,
    memberId: number,
  ): Promise<Tasting> {
    const sessionId = input.sessionId ?? (await this.attributionSessionId())
    const r = await this.pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('whiskyId', sql.Int, input.whiskyId)
      .input('memberId', sql.Int, memberId)
      .input('score', sql.Decimal(4, 1), input.score)
      .input('scoreInt', sql.Int, Math.round(input.score))
      .input('bp', sql.NVarChar, input.bottle?.presence ?? null)
      .input('bs', sql.NVarChar, (input.bottle?.style ?? []).join(', ') || null)
      .input('bn', sql.NVarChar(sql.MAX), input.bottle?.notes ?? null)
      .input('ac', sql.NVarChar, input.appearance?.colour ?? null)
      .input('acl', sql.NVarChar, input.appearance?.clarity ?? null)
      .input('an', sql.NVarChar(sql.MAX), input.appearance?.notes ?? null)
      .input('ni', sql.NVarChar, input.nose?.intensity ?? null)
      .input('na', sql.NVarChar, (input.nose?.aromas ?? []).join(', ') || null)
      .input('nn', sql.NVarChar(sql.MAX), input.nose?.notes ?? null)
      .input('ps', sql.NVarChar, input.palate?.sweetness ?? null)
      .input('pb', sql.NVarChar, input.palate?.body ?? null)
      .input('pn', sql.NVarChar(sql.MAX), input.palate?.notes ?? null)
      .input('fl', sql.NVarChar, input.finish?.length ?? null)
      .input('fn', sql.NVarChar(sql.MAX), input.finish?.notes ?? null)
      .input('on', sql.NVarChar(sql.MAX), input.overallNotes ?? null)
      .query(`INSERT INTO dbo.TastingEntries
        (TastingSessionId, WhiskyId, ClubMemberId, Score, OverallScore,
         BottlePresence, BottleStyle, BottleNotes,
         AppearanceColour, AppearanceClarity, AppearanceNotes,
         NoseIntensity, NoseAromas, NoseNotes,
         PalateSweetness, PalateBody, PalateNotes,
         FinishLength, FinishNotes, OverallNotes)
        OUTPUT INSERTED.*
        VALUES (@sessionId, @whiskyId, @memberId, @scoreInt, @score,
         @bp, @bs, @bn, @ac, @acl, @an, @ni, @na, @nn, @ps, @pb, @pn, @fl, @fn, @on)`)
    return this.mapTasting(r.recordset[0])
  }

  async updateTasting(
    id: number,
    input: Omit<Tasting, 'id' | 'createdAt' | 'memberId'>,
    memberId: number,
  ): Promise<Tasting | null> {
    const r = await this.pool.request()
      .input('id', sql.Int, id)
      .input('memberId', sql.Int, memberId)
      .input('score', sql.Decimal(4, 1), input.score)
      .input('scoreInt', sql.Int, Math.round(input.score))
      .input('bp', sql.NVarChar, input.bottle?.presence ?? null)
      .input('bs', sql.NVarChar, (input.bottle?.style ?? []).join(', ') || null)
      .input('bn', sql.NVarChar(sql.MAX), input.bottle?.notes ?? null)
      .input('ac', sql.NVarChar, input.appearance?.colour ?? null)
      .input('acl', sql.NVarChar, input.appearance?.clarity ?? null)
      .input('an', sql.NVarChar(sql.MAX), input.appearance?.notes ?? null)
      .input('ni', sql.NVarChar, input.nose?.intensity ?? null)
      .input('na', sql.NVarChar, (input.nose?.aromas ?? []).join(', ') || null)
      .input('nn', sql.NVarChar(sql.MAX), input.nose?.notes ?? null)
      .input('ps', sql.NVarChar, input.palate?.sweetness ?? null)
      .input('pb', sql.NVarChar, input.palate?.body ?? null)
      .input('pn', sql.NVarChar(sql.MAX), input.palate?.notes ?? null)
      .input('fl', sql.NVarChar, input.finish?.length ?? null)
      .input('fn', sql.NVarChar(sql.MAX), input.finish?.notes ?? null)
      .input('on', sql.NVarChar(sql.MAX), input.overallNotes ?? null)
      .query(`UPDATE dbo.TastingEntries SET
        Score = @scoreInt, OverallScore = @score,
        BottlePresence = @bp, BottleStyle = @bs, BottleNotes = @bn,
        AppearanceColour = @ac, AppearanceClarity = @acl, AppearanceNotes = @an,
        NoseIntensity = @ni, NoseAromas = @na, NoseNotes = @nn,
        PalateSweetness = @ps, PalateBody = @pb, PalateNotes = @pn,
        FinishLength = @fl, FinishNotes = @fn, OverallNotes = @on
        OUTPUT INSERTED.*
        WHERE Id = @id AND ClubMemberId = @memberId`)
    if (!r.recordset[0]) return null
    return this.mapTasting(r.recordset[0])
  }

  async deleteTasting(id: number, memberId: number): Promise<boolean> {
    const r = await this.pool.request()
      .input('id', sql.Int, id)
      .input('memberId', sql.Int, memberId)
      .query(`DELETE FROM dbo.TastingEntries WHERE Id = @id AND ClubMemberId = @memberId`)
    return (r.rowsAffected[0] ?? 0) > 0
  }

  private async listPlanRows(memberId: number | null): Promise<PlanNight[]> {
    const nights = await this.pool.request().query(`
      SELECT Id, CONVERT(char(10), NightDate, 23) AS NightDate
      FROM dbo.ProposedNights ORDER BY NightDate`)
    if (!nights.recordset.length) return []
    const votes = await this.pool.request().query(`
      SELECT v.ProposedNightId, v.ClubMemberId, m.Name
      FROM dbo.NightVotes v JOIN dbo.ClubMembers m ON m.Id = v.ClubMemberId`)
    const byNight = new Map<number, { id: number; name: string }[]>()
    for (const v of votes.recordset) {
      const arr = byNight.get(v.ProposedNightId) ?? []
      arr.push({ id: v.ClubMemberId, name: v.Name })
      byNight.set(v.ProposedNightId, arr)
    }
    return nights.recordset
      .map((n) => {
        const voters = byNight.get(n.Id) ?? []
        return {
          id: n.Id as number,
          date: n.NightDate as string,
          voteCount: voters.length,
          voters,
          votedByMe: memberId != null && voters.some((x) => x.id === memberId),
        }
      })
      .sort((a, b) => b.voteCount - a.voteCount || a.date.localeCompare(b.date))
  }

  async listPlan(memberId: number | null): Promise<PlanNight[]> {
    return this.listPlanRows(memberId)
  }

  async proposeNight(date: string, memberId: number): Promise<PlanNight[]> {
    await this.pool.request()
      .input('date', sql.Date, new Date(date))
      .input('memberId', sql.Int, memberId)
      .query(`IF NOT EXISTS (SELECT 1 FROM dbo.ProposedNights WHERE NightDate = @date)
              INSERT INTO dbo.ProposedNights (NightDate, ProposedByMemberId) VALUES (@date, @memberId)`)
    return this.listPlanRows(memberId)
  }

  async removeNight(id: number): Promise<PlanNight[]> {
    await this.pool.request().input('id', sql.Int, id)
      .query(`DELETE FROM dbo.ProposedNights WHERE Id = @id`)
    return this.listPlanRows(null)
  }

  async toggleVote(nightId: number, memberId: number): Promise<PlanNight[]> {
    await this.pool.request()
      .input('nightId', sql.Int, nightId)
      .input('memberId', sql.Int, memberId)
      .query(`IF EXISTS (SELECT 1 FROM dbo.NightVotes WHERE ProposedNightId = @nightId AND ClubMemberId = @memberId)
                DELETE FROM dbo.NightVotes WHERE ProposedNightId = @nightId AND ClubMemberId = @memberId
              ELSE IF EXISTS (SELECT 1 FROM dbo.ProposedNights WHERE Id = @nightId)
                INSERT INTO dbo.NightVotes (ProposedNightId, ClubMemberId) VALUES (@nightId, @memberId)`)
    return this.listPlanRows(memberId)
  }

  async lockInNight(nightId: number, name: string): Promise<Session | null> {
    const r = await this.pool.request().input('id', sql.Int, nightId)
      .query(`SELECT CONVERT(char(10), NightDate, 23) AS NightDate FROM dbo.ProposedNights WHERE Id = @id`)
    if (!r.recordset.length) return null
    const date = r.recordset[0].NightDate as string
    const session = await this.createSession({
      name,
      date: `${date}T19:00:00`,
      status: 'planned',
    } as Omit<Session, 'id'>)
    // The night is chosen — clear the whole planning board for a fresh start.
    await this.pool.request().query(`DELETE FROM dbo.NightVotes`)
    await this.pool.request().query(`DELETE FROM dbo.ProposedNights`)
    return session
  }

  async stats(): Promise<DashboardStats> {
    const counts = await this.pool.request()
      .input('adhoc', sql.NVarChar, AD_HOC_SESSION_NAME)
      .query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.TastingSessions WHERE Name <> @adhoc) AS SessionCount,
        (SELECT COUNT(*) FROM dbo.Whiskies) AS WhiskyCount,
        (SELECT COUNT(*) FROM dbo.ClubMembers WHERE IsActive = 1) AS ActiveMembers,
        (SELECT COUNT(*) FROM dbo.TastingEntries) AS TastingCount,
        (SELECT AVG(CAST(OverallScore AS FLOAT)) FROM dbo.TastingEntries) AS AvgScore`)
    const c = counts.recordset[0]

    const top = await this.pool.request().query(`
      SELECT TOP 1 w.Name, AVG(CAST(t.OverallScore AS FLOAT)) AS Score
      FROM dbo.Whiskies w JOIN dbo.TastingEntries t ON t.WhiskyId = w.Id
      GROUP BY w.Id, w.Name ORDER BY Score DESC`)
    const active = await this.pool.request().query(`
      SELECT TOP 1 m.Name, COUNT(*) AS Cnt
      FROM dbo.ClubMembers m JOIN dbo.TastingEntries t ON t.ClubMemberId = m.Id
      GROUP BY m.Id, m.Name ORDER BY Cnt DESC`)
    const recent = await this.pool.request()
      .input('adhoc', sql.NVarChar, AD_HOC_SESSION_NAME)
      .query(`SELECT TOP 3 * FROM dbo.TastingSessions WHERE Name <> @adhoc ORDER BY SessionDate DESC`)

    return {
      sessionCount: c.SessionCount,
      whiskyCount: c.WhiskyCount,
      activeMembers: c.ActiveMembers,
      tastingCount: c.TastingCount,
      avgScore: c.AvgScore != null ? round1(Number(c.AvgScore)) : null,
      topWhisky: top.recordset[0]
        ? { name: top.recordset[0].Name, score: round1(Number(top.recordset[0].Score)) }
        : null,
      mostActiveMember: active.recordset[0]
        ? { name: active.recordset[0].Name, count: active.recordset[0].Cnt }
        : null,
      recentSessions: recent.recordset.map(this.mapSession),
    }
  }
}
