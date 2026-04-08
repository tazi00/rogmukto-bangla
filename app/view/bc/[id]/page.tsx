"use client";
import { useEffect, useState, Suspense } from "react";
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

interface BC {
  _id: string;
  coordinatorId: string;
  name: string;
  phone: string;
  subDivision: string;
  blocks: string[];
  address: string;
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
  };
  totalPatients: number;
  totalIncentive: number;
  pendingIncentive: number;
  clearedIncentive: number;
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

export default function BCDetailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: "center" }}>Loading...</div>
      }
    >
      <BCDetailInner />
    </Suspense>
  );
}

function BCDetailInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bcId = params.id as string;

  const now = new Date();
  const initMonth =
    searchParams.get("month") ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selYear, setSelYear] = useState(initMonth.split("-")[0]);
  const [selMonth, setSelMonth] = useState(initMonth.split("-")[1]);

  const [bc, setBc] = useState<BC | null>(null);
  const [sbPerf, setSbPerf] = useState<SBPerf[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Role
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const cookies = document.cookie
      .split(";")
      .reduce<Record<string, string>>((acc, c) => {
        const [k, v] = c.trim().split("=");
        acc[k] = v;
        return acc;
      }, {});
    setIsAdmin(cookies["role_hint"] === "admin");
  }, []);

  useEffect(() => {
    loadData();
  }, [bcId, selYear, selMonth]);

  async function loadData() {
    setLoading(true);
    try {
      const [bcRes, sbRes] = await Promise.all([
        fetch(`/api/block-coordinators`),
        fetch(`/api/reports?month=${selYear}-${selMonth}`),
      ]);
      if (bcRes.ok) {
        const bcs = await bcRes.json();
        const found = Array.isArray(bcs)
          ? bcs.find((b: BC) => b._id === bcId)
          : null;
        setBc(found || null);
      }
      if (sbRes.ok) {
        const data = await sbRes.json();
        // Filter to only this BC's SBs — we need helpers API for BC filter
        const helpersRes = await fetch(
          `/api/helpers?blockCoordinatorId=${bcId}`,
        );
        if (helpersRes.ok) {
          const helpers = await helpersRes.json();
          const helperIds = new Set(helpers.map((h: any) => h._id.toString()));
          const filtered = Array.isArray(data)
            ? data.filter(
                (r: SBPerf) =>
                  r.helper && helperIds.has(r.helper._id.toString()),
              )
            : [];
          setSbPerf(filtered);
        }
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
  const displaySBs = sbPerf
    .filter(
      (row) =>
        !q ||
        row.helper.name.toLowerCase().includes(q) ||
        row.helper.phone.includes(q) ||
        (row.helper.helperId || "").toLowerCase().includes(q) ||
        row.helper.block.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "name") {
        va = a.helper.name;
        vb = b.helper.name;
      } else if (sortKey === "block") {
        va = a.helper.block;
        vb = b.helper.block;
      } else if (sortKey === "totalPatients") {
        va = a.totalPatients;
        vb = b.totalPatients;
      } else if (sortKey === "totalIncentive") {
        va = a.totalIncentive;
        vb = b.totalIncentive;
      } else {
        va = a.helper.helperId || "";
        vb = b.helper.helperId || "";
      }
      const r =
        typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? r : -r;
    });

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
              Block Coordinator Detail
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
            {bc?.name || "Block Coordinator"}
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

        {/* BC Info Card */}
        {bc && (
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
                  Block Coordinator
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0" }}>
                  {bc.name}
                </h2>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  <span style={{ marginRight: 16 }}>
                    🪪 ID: <strong>{bc.coordinatorId}</strong>
                  </span>
                  <span style={{ marginRight: 16 }}>📞 {bc.phone}</span>
                  <span>📍 {bc.subDivision}</span>
                </div>
                <div
                  style={{
                    marginTop: 8,
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
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { label: "Swasthya Bondhu", value: sbPerf.length },
                  {
                    label: "Total Patients",
                    value: sbPerf.reduce((s, r) => s + r.totalPatients, 0),
                  },
                  ...(isAdmin
                    ? [
                        {
                          label: "Total ₹",
                          value: `₹${sbPerf.reduce((s, r) => s + r.totalIncentive, 0).toLocaleString()}`,
                        },
                        {
                          label: "Pending",
                          value: `₹${sbPerf.reduce((s, r) => s + r.pendingIncentive, 0).toLocaleString()}`,
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

        {/* SB Table */}
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
              Swasthya Bondhu under {bc?.name}{" "}
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
          <div style={{ marginBottom: 14 }}>
            <input
              className="form-input"
              placeholder="🔍 Search by ID, name, phone, block..."
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
                    label="SB ID"
                    k="helperId"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <SortTh
                    label="Name"
                    k="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <th>Phone</th>
                  <SortTh
                    label="Block"
                    k="block"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  <th>GP</th>
                  <th>Tag</th>
                  <SortTh
                    label="Patients"
                    k="totalPatients"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                  {isAdmin && (
                    <>
                      <SortTh
                        label="Total ₹"
                        k="totalIncentive"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
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
                ) : displaySBs.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state">
                        <p>No Swasthya Bondhu found.</p>
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
                      onClick={() =>
                        router.push(
                          `/view/sb/${row.helper._id}?month=${selYear}-${selMonth}`,
                        )
                      }
                    >
                      <td>
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
                      <td>
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
                      <td style={{ fontSize: 12 }}>{row.helper.block}</td>
                      <td style={{ fontSize: 12 }}>
                        {row.helper.gramPanchayat}
                      </td>
                      <td>
                        <span className="badge badge-green">
                          {row.helper.tag}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>
                        {row.totalPatients}
                      </td>
                      {isAdmin && (
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
      </div>
    </div>
  );
}
