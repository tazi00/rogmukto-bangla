'use client'
import { useEffect, useState } from 'react'

interface Helper {
  _id: string
  name: string
  phone: string
  subDivision: string
  block: string
  gramPanchayat: string
  village: string
  tag: string
}

const EMPTY = { name: '', phone: '', subDivision: '', block: '', gramPanchayat: '', village: '', tag: 'Swasthya Bondhu' }

export default function HelpersPage() {
  const [helpers, setHelpers] = useState<Helper[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    const data = await fetch('/api/helpers').then(r => r.json())
    setHelpers(data)
  }
  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/helpers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      setShowModal(false); setForm(EMPTY); load()
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this Swasthya Bondhu?')) return
    await fetch(`/api/helpers?id=${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = helpers.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.block.toLowerCase().includes(search.toLowerCase()) ||
    h.gramPanchayat.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <h2>Swasthya Bondhu</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Helper</button>
      </div>
      <div className="page-body">
        <div style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            style={{ maxWidth: 300 }}
            placeholder="Search by name, block, GP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Sub Division</th>
                <th>Block</th>
                <th>Gram Panchayat</th>
                <th>Village</th>
                <th>Tag</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><p>No helpers found. Add one to get started.</p></div></td></tr>
              ) : filtered.map(h => (
                <tr key={h._id}>
                  <td style={{ fontWeight: 500 }}>{h.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{h.phone}</td>
                  <td>{h.subDivision}</td>
                  <td>{h.block}</td>
                  <td>{h.gramPanchayat}</td>
                  <td>{h.village || '—'}</td>
                  <td><span className="badge badge-green">{h.tag}</span></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(h._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Add Swasthya Bondhu</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Ramu Das" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input className="form-input" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="10-digit number" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sub Division *</label>
                    <input className="form-input" required value={form.subDivision} onChange={e => setForm({...form, subDivision: e.target.value})} placeholder="e.g. Basirhat" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Block *</label>
                    <input className="form-input" required value={form.block} onChange={e => setForm({...form, block: e.target.value})} placeholder="e.g. Baduria" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gram Panchayat *</label>
                    <input className="form-input" required value={form.gramPanchayat} onChange={e => setForm({...form, gramPanchayat: e.target.value})} placeholder="e.g. Aturia" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Village</label>
                    <input className="form-input" value={form.village} onChange={e => setForm({...form, village: e.target.value})} placeholder="Village name" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tag</label>
                  <select className="form-select" value={form.tag} onChange={e => setForm({...form, tag: e.target.value})}>
                    <option>Swasthya Bondhu</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Helper'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
