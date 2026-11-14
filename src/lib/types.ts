export const ACTIVITY_TYPES = ['running', 'swimming', 'cycling', 'football'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export type ActivityStatus = 'pending' | 'approved' | 'rejected'
export type PaymentStatus = 'pending' | 'paid'
export type ChallengeId = 'short' | 'main'

export type Athlete = {
  id: string
  name: string
  isDemo: boolean
  createdAt: string
  updatedAt: string
}

export type Challenge = {
  id: ChallengeId
  name: string
  startsOn: string
  endsOn: string
  entryAmountInr: number
  finalized: boolean
}

export type Payment = {
  athleteId: string
  challengeId: ChallengeId
  status: PaymentStatus
  updatedAt: string
}

export type Activity = {
  id: string
  athleteId: string
  activityType: ActivityType
  activityDate: string
  durationSeconds: number
  evidenceUrl: string
  adminNote: string
  status: ActivityStatus
  isDemo: boolean
  createdAt: string
  updatedAt: string
}

export type WeeklyPrize = {
  challengeId: ChallengeId
  weekIndex: number
  startDate: string
  endDate: string
  winnerAthleteId: string | null
  prizeAmountInr: number
  roundingNote: string
  tieAthleteIds: string[]
  tieRule: string
  adminDecisionNote: string
  recorded: boolean
}

export type RulesContent = {
  dates: string
  timezone: string
  eligible: string
  scoring: string
  approval: string
  deadline: string
  ties: string
  weekly: string
  payouts: string
  disputes: string
  assumptions: string
}

export type SiteSettings = {
  rules: RulesContent
  paymentUpiId: string
  paymentInstructions: string
  qrImageUrl: string
  allowMultipleWeeklyWins: boolean
  weeklyTieRule: string
}

export type Snapshot = {
  athletes: Athlete[]
  challenges: Challenge[]
  payments: Payment[]
  activities: Activity[]
  weeklyPrizes: WeeklyPrize[]
  settings: SiteSettings
}

export type WeekWindow = {
  index: number
  startDate: string
  endDate: string
  label: string
}

export type RankedRow = {
  athlete: Athlete
  totalSeconds: number
  activityCount: number
  rank: number
  displayOrder: number
  paid: boolean
  entered: boolean
  tiedWithPrevious: boolean
}

export type WeeklyBoard = {
  week: WeekWindow
  prizeAmountInr: number
  roundingNote: string
  rows: RankedRow[]
  timeLeaders: RankedRow[]
  officialWinnerId: string | null
  recorded: boolean
  adminDecisionNote: string
  tieRule: string
}

export type ChallengeStatus = 'upcoming' | 'live' | 'ended-provisional' | 'final'
