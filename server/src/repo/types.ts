export interface Member {
  id: number
  name: string
  email?: string
  tastingCount?: number
}

export interface Whisky {
  id: number
  name: string
  distillery?: string
  region?: string
  age?: number | null
  abv?: number | null
  imageUrl?: string | null
  addedByMemberId?: number
  avgScore?: number | null
  tastingCount?: number
}

export type SessionStatus = 'planned' | 'active' | 'completed'

export interface Session {
  id: number
  name: string
  hostName?: string
  location?: string
  date: string
  status: SessionStatus
  whiskyIds?: number[]
  photoUrl?: string | null
  photoUrls?: string[]
}

export interface Tasting {
  id: number
  whiskyId: number
  memberId: number
  sessionId?: number | null
  sessionName?: string | null
  score: number
  createdAt: string
  bottle?: { presence?: string; style?: string[]; notes?: string }
  appearance: { colour?: string; clarity?: string; notes?: string }
  nose: { intensity?: string; aromas: string[]; notes?: string }
  palate: { sweetness?: string; body?: string; notes?: string }
  finish: { length?: string; notes?: string }
  overallNotes?: string
}

export interface AdHocTasting extends Tasting {
  whiskyName: string
  memberName: string
}

export interface SessionLineupEntry {
  whisky: Whisky
  broughtByMemberId: number | null
  broughtByName: string | null
}

// Catch-all session for tastings logged outside an organized event.
// It is hidden from the sessions list and dashboard counts.
export const AD_HOC_SESSION_NAME = 'Ad-hoc Tastings'

export interface DashboardStats {
  sessionCount: number
  whiskyCount: number
  activeMembers: number
  tastingCount: number
  avgScore: number | null
  topWhisky: { name: string; score: number } | null
  mostActiveMember: { name: string; count: number } | null
  recentSessions: Session[]
}

export interface PlanNight {
  id: number
  date: string // YYYY-MM-DD
  voteCount: number
  voters: { id: number; name: string }[]
  votedByMe: boolean
}

export interface Repo {
  listMembers(): Promise<Member[]>
  createMember(input: { name: string; email?: string }): Promise<Member>
  listWhiskies(): Promise<Whisky[]>
  getWhisky(id: number): Promise<{ whisky: Whisky; tastings: Tasting[]; members: Member[] } | null>
  createWhisky(input: Omit<Whisky, 'id'>): Promise<Whisky>
  updateWhisky(id: number, input: Partial<Omit<Whisky, 'id'>>): Promise<Whisky | null>
  listSessions(): Promise<Session[]>
  getSession(id: number): Promise<{ session: Session; whiskies: Whisky[]; lineup: SessionLineupEntry[] } | null>
  createSession(input: Omit<Session, 'id'>): Promise<Session>
  updateSessionStatus(id: number, status: SessionStatus): Promise<Session | null>
  deleteSession(id: number): Promise<boolean>
  activeSession(): Promise<Session | null>
  addSessionWhisky(sessionId: number, whiskyId: number, broughtByMemberId?: number | null): Promise<{ session: Session; whiskies: Whisky[]; lineup: SessionLineupEntry[] } | null>
  addSessionPhotos(id: number, photoUrls: string[]): Promise<Session | null>
  removeSessionPhoto(id: number, photoUrl: string): Promise<Session | null>
  createTasting(input: Omit<Tasting, 'id' | 'createdAt' | 'memberId'>, memberId: number): Promise<Tasting>
  updateTasting(id: number, input: Omit<Tasting, 'id' | 'createdAt' | 'memberId'>, memberId: number): Promise<Tasting | null>
  deleteTasting(id: number, memberId: number): Promise<boolean>
  listAdHocTastings(): Promise<AdHocTasting[]>
  stats(): Promise<DashboardStats>
  listPlan(memberId: number | null): Promise<PlanNight[]>
  proposeNight(date: string, memberId: number): Promise<PlanNight[]>
  removeNight(id: number): Promise<PlanNight[]>
  toggleVote(nightId: number, memberId: number): Promise<PlanNight[]>
  lockInNight(nightId: number, name: string): Promise<Session | null>
}
