"use client";
import { useEffect, useState, useRef } from "react";

interface Village {
  _id: string;
  name: string;
}
interface Ward {
  _id: string;
  name: string;
}
interface GP {
  _id: string;
  name: string;
  villages: Village[];
}
interface Municipality {
  _id: string;
  name: string;
  wards: Ward[];
}
interface Block {
  _id: string;
  name: string;
  gramPanchayats: GP[];
  municipalities: Municipality[];
}
interface SubDiv {
  _id: string;
  name: string;
  blocks: Block[];
}

export interface AddressValue {
  type: "gp" | "municipality" | "";
  subDivision: string;
  subDivisionId: string;
  block: string;
  blockId: string;
  gramPanchayat: string;
  village: string;
  municipality: string;
  ward: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  type: "",
  subDivision: "",
  subDivisionId: "",
  block: "",
  blockId: "",
  gramPanchayat: "",
  village: "",
  municipality: "",
  ward: "",
};

interface Props {
  value: AddressValue;
  onChange: (val: AddressValue) => void;
}

function FreeTypeSelect({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setShow(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = suggestions.filter(
    (s) => !value || s.toLowerCase().includes(value.toLowerCase()),
  );

  const isCustom =
    value && suggestions.length > 0 && !suggestions.includes(value);

  return (
    <div className="form-group" ref={ref} style={{ position: "relative" }}>
      <label className="form-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className="form-input"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            setShow(true);
          }}
          onFocus={() => setShow(true)}
          placeholder={disabled ? "—" : placeholder}
          autoComplete="off"
          style={
            disabled
              ? {
                  background: "var(--gray-50)",
                  color: "var(--text-muted)",
                  cursor: "not-allowed",
                }
              : {}
          }
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setShow(false);
            }}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-muted)",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        )}
      </div>
      {show && !disabled && filtered.length > 0 && (
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
          {filtered.map((s) => (
            <div
              key={s}
              onMouseDown={() => {
                onChange(s);
                setShow(false);
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 13,
                borderBottom: "1px solid var(--gray-100)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "var(--gray-50)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "")
              }
            >
              {s}
            </div>
          ))}
        </div>
      )}
      {isCustom && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
          ✏ Custom — saved to patient record only
        </div>
      )}
    </div>
  );
}

export default function PatientAddressSelect({ value, onChange }: Props) {
  const [locations, setLocations] = useState<SubDiv[]>([]);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []));
  }, []);

  const sdSuggestions = locations.map((sd) => sd.name);
  const matchedSD = locations.find((sd) => sd.name === value.subDivision);
  const blockSuggestions = matchedSD?.blocks.map((b) => b.name) || [];
  const matchedBlock = matchedSD?.blocks.find((b) => b.name === value.block);
  const gpSuggestions = matchedBlock?.gramPanchayats.map((g) => g.name) || [];
  const munSuggestions = matchedBlock?.municipalities.map((m) => m.name) || [];
  const matchedGP = matchedBlock?.gramPanchayats.find(
    (g) => g.name === value.gramPanchayat,
  );
  const villageSuggestions = matchedGP?.villages.map((v) => v.name) || [];
  const matchedMun = matchedBlock?.municipalities.find(
    (m) => m.name === value.municipality,
  );
  const wardSuggestions = matchedMun?.wards.map((w) => w.name) || [];

  function handleSD(sd: string) {
    const matched = locations.find((s) => s.name === sd);
    onChange({
      ...value,
      subDivision: sd,
      subDivisionId: matched?._id || "",
      block: "",
      blockId: "",
      gramPanchayat: "",
      village: "",
      municipality: "",
      ward: "",
    });
  }

  function handleBlock(block: string) {
    const matched = matchedSD?.blocks.find((b) => b.name === block);
    onChange({
      ...value,
      block,
      blockId: matched?._id || "",
      gramPanchayat: "",
      village: "",
      municipality: "",
      ward: "",
    });
  }

  const radioStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    border: `2px solid ${active ? "var(--green-mid)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)",
    background: active ? "var(--green-light)" : "var(--surface)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    color: active ? "var(--green-dark)" : "var(--text-muted)",
    userSelect: "none",
  });

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: 16,
        background: "var(--gray-50)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 12,
        }}
      >
        Patient Address
      </div>

      <div className="form-group">
        <label className="form-label">Address Type</label>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <label
            style={radioStyle(value.type === "gp")}
            onClick={() => onChange({ ...EMPTY_ADDRESS, type: "gp" })}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: `2px solid ${value.type === "gp" ? "var(--green-mid)" : "var(--border)"}`,
                background:
                  value.type === "gp" ? "var(--green-mid)" : "transparent",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            🌿 Gram Panchayat
          </label>
          <label
            style={radioStyle(value.type === "municipality")}
            onClick={() => onChange({ ...EMPTY_ADDRESS, type: "municipality" })}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: `2px solid ${value.type === "municipality" ? "var(--green-mid)" : "var(--border)"}`,
                background:
                  value.type === "municipality"
                    ? "var(--green-mid)"
                    : "transparent",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            🏙 Municipality
          </label>
        </div>
      </div>

      {value.type && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 12,
          }}
        >
          <FreeTypeSelect
            label="Sub Division"
            value={value.subDivision}
            onChange={handleSD}
            suggestions={sdSuggestions}
            placeholder="Type or select Sub Division..."
          />

          {value.subDivision && (
            <FreeTypeSelect
              label="Block"
              value={value.block}
              onChange={handleBlock}
              suggestions={blockSuggestions}
              placeholder="Type or select Block..."
            />
          )}

          {value.type === "gp" && value.block && (
            <>
              <FreeTypeSelect
                label="Gram Panchayat"
                value={value.gramPanchayat}
                onChange={(gp) =>
                  onChange({ ...value, gramPanchayat: gp, village: "" })
                }
                suggestions={gpSuggestions}
                placeholder="Type or select Gram Panchayat..."
              />
              {value.gramPanchayat && (
                <FreeTypeSelect
                  label="Village"
                  value={value.village}
                  onChange={(village) => onChange({ ...value, village })}
                  suggestions={villageSuggestions}
                  placeholder="Type or select Village..."
                />
              )}
            </>
          )}

          {value.type === "municipality" && value.block && (
            <>
              <FreeTypeSelect
                label="Municipality"
                value={value.municipality}
                onChange={(mun) =>
                  onChange({ ...value, municipality: mun, ward: "" })
                }
                suggestions={munSuggestions}
                placeholder="Type or select Municipality..."
              />
              {value.municipality && (
                <FreeTypeSelect
                  label="Ward"
                  value={value.ward}
                  onChange={(ward) => onChange({ ...value, ward })}
                  suggestions={wardSuggestions}
                  placeholder="Type or select Ward..."
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
