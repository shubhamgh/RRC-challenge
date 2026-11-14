import { createDemoSnapshot } from './demoData'
import { defaultChallenges, defaultSettings } from './defaults'
import { nowIso } from './dates'
import { supabase, supabaseConfigured } from './supabase'
import type {
  Activity,
  Athlete,
  Challenge,
  ChallengeId,
  Payment,
  PaymentStatus,
  SiteSettings,
  Snapshot,
  WeeklyPrize,
} from './types'

const LOCAL_KEY = 'rrc-challenge-v1'

type ActivityRow = {
  id: string
  athlete_id: string
  activity_type: Activity['activityType']
  activity_date: string
  duration_seconds: number
  evidence_url: string | null
  admin_note: string | null
  status: Activity['status']
  is_demo: boolean
  created_at: string
  updated_at: string
}

type AthleteRow = {
  id: string
  name: string
  is_demo: boolean
  created_at: string
  updated_at: string
}

function mapAthlete(row: AthleteRow): Athlete {
  return {
    id: row.id,
    name: row.name,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    activityType: row.activity_type,
    activityDate: row.activity_date,
    durationSeconds: row.duration_seconds,
    evidenceUrl: row.evidence_url ?? '',
    adminNote: row.admin_note ?? '',
    status: row.status,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function readLocal(): Snapshot | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Snapshot
  } catch {
    return null
  }
}

function writeLocal(snapshot: Snapshot) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot))
}

export function loadLocalSnapshot(): Snapshot {
  return readLocal() ?? createDemoSnapshot()
}

export function saveLocalSnapshot(snapshot: Snapshot) {
  writeLocal(snapshot)
}

export function resetLocalToDemo(): Snapshot {
  const snapshot = createDemoSnapshot()
  writeLocal(snapshot)
  return snapshot
}

export function newId(): string {
  return crypto.randomUUID()
}

export async function loadRemoteSnapshot(): Promise<Snapshot> {
  if (!supabase) return loadLocalSnapshot()

  const [athletes, challenges, payments, activities, weekly, settings] = await Promise.all([
    supabase.from('athletes').select('*').order('name'),
    supabase.from('challenges').select('*'),
    supabase.from('payments').select('*'),
    supabase.from('activities').select('*').order('activity_date', { ascending: false }),
    supabase.from('weekly_prizes').select('*'),
    supabase.from('site_settings').select('*'),
  ])

  const errors = [athletes.error, challenges.error, payments.error, activities.error, weekly.error, settings.error]
  const firstError = errors.find(Boolean)
  if (firstError) throw firstError

  const settingsMap = new Map(
    (settings.data as { key: string; value: unknown }[] | null)?.map((row) => [row.key, row.value]) ?? [],
  )
  const remoteSettings = (settingsMap.get('site') as SiteSettings | undefined) ?? defaultSettings

  return {
    athletes: ((athletes.data as AthleteRow[] | null) ?? []).map(mapAthlete),
    challenges: mapChallenges(challenges.data),
    payments: ((payments.data as { athlete_id: string; challenge_id: ChallengeId; status: PaymentStatus; updated_at: string }[] | null) ?? []).map(
      (row) => ({
        athleteId: row.athlete_id,
        challengeId: row.challenge_id,
        status: row.status,
        updatedAt: row.updated_at,
      }),
    ),
    activities: ((activities.data as ActivityRow[] | null) ?? []).map(mapActivity),
    weeklyPrizes: ((weekly.data as {
      challenge_id: ChallengeId
      week_index: number
      start_date: string
      end_date: string
      winner_athlete_id: string | null
      prize_amount_inr: number
      rounding_note: string | null
      tie_athlete_ids: string[] | null
      tie_rule: string | null
      admin_decision_note: string | null
      recorded: boolean
    }[] | null) ?? []).map((row) => ({
      challengeId: row.challenge_id,
      weekIndex: row.week_index,
      startDate: row.start_date,
      endDate: row.end_date,
      winnerAthleteId: row.winner_athlete_id,
      prizeAmountInr: row.prize_amount_inr,
      roundingNote: row.rounding_note ?? '',
      tieAthleteIds: row.tie_athlete_ids ?? [],
      tieRule: row.tie_rule ?? '',
      adminDecisionNote: row.admin_decision_note ?? '',
      recorded: row.recorded,
    })),
    settings: {
      ...defaultSettings,
      ...remoteSettings,
      rules: { ...defaultSettings.rules, ...remoteSettings.rules },
    },
  }
}

