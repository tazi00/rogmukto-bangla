'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Helper {
  _id: string; name: string; subDivision: string; block: string; gramPanchayat: string; tag: string; phone: string
}
interface Patient {
  _id: string; name: string; mobile: string; ipdNo: string; doa: string; incentiveAmount: number
  paymentStatus: string; helperId: { name: string; block: string; gramPanchayat: string }
}

const EMPTY_FORM = { name: '', mobile: '', ipdNo: '', doa: '', helperId: '', incentiveAmount: '' }

export default function ReceptionPage() {
  const router = useRouter()
  const [helpers, setHelpers] = useState<Helper[]>([])
  const [recentPatients, setRecentPatients] = useState<Patient[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [defaultAmount, setDefaultAmount] = useState(200)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [helperSearch, setHelperSearch] = useState('')

  useEffect(() => {
    fetch('/api/helpers').then(r => r.json()).then(setHelpers)
    fetch('/api/settings').then(r => r.json()).then(d => {
      setDefaultAmount(d.defaultIncentiveAmount || 200)
      setForm(f => ({ ...f, incentiveAmount: String(d.defaultIncentiveAmount || 200) }))
    })
    loadRecent()
  }, [])

  async function loadRecent() {
    const today = new Date().toISOString().slice(0, 7)
    const data = await fetch(`/api/patients?month=${today}`).then(r => r.json())
    setRecentPatients(Array.isArray(data) ? data.slice(0, 10) : [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, incentiveAmount: Number(form.incentiveAmount) }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return }
      setSuccess('Patient added successfully!')
      setForm({ ...EMPTY_FORM, helperId: form.helperId, incentiveAmount: String(defaultAmount) })
      loadRecent()
      setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const filteredHelpers = helpers.filter(h =>
    h.name.toLowerCase().includes(helperSearch.toLowerCase()) ||
    h.block.toLowerCase().includes(helperSearch.toLowerCase()) ||
    h.gramPanchayat.toLowerCase().includes(helperSearch.toLowerCase())
  )

  const selectedHelper = helpers.find(h => h._id === form.helperId)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--green-dark)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Rogmukto Bangla</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Reception Panel</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/view" target="_blank" className="btn btn-secondary btn-sm">↗ View Panel</a>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'start' }}>

          {/* Add Patient Form */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Add New Patient</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Fill in patient details below</p>

            {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}
            {success && <div className="alert alert-success" style={{ marginBottom: 14 }}>{success}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Helper search */}
              <div className="form-group">
                <label className="form-label">Swasthya Bondhu *</label>
                <input
                  className="form-input"
                  placeholder="Search by name, block, GP..."
                  value={helperSearch}
                  onChange={e => { setHelperSearch(e.target.value); setForm({...form, helperId: ''}) }}
                />
                {helperSearch && !selectedHelper && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: 4, maxHeight: 180, overflowY: 'auto', background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}>
                    {filteredHelpers.length === 0
                      ? <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 13 }}>No helpers found</div>
                      : filteredHelpers.map(h => (
                        <div
                          key={h._id}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                          onClick={() => { setForm({...form, helperId: h._id}); setHelperSearch(h.name) }}
                        >
                          <div style={{ fontWeight: 500 }}>{h.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{h.subDivision} · {h.block} · {h.gramPanchayat} · <span style={{ color: 'var(--green)' }}>{h.tag}</span></div>
                        </div>
                      ))
                    }
                  </div>
                )}
                {selectedHelper && (
                  <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--green-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--green-dark)' }}>
                    ✓ {selectedHelper.name} · {selectedHelper.block} / {selectedHelper.gramPanchayat}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Patient Name *</label>
                  <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile No. *</label>
                  <input className="form-input" required value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} placeholder="10-digit number" />
                </div>
                <div className="form-group">
                  <label className="form-label">IPD No. *</label>
                  <input className="form-input" required value={form.ipdNo} onChange={e => setForm({...form, ipdNo: e.target.value})} placeholder="e.g. IPD-2024-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Admission *</label>
                  <input className="form-input" type="date" required value={form.doa} onChange={e => setForm({...form, doa: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Incentive Amount (₹) <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— default ₹{defaultAmount}, override if needed</span></label>
                <input className="form-input" type="number" min="0" required value={form.incentiveAmount} onChange={e => setForm({...form, incentiveAmount: e.target.value})} />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ justifyContent: 'center', padding: '11px' }}
                disabled={loading || !form.helperId}
              >
                {loading ? 'Adding Patient...' : 'Add Patient'}
              </button>
            </form>
          </div>

          {/* Recent patients */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>Recent Patients This Month</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>IPD</th>
                    <th>Helper</th>
                    <th>DOA</th>
                    <th>₹</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state" style={{ padding: '24px' }}><p>No patients added this month yet.</p></div></td></tr>
                  ) : recentPatients.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.ipdNo}</td>
                      <td style={{ fontSize: 12 }}>{p.helperId?.name}</td>
                      <td style={{ fontSize: 12 }}>{new Date(p.doa).toLocaleDateString('en-IN')}</td>
                      <td>₹{p.incentiveAmount}</td>
                      <td><span className={`badge ${p.paymentStatus === 'cleared' ? 'badge-green' : 'badge-amber'}`}>{p.paymentStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
