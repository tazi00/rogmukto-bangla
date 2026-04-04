'use client'
import { useState, useRef, useEffect } from 'react'

interface Option { label: string; value: string }

interface Props {
  options: Option[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  label?: string
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Select...', disabled, label }: Props) {
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

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()))

  function select(opt: Option) { onChange(opt.value); setOpen(false); setSearch('') }
  function clear(e: React.MouseEvent) { e.stopPropagation(); onChange(''); setSearch('') }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {label && <div className="form-label" style={{ marginBottom: 5 }}>{label}</div>}
      <div
        onClick={() => !disabled && setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', border: `1px solid ${open ? 'var(--green-mid)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', background: disabled ? 'var(--gray-50)' : 'var(--surface)',
          cursor: disabled ? 'not-allowed' : 'pointer', minHeight: 40,
          boxShadow: open ? '0 0 0 3px rgba(45,158,98,0.1)' : 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ fontSize: 14, color: selected ? 'var(--text)' : 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selected && !disabled && (
            <span onClick={clear} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }}>▼</span>
        </div>
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
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13 }}>No results</div>
            ) : filtered.map(opt => (
              <div key={opt.value} onClick={() => select(opt)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                  background: opt.value === value ? 'var(--green-light)' : 'transparent',
                  color: opt.value === value ? 'var(--green-dark)' : 'var(--text)',
                  fontWeight: opt.value === value ? 500 : 400,
                }}
                onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)' }}
                onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {opt.value === value && '✓ '}{opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
