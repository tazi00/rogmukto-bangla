'use client'

interface Props {
  pincode: string
  aadharNumber: string
  swasthaSathNumber: string
  onChange: (field: string, value: string) => void
}

export default function PatientExtraFields({ pincode, aadharNumber, swasthaSathNumber, onChange }: Props) {
  const aadharValid = !aadharNumber || /^\d{12}$/.test(aadharNumber)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div className="form-group">
        <label className="form-label">Pincode <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>(optional)</span></label>
        <input
          className="form-input"
          value={pincode}
          onChange={e => onChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit pincode"
          maxLength={6}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Swastha Sath Number <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>(optional)</span></label>
        <input
          className="form-input"
          value={swasthaSathNumber}
          onChange={e => onChange('swasthaSathNumber', e.target.value)}
          placeholder="Swastha Sath No."
        />
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Aadhar Number <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>(optional, 12 digits)</span></label>
        <input
          className="form-input"
          value={aadharNumber}
          onChange={e => onChange('aadharNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="12-digit Aadhar number"
          maxLength={12}
          style={{ borderColor: aadharNumber && !aadharValid ? 'var(--red)' : undefined }}
        />
        {aadharNumber && !aadharValid && (
          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>⚠ Aadhar must be exactly 12 digits</div>
        )}
        {aadharNumber && aadharValid && aadharNumber.length === 12 && (
          <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>✓ Valid Aadhar number</div>
        )}
      </div>
    </div>
  )
}
