'use client'
import { useEffect, useState } from 'react'

interface ReportRow {
  helper: { _id: string; name: string; phone: string; subDivision: string; block: string; gramPanchayat: string; tag: string }
  patients: any[]
  totalPatients: number
  totalIncentive: number
  pendingIncentive: number
  clearedIncentive: number
}
interface Patient {
  _id: string; name: string; mobile: string; ipdNo: string; doa: string
  incentiveAmount: number; paymentStatus: string
  helperId: { name: string; block: string; gramPanchayat: string; subDivision: string; tag: string }
}

export default function ViewPage() {
  const [activeTab, setActiveTab] = useState<'helper' | 'patient'>('helper')
  const [subDivision, setSubDivision] = useState('')
  const [block, setBlock] = useState('')
  const [gramPanchayat, setGramPanchayat] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [helperName, setHelperName] = useState('')

  const [helperReport, setHelperReport] = useState<ReportRow[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [helpers, setHelpers] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/helpers').then(r => r.json()).then(setHelpers)
  }, [])

  useEffect(() => {
    if (activeTab === 'helper') loadHelperReport()
    else loadPatients()
  }, [activeTab, subDivision, block, gramPanchayat, month, helperName])

  async function loadHelperReport() {
    setLoading(true)
    const params = new URLSearchParams()
    if (subDivision) params.set('subDivision', subDivision)
    if (block) params.set('block', block)
    if (gramPanchayat) params.set('gramPanchayat', gramPanchayat)
    if (month) params.set('month', month)
    if (helperName) {
      const h = helpers.find(x => x.name.toLowerCase().includes(helperName.toLowerCase()))
      if (h) params.set('helperId', h._id)
    }
    const data = await fetch(`/api/reports?${params}`).then(r => r.json())
    setHelperReport(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function loadPatients() {
    setLoading(true)
    const params = new URLSearchParams()
    if (month) params.set('month', month)
    if (helperName) {
      const h = helpers.find(x => x.name.toLowerCase().includes(helperName.toLowerCase()))
      if (h) params.set('helperId', h._id)
    }
    const data = await fetch(`/api/patients?${params}`).then(r => r.json())
    let filtered = Array.isArray(data) ? data : []
    if (subDivision) filtered = filtered.filter((p: Patient) => p.helperId?.subDivision === subDivision)
    if (block) filtered = filtered.filter((p: Patient) => p.helperId?.block === block)
    if (gramPanchayat) filtered = filtered.filter((p: Patient) => p.helperId?.gramPanchayat === gramPanchayat)
    setPatients(filtered)
    setLoading(false)
  }

  // Unique values for dropdowns
  const subDivisions = [...new Set(helpers.map(h => h.subDivision).filter(Boolean))]
  const blocks = [...new Set(helpers.filter(h => !subDivision || h.subDivision === subDivision).map(h => h.block).filter(Boolean))]
  const gps = [...new Set(helpers.filter(h => (!subDivision || h.subDivision === subDivision) && (!block || h.block === block)).map(h => h.gramPanchayat).filter(Boolean))]

  const totalPatients = activeTab === 'helper'
    ? helperReport.reduce((s, r) => s + r.totalPatients, 0)
    : patients.length
  const totalIncentive = activeTab === 'helper'
    ? helperReport.reduce((s, r) => s + r.totalIncentive, 0)
    : patients.reduce((s, p) => s + p.incentiveAmount, 0)
  const pendingAmount = activeTab === 'helper'
    ? helperReport.reduce((s, r) => s + r.pendingIncentive, 0)
    : patients.filter(p => p.paymentStatus === 'pending').reduce((s, p) => s + p.incentiveAmount, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--green-dark)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Rogmukto Bangla — View Panel</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Sankalpa Bharat Mission · Basirhat Sub-Division</p>
        </div>
        <a href="/login" className="btn btn-secondary btn-sm">Admin Login</a>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div className="toggle-group">
            <button className={`toggle-btn ${activeTab === 'helper' ? 'active' : ''}`} onClick={() => setActiveTab('helper')}>Helper View</button>
            <button className={`toggle-btn ${activeTab === 'patient' ? 'active' : ''}`} onClick={() => setActiveTab('patient')}>Patient View</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Patients</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{totalPatients}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Incentive</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>₹{totalIncentive.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)' }}>₹{pendingAmount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <div className="filter-bar">
            <div className="form-group">
              <label className="form-label">Sub Division</label>
              <select className="form-select" style={{ width: 160 }} value={subDivision} onChange={e => { setSubDivision(e.target.value); setBlock(''); setGramPanchayat('') }}>
                <option value="">All</option>
                {subDivisions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Block</label>
              <select className="form-select" style={{ width: 160 }} value={block} onChange={e => { setBlock(e.target.value); setGramPanchayat('') }}>
                <option value="">All</option>
                {blocks.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gram Panchayat</label>
              <select className="form-select" style={{ width: 160 }} value={gramPanchayat} onChange={e => setGramPanchayat(e.target.value)}>
                <option value="">All</option>
                {gps.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Month</label>
              <input className="form-input" type="month" style={{ width: 160 }} value={month} onChange={e => setMonth(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Swasthya Bondhu Name</label>
              <input className="form-input" style={{ width: 200 }} placeholder="Search name..." value={helperName} onChange={e => setHelperName(e.target.value)} />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setSubDivision(''); setBlock(''); setGramPanchayat(''); setHelperName(''); setMonth(new Date().toISOString().slice(0,7)) }}>
              Reset
            </button>
          </div>
        </div>

        {/* Tables */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : activeTab === 'helper' ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Swasthya Bondhu</th>
                  <th>Phone</th>
                  <th>Sub Division</th>
                  <th>Block</th>
                  <th>Gram Panchayat</th>
                  <th>Tag</th>
                  <th>Patients</th>
                  <th>Total Incentive</th>
                  <th>Pending</th>
                  <th>Cleared</th>
                </tr>
              </thead>
              <tbody>
                {helperReport.length === 0 ? (
                  <tr><td colSpan={10}><div className="empty-state"><p>No data found for selected filters.</p></div></td></tr>
                ) : helperReport.map(row => (
                  <tr key={row.helper._id}>
                    <td style={{ fontWeight: 500 }}>{row.helper.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.helper.phone}</td>
                    <td style={{ fontSize: 12 }}>{row.helper.subDivision}</td>
                    <td style={{ fontSize: 12 }}>{row.helper.block}</td>
                    <td style={{ fontSize: 12 }}>{row.helper.gramPanchayat}</td>
                    <td><span className="badge badge-green">{row.helper.tag}</span></td>
                    <td style={{ fontWeight: 600, textAlign: 'center' }}>{row.totalPatients}</td>
                    <td style={{ fontWeight: 600 }}>₹{row.totalIncentive.toLocaleString()}</td>
                    <td><span className="badge badge-amber">₹{row.pendingIncentive.toLocaleString()}</span></td>
                    <td><span className="badge badge-green">₹{row.clearedIncentive.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
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
                  <tr><td colSpan={8}><div className="empty-state"><p>No patients found for selected filters.</p></div></td></tr>
                ) : patients.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.mobile}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.ipdNo}</td>
                    <td style={{ fontSize: 12 }}>{new Date(p.doa).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.helperId?.name}</div>
                      <span className="badge badge-green" style={{ marginTop: 2 }}>{p.helperId?.tag}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.helperId?.block} / {p.helperId?.gramPanchayat}</td>
                    <td style={{ fontWeight: 600 }}>₹{p.incentiveAmount}</td>
                    <td><span className={`badge ${p.paymentStatus === 'cleared' ? 'badge-green' : 'badge-amber'}`}>{p.paymentStatus === 'cleared' ? '✓ Cleared' : '⏳ Pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
