'use client'
import { useState, useRef, useEffect } from 'react'

interface Option { label: string; value: string }

interface Props {
  options: Option[]
  values: string[]
  onChange: (vals: string[]) => void
  placeholder?: string
  disabled?: boolean
  label?: string
}

export default function MultiSearchSelect({ options, values, onChange, placeholder = 'Select...', disabled, label }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()))

  function toggle(val: string) {
    onChange(values.includes(val) ? values.filter(v => v !== val) : [...values, val])
  }
  function remove(val: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(values.filter(v => v !== val))
  }

  const selectedLabels = values.map(v => options.find(o => o.value === v)?.label || v)

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {label && <div className="form-label" style={{ marginBottom: 5 }}>{label}</div>}
      <div
        onClick={() => !disabled && setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4,
          padding: '6px 10px', border: `1px solid ${open ? 'var(--green-mid)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', background: disabled ? 'var(--gray-50)' : 'var(--surface)',
          cursor: disabled ? 'not-allowed' : 'pointer', minHeight: 40,
          boxShadow: open ? '0 0 0 3px rgba(45,158,98,0.1)' : 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {values.length === 0 && (
          <span style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: '26px' }}>{placeholder}</span>
        )}
        {selectedLabels.map((label, i) => (
          <span key={values[i]} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 20,
            background: 'var(--green-light)', color: 'var(--green-dark)',
            fontSize: 12, fontWeight: 500, lineHeight: '20px',
          }}>
            {label}
            {!disabled && (
              <span onClick={e => remove(values[i], e)} style={{ cursor: 'pointer', fontSize: 11, lineHeight: 1, opacity: 0.7 }}>✕</span>
            )}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 10, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s', flexShrink: 0 }}>▼</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              className="form-input"
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 13 }}
              onClick={e => e.stopPropagation()}
            />
          </div>
          {values.length > 0 && (
            <div style={{ padding: '4px 14px 6px', borderBottom: '1px solid var(--gray-100)', fontSize: 11, color: 'var(--text-muted)' }}>
              {values.length} selected
              <span onClick={() => onChange([])} style={{ marginLeft: 8, cursor: 'pointer', color: 'var(--red)', fontWeight: 500 }}>Clear all</span>
            </div>
          )}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13 }}>No results</div>
            ) : filtered.map(opt => (
              <div key={opt.value} onClick={() => toggle(opt.value)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: values.includes(opt.value) ? 'var(--green-light)' : 'transparent',
                  color: values.includes(opt.value) ? 'var(--green-dark)' : 'var(--text)',
                }}
                onMouseEnter={e => { if (!values.includes(opt.value)) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)' }}
                onMouseLeave={e => { if (!values.includes(opt.value)) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${values.includes(opt.value) ? 'var(--green-mid)' : 'var(--border)'}`,
                  background: values.includes(opt.value) ? 'var(--green-mid)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff',
                }}>
                  {values.includes(opt.value) ? '✓' : ''}
                </span>
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
