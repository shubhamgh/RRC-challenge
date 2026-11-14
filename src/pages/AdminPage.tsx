import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { RulesModal } from '../components/RulesModal'
import { useAppState, type ActivityInput } from '../lib/AppState'
import { todayIst } from '../lib/dates'
import { ACTIVITY_TYPES } from '../lib/types'
import { activityTypeLabel, formatDuration, minutesAndSecondsToDuration } from '../lib/format'
import { formatIstRange } from '../lib/dates'
import { findDuplicateActivity, weeklyBoards } from '../lib/scoring'
import type { Activity, ActivityStatus, ChallengeId, RulesContent, SiteSettings } from '../lib/types'

export function AdminPage() {
  const state = useAppState()
  const [rulesOpen, setRulesOpen] = useState(false)
  const [tab, setTab] = useState<'activity' | 'athletes' | 'pay' | 'weekly' | 'rules' | 'settings'>('activity')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  if (!state.isAdmin) {
    return (
      <div className="app-shell">
        <Header onRules={() => setRulesOpen(true)} />
        <section className="card">
          <h2>Admin sign in</h2>
          {state.mode === 'demo' ? (
            <p className="muted">
              Local demo login. Default password is <code>rrc-local</code> (or <code>VITE_DEMO_ADMIN_PASSWORD</code>).
              This is only for trying the UI before Supabase Auth is set up.
            </p>
          ) : (
            <p className="muted">Use the email/password of an Auth user listed in <code>admin_users</code>.</p>
          )}
          <form
            className="form"
            onSubmit={async (event) => {
              event.preventDefault()
              setLoginError(null)
              try {
                await state.login(email, password)
              } catch (err) {
                setLoginError(err instanceof Error ? err.message : 'Sign in failed')
              }
            }}
          >
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
            {loginError ? <div className="banner warn">{loginError}</div> : null}
            <button className="btn accent" type="submit">
              Sign in
            </button>
          </form>
        </section>
        {rulesOpen ? <RulesModal rules={state.snapshot.settings.rules} onClose={() => setRulesOpen(false)} /> : null}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header onRules={() => setRulesOpen(true)} />
      <section className="card">
        <div className="row-between">
          <div>
            <h2>Admin</h2>
            <p className="muted">{state.adminEmail} · {state.mode === 'demo' ? 'local demo' : 'Supabase'}</p>
          </div>
          <button className="btn ghost small" type="button" onClick={() => void state.logout()}>
            Sign out
          </button>
        </div>
        <div className="tabs" style={{ flexWrap: 'wrap', borderRadius: 16 }}>
          {(['activity', 'athletes', 'pay', 'weekly', 'rules', 'settings'] as const).map((id) => (
            <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {id === 'pay' ? 'Payments' : id[0].toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      </section>
      {tab === 'activity' ? <ActivityAdmin /> : null}
      {tab === 'athletes' ? <AthleteAdmin /> : null}
      {tab === 'pay' ? <PaymentAdmin /> : null}
      {tab === 'weekly' ? <WeeklyAdmin /> : null}
      {tab === 'rules' ? <RulesAdmin /> : null}
      {tab === 'settings' ? <SettingsAdmin /> : null}
      {rulesOpen ? <RulesModal rules={state.snapshot.settings.rules} onClose={() => setRulesOpen(false)} /> : null}
    </div>
  )
}

function ActivityAdmin() {
  const { snapshot, saveActivity, setActivityStatus, deleteActivity } = useAppState()
  const [athleteId, setAthleteId] = useState(snapshot.athletes[0]?.id ?? '')
  const [activityType, setActivityType] = useState<(typeof ACTIVITY_TYPES)[number]>('running')
  const [activityDate, setActivityDate] = useState(todayIst())
  const [minutes, setMinutes] = useState('45')
  const [seconds, setSeconds] = useState('0')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [approveNow, setApproveNow] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<Activity | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!athleteId && snapshot.athletes[0]) setAthleteId(snapshot.athletes[0].id)
  }, [athleteId, snapshot.athletes])

  const payload = (): ActivityInput => ({
    athleteId,
    activityType,
    activityDate,
    durationSeconds: minutesAndSecondsToDuration(Number(minutes) || 0, Number(seconds) || 0),
    evidenceUrl,
    adminNote,
    status: approveNow ? 'approved' : 'pending',
  })

  async function submit(event: FormEvent, confirmDuplicate = false) {
    event.preventDefault()
    setMessage(null)
    const input = payload()
    if (!input.athleteId) {
      setMessage('Add an athlete first.')
      return
    }
    if (input.durationSeconds <= 0) {
      setMessage('Duration must be greater than 0.')
      return
    }
    setBusy(true)
    try {
      const result = await saveActivity(input, confirmDuplicate)
      if (result.duplicate) {
        setDuplicate(result.duplicate)
        setMessage('Possible duplicate: same athlete, date, type, and duration already exists.')
      } else {
        setDuplicate(null)
        setEvidenceUrl('')
        setAdminNote('')
        setMessage(approveNow ? 'Saved and approved.' : 'Saved as pending.')
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const recent = [...snapshot.activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)

  return (
    <>
      <section className="card">
        <h3>Add activity</h3>
        <form className="form" onSubmit={(e) => void submit(e, false)}>
          <label>
            Athlete
            <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
              {snapshot.athletes.length === 0 ? <option value="">No athletes</option> : null}
              {snapshot.athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span style={{ fontWeight: 650, fontSize: '0.9rem' }}>Type</span>
            <div className="types">
              {ACTIVITY_TYPES.map((type) => (
                <button key={type} type="button" className={activityType === type ? 'on' : ''} onClick={() => setActivityType(type)}>
                  {activityTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
          <label>
            Activity date (IST)
            <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
          </label>
          <div className="inline">
            <label>
              Minutes
              <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
            <label>
              Seconds
              <input inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
            </label>
          </div>
          <label>
            Evidence link (optional Strava URL)
            <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://www.strava.com/activities/…" />
          </label>
          <label>
            Admin note
            <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={approveNow} onChange={(e) => setApproveNow(e.target.checked)} />
            Approve now
          </label>
          {message ? <div className={duplicate ? 'banner warn' : 'banner ok'}>{message}</div> : null}
          <div className="top-actions">
            <button className="btn accent" disabled={busy} type="submit">
              {busy ? 'Saving…' : 'Save activity'}
            </button>
            {duplicate ? (
              <button className="btn secondary" type="button" onClick={(e) => void submit(e, true)}>
                Save anyway
              </button>
            ) : null}
          </div>
        </form>
      </section>
      <section className="card">
        <h3>Recent submissions</h3>
        {recent.length === 0 ? <p className="empty">No activities yet.</p> : null}
        {recent.map((activity) => {
          const athlete = snapshot.athletes.find((a) => a.id === activity.athleteId)
          const dup = findDuplicateActivity(snapshot.activities, activity)
          return (
            <div className="activity-item" key={activity.id}>
              <div>
                <strong>{athlete?.name ?? 'Unknown'}</strong> · {activityTypeLabel(activity.activityType)} · {activity.activityDate}
                <div className="muted">{formatDuration(activity.durationSeconds)}{activity.isDemo ? ' · DEMO' : ''}{dup ? ' · duplicate warning' : ''}</div>
                {activity.evidenceUrl ? (
                  <a href={activity.evidenceUrl} target="_blank" rel="noreferrer">
                    Evidence
                  </a>
                ) : null}
              </div>
              <div className="top-actions">
                <StatusButtons status={activity.status} onChange={(status) => void setActivityStatus(activity.id, status)} />
                <button className="btn danger small" type="button" onClick={() => void deleteActivity(activity.id)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}

function StatusButtons({ status, onChange }: { status: ActivityStatus; onChange: (status: ActivityStatus) => void }) {
  return (
    <>
      {status !== 'approved' ? (
        <button className="btn small" type="button" onClick={() => onChange('approved')}>
          Approve
        </button>
      ) : (
        <span className="chip paid">approved</span>
      )}
      {status !== 'rejected' ? (
        <button className="btn ghost small" type="button" onClick={() => onChange('rejected')}>
          Reject
        </button>
      ) : (
        <span className="chip unpaid">rejected</span>
      )}
      {status !== 'pending' ? (
        <button className="btn ghost small" type="button" onClick={() => onChange('pending')}>
          Pending
        </button>
      ) : null}
    </>
  )
}

function AthleteAdmin() {
  const { snapshot, addAthlete, updateAthlete, deleteAthlete } = useAppState()
  const [name, setName] = useState('')
  return (
    <section className="card">
      <h3>Athletes</h3>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          void addAthlete(name)
          setName('')
        }}
      >
        <label>
          Add athlete
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        </label>
        <button className="btn" type="submit">
          Add
        </button>
      </form>
      {snapshot.athletes.map((athlete) => (
        <div className="activity-item" key={athlete.id}>
          <input
            defaultValue={athlete.name}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== athlete.name) void updateAthlete(athlete.id, e.target.value)
            }}
          />
          <div>
            <Link className="btn ghost small" to={`/athletes/${athlete.id}`}>
              Profile
            </Link>
            <button className="btn danger small" type="button" onClick={() => void deleteAthlete(athlete.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

function PaymentAdmin() {
  const { snapshot, setPayment } = useAppState()
  return (
    <section className="card">
      <h3>Payment status</h3>
      <p className="muted">Paid status drives prize pools and weekly-prize eligibility. Nothing payment-credential related is stored.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Athlete</th>
            <th>₹20 short</th>
            <th>₹101 main</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.athletes.map((athlete) => (
            <tr key={athlete.id}>
              <td>
                {athlete.name}
                {athlete.isDemo ? ' (DEMO)' : ''}
              </td>
              <td>
                <PaySelect
                  value={snapshot.payments.find((p) => p.athleteId === athlete.id && p.challengeId === 'short')?.status}
                  onChange={(status) => void setPayment(athlete.id, 'short', status)}
                />
              </td>
              <td>
                <PaySelect
                  value={snapshot.payments.find((p) => p.athleteId === athlete.id && p.challengeId === 'main')?.status}
                  onChange={(status) => void setPayment(athlete.id, 'main', status)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function PaySelect({
  value,
  onChange,
}: {
  value?: 'pending' | 'paid'
  onChange: (status: 'pending' | 'paid' | 'none') => void
}) {
  return (
    <select value={value ?? 'none'} onChange={(e) => onChange(e.target.value as 'pending' | 'paid' | 'none')}>
      <option value="none">Not entered</option>
      <option value="pending">Pending</option>
      <option value="paid">Paid</option>
    </select>
  )
}

function WeeklyAdmin() {
  const { snapshot, saveWeeklyPrize, setFinalized } = useAppState()
  const main = snapshot.challenges.find((c) => c.id === 'main')
  const short = snapshot.challenges.find((c) => c.id === 'short')
  const boards = useMemo(() => (main ? weeklyBoards(snapshot, main) : []), [main, snapshot])
  if (!main) return null
  return (
    <>
      <section className="card">
        <h3>Finalize challenges</h3>
        <p className="muted">Public pages show live/provisional until you mark a challenge final.</p>
        {short ? (
          <label>
            Short challenge
            <select
              value={short.finalized ? 'final' : 'provisional'}
              onChange={(e) => void setFinalized('short', e.target.value === 'final')}
            >
              <option value="provisional">Provisional</option>
              <option value="final">Final</option>
            </select>
          </label>
        ) : null}
        <label>
          Main challenge
          <select
            value={main.finalized ? 'final' : 'provisional'}
            onChange={(e) => void setFinalized('main', e.target.value === 'final')}
          >
            <option value="provisional">Provisional</option>
            <option value="final">Final</option>
          </select>
        </label>
      </section>
      <section className="card">
        <h3>Weekly prize decisions</h3>
        <p className="muted">
          Multiple weekly wins are {snapshot.settings.allowMultipleWeeklyWins ? 'allowed' : 'not allowed'}. Change that in
          Settings.
        </p>
        {boards.map((board) => (
          <article className="week" key={board.week.index}>
            <strong>
              {board.week.label}: {formatIstRange(board.week.startDate, board.week.endDate)} IST
            </strong>
            <p>Prize {board.prizeAmountInr} · {board.roundingNote || 'no rounding extra this week'}</p>
            <label>
              Official winner
              <select
                value={board.officialWinnerId ?? ''}
                onChange={(e) =>
                  void saveWeeklyPrize({
                    challengeId: 'main' as ChallengeId,
                    weekIndex: board.week.index,
                    startDate: board.week.startDate,
                    endDate: board.week.endDate,
                    winnerAthleteId: e.target.value || null,
                    prizeAmountInr: board.prizeAmountInr,
                    roundingNote: board.roundingNote,
                    tieAthleteIds: board.timeLeaders.map((row) => row.athlete.id),
                    tieRule: snapshot.settings.weeklyTieRule,
                    adminDecisionNote: board.adminDecisionNote,
                    recorded: Boolean(e.target.value),
                  })
                }
              >
                <option value="">Not recorded / tied</option>
                {board.timeLeaders.map((row) => (
                  <option key={row.athlete.id} value={row.athlete.id}>
                    {row.athlete.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Decision note
              <input
                defaultValue={board.adminDecisionNote}
                onBlur={(e) =>
                  void saveWeeklyPrize({
                    challengeId: 'main',
                    weekIndex: board.week.index,
                    startDate: board.week.startDate,
                    endDate: board.week.endDate,
                    winnerAthleteId: board.officialWinnerId,
                    prizeAmountInr: board.prizeAmountInr,
                    roundingNote: board.roundingNote,
                    tieAthleteIds: board.timeLeaders.map((row) => row.athlete.id),
                    tieRule: snapshot.settings.weeklyTieRule,
                    adminDecisionNote: e.target.value,
                    recorded: board.recorded,
                  })
                }
              />
            </label>
          </article>
        ))}
      </section>
    </>
  )
}

function RulesAdmin() {
  const { snapshot, saveSettings } = useAppState()
  const [rules, setRules] = useState<RulesContent>(snapshot.settings.rules)
  const fields: { key: keyof RulesContent; label: string }[] = [
    { key: 'dates', label: 'Dates' },
    { key: 'timezone', label: 'Timezone' },
    { key: 'eligible', label: 'Eligible activities' },
    { key: 'scoring', label: 'Scoring' },
    { key: 'approval', label: 'Approval process' },
    { key: 'deadline', label: 'Submission deadline' },
    { key: 'ties', label: 'Tie rules' },
    { key: 'weekly', label: 'Weekly prizes' },
    { key: 'payouts', label: 'Payout splits' },
    { key: 'disputes', label: 'Corrections / disputes' },
    { key: 'assumptions', label: 'Assumed rules' },
  ]
  return (
    <section className="card">
      <h3>Editable rules</h3>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void saveSettings({ ...snapshot.settings, rules })
        }}
      >
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            <textarea value={rules[field.key]} onChange={(e) => setRules({ ...rules, [field.key]: e.target.value })} />
          </label>
        ))}
        <button className="btn accent" type="submit">
          Save rules
        </button>
      </form>
    </section>
  )
}

function SettingsAdmin() {
  const { snapshot, saveSettings, uploadQr, removeDemoData, restoreDemoData, mode } = useAppState()
  const [settings, setSettings] = useState<SiteSettings>(snapshot.settings)
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <section className="card">
      <h3>Payment & site settings</h3>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void saveSettings(settings).then(() => setMsg('Settings saved.'))
        }}
      >
        <label>
          UPI ID
          <input value={settings.paymentUpiId} onChange={(e) => setSettings({ ...settings, paymentUpiId: e.target.value })} placeholder="your-upi@bank" />
        </label>
        <label>
          Payment instructions
          <textarea value={settings.paymentInstructions} onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })} />
        </label>
        <label>
          UPI QR image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadQr(file).then(() => setMsg('QR uploaded.'))
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={settings.allowMultipleWeeklyWins}
            onChange={(e) => setSettings({ ...settings, allowMultipleWeeklyWins: e.target.checked })}
          />
          Allow the same athlete to win multiple weekly prizes
        </label>
        <label>
          Weekly tie rule
          <textarea value={settings.weeklyTieRule} onChange={(e) => setSettings({ ...settings, weeklyTieRule: e.target.value })} />
        </label>
        {msg ? <div className="banner ok">{msg}</div> : null}
        <button className="btn accent" type="submit">
          Save settings
        </button>
      </form>
      <hr />
      <h3>Demo data</h3>
      <p className="muted">Demo records are tagged DEMO. Remove them before the real challenge standings go public.</p>
      <div className="top-actions">
        <button className="btn danger" type="button" onClick={() => void removeDemoData()}>
          Remove demo data
        </button>
        {mode === 'demo' ? (
          <button className="btn secondary" type="button" onClick={() => void restoreDemoData()}>
            Restore local demo
          </button>
        ) : null}
      </div>
    </section>
  )
}
