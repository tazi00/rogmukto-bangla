"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

type Role = "admin" | "receptionist" | "block-coordinator" | null;
type SortDir = "asc" | "desc";

const MONTHS = [
  { val: "01", label: "January" },
  { val: "02", label: "February" },
  { val: "03", label: "March" },
  { val: "04", label: "April" },
  { val: "05", label: "May" },
  { val: "06", label: "June" },
  { val: "07", label: "July" },
  { val: "08", label: "August" },
  { val: "09", label: "September" },
  { val: "10", label: "October" },
  { val: "11", label: "November" },
  { val: "12", label: "December" },
];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

interface BCPerf {
  _id: string;
  coordinatorId: string;
  name: string;
  phone: string;
  subDivision: string;
  blocks: string[];
  address: string;
  sbCount: number;
  totalPatients: number;
  totalIncentive: number;
  pendingIncentive: number;
  clearedIncentive: number;
}
interface SBPerf {
  helper: {
    _id: string;
    helperId: string;
    name: string;
    phone: string;
    subDivision: string;
    block: string;
    gramPanchayat: string;
    tag: string;
    blockCoordinatorId?: { _id: string; name: string; coordinatorId: string };
  };
  totalPatients: number;
  totalIncentive: number;
  pendingIncentive: number;
  clearedIncentive: number;
}

// Searchable dropdown
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = options.filter(
    (o) => !q || o.label.toLowerCase().includes(q.toLowerCase()),
  );
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 160 }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 10px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface)",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        <span
          style={{
            flex: 1,
            color: selected ? "var(--text)" : "var(--text-muted)",
          }}
        >
          {selected ? selected.label : placeholder}
        </span>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setQ("");
            }}
            style={{
              color: "var(--text-muted)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            ✕
          </span>
        )}
        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>▾</span>
      </div>
      {open && (
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
            maxHeight: 220,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <input
            autoFocus
            className="form-input"
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ margin: 6, fontSize: 12, padding: "5px 8px" }}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ overflowY: "auto", maxHeight: 160 }}>
            <div
              onMouseDown={() => {
                onChange("");
                setQ("");
                setOpen(false);
              }}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--text-muted)",
                cursor: "pointer",
                borderBottom: "1px solid var(--gray-100)",
              }}
            >
              All
            </div>
            {filtered.map((o) => (
              <div
                key={o.value}
                onMouseDown={() => {
                  onChange(o.value);
                  setQ("");
                  setOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  borderBottom: "1px solid var(--gray-100)",
                  background: o.value === value ? "var(--green-light)" : "",
                  fontWeight: o.value === value ? 500 : 400,
                }}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SortTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: string;
  sortKey: string;
  sortDir: SortDir;
  onSort: (k: string) => void;
}) {
  return (
    <th
      onClick={() => onSort(k)}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
    >
      {label}{" "}
      {sortKey === k ? (
        sortDir === "asc" ? (
          "↑"
        ) : (
          "↓"
        )
      ) : (
        <span style={{ opacity: 0.3 }}>↕</span>
      )}
    </th>
  );
}

export default function ViewPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          Loading...
        </div>
      }
    >
      <ViewPageInner />
    </Suspense>
  );
}

function ViewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();

  // Read month from URL if present
  const initMonth = searchParams.get("month");
  const initYear = initMonth
    ? initMonth.split("-")[0]
    : String(now.getFullYear());
  const initMon = initMonth
    ? initMonth.split("-")[1]
    : String(now.getMonth() + 1).padStart(2, "0");

  const [role, setRole] = useState<Role>(null);
  const [mounted, setMounted] = useState(false);
  const [selYear, setSelYear] = useState(initYear);
  const [selMonth, setSelMonth] = useState(initMon);

  // Active section: "bc" | "sb" | "patient"
  const [activeSection, setActiveSection] = useState<"bc" | "sb" | "patient">(
    "bc",
  );

  // BC data
  const [bcPerf, setBcPerf] = useState<BCPerf[]>([]);
  const [bcSearch, setBcSearch] = useState("");
  const [bcSDFilter, setBcSDFilter] = useState("");
  const [bcBlockFilter, setBcBlockFilter] = useState("");
  const [bcSortKey, setBcSortKey] = useState("name");
  const [bcSortDir, setBcSortDir] = useState<SortDir>("asc");

  // SB data
  const [sbPerf, setSbPerf] = useState<SBPerf[]>([]);
  const [sbSearch, setSbSearch] = useState("");
  const [sbBCFilter, setSbBCFilter] = useState("");
  const [sbSDFilter, setSbSDFilter] = useState("");
  const [sbNoId, setSbNoId] = useState(false);
  const [sbSortKey, setSbSortKey] = useState("name");
  const [sbSortDir, setSbSortDir] = useState<SortDir>("asc");

  // Patient data — for stats only on main page
  const [patientStats, setPatientStats] = useState({
    total: 0,
    admitted: 0,
    continued: 0,
    transferred: 0,
  });

  const [loading, setLoading] = useState(false);

  // Sync year/month from URL whenever searchParams changes
  useEffect(() => {
    const month = searchParams.get("month");
    if (month) {
      const [y, m] = month.split("-");
      if (y) setSelYear(y);
      if (m) setSelMonth(m);
    }
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
    const cookies = document.cookie
      .split(";")
      .reduce<Record<string, string>>((acc, c) => {
        const [k, v] = c.trim().split("=");
        acc[k] = decodeURIComponent(v || "");
        return acc;
      }, {});
    const r = (cookies["role_hint"] || null) as Role;
    setRole(r);
    if (r === "receptionist") setActiveSection("sb");
    else setActiveSection("bc");
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadAll();
  }, [mounted, selYear, selMonth]);

  async function loadAll() {
    setLoading(true);
    try {
      const month = `${selYear}-${selMonth}`;
      const [bcRes, sbRes, patRes] = await Promise.all([
        fetch(`/api/bc-performance?month=${month}`),
        fetch(`/api/reports?month=${month}`),
        fetch(`/api/patients?month=${month}`),
      ]);
      if (bcRes.ok)
        setBcPerf(await bcRes.json().then((d) => (Array.isArray(d) ? d : [])));
      if (sbRes.ok)
        setSbPerf(
          await sbRes
            .json()
            .then((d) =>
              Array.isArray(d) ? d.filter((r: SBPerf) => r.helper) : [],
            ),
        );
      if (patRes.ok) {
        const pats = await patRes
          .json()
          .then((d) => (Array.isArray(d) ? d : []));
        setPatientStats({
          total: pats.length,
          admitted: pats.filter(
            (p: any) => !p.dischargeStatus || p.dischargeStatus === "admitted",
          ).length,
          continued: pats.filter((p: any) => p.dischargeStatus === "continued")
            .length,
          transferred: pats.filter(
            (p: any) => p.dischargeStatus === "transferred",
          ).length,
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = role === "admin";
  const isBC = role === "block-coordinator";
  const isReception = role === "receptionist";

  // ── BC computed ──────────────────────────────────────────────────────────
  const uniqueBCSubDivs = Array.from(
    new Set(bcPerf.map((bc) => bc.subDivision)),
  ).sort();
  const uniqueBCBlocks = Array.from(
    new Set(bcPerf.flatMap((bc) => bc.blocks)),
  ).sort();
  function toggleBCSort(k: string) {
    if (bcSortKey === k) setBcSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setBcSortKey(k);
      setBcSortDir("asc");
    }
  }
  const displayBCs = bcPerf
    .filter((bc) => {
      if (bcSDFilter && bc.subDivision !== bcSDFilter) return false;
      if (bcBlockFilter && !bc.blocks.includes(bcBlockFilter)) return false;
      if (!bcSearch) return true;
      const q = bcSearch.toLowerCase();
      return (
        bc.name.toLowerCase().includes(q) ||
        bc.coordinatorId.toLowerCase().includes(q) ||
        bc.phone.includes(q) ||
        bc.subDivision.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const va = (a as any)[bcSortKey] ?? "";
      const vb = (b as any)[bcSortKey] ?? "";
      const r =
        typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return bcSortDir === "asc" ? r : -r;
    });

  // ── SB computed ──────────────────────────────────────────────────────────
  const uniqueSBSubDivs = Array.from(
    new Set(sbPerf.map((r) => r.helper.subDivision)),
  ).sort();
  function toggleSBSort(k: string) {
    if (sbSortKey === k) setSbSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSbSortKey(k);
      setSbSortDir("asc");
    }
  }
  const displaySBs = sbPerf
    .filter((row) => {
      if (sbNoId && row.helper.helperId) return false;
      if (sbSDFilter && row.helper.subDivision !== sbSDFilter) return false;
      if (sbBCFilter) {
        const bcId =
          typeof row.helper.blockCoordinatorId === "object"
            ? row.helper.blockCoordinatorId?._id
            : row.helper.blockCoordinatorId;
        if (bcId?.toString() !== sbBCFilter) return false;
      }
      if (!sbSearch) return true;
      const q = sbSearch.toLowerCase();
      return (
        row.helper.name.toLowerCase().includes(q) ||
        row.helper.phone.includes(q) ||
        (row.helper.helperId || "").toLowerCase().includes(q) ||
        row.helper.block.toLowerCase().includes(q) ||
        row.helper.gramPanchayat.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let va: any, vb: any;
      if (sbSortKey === "name") {
        va = a.helper.name;
        vb = b.helper.name;
      } else if (sbSortKey === "block") {
        va = a.helper.block;
        vb = b.helper.block;
      } else if (sbSortKey === "totalPatients") {
        va = a.totalPatients;
        vb = b.totalPatients;
      } else if (sbSortKey === "totalIncentive") {
        va = a.totalIncentive;
        vb = b.totalIncentive;
      } else {
        va = a.helper.helperId || "";
        vb = b.helper.helperId || "";
      }
      const r =
        typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sbSortDir === "asc" ? r : -r;
    });

  // ── Export ───────────────────────────────────────────────────────────────
  function writeXlsx(rows: any[], name: string) {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map((k) => ({
      wch: Math.max(k.length, 14),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    XLSX.writeFile(wb, `${name}.xlsx`);
  }

  function handleExport() {
    const mon = MONTHS.find((m) => m.val === selMonth)?.label || selMonth;
    if (activeSection === "bc") {
      writeXlsx(
        displayBCs.map((bc) => ({
          "BC ID": bc.coordinatorId,
          Name: bc.name,
          Phone: bc.phone,
          "Sub Division": bc.subDivision,
          Blocks: bc.blocks.join(", "),
          "SB Count": bc.sbCount,
          "Total Patients": bc.totalPatients,
          "Total ₹": bc.totalIncentive,
          "Pending ₹": bc.pendingIncentive,
          "Cleared ₹": bc.clearedIncentive,
        })),
        `BlockCoordinators_${mon}_${selYear}`,
      );
    } else if (activeSection === "sb") {
      const name = sbNoId
        ? `SB_Without_ID_${mon}_${selYear}`
        : `SwasthyaBondhu_${mon}_${selYear}`;
      writeXlsx(
        displaySBs.map((row) => ({
          "SB ID": row.helper.helperId || "—",
          Name: row.helper.name,
          Phone: row.helper.phone,
          "Sub Division": row.helper.subDivision,
          Block: row.helper.block,
          GP: row.helper.gramPanchayat,
          Patients: row.totalPatients,
          "Total ₹": row.totalIncentive,
          "Pending ₹": row.pendingIncentive,
          "Cleared ₹": row.clearedIncentive,
        })),
        name,
      );
    }
  }

  const backLink = isAdmin
    ? "/admin"
    : isBC
      ? "/block-coordinator"
      : "/reception";
  const backLabel = isAdmin
    ? "← Admin Panel"
    : isBC
      ? "← My Panel"
      : "← Reception";
  const roleLabel = isAdmin
    ? "Admin"
    : isBC
      ? "Block Coordinator"
      : "Receptionist";

  if (!mounted) return null;

  const monLabel = MONTHS.find((m) => m.val === selMonth)?.label || selMonth;

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--green-dark)",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            🏥
          </div>
          <div>
            <h1
              style={{
                color: "#fff",
                fontSize: 17,
                fontWeight: 600,
                margin: 0,
              }}
            >
              Rogmukto Bangla
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Reports & View — {monLabel} {selYear}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 20,
            }}
          >
            {roleLabel}
          </span>
          <a
            href={backLink}
            style={{
              border: "1px solid rgba(255,255,255,0.5)",
              color: "#fff",
              padding: "7px 18px",
              borderRadius: 30,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            {backLabel}
          </a>
        </div>
      </header>

      <div style={{ padding: "20px 24px" }}>
        {/* ── YEAR / MONTH SELECTOR ── */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <select
            style={{
              fontSize: 13,
              padding: "7px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
            value={selYear}
            onChange={(e) => {
              setSelYear(e.target.value);
              router.replace(`/view?month=${e.target.value}-${selMonth}`);
            }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            style={{
              fontSize: 13,
              padding: "7px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
            value={selMonth}
            onChange={(e) => {
              setSelMonth(e.target.value);
              router.replace(`/view?month=${selYear}-${e.target.value}`);
            }}
          >
            {MONTHS.map((m) => (
              <option key={m.val} value={m.val}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary"
            onClick={handleExport}
            style={{ fontSize: 13 }}
          >
            📥 Export Excel
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {isAdmin && (
            <div
              onClick={() => setActiveSection("bc")}
              style={{
                padding: "16px 20px",
                background:
                  activeSection === "bc"
                    ? "var(--green-dark)"
                    : "var(--surface)",
                border: `2px solid ${activeSection === "bc" ? "var(--green-dark)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color:
                    activeSection === "bc"
                      ? "rgba(255,255,255,0.7)"
                      : "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Block Coordinators
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: activeSection === "bc" ? "#fff" : "var(--text)",
                  marginTop: 4,
                }}
              >
                {bcPerf.length}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color:
                    activeSection === "bc"
                      ? "rgba(255,255,255,0.6)"
                      : "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Click to view list
              </div>
            </div>
          )}
          <div
            onClick={() => setActiveSection("sb")}
            style={{
              padding: "16px 20px",
              background:
                activeSection === "sb" ? "var(--green-dark)" : "var(--surface)",
              border: `2px solid ${activeSection === "sb" ? "var(--green-dark)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color:
                  activeSection === "sb"
                    ? "rgba(255,255,255,0.7)"
                    : "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Swasthya Bondhu
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: activeSection === "sb" ? "#fff" : "var(--text)",
                marginTop: 4,
              }}
            >
              {sbPerf.length}
            </div>
            <div
              style={{
                fontSize: 11,
                color:
                  activeSection === "sb"
                    ? "rgba(255,255,255,0.6)"
                    : "var(--text-muted)",
                marginTop: 2,
              }}
            >
              Click to view list
            </div>
          </div>
          <div
            onClick={() =>
              router.push(`/view/patients?month=${selYear}-${selMonth}`)
            }
            style={{
              padding: "16px 20px",
              background: "var(--surface)",
              border: "2px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Patients
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--text)",
                marginTop: 4,
              }}
            >
              {patientStats.total}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}
            >
              View more →
            </div>
          </div>
          {(isAdmin || isBC) && (
            <div
              style={{
                padding: "16px 20px",
                background: "var(--surface)",
                border: "2px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Total Incentive
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--text)",
                  marginTop: 4,
                }}
              >
                ₹
                {bcPerf
                  .reduce((s, bc) => s + bc.totalIncentive, 0)
                  .toLocaleString()}
              </div>
              <div
                style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}
              >
                Pending: ₹
                {bcPerf
                  .reduce((s, bc) => s + bc.pendingIncentive, 0)
                  .toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* ── BC TABLE ── */}
        {activeSection === "bc" && isAdmin && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                Block Coordinators{" "}
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 400,
                  }}
                >
                  ({displayBCs.length})
                </span>
              </h3>
            </div>
            {/* Filters */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 14,
                alignItems: "flex-end",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 4,
                  }}
                >
                  Search
                </div>
                <input
                  className="form-input"
                  placeholder="ID, name, phone..."
                  value={bcSearch}
                  onChange={(e) => setBcSearch(e.target.value)}
                  style={{ width: 220, fontSize: 13 }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 4,
                  }}
                >
                  Sub Division
                </div>
                <SearchableSelect
                  options={uniqueBCSubDivs.map((s) => ({ label: s, value: s }))}
                  value={bcSDFilter}
                  onChange={setBcSDFilter}
                  placeholder="All Sub Divisions"
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 4,
                  }}
                >
                  Block
                </div>
                <SearchableSelect
                  options={uniqueBCBlocks.map((s) => ({ label: s, value: s }))}
                  value={bcBlockFilter}
                  onChange={setBcBlockFilter}
                  placeholder="All Blocks"
                />
              </div>
              {(bcSearch || bcSDFilter || bcBlockFilter) && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => {
                    setBcSearch("");
                    setBcSDFilter("");
                    setBcBlockFilter("");
                  }}
                >
                  ✕ Reset
                </button>
              )}
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <SortTh
                      label="BC ID"
                      k="coordinatorId"
                      sortKey={bcSortKey}
                      sortDir={bcSortDir}
                      onSort={toggleBCSort}
                    />
                    <SortTh
                      label="Name"
                      k="name"
                      sortKey={bcSortKey}
                      sortDir={bcSortDir}
                      onSort={toggleBCSort}
                    />
                    <th>Phone</th>
                    <SortTh
                      label="Sub Division"
                      k="subDivision"
                      sortKey={bcSortKey}
                      sortDir={bcSortDir}
                      onSort={toggleBCSort}
                    />
                    <th>Blocks</th>
                    <SortTh
                      label="SBs"
                      k="sbCount"
                      sortKey={bcSortKey}
                      sortDir={bcSortDir}
                      onSort={toggleBCSort}
                    />
                    <SortTh
                      label="Patients"
                      k="totalPatients"
                      sortKey={bcSortKey}
                      sortDir={bcSortDir}
                      onSort={toggleBCSort}
                    />
                    <SortTh
                      label="Total ₹"
                      k="totalIncentive"
                      sortKey={bcSortKey}
                      sortDir={bcSortDir}
                      onSort={toggleBCSort}
                    />
                    <SortTh
                      label="Pending"
                      k="pendingIncentive"
                      sortKey={bcSortKey}
                      sortDir={bcSortDir}
                      onSort={toggleBCSort}
                    />
                    <th>Cleared</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10}>
                        <div
                          style={{
                            textAlign: "center",
                            padding: 32,
                            color: "var(--text-muted)",
                          }}
                        >
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : displayBCs.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-state">
                          <p>No block coordinators found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayBCs.map((bc) => (
                      <tr
                        key={bc._id}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          router.push(
                            `/view/bc/${bc._id}?month=${selYear}-${selMonth}`,
                          )
                        }
                      >
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {bc.coordinatorId}
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--green-dark)",
                              textDecoration: "underline",
                            }}
                          >
                            {bc.name}
                          </span>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {bc.phone}
                        </td>
                        <td style={{ fontSize: 12 }}>{bc.subDivision}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                            }}
                          >
                            {bc.blocks.map((b) => (
                              <span key={b} className="badge badge-gray">
                                {b}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="badge badge-green">
                            {bc.sbCount}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>
                          {bc.totalPatients}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          ₹{bc.totalIncentive.toLocaleString()}
                        </td>
                        <td>
                          <span className="badge badge-amber">
                            ₹{bc.pendingIncentive.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-green">
                            ₹{bc.clearedIncentive.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SB TABLE ── */}
        {activeSection === "sb" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                Swasthya Bondhu{" "}
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 400,
                  }}
                >
                  ({displaySBs.length})
                </span>
              </h3>
            </div>
            {/* Filters */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 14,
                alignItems: "flex-end",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 4,
                  }}
                >
                  Search
                </div>
                <input
                  className="form-input"
                  placeholder="ID, name, phone, block, GP..."
                  value={sbSearch}
                  onChange={(e) => setSbSearch(e.target.value)}
                  style={{ width: 250, fontSize: 13 }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 4,
                  }}
                >
                  Sub Division
                </div>
                <SearchableSelect
                  options={uniqueSBSubDivs.map((s) => ({ label: s, value: s }))}
                  value={sbSDFilter}
                  onChange={setSbSDFilter}
                  placeholder="All Sub Divisions"
                />
              </div>
              {isAdmin && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 4,
                    }}
                  >
                    Block Coordinator
                  </div>
                  <SearchableSelect
                    options={bcPerf.map((bc) => ({
                      label: `${bc.name} — ${bc.subDivision}`,
                      value: bc._id,
                    }))}
                    value={sbBCFilter}
                    onChange={setSbBCFilter}
                    placeholder="All BCs"
                  />
                </div>
              )}
              <div style={{ alignSelf: "flex-end" }}>
                <button
                  onClick={() => setSbNoId((v) => !v)}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: `2px solid ${sbNoId ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)",
                    background: sbNoId ? "#fff3e0" : "var(--surface)",
                    color: sbNoId ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  🪪{" "}
                  {sbNoId ? `Without ID (${displaySBs.length})` : "Without ID"}
                </button>
              </div>
              {(sbSearch || sbSDFilter || sbBCFilter || sbNoId) && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => {
                    setSbSearch("");
                    setSbSDFilter("");
                    setSbBCFilter("");
                    setSbNoId(false);
                  }}
                >
                  ✕ Reset
                </button>
              )}
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <SortTh
                      label="SB ID"
                      k="helperId"
                      sortKey={sbSortKey}
                      sortDir={sbSortDir}
                      onSort={toggleSBSort}
                    />
                    <SortTh
                      label="Name"
                      k="name"
                      sortKey={sbSortKey}
                      sortDir={sbSortDir}
                      onSort={toggleSBSort}
                    />
                    <th>Phone</th>
                    <th>Sub Division</th>
                    <SortTh
                      label="Block"
                      k="block"
                      sortKey={sbSortKey}
                      sortDir={sbSortDir}
                      onSort={toggleSBSort}
                    />
                    <th>GP</th>
                    {isAdmin && <th>Block Coordinator</th>}
                    <SortTh
                      label="Patients"
                      k="totalPatients"
                      sortKey={sbSortKey}
                      sortDir={sbSortDir}
                      onSort={toggleSBSort}
                    />
                    {(isAdmin || isBC) && (
                      <>
                        <SortTh
                          label="Total ₹"
                          k="totalIncentive"
                          sortKey={sbSortKey}
                          sortDir={sbSortDir}
                          onSort={toggleSBSort}
                        />
                        <th>Pending</th>
                        <th>Cleared</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12}>
                        <div
                          style={{
                            textAlign: "center",
                            padding: 32,
                            color: "var(--text-muted)",
                          }}
                        >
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : displaySBs.length === 0 ? (
                    <tr>
                      <td colSpan={12}>
                        <div className="empty-state">
                          <p>
                            {sbNoId ? "All SBs have IDs." : "No data found."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displaySBs.map((row) => (
                      <tr
                        key={row.helper._id}
                        style={{
                          cursor: "pointer",
                          background: !row.helper.helperId ? "#fff8e1" : "",
                        }}
                      >
                        <td
                          onClick={() =>
                            router.push(
                              `/view/sb/${row.helper._id}?month=${selYear}-${selMonth}`,
                            )
                          }
                        >
                          {row.helper.helperId ? (
                            <span
                              style={{ fontFamily: "monospace", fontSize: 12 }}
                            >
                              {row.helper.helperId}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "var(--accent)",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              ⚠ No ID
                            </span>
                          )}
                        </td>
                        <td
                          onClick={() =>
                            router.push(
                              `/view/sb/${row.helper._id}?month=${selYear}-${selMonth}`,
                            )
                          }
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--green-dark)",
                              textDecoration: "underline",
                            }}
                          >
                            {row.helper.name}
                          </span>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {row.helper.phone}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {row.helper.subDivision}
                        </td>
                        <td style={{ fontSize: 12 }}>{row.helper.block}</td>
                        <td style={{ fontSize: 12 }}>
                          {row.helper.gramPanchayat}
                        </td>
                        {isAdmin && (
                          <td>
                            {row.helper.blockCoordinatorId ? (
                              <span
                                onClick={() =>
                                  router.push(
                                    `/view/bc/${(row.helper.blockCoordinatorId as any)?._id}?month=${selYear}-${selMonth}`,
                                  )
                                }
                                style={{
                                  color: "var(--green-dark)",
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                {(row.helper.blockCoordinatorId as any)?.name}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                        <td
                          style={{ textAlign: "center", fontWeight: 600 }}
                          onClick={() =>
                            router.push(
                              `/view/sb/${row.helper._id}?month=${selYear}-${selMonth}`,
                            )
                          }
                        >
                          {row.totalPatients}
                        </td>
                        {(isAdmin || isBC) && (
                          <>
                            <td style={{ fontWeight: 600 }}>
                              ₹{row.totalIncentive.toLocaleString()}
                            </td>
                            <td>
                              <span className="badge badge-amber">
                                ₹{row.pendingIncentive.toLocaleString()}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-green">
                                ₹{row.clearedIncentive.toLocaleString()}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
