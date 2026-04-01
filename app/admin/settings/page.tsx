'use client'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [amount, setAmount] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setAmount(String(d.defaultIncentiveAmount || 200)))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setSaved(false)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultIncentiveAmount: Number(amount) }),
    })
    setLoading(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 480, padding: '24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Default Incentive Amount</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            This is the default ₹ amount per patient. Receptionist can override it per patient during entry.
          </p>

          {saved && <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ Settings saved successfully.</div>}

          <form onSubmit={handleSave} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Amount per Patient (₹)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 200"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginBottom: 1 }}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
