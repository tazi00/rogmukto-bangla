'use client'
import { useEffect, useState } from 'react'

interface Patient {
  _id: string
  name: string
  mobile: string
  ipdNo: string
  doa: string
  incentiveAmount: number
  paymentStatus: 'pending' | 'cleared'
  helperId: { _id: string; name: string; block: string; gramPanchayat: string; subDivision: string; tag: string }
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [month, setMonth] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [clearing, setClearing] = useState(false)

  async function load() {
    const params = new URLSearchParams()
    if (month) params.set('month', month)
    if (statusFilter) params.set('status', statusFilter)
    const data = await fetch(`/api/patients?${params}`).then(r => r.json())
    setPatients(Array.isArray(data) ? data : [])
    setSelected([])
  }
  useEffect(() => { load() }, [month, statusFilter])

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    const pending = patients.filter(p => p.paymentStatus === 'pending').map(p => p._id)
    setSelected(prev => prev.length === pending.length ? [] : pending)
  }

  async function markCleared() {
    if (selected.length === 0) return
    setClearing(true)
    await fetch('/api/payment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientIds: selected, status: 'cleared' }),
    })
    setClearing(false)
    load()
  }

  const pendingTotal = patients
    .filter(p => selected.includes(p._id))
    .reduce((sum, p) => sum + p.incentiveAmount, 0)

  return (
    <>
      <div className="page-header">
        <h2>Patients</h2>
        {selected.length > 0 && (
          <button className="btn btn-accent" onClick={markCleared} disabled={clearing}>
            {clearing ? 'Processing...' : `✓ Mark ${selected.length} as Cleared (₹${pendingTotal})`}
          </button>
        )}
      </div>
      <div className="page-body">
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Month</label>
            <input className="form-input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 170 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Status</label>
            <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="cleared">Cleared</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" onChange={toggleAll}
                    checked={selected.length > 0 && selected.length === patients.filter(p => p.paymentStatus === 'pending').length} />
                </th>
                <th>Patient Name</th>
                <th>Mobile</th>
                <th>IPD No.</th>
                <th>Date of Admission</th>
                <th>Referred By</th>
                <th>Block / GP</th>
                <th>Incentive</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><p>No patients found.</p></div></td></tr>
              ) : patients.map(p => (
                <tr key={p._id}>
                  <td>
                    {p.paymentStatus === 'pending' && (
                      <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleSelect(p._id)} />
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.mobile}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.ipdNo}</td>
                  <td style={{ fontSize: 12 }}>{new Date(p.doa).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.helperId?.name}</div>
                    <span className="badge badge-green" style={{ marginTop: 2 }}>{p.helperId?.tag}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {p.helperId?.block} / {p.helperId?.gramPanchayat}
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{p.incentiveAmount}</td>
                  <td>
                    <span className={`badge ${p.paymentStatus === 'cleared' ? 'badge-green' : 'badge-amber'}`}>
                      {p.paymentStatus === 'cleared' ? '✓ Cleared' : '⏳ Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
