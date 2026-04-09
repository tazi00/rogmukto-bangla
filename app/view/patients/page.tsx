"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

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

interface Patient {
  _id: string;
  name: string;
  mobile: string;
  ipdNo: string;
  doa: string;
  incentiveAmount: number;
  paymentStatus: string;
  paymentDetail?: any;
  aadharNumber?: string;
  pincode?: string;
  swasthaSathNumber?: string;
  dischargeStatus?: string;
  blockingAmount?: number;
  dischargeAmount?: number;
  dischargeDate?: string;
  helperId: {
    _id: string;
    name: string;
    block: string;
    subDivision: string;
    tag: string;
  };
  address?: any;
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

export default function PatientsViewPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: "center" }}>Loading...</div>
      }
    >
      <PatientsViewInner />
    </Suspense>
  );
}

function PatientsViewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const initMonth =
    searchParams.get("month") ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selYear, setSelYear] = useState(initMonth.split("-")[0]);
  const [selMonth, setSelMonth] = useState(initMonth.split("-")[1]);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]); // unfiltered for cards
  const [bcCount, setBcCount] = useState(0);
  const [sbCount, setSbCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("doa");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dischargeFilter, setDischargeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sbFilter, setSbFilter] = useState("");
  // DOA date range
  const [doaFrom, setDoaFrom] = useState("");
  const [doaTo, setDoaTo] = useState("");
  const [dateKey, setDateKey] = useState(0);
  // Address cascade
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
  const [addrSD, setAddrSD] = useState("");
  const [addrBlock, setAddrBlock] = useState("");
  const [addrType, setAddrType] = useState<"" | "gp" | "municipality">("");
  const [addrGP, setAddrGP] = useState("");
  const [addrMun, setAddrMun] = useState("");
  const [addrVillage, setAddrVillage] = useState("");
  const [addrWard, setAddrWard] = useState("");

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBC, setIsBC] = useState(false);

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 4,
  };

  useEffect(() => {
    const cookies = document.cookie
      .split(";")
      .reduce<Record<string, string>>((acc, c) => {
        const [k, v] = c.trim().split("=");
        acc[k] = v;
        return acc;
      }, {});
    setIsAdmin(cookies["role_hint"] === "admin");
    setIsBC(cookies["role_hint"] === "block-coordinator");
  }, []);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    loadAll();
  }, [selYear, selMonth]);

  async function loadAll() {
    setLoading(true);
    try {
      const [patRes, bcRes, sbRes] = await Promise.all([
        fetch(`/api/patients?month=${selYear}-${selMonth}`),
        fetch(`/api/block-coordinators`),
        fetch(`/api/helpers`),
      ]);
      if (patRes.ok) {
        const data = await patRes.json();
        const arr = Array.isArray(data) ? data : [];
        setPatients(arr);
        setAllPatients(arr);
      }
      if (bcRes.ok) {
        const d = await bcRes.json();
        setBcCount(Array.isArray(d) ? d.length : 0);
      }
      if (sbRes.ok) {
        const d = await sbRes.json();
        setSbCount(Array.isArray(d) ? d.length : 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  // Address cascade options
  const addrMatchedSD = locations.find((sd) => sd.name === addrSD);
  const addrBlockOptions =
    addrSD && addrMatchedSD
      ? addrMatchedSD.blocks.map((b) => b.name).sort()
      : [];
  const addrMatchedBlock = addrMatchedSD?.blocks.find(
    (b) => b.name === addrBlock,
  );
  const addrGPOptions =
    addrBlock && addrMatchedBlock
      ? addrMatchedBlock.gramPanchayats.map((g) => g.name).sort()
      : [];
  const addrMunOptions =
    addrBlock && addrMatchedBlock
      ? addrMatchedBlock.municipalities.map((m) => m.name).sort()
      : [];
  const addrMatchedGP = addrMatchedBlock?.gramPanchayats.find(
    (g) => g.name === addrGP,
  );
  const addrVillageOptions =
    addrGP && addrMatchedGP
      ? addrMatchedGP.villages.map((v) => v.name).sort()
      : [];
  const addrMatchedMun = addrMatchedBlock?.municipalities.find(
    (m) => m.name === addrMun,
  );
  const addrWardOptions =
    addrMun && addrMatchedMun
      ? addrMatchedMun.wards.map((w) => w.name).sort()
      : [];
  const addrAllSubDivs = locations.map((sd) => sd.name).sort();

  // Unique SBs for filter
  const uniqueSBs = Array.from(
    new Map(
      patients.map((p) => [(p.helperId as any)?._id, p.helperId]),
    ).entries(),
  )
    .map(([id, h]) => ({
      _id: id,
      name: (h as any)?.name || "",
      block: (h as any)?.block || "",
    }))
    .filter((h) => h._id);

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  const q = search.toLowerCase();
  const displayPatients = patients
    .filter((p) => {
      if (
        dischargeFilter &&
        (p.dischargeStatus || "admitted") !== dischargeFilter
      )
        return false;
      if (statusFilter && p.paymentStatus !== statusFilter) return false;
      if (sbFilter && (p.helperId as any)?._id !== sbFilter) return false;
      // DOA date range
      if (doaFrom || doaTo) {
        const doa = new Date(p.doa);
        if (doaFrom) {
          const from = new Date(doaFrom);
          from.setHours(0, 0, 0, 0);
          if (doa < from) return false;
        }
        if (doaTo) {
          const to = new Date(doaTo);
          to.setHours(23, 59, 59, 999);
          if (doa > to) return false;
        }
      }
      // Address cascade filters
      if (addrSD && p.address?.subDivision !== addrSD) return false;
      if (addrBlock && p.address?.block !== addrBlock) return false;
      if (addrGP && p.address?.gramPanchayat !== addrGP) return false;
      if (addrMun && p.address?.municipality !== addrMun) return false;
      if (addrVillage && p.address?.village !== addrVillage) return false;
      if (addrWard && p.address?.ward !== addrWard) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.mobile.includes(q) ||
        p.ipdNo.toLowerCase().includes(q) ||
        (p.helperId as any)?.name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "doa") {
        va = new Date(a.doa).getTime();
        vb = new Date(b.doa).getTime();
      } else if (sortKey === "name") {
        va = a.name;
        vb = b.name;
      } else if (sortKey === "ipdNo") {
        va = a.ipdNo;
        vb = b.ipdNo;
      } else {
        va = "";
        vb = "";
      }
      const r =
        typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? r : -r;
    });

  const showPayment = isAdmin || isBC;
  const monLabel = MONTHS.find((m) => m.val === selMonth)?.label || selMonth;

  // Stats
  const admittedCount = allPatients.filter(
    (p) => !p.dischargeStatus || p.dischargeStatus === "admitted",
  ).length;
  const continuedCount = allPatients.filter(
    (p) => p.dischargeStatus === "continued",
  ).length;
  const transferredCount = allPatients.filter(
    (p) => p.dischargeStatus === "transferred",
  ).length;

  function resetFilters() {
    setSearch("");
    setDischargeFilter("");
    setStatusFilter("");
    setSbFilter("");
    setDoaFrom("");
    setDoaTo("");
    setDateKey((k) => k + 1);
    setAddrSD("");
    setAddrBlock("");
    setAddrType("");
    setAddrGP("");
    setAddrMun("");
    setAddrVillage("");
    setAddrWard("");
  }
  const hasFilter =
    search ||
    dischargeFilter ||
    statusFilter ||
    sbFilter ||
    doaFrom ||
    doaTo ||
    addrSD ||
    addrBlock ||
    addrGP ||
    addrMun;

  function exportExcel() {
    const mon = MONTHS.find((m) => m.val === selMonth)?.label || selMonth;
    const rows = displayPatients.map((p) => {
      const base: any = {
        Name: p.name,
        Mobile: p.mobile,
        "IPD No.": p.ipdNo,
        DOA: new Date(p.doa).toLocaleDateString("en-IN"),
        Aadhar: p.aadharNumber || "",
        "Swastha Sath": p.swasthaSathNumber || "",
        Pincode: p.pincode || "",
        "SB Name": (p.helperId as any)?.name || "",
        Block: (p.helperId as any)?.block || "",
        Address:
          p.address?.type === "gp"
            ? `${p.address.gramPanchayat} / ${p.address.village || ""}`
            : p.address?.type === "municipality"
              ? `${p.address.municipality} / ${p.address.ward || ""}`
              : "",
        Discharge: p.dischargeStatus || "admitted",
        "Discharge Date": p.dischargeDate
          ? new Date(p.dischargeDate).toLocaleDateString("en-IN")
          : "",
      };
      if (showPayment) {
        base["Incentive ₹"] = p.incentiveAmount;
        base["Payment"] =
          p.paymentStatus === "clearance" ? "Cleared" : "Pending";
        base["Blocking Amt"] = p.blockingAmount || "";
        base["Discharge Amt"] = p.dischargeAmount || "";
      }
      return base;
    });
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map((k) => ({
      wch: Math.max(k.length, 14),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Patients`);
    XLSX.writeFile(wb, `Patients_${mon}_${selYear}.xlsx`);
  }

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
              Patients — {monLabel} {selYear}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/view?month=${selYear}-${selMonth}`)}
          style={{
            border: "1px solid rgba(255,255,255,0.5)",
            color: "#fff",
            padding: "7px 18px",
            borderRadius: 30,
            fontSize: 13,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </header>

      <div style={{ padding: "20px 24px" }}>
        {/* Breadcrumb */}
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 16,
            display: "flex",
            gap: 6,
          }}
        >
          <span
            style={{ cursor: "pointer", color: "var(--green-dark)" }}
            onClick={() => router.push(`/view?month=${selYear}-${selMonth}`)}
          >
            Dashboard
          </span>
          <span>›</span>
          <span style={{ fontWeight: 500, color: "var(--text)" }}>
            Patients
          </span>
        </div>

        {/* Year/Month + Export */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            alignItems: "center",
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
            }}
            value={selYear}
            onChange={(e) => setSelYear(e.target.value)}
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
            }}
            value={selMonth}
            onChange={(e) => setSelMonth(e.target.value)}
          >
            {MONTHS.map((m) => (
              <option key={m.val} value={m.val}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary"
            onClick={exportExcel}
            style={{ fontSize: 13 }}
          >
            📥 Export Excel
          </button>
        </div>

        {/* ── 3 STAT CARDS ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {/* BC Card — navigates back to BC tab */}
          <div
            onClick={() => router.push(`/view?month=${selYear}-${selMonth}`)}
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
              Block Coordinators
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--text)",
                marginTop: 4,
              }}
            >
              {bcCount}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}
            >
              ← View list
            </div>
          </div>
          {/* SB Card */}
          <div
            onClick={() =>
              router.push(`/view?month=${selYear}-${selMonth}&section=sb`)
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
              Swasthya Bondhu
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--text)",
                marginTop: 4,
              }}
            >
              {sbCount}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}
            >
              ← View list
            </div>
          </div>
          {/* Patients Card — active */}
          <div
            style={{
              padding: "16px 20px",
              background: "var(--green-dark)",
              border: "2px solid var(--green-dark)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
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
                color: "#fff",
                marginTop: 4,
              }}
            >
              {allPatients.length}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
                marginTop: 2,
              }}
            >
              This month
            </div>
          </div>
        </div>
        <div className="flex">
          {/* Admitted */}
          <div
            onClick={() =>
              setDischargeFilter(
                dischargeFilter === "admitted" ? "" : "admitted",
              )
            }
            style={{
              padding: "16px 20px",
              background:
                dischargeFilter === "admitted" ? "#dcfce7" : "var(--surface)",
              border: `2px solid ${dischargeFilter === "admitted" ? "var(--green)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--green)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Admitted
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--green)",
                marginTop: 4,
              }}
            >
              {admittedCount}
            </div>
          </div>
          {/* Continued */}
          <div
            onClick={() =>
              setDischargeFilter(
                dischargeFilter === "continued" ? "" : "continued",
              )
            }
            style={{
              padding: "16px 20px",
              background:
                dischargeFilter === "continued" ? "#dbeafe" : "var(--surface)",
              border: `2px solid ${dischargeFilter === "continued" ? "#2563eb" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#2563eb",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Continued
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#2563eb",
                marginTop: 4,
              }}
            >
              {continuedCount}
            </div>
          </div>
          {/* Transferred */}
          <div
            onClick={() =>
              setDischargeFilter(
                dischargeFilter === "transferred" ? "" : "transferred",
              )
            }
            style={{
              padding: "16px 20px",
              background:
                dischargeFilter === "transferred"
                  ? "#fee2e2"
                  : "var(--surface)",
              border: `2px solid ${dischargeFilter === "transferred" ? "var(--red)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--red)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Transferred
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--red)",
                marginTop: 4,
              }}
            >
              {transferredCount}
            </div>
          </div>
        </div>

        {/* ── FILTERS ── */}
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
              placeholder="Search by Name or mobile or IPD or SB..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 230, fontSize: 13 }}
            />
          </div>
          {/* SB filter */}
          <div>
            <div style={labelStyle}>Swasthya Bondhu</div>
            <SearchableSelect
              options={uniqueSBs.map((h) => ({
                label: `${h.name} — ${h.block}`,
                value: h._id,
              }))}
              value={sbFilter}
              onChange={setSbFilter}
              placeholder="All SBs"
            />
          </div>
          {/* DOA Date range */}
          <div>
            <div style={labelStyle}>DOA From</div>
            <input
              type="date"
              className="form-input"
              key={`doa-from-${dateKey}`}
              value={doaFrom}
              onChange={(e) => setDoaFrom(e.target.value)}
              style={{ fontSize: 13, colorScheme: "light" }}
            />
          </div>
          <div>
            <div style={labelStyle}>DOA To</div>
            <input
              type="date"
              className="form-input"
              key={`doa-to-${dateKey}`}
              value={doaTo}
              onChange={(e) => setDoaTo(e.target.value)}
              style={{ fontSize: 13, colorScheme: "light" }}
            />
          </div>
          {/* Payment status */}
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="clearance">Cleared</option>
              </select>
            </div>
          )}
          {/* Address — Sub Division */}
          <div>
            <div style={labelStyle}>Sub Division</div>
            <SearchableSelect
              options={addrAllSubDivs.map((s) => ({ label: s, value: s }))}
              value={addrSD}
              onChange={(v) => {
                setAddrSD(v);
                setAddrBlock("");
                setAddrType("");
                setAddrGP("");
                setAddrMun("");
                setAddrVillage("");
                setAddrWard("");
              }}
              placeholder="All Sub Divs"
            />
          </div>
          {/* Block */}
          {addrSD && (
            <div>
              <div style={labelStyle}>Block</div>
              <SearchableSelect
                options={addrBlockOptions.map((s) => ({ label: s, value: s }))}
                value={addrBlock}
                onChange={(v) => {
                  setAddrBlock(v);
                  setAddrType("");
                  setAddrGP("");
                  setAddrMun("");
                  setAddrVillage("");
                  setAddrWard("");
                }}
                placeholder="All Blocks"
              />
            </div>
          )}
          {/* Type */}
          {addrBlock &&
            (addrGPOptions.length > 0 || addrMunOptions.length > 0) && (
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
                        setAddrType(opt);
                        setAddrGP("");
                        setAddrMun("");
                        setAddrVillage("");
                        setAddrWard("");
                      }}
                      style={{
                        padding: "7px 10px",
                        fontSize: 12,
                        fontWeight: addrType === opt ? 600 : 400,
                        background:
                          addrType === opt
                            ? "var(--green-dark)"
                            : "var(--surface)",
                        color: addrType === opt ? "#fff" : "var(--text-muted)",
                        border: "none",
                        borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt === "" ? "All" : opt === "gp" ? "🌿 GP" : "🏙 Mun"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          {/* GP */}
          {addrBlock && addrType === "gp" && addrGPOptions.length > 0 && (
            <div>
              <div style={labelStyle}>Gram Panchayat</div>
              <SearchableSelect
                options={addrGPOptions.map((s) => ({ label: s, value: s }))}
                value={addrGP}
                onChange={(v) => {
                  setAddrGP(v);
                  setAddrVillage("");
                }}
                placeholder="All GPs"
              />
            </div>
          )}
          {/* Village */}
          {addrGP && addrVillageOptions.length > 0 && (
            <div>
              <div style={labelStyle}>Village</div>
              <SearchableSelect
                options={addrVillageOptions.map((s) => ({
                  label: s,
                  value: s,
                }))}
                value={addrVillage}
                onChange={setAddrVillage}
                placeholder="All Villages"
              />
            </div>
          )}
          {/* Municipality */}
          {addrBlock &&
            addrType === "municipality" &&
            addrMunOptions.length > 0 && (
              <div>
                <div style={labelStyle}>Municipality</div>
                <SearchableSelect
                  options={addrMunOptions.map((s) => ({ label: s, value: s }))}
                  value={addrMun}
                  onChange={(v) => {
                    setAddrMun(v);
                    setAddrWard("");
                  }}
                  placeholder="All Municipalities"
                />
              </div>
            )}
          {/* Ward */}
          {addrMun && addrWardOptions.length > 0 && (
            <div>
              <div style={labelStyle}>Ward</div>
              <SearchableSelect
                options={addrWardOptions.map((s) => ({ label: s, value: s }))}
                value={addrWard}
                onChange={setAddrWard}
                placeholder="All Wards"
              />
            </div>
          )}
          {/* Showing count + Reset */}
          <div
            style={{
              alignSelf: "flex-end",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Showing {displayPatients.length}
            </span>
            {hasFilter && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={resetFilters}
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <SortTh
                  label="Patient"
                  k="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <th>Mobile</th>
                <SortTh
                  label="IPD"
                  k="ipdNo"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="DOA"
                  k="doa"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
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
              ) : displayPatients.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <p>No patients found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayPatients.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {p.mobile}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
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
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {(p.helperId as any)?.block}
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
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

      {/* Patient Detail Modal */}
      {selectedPatient && (
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
                    label: "Date of Admission",
                    value: new Date(selectedPatient.doa).toLocaleDateString(
                      "en-IN",
                    ),
                  },
                  {
                    label: "Aadhar",
                    value: selectedPatient.aadharNumber || "—",
                  },
                  {
                    label: "Swastha Sath No.",
                    value: selectedPatient.swasthaSathNumber || "—",
                  },
                  { label: "Pincode", value: selectedPatient.pincode || "—" },
                  {
                    label: "Swasthya Bondhu",
                    value: (selectedPatient.helperId as any)?.name || "—",
                  },
                  {
                    label: "Block",
                    value: (selectedPatient.helperId as any)?.block || "—",
                  },
                  ...(showPayment
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
                ].map((f) => (
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
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {f.value}
                    </div>
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
      )}
    </div>
  );
}
