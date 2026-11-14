import { Link } from 'react-router-dom'

export function Header({ onRules }: { onRules: () => void }) {
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <div className="mark">RRC</div>
        <div>
          <h1>Randhwe Run Club</h1>
          <p>Time challenges · IST</p>
        </div>
      </Link>
      <div className="top-actions">
        <button type="button" className="btn accent" onClick={onRules}>
          Rules
        </button>
        <Link to="/admin" className="btn secondary">
          Admin
        </Link>
      </div>
    </header>
  )
}
