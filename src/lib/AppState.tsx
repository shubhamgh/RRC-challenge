import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { nowIso } from './dates'
import { PLAYFUL_PAYMENT_MESSAGE } from './defaults'
import { findDuplicateActivity } from './scoring'
import {
  deleteRemoteDemo,
  isRemoteAdmin,
  loadLocalSnapshot,
  loadRemoteSnapshot,
  newId,
  persistActivity,
  persistAthlete,
  persistChallenge,
  persistPayment,
  persistSettings,
  persistWeekly,
  resetLocalToDemo,
  saveLocalSnapshot,
  supabaseConfigured,
  uploadQrImage,
} from './store'
import { supabase } from './supabase'
import type {
  Activity,
  ActivityStatus,
  Athlete,
  Challenge,
  ChallengeId,
  PaymentStatus,
  SiteSettings,
  Snapshot,
  WeeklyPrize,
} from './types'

const LOCAL_ADMIN_KEY = 'rrc-admin-local'

type AppState = {
  snapshot: Snapshot
  loading: boolean
  error: string | null
  mode: 'demo' | 'supabase'
  connected: boolean
  isAdmin: boolean
  adminEmail: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  reload: () => Promise<void>
  addAthlete: (name: string) => Promise<Athlete>
  updateAthlete: (id: string, name: string) => Promise<void>
  deleteAthlete: (id: string) => Promise<void>
  saveActivity: (input: ActivityInput, confirmDuplicate?: boolean) => Promise<{ duplicate?: Activity }>
  setActivityStatus: (id: string, status: ActivityStatus) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
  setPayment: (athleteId: string, challengeId: ChallengeId, status: PaymentStatus | 'none') => Promise<void>
  saveSettings: (settings: SiteSettings) => Promise<void>
  saveWeeklyPrize: (prize: WeeklyPrize) => Promise<void>
  setFinalized: (challengeId: ChallengeId, finalized: boolean) => Promise<void>
  uploadQr: (file: File) => Promise<void>
  removeDemoData: () => Promise<void>
  restoreDemoData: () => Promise<void>
}

export type ActivityInput = {
  id?: string
  athleteId: string
  activityType: Activity['activityType']
  activityDate: string
  durationSeconds: number
  evidenceUrl: string
  adminNote: string
  status: ActivityStatus
}

const Ctx = createContext<AppState | null>(null)

