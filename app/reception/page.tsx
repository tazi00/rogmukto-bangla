"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ReceptionHeader from "@/components/ReceptionistHeader";
import AddHelperModal from "@/components/AddHelperModal";
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
  municipalities: { municipalityName: string; wards: string[] }[];
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
  helperId: { _id: string; name: string; block: string; gramPanchayats: any[] };
  address?: any;
  dischargeStatus: string;
}

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
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const now = new Date();
  const [activeTab, setActiveTab] = useState<
    "admission" | "discharge" | "profile"
  >("admission");
  const [selYear, setSelYear] = useState(String(now.getFullYear()));
  const [selMonth, setSelMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  const [filterHelper, setFilterHelper] = useState("");

  // Profile state
  const [recProfile, setRecProfile] = useState<{
    name: string;
    username: string;
  } | null>(null);
  const [profCurrent, setProfCurrent] = useState("");
  const [profNew, setProfNew] = useState("");
  const [profConfirm, setProfConfirm] = useState("");
  const [profLoading, setProfLoading] = useState(false);
  const [profError, setProfError] = useState("");
  const [profSuccess, setProfSuccess] = useState("");

  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [defaultAmount, setDefaultAmount] = useState(200);
  const [form, setForm] = useState(EMPTY_FORM);
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);

  // Helper search in form
  const [helperSearch, setHelperSearch] = useState("");
  const [showHelperDrop, setShowHelperDrop] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<Helper | null>(null);

  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddHelper, setShowAddHelper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cookies = document.cookie
      .split(";")
      .reduce<Record<string, string>>((acc, c) => {
        const [k, v] = c.trim().split("=");
        acc[k] = decodeURIComponent(v || "");
        return acc;
      }, {});
    setRole(cookies["role_hint"] || null);
    fetch("/api/helpers")
      .then((r) => r.json())
      .then((d) => setHelpers(Array.isArray(d) ? d : []));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setDefaultAmount(d.defaultIncentiveAmount || 200);
        setForm((f) => ({
          ...f,
          incentiveAmount: String(d.defaultIncentiveAmount || 200),
        }));
      });
    fetch("/api/profile/receptionist")
      .then((r) => r.json())
      .then((d) => {
        if (d?.name) setRecProfile(d);
      });
  }, []);

  useEffect(() => {
    loadPatients();
  }, [selYear, selMonth]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowHelperDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadPatients() {
    const data = await fetch(`/api/patients?month=${selYear}-${selMonth}`).then(
      (r) => r.json(),
    );
    setPatients(Array.isArray(data) ? data : []);
  }

  // Helper search filter
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

  // Filter helpers for table filter dropdown
  const uniqueHelpers = helpers;

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
    const h = helpers.find(
      (h) =>
        h._id === (p.helperId as any)?._id || h._id === (p.helperId as any),
    );
    setSelectedHelper(h || null);
    setHelperSearch(h?.name || (p.helperId as any)?.name || "");
    setForm({
      name: p.name,
      mobile: p.mobile,
      ipdNo: p.ipdNo,
      doa: p.doa?.slice(0, 10) || "",
      helperId: (p.helperId as any)?._id || String(p.helperId),
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
    setSuccess("");
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

  const displayPatients = filterHelper
    ? patients.filter(
        (p) =>
          (p.helperId as any)?._id === filterHelper ||
          p.helperId === (filterHelper as any),
      )
    : patients;

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      <ReceptionHeader />

      <div style={{ padding: "20px" }}>
        {success && (
          <div className="alert alert-success" style={{ marginBottom: 14 }}>
            {success}
          </div>
        )}

        {/* Tab Toggle */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <div className="toggle-group">
            <button
              className={`toggle-btn ${activeTab === "admission" ? "active" : ""}`}
              onClick={() => setActiveTab("admission")}
            >
              🏥 Patient Admission
            </button>
            <button
              className={`toggle-btn ${activeTab === "discharge" ? "active" : ""}`}
              onClick={() => setActiveTab("discharge")}
            >
              🚪 Patient Discharge
            </button>
            <button
              className={`toggle-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              👤 Profile
            </button>
          </div>
        </div>

        {activeTab === "discharge" && (
          <DischargePanel patients={patients} onRefresh={loadPatients} />
        )}

        <div style={{ display: activeTab === "admission" ? "block" : "none" }}>
          {/* Filter + Actions bar */}
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
                  {uniqueHelpers.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} — {h.block}
                    </option>
                  ))}
                </select>
              </div>
              {filterHelper && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFilterHelper("")}
                >
                  ✕ Clear
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddHelper(true)}
              >
                + Add Swasthya Bondhu
              </button>
              <button className="btn btn-primary" onClick={openAdd}>
                + Add Patient
              </button>
            </div>
          </div>

          {/* Summary row */}
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
                flexWrap: "wrap",
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
                  <th>Swasthya Bondhu</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {displayPatients.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
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
                        <div
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          {p.mobile}
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {p.ipdNo}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {new Date(p.doa).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {(p.helperId as any)?.name || "—"}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {p.address?.type === "gp"
                          ? `${p.address.gramPanchayat}${p.address.village ? ` / ${p.address.village}` : ""}`
                          : p.address?.type === "municipality"
                            ? `${p.address.municipality}${p.address.ward ? ` / ${p.address.ward}` : ""}`
                            : "—"}
                      </td>
                      <td>
                        {/* <div style={{ display: "flex", gap: 5 }}>
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
                        </div> */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Patient Modal */}
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

                  {/* Swasthya Bondhu search */}
                  <div
                    className="form-group"
                    ref={dropRef}
                    style={{ position: "relative" }}
                  >
                    <label className="form-label">Swasthya Bondhu *</label>
                    <input
                      className="form-input"
                      placeholder="🔍 Search by name or phone or GP or ID"
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
                        💡 Search by name or phone or GP or coordinator ID
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
                                <span
                                  className="badge badge-green"
                                  style={{ marginLeft: 6, fontSize: 10 }}
                                >
                                  {h.tag}
                                </span>
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
                            fontSize: 14,
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

                  {/* Patient details */}
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

                  {/* Patient Address */}
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
                        ? "Update Patient"
                        : "Add Patient"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {showAddHelper && (
        <AddHelperModal
          onClose={() => setShowAddHelper(false)}
          onSave={() =>
            fetch("/api/helpers")
              .then((r) => r.json())
              .then((d) => setHelpers(Array.isArray(d) ? d : []))
          }
          role="receptionist"
        />
      )}

      {/* PROFILE TAB */}
      {activeTab === "profile" && (
        <div style={{ padding: "0 24px 24px", maxWidth: 440 }}>
          {/* Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--green-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {recProfile?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>
                {recProfile?.name ?? "—"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                @{recProfile?.username ?? "—"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Receptionist
              </div>
            </div>
          </div>

          {/* Password change */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "20px 24px",
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px 0" }}>
              🔐 Change Password
            </h3>
            {profError && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                {profError}
              </div>
            )}
            {profSuccess && (
              <div className="alert alert-success" style={{ marginBottom: 12 }}>
                {profSuccess}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  Current Password
                </div>
                <input
                  type="password"
                  className="form-input"
                  style={{ width: "100%" }}
                  value={profCurrent}
                  onChange={(e) => setProfCurrent(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  New Password
                </div>
                <input
                  type="password"
                  className="form-input"
                  style={{ width: "100%" }}
                  value={profNew}
                  onChange={(e) => setProfNew(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  Confirm New Password
                </div>
                <input
                  type="password"
                  className="form-input"
                  style={{ width: "100%" }}
                  value={profConfirm}
                  onChange={(e) => setProfConfirm(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <button
                className="btn btn-primary"
                disabled={profLoading}
                onClick={async () => {
                  setProfError("");
                  setProfSuccess("");
                  if (!profCurrent || !profNew || !profConfirm) {
                    setProfError("All fields are required");
                    return;
                  }
                  if (profNew !== profConfirm) {
                    setProfError("New passwords do not match");
                    return;
                  }
                  if (profNew.length < 4) {
                    setProfError("Password must be at least 4 characters");
                    return;
                  }
                  setProfLoading(true);
                  try {
                    const res = await fetch("/api/profile/receptionist", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        currentPassword: profCurrent,
                        newPassword: profNew,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setProfError(data.error || "Failed");
                      return;
                    }
                    setProfSuccess("Password changed successfully!");
                    setProfCurrent("");
                    setProfNew("");
                    setProfConfirm("");
                  } finally {
                    setProfLoading(false);
                  }
                }}
              >
                {profLoading ? "Saving..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
