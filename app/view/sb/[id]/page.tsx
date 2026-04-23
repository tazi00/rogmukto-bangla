"use client";
import { Suspense, useEffect, useState } from "react";
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
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: "center" }}>Loading...</div>
      }
    >
      <SBDetailInner />
    </Suspense>
  );
}

function SBDetailInner() {
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

  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
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
      // Fetch surveys for this SB
      const survRes = await fetch(`/api/surveys?sbId=${sbId}`);
      if (survRes.ok) {
        const survData = await survRes.json();
        const list = Array.isArray(survData) ? survData : [];
        setSurveys(list);
        setSelectedSurvey(list.length > 0 ? list[0] : null);
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
                    label: "Blocking Amt",
                    value: patients.reduce(
                      (s, p) => s + (p?.blockingAmount || 0),
                      0,
                    ),
                  },
                  {
                    label: "Discharge Amt",
                    value: patients.reduce(
                      (s, p) => s + (p?.dischargeAmount || 0),
                      0,
                    ),
                  },
                  // {
                  //   label: "Discharged",
                  //   value: patients.filter(
                  //     (p) =>
                  //       !p.dischargeStatus || p.dischargeStatus === "admitted",
                  //   ).length,
                  // },

                  // ...(showPayment
                  //   ? [
                  //       {
                  //         label: "Total ₹",
                  //         value: `₹${patients.reduce((s, p) => s + p.incentiveAmount, 0).toLocaleString()}`,
                  //       },
                  //       {
                  //         label: "Pending",
                  //         value: `₹${patients
                  //           .filter((p) => p.paymentStatus === "pending")
                  //           .reduce((s, p) => s + p.incentiveAmount, 0)
                  //           .toLocaleString()}`,
                  //         accent: true,
                  //       },
                  //     ]
                  //   : []),
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
              placeholder="🔍 Search by name or mobile or IPD..."
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
                      <th>Blocking Amt</th>
                      <th>Discharge Amt</th>
                      <th>Status</th>
                    </>
                  )}
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
                            ₹{p.blockingAmount}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            ₹{p.dischargeAmount}
                          </td>
                          {/* <td style={{ fontWeight: 600 }}>
                            {p.dischargeStatus}
                          </td> */}
                          {/* <td>
                            <span
                              className={`badge ${p.paymentStatus === "clearance" ? "badge-green" : "badge-amber"}`}
                            >
                              {p.paymentStatus === "clearance"
                                ? "✓ Cleared"
                                : "⏳ Pending"}
                            </span>
                          </td> */}
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

      {/* ══ Survey Families Section ══ */}
      {surveys.length > 0 && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 32px" }}>
          <div style={{ display: "flex", gap: 24 }}>
            {/* Left — family list */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                Survey Families{" "}
                <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>({surveys.length})</span>
              </h3>
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {surveys.map((s) => (
                  <div key={s._id} onClick={() => setSelectedSurvey(s)}
                    style={{
                      padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                      background: selectedSurvey?._id === s._id ? "#eff6ff" : "#fff",
                      borderLeft: selectedSurvey?._id === s._id ? "3px solid #3b82f6" : "3px solid transparent",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.familyName} Family</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                      {s.village || s.ward || "—"} · {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </div>
                    {s.healthIssueDetected && s.healthIssues?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {s.healthIssues.slice(0, 2).map((hi: any, i: number) => {
                          const cfg: any = { serious: { label: "Serious", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" }, within_1_month: { label: "Within 1 Month", color: "#ea580c", bg: "#fff7ed", border: "#fdba74" }, within_2_months: { label: "Within 2 Months", color: "#ca8a04", bg: "#fefce8", border: "#fde047" }, others: { label: "Others", color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" } }[hi.type] || { label: hi.type, color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" };
                          return <span key={i} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 600 }}>{cfg.label}</span>;
                        })}
                        {s.healthIssues.length > 2 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{s.healthIssues.length - 2} more</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — selected family detail */}
            {selectedSurvey && (
              <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid var(--border)", padding: "20px 24px" }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedSurvey.familyName} Family</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                  {selectedSurvey.village || selectedSurvey.ward || "—"} · Surveyed on {new Date(selectedSurvey.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Members", m: selectedSurvey.membersM, f: selectedSurvey.membersF },
                    { label: "Children", m: selectedSurvey.childM, f: selectedSurvey.childF },
                    { label: "Above 65", m: selectedSurvey.above65M, f: selectedSurvey.above65F },
                  ].map(({ label, m, f }) => (
                    <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{label}</div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Male</div><div style={{ fontSize: 18, fontWeight: 700 }}>{m}</div></div>
                        <div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Female</div><div style={{ fontSize: 18, fontWeight: 700 }}>{f}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedSurvey.healthIssueDetected && selectedSurvey.healthIssues?.length > 0 ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏥 Health Issues Detected</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedSurvey.healthIssues.map((hi: any, i: number) => {
                        const cfg: any = { serious: { label: "Serious", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" }, within_1_month: { label: "Within 1 Month", color: "#ea580c", bg: "#fff7ed", border: "#fdba74" }, within_2_months: { label: "Within 2 Months", color: "#ca8a04", bg: "#fefce8", border: "#fde047" }, others: { label: "Others", color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" } }[hi.type] || { label: hi.type, color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" };
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 15, color: cfg.color }}>{hi.whose}</div>
                              <div style={{ fontSize: 13, color: cfg.color, opacity: 0.8, marginTop: 2 }}>Age: {hi.age} years</div>
                            </div>
                            <span style={{ padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: "#fff", color: cfg.color, border: `1.5px solid ${cfg.border}` }}>{cfg.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "14px 16px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", fontSize: 14, fontWeight: 600 }}>
                    ✅ No health issues detected
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
                    label: "swasthya sathi No.",
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
