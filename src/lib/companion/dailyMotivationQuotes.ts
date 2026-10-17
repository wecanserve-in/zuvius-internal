/** Curated original motivational lines for the Baby CEO daily bubble. */
export const DAILY_MOTIVATION_QUOTES: readonly { id: string; text: string }[] = [
  { id: 'm1', text: 'Steady work today makes tomorrow feel lighter.' },
  { id: 'm2', text: 'Focus on the next right task—not the whole mountain.' },
  { id: 'm3', text: 'Consistency beats intensity when the week gets long.' },
  { id: 'm4', text: 'Clear one thing well, then move to the next.' },
  { id: 'm5', text: 'Your team moves faster when you communicate early.' },
  { id: 'm6', text: 'Leadership is showing up prepared and kind.' },
  { id: 'm7', text: 'Discipline is choosing what matters over what is easy.' },
  { id: 'm8', text: 'A calm plan beats a rushed scramble every time.' },
  { id: 'm9', text: 'Progress counts—even when it feels quiet.' },
  { id: 'm10', text: 'Ask for help before a small blocker becomes a delay.' },
  { id: 'm11', text: 'Protect your focus; it is your best tool.' },
  { id: 'm12', text: 'Finish what you start, or consciously reschedule it.' },
  { id: 'm13', text: 'Good work is often simple work done reliably.' },
  { id: 'm14', text: 'Listen first—solutions get sharper that way.' },
  { id: 'm15', text: 'Celebrate completions, then get ready for the next win.' },
  { id: 'm16', text: 'Creativity grows when you give ideas room to breathe.' },
  { id: 'm17', text: 'Respect deadlines; they protect everyone’s time.' },
  { id: 'm18', text: 'Professional growth is built in ordinary Tuesdays.' },
  { id: 'm19', text: 'Clarity in writing saves hours in meetings.' },
  { id: 'm20', text: 'Trust your checklist when the day feels noisy.' },
  { id: 'm21', text: 'Teamwork means making the handoff smooth.' },
  { id: 'm22', text: 'You do not need perfect—just honest and timely.' },
  { id: 'm23', text: 'One deep hour beats four distracted ones.' },
  { id: 'm24', text: 'Show up curious; problems shrink when you learn.' },
  { id: 'm25', text: 'Keep promises small enough to keep them.' },
  { id: 'm26', text: 'Organize the work; the stress often follows.' },
  { id: 'm27', text: 'Your future self will thank you for today’s follow-through.' },
  { id: 'm28', text: 'Kindness and standards can share the same desk.' },
  { id: 'm29', text: 'When stuck, define the smallest next step.' },
  { id: 'm30', text: 'Momentum returns when you begin—not when you wait.' },
  { id: 'm31', text: 'Share credit freely; it multiplies motivation.' },
  { id: 'm32', text: 'A tidy close-out today prevents confusion tomorrow.' },
]

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function todayKeyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Deterministic quote index per user/day; avoids repeating yesterday’s index when possible. */
export function selectDailyQuoteIndex(
  userId: string,
  dateKey: string,
  previousIndex: number | null,
): number {
  const n = DAILY_MOTIVATION_QUOTES.length
  let idx = hashString(`${userId}|${dateKey}`) % n
  if (previousIndex !== null && previousIndex >= 0 && previousIndex < n && idx === previousIndex) {
    idx = (idx + 1) % n
  }
  return idx
}
