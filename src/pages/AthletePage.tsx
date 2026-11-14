import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { RulesModal } from '../components/RulesModal'
import { useAppState } from '../lib/AppState'
import { formatIstDate } from '../lib/dates'
import { activityTypeLabel, formatDuration } from '../lib/format'
import { athleteActivities, challengeStatus, rankAthletes, statusLabel, weeklyBoards, weeklyWinsByAthlete } from '../lib/scoring'
import { useState } from 'react'

export function AthletePage() {
  const { id } = useParams()
  const { snapshot, isAdmin } = useAppState()
  const [rulesOpen, setRulesOpen] = useState(false)
  const athlete = snapshot.athletes.find((a) => a.id === id)

  if (!athlete) {
    return (
      <div className="app-shell">
        <Header onRules={() => setRulesOpen(true)} />
        <div className="card">
          <p>Athlete not found.</p>
          <Link to="/">Back to leaderboard</Link>
        </div>
      </div>
    )
  }

  const short = snapshot.challenges.find((c) => c.id === 'short')
  const main = snapshot.challenges.find((c) => c.id === 'main')
  const shortRows = short
    ? rankAthletes({ athletes: snapshot.athletes, activities: snapshot.activities, payments: snapshot.payments, challenge: short })
    : []
  const mainRows = main
    ? rankAthletes({ athletes: snapshot.athletes, activities: snapshot.activities, payments: snapshot.payments, challenge: main })
    : []
  const boards = main ? weeklyBoards(snapshot, main) : []
  const wins = weeklyWinsByAthlete(boards)[athlete.id] ?? 0
  const log = athleteActivities(snapshot.activities, athlete.id).filter((a) => isAdmin || a.status === 'approved')
  const grouped = log.reduce<Record<string, typeof log>>((acc, activity) => {
    acc[activity.activityDate] = acc[activity.activityDate] ?? []
    acc[activity.activityDate].push(activity)
    return acc
  }, {})
  const shortRow = shortRows.find((r) => r.athlete.id === athlete.id)
  const mainRow = mainRows.find((r) => r.athlete.id === athlete.id)

  return (
    <div className="app-shell">
      <Header onRules={() => setRulesOpen(true)} />
      <p>
        <Link to="/">← Leaderboard</Link>
      </p>
      <section className="card">
        <h2>
          {athlete.name}
          {athlete.isDemo ? <span className="chip">DEMO</span> : null}
        </h2>
        {short && shortRow ? (
          <p>
            Short: rank {shortRow.rank} · {formatDuration(shortRow.totalSeconds)} · {shortRow.activityCount} activities
            <span className="chip">{statusLabel(challengeStatus(short))}</span>
            {shortRow.paid ? <span className="chip paid">₹20 paid</span> : shortRow.entered ? <span className="chip unpaid">₹20 unpaid</span> : null}
          </p>
        ) : (
          <p className="muted">Not on the short challenge yet.</p>
        )}
        {main && mainRow ? (
          <p>
            Main: rank {mainRow.rank} · {formatDuration(mainRow.totalSeconds)} · {mainRow.activityCount} activities · {wins} weekly wins
            <span className="chip">{statusLabel(challengeStatus(main))}</span>
            {mainRow.paid ? <span className="chip paid">₹101 paid</span> : mainRow.entered ? <span className="chip unpaid">₹101 unpaid</span> : null}
          </p>
        ) : (
          <p className="muted">Not on the main challenge yet.</p>
        )}
      </section>
      <section className="card">
        <h3>Activity log</h3>
        <p className="muted">Each session is listed separately, even on the same day.</p>
        {Object.keys(grouped).length === 0 ? <p className="empty">No approved activities yet.</p> : null}
        {Object.entries(grouped).map(([date, items]) => (
          <div className="activity-day" key={date}>
            <strong>{formatIstDate(date)}</strong>
            {items.map((activity) => (
              <div className="activity-item" key={activity.id}>
                <div>
                  {activityTypeLabel(activity.activityType)}
                  {activity.status !== 'approved' ? <span className={`chip ${activity.status}`}>{activity.status}</span> : null}
                  {activity.isDemo ? <span className="chip">DEMO</span> : null}
                  {activity.evidenceUrl ? (
                    <div>
                      <a href={activity.evidenceUrl} target="_blank" rel="noreferrer">
                        Evidence link
                      </a>
                    </div>
                  ) : null}
                  {activity.adminNote ? <div className="muted">{activity.adminNote}</div> : null}
                </div>
                <strong>{formatDuration(activity.durationSeconds)}</strong>
              </div>
            ))}
          </div>
        ))}
      </section>
      {rulesOpen ? <RulesModal rules={snapshot.settings.rules} onClose={() => setRulesOpen(false)} /> : null}
    </div>
  )
}
