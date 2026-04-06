'use client'
import { useEffect, useState, useRef } from 'react'
import SearchableSelect from '@/components/SearchableSelect'
import MultiSearchSelect from '@/components/MultiSearchSelect'
import CreatableSearchSelect from '@/components/CreatableSearchSelect'

interface BC { _id: string; coordinatorId: string; name: string; subDivision: string; blocks: string[] }
interface Village { _id: string; name: string }
interface Ward { _id: string; name: string }
interface GP { _id: string; name: string; villages: Village[] }
interface Municipality { _id: string; name: string; wards: Ward[] }
interface Block { _id: string; name: string; gramPanchayats: GP[]; municipalities: Municipality[] }
interface SubDiv { _id: string; name: string; blocks: Block[] }
interface Helper {
  _id: string; helperId: string; name: string; phone: string; subDivision: string; block: string
  gramPanchayats: { gpName: string; villages: string[] }[]
  municipalities: { municipalityName: string; wards: string[] }[]
  tag: string
  blockCoordinatorId: { _id: string; name: string; coordinatorId: string }
}

const EMPTY_FORM = { helperId: "", name: "", phone: "", tag: "Swasthya Bondhu" }

export default function HelpersPage() {
  const [helpers, setHelpers] = useState<Helper[]>([])
  const [bcs, setBcs] = useState<BC[]>([])
  const [locations, setLocations] = useState<SubDiv[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Helper | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedBC, setSelectedBC] = useState<BC | null>(null)
  const [bcSearch, setBcSearch] = useState('')
  const [showBCDrop, setShowBCDrop] = useState(false)
  const [selectedSDId, setSelectedSDId] = useState('')
  const [selectedBlock, setSelectedBlock] = useState('')
  const [locationType, setLocationType] = useState<'gp' | 'municipality' | ''>('')
  const [selectedGP, setSelectedGP] = useState('')
  const [selectedVillages, setSelectedVillages] = useState<string[]>([])
  const [selectedMun, setSelectedMun] = useState('')
  const [selectedWards, setSelectedWards] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    fetch('/api/block-coordinators').then(r => r.json()).then(d => setBcs(Array.isArray(d) ? d : []))
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : []))
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowBCDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function load() {
    const data = await fetch('/api/helpers').then(r => r.json())
    setHelpers(Array.isArray(data) ? data : [])
  }

  const sdData = locations.find(sd => sd._id === selectedSDId)
  const blockData = sdData?.blocks.find(b => b.name === selectedBlock)

  function openAdd() {
    setEditItem(null); setForm(EMPTY_FORM); setSelectedBC(null); setBcSearch('')
    setSelectedSDId(''); setSelectedBlock(''); setLocationType('')
    setSelectedGP(''); setSelectedVillages([]); setSelectedMun(''); setSelectedWards([]); setError(''); setShowModal(true)
  }

  function openEdit(h: Helper) {
    setEditItem(h)
    setForm({ helperId: h.helperId || "", name: h.name, phone: h.phone, tag: h.tag })
    const bc = bcs.find(b => b._id === (h.blockCoordinatorId as any)?._id || b._id === (h.blockCoordinatorId as any))
    setSelectedBC(bc || null)
    setBcSearch(bc?.name || h.blockCoordinatorId?.name || '')
    setSelectedBlock(h.block)
    const lt = h.gramPanchayats.length > 0 ? 'gp' : h.municipalities.length > 0 ? 'municipality' : ''
    setLocationType(lt as any)
    setSelectedGP(h.gramPanchayats[0]?.gpName || '')
    setSelectedVillages(h.gramPanchayats[0]?.villages || [])
    setSelectedMun(h.municipalities[0]?.municipalityName || '')
    setSelectedWards(h.municipalities[0]?.wards || [])
    setError(''); setShowModal(true)
  }

  const filteredBCs = bcs.filter(bc =>
    !bcSearch || bc.name.toLowerCase().includes(bcSearch.toLowerCase()) ||
    bc.coordinatorId.toLowerCase().includes(bcSearch.toLowerCase())
  )

  function selectBC(bc: BC) {
    setSelectedBC(bc); setBcSearch(bc.name); setShowBCDrop(false)
    // Pre-fill SD from BC's location
    const sd = locations.find(s => s.name === bc.subDivision)
    setSelectedSDId(sd?._id || '')
    setSelectedBlock(bc.blocks.length === 1 ? bc.blocks[0] : '')
    setSelectedGP(''); setSelectedVillages([]); setSelectedMun(''); setSelectedWards([])
  }

  async function reloadLocations() {
    const data = await fetch('/api/locations').then(r => r.json())
    setLocations(Array.isArray(data) ? data : [])
  }

  async function createSD(name: string) {
    setCreating(true)
    await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'subdivision', name }) })
    await reloadLocations()
    const data = await fetch('/api/locations').then(r => r.json())
    const sd = Array.isArray(data) ? data.find((s: SubDiv) => s.name === name) : null
    if (sd) { setSelectedSDId(sd._id); setSelectedBlock(''); setSelectedGP(''); setSelectedVillages([]); setSelectedMun(''); setSelectedWards([]) }
    setCreating(false)
  }

  async function createBlock(name: string) {
    if (!selectedSDId) return
    setCreating(true)
    await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'block', name, subDivisionId: selectedSDId }) })
    await reloadLocations()
    setSelectedBlock(name); setSelectedGP(''); setSelectedVillages([]); setSelectedMun(''); setSelectedWards([])
    setCreating(false)
  }

  async function createGP(name: string) {
    if (!selectedSDId || !selectedBlock) return
    setCreating(true)
    const sd = locations.find(s => s._id === selectedSDId)
    const block = sd?.blocks.find(b => b.name === selectedBlock)
    if (block) {
      await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'gp', name, subDivisionId: selectedSDId, blockId: block._id }) })
      await reloadLocations()
      setSelectedGP(name); setSelectedVillages([])
    }
    setCreating(false)
  }

  async function createMun(name: string) {
    if (!selectedSDId || !selectedBlock) return
    setCreating(true)
    const sd = locations.find(s => s._id === selectedSDId)
    const block = sd?.blocks.find(b => b.name === selectedBlock)
    if (block) {
      await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'municipality', name, subDivisionId: selectedSDId, blockId: block._id }) })
      await reloadLocations()
      setSelectedMun(name); setSelectedWards([])
    }
    setCreating(false)
  }

  async function createVillage(gpName: string, villageName: string) {
    setCreating(true)
    const sd = locations.find(s => s._id === selectedSDId)
    const block = sd?.blocks.find(b => b.name === selectedBlock)
    const gp = block?.gramPanchayats.find(g => g.name === gpName)
    if (gp && block) {
      await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'village', name: villageName, subDivisionId: selectedSDId, blockId: block._id, gpId: gp._id }) })
      await reloadLocations()
      setSelectedVillages(prev => [...prev, villageName])
    }
    setCreating(false)
  }

  async function createWard(munName: string, wardName: string) {
    setCreating(true)
    const sd = locations.find(s => s._id === selectedSDId)
    const block = sd?.blocks.find(b => b.name === selectedBlock)
    const mun = block?.municipalities.find(m => m.name === munName)
    if (mun && block) {
      await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'ward', name: wardName, subDivisionId: selectedSDId, blockId: block._id, munId: mun._id }) })
      await reloadLocations()
      setSelectedWards(prev => [...prev, wardName])
    }
    setCreating(false)
  }

  // GP multi-select helpers


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBC) { setError('Select a Block Coordinator'); return }
    if (!selectedBlock) { setError('Select a Block'); return }
    if (!locationType) { setError('Select GP or Municipality'); return }
    if (locationType === 'gp' && !selectedGP) { setError('Select a Gram Panchayat'); return }
    if (locationType === 'municipality' && !selectedMun) { setError('Select a Municipality'); return }
    setLoading(true); setError('')
    try {
      const body = {
        ...form,
        blockCoordinatorId: selectedBC._id,
        subDivision: sdData?.name || selectedBC.subDivision,
        block: selectedBlock,
        gramPanchayats: locationType === 'gp' ? [{ gpName: selectedGP, villages: selectedVillages }] : [],
        municipalities: locationType === 'municipality' ? [{ municipalityName: selectedMun, wards: selectedWards }] : [],
      }
      const url = editItem ? `/api/helpers?id=${editItem._id}` : '/api/helpers'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return }
      setShowModal(false); load()
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
    h.block?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <h2>Swasthya Bondhu</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Helper</button>
      </div>
      <div className="page-body">
        <div style={{ marginBottom: 16 }}>
          <input className="form-input" style={{ maxWidth: 300 }} placeholder="Search by name, block..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Block Coordinator</th><th>Sub Division</th><th>Block</th><th>GP / Municipality</th><th>Tag</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><p>No Swasthya Bondhu found.</p></div></td></tr>
              ) : filtered.map(h => (
                <tr key={h._id}>
                  <td style={{ fontWeight: 500 }}>{h.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{h.phone}</td>
                  <td style={{ fontSize: 12 }}>{h.blockCoordinatorId?.name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{h.subDivision}</td>
                  <td style={{ fontSize: 12 }}>{h.block}</td>
                  <td style={{ fontSize: 11 }}>
                    {h.gramPanchayats?.map(g => <div key={g.gpName}>🌿 {g.gpName}{g.villages.length > 0 ? ` (${g.villages.length})` : ''}</div>)}
                    {h.municipalities?.map(m => <div key={m.municipalityName}>🏙 {m.municipalityName}{m.wards.length > 0 ? ` (${m.wards.length})` : ''}</div>)}
                  </td>
                  <td><span className="badge badge-green">{h.tag}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(h)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(h._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit Swasthya Bondhu' : 'Add Swasthya Bondhu'}</h3>
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
                    <input className="form-input" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="10-digit" />
                  </div>
                </div>

                {/* Block Coordinator search */}
                <div className="form-group" ref={dropRef} style={{ position: 'relative' }}>
                  <label className="form-label">Block Coordinator *</label>
                  <input className="form-input" placeholder="🔍 Search by name or ID..."
                    value={bcSearch} autoComplete="off"
                    onFocus={() => setShowBCDrop(true)}
                    onChange={e => { setBcSearch(e.target.value); setSelectedBC(null); setShowBCDrop(true); setSelectedBlock('') }} />
                  {!selectedBC && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>💡 SubDivision & Block auto-fill after selection</div>}
                  {showBCDrop && !selectedBC && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', boxShadow: 'var(--shadow-md)', maxHeight: 200, overflowY: 'auto' }}>
                      {filteredBCs.length === 0
                        ? <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>No coordinators found</div>
                        : filteredBCs.map(bc => (
                          <div key={bc._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                            onClick={() => selectBC(bc)}>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{bc.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {bc.coordinatorId} · {bc.subDivision} · {bc.blocks.join(', ')}</div>
                          </div>
                        ))}
                    </div>
                  )}
                  {selectedBC && (
                    <div style={{ marginTop: 6, padding: '7px 10px', background: 'var(--green-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--green-dark)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>✓ <strong>{selectedBC.name}</strong> · {selectedBC.subDivision}</span>
                      <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green-dark)' }}
                        onClick={() => { setSelectedBC(null); setBcSearch(''); setSelectedBlock(''); setShowBCDrop(true) }}>✕</button>
                    </div>
                  )}
                </div>

                {selectedBC && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Sub Division *</label>
                      <CreatableSearchSelect
                        options={locations.map(sd => ({ label: sd.name, value: sd._id }))}
                        value={sdData?._id || ''}
                        onChange={v => { setSelectedSDId(v); setSelectedBlock(''); setSelectedGP(''); setSelectedVillages([]); setSelectedMun(''); setSelectedWards([]) }}
                        onCreateOption={createSD}
                        creating={creating}
                        placeholder="Search or add new..."
                      />
                      {sdData?.name && sdData.name !== selectedBC.subDivision && (
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>⚠ Different from BC ({selectedBC.subDivision})</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Block *</label>
                      <CreatableSearchSelect
                        options={sdData?.blocks.map(b => ({ label: b.name, value: b.name })) || []}
                        value={selectedBlock}
                        onChange={v => { setSelectedBlock(v); setSelectedGP(''); setSelectedVillages([]); setSelectedMun(''); setSelectedWards([]) }}
                        onCreateOption={selectedSDId ? createBlock : undefined}
                        creating={creating}
                        placeholder={sdData ? 'Search or add new...' : 'Select Sub Division first'}
                        disabled={!sdData}
                      />
                    </div>
                  </div>
                )}

                {selectedBC && selectedBlock && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Location Type *</label>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        {[{ key: 'gp', label: '🌿 Gram Panchayat' }, { key: 'municipality', label: '🏙 Municipality' }].map(item => (
                          <label key={item.key} onClick={() => { setLocationType(item.key === locationType ? '' : item.key as any); setSelectedGP(''); setSelectedVillages([]); setSelectedMun(''); setSelectedWards([]) }} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                            border: `2px solid ${locationType === item.key ? 'var(--green-mid)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-sm)',
                            background: locationType === item.key ? 'var(--green-light)' : 'var(--surface)',
                            cursor: 'pointer', fontSize: 13, userSelect: 'none',
                          }}>
                            {locationType === item.key ? '✓ ' : ''}{item.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {locationType === 'gp' && blockData && (
                      <div className="form-group">
                        <CreatableSearchSelect label="Gram Panchayat *"
                          options={blockData.gramPanchayats.map(g => ({ label: g.name, value: g.name }))}
                          value={selectedGP}
                          onChange={v => { setSelectedGP(v); setSelectedVillages([]) }}
                          onCreateOption={createGP} creating={creating}
                          placeholder="Search or add Gram Panchayat..." />
                        {selectedGP && (
                          <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '3px solid var(--green-light)' }}>
                            <label className="form-label" style={{ marginBottom: 6 }}>🌿 {selectedGP} — Villages</label>
                            <CreatableSearchSelect
                              options={(blockData.gramPanchayats.find(g => g.name === selectedGP)?.villages || []).map(v => ({ label: v.name, value: v.name })).filter(v => !selectedVillages.includes(v.value))}
                              value=""
                              onChange={v => { if (v && !selectedVillages.includes(v)) setSelectedVillages(prev => [...prev, v]) }}
                              onCreateOption={(vName) => createVillage(selectedGP, vName)} creating={creating}
                              placeholder="Search or add village..." />
                            {selectedVillages.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                                {selectedVillages.map(v => (
                                  <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 11 }}>
                                    🏘 {v} <span onClick={() => setSelectedVillages(prev => prev.filter(vv => vv !== v))} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 10 }}>✕</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {locationType === 'municipality' && blockData && (
                      <div className="form-group">
                        <CreatableSearchSelect label="Municipality *"
                          options={blockData.municipalities.map(m => ({ label: m.name, value: m.name }))}
                          value={selectedMun}
                          onChange={v => { setSelectedMun(v); setSelectedWards([]) }}
                          onCreateOption={createMun} creating={creating}
                          placeholder="Search or add Municipality..." />
                        {selectedMun && (
                          <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '3px solid #d0d8ff' }}>
                            <label className="form-label" style={{ marginBottom: 6 }}>🏙 {selectedMun} — Wards</label>
                            <CreatableSearchSelect
                              options={(blockData.municipalities.find(m => m.name === selectedMun)?.wards || []).map(w => ({ label: w.name, value: w.name })).filter(w => !selectedWards.includes(w.value))}
                              value=""
                              onChange={v => { if (v && !selectedWards.includes(v)) setSelectedWards(prev => [...prev, v]) }}
                              onCreateOption={(wName) => createWard(selectedMun, wName)} creating={creating}
                              placeholder="Search or add ward..." />
                            {selectedWards.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                                {selectedWards.map(w => (
                                  <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 11 }}>
                                    🔢 {w} <span onClick={() => setSelectedWards(prev => prev.filter(ww => ww !== w))} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 10 }}>✕</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="form-group">
                <div className="form-group">
                  <label className="form-label">Helper ID <span style={{ fontWeight: 400, fontSize: 11, color: "var(--text-muted)" }}>(optional)</span></label>
                  <input className="form-input" value={form.helperId} onChange={e => setForm({...form, helperId: e.target.value})} placeholder="e.g. SB-001" />
                </div>
                  <label className="form-label">Tag</label>
                  <SearchableSelect
                    options={[{ label: 'Swasthya Bondhu', value: 'Swasthya Bondhu' }]}
                    value={form.tag}
                    onChange={v => setForm({...form, tag: v})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading || !selectedBC || !selectedBlock}>
                  {loading ? 'Saving...' : editItem ? 'Update Helper' : 'Add Helper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
