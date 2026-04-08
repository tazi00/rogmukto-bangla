"use client";
import { useEffect, useState, useRef } from "react";
import PaymentModal from "@/components/PaymentModal";
import PatientAddressSelect, {
  AddressValue,
  EMPTY_ADDRESS,
} from "@/components/PatientAddressSelect";
import PatientExtraFields from "@/components/PatientExtraFields";
import DischargePanel from "@/components/DischargePanel";

interface Helper {
  _id: string;
  name: string;
  phone: string;
  subDivision: string;
  block: string;
  gramPanchayats: { gpName: string; villages: string[] }[];
  tag: string;
  blockCoordinatorId?: { name: string; coordinatorId: string };
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
  address?: any;
  helperId: {
    _id: string;
    name: string;
    block: string;
    subDivision: string;
    tag: string;
  };
  dischargeStatus: string;
  blockingAmount?: number;
  dischargeAmount?: number;
  dischargeDate?: string;
}

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
const EMPTY_FORM = {
  name: "",
  mobile: "",
  ipdNo: "",
  doa: "",
  helperId: "",
  incentiveAmount: "",
  pincode: "",
  aadharNumber: "",
  swasthaSathNumber: "",
};

export default function AdminPatientsPage() {
  const now = new Date();
  const [selYear, setSelYear] = useState(String(now.getFullYear()));
  const [selMonth, setSelMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  const [activeTab, setActiveTab] = useState<"admission" | "discharge">(
    "admission",
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [filterHelper, setFilterHelper] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [defaultAmount, setDefaultAmount] = useState(200);
  const [paymentPatient, setPaymentPatient] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [selectedHelper, setSelectedHelper] = useState<Helper | null>(null);
  const [helperSearch, setHelperSearch] = useState("");
  const [showHelperDrop, setShowHelperDrop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "ipdNo" | "doa">("doa");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/helpers")
      .then((r) => r.json())
      .then((d) => setHelpers(Array.isArray(d) ? d : []));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setDefaultAmount(d.defaultIncentiveAmount || 200));
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowHelperDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    load();
  }, [selYear, selMonth, statusFilter]);

  async function load() {
    const params = new URLSearchParams({ month: `${selYear}-${selMonth}` });
    if (statusFilter) params.set("status", statusFilter);
    const data = await fetch(`/api/patients?${params}`).then((r) => r.json());
    setPatients(Array.isArray(data) ? data : []);
  }

  const filteredHelpers = helpers.filter((h) => {
    if (!helperSearch) return true;
    const q = helperSearch.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.phone.includes(q) ||
      h.block.toLowerCase().includes(q) ||
      h.gramPanchayats?.some((g) => g.gpName.toLowerCase().includes(q)) ||
      h.blockCoordinatorId?.coordinatorId?.toLowerCase().includes(q)
    );
  });

  function openAdd() {
    setEditPatient(null);
    setForm({ ...EMPTY_FORM, incentiveAmount: String(defaultAmount) });
    setAddress(EMPTY_ADDRESS);
    setSelectedHelper(null);
    setHelperSearch("");
    setError("");
    setShowForm(true);
  }

  function openEdit(p: Patient) {
    setEditPatient(p);
    const h = helpers.find((h) => h._id === (p.helperId as any)?._id);
    setSelectedHelper(h || null);
    setHelperSearch(h?.name || (p.helperId as any)?.name || "");
    setForm({
      name: p.name,
      mobile: p.mobile,
      ipdNo: p.ipdNo,
      doa: p.doa?.slice(0, 10) || "",
      helperId: (p.helperId as any)?._id || "",
      incentiveAmount: String(p.incentiveAmount),
      pincode: (p as any).pincode || "",
      aadharNumber: (p as any).aadharNumber || "",
      swasthaSathNumber: (p as any).swasthaSathNumber || "",
    });
    setAddress(p.address || EMPTY_ADDRESS);
    setError("");
    setShowForm(true);
  }

  function selectHelper(h: Helper) {
    setSelectedHelper(h);
    setHelperSearch(h.name);
    setForm((f) => ({ ...f, helperId: h._id }));
    setShowHelperDrop(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.helperId) {
      setError("Select a Swasthya Bondhu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body = {
        ...form,
        incentiveAmount: Number(form.incentiveAmount) || defaultAmount,
        address,
      };
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
      setShowForm(false);
      load();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this patient?")) return;
    await fetch(`/api/patients?id=${id}`, { method: "DELETE" });
    load();
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  const SortTh = ({ label, k }: { label: string; k: typeof sortKey }) => (
    <th
      onClick={() => toggleSort(k)}
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

  const q = patientSearch.toLowerCase();
  const displayPatients = patients
    .filter((p) => !filterHelper || (p.helperId as any)?._id === filterHelper)
    .filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.mobile.includes(q) ||
        p.ipdNo.toLowerCase().includes(q) ||
        (p.helperId as any)?.name?.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const va =
        sortKey === "doa"
          ? new Date(a.doa).getTime()
          : (a[sortKey] || "").toLowerCase();
      const vb =
        sortKey === "doa"
          ? new Date(b.doa).getTime()
          : (b[sortKey] || "").toLowerCase();
      return sortDir === "asc"
        ? va < vb
          ? -1
          : va > vb
            ? 1
            : 0
        : va > vb
          ? -1
          : va < vb
            ? 1
            : 0;
    });

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2>Patients</h2>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${activeTab === "admission" ? "active" : ""}`}
              onClick={() => setActiveTab("admission")}
            >
              🏥 Admission
            </button>
            <button
              className={`toggle-btn ${activeTab === "discharge" ? "active" : ""}`}
              onClick={() => setActiveTab("discharge")}
            >
              🚪 Discharge
            </button>
          </div>
        </div>
        {activeTab === "admission" && (
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Patient
          </button>
        )}
      </div>
      <div className="page-body">
        {activeTab === "discharge" && (
          <DischargePanel patients={patients} onRefresh={load} />
        )}
        <div style={{ display: activeTab === "discharge" ? "none" : "block" }}>
          <div className="filter-bar" style={{ marginBottom: 16 }}>
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
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                style={{ width: 150 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="clearance">Clearance</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Search</label>
              <input
                className="form-input"
                placeholder="IPD No. or Name or mobile or GP"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                style={{ width: 220, fontSize: 13 }}
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <SortTh label="Patient" k="name" />
                  <th>Mobile</th>
                  <SortTh label="IPD No." k="ipdNo" />
                  <SortTh label="DOA" k="doa" />
                  <th>Swasthya Bondhu</th>
                  <th>Address</th>
                  <th>Incentive</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayPatients.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        <p>
                          {patientSearch || filterHelper
                            ? "No results found."
                            : "No patients found."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayPatients.map((p) => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
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
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {(p.helperId as any)?.name}
                        </div>
                        <span
                          className="badge badge-green"
                          style={{ fontSize: 10 }}
                        >
                          {(p.helperId as any)?.tag}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {p.address?.type === "gp"
                          ? `${p.address.gramPanchayat}${p.address.village ? ` / ${p.address.village}` : ""}`
                          : p.address?.type === "municipality"
                            ? `${p.address.municipality}${p.address.ward ? ` / ${p.address.ward}` : ""}`
                            : "—"}
                      </td>
                      <td style={{ fontWeight: 600 }}>₹{p.incentiveAmount}</td>
                      <td>
                        <span
                          className={`badge ${p.paymentStatus === "clearance" ? "badge-green" : "badge-amber"}`}
                        >
                          {p.paymentStatus === "clearance"
                            ? "✓ Cleared"
                            : "⏳ Pending"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
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

        {showForm && (
          <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <div
              className="modal"
              style={{ maxWidth: 540, maxHeight: "92vh", overflowY: "auto" }}
            >
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

                  {/* Helper search */}
                  <div
                    className="form-group"
                    ref={dropRef}
                    style={{ position: "relative" }}
                  >
                    <label className="form-label">Swasthya Bondhu *</label>
                    <input
                      className="form-input"
                      placeholder="🔍 Search by name or phone or block or GP or ID..."
                      value={helperSearch}
                      autoComplete="off"
                      onFocus={() => setShowHelperDrop(true)}
                      onChange={(e) => {
                        setHelperSearch(e.target.value);
                        setSelectedHelper(null);
                        setForm((f) => ({ ...f, helperId: "" }));
                        setShowHelperDrop(true);
                      }}
                    />
                    {!selectedHelper && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 4,
                        }}
                      >
                        💡 Search by name or phone or block or GP or Block
                        Coordinator Id
                      </div>
                    )}
                    {showHelperDrop && !selectedHelper && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 200,
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
                            No Swasthya Bondhu found
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
                                ((
                                  e.currentTarget as HTMLElement
                                ).style.background = "var(--gray-50)")
                              }
                              onMouseLeave={(e) =>
                                ((
                                  e.currentTarget as HTMLElement
                                ).style.background = "")
                              }
                              onClick={() => selectHelper(h)}
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
                                📞 {h.phone} · 📍 {h.block}
                                {h.gramPanchayats?.length > 0 &&
                                  ` · 🌿 ${h.gramPanchayats.map((g) => g.gpName).join(", ")}`}
                                {h.blockCoordinatorId &&
                                  ` · ID: ${h.blockCoordinatorId.coordinatorId}`}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {selectedHelper && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: "8px 12px",
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
                          {selectedHelper.block} · 📞 {selectedHelper.phone}
                        </span>
                        <button
                          type="button"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--green-dark)",
                          }}
                          onClick={() => {
                            setSelectedHelper(null);
                            setHelperSearch("");
                            setForm((f) => ({ ...f, helperId: "" }));
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
                        placeholder="10-digit"
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
                        placeholder="IPD number"
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

                  <PatientExtraFields
                    pincode={form.pincode || ""}
                    aadharNumber={form.aadharNumber || ""}
                    swasthaSathNumber={form.swasthaSathNumber || ""}
                    onChange={(field, value) =>
                      setForm((f) => ({ ...f, [field]: value }))
                    }
                  />

                  <PatientAddressSelect value={address} onChange={setAddress} />
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
                        ? "Update"
                        : "Add Patient"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {paymentPatient && (
        <PaymentModal
          patient={paymentPatient}
          onClose={() => setPaymentPatient(null)}
          onSave={load}
        />
      )}
    </>
  );
}
