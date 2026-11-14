import { Link } from 'react-router-dom'
import { formatDuration, formatInr } from '../lib/format'
import { formatIstRange } from '../lib/dates'
import type { RankedRow, WeeklyBoard } from '../lib/types'

function rankClass(rank: number) {
  if (rank === 1) return 'rank gold'
  if (rank === 2) return 'rank silver'
  if (rank === 3) return 'rank bronze'
  return 'rank'
}

export function LeaderboardTable({
  rows,
  empty,
  weeklyWins,
}: {
  rows: RankedRow[]
  empty: string
  weeklyWins?: Record<string, number>
}) {
  const visible = rows.filter((row) => row.entered || row.totalSeconds > 0)
  if (visible.length === 0) return <p className="empty">{empty}</p>
  return (
    <div>
      {visible.map((row) => (
        <Link className="lb-row" key={row.athlete.id} to={`/athletes/${row.athlete.id}`}>
          <div className={rankClass(row.rank)}>{row.rank}</div>
          <div>
            <strong>
              {row.athlete.name}
              {row.athlete.isDemo ? <span className="chip">DEMO</span> : null}
              {row.tiedWithPrevious ? <span className="chip">tie</span> : null}
            </strong>
            <div className="muted">
              {row.activityCount} {row.activityCount === 1 ? 'activity' : 'activities'}
              {weeklyWins?.[row.athlete.id] ? ` · ${weeklyWins[row.athlete.id]} weekly win${weeklyWins[row.athlete.id] === 1 ? '' : 's'}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>{formatDuration(row.totalSeconds)}</strong>
            <div>
              {row.paid ? <span className="chip paid">Paid</span> : row.entered ? <span className="chip unpaid">Unpaid</span> : <span className="chip">Not entered</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function PayoutCard({
  title,
  total,
  paidCount,
  pendingCount,
  amounts,
  notes,
}: {
  title: string
  total: number
  paidCount: number
  pendingCount: number
  amounts: Record<string, number>
  notes: string[]
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted">
        {paidCount} paid · {pendingCount} pending · pool {formatInr(total)}
      </p>
      <div className="payouts">
        {Object.entries(amounts).map(([label, amount]) => (
          <div className="payout" key={label}>
            <span className="muted">{label}</span>
            <strong>{formatInr(amount)}</strong>
          </div>
        ))}
      </div>
      {notes.map((note) => (
        <p className="muted" key={note} style={{ marginTop: 8 }}>
          {note}
        </p>
      ))}
    </div>
  )
}

export function WeeklySection({
  boards,
  athletesById,
}: {
  boards: WeeklyBoard[]
  athletesById: Record<string, string>
}) {
  return (
    <div className="card">
      <h3>Weekly leaderboards</h3>
      <p className="muted">
        Weekly prizes are only for paid main-challenge (₹101) entrants. Amounts depend on how many
        people paid — there is no minimum weekly prize.
      </p>
      {boards.map((board) => {
        const tied = board.timeLeaders.length > 1 && !board.recorded
        const winnerName = board.officialWinnerId ? athletesById[board.officialWinnerId] : null
        return (
          <article className="week" key={board.week.index}>
            <div className="row-between">
              <strong>{board.week.label}</strong>
              <span>{formatInr(board.prizeAmountInr)}</span>
            </div>
            <p className="muted">{formatIstRange(board.week.startDate, board.week.endDate)} IST</p>
            {board.roundingNote ? <p className="muted">{board.roundingNote}</p> : null}
            {board.timeLeaders.length === 0 ? (
              <p className="muted">No approved time yet this week.</p>
            ) : tied ? (
              <p>
                Tied on time:{' '}
                {board.timeLeaders.map((row) => row.athlete.name).join(', ')}. Official winner not
                recorded yet.
              </p>
            ) : (
              <p className="winner">
                {board.recorded ? 'Recorded winner: ' : 'Current leader: '}
                {winnerName ?? '—'}
              </p>
            )}
            <p className="muted">Tie rule: {board.tieRule}</p>
            {board.adminDecisionNote ? <p>{board.adminDecisionNote}</p> : null}
            <LeaderboardTable rows={board.rows} empty="No paid entrants yet." />
          </article>
        )
      })}
    </div>
  )
}
