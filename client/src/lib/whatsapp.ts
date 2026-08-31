import type { Session } from '../types'

// Builds a pre-filled WhatsApp message with a lightweight poll the group
// can reply to with a number. Opens in WhatsApp via a wa.me deep link.
export function buildSessionPollUrl(session: Session, options?: string[]): string {
  const slots =
    options && options.length
      ? options
      : ['This Friday 7pm', 'Next Friday 7pm', 'Saturday afternoon']

  const lines = [
    `🥃 *${session.name}* — Whisky Guild`,
    session.location ? `📍 ${session.location}` : '',
    '',
    'Which night works? Vote by replying with a number:',
    ...slots.map((s, i) => `${i + 1}. ${s}`),
    '',
    'Reply *IN* if you can make it 🙌',
  ].filter(Boolean)

  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}

export function openSessionPoll(session: Session, options?: string[]) {
  window.open(buildSessionPollUrl(session, options), '_blank', 'noopener')
}

// Shares the proposed nights (and their current vote tallies) so the group
// can open the app and vote. Every night is an equal option — no default pick.
export function openPlanShare(nights: { date: string; voteCount: number }[]): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    })

  const lines = [
    '🥃 *Ealing Whisky Guild* — plan the next night',
    '',
    nights.length ? 'Proposed nights — vote for the ones you can make:' : 'No nights proposed yet.',
    ...nights.map(
      (n) => `• ${fmt(n.date)}${n.voteCount ? `  (${n.voteCount} vote${n.voteCount === 1 ? '' : 's'})` : ''}`,
    ),
    '',
    'Open app and hit vote button for preferred date 👉 https://ealingwhisky.uk/sessions/new',
  ].filter(Boolean)

  const url = `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
  window.open(url, '_blank', 'noopener')
  return url
}
