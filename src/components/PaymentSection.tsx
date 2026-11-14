import { PLAYFUL_PAYMENT_MESSAGE } from '../lib/defaults'
import type { SiteSettings } from '../lib/types'

export function PaymentSection({ settings }: { settings: SiteSettings }) {
  return (
    <section className="card" id="pay">
      <h2>Entry contributions</h2>
      <p className="muted">
        Short challenge ₹20 · Main challenge ₹101. Pay the admin, then they mark you paid. This site
        never collects UPI PINs, passwords, or card details.
      </p>
      <p className="playful">{PLAYFUL_PAYMENT_MESSAGE}</p>
      <div className="qr-box" style={{ marginTop: 12 }}>
        {settings.qrImageUrl ? (
          <img src={settings.qrImageUrl} alt="UPI QR code for RRC contributions" />
        ) : (
          <div>
            <strong>UPI QR placeholder</strong>
            <p className="muted">Admin: upload your QR image in Admin → Settings. No sample QR is invented here.</p>
          </div>
        )}
      </div>
      <p style={{ marginTop: 12 }}>
        <strong>UPI ID:</strong>{' '}
        {settings.paymentUpiId || <span className="muted">Not set yet — add it in Admin → Settings.</span>}
      </p>
      <p>{settings.paymentInstructions}</p>
    </section>
  )
}
