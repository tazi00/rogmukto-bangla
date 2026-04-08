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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
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
          onChange={(e) => {
            onChange(e.target.value);
            setShow(true);
          }}
          onFocus={() => setShow(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {value && (
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
      {show && filtered.length > 0 && (
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

  // Aggregate all GPs and villages from all blocks/subdivisions
  const allGPs = locations.flatMap((sd) =>
    sd.blocks.flatMap((b) => b.gramPanchayats),
  );
  const allMuns = locations.flatMap((sd) =>
    sd.blocks.flatMap((b) => b.municipalities),
  );

  const gpSuggestions = Array.from(new Set(allGPs.map((g) => g.name))).sort();
  const munSuggestions = Array.from(new Set(allMuns.map((m) => m.name))).sort();

  // Villages for selected GP
  const matchedGP = allGPs.find((g) => g.name === value.gramPanchayat);
  const villageSuggestions = matchedGP?.villages.map((v) => v.name) || [];

  // Wards for selected municipality
  const matchedMun = allMuns.find((m) => m.name === value.municipality);
  const wardSuggestions = matchedMun?.wards.map((w) => w.name) || [];

  // When GP selected, auto-fill subDivision and block from location data
  function handleGP(gp: string) {
    // Try to find block/subdiv info for this GP
    let foundSD = "";
    let foundSDId = "";
    let foundBlock = "";
    let foundBlockId = "";
    for (const sd of locations) {
      for (const b of sd.blocks) {
        if (b.gramPanchayats.some((g) => g.name === gp)) {
          foundSD = sd.name;
          foundSDId = sd._id;
          foundBlock = b.name;
          foundBlockId = b._id;
          break;
        }
      }
      if (foundSD) break;
    }
    onChange({
      ...value,
      gramPanchayat: gp,
      village: "",
      subDivision: foundSD,
      subDivisionId: foundSDId,
      block: foundBlock,
      blockId: foundBlockId,
    });
  }

  // When Municipality selected, auto-fill subDivision and block
  function handleMun(mun: string) {
    let foundSD = "";
    let foundSDId = "";
    let foundBlock = "";
    let foundBlockId = "";
    for (const sd of locations) {
      for (const b of sd.blocks) {
        if (b.municipalities.some((m) => m.name === mun)) {
          foundSD = sd.name;
          foundSDId = sd._id;
          foundBlock = b.name;
          foundBlockId = b._id;
          break;
        }
      }
      if (foundSD) break;
    }
    onChange({
      ...value,
      municipality: mun,
      ward: "",
      subDivision: foundSD,
      subDivisionId: foundSDId,
      block: foundBlock,
      blockId: foundBlockId,
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

      {/* Address Type */}
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

      {/* GP path — only GP + Village */}
      {value.type === "gp" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 12,
          }}
        >
          <FreeTypeSelect
            label="Gram Panchayat"
            value={value.gramPanchayat}
            onChange={handleGP}
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
        </div>
      )}

      {/* Municipality path — only Municipality + Ward */}
      {value.type === "municipality" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 12,
          }}
        >
          <FreeTypeSelect
            label="Municipality"
            value={value.municipality}
            onChange={handleMun}
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
        </div>
      )}
    </div>
  );
}
