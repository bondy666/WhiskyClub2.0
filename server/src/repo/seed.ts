import type { Member, Session, Tasting, Whisky } from './types.js'

export const members: Member[] = [
  { id: 1, name: 'Simon Bond', email: 'simon@example.com' },
  { id: 2, name: 'Chris Doyle', email: 'chris@example.com' },
  { id: 3, name: 'Alok Sharma', email: 'alok@example.com' },
]

export const whiskies: Whisky[] = [
  { id: 1, name: 'Bowmore 15', distillery: 'Bowmore', region: 'Islay', age: 15, abv: 43, addedByMemberId: 1 },
  { id: 2, name: 'Lagavulin 16', distillery: 'Lagavulin', region: 'Islay', age: 16, abv: 43, addedByMemberId: 1 },
  { id: 3, name: 'Glenfiddich 12', distillery: 'Glenfiddich', region: 'Speyside', age: 12, abv: 40, addedByMemberId: 2 },
  { id: 4, name: 'Talisker 10', distillery: 'Talisker', region: 'Islands', age: 10, abv: 45.8, addedByMemberId: 2 },
  { id: 5, name: 'Macallan 12 Double Cask', distillery: 'Macallan', region: 'Speyside', age: 12, abv: 40, addedByMemberId: 3 },
  { id: 6, name: 'Highland Park 18', distillery: 'Highland Park', region: 'Islands', age: 18, abv: 43, addedByMemberId: 1 },
  { id: 7, name: 'Redbreast 12', distillery: 'Midleton', region: 'Other', age: 12, abv: 40, addedByMemberId: 3 },
]

export const sessions: Session[] = [
  {
    id: 1,
    name: 'No.1 — Chris\u2019s',
    hostName: 'Chris Doyle',
    location: "Chris's place",
    date: new Date('2026-05-29T19:30:00Z').toISOString(),
    status: 'completed',
    whiskyIds: [1, 2, 3],
  },
  {
    id: 2,
    name: 'No.2 — Alok\u2019s',
    hostName: 'Alok Sharma',
    location: "Alok's place",
    date: new Date('2026-08-30T19:30:00Z').toISOString(),
    status: 'planned',
    whiskyIds: [4, 5],
  },
]

const iso = (d: string) => new Date(d).toISOString()

export const tastings: Tasting[] = [
  {
    id: 1, whiskyId: 1, memberId: 1, sessionId: 1, score: 9, createdAt: iso('2026-05-29T20:10:00Z'),
    appearance: { colour: 'Amber', clarity: 'Crystal Clear' },
    nose: { intensity: 'Pronounced', aromas: ['Smoke', 'Honey'] },
    palate: { sweetness: 'Medium', body: 'Full' },
    finish: { length: 'Long' },
    overallNotes: 'Beautifully balanced. Would pour again in a heartbeat.',
  },
  {
    id: 2, whiskyId: 2, memberId: 1, sessionId: 1, score: 8.5, createdAt: iso('2026-05-29T20:35:00Z'),
    appearance: { colour: 'Golden', clarity: 'Crystal Clear' },
    nose: { intensity: 'Powerful', aromas: ['Smoke', 'Oak'] },
    palate: { sweetness: 'Dry', body: 'Oily' },
    finish: { length: 'Very Long' },
    overallNotes: 'Big peaty hug.',
  },
  {
    id: 3, whiskyId: 3, memberId: 2, sessionId: 1, score: 6.5, createdAt: iso('2026-05-29T21:00:00Z'),
    appearance: { colour: 'Pale', clarity: 'Crystal Clear' },
    nose: { intensity: 'Light', aromas: ['Floral', 'Vanilla'] },
    palate: { sweetness: 'Sweet', body: 'Light' },
    finish: { length: 'Short' },
  },
  {
    id: 4, whiskyId: 1, memberId: 2, sessionId: 1, score: 8, createdAt: iso('2026-05-29T21:20:00Z'),
    appearance: { colour: 'Amber', clarity: 'Crystal Clear' },
    nose: { intensity: 'Medium', aromas: ['Honey', 'Spice'] },
    palate: { sweetness: 'Medium', body: 'Medium' },
    finish: { length: 'Long' },
  },
]

export const counters = {
  member: members.length,
  whisky: whiskies.length,
  session: sessions.length,
  tasting: tastings.length,
  night: 0,
  vote: 0,
}

export interface ProposedNightRow {
  id: number
  date: string // YYYY-MM-DD
  proposedByMemberId: number | null
}

export interface NightVoteRow {
  id: number
  nightId: number
  memberId: number
}

export const proposedNights: ProposedNightRow[] = []
export const nightVotes: NightVoteRow[] = []