function persistLocal(snapshot: Snapshot, mode: 'demo' | 'supabase') {
  if (mode === 'demo') saveLocalSnapshot(snapshot)
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(loadLocalSnapshot)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem(LOCAL_ADMIN_KEY) === '1')
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const mode: 'demo' | 'supabase' = supabaseConfigured ? 'supabase' : 'demo'

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (supabaseConfigured && supabase) {
        const remote = await loadRemoteSnapshot()
        setSnapshot(remote)
        setConnected(true)
        const admin = await isRemoteAdmin()
        setIsAdmin(admin)
        const { data } = await supabase.auth.getSession()
        setAdminEmail(data.session?.user.email ?? null)
      } else {
        setSnapshot(loadLocalSnapshot())
        setConnected(false)
        setIsAdmin(sessionStorage.getItem(LOCAL_ADMIN_KEY) === '1')
      }
    } catch (err) {
      setConnected(false)
      setError(err instanceof Error ? err.message : 'Could not load data')
      setSnapshot(loadLocalSnapshot())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const updateSnapshot = useCallback(
    async (updater: (current: Snapshot) => Snapshot, remote: () => Promise<void>) => {
      const next = updater(snapshot)
      setSnapshot(next)
      persistLocal(next, mode)
      if (mode === 'supabase') await remote()
    },
    [mode, snapshot],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      if (mode === 'demo') {
        const expected = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'rrc-local'
        if (password !== expected) throw new Error('Wrong demo admin password')
        sessionStorage.setItem(LOCAL_ADMIN_KEY, '1')
        setIsAdmin(true)
        setAdminEmail(email || 'demo-admin')
        return
      }
      if (!supabase) throw new Error('Supabase is not configured')
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      const admin = await isRemoteAdmin()
      if (!admin) {
        await supabase.auth.signOut()
        throw new Error('This account is not in admin_users. Add it in the Supabase SQL editor.')
      }
      setIsAdmin(true)
      setAdminEmail(email)
    },
    [mode],
  )

  const logout = useCallback(async () => {
    sessionStorage.removeItem(LOCAL_ADMIN_KEY)
    setIsAdmin(false)
    setAdminEmail(null)
    if (supabase) await supabase.auth.signOut()
  }, [])

  const addAthlete = useCallback(
    async (name: string) => {
      const athlete: Athlete = {
        id: newId(),
        name: name.trim(),
        isDemo: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      await updateSnapshot(
        (current) => ({ ...current, athletes: [...current.athletes, athlete] }),
        () => persistAthlete(athlete, 'insert'),
      )
      return athlete
    },
    [updateSnapshot],
  )

  const updateAthlete = useCallback(
    async (id: string, name: string) => {
      const existing = snapshot.athletes.find((a) => a.id === id)
      if (!existing) return
      const next = { ...existing, name: name.trim(), updatedAt: nowIso() }
      await updateSnapshot(
        (current) => ({
          ...current,
          athletes: current.athletes.map((a) => (a.id === id ? next : a)),
        }),
        () => persistAthlete(next, 'update'),
      )
    },
    [snapshot.athletes, updateSnapshot],
  )

  const deleteAthlete = useCallback(
    async (id: string) => {
      const existing = snapshot.athletes.find((a) => a.id === id)
      if (!existing) return
      await updateSnapshot(
        (current) => ({
          ...current,
          athletes: current.athletes.filter((a) => a.id !== id),
          activities: current.activities.filter((a) => a.athleteId !== id),
          payments: current.payments.filter((p) => p.athleteId !== id),
        }),
        () => persistAthlete(existing, 'delete'),
      )
    },
    [snapshot.athletes, updateSnapshot],
  )

  const saveActivity = useCallback(
    async (input: ActivityInput, confirmDuplicate = false) => {
      const duplicate = findDuplicateActivity(snapshot.activities, input)
      if (duplicate && !confirmDuplicate) return { duplicate }
      const existing = input.id ? snapshot.activities.find((a) => a.id === input.id) : undefined
      const activity: Activity = {
        id: existing?.id ?? newId(),
        athleteId: input.athleteId,
        activityType: input.activityType,
        activityDate: input.activityDate,
        durationSeconds: input.durationSeconds,
        evidenceUrl: input.evidenceUrl.trim(),
        adminNote: input.adminNote.trim(),
        status: input.status,
        isDemo: existing?.isDemo ?? false,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
      await updateSnapshot(
        (current) => ({
          ...current,
          activities: existing
            ? current.activities.map((a) => (a.id === activity.id ? activity : a))
            : [activity, ...current.activities],
        }),
        () => persistActivity(activity, existing ? 'update' : 'insert'),
      )
      return {}
    },
    [snapshot.activities, updateSnapshot],
  )

  const setActivityStatus = useCallback(
    async (id: string, status: ActivityStatus) => {
      const existing = snapshot.activities.find((a) => a.id === id)
      if (!existing) return
      const next = { ...existing, status, updatedAt: nowIso() }
      await updateSnapshot(
        (current) => ({
          ...current,
          activities: current.activities.map((a) => (a.id === id ? next : a)),
        }),
        () => persistActivity(next, 'update'),
      )
    },
    [snapshot.activities, updateSnapshot],
  )

  const deleteActivity = useCallback(
    async (id: string) => {
      const existing = snapshot.activities.find((a) => a.id === id)
      if (!existing) return
      await updateSnapshot(
        (current) => ({
          ...current,
          activities: current.activities.filter((a) => a.id !== id),
        }),
        () => persistActivity(existing, 'delete'),
      )
    },
    [snapshot.activities, updateSnapshot],
  )

  const setPayment = useCallback(
    async (athleteId: string, challengeId: ChallengeId, status: PaymentStatus | 'none') => {
      const payment = {
        athleteId,
        challengeId,
        status: status === 'none' ? 'pending' : status,
        updatedAt: nowIso(),
      }
      await updateSnapshot(
        (current) => {
          const without = current.payments.filter(
            (p) => !(p.athleteId === athleteId && p.challengeId === challengeId),
          )
          if (status === 'none') return { ...current, payments: without }
          return { ...current, payments: [...without, payment] }
        },
        async () => {
          if (!supabase) return
          if (status === 'none') {
            const { error } = await supabase.from('payments').delete().eq('athlete_id', athleteId).eq('challenge_id', challengeId)
            if (error) throw error
            return
          }
          await persistPayment(payment)
        },
      )
    },
    [updateSnapshot],
  )

  const saveSettings = useCallback(
    async (settings: SiteSettings) => {
      await updateSnapshot(
        (current) => ({ ...current, settings }),
        () => persistSettings(settings),
      )
    },
    [updateSnapshot],
  )

  const saveWeeklyPrize = useCallback(
    async (prize: WeeklyPrize) => {
      await updateSnapshot(
        (current) => ({
          ...current,
          weeklyPrizes: [
            ...current.weeklyPrizes.filter(
              (w) => !(w.challengeId === prize.challengeId && w.weekIndex === prize.weekIndex),
            ),
            prize,
          ],
        }),
        () => persistWeekly(prize),
      )
    },
    [updateSnapshot],
  )

  const setFinalized = useCallback(
    async (challengeId: ChallengeId, finalized: boolean) => {
      const existing = snapshot.challenges.find((c) => c.id === challengeId)
      if (!existing) return
      const next: Challenge = { ...existing, finalized }
      await updateSnapshot(
        (current) => ({
          ...current,
          challenges: current.challenges.map((c) => (c.id === challengeId ? next : c)),
        }),
        () => persistChallenge(next),
      )
    },
    [snapshot.challenges, updateSnapshot],
  )

  const uploadQr = useCallback(
    async (file: File) => {
      const url = await uploadQrImage(file)
      await saveSettings({ ...snapshot.settings, qrImageUrl: url })
    },
    [saveSettings, snapshot.settings],
  )

  const removeDemoData = useCallback(async () => {
    await updateSnapshot(
      (current) => ({
        ...current,
        athletes: current.athletes.filter((a) => !a.isDemo),
        activities: current.activities.filter((a) => !a.isDemo),
        payments: current.payments.filter(
          (p) => !current.athletes.find((a) => a.id === p.athleteId && a.isDemo),
        ),
      }),
      () => deleteRemoteDemo(),
    )
  }, [updateSnapshot])

  const restoreDemoData = useCallback(async () => {
    if (mode === 'supabase') {
      throw new Error('Demo restore in Supabase is done by running supabase/seed.sql')
    }
    const next = resetLocalToDemo()
    setSnapshot(next)
  }, [mode])

  const value = useMemo(
    () => ({
      snapshot,
      loading,
      error,
      mode,
      connected,
      isAdmin,
      adminEmail,
      login,
      logout,
      reload,
      addAthlete,
      updateAthlete,
      deleteAthlete,
      saveActivity,
      setActivityStatus,
      deleteActivity,
      setPayment,
      saveSettings,
      saveWeeklyPrize,
      setFinalized,
      uploadQr,
      removeDemoData,
      restoreDemoData,
    }),
    [
      snapshot,
      loading,
      error,
      mode,
      connected,
      isAdmin,
      adminEmail,
      login,
      logout,
      reload,
      addAthlete,
      updateAthlete,
      deleteAthlete,
      saveActivity,
      setActivityStatus,
      deleteActivity,
      setPayment,
      saveSettings,
      saveWeeklyPrize,
      setFinalized,
      uploadQr,
      removeDemoData,
      restoreDemoData,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

export { PLAYFUL_PAYMENT_MESSAGE }
