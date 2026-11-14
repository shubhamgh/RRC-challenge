import { useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { LeaderboardTable, PayoutCard, WeeklySection } from '../components/Leaderboard'
import { PaymentSection } from '../components/PaymentSection'
import { RulesModal } from '../components/RulesModal'
import { useAppState } from '../lib/AppState'
import { formatIstRange } from '../lib/dates'
import { challengeStatus, poolSummary, rankAthletes, statusLabel, weeklyBoards, weeklyWinsByAthlete } from '../lib/scoring'
import type { ChallengeId } from '../lib/types'

export function HomePage() {
  const { snapshot, loading, error, mode, connected } = useAppState()
  const [challengeId, setChallengeId] = useState<ChallengeId>('main')
  const [rulesOpen, setRulesOpen] = useState(false)

  const challenge = snapshot.challenges.find((c) => c.id === challengeId) ?? snapshot.challenges[1]
  const rows = useMemo(
    () =>
      challenge
        ? rankAthletes({
            athletes: snapshot.athletes,
            activities: snapshot.activities,
            payments: snapshot.payments,
            challenge,
          })
        : [],
    [challenge, snapshot],
  )
  const pool = challenge ? poolSummary(challenge, snapshot.payments) : null
  const boards = useMemo(
    () => (challengeId === 'main' && challenge ? weeklyBoards(snapshot, challenge) : []),
    [challenge, challengeId, snapshot],
  )
  const wins = weeklyWinsByAthlete(boards)
  const names = Object.fromEntries(snapshot.athletes.map((a) => [a.id, a.name]))
  const demoCount = snapshot.athletes.filter((a) => a.isDemo).length + snapshot.activities.filter((a) => a.isDemo).length

  return (
    <div className="app-shell">
      <Header onRules={() => setRulesOpen(true)} />
      {mode === 'demo' || !connected ? (
        <div className="banner">
          Demo mode: Supabase is not connected. Leaderboard data is local demo data (clearly labeled). Add
          credentials in <code>.env</code> when you have them — this site is not claiming a live database.
        </div>
      ) : null}
      {error ? <div className="banner warn">{error}</div> : null}
      {demoCount > 0 ? (
        <div className="banner">
          Demo athletes/activities are loaded and tagged DEMO. Remove them from Admin when you start real entries.
        </div>
      ) : null}

      <section className="card">
        <h2>Leaderboard</h2>
        <p className="muted">Ranked by approved eligible time. Tap a name for the full activity log.</p>
        <div className="tabs" role="tablist">
          <button type="button" className={challengeId === 'short' ? 'active' : ''} onClick={() => setChallengeId('short')}>
            Short
          </button>
          <button type="button" className={challengeId === 'main' ? 'active' : ''} onClick={() => setChallengeId('main')}>
            Main
          </button>
        </div>
        {loading ? <p className="empty">Loading leaderboard…</p> : null}
        {challenge ? (
          <>
            <p>
              <strong>{challenge.name}</strong>
              <span className="chip">{statusLabel(challengeStatus(challenge))}</span>
            </p>
            <p className="muted">
              {formatIstRange(challenge.startsOn, challenge.endsOn)} IST · ₹{challenge.entryAmountInr} entry · duration only
            </p>
            <LeaderboardTable
              rows={rows}
              weeklyWins={challengeId === 'main' ? wins : undefined}
              empty="No athletes yet. The admin can add the group from the admin page."
            />
          </>
        ) : null}
      </section>

      {pool && challenge ? (
        <PayoutCard
          title={challengeId === 'short' ? 'Short challenge pool' : 'Main challenge pool'}
          total={pool.total}
          paidCount={pool.paidCount}
          pendingCount={pool.pendingCount}
          amounts={pool.split.amounts}
          notes={pool.split.notes}
        />
      ) : null}

      {challengeId === 'main' ? <WeeklySection boards={boards} athletesById={names} /> : null}

      <PaymentSection settings={snapshot.settings} />
      {rulesOpen ? <RulesModal rules={snapshot.settings.rules} onClose={() => setRulesOpen(false)} /> : null}
      <p className="footer-note">RRC · private group of friends · walking does not count</p>
    </div>
  )
}
