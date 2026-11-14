import type { RulesContent } from '../lib/types'

const sections: { key: keyof RulesContent; title: string }[] = [
  { key: 'dates', title: 'Dates' },
  { key: 'timezone', title: 'Timezone and cutoff' },
  { key: 'eligible', title: 'Eligible activities' },
  { key: 'scoring', title: 'Scoring' },
  { key: 'approval', title: 'How activities get on the board' },
  { key: 'deadline', title: 'Submission deadline' },
  { key: 'ties', title: 'Ties' },
  { key: 'weekly', title: 'Weekly prizes' },
  { key: 'payouts', title: 'Payout splits' },
  { key: 'disputes', title: 'Corrections and disputes' },
  { key: 'assumptions', title: 'Assumed rules (easy to change)' },
]

export function RulesModal({
  rules,
  onClose,
}: {
  rules: RulesContent
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-labelledby="rules-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="row-between">
          <h2 id="rules-title">RRC challenge rules</h2>
          <button type="button" className="btn ghost small" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted">
          The admin can edit these from the admin area without changing code.
        </p>
        {sections.map((section) => (
          <section className="rule-block" key={section.key}>
            <h3>{section.title}</h3>
            <p>{rules[section.key]}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
