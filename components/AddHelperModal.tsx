'use client'
import { useEffect, useState, useRef } from 'react'
import SearchableSelect from './SearchableSelect'
import MultiSearchSelect from './MultiSearchSelect'

interface BC { _id: string; coordinatorId: string; name: string; subDivision: string; blocks: string[] }
interface Village { _id: string; name: string }
interface Ward { _id: string; name: string }
interface GP { _id: string; name: string; villages: Village[] }
interface Municipality { _id: string; name: string; wards: Ward[] }
interface Block { _id: string; name: string; gramPanchayats: GP[]; municipalities: Municipality[] }
interface SubDiv { _id: string; name: string; blocks: Block[] }

interface Props { onClose: () => void; onSave: () => void }

export default function AddHelperModal({ onClose, onSave }: Props) {
  const [bcs, setBcs] = useState<BC[]>([])
  const [locations, setLocations] = useState<SubDiv[]>([])
  const [form, setForm] = useState({ helperId: '', name: '', phone: '', tag: 'Swasthya Bondhu' })
  const [selectedBC, setSelectedBC] = useState<BC | null>(null)
  const [bcSearch, setBcSearch] = useState('')
  const [showBCDrop, setShowBCDrop] = useState(false)
  const [selectedSDId, setSelectedSDId] = useState('')
  const [selectedBlock, setSelectedBlock] = useState('')
  const [useGP, setUseGP] = useState(false)
  const [useMun, setUseMun] = useState(false)
  const [selectedGPs, setSelectedGPs] = useState<{ gpName: string; villages: string[] }[]>([])
  const [selectedMuns, setSelectedMuns] = useState<{ municipalityName: string; wards: string[] }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/block-coordinators').then(r => r.json()).then(d => setBcs(Array.isArray(d) ? d : []))
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : []))
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowBCDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredBCs = bcs.filter(bc =>
    !bcSearch || bc.name.toLowerCase().includes(bcSearch.toLowerCase()) ||
    bc.coordinatorId.toLowerCase().includes(bcSearch.toLowerCase())
  )

  const selectedSD = locations.find(sd => sd._id === selectedSDId)
  const blockData = selectedSD?.blocks.find(b => b.name === selectedBlock)

  const sdOptions = locations.map(sd => ({ label: sd.name, value: sd._id }))
  const blockOptions = selectedSD?.blocks.map(b => ({ label: b.name, value: b.name })) || []

  function selectBC(bc: BC) {
    setSelectedBC(bc); setBcSearch(bc.name); setShowBCDrop(false)
    // Pre-fill SubDivision from BC — find the SD
    const sd = locations.find(s => s.name === bc.subDivision)
    setSelectedSDId(sd?._id || '')
    // Pre-fill block if BC has only one
    setSelectedBlock(bc.blocks.length === 1 ? bc.blocks[0] : '')
    setSelectedGPs([]); setSelectedMuns([])
  }

  function changeSD(sdId: string) {
    setSelectedSDId(sdId)
    setSelectedBlock('')
    setSelectedGPs([]); setSelectedMuns([])
  }

  function setGPVillages(gpName: string, villages: string[]) {
    setSelectedGPs(prev => prev.map(g => g.gpName === gpName ? { ...g, villages } : g))
  }
  function toggleGPSelected(gpNames: string[]) {
    setSelectedGPs(prev => {
      const kept = prev.filter(g => gpNames.includes(g.gpName))
      const added = gpNames.filter(n => !prev.find(g => g.gpName === n)).map(n => ({ gpName: n, villages: [] }))
      return [...kept, ...added]
    })
  }
  function setMunWards(munName: string, wards: string[]) {
    setSelectedMuns(prev => prev.map(m => m.municipalityName === munName ? { ...m, wards } : m))
  }
  function toggleMunSelected(munNames: string[]) {
    setSelectedMuns(prev => {
      const kept = prev.filter(m => munNames.includes(m.municipalityName))
      const added = munNames.filter(n => !prev.find(m => m.municipalityName === n)).map(n => ({ municipalityName: n, wards: [] }))
      return [...kept, ...added]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBC) { setError('Select a Block Coordinator'); return }
    if (!selectedSDId) { setError('Select a Sub Division'); return }
    if (!selectedBlock) { setError('Select a Block'); return }
    if (!useGP && !useMun) { setError('Select at least GP or Municipality'); return }
    setLoading(true); setError('')
    try {
      const body = {
        ...form,
        blockCoordinatorId: selectedBC._id,
        subDivision: selectedSD?.name || '',
        block: selectedBlock,
        gramPanchayats: useGP ? selectedGPs : [],
        municipalities: useMun ? selectedMuns : [],
      }
      const res = await fetch('/api/helpers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return }
      onSave(); onClose()
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  const checkStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    border: `2px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    background: active ? 'var(--green-light)' : 'var(--surface)',
    cursor: 'pointer', fontSize: 13, userSelect: 'none',
  })

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header">
          <h3>Add Swasthya Bondhu</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label className="form-label">
                  Swasthya Bondhu ID{" "}
                  <span
                    style={{
                      fontWeight: 400,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    (optional)
                  </span>
                </label>
                <input
                  className="form-input"
                  value={form.helperId}
                  onChange={(e) =>
                    setForm({ ...form, helperId: e.target.value })
                  }
                  placeholder="e.g. SB-001"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Phone *</label>
                <input
                  className="form-input"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit"
                />
              </div>
            </div>

            {/* Block Coordinator search */}
            <div
              className="form-group"
              ref={dropRef}
              style={{ position: "relative" }}
            >
              <label className="form-label">Block Coordinator *</label>
              <input
                className="form-input"
                placeholder="🔍 Search by name or ID..."
                value={bcSearch}
                autoComplete="off"
                onFocus={() => setShowBCDrop(true)}
                onChange={(e) => {
                  setBcSearch(e.target.value);
                  setSelectedBC(null);
                  setShowBCDrop(true);
                  setSelectedSDId("");
                  setSelectedBlock("");
                }}
              />
              {!selectedBC && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  💡 SubDivision & Block will pre-fill but can be changed
                </div>
              )}
              {showBCDrop && !selectedBC && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 300,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface)",
                    boxShadow: "var(--shadow-md)",
                    maxHeight: 180,
                    overflowY: "auto",
                  }}
                >
                  {filteredBCs.length === 0 ? (
                    <div
                      style={{
                        padding: "12px 14px",
                        color: "var(--text-muted)",
                        fontSize: 13,
                      }}
                    >
                      No coordinators found
                    </div>
                  ) : (
                    filteredBCs.map((bc) => (
                      <div
                        key={bc._id}
                        style={{
                          padding: "9px 14px",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--gray-100)",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "var(--gray-50)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "")
                        }
                        onClick={() => selectBC(bc)}
                      >
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {bc.name}
                        </div>
                        <div
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          ID: {bc.coordinatorId} · {bc.subDivision} ·{" "}
                          {bc.blocks.join(", ")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {selectedBC && (
                <div
                  style={{
                    marginTop: 6,
                    padding: "7px 10px",
                    background: "var(--green-light)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                    color: "var(--green-dark)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    ✓ <strong>{selectedBC.name}</strong> (
                    {selectedBC.coordinatorId})
                  </span>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--green-dark)",
                    }}
                    onClick={() => {
                      setSelectedBC(null);
                      setBcSearch("");
                      setSelectedSDId("");
                      setSelectedBlock("");
                      setShowBCDrop(true);
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Sub Division + Block — editable even after BC select */}
            {selectedBC && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div className="form-group">
                  <label className="form-label">Sub Division *</label>
                  <SearchableSelect
                    options={sdOptions}
                    value={selectedSDId}
                    onChange={changeSD}
                    placeholder="Select Sub Division"
                  />
                  {selectedSD?.name !== selectedBC.subDivision &&
                    selectedSDId && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--accent)",
                          marginTop: 3,
                        }}
                      >
                        ⚠ Different from BC's sub division (
                        {selectedBC.subDivision})
                      </div>
                    )}
                </div>
                <div className="form-group">
                  <label className="form-label">Block *</label>
                  <SearchableSelect
                    options={blockOptions}
                    value={selectedBlock}
                    onChange={(v) => {
                      setSelectedBlock(v);
                      setSelectedGPs([]);
                      setSelectedMuns([]);
                    }}
                    placeholder={
                      selectedSDId
                        ? "Select Block"
                        : "Select Sub Division first"
                    }
                    disabled={!selectedSDId}
                  />
                </div>
              </div>
            )}

            {/* GP / Municipality */}
            {selectedBC && selectedSDId && selectedBlock && (
              <>
                <div className="form-group">
                  <label className="form-label">Location Type *</label>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <label
                      style={checkStyle(useGP)}
                      onClick={() => {
                        setUseGP(!useGP);
                        setSelectedGPs([]);
                      }}
                    >
                      {useGP ? "✓ " : ""}🌿 Gram Panchayat
                    </label>
                    <label
                      style={checkStyle(useMun)}
                      onClick={() => {
                        setUseMun(!useMun);
                        setSelectedMuns([]);
                      }}
                    >
                      {useMun ? "✓ " : ""}🏙 Municipality
                    </label>
                  </div>
                </div>

                {useGP && blockData && (
                  <div className="form-group">
                    <MultiSearchSelect
                      label="Gram Panchayat(s) *"
                      options={blockData.gramPanchayats.map((g) => ({
                        label: g.name,
                        value: g.name,
                      }))}
                      values={selectedGPs.map((g) => g.gpName)}
                      onChange={toggleGPSelected}
                      placeholder="Select Gram Panchayats..."
                    />
                    {selectedGPs.map((selGP) => {
                      const gpObj = blockData.gramPanchayats.find(
                        (g) => g.name === selGP.gpName,
                      );
                      if (!gpObj || gpObj.villages.length === 0) return null;
                      return (
                        <div
                          key={selGP.gpName}
                          style={{
                            marginTop: 8,
                            paddingLeft: 12,
                            borderLeft: "3px solid var(--green-light)",
                          }}
                        >
                          <MultiSearchSelect
                            label={`🌿 ${selGP.gpName} — Villages`}
                            options={gpObj.villages.map((v) => ({
                              label: v.name,
                              value: v.name,
                            }))}
                            values={selGP.villages}
                            onChange={(v) => setGPVillages(selGP.gpName, v)}
                            placeholder="Select villages..."
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {useMun && blockData && (
                  <div className="form-group">
                    <MultiSearchSelect
                      label="Municipality(s) *"
                      options={blockData.municipalities.map((m) => ({
                        label: m.name,
                        value: m.name,
                      }))}
                      values={selectedMuns.map((m) => m.municipalityName)}
                      onChange={toggleMunSelected}
                      placeholder="Select Municipalities..."
                    />
                    {selectedMuns.map((selMun) => {
                      const munObj = blockData.municipalities.find(
                        (m) => m.name === selMun.municipalityName,
                      );
                      if (!munObj || munObj.wards.length === 0) return null;
                      return (
                        <div
                          key={selMun.municipalityName}
                          style={{
                            marginTop: 8,
                            paddingLeft: 12,
                            borderLeft: "3px solid #d0d8ff",
                          }}
                        >
                          <MultiSearchSelect
                            label={`🏙 ${selMun.municipalityName} — Wards`}
                            options={munObj.wards.map((w) => ({
                              label: w.name,
                              value: w.name,
                            }))}
                            values={selMun.wards}
                            onChange={(w) =>
                              setMunWards(selMun.municipalityName, w)
                            }
                            placeholder="Select wards..."
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                loading || !selectedBC || !selectedSDId || !selectedBlock
              }
            >
              {loading ? "Saving..." : "Add Swasthya Bondhu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
