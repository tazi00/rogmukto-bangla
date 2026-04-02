'use client'
import { useState } from 'react'

const DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 20, 10]

interface Props {
  patient: { _id: string; name: string; paymentStatus: string; paymentDetail?: any; incentiveAmount: number }
  onClose: () => void
  onSave: () => void
}

export default function PaymentModal({ patient, onClose, onSave }: Props) {
  const [status, setStatus] = useState(patient.paymentStatus || 'pending')
  const [mode, setMode] = useState(patient.paymentDetail?.mode || '')
  const [remarks, setRemarks] = useState(patient.paymentDetail?.remarks || '')
  const [denoms, setDenoms] = useState<Record<number, number>>(
    Object.fromEntries((patient.paymentDetail?.denominations || []).map((d: any) => [d.note, d.count]))
  )
  const [loading, setLoading] = useState(false)

  function setDenom(note: number, val: string) {
    setDenoms(prev => ({ ...prev, [note]: parseInt(val) || 0 }))
  }

  const cashTotal = Object.entries(denoms).reduce((s, [note, count]) => s + Number(note) * count, 0)

  async function handleSave() {
    setLoading(true)
    const denomArr = Object.entries(denoms)
      .filter(([, c]) => c > 0)
      .map(([note, count]) => ({ note: Number(note), count }))

    await fetch('/api/payment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient._id,
        status,
        paymentDetail: { mode, remarks, denominations: mode === 'cash' ? denomArr : [] },
      }),
    })
    setLoading(false)
    onSave()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>Update Payment — {patient.name}</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Status - 2 only */}
          <div className="form-group">
            <label className="form-label">Payment Status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'pending', label: '⏳ Pending', color: '#f0a500' },
                { value: 'clearance', label: '✓ Clearance', color: '#1a7a4a' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${status === opt.value ? opt.color : 'var(--border)'}`,
                    background: status === opt.value ? opt.color + '18' : 'var(--surface)',
                    color: status === opt.value ? opt.color : 'var(--text-muted)',
                    fontWeight: status === opt.value ? 600 : 400,
                    fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment mode */}
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: '', label: 'Not Set' },
                { value: 'cash', label: '💵 Cash' },
                { value: 'online', label: '🏦 Online' },
              ].map(m => (
                <button key={m.value} type="button" onClick={() => setMode(m.value)}
                  style={{
                    flex: 1, padding: '9px 8px', borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${mode === m.value ? 'var(--green-mid)' : 'var(--border)'}`,
                    background: mode === m.value ? 'var(--green-light)' : 'var(--surface)',
                    color: mode === m.value ? 'var(--green-dark)' : 'var(--text-muted)',
                    fontWeight: mode === m.value ? 600 : 400,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash denominations */}
          {mode === 'cash' && (
            <div style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Cash Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {DENOMINATIONS.map(note => (
                  <div key={note} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, width: 48 }}>₹{note}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>×</span>
                    <input type="number" min="0" className="form-input"
                      style={{ flex: 1, padding: '6px 8px', fontSize: 13 }}
                      value={denoms[note] || ''} placeholder="0"
                      onChange={e => setDenom(note, e.target.value)} />
                    {(denoms[note] || 0) > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--green)', minWidth: 40 }}>₹{note * (denoms[note] || 0)}</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total Cash</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: cashTotal === patient.incentiveAmount ? 'var(--green)' : cashTotal > 0 ? 'var(--red)' : 'var(--text)' }}>
                  ₹{cashTotal.toLocaleString()}
                  {cashTotal > 0 && cashTotal !== patient.incentiveAmount && (
                    <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6, color: 'var(--red)' }}>(expected ₹{patient.incentiveAmount})</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="form-group">
            <label className="form-label">Remarks / Notes</label>
            <textarea className="form-input" rows={3} value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Any additional notes about this payment..."
              style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
