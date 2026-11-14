import { nowIso } from './dates'
import { defaultChallenges, defaultSettings } from './defaults'
import type { Activity, Athlete, Payment, Snapshot } from './types'

function athlete(id: string, name: string): Athlete {
  const t = nowIso()
  return { id, name, isDemo: true, createdAt: t, updatedAt: t }
}

function payment(athleteId: string, challengeId: 'short' | 'main', status: 'pending' | 'paid'): Payment {
  return { athleteId, challengeId, status, updatedAt: nowIso() }
}

function activity(
  id: string,
  athleteId: string,
  activityType: Activity['activityType'],
  activityDate: string,
  minutes: number,
  status: Activity['status'],
  extra?: Partial<Activity>,
): Activity {
  const t = nowIso()
  return {
    id,
    athleteId,
    activityType,
    activityDate,
    durationSeconds: minutes * 60,
    evidenceUrl: extra?.evidenceUrl ?? '',
    adminNote: extra?.adminNote ?? 'DEMO data',
    status,
    isDemo: true,
    createdAt: t,
    updatedAt: t,
  }
}

export function createDemoSnapshot(): Snapshot {
  const athletes = [
    athlete('demo-kavya', 'Demo — Kavya'),
    athlete('demo-rohan', 'Demo — Rohan'),
    athlete('demo-anika', 'Demo — Anika'),
    athlete('demo-vikram', 'Demo — Vikram'),
    athlete('demo-isha', 'Demo — Isha'),
    athlete('demo-neel', 'Demo — Neel'),
  ]

  const payments: Payment[] = [
    payment('demo-kavya', 'short', 'paid'),
    payment('demo-kavya', 'main', 'paid'),
    payment('demo-rohan', 'short', 'paid'),
    payment('demo-rohan', 'main', 'paid'),
    payment('demo-anika', 'short', 'paid'),
    payment('demo-anika', 'main', 'paid'),
    payment('demo-vikram', 'short', 'paid'),
    payment('demo-vikram', 'main', 'pending'),
    payment('demo-isha', 'short', 'pending'),
    payment('demo-isha', 'main', 'paid'),
    payment('demo-neel', 'main', 'paid'),
  ]

  const activities: Activity[] = [
    activity('d1', 'demo-kavya', 'running', '2026-11-14', 72, 'approved', {
      evidenceUrl: 'https://www.strava.com/activities/example-demo-1',
    }),
    activity('d2', 'demo-kavya', 'cycling', '2026-11-14', 40, 'approved', {
      adminNote: 'DEMO: second activity same day',
    }),
    activity('d3', 'demo-rohan', 'football', '2026-11-14', 90, 'approved'),
    activity('d4', 'demo-anika', 'swimming', '2026-11-15', 45, 'approved'),
    activity('d5', 'demo-vikram', 'running', '2026-11-15', 55, 'approved'),
    activity('d6', 'demo-isha', 'running', '2026-11-15', 80, 'approved'),
    activity('d7', 'demo-neel', 'cycling', '2026-11-16', 120, 'approved'),
    activity('d8', 'demo-kavya', 'running', '2026-11-16', 50, 'pending', {
      adminNote: 'DEMO pending — not counted yet',
    }),
    activity('d9', 'demo-rohan', 'running', '2026-11-16', 38, 'rejected', {
      adminNote: 'DEMO rejected example',
    }),
    activity('d10', 'demo-anika', 'football', '2026-11-17', 70, 'approved'),
    activity('d11', 'demo-isha', 'swimming', '2026-11-17', 35, 'approved'),
    activity('d12', 'demo-neel', 'running', '2026-11-18', 42, 'approved'),
  ]

  return {
    athletes,
    challenges: defaultChallenges.map((c) => ({ ...c })),
    payments,
    activities,
    weeklyPrizes: [],
    settings: {
      ...defaultSettings,
      rules: { ...defaultSettings.rules },
      paymentUpiId: '',
      qrImageUrl: '',
    },
  }
}
