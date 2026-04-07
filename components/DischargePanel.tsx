"use client";
import { useState } from "react";

interface Helper {
  name: string;
  block: string;
}
interface Patient {
  _id: string;
  name: string;
  mobile: string;
  ipdNo: string;
  doa: string;
  incentiveAmount: number;
  dischargeStatus: string;
  paymentStatus: string;
  helperId: Helper;
  address?: any;
  aadharNumber?: string;
  swasthaSathNumber?: string;
}

interface Props {
  patients: Patient[];
  onRefresh: () => void;
}

export default function DischargePanel({ patients, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [action, setAction] = useState<"continue" | "transfer" | null>(null);
  const [blockingAmount, setBlockingAmount] = useState("");
  const [dischargeAmount, setDischargeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search filter — only admitted patients
  const admitted = patients.filter(
    (p) => p.dischargeStatus === "admitted" || !p.dischargeStatus,
  );
  const filtered = admitted.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      p.ipdNo.toLowerCase().includes(q) ||
      p.helperId?.name?.toLowerCase().includes(q)
    );
  });

  function selectPatient(p: Patient) {
    setSelectedPatient(p);
    setAction(null);
    setBlockingAmount("");
    setDischargeAmount("");
    setError("");
  }

  async function handleSubmit() {
    if (!selectedPatient || !action) return;
    if (action === "continue" && (!blockingAmount || !dischargeAmount)) {
      setError("Enter both blocking and discharge amounts");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/discharge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          action,
          blockingAmount: Number(blockingAmount),
          dischargeAmount: Number(dischargeAmount),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      setSuccess(
        `Patient "${selectedPatient.name}" — ${action === "continue" ? "Admission Continued" : "Transferred"} successfully!`,
      );
      setSelectedPatient(null);
      setAction(null);
      onRefresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const btnStyle = (active: boolean, color: string): React.CSSProperties => ({
    flex: 1,
    padding: "12px 8px",
    borderRadius: "var(--radius-sm)",
    border: `2px solid ${active ? color : "var(--border)"}`,
    background: active ? color + "15" : "var(--surface)",
    color: active ? color : "var(--text-muted)",
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div>
      {success && (
        <div className="alert alert-success" style={{ marginBottom: 14 }}>
          {success}
        </div>
      )}

      {/* Search */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder="🔍 Search by Patient Name, Phone, IPD No, or Swasthya Bondhu..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedPatient(null);
            setAction(null);
          }}
        />
        {search && (
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}
          >
            {filtered.length} admitted patient(s) found
          </div>
        )}
      </div>

      {/* Search results */}
      {search && !selectedPatient && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "14px",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              No admitted patients found
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p._id}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--gray-100)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--gray-50)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "")
                }
                onClick={() => selectPatient(p)}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    📞 {p.mobile} · IPD: {p.ipdNo} · 👤 {p.helperId?.name}
                  </div>
                </div>
                <span className="badge badge-amber">Admitted</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Selected patient details + action */}
      {selectedPatient && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {/* Patient info */}
          <div
            style={{
              padding: "14px 16px",
              background: "var(--green-light)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--green-dark)",
                  }}
                >
                  {selectedPatient.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--green-dark)",
                    opacity: 0.8,
                    marginTop: 4,
                  }}
                >
                  📞 {selectedPatient.mobile} · IPD: {selectedPatient.ipdNo} ·
                  DOA:{" "}
                  {new Date(selectedPatient.doa).toLocaleDateString("en-IN")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--green-dark)",
                    opacity: 0.8,
                    marginTop: 2,
                  }}
                >
                  👤 {selectedPatient.helperId?.name} · 📍{" "}
                  {selectedPatient.helperId?.block}
                </div>
                {selectedPatient.address?.type === "gp" &&
                  selectedPatient.address.gramPanchayat && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--green-dark)",
                        opacity: 0.7,
                        marginTop: 2,
                      }}
                    >
                      🌿 {selectedPatient.address.gramPanchayat}
                      {selectedPatient.address.village
                        ? ` / ${selectedPatient.address.village}`
                        : ""}
                    </div>
                  )}
                {selectedPatient.address?.type === "municipality" &&
                  selectedPatient.address.municipality && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--green-dark)",
                        opacity: 0.7,
                        marginTop: 2,
                      }}
                    >
                      🏙 {selectedPatient.address.municipality}
                      {selectedPatient.address.ward
                        ? ` / ${selectedPatient.address.ward}`
                        : ""}
                    </div>
                  )}
              </div>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "var(--green-dark)",
                }}
                onClick={() => {
                  setSelectedPatient(null);
                  setAction(null);
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Action selection */}
          <div style={{ padding: "16px" }}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 10,
              }}
            >
              Select Discharge Action
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <button
                style={btnStyle(action === "continue", "var(--green)")}
                onClick={() =>
                  setAction(action === "continue" ? null : "continue")
                }
              >
                ✓ Admission Continue
              </button>
              <button
                style={btnStyle(action === "transfer", "var(--red)")}
                onClick={() =>
                  setAction(action === "transfer" ? null : "transfer")
                }
              >
                ↗ Transfer
              </button>
            </div>

            {/* Admission Continue — amount fields */}
            {action === "continue" && (
              <div
                style={{
                  padding: "14px",
                  background: "var(--gray-50)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Amount Details
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Blocking Amount (₹) *</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={blockingAmount}
                      onChange={(e) => setBlockingAmount(e.target.value)}
                      placeholder="₹0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discharge Amount (₹) *</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={dischargeAmount}
                      onChange={(e) => setDischargeAmount(e.target.value)}
                      placeholder="₹0"
                    />
                  </div>
                </div>
                {blockingAmount && dischargeAmount && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: "var(--text-muted)",
                    }}
                  >
                    Total:{" "}
                    <strong style={{ color: "var(--text)" }}>
                      ₹
                      {(
                        Number(blockingAmount) + Number(dischargeAmount)
                      ).toLocaleString()}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Transfer warning */}
            {action === "transfer" && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "var(--red-light)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid #fcc",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{ fontSize: 13, color: "var(--red)", fontWeight: 500 }}
                >
                  ⚠ Incentive will be disabled for this patient
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--red)",
                    marginTop: 4,
                    opacity: 0.8,
                  }}
                >
                  Incentive amount will be set to ₹0. This cannot be undone
                  easily.
                </div>
              </div>
            )}

            {action && (
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : action === "continue"
                    ? "Submit"
                    : "Confirm Transfer"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Already discharged table */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 12,
          }}
        >
          Discharged / Transferred Patients
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>IPD</th>
                <th>Swasthya Bondhu</th>
                <th>Discharge Status</th>
                <th>Blocking ₹</th>
                <th>Discharge ₹</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {patients.filter(
                (p) =>
                  p.dischargeStatus === "continued" ||
                  p.dischargeStatus === "transferred",
              ).length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: 20 }}>
                      <p>No discharged patients yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                patients
                  .filter(
                    (p) =>
                      p.dischargeStatus && p.dischargeStatus !== "admitted",
                  )
                  .map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          {p.mobile}
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {p.ipdNo}
                      </td>
                      <td style={{ fontSize: 12 }}>{p.helperId?.name}</td>
                      <td>
                        <span
                          className={`badge ${p.dischargeStatus === "continued" ? "badge-green" : "badge-red"}`}
                        >
                          {p.dischargeStatus === "continued"
                            ? "✓ Continued"
                            : "↗ Transferred"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {(p as any).blockingAmount
                          ? `₹${(p as any).blockingAmount}`
                          : "—"}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {(p as any).dischargeAmount
                          ? `₹${(p as any).dischargeAmount}`
                          : "—"}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {(p as any).dischargeDate
                          ? new Date(
                              (p as any).dischargeDate,
                            ).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
