'use client'
import { useEffect, useState } from 'react'

interface GP { _id: string; name: string }
interface Block { _id: string; name: string; gramPanchayats: GP[] }
interface SubDiv { _id: string; name: string; blocks: Block[] }

export interface LocationValue {
  subDivision: string
  subDivisionId: string
  block: string
  blockId: string
  gramPanchayat: string
  gramPanchayatId: string
}

export const EMPTY_VAL: LocationValue = {
  subDivision: '', subDivisionId: '',
  block: '', blockId: '',
  gramPanchayat: '', gramPanchayatId: '',
}

interface Props {
  value: LocationValue
  onChange: (val: LocationValue) => void
  disabled?: boolean
}

export default function CascadeLocationSelect({ value, onChange, disabled }: Props) {
  const [locations, setLocations] = useState<SubDiv[]>([])

  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : []))
  }, [])

  const selectedSD = locations.find(sd => sd._id === value.subDivisionId)
  const selectedBlock = selectedSD?.blocks.find(b => b._id === value.blockId)

  function selectSD(sdId: string) {
    const sd = locations.find(s => s._id === sdId)
    if (sd) onChange({ subDivision: sd.name, subDivisionId: sd._id, block: '', blockId: '', gramPanchayat: '', gramPanchayatId: '' })
    else onChange({ ...EMPTY_VAL })
  }

  function selectBlock(blockId: string) {
    const block = selectedSD?.blocks.find(b => b._id === blockId)
    if (block) onChange({ ...value, block: block.name, blockId: block._id, gramPanchayat: '', gramPanchayatId: '' })
    else onChange({ ...value, block: '', blockId: '', gramPanchayat: '', gramPanchayatId: '' })
  }

  function selectGP(gpId: string) {
    const gp = selectedBlock?.gramPanchayats.find(g => g._id === gpId)
    if (gp) onChange({ ...value, gramPanchayat: gp.name, gramPanchayatId: gp._id })
    else onChange({ ...value, gramPanchayat: '', gramPanchayatId: '' })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      {/* Sub Division */}
      <div className="form-group">
        <label className="form-label">Sub Division *</label>
        <select
          className="form-select"
          value={value.subDivisionId}
          disabled={disabled || locations.length === 0}
          onChange={e => selectSD(e.target.value)}
        >
          <option value="">Select Sub Division</option>
          {locations.map(sd => (
            <option key={sd._id} value={sd._id}>{sd.name}</option>
          ))}
        </select>
        {locations.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            ⚠ Add locations in Settings first
          </div>
        )}
      </div>

      {/* Block */}
      <div className="form-group">
        <label className="form-label">Block *</label>
        <select
          className="form-select"
          value={value.blockId}
          disabled={disabled || !value.subDivisionId}
          onChange={e => selectBlock(e.target.value)}
        >
          <option value="">{value.subDivisionId ? 'Select Block' : '— select sub division first'}</option>
          {selectedSD?.blocks.map(b => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Gram Panchayat */}
      <div className="form-group">
        <label className="form-label">Gram Panchayat *</label>
        <select
          className="form-select"
          value={value.gramPanchayatId}
          disabled={disabled || !value.blockId}
          onChange={e => selectGP(e.target.value)}
        >
          <option value="">{value.blockId ? 'Select GP' : '— select block first'}</option>
          {selectedBlock?.gramPanchayats.map(g => (
            <option key={g._id} value={g._id}>{g.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
