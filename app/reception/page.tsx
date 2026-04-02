"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PaymentModal from "@/components/PaymentModal";
import Image from "next/image";
import ReceptionHeader from "@/components/ReceptionistHeader";

interface Helper {
  _id: string;
  name: string;
  subDivision: string;
  block: string;
  gramPanchayat: string;
  tag: string;
}
interface Patient {
  _id: string;
  name: string;
  mobile: string;
  ipdNo: string;
  doa: string;
  incentiveAmount: number;
  paymentStatus: string;
  paymentDetail?: any;
  helperId: { _id: string; name: string; block: string; gramPanchayat: string };
}

const EMPTY_FORM = {
  name: "",
  mobile: "",
  ipdNo: "",
  doa: "",
  helperId: "",
  incentiveAmount: "",
};

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
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

export default function ReceptionPage() {
  const router = useRouter();
  const now = new Date();
  const [selYear, setSelYear] = useState(String(now.getFullYear()));
  const [selMonth, setSelMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  const [filterHelper, setFilterHelper] = useState("");

  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [defaultAmount, setDefaultAmount] = useState(200);
  const [form, setForm] = useState(EMPTY_FORM);
  const [helperSearch, setHelperSearch] = useState("");
  const [showHelperDrop, setShowHelperDrop] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [paymentPatient, setPaymentPatient] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/helpers")
      .then((r) => r.json())
      .then(setHelpers);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setDefaultAmount(d.defaultIncentiveAmount || 200);
        setForm((f) => ({
          ...f,
          incentiveAmount: String(d.defaultIncentiveAmount || 200),
        }));
      });
  }, []);

  useEffect(() => {
    loadPatients();
  }, [selYear, selMonth]);

  async function loadPatients() {
    const month = `${selYear}-${selMonth}`;
    const data = await fetch(`/api/patients?month=${month}`).then((r) =>
      r.json(),
    );
    setPatients(Array.isArray(data) ? data : []);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowHelperDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openAdd() {
    setEditPatient(null);
    setForm({ ...EMPTY_FORM, incentiveAmount: String(defaultAmount) });
    setHelperSearch("");
    setError("");
    setShowForm(true);
  }

  function openEdit(p: Patient) {
    setEditPatient(p);
    setForm({
      name: p.name,
      mobile: p.mobile,
      ipdNo: p.ipdNo,
      doa: p.doa?.slice(0, 10) || "",
      helperId: p.helperId?._id || "",
      incentiveAmount: String(p.incentiveAmount),
    });
    setHelperSearch(p.helperId?.name || "");
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const body = { ...form, incentiveAmount: Number(form.incentiveAmount) };
      const url = editPatient
        ? `/api/patients?id=${editPatient._id}`
        : "/api/patients";
      const method = editPatient ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      setSuccess(editPatient ? "Patient updated!" : "Patient added!");
      setShowForm(false);
      loadPatients();
      setTimeout(() => setSuccess(""), 2500);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this patient record?")) return;
    await fetch(`/api/patients?id=${id}`, { method: "DELETE" });
    loadPatients();
  }

  const selectedHelper = helpers.find((h) => h._id === form.helperId);
  const filteredHelpers = helpers.filter(
    (h) =>
      !helperSearch ||
      h.name.toLowerCase().includes(helperSearch.toLowerCase()) ||
      h.block.toLowerCase().includes(helperSearch.toLowerCase()) ||
      h.gramPanchayat.toLowerCase().includes(helperSearch.toLowerCase()),
  );

  // Apply filter
  const displayPatients = filterHelper
    ? patients.filter(
        (p) =>
          p.helperId?._id === filterHelper ||
          (p.helperId as any) === filterHelper,
      )
    : patients;

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      {/* Header */}
      <ReceptionHeader />

      <div style={{ padding: "20px" }}>
        {success && (
          <div className="alert alert-success" style={{ marginBottom: 14 }}>
            {success}
          </div>
        )}

        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div className="form-group">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                style={{ width: 100 }}
                value={selYear}
                onChange={(e) => setSelYear(e.target.value)}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select
                className="form-select"
                style={{ width: 140 }}
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
            <div className="form-group">
              <label className="form-label">Swasthya Bondhu</label>
              <select
                className="form-select"
                style={{ width: 190 }}
                value={filterHelper}
                onChange={(e) => setFilterHelper(e.target.value)}
              >
                <option value="">All Swasthya Bondhu</option>
                {helpers.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} — {h.block}
                  </option>
                ))}
              </select>
            </div>
            {filterHelper && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginBottom: 1 }}
                onClick={() => setFilterHelper("")}
              >
                ✕ Clear
              </button>
            )}
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Patient
          </button>
        </div>

        {/* Summary row when helper filtered */}
        {filterHelper && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              background: "var(--green-light)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              color: "var(--green-dark)",
              display: "flex",
              gap: 20,
            }}
          >
            <span>
              👤{" "}
              <strong>
                {helpers.find((h) => h._id === filterHelper)?.name}
              </strong>
            </span>
            <span>
              📋 Patients: <strong>{displayPatients.length}</strong>
            </span>
            <span>
              💰 Total:{" "}
              <strong>
                ₹
                {displayPatients
                  .reduce((s, p) => s + p.incentiveAmount, 0)
                  .toLocaleString()}
              </strong>
            </span>
            <span>
              ✓ Cleared:{" "}
              <strong>
                {
                  displayPatients.filter((p) => p.paymentStatus === "cleared")
                    .length
                }
              </strong>
            </span>
          </div>
        )}

        {/* Patients table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>IPD</th>
                <th>DOA</th>
                <th>Helper</th>
                <th>₹</th>
                <th>Payment Status</th>
                <th>Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayPatients.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state" style={{ padding: "24px" }}>
                      <p>No patients found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayPatients.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {p.mobile}
                      </div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                      {p.ipdNo}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(p.doa).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ fontSize: 12 }}>{p.helperId?.name}</td>
                    <td style={{ fontWeight: 600 }}>₹{p.incentiveAmount}</td>
                    <td>
                      <span
                        className={`badge ${p.paymentStatus === "clearance" ? "badge-green" : "badge-amber"}`}
                      >
                        {p.paymentStatus === "clearance"
                          ? "✓ Clearance"
                          : "⏳ Pending"}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {p.paymentDetail?.mode === "cash"
                        ? "💵 Cash"
                        : p.paymentDetail?.mode === "online"
                          ? "🏦 Online"
                          : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPaymentPatient(p)}
                        >
                          ₹
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(p._id)}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editPatient ? "Edit Patient" : "Add Patient"}</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

                {/* Helper search dropdown */}
                <div
                  className="form-group"
                  ref={dropRef}
                  style={{ position: "relative" }}
                >
                  <label className="form-label">Swasthya Bondhu *</label>
                  <input
                    className="form-input"
                    placeholder="🔍 Type name, block, or gram panchayat to search..."
                    value={helperSearch}
                    autoComplete="off"
                    onFocus={() => setShowHelperDrop(true)}
                    onChange={(e) => {
                      setHelperSearch(e.target.value);
                      setForm({ ...form, helperId: "" });
                      setShowHelperDrop(true);
                    }}
                  />
                  {/* Hint */}
                  {!form.helperId && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      💡 Showing <strong>Swasthya Bondhu</strong> — search by
                      name, block, or GP
                    </div>
                  )}
                  {/* Dropdown */}
                  {showHelperDrop && !form.helperId && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface)",
                        boxShadow: "var(--shadow-md)",
                        maxHeight: 220,
                        overflowY: "auto",
                      }}
                    >
                      {filteredHelpers.length === 0 ? (
                        <div
                          style={{
                            padding: "12px 14px",
                            color: "var(--text-muted)",
                            fontSize: 13,
                          }}
                        >
                          No helpers found
                        </div>
                      ) : (
                        filteredHelpers.map((h) => (
                          <div
                            key={h._id}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--gray-100)",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "var(--gray-50)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "")
                            }
                            onClick={() => {
                              setForm({ ...form, helperId: h._id });
                              setHelperSearch(h.name);
                              setShowHelperDrop(false);
                            }}
                          >
                            <div style={{ fontWeight: 500, fontSize: 13 }}>
                              {h.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                marginTop: 2,
                              }}
                            >
                              <span
                                className="badge badge-green"
                                style={{ fontSize: 10, marginRight: 6 }}
                              >
                                {h.tag}
                              </span>
                              {h.subDivision} · {h.block} · {h.gramPanchayat}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {/* Selected confirmation */}
                  {selectedHelper && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: "7px 10px",
                        background: "var(--green-light)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        color: "var(--green-dark)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        ✓ <strong>{selectedHelper.name}</strong> ·{" "}
                        {selectedHelper.block} / {selectedHelper.gramPanchayat}
                      </span>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 13,
                          color: "var(--green-dark)",
                        }}
                        onClick={() => {
                          setForm({ ...form, helperId: "" });
                          setHelperSearch("");
                          setShowHelperDrop(true);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Patient Name *</label>
                    <input
                      className="form-input"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile *</label>
                    <input
                      className="form-input"
                      required
                      value={form.mobile}
                      onChange={(e) =>
                        setForm({ ...form, mobile: e.target.value })
                      }
                      placeholder="10-digit number"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IPD No. *</label>
                    <input
                      className="form-input"
                      required
                      value={form.ipdNo}
                      onChange={(e) =>
                        setForm({ ...form, ipdNo: e.target.value })
                      }
                      placeholder="e.g. IPD-001"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Admission *</label>
                    <input
                      className="form-input"
                      type="date"
                      required
                      value={form.doa}
                      onChange={(e) =>
                        setForm({ ...form, doa: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Incentive Amount (₹){" "}
                    <span
                      style={{
                        fontWeight: 400,
                        textTransform: "none",
                        letterSpacing: 0,
                        color: "var(--text-muted)",
                        fontSize: 11,
                      }}
                    >
                      — default ₹{defaultAmount}, override if needed
                    </span>
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    required
                    value={form.incentiveAmount}
                    onChange={(e) =>
                      setForm({ ...form, incentiveAmount: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !form.helperId}
                >
                  {loading
                    ? "Saving..."
                    : editPatient
                      ? "Update Patient"
                      : "Add Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentPatient && (
        <PaymentModal
          patient={paymentPatient}
          onClose={() => setPaymentPatient(null)}
          onSave={loadPatients}
        />
      )}
    </div>
  );
}
