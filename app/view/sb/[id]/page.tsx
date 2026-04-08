"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";

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

interface Helper {
  _id: string;
  helperId: string;
  name: string;
  phone: string;
  subDivision: string;
  block: string;
  gramPanchayats: { gpName: string; villages: string[] }[];
  municipalities: { municipalityName: string; wards: string[] }[];
  tag: string;
  blockCoordinatorId?: { _id: string; name: string; coordinatorId: string };
}
interface Patient {
  _id: string;
  name: string;
  mobile: string;
  ipdNo: string;
  doa: string;
  incentiveAmount: number;
  paymentStatus: string;
  aadharNumber?: string;
  pincode?: string;
  swasthaSathNumber?: string;
  dischargeStatus?: string;
  blockingAmount?: number;
  dischargeAmount?: number;
  dischargeDate?: string;
  address?: any;
  helperId: any;
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

export default function SBDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sbId = params.id as string;

  const now = new Date();
  const initMonth =
    searchParams.get("month") ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selYear, setSelYear] = useState(initMonth.split("-")[0]);
  const [selMonth, setSelMonth] = useState(initMonth.split("-")[1]);

  const [helper, setHelper] = useState<Helper | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("doa");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dischargeFilter, setDischargeFilter] = useState("");
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
    loadData();
  }, [sbId, selYear, selMonth]);

  async function loadData() {
    setLoading(true);
    try {
      const [helpersRes, patientsRes] = await Promise.all([
        fetch(`/api/helpers`),
        fetch(`/api/patients?helperId=${sbId}&month=${selYear}-${selMonth}`),
      ]);
      if (helpersRes.ok) {
        const helpers = await helpersRes.json();
        const found = Array.isArray(helpers)
          ? helpers.find((h: Helper) => h._id === sbId)
          : null;
        setHelper(found || null);
      }
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(Array.isArray(data) ? data : []);
      }
    } catch {
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

  const q = search.toLowerCase();
  const displayPatients = patients
    .filter((p) => {
      if (
        dischargeFilter &&
        (p.dischargeStatus || "admitted") !== dischargeFilter
      )
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.mobile.includes(q) ||
        p.ipdNo.toLowerCase().includes(q)
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
  const bcId = (helper?.blockCoordinatorId as any)?._id;
  const bcName = (helper?.blockCoordinatorId as any)?.name;

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
              Swasthya Bondhu Detail
            </p>
          </div>
        </div>
        <button
          onClick={() => router.back()}
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
            flexWrap: "wrap",
          }}
        >
          <span
            style={{ cursor: "pointer", color: "var(--green-dark)" }}
            onClick={() => router.push(`/view?month=${selYear}-${selMonth}`)}
          >
            Dashboard
          </span>
          {bcId && isAdmin && (
            <>
              <span>›</span>
              <span
                style={{ cursor: "pointer", color: "var(--green-dark)" }}
                onClick={() =>
                  router.push(`/view/bc/${bcId}?month=${selYear}-${selMonth}`)
                }
              >
                {bcName}
              </span>
            </>
          )}
          <span>›</span>
          <span style={{ fontWeight: 500, color: "var(--text)" }}>
            {helper?.name || "Swasthya Bondhu"}
          </span>
        </div>

        {/* Year/Month */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
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
        </div>

        {/* SB Info Card */}
        {helper && (
          <div
            className="card"
            style={{ padding: "20px 24px", marginBottom: 24 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Swasthya Bondhu
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0" }}>
                  {helper.name}
                </h2>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {helper.helperId && (
                    <span style={{ marginRight: 16 }}>
                      🪪 <strong>{helper.helperId}</strong>
                    </span>
                  )}
                  <span style={{ marginRight: 16 }}>📞 {helper.phone}</span>
                  <span style={{ marginRight: 16 }}>
                    📍 {helper.subDivision} › {helper.block}
                  </span>
                </div>
                {helper.gramPanchayats?.length > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    🌿 {helper.gramPanchayats.map((g) => g.gpName).join(", ")}
                  </div>
                )}
                {helper.municipalities?.length > 0 && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    🏙{" "}
                    {helper.municipalities
                      .map((m) => m.municipalityName)
                      .join(", ")}
                  </div>
                )}
                {bcName && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Block Coordinator:{" "}
                    </span>
                    {isAdmin && bcId ? (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--green-dark)",
                          textDecoration: "underline",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          router.push(
                            `/view/bc/${bcId}?month=${selYear}-${selMonth}`,
                          )
                        }
                      >
                        {bcName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12 }}>{bcName}</span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { label: "Patients", value: patients.length },
                  {
                    label: "Admitted",
                    value: patients.filter(
                      (p) =>
                        !p.dischargeStatus || p.dischargeStatus === "admitted",
                    ).length,
                  },
                  ...(showPayment
                    ? [
                        {
                          label: "Total ₹",
                          value: `₹${patients.reduce((s, p) => s + p.incentiveAmount, 0).toLocaleString()}`,
                        },
                        {
                          label: "Pending",
                          value: `₹${patients
                            .filter((p) => p.paymentStatus === "pending")
                            .reduce((s, p) => s + p.incentiveAmount, 0)
                            .toLocaleString()}`,
                          accent: true,
                        },
                      ]
                    : []),
                ].map((s: any) => (
                  <div key={s.label} style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: s.accent ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Patient Table */}
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
              Patients{" "}
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontWeight: 400,
                }}
              >
                ({displayPatients.length})
              </span>
            </h3>
          </div>

          {/* Discharge pills */}
          {patients.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 14,
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
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <input
              className="form-input"
              placeholder="🔍 Search by name or mobile or IPD ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 320, fontSize: 13 }}
            />
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
                  <th>Address</th>
                  {showPayment && (
                    <>
                      <th>Incentive</th>
                      <th>Payment</th>
                    </>
                  )}
                  <th>Discharge</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9}>
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
                    <td colSpan={9}>
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
                  ...(showPayment
                    ? [
                        {
                          label: "Incentive",
                          value: `₹${selectedPatient.incentiveAmount}`,
                        },
                        {
                          label: "Payment Status",
                          value:
                            selectedPatient.paymentStatus === "clearance"
                              ? "✓ Cleared"
                              : "⏳ Pending",
                        },
                        {
                          label: "Blocking Amount",
                          value: selectedPatient.blockingAmount
                            ? `₹${selectedPatient.blockingAmount}`
                            : "—",
                        },
                        {
                          label: "Discharge Amount",
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
