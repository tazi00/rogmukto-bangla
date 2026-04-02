'use client'
import { useEffect, useState } from 'react'

interface GP { _id: string; name: string }
interface Block { _id: string; name: string; gramPanchayats: GP[] }
interface SubDiv { _id: string; name: string; blocks: Block[] }

export default function SettingsPage() {
  const [amount, setAmount] = useState('')
  const [amountSaved, setAmountSaved] = useState(false)
  const [savingAmount, setSavingAmount] = useState(false)
  const [locations, setLocations] = useState<SubDiv[]>([])
  const [expandedSD, setExpandedSD] = useState<string | null>(null)
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ type: string; subDivisionId?: string; blockId?: string } | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [locError, setLocError] = useState('')
  const [locLoading, setLocLoading] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setAmount(String(d.defaultIncentiveAmount || 200)))
    loadLocations()
  }, [])

  async function loadLocations() {
    const data = await fetch('/api/locations').then(r => r.json())
    setLocations(Array.isArray(data) ? data : [])
  }

  async function saveAmount(e: React.FormEvent) {
    e.preventDefault(); setSavingAmount(true)
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultIncentiveAmount: Number(amount) }) })
    setSavingAmount(false); setAmountSaved(true)
    setTimeout(() => setAmountSaved(false), 2500)
  }

  async function handleAdd() {
    if (!inputVal.trim()) return
    setLocLoading(true); setLocError('')
    const res = await fetch('/api/locations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: adding!.type, name: inputVal.trim(), subDivisionId: adding!.subDivisionId, blockId: adding!.blockId }),
    })
    const data = await res.json()
    if (!res.ok) { setLocError(data.error || 'Failed'); setLocLoading(false); return }
    setAdding(null); setInputVal(''); setLocError(''); setLocLoading(false)
    loadLocations()
  }

  async function handleDelete(type: string, subDivisionId: string, blockId?: string, gpId?: string) {
    const labels: Record<string, string> = { subdivision: 'SubDivision and all its blocks/GPs', block: 'Block and all its GPs', gp: 'Gram Panchayat' }
    if (!confirm(`Delete this ${labels[type]}?`)) return
    await fetch('/api/locations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, subDivisionId, blockId, gpId }) })
    loadLocations()
  }

  function startAdding(type: string, subDivisionId?: string, blockId?: string) {
    setAdding({ type, subDivisionId, blockId }); setInputVal(''); setLocError('')
  }

  const addPlaceholder: Record<string, string> = {
    subdivision: 'e.g. Basirhat',
    block: 'e.g. Baduria',
    gp: 'e.g. Aturia',
  }

  return (
    <>
      <div className="page-header"><h2>Settings</h2></div>
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Incentive amount */}
        <div className="card" style={{ maxWidth: 480, padding: '24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Default Incentive Amount</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Default ₹ amount per patient. Receptionist can override per patient.
          </p>
          {amountSaved && <div className="alert alert-success" style={{ marginBottom: 14 }}>✓ Saved!</div>}
          <form onSubmit={saveAmount} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Amount per Patient (₹)</label>
              <input className="form-input" type="number" min="0" required value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingAmount} style={{ marginBottom: 1 }}>
              {savingAmount ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>

        {/* Location Manager */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Location Hierarchy</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Manage Sub Divisions → Blocks → Gram Panchayats
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => startAdding('subdivision')}>+ Add Sub Division</button>
          </div>

          {/* Add SubDivision inline */}
          {adding?.type === 'subdivision' && (
            <AddInline
              placeholder={addPlaceholder.subdivision}
              value={inputVal} onChange={setInputVal}
              onAdd={handleAdd} onCancel={() => setAdding(null)}
              error={locError} loading={locLoading}
              label="New Sub Division"
            />
          )}

          {locations.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <p>No locations added yet. Start by adding a Sub Division.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {locations.map(sd => (
                <div key={sd._id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {/* SubDivision row */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: 'var(--green-light)', gap: 10 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--green-dark)', padding: 0, marginRight: 2 }}
                      onClick={() => setExpandedSD(expandedSD === sd._id ? null : sd._id)}>
                      {expandedSD === sd._id ? '▾' : '▸'}
                    </button>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--green-dark)', flex: 1 }}>🏛 {sd.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--green)', marginRight: 8 }}>{sd.blocks.length} block{sd.blocks.length !== 1 ? 's' : ''}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setExpandedSD(sd._id); startAdding('block', sd._id) }}>+ Block</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete('subdivision', sd._id)}>✕</button>
                  </div>

                  {/* Blocks */}
                  {expandedSD === sd._id && (
                    <div style={{ padding: '8px 14px 12px 32px', background: 'var(--surface)' }}>
                      {/* Add block inline */}
                      {adding?.type === 'block' && adding.subDivisionId === sd._id && (
                        <AddInline
                          placeholder={addPlaceholder.block}
                          value={inputVal} onChange={setInputVal}
                          onAdd={handleAdd} onCancel={() => setAdding(null)}
                          error={locError} loading={locLoading}
                          label="New Block"
                        />
                      )}

                      {sd.blocks.length === 0 && adding?.subDivisionId !== sd._id && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No blocks yet. Add one above.</p>
                      )}

                      {sd.blocks.map(block => (
                        <div key={block._id} style={{ marginBottom: 8 }}>
                          {/* Block row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 0 }}
                              onClick={() => setExpandedBlock(expandedBlock === block._id ? null : block._id)}>
                              {expandedBlock === block._id ? '▾' : '▸'}
                            </button>
                            <span style={{ fontWeight: 500, fontSize: 13, flex: 1 }}>📍 {block.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 6 }}>{block.gramPanchayats.length} GP{block.gramPanchayats.length !== 1 ? 's' : ''}</span>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setExpandedBlock(block._id); startAdding('gp', sd._id, block._id) }}>+ GP</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete('block', sd._id, block._id)}>✕</button>
                          </div>

                          {/* GPs */}
                          {expandedBlock === block._id && (
                            <div style={{ paddingLeft: 20, paddingTop: 6 }}>
                              {/* Add GP inline */}
                              {adding?.type === 'gp' && adding.blockId === block._id && (
                                <AddInline
                                  placeholder={addPlaceholder.gp}
                                  value={inputVal} onChange={setInputVal}
                                  onAdd={handleAdd} onCancel={() => setAdding(null)}
                                  error={locError} loading={locLoading}
                                  label="New Gram Panchayat"
                                />
                              )}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {block.gramPanchayats.map(gp => (
                                  <div key={gp._id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12 }}>
                                    <span>🌿 {gp.name}</span>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--red)', padding: 0, lineHeight: 1 }}
                                      onClick={() => handleDelete('gp', sd._id, block._id, gp._id)}>✕</button>
                                  </div>
                                ))}
                                {block.gramPanchayats.length === 0 && adding?.blockId !== block._id && (
                                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No GPs yet.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function AddInline({ placeholder, value, onChange, onAdd, onCancel, error, loading, label }: any) {
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); onAdd() }
    if (e.key === 'Escape') onCancel()
  }
  return (
    <div style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--accent-light)', border: '1px solid #f0c050', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#7a5200', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 6 }}>⚠ {error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="form-input"
          autoFocus
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" onClick={onAdd} disabled={loading || !value.trim()}>
          {loading ? '...' : 'Add'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
