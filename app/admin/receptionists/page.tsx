'use client'
import { useEffect, useState } from 'react'

interface Receptionist { _id: string; name: string; username: string; createdAt: string }
const EMPTY = { name: '', username: '', password: '' }

export default function ReceptionistsPage() {
  const [list, setList] = useState<Receptionist[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const data = await fetch('/api/receptionists').then(r => r.json())
    setList(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/receptionists', {
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
    if (!confirm('Remove this receptionist?')) return
    await fetch(`/api/receptionists?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <>
      <div className="page-header">
        <h2>Receptionists</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Receptionist</button>
      </div>
      <div className="page-body">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Added On</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><p>No receptionists added yet.</p></div></td></tr>
              ) : list.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4 }}>{r.username}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r._id)}>Remove</button>
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
              <h3>Add Receptionist</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Priya Sen" />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Login username" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Set a password" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Add Receptionist'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
