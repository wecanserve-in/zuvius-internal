/** Baby CEO daily work motivation — one per user per local calendar day. */
export const babyCEODailyQuotes: readonly string[] = [
  'Small efforts every day create extraordinary results.',
  'Show up, do the work, and let progress speak.',
  'Consistency turns ordinary effort into excellence.',
  "You don't need a perfect day. You need a productive one.",
  'The work you do today builds the success you see tomorrow.',
  'Great results begin with small actions done consistently.',
  'Be proud of every step forward, no matter how small.',
  'Discipline keeps you moving when motivation takes a day off.',
  'A little progress is still progress. Keep going.',
  'Success is built in the moments when nobody is watching.',

  'Focus on what matters, not just what makes noise.',
  'One finished task beats ten unfinished plans.',
  'Start with the hardest task. Give your best energy to your best work.',
  'Make today count, one task at a time.',
  'Busy is a schedule. Productive is a result.',
  "Protect your focus like it's your most valuable resource.",
  'Less scrolling, more creating.',
  'Your next achievement starts with the task in front of you.',
  'Progress loves a clear priority.',
  'Finish strong. Your future self will thank you.',

  'A deadline is a promise. Make it one you keep.',
  'Own your tasks, own your progress.',
  "Plan ahead so urgency doesn't become your routine.",
  'Being reliable is a superpower in any workplace.',
  "Don't wait for the reminder. Be the reason it's already done.",
  'Accountability turns intentions into results.',
  'A task completed on time is one less thing on your mind.',
  'Take responsibility, find a solution, and move forward.',
  'Respect your commitments, even when the day gets busy.',
  'The best time to start is before it becomes urgent.',

  'Leadership begins with taking responsibility.',
  'Great leaders create clarity, not confusion.',
  'Lead by example, not just by instruction.',
  'A strong team starts with people who keep their word.',
  'Take initiative. The opportunity may be yours to create.',
  'Good leadership makes others better, not smaller.',
  'Own the outcome, learn from the process.',
  'Confidence is valuable. Humility makes it powerful.',
  'Be the person people can count on.',
  "True leadership means doing the right thing when it's difficult.",

  'Alone you can move quickly; together you can go further.',
  'Great teams turn different strengths into shared success.',
  'Share credit generously and responsibility fairly.',
  'The best ideas grow when people listen to one another.',
  "A helpful teammate can change someone's entire workday.",
  'Communication turns individual effort into collective progress.',
  'Celebrate team wins. Learn from team setbacks.',
  'Respect is the foundation of every strong collaboration.',
  'Ask for help early. Offer help often.',
  'When the team succeeds, everyone moves forward.',

  "Every challenge is a chance to improve your skills.",
  "You don't have to know everything. You have to stay willing to learn.",
  'Mistakes are useful when you turn them into lessons.',
  'Be better than yesterday, not perfect by tomorrow.',
  'Curiosity keeps good work from becoming routine.',
  'Growth begins where comfort ends.',
  'Feedback is a tool, not a verdict.',
  'Learn the lesson, adjust the approach, try again.',
  'Every expert was once a beginner who kept going.',
  'Your skills grow every time you choose to improve.',

  "Don't just point out the problem. Help discover the solution.",
  'A fresh perspective can unlock a stubborn problem.',
  'Think boldly, test thoughtfully, improve continuously.',
  "The first idea doesn't have to be the final answer.",
  'Creativity begins when curiosity meets action.',
  'Every obstacle is an invitation to think differently.',
  'Ask better questions to find better solutions.',
  'Simple solutions often come from deep thinking.',
  'Experiment, learn, refine, repeat.',
  'Be known for solutions, not just suggestions.',

  "A difficult day doesn't erase your progress.",
  "Pause if you need to. Don't confuse rest with giving up.",
  'You can reset your day with one good decision.',
  "Progress isn't always fast, but it can still be meaningful.",
  'When plan A fails, bring your creativity to plan B.',
  'Stay patient with the process and honest about the effort.',
  'Setbacks are chapters, not the whole story.',
  "You don't have to feel ready to take the next step.",
  'Keep going, but remember that smart work includes rest.',
  "One bad result doesn't define your ability to improve.",

  'Professionalism is doing the right thing even when nobody checks.',
  "Respect people's time, effort, and ideas.",
  'Clear communication prevents unnecessary confusion.',
  'Quality is the care you put into the details.',
  'Trust is earned through small, consistent actions.',
  'Be direct, be respectful, and be solution-oriented.',
  'Your attitude influences the work you leave behind.',
  "Good work speaks louder when it's backed by integrity.",
  'Make it easy for others to work with you.',
  'A strong work culture is built through everyday behaviour.',

  'Think big. Start small. Execute consistently.',
  'Your goals deserve more than good intentions.',
  'Dreams set the direction. Daily actions create the distance.',
  "Don't wait for opportunity to knock. Prepare to answer.",
  'Work quietly, improve daily, and let results make the announcement.',
  'Big achievements are collections of small wins.',
  'Be ambitious with your goals and patient with your growth.',
  'Your future is influenced by what you choose to do today.',
  'Bring solutions, bring energy, and bring your best effort.',
  'CEO mindset: own the task, respect the team, deliver the result.',
]

export const DAILY_MOTIVATION_QUOTES: readonly { id: string; text: string }[] =
  babyCEODailyQuotes.map((text, i) => ({
    id: `q${i + 1}`,
    text,
  }))

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
