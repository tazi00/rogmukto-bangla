'use client'
import { useEffect, useState } from 'react'
import SearchableSelect from './SearchableSelect'

interface Village { _id: string; name: string }
interface Ward { _id: string; name: string }
interface GP { _id: string; name: string; villages: Village[] }
interface Municipality { _id: string; name: string; wards: Ward[] }
interface Block { _id: string; name: string; gramPanchayats: GP[]; municipalities: Municipality[] }
interface SubDiv { _id: string; name: string; blocks: Block[] }

export interface AddressValue {
  type: 'gp' | 'municipality' | ''
  subDivision: string
  subDivisionId: string
  block: string
  blockId: string
  gramPanchayat: string
  village: string
  municipality: string
  ward: string
}

export const EMPTY_ADDRESS: AddressValue = {
  type: '', subDivision: '', subDivisionId: '',
  block: '', blockId: '', gramPanchayat: '',
  village: '', municipality: '', ward: '',
}

interface Props {
  value: AddressValue
  onChange: (val: AddressValue) => void
}

export default function PatientAddressSelect({ value, onChange }: Props) {
  const [locations, setLocations] = useState<SubDiv[]>([])

  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : []))
  }, [])

  const selectedSD = locations.find(sd => sd._id === value.subDivisionId)
  const selectedBlock = selectedSD?.blocks.find(b => b._id === value.blockId)

  function selectSD(sdId: string) {
    const sd = locations.find(s => s._id === sdId)
    onChange({ ...EMPTY_ADDRESS, type: value.type, subDivision: sd?.name || '', subDivisionId: sdId })
  }
  function selectBlock(blockId: string) {
    const block = selectedSD?.blocks.find(b => b._id === blockId)
    onChange({ ...value, block: block?.name || '', blockId, gramPanchayat: '', village: '', municipality: '', ward: '' })
  }

  const radioStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
    border: `2px solid ${active ? 'var(--green-mid)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    background: active ? 'var(--green-light)' : 'var(--surface)',
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400,
    color: active ? 'var(--green-dark)' : 'var(--text-muted)',
    userSelect: 'none',
  })

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, background: 'var(--gray-50)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
        Patient Address
      </div>

      {/* Type radio */}
      <div className="form-group">
        <label className="form-label">Address Type</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <label style={radioStyle(value.type === 'gp')}
            onClick={() => onChange({ ...EMPTY_ADDRESS, type: 'gp' })}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${value.type === 'gp' ? 'var(--green-mid)' : 'var(--border)'}`, background: value.type === 'gp' ? 'var(--green-mid)' : 'transparent', display: 'inline-block', flexShrink: 0 }} />
            🌿 Gram Panchayat
          </label>
          <label style={radioStyle(value.type === 'municipality')}
            onClick={() => onChange({ ...EMPTY_ADDRESS, type: 'municipality' })}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${value.type === 'municipality' ? 'var(--green-mid)' : 'var(--border)'}`, background: value.type === 'municipality' ? 'var(--green-mid)' : 'transparent', display: 'inline-block', flexShrink: 0 }} />
            🏙 Municipality
          </label>
        </div>
      </div>

      {value.type && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {/* Sub Division */}
          <div className="form-group">
            <label className="form-label">Sub Division</label>
            <SearchableSelect
              options={locations.map(sd => ({ label: sd.name, value: sd._id }))}
              value={value.subDivisionId}
              onChange={selectSD}
              placeholder="Select Sub Division"
            />
          </div>

          {/* Block */}
          {value.subDivisionId && (
            <div className="form-group">
              <label className="form-label">Block</label>
              <SearchableSelect
                options={selectedSD?.blocks.map(b => ({ label: b.name, value: b._id })) || []}
                value={value.blockId}
                onChange={selectBlock}
                placeholder="Select Block"
              />
            </div>
          )}

          {/* GP path */}
          {value.type === 'gp' && value.blockId && (
            <>
              <div className="form-group">
                <label className="form-label">Gram Panchayat</label>
                <SearchableSelect
                  options={selectedBlock?.gramPanchayats.map(g => ({ label: g.name, value: g.name })) || []}
                  value={value.gramPanchayat}
                  onChange={gp => onChange({ ...value, gramPanchayat: gp, village: '' })}
                  placeholder="Select Gram Panchayat"
                />
              </div>
              {value.gramPanchayat && (
                <div className="form-group">
                  <label className="form-label">Village</label>
                  <SearchableSelect
                    options={selectedBlock?.gramPanchayats.find(g => g.name === value.gramPanchayat)?.villages.map(v => ({ label: v.name, value: v.name })) || []}
                    value={value.village}
                    onChange={village => onChange({ ...value, village })}
                    placeholder="Select Village"
                  />
                </div>
              )}
            </>
          )}

          {/* Municipality path */}
          {value.type === 'municipality' && value.blockId && (
            <>
              <div className="form-group">
                <label className="form-label">Municipality</label>
                <SearchableSelect
                  options={selectedBlock?.municipalities.map(m => ({ label: m.name, value: m.name })) || []}
                  value={value.municipality}
                  onChange={mun => onChange({ ...value, municipality: mun, ward: '' })}
                  placeholder="Select Municipality"
                />
              </div>
              {value.municipality && (
                <div className="form-group">
                  <label className="form-label">Ward</label>
                  <SearchableSelect
                    options={selectedBlock?.municipalities.find(m => m.name === value.municipality)?.wards.map(w => ({ label: w.name, value: w.name })) || []}
                    value={value.ward}
                    onChange={ward => onChange({ ...value, ward })}
                    placeholder="Select Ward"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
