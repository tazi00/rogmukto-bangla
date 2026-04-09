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
  createdAt?: string;
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

  const [activeSection, setActiveSection] = useState<"bc" | "sb" | "patient">(
    "bc",
  );

  // BC data + filters
  const [bcPerf, setBcPerf] = useState<BCPerf[]>([]);
  const [bcSearch, setBcSearch] = useState(""); // ID, name, phone only
  const [bcSDFilter, setBcSDFilter] = useState("");
  const [bcBlockFilter, setBcBlockFilter] = useState("");
  const [bcSortKey, setBcSortKey] = useState("name");
  const [bcSortDir, setBcSortDir] = useState<SortDir>("asc");

  // BC date filter (createdAt based) — default: today
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const [bcDateFrom, setBcDateFrom] = useState("");
  const [bcDateTo, setBcDateTo] = useState("");
  const [dateKey, setDateKey] = useState(0);

  // Locations from DB (for SubDiv/Block dropdowns)
  const [locations, setLocations] = useState<
    {
      _id: string;
      name: string;
      blocks: {
        _id: string;
        name: string;
        gramPanchayats: {
          _id: string;
          name: string;
          villages: { _id: string; name: string }[];
        }[];
        municipalities: {
          _id: string;
          name: string;
          wards: { _id: string; name: string }[];
        }[];
      }[];
    }[]
  >([]);

  // SB data + filters
  const [sbPerf, setSbPerf] = useState<SBPerf[]>([]);
  const [sbSearch, setSbSearch] = useState("");
  const [sbBCFilter, setSbBCFilter] = useState("");
  // Cascading location filters
  const [sbSDFilter, setSbSDFilter] = useState("");
  const [sbBlockFilter, setSbBlockFilter] = useState("");
  const [sbGPFilter, setSbGPFilter] = useState("");
  const [sbMunFilter, setSbMunFilter] = useState("");
  const [sbVillageFilter, setSbVillageFilter] = useState("");
  const [sbWardFilter, setSbWardFilter] = useState("");
  const [sbAddressType, setSbAddressType] = useState<
    "" | "gp" | "municipality"
  >("");
  // ID filter: "" = all, "with" = with ID, "without" = without ID
  const [sbIdFilter, setSbIdFilter] = useState<"" | "with" | "without">("");
  const [sbSortKey, setSbSortKey] = useState("name");
  const [sbSortDir, setSbSortDir] = useState<SortDir>("asc");
  // SB date filter (createdAt based) — default: today
  const [sbDateFrom, setSbDateFrom] = useState("");
  const [sbDateTo, setSbDateTo] = useState("");
  const [sbDateKey, setSbDateKey] = useState(0);

  // Patient data + filters
  const [patientStats, setPatientStats] = useState({ total: 0 });
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [patSearch, setPatSearch] = useState("");
  const [patSortKey, setPatSortKey] = useState("doa");
  const [patSortDir, setPatSortDir] = useState<SortDir>("desc");
  const [patDischargeFilter, setPatDischargeFilter] = useState("");
  const [patStatusFilter, setPatStatusFilter] = useState("");
  const [patSbFilter, setPatSbFilter] = useState("");
  const [patDoaFrom, setPatDoaFrom] = useState("");
  const [patDoaTo, setPatDoaTo] = useState("");
  const [patDateKey, setPatDateKey] = useState(0);
  const [patAddrSD, setPatAddrSD] = useState("");
  const [patAddrBlock, setPatAddrBlock] = useState("");
  const [patAddrType, setPatAddrType] = useState<"" | "gp" | "municipality">(
    "",
  );
  const [patAddrGP, setPatAddrGP] = useState("");
  const [patAddrMun, setPatAddrMun] = useState("");
  const [patAddrVillage, setPatAddrVillage] = useState("");
  const [patAddrWard, setPatAddrWard] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

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
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []));
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
          .then((d: any) => (Array.isArray(d) ? d : []));
        setAllPatients(pats);
        setPatientStats({ total: pats.length });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = role === "admin";
  const isBC = role === "block-coordinator";

  // ── BC computed ──────────────────────────────────────────────────────────
  // SubDivisions from locations DB (not from current bcPerf data)
  const allSubDivs = locations.map((sd) => sd.name).sort();
  // Blocks — filtered by selected SD if any, else all blocks
  const matchedSD = locations.find((sd) => sd.name === bcSDFilter);
  const allBlocks =
    bcSDFilter && matchedSD
      ? matchedSD.blocks.map((b) => b.name).sort()
      : locations.flatMap((sd) => sd.blocks.map((b) => b.name)).sort();

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
      // Date filter — createdAt based (inclusive range)
      if (bcDateFrom || bcDateTo) {
        const raw = bc.createdAt;
        if (!raw) return false;
        const created = new Date(raw);
        if (bcDateFrom) {
          const from = new Date(bcDateFrom);
          from.setHours(0, 0, 0, 0);
          if (created < from) return false;
        }
        if (bcDateTo) {
          const to = new Date(bcDateTo);
          to.setHours(23, 59, 59, 999);
          if (created > to) return false;
        }
      }
      // Search — only ID, name, phone
      if (!bcSearch) return true;
      const q = bcSearch.toLowerCase();
      return (
        bc.name.toLowerCase().includes(q) ||
        bc.coordinatorId.toLowerCase().includes(q) ||
        bc.phone.includes(q)
      );
    })
    .sort((a, b) => {
      const va = (a as any)[bcSortKey] ?? "";
      const vb = (b as any)[bcSortKey] ?? "";
      const r =
        typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return bcSortDir === "asc" ? r : -r;
    });

  // ── SB computed — full cascade from locations DB ────────────────────────
  const sbAllSubDivs = locations.map((sd) => sd.name).sort();
  const sbMatchedSD = locations.find((sd) => sd.name === sbSDFilter);
  const sbBlockOptions =
    sbSDFilter && sbMatchedSD
      ? sbMatchedSD.blocks.map((b) => b.name).sort()
      : [];
  const sbMatchedBlock = sbMatchedSD?.blocks.find(
    (b) => b.name === sbBlockFilter,
  );
  const sbGPOptions =
    sbBlockFilter && sbMatchedBlock
      ? sbMatchedBlock.gramPanchayats.map((g) => g.name).sort()
      : [];
  const sbMunOptions =
    sbBlockFilter && sbMatchedBlock
      ? sbMatchedBlock.municipalities.map((m) => m.name).sort()
      : [];
  const sbMatchedGP = sbMatchedBlock?.gramPanchayats.find(
    (g) => g.name === sbGPFilter,
  );
  const sbVillageOptions =
    sbGPFilter && sbMatchedGP
      ? sbMatchedGP.villages.map((v) => v.name).sort()
      : [];
  const sbMatchedMun = sbMatchedBlock?.municipalities.find(
    (m) => m.name === sbMunFilter,
  );
  const sbWardOptions =
    sbMunFilter && sbMatchedMun
      ? sbMatchedMun.wards.map((w) => w.name).sort()
      : [];

  function toggleSBSort(k: string) {
    if (sbSortKey === k) setSbSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSbSortKey(k);
      setSbSortDir("asc");
    }
  }

  const displaySBs = sbPerf
    .filter((row) => {
      if (sbIdFilter === "with" && !row.helper.helperId) return false;
      if (sbIdFilter === "without" && row.helper.helperId) return false;
      if (sbSDFilter && row.helper.subDivision !== sbSDFilter) return false;
      if (sbBlockFilter && row.helper.block !== sbBlockFilter) return false;
      if (sbGPFilter && row.helper.gramPanchayat !== sbGPFilter) return false;
      // Date filter — createdAt based
      if (sbDateFrom || sbDateTo) {
        const raw = (row.helper as any).createdAt;
        if (!raw) return false;
        const created = new Date(raw);
        if (sbDateFrom) {
          const from = new Date(sbDateFrom);
          from.setHours(0, 0, 0, 0);
          if (created < from) return false;
        }
        if (sbDateTo) {
          const to = new Date(sbDateTo);
          to.setHours(23, 59, 59, 999);
          if (created > to) return false;
        }
      }
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
      } else {
        va = a.helper.helperId || "";
        vb = b.helper.helperId || "";
      }
      const r =
        typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sbSortDir === "asc" ? r : -r;
    });

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
        })),
        `BlockCoordinators_${mon}_${selYear}`,
      );
    } else if (activeSection === "sb") {
      const name =
        sbIdFilter === "without"
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
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 4,
  };

  if (!mounted) return null;
  const monLabel = MONTHS.find((m) => m.val === selMonth)?.label || selMonth;

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
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
        {/* Export button only */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h3 className="text-xl">
            {role?.[0]?.toUpperCase() + role?.slice(1)} Reports 
          </h3>

          <button
            className="btn btn-secondary"
            onClick={handleExport}
            style={{ fontSize: 13 }}
          >
            📥 Export Excel
          </button>
        </div>

        {/* Stat Cards */}
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
            onClick={() => setActiveSection("patient")}
            style={{
              padding: "16px 20px",
              background:
                activeSection === "patient"
                  ? "var(--green-dark)"
                  : "var(--surface)",
              border: `2px solid ${activeSection === "patient" ? "var(--green-dark)" : "var(--border)"}`,
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
                  activeSection === "patient"
                    ? "rgba(255,255,255,0.7)"
                    : "var(--text-muted)",
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
                color: activeSection === "patient" ? "#fff" : "var(--text)",
                marginTop: 4,
              }}
            >
              {patientStats.total}
            </div>
            <div
              style={{
                fontSize: 11,
                color:
                  activeSection === "patient"
                    ? "rgba(255,255,255,0.6)"
                    : "var(--text-muted)",
                marginTop: 2,
              }}
            >
              Click to view list
            </div>
          </div>
        </div>

        {/* ── BC TABLE ── */}
        {activeSection === "bc" && isAdmin && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px 0" }}>
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

            {/* BC Filters */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 14,
                alignItems: "flex-end",
              }}
            >
              {/* Search — ID, name, phone only */}
              <div>
                <div style={labelStyle}>Search</div>
                <input
                  className="form-input"
                  placeholder="Search by ID or name or phone..."
                  value={bcSearch}
                  onChange={(e) => setBcSearch(e.target.value)}
                  style={{ width: 250, fontSize: 13 }}
                />
              </div>
              {/* Sub Division */}
              <div>
                <div style={labelStyle}>Sub Division</div>
                <SearchableSelect
                  options={allSubDivs.map((s) => ({ label: s, value: s }))}
                  value={bcSDFilter}
                  onChange={(v) => {
                    setBcSDFilter(v);
                    setBcBlockFilter("");
                  }}
                  placeholder="All Sub Divisions"
                />
              </div>
              {/* Block */}
              <div>
                <div style={labelStyle}>Block</div>
                <SearchableSelect
                  options={allBlocks.map((s) => ({ label: s, value: s }))}
                  value={bcBlockFilter}
                  onChange={setBcBlockFilter}
                  placeholder="All Blocks"
                />
              </div>
              {/* Date filter — createdAt based */}
              <div>
                <div style={labelStyle}>Date From</div>
                <input
                  type="date"
                  className="form-input"
                  key={`from-${dateKey}`}
                  value={bcDateFrom}
                  onChange={(e) => setBcDateFrom(e.target.value)}
                  style={{ fontSize: 13, colorScheme: "light" }}
                />
              </div>
              <div>
                <div style={labelStyle}>Date To</div>
                <input
                  type="date"
                  className="form-input"
                  key={`to-${dateKey}`}
                  value={bcDateTo}
                  onChange={(e) => setBcDateTo(e.target.value)}
                  style={{ fontSize: 13, colorScheme: "light" }}
                />
              </div>
              {(bcSearch ||
                bcSDFilter ||
                bcBlockFilter ||
                bcDateFrom ||
                bcDateTo) && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => {
                    setBcSearch("");
                    setBcSDFilter("");
                    setBcBlockFilter("");
                    setBcDateFrom("");
                    setBcDateTo("");
                    setDateKey((k) => k + 1);
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
                    <th>Block</th>
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
                    {/* Total/Pending/Cleared — disabled for now */}
                    {/* <SortTh label="Total ₹" k="totalIncentive" sortKey={bcSortKey} sortDir={bcSortDir} onSort={toggleBCSort} /> */}
                    {/* <SortTh label="Pending" k="pendingIncentive" sortKey={bcSortKey} sortDir={bcSortDir} onSort={toggleBCSort} /> */}
                    {/* <th>Cleared</th> */}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>
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
                      <td colSpan={7}>
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
                        {/* Show only first block */}
                        <td>
                          {bc.blocks[0] && (
                            <span className="badge badge-gray">
                              {bc.blocks[0]}
                            </span>
                          )}
                          {bc.blocks.length > 1 && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                marginLeft: 4,
                              }}
                            >
                              +{bc.blocks.length - 1}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="badge badge-green">
                            {bc.sbCount}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>
                          {bc.totalPatients}
                        </td>
                        {/* <td style={{ fontWeight: 600 }}>₹{bc.totalIncentive.toLocaleString()}</td> */}
                        {/* <td><span className="badge badge-amber">₹{bc.pendingIncentive.toLocaleString()}</span></td> */}
                        {/* <td><span className="badge badge-green">₹{bc.clearedIncentive.toLocaleString()}</span></td> */}
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
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px 0" }}>
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
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 14,
                alignItems: "flex-end",
              }}
            >
              {/* Search */}
              <div>
                <div style={labelStyle}>Search</div>
                <input
                  className="form-input"
                  placeholder="Search by ID or name or phone or block..."
                  value={sbSearch}
                  onChange={(e) => setSbSearch(e.target.value)}
                  style={{ width: 230, fontSize: 13 }}
                />
              </div>
              {/* Sub Division — from DB */}
              <div>
                <div style={labelStyle}>Sub Division</div>
                <SearchableSelect
                  options={sbAllSubDivs.map((s) => ({ label: s, value: s }))}
                  value={sbSDFilter}
                  onChange={(v) => {
                    setSbSDFilter(v);
                    setSbBlockFilter("");
                    setSbGPFilter("");
                    setSbMunFilter("");
                    setSbVillageFilter("");
                    setSbWardFilter("");
                    setSbAddressType("");
                  }}
                  placeholder="All Sub Divisions"
                />
              </div>
              {/* Block — shows when SD selected */}
              {sbSDFilter && (
                <div>
                  <div style={labelStyle}>Block</div>
                  <SearchableSelect
                    options={sbBlockOptions.map((s) => ({
                      label: s,
                      value: s,
                    }))}
                    value={sbBlockFilter}
                    onChange={(v) => {
                      setSbBlockFilter(v);
                      setSbGPFilter("");
                      setSbMunFilter("");
                      setSbVillageFilter("");
                      setSbWardFilter("");
                      setSbAddressType("");
                    }}
                    placeholder="All Blocks"
                  />
                </div>
              )}
              {/* Type — GP or Municipality */}
              {sbBlockFilter &&
                (sbGPOptions.length > 0 || sbMunOptions.length > 0) && (
                  <div>
                    <div style={labelStyle}>Type</div>
                    <div
                      style={{
                        display: "flex",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                      }}
                    >
                      {(["", "gp", "municipality"] as const).map((opt, i) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setSbAddressType(opt);
                            setSbGPFilter("");
                            setSbMunFilter("");
                            setSbVillageFilter("");
                            setSbWardFilter("");
                          }}
                          style={{
                            padding: "7px 10px",
                            fontSize: 12,
                            fontWeight: sbAddressType === opt ? 600 : 400,
                            background:
                              sbAddressType === opt
                                ? "var(--green-dark)"
                                : "var(--surface)",
                            color:
                              sbAddressType === opt
                                ? "#fff"
                                : "var(--text-muted)",
                            border: "none",
                            borderLeft:
                              i > 0 ? "1px solid var(--border)" : "none",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {opt === ""
                            ? "All"
                            : opt === "gp"
                              ? "🌿 GP"
                              : "🏙 Mun"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              {/* GP */}
              {sbBlockFilter &&
                sbAddressType === "gp" &&
                sbGPOptions.length > 0 && (
                  <div>
                    <div style={labelStyle}>Gram Panchayat</div>
                    <SearchableSelect
                      options={sbGPOptions.map((s) => ({ label: s, value: s }))}
                      value={sbGPFilter}
                      onChange={(v) => {
                        setSbGPFilter(v);
                        setSbVillageFilter("");
                      }}
                      placeholder="All GPs"
                    />
                  </div>
                )}
              {/* Village */}
              {sbGPFilter && sbVillageOptions.length > 0 && (
                <div>
                  <div style={labelStyle}>Village</div>
                  <SearchableSelect
                    options={sbVillageOptions.map((s) => ({
                      label: s,
                      value: s,
                    }))}
                    value={sbVillageFilter}
                    onChange={setSbVillageFilter}
                    placeholder="All Villages"
                  />
                </div>
              )}
              {/* Municipality */}
              {sbBlockFilter &&
                sbAddressType === "municipality" &&
                sbMunOptions.length > 0 && (
                  <div>
                    <div style={labelStyle}>Municipality</div>
                    <SearchableSelect
                      options={sbMunOptions.map((s) => ({
                        label: s,
                        value: s,
                      }))}
                      value={sbMunFilter}
                      onChange={(v) => {
                        setSbMunFilter(v);
                        setSbWardFilter("");
                      }}
                      placeholder="All Municipalities"
                    />
                  </div>
                )}
              {/* Ward */}
              {sbMunFilter && sbWardOptions.length > 0 && (
                <div>
                  <div style={labelStyle}>Ward</div>
                  <SearchableSelect
                    options={sbWardOptions.map((s) => ({ label: s, value: s }))}
                    value={sbWardFilter}
                    onChange={setSbWardFilter}
                    placeholder="All Wards"
                  />
                </div>
              )}
              {/* Block Coordinator */}
              {(isAdmin || role === "receptionist") && (
                <div>
                  <div style={labelStyle}>Block Coordinator</div>
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
              {/* Date filter */}
              <div>
                <div style={labelStyle}>Date From</div>
                <input
                  type="date"
                  className="form-input"
                  key={`sb-from-${sbDateKey}`}
                  value={sbDateFrom}
                  onChange={(e) => setSbDateFrom(e.target.value)}
                  style={{ fontSize: 13, colorScheme: "light" }}
                />
              </div>
              <div>
                <div style={labelStyle}>Date To</div>
                <input
                  type="date"
                  className="form-input"
                  key={`sb-to-${sbDateKey}`}
                  value={sbDateTo}
                  onChange={(e) => setSbDateTo(e.target.value)}
                  style={{ fontSize: 13, colorScheme: "light" }}
                />
              </div>
              {/* ID filter */}
              <div style={{ alignSelf: "flex-end" }}>
                <div
                  style={{
                    display: "flex",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                  }}
                >
                  {(["", "with", "without"] as const).map((opt, i) => (
                    <button
                      key={opt}
                      onClick={() => setSbIdFilter(opt)}
                      style={{
                        padding: "7px 11px",
                        fontSize: 12,
                        fontWeight: sbIdFilter === opt ? 600 : 400,
                        background:
                          sbIdFilter === opt
                            ? "var(--green-dark)"
                            : "var(--surface)",
                        color:
                          sbIdFilter === opt ? "#fff" : "var(--text-muted)",
                        border: "none",
                        borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt === "" ? "All" : opt === "with" ? "✓ ID" : "⚠ No ID"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Reset */}
              {(sbSearch ||
                sbSDFilter ||
                sbBlockFilter ||
                sbGPFilter ||
                sbMunFilter ||
                sbVillageFilter ||
                sbWardFilter ||
                sbBCFilter ||
                sbIdFilter ||
                sbDateFrom ||
                sbDateTo) && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => {
                    setSbSearch("");
                    setSbSDFilter("");
                    setSbBlockFilter("");
                    setSbGPFilter("");
                    setSbMunFilter("");
                    setSbVillageFilter("");
                    setSbWardFilter("");
                    setSbAddressType("");
                    setSbBCFilter("");
                    setSbIdFilter("");
                    setSbDateFrom("");
                    setSbDateTo("");
                    setSbDateKey((k) => k + 1);
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
                    {(isAdmin || role === "receptionist") && (
                      <th>Block Coordinator</th>
                    )}
                    <SortTh
                      label="Patients"
                      k="totalPatients"
                      sortKey={sbSortKey}
                      sortDir={sbSortDir}
                      onSort={toggleSBSort}
                    />
                    {/* Total/Pending/Cleared — disabled for now */}
                    {/* {(isAdmin || isBC) && <><SortTh label="Total ₹" k="totalIncentive" .../><th>Pending</th><th>Cleared</th></>} */}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin || role === "receptionist" ? 8 : 7}>
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
                      <td colSpan={isAdmin || role === "receptionist" ? 8 : 7}>
                        <div className="empty-state">
                          <p>
                            {sbIdFilter === "without"
                              ? "All SBs have IDs."
                              : sbIdFilter === "with"
                                ? "No SBs with ID found."
                                : "No data found."}
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
                        {(isAdmin || role === "receptionist") && (
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
                        {/* <td>₹{row.totalIncentive.toLocaleString()}</td> */}
                        {/* <td><span className="badge badge-amber">₹{row.pendingIncentive.toLocaleString()}</span></td> */}
                        {/* <td><span className="badge badge-green">₹{row.clearedIncentive.toLocaleString()}</span></td> */}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PATIENT TABLE ── */}
        {activeSection === "patient" &&
          (() => {
            // Patient address cascade
            const patMatchedSD = locations.find((sd) => sd.name === patAddrSD);
            const patBlockOptions =
              patAddrSD && patMatchedSD
                ? patMatchedSD.blocks.map((b) => b.name).sort()
                : [];
            const patMatchedBlock = patMatchedSD?.blocks.find(
              (b) => b.name === patAddrBlock,
            );
            const patGPOptions =
              patAddrBlock && patMatchedBlock
                ? patMatchedBlock.gramPanchayats.map((g) => g.name).sort()
                : [];
            const patMunOptions =
              patAddrBlock && patMatchedBlock
                ? patMatchedBlock.municipalities.map((m) => m.name).sort()
                : [];
            const patMatchedGP = patMatchedBlock?.gramPanchayats.find(
              (g) => g.name === patAddrGP,
            );
            const patVillageOptions =
              patAddrGP && patMatchedGP
                ? patMatchedGP.villages.map((v) => v.name).sort()
                : [];
            const patMatchedMun = patMatchedBlock?.municipalities.find(
              (m) => m.name === patAddrMun,
            );
            const patWardOptions =
              patAddrMun && patMatchedMun
                ? patMatchedMun.wards.map((w) => w.name).sort()
                : [];
            const uniqueSBs = Array.from(
              new Map(
                allPatients.map((p) => [(p.helperId as any)?._id, p.helperId]),
              ).entries(),
            )
              .map(([id, h]) => ({
                _id: id,
                name: (h as any)?.name || "",
                block: (h as any)?.block || "",
              }))
              .filter((h) => h._id);
            const pq = patSearch.toLowerCase();
            const displayPats = allPatients
              .filter((p) => {
                if (
                  patDischargeFilter &&
                  (p.dischargeStatus || "admitted") !== patDischargeFilter
                )
                  return false;
                if (patStatusFilter && p.paymentStatus !== patStatusFilter)
                  return false;
                if (patSbFilter && (p.helperId as any)?._id !== patSbFilter)
                  return false;
                if (patDoaFrom || patDoaTo) {
                  const doa = new Date(p.doa);
                  if (patDoaFrom) {
                    const from = new Date(patDoaFrom);
                    from.setHours(0, 0, 0, 0);
                    if (doa < from) return false;
                  }
                  if (patDoaTo) {
                    const to = new Date(patDoaTo);
                    to.setHours(23, 59, 59, 999);
                    if (doa > to) return false;
                  }
                }
                if (patAddrSD && p.address?.subDivision !== patAddrSD)
                  return false;
                if (patAddrBlock && p.address?.block !== patAddrBlock)
                  return false;
                if (patAddrGP && p.address?.gramPanchayat !== patAddrGP)
                  return false;
                if (patAddrMun && p.address?.municipality !== patAddrMun)
                  return false;
                if (!pq) return true;
                return (
                  p.name.toLowerCase().includes(pq) ||
                  p.mobile.includes(pq) ||
                  p.ipdNo.toLowerCase().includes(pq) ||
                  (p.helperId as any)?.name?.toLowerCase().includes(pq)
                );
              })
              .sort((a: any, b: any) => {
                let va: any, vb: any;
                if (patSortKey === "doa") {
                  va = new Date(a.doa).getTime();
                  vb = new Date(b.doa).getTime();
                } else if (patSortKey === "name") {
                  va = a.name;
                  vb = b.name;
                } else {
                  va = a.ipdNo;
                  vb = b.ipdNo;
                }
                const r =
                  typeof va === "number"
                    ? va - vb
                    : String(va).localeCompare(String(vb));
                return patSortDir === "asc" ? r : -r;
              });
            const admittedCount = allPatients.filter(
              (p: any) =>
                !p.dischargeStatus || p.dischargeStatus === "admitted",
            ).length;
            const continuedCount = allPatients.filter(
              (p: any) => p.dischargeStatus === "continued",
            ).length;
            const transferredCount = allPatients.filter(
              (p: any) => p.dischargeStatus === "transferred",
            ).length;
            const hasPatFilter =
              patSearch ||
              patDischargeFilter ||
              patStatusFilter ||
              patSbFilter ||
              patDoaFrom ||
              patDoaTo ||
              patAddrSD;
            const showPayment = isAdmin || isBC;
            function togglePatSort(k: string) {
              if (patSortKey === k)
                setPatSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else {
                setPatSortKey(k);
                setPatSortDir("asc");
              }
            }

            return (
              <div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    margin: "0 0 16px 0",
                  }}
                >
                  Patients{" "}
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 400,
                    }}
                  >
                    ({displayPats.length})
                  </span>
                </h3>

                {/* Discharge status mini-cards */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    {
                      key: "",
                      label: "All",
                      count: allPatients.length,
                      color: "var(--text-muted)",
                      bg: "",
                    },
                    {
                      key: "admitted",
                      label: "Admitted",
                      count: admittedCount,
                      color: "var(--green)",
                      bg: "#dcfce7",
                    },
                    {
                      key: "continued",
                      label: "Continued",
                      count: continuedCount,
                      color: "#2563eb",
                      bg: "#dbeafe",
                    },
                    {
                      key: "transferred",
                      label: "Transferred",
                      count: transferredCount,
                      color: "var(--red)",
                      bg: "#fee2e2",
                    },
                  ].map((pill) => (
                    <div
                      key={pill.key}
                      onClick={() =>
                        setPatDischargeFilter(
                          patDischargeFilter === pill.key ? "" : pill.key,
                        )
                      }
                      style={{
                        padding: "10px 16px",
                        background:
                          patDischargeFilter === pill.key
                            ? pill.bg || "var(--gray-50)"
                            : "var(--surface)",
                        border: `2px solid ${patDischargeFilter === pill.key ? pill.color : "var(--border)"}`,
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        minWidth: 100,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: pill.color,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {pill.label}
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: pill.color,
                          marginTop: 2,
                        }}
                      >
                        {pill.count}
                      </div>
                    </div>
                  ))}
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
                    <div style={labelStyle}>Search</div>
                    <input
                      className="form-input"
                      placeholder="Search by Name or mobile or IPD or SB..."
                      value={patSearch}
                      onChange={(e) => setPatSearch(e.target.value)}
                      style={{ width: 230, fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Swasthya Bondhu</div>
                    <SearchableSelect
                      options={uniqueSBs.map((h) => ({
                        label: `${h.name} — ${h.block}`,
                        value: h._id,
                      }))}
                      value={patSbFilter}
                      onChange={setPatSbFilter}
                      placeholder="All SBs"
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>DOA From</div>
                    <input
                      type="date"
                      className="form-input"
                      key={`pdoa-from-${patDateKey}`}
                      value={patDoaFrom}
                      onChange={(e) => setPatDoaFrom(e.target.value)}
                      style={{ fontSize: 13, colorScheme: "light" }}
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>DOA To</div>
                    <input
                      type="date"
                      className="form-input"
                      key={`pdoa-to-${patDateKey}`}
                      value={patDoaTo}
                      onChange={(e) => setPatDoaTo(e.target.value)}
                      style={{ fontSize: 13, colorScheme: "light" }}
                    />
                  </div>
                  {showPayment && (
                    <div>
                      <div style={labelStyle}>Payment</div>
                      <select
                        style={{
                          fontSize: 13,
                          padding: "7px 10px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                        }}
                        value={patStatusFilter}
                        onChange={(e) => setPatStatusFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="pending">Pending</option>
                        <option value="clearance">Cleared</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <div style={labelStyle}>Sub Division</div>
                    <SearchableSelect
                      options={locations.map((sd) => ({
                        label: sd.name,
                        value: sd.name,
                      }))}
                      value={patAddrSD}
                      onChange={(v) => {
                        setPatAddrSD(v);
                        setPatAddrBlock("");
                        setPatAddrType("");
                        setPatAddrGP("");
                        setPatAddrMun("");
                        setPatAddrVillage("");
                        setPatAddrWard("");
                      }}
                      placeholder="All Sub Divs"
                    />
                  </div>
                  {patAddrSD && (
                    <div>
                      <div style={labelStyle}>Block</div>
                      <SearchableSelect
                        options={patBlockOptions.map((s) => ({
                          label: s,
                          value: s,
                        }))}
                        value={patAddrBlock}
                        onChange={(v) => {
                          setPatAddrBlock(v);
                          setPatAddrType("");
                          setPatAddrGP("");
                          setPatAddrMun("");
                          setPatAddrVillage("");
                          setPatAddrWard("");
                        }}
                        placeholder="All Blocks"
                      />
                    </div>
                  )}
                  {patAddrBlock &&
                    (patGPOptions.length > 0 || patMunOptions.length > 0) && (
                      <div>
                        <div style={labelStyle}>Type</div>
                        <div
                          style={{
                            display: "flex",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            overflow: "hidden",
                          }}
                        >
                          {(["", "gp", "municipality"] as const).map(
                            (opt, i) => (
                              <button
                                key={opt}
                                onClick={() => {
                                  setPatAddrType(opt);
                                  setPatAddrGP("");
                                  setPatAddrMun("");
                                  setPatAddrVillage("");
                                  setPatAddrWard("");
                                }}
                                style={{
                                  padding: "7px 10px",
                                  fontSize: 12,
                                  fontWeight: patAddrType === opt ? 600 : 400,
                                  background:
                                    patAddrType === opt
                                      ? "var(--green-dark)"
                                      : "var(--surface)",
                                  color:
                                    patAddrType === opt
                                      ? "#fff"
                                      : "var(--text-muted)",
                                  border: "none",
                                  borderLeft:
                                    i > 0 ? "1px solid var(--border)" : "none",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {opt === ""
                                  ? "All"
                                  : opt === "gp"
                                    ? "🌿 GP"
                                    : "🏙 Mun"}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  {patAddrBlock &&
                    patAddrType === "gp" &&
                    patGPOptions.length > 0 && (
                      <div>
                        <div style={labelStyle}>Gram Panchayat</div>
                        <SearchableSelect
                          options={patGPOptions.map((s) => ({
                            label: s,
                            value: s,
                          }))}
                          value={patAddrGP}
                          onChange={(v) => {
                            setPatAddrGP(v);
                            setPatAddrVillage("");
                          }}
                          placeholder="All GPs"
                        />
                      </div>
                    )}
                  {patAddrGP && patVillageOptions.length > 0 && (
                    <div>
                      <div style={labelStyle}>Village</div>
                      <SearchableSelect
                        options={patVillageOptions.map((s) => ({
                          label: s,
                          value: s,
                        }))}
                        value={patAddrVillage}
                        onChange={setPatAddrVillage}
                        placeholder="All Villages"
                      />
                    </div>
                  )}
                  {patAddrBlock &&
                    patAddrType === "municipality" &&
                    patMunOptions.length > 0 && (
                      <div>
                        <div style={labelStyle}>Municipality</div>
                        <SearchableSelect
                          options={patMunOptions.map((s) => ({
                            label: s,
                            value: s,
                          }))}
                          value={patAddrMun}
                          onChange={(v) => {
                            setPatAddrMun(v);
                            setPatAddrWard("");
                          }}
                          placeholder="All Municipalities"
                        />
                      </div>
                    )}
                  {patAddrMun && patWardOptions.length > 0 && (
                    <div>
                      <div style={labelStyle}>Ward</div>
                      <SearchableSelect
                        options={patWardOptions.map((s) => ({
                          label: s,
                          value: s,
                        }))}
                        value={patAddrWard}
                        onChange={setPatAddrWard}
                        placeholder="All Wards"
                      />
                    </div>
                  )}
                  <div
                    style={{
                      alignSelf: "flex-end",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Showing {displayPats.length}
                    </span>
                    {hasPatFilter && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setPatSearch("");
                          setPatDischargeFilter("");
                          setPatStatusFilter("");
                          setPatSbFilter("");
                          setPatDoaFrom("");
                          setPatDoaTo("");
                          setPatDateKey((k) => k + 1);
                          setPatAddrSD("");
                          setPatAddrBlock("");
                          setPatAddrType("");
                          setPatAddrGP("");
                          setPatAddrMun("");
                          setPatAddrVillage("");
                          setPatAddrWard("");
                        }}
                      >
                        ✕ Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th
                          onClick={() => togglePatSort("name")}
                          style={{
                            cursor: "pointer",
                            userSelect: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Patient{" "}
                          {patSortKey === "name" ? (
                            patSortDir === "asc" ? (
                              "↑"
                            ) : (
                              "↓"
                            )
                          ) : (
                            <span style={{ opacity: 0.3 }}>↕</span>
                          )}
                        </th>
                        <th>Mobile</th>
                        <th
                          onClick={() => togglePatSort("ipdNo")}
                          style={{
                            cursor: "pointer",
                            userSelect: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          IPD{" "}
                          {patSortKey === "ipdNo" ? (
                            patSortDir === "asc" ? (
                              "↑"
                            ) : (
                              "↓"
                            )
                          ) : (
                            <span style={{ opacity: 0.3 }}>↕</span>
                          )}
                        </th>
                        <th
                          onClick={() => togglePatSort("doa")}
                          style={{
                            cursor: "pointer",
                            userSelect: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          DOA{" "}
                          {patSortKey === "doa" ? (
                            patSortDir === "asc" ? (
                              "↑"
                            ) : (
                              "↓"
                            )
                          ) : (
                            <span style={{ opacity: 0.3 }}>↕</span>
                          )}
                        </th>
                        <th>Swasthya Bondhu</th>
                        <th>Address</th>
                        {showPayment && (
                          <>
                            <th>Incentive</th>
                            <th>Payment</th>
                          </>
                        )}
                        <th>Discharge</th>
                        <th></th>
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
                      ) : displayPats.length === 0 ? (
                        <tr>
                          <td colSpan={10}>
                            <div className="empty-state">
                              <p>No patients found.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        displayPats.map((p: any) => (
                          <tr key={p._id}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                            </td>
                            <td
                              style={{ fontFamily: "monospace", fontSize: 12 }}
                            >
                              {p.mobile}
                            </td>
                            <td
                              style={{ fontFamily: "monospace", fontSize: 12 }}
                            >
                              {p.ipdNo}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {new Date(p.doa).toLocaleDateString("en-IN")}
                            </td>
                            <td>
                              <div
                                style={{
                                  fontWeight: 500,
                                  fontSize: 13,
                                  color: "var(--green-dark)",
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  router.push(
                                    `/view/sb/${(p.helperId as any)?._id}?month=${selYear}-${selMonth}`,
                                  )
                                }
                              >
                                {(p.helperId as any)?.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {(p.helperId as any)?.block}
                              </div>
                            </td>
                            <td
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              {p.address?.type === "gp"
                                ? `🌿 ${p.address.gramPanchayat}${p.address.village ? ` / ${p.address.village}` : ""}`
                                : p.address?.type === "municipality"
                                  ? `🏙 ${p.address.municipality}${p.address.ward ? ` / ${p.address.ward}` : ""}`
                                  : "—"}
                            </td>
                            {showPayment && (
                              <>
                                <td style={{ fontWeight: 600 }}>
                                  ₹{p.incentiveAmount}
                                </td>
                                <td>
                                  <span
                                    className={`badge ${p.paymentStatus === "clearance" ? "badge-green" : "badge-amber"}`}
                                  >
                                    {p.paymentStatus === "clearance"
                                      ? "✓ Cleared"
                                      : "⏳ Pending"}
                                  </span>
                                </td>
                              </>
                            )}
                            <td>
                              <span
                                className={`badge ${p.dischargeStatus === "continued" ? "badge-green" : p.dischargeStatus === "transferred" ? "badge-red" : "badge-gray"}`}
                              >
                                {p.dischargeStatus === "continued"
                                  ? "✓ Continued"
                                  : p.dischargeStatus === "transferred"
                                    ? "↗ Transferred"
                                    : "🏥 Admitted"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedPatient(p)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );

  {
    /* Patient Detail Modal */
  }
  {
    selectedPatient && (
      <div
        className="modal-overlay"
        onClick={(e) =>
          e.target === e.currentTarget && setSelectedPatient(null)
        }
      >
        <div
          className="modal"
          style={{ maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}
        >
          <div className="modal-header">
            <h3>{selectedPatient.name}</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedPatient(null)}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {[
                { label: "Mobile", value: selectedPatient.mobile },
                { label: "IPD No.", value: selectedPatient.ipdNo },
                {
                  label: "DOA",
                  value: new Date(selectedPatient.doa).toLocaleDateString(
                    "en-IN",
                  ),
                },
                { label: "Aadhar", value: selectedPatient.aadharNumber || "—" },
                {
                  label: "Swastha Sath",
                  value: selectedPatient.swasthaSathNumber || "—",
                },
                { label: "Pincode", value: selectedPatient.pincode || "—" },
                {
                  label: "SB Name",
                  value: (selectedPatient.helperId as any)?.name || "—",
                },
                {
                  label: "Block",
                  value: (selectedPatient.helperId as any)?.block || "—",
                },
                ...(isAdmin || isBC
                  ? [
                      {
                        label: "Incentive",
                        value: `₹${selectedPatient.incentiveAmount}`,
                      },
                      {
                        label: "Payment",
                        value:
                          selectedPatient.paymentStatus === "clearance"
                            ? "✓ Cleared"
                            : "⏳ Pending",
                      },
                      {
                        label: "Blocking Amt",
                        value: selectedPatient.blockingAmount
                          ? `₹${selectedPatient.blockingAmount}`
                          : "—",
                      },
                      {
                        label: "Discharge Amt",
                        value: selectedPatient.dischargeAmount
                          ? `₹${selectedPatient.dischargeAmount}`
                          : "—",
                      },
                    ]
                  : []),
                {
                  label: "Discharge",
                  value:
                    selectedPatient.dischargeStatus === "continued"
                      ? "Continued"
                      : selectedPatient.dischargeStatus === "transferred"
                        ? "Transferred"
                        : "Admitted",
                },
                {
                  label: "Discharge Date",
                  value: selectedPatient.dischargeDate
                    ? new Date(
                        selectedPatient.dischargeDate,
                      ).toLocaleDateString("en-IN")
                    : "—",
                },
              ].map((f: any) => (
                <div key={f.label}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 2,
                    }}
                  >
                    {f.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{f.value}</div>
                </div>
              ))}
            </div>
            {selectedPatient.address?.type && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "var(--gray-50)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 6,
                  }}
                >
                  Address
                </div>
                <div style={{ fontSize: 13 }}>
                  {selectedPatient.address.type === "gp"
                    ? `🌿 ${selectedPatient.address.gramPanchayat}${selectedPatient.address.village ? ` / ${selectedPatient.address.village}` : ""} — ${selectedPatient.address.block}, ${selectedPatient.address.subDivision}`
                    : `🏙 ${selectedPatient.address.municipality}${selectedPatient.address.ward ? ` / ${selectedPatient.address.ward}` : ""} — ${selectedPatient.address.block}, ${selectedPatient.address.subDivision}`}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
