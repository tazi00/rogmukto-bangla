"use client";
import { useEffect, useState, Suspense } from "react";
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
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("doa");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dischargeFilter, setDischargeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sbFilter, setSbFilter] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isBC, setIsBC] = useState(false);
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
    loadPatients();
  }, [selYear, selMonth]);

  async function loadPatients() {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients?month=${selYear}-${selMonth}`);
      if (!res.ok) {
        setPatients([]);
        return;
      }
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(k: string) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

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
      };
      if (showPayment) {
        base["Incentive ₹"] = p.incentiveAmount;
        base["Payment"] =
          p.paymentStatus === "clearance" ? "Cleared" : "Pending";
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
            alignItems: "center",
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
            flexWrap: "wrap",
            alignItems: "center",
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

        {/* Stats pills */}
        {patients.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                key: "",
                label: `All (${patients.length})`,
                color: "var(--text-muted)",
              },
              {
                key: "admitted",
                label: `Admitted (${patients.filter((p) => !p.dischargeStatus || p.dischargeStatus === "admitted").length})`,
                color: "var(--green)",
              },
              {
                key: "continued",
                label: `Continued (${patients.filter((p) => p.dischargeStatus === "continued").length})`,
                color: "#2563eb",
              },
              {
                key: "transferred",
                label: `Transferred (${patients.filter((p) => p.dischargeStatus === "transferred").length})`,
                color: "var(--red)",
              },
            ].map((pill) => (
              <button
                key={pill.key}
                onClick={() => setDischargeFilter(pill.key)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: dischargeFilter === pill.key ? 600 : 400,
                  border: `1.5px solid ${dischargeFilter === pill.key ? pill.color : "var(--border)"}`,
                  background:
                    dischargeFilter === pill.key
                      ? pill.color + "18"
                      : "var(--surface)",
                  color:
                    dischargeFilter === pill.key
                      ? pill.color
                      : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {pill.label}
              </button>
            ))}
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                alignSelf: "center",
              }}
            >
              Showing {displayPatients.length}
            </span>
          </div>
        )}

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
              placeholder="Name, mobile, IPD, SB..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              Swasthya Bondhu
            </div>
            <select
              style={{
                fontSize: 13,
                padding: "7px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                minWidth: 180,
              }}
              value={sbFilter}
              onChange={(e) => setSbFilter(e.target.value)}
            >
              <option value="">All</option>
              {uniqueSBs.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} — {h.block}
                </option>
              ))}
            </select>
          </div>
          {showPayment && (
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
                Payment
              </div>
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
          {(search || sbFilter || dischargeFilter || statusFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: "flex-end" }}
              onClick={() => {
                setSearch("");
                setSbFilter("");
                setDischargeFilter("");
                setStatusFilter("");
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