export async function isRemoteAdmin(): Promise<boolean> {
  if (!supabase) return false
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return false
  const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

function mapChallenges(data: unknown): Challenge[] {
  const rows = Array.isArray(data) ? data : []
  if (rows.length === 0) return defaultChallenges.map((c) => ({ ...c }))
  return rows.map((row: {
    id: ChallengeId
    name: string
    starts_on: string
    ends_on: string
    entry_amount_inr: number
    finalized: boolean
  }) => ({
    id: row.id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    entryAmountInr: row.entry_amount_inr,
    finalized: row.finalized,
  }))
}

export { supabaseConfigured }

export async function uploadQrImage(file: File): Promise<string> {
  if (!supabase) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }
  const path = `upi-qr-${Date.now()}.${file.name.split('.').pop() || 'png'}`
  const { error } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('site-assets').getPublicUrl(path)
  return data.publicUrl
}

export async function persistAthlete(athlete: Athlete, mode: 'insert' | 'update' | 'delete') {
  if (!supabase) return
  if (mode === 'delete') {
    const { error } = await supabase.from('athletes').delete().eq('id', athlete.id)
    if (error) throw error
    return
  }
  const row = {
    id: athlete.id,
    name: athlete.name,
    is_demo: athlete.isDemo,
    created_at: athlete.createdAt,
    updated_at: athlete.updatedAt,
  }
  const { error } =
    mode === 'insert' ? await supabase.from('athletes').insert(row) : await supabase.from('athletes').update(row).eq('id', athlete.id)
  if (error) throw error
}

export async function persistActivity(activity: Activity, mode: 'insert' | 'update' | 'delete') {
  if (!supabase) return
  if (mode === 'delete') {
    const { error } = await supabase.from('activities').delete().eq('id', activity.id)
    if (error) throw error
    return
  }
  const row = {
    id: activity.id,
    athlete_id: activity.athleteId,
    activity_type: activity.activityType,
    activity_date: activity.activityDate,
    duration_seconds: activity.durationSeconds,
    evidence_url: activity.evidenceUrl || null,
    admin_note: activity.adminNote || null,
    status: activity.status,
    is_demo: activity.isDemo,
    created_at: activity.createdAt,
    updated_at: activity.updatedAt,
  }
  const { error } =
    mode === 'insert'
      ? await supabase.from('activities').insert(row)
      : await supabase.from('activities').update(row).eq('id', activity.id)
  if (error) throw error
}

export async function persistPayment(payment: Payment) {
  if (!supabase) return
  const { error } = await supabase.from('payments').upsert({
    athlete_id: payment.athleteId,
    challenge_id: payment.challengeId,
    status: payment.status,
    updated_at: payment.updatedAt,
  })
  if (error) throw error
}

export async function persistSettings(settings: SiteSettings) {
  if (!supabase) return
  const { error } = await supabase.from('site_settings').upsert({
    key: 'site',
    value: settings,
    updated_at: nowIso(),
  })
  if (error) throw error
}

export async function persistChallenge(challenge: Challenge) {
  if (!supabase) return
  const { error } = await supabase.from('challenges').update({
    name: challenge.name,
    starts_on: challenge.startsOn,
    ends_on: challenge.endsOn,
    entry_amount_inr: challenge.entryAmountInr,
    finalized: challenge.finalized,
  }).eq('id', challenge.id)
  if (error) throw error
}

export async function persistWeekly(prize: WeeklyPrize) {
  if (!supabase) return
  const { error } = await supabase.from('weekly_prizes').upsert({
    challenge_id: prize.challengeId,
    week_index: prize.weekIndex,
    start_date: prize.startDate,
    end_date: prize.endDate,
    winner_athlete_id: prize.winnerAthleteId,
    prize_amount_inr: prize.prizeAmountInr,
    rounding_note: prize.roundingNote,
    tie_athlete_ids: prize.tieAthleteIds,
    tie_rule: prize.tieRule,
    admin_decision_note: prize.adminDecisionNote,
    recorded: prize.recorded,
  })
  if (error) throw error
}

export async function deleteRemoteDemo() {
  if (!supabase) return
  await supabase.from('activities').delete().eq('is_demo', true)
  await supabase.from('athletes').delete().eq('is_demo', true)
}
