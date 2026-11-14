import type { Challenge, RulesContent, SiteSettings, Snapshot } from './types'

export const PLAYFUL_PAYMENT_MESSAGE =
  'Each contribution will help a poor child (Shubham) somewhere on the planet.'

export const defaultRules: RulesContent = {
  dates:
    'Short challenge: 14 November 2026 through 19 December 2026, inclusive. Main challenge: 14 November 2026 through 16 January 2027, inclusive.',
  timezone:
    'All activity dates and cutoffs use India Standard Time (IST, Asia/Kolkata). An activity counts on the IST calendar date you (or the admin) record.',
  eligible:
    'Eligible types: running, swimming, cycling, and football. Walks are ineligible and cannot be entered. Only approved activities inside a challenge’s dates count for that challenge. One activity can count for both challenges when the date falls in the overlap.',
  scoring:
    'Leaderboards use total approved duration only — not distance, pace, speed, or calories. All eligible types count equally by time. Multiple activities on the same day are allowed and are stored as separate records.',
  approval:
    'Send a Strava activity link or screenshot to the admin. The admin enters and approves activities manually. Pending and rejected activities do not count. There is no Strava API connection and the site does not scrape Strava.',
  deadline:
    'Please send evidence by 23:59 IST on the last day of the relevant challenge. Assumed grace: the admin may still enter activities up to 48 hours after the end date. Change this text if the group agrees a different cutoff.',
  ties:
    'Leaderboard ties (same total time) share a rank, with names ordered A–Z for a stable display. Prize payouts for a tie are not automatic: the admin records the official decision. Weekly ties: the admin selects a winner (or leaves the week marked as tied until decided). Default weekly tie rule: admin-selected winner.',
  weekly:
    'Weekly prizes are only for athletes who entered the main challenge and paid the ₹101 contribution. The weekly winner is the paid entrant with the most approved eligible time that week. A participant may win multiple weekly prizes unless the admin turns that off. Weekly prize amounts come from 20% of the main pool, split across the weeks of the main challenge. There is no minimum weekly prize — it depends on how many people paid, and it may be small. Weeks are consecutive 7-day blocks starting 14 November 2026; the last week may be shorter. Dates are shown in IST.',
  payouts:
    'Short pool (₹20 × paid short entrants): 50% / 30% / 20% to 1st / 2nd / 3rd. Main pool (₹101 × paid main entrants): 40% / 25% / 15% to 1st / 2nd / 3rd, and 20% reserved for weekly prizes. Amounts are rounded to whole rupees using the largest-remainder method; any +₹1 rounding adjustment is shown so the whole pool is accounted for.',
  disputes:
    'If a time, type, or date looks wrong, message the admin. The admin can edit, reject, or delete a record. Corrections after a challenge is marked final should be agreed by the group and then unlocked by the admin.',
  assumptions:
    'Assumed and editable: 7-day weeks from 14 Nov 2026; multiple weekly wins allowed; weekly ties decided by the admin; 48-hour entry grace after the end date; walking ineligible; scoring by duration only; prize rounding via largest remainder. Update these fields instead of changing code.',
}

export const defaultSettings: SiteSettings = {
  rules: defaultRules,
  paymentUpiId: '',
  paymentInstructions:
    'Pay the admin over UPI, then send a screenshot. Entry is ₹20 for the short challenge and ₹101 for the main challenge. You can enter one or both. Do not share UPI PINs or passwords with anyone.',
  qrImageUrl: '',
  allowMultipleWeeklyWins: true,
  weeklyTieRule: 'Admin selects the official weekly winner when times are tied. Until then the week is shown as tied.',
}

export const defaultChallenges: Challenge[] = [
  {
    id: 'short',
    name: 'Short challenge',
    startsOn: '2026-11-14',
    endsOn: '2026-12-19',
    entryAmountInr: 20,
    finalized: false,
  },
  {
    id: 'main',
    name: 'Main challenge',
    startsOn: '2026-11-14',
    endsOn: '2027-01-16',
    entryAmountInr: 101,
    finalized: false,
  },
]

export function emptySnapshot(): Snapshot {
  return {
    athletes: [],
    challenges: defaultChallenges.map((c) => ({ ...c })),
    payments: [],
    activities: [],
    weeklyPrizes: [],
    settings: {
      ...defaultSettings,
      rules: { ...defaultRules },
    },
  }
}
