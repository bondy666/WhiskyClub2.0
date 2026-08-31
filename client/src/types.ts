export interface Member {
  id: number
  name: string
  email?: string
  avatarColor?: string
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
  date: string // ISO
  status: SessionStatus
  whiskyIds?: number[]
  attendeeCount?: number
  photoUrl?: string | null
  photoUrls?: string[]
  winnerName?: string
  winnerImageUrls?: string[]
}

export interface Tasting {
  id: number
  whiskyId: number
  memberId: number
  sessionId?: number | null
  sessionName?: string | null
  score: number // 0-10, allows .5
  createdAt: string
  bottle?: {
    presence?: string
    style?: string[]
    notes?: string
  }
  appearance: {
    colour?: string
    clarity?: string
    notes?: string
  }
  nose: {
    intensity?: string
    aromas: string[]
    notes?: string
  }
  palate: {
    sweetness?: string
    body?: string
    notes?: string
  }
  finish: {
    length?: string
    notes?: string
  }
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

export interface AuthUser {
  userId: string
  name: string
  email?: string
  provider: string
  isMember: boolean
}

export interface PlanNight {
  id: number
  date: string // YYYY-MM-DD
  voteCount: number
  voters: { id: number; name: string }[]
  votedByMe: boolean
}
