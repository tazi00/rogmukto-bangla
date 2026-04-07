"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PaymentModal from "@/components/PaymentModal";
import PatientAddressSelect, { AddressValue, EMPTY_ADDRESS } from "@/components/PatientAddressSelect";
import DischargePanel from "@/components/DischargePanel";
import AddHelperModal from "@/components/AddHelperModal";
import PatientExtraFields from "@/components/PatientExtraFields";
import SearchableSelect from "@/components/SearchableSelect";
import MultiSearchSelect from "@/components/MultiSearchSelect";

interface BC { _id: string; coordinatorId: string; name: string; subDivision: string; blocks: string[] }
interface Helper {
  _id: string; helperId: string; name: string; phone: string;
  subDivision: string; block: string;
  gramPanchayats: { gpName: string; villages: string[] }[];
  municipalities: { municipalityName: string; wards: string[] }[];
  tag: string;
}
interface Patient {
  _id: string; name: string; mobile: string; ipdNo: string; doa: string;
  incentiveAmount: number; paymentStatus: string; paymentDetail?: any; address?: any;
  helperId: any; dischargeStatus: string;
}
interface SubDiv { _id: string; name: string; blocks: { _id: string; name: string; gramPanchayats: any[]; municipalities: any[] }[] }

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = [
  { val: "01", label: "January" }, { val: "02", label: "February" }, { val: "03", label: "March" },
  { val: "04", label: "April" }, { val: "05", label: "May" }, { val: "06", label: "June" },
  { val: "07", label: "July" }, { val: "08", label: "August" }, { val: "09", label: "September" },
  { val: "10", label: "October" }, { val: "11", label: "November" }, { val: "12", label: "December" },
];
const EMPTY_PATIENT = { name: "", mobile: "", ipdNo: "", doa: "", helperId: "", incentiveAmount: "", pincode: "", aadharNumber: "", swasthaSathNumber: "" };
const EMPTY_HELPER = { helperId: "", name: "", phone: "", block: "", tag: "Swasthya Bondhu" };

export default function BCPanel() {
  const router = useRouter();
  const now = new Date();
  const [bc, setBc] = useState<BC | null>(null);
  const [selYear, setSelYear] = useState(String(now.getFullYear()));
  const [selMonth, setSelMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [activeTab, setActiveTab] = useState<"patients" | "discharge" | "helpers">("patients");
  const [defaultAmount, setDefaultAmount] = useState(200);

  // Helpers state
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [showHelperForm, setShowHelperForm] = useState(false);
  const [helperForm, setHelperForm] = useState(EMPTY_HELPER);
  const [useGP, setUseGP] = useState(false);
  const [useMun, setUseMun] = useState(false);
  const [selectedGP, setSelectedGP] = useState("");
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  const [selectedMun, setSelectedMun] = useState("");
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [locations, setLocations] = useState<SubDiv[]>([]);
  const [helperLoading, setHelperLoading] = useState(false);
  const [helperError, setHelperError] = useState("");

  // Patients state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filterHelper, setFilterHelper] = useState("");
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [selectedHelper, setSelectedHelper] = useState<Helper | null>(null);
  const [helperSearch, setHelperSearch] = useState("");
  const [showHelperDrop, setShowHelperDrop] = useState(false);
  const [paymentPatient, setPaymentPatient] = useState<Patient | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState("");
  const [success, setSuccess] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/block-coordinators").then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length > 0) setBc(d[0]);
    });
    fetch("/api/settings").then(r => r.json()).then(d => setDefaultAmount(d.defaultIncentiveAmount || 200));
    fetch("/api/locations").then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : []));
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowHelperDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (bc) loadHelpers();
  }, [bc]);

  useEffect(() => { loadPatients(); }, [selYear, selMonth]);

  async function loadHelpers() {
    const data = await fetch(`/api/helpers?blockCoordinatorId=${bc?._id}`).then(r => r.json());
    setHelpers(Array.isArray(data) ? data : []);
  }

  async function loadPatients() {
    const data = await fetch(`/api/patients?month=${selYear}-${selMonth}`).then(r => r.json());
    // Filter to only this BC's helpers
    const myHelperIds = helpers.map(h => h._id);
    const filtered = Array.isArray(data) ? data.filter((p: Patient) => myHelperIds.includes(p.helperId?._id || p.helperId)) : [];
    setPatients(filtered);
  }

  // Block data for helper form
  const blockData = bc ? locations.find(sd => sd.name === bc.subDivision)?.blocks.find(b => b.name === helperForm.block) : null;

  async function handleHelperSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bc) return;
    if (!helperForm.block) { setHelperError("Select a block"); return; }
    if (!useGP && !useMun) { setHelperError("Select GP or Municipality"); return; }
    setHelperLoading(true); setHelperError("");
    try {
      const body = {
        ...helperForm,
        blockCoordinatorId: bc._id,
        subDivision: bc.subDivision,
        gramPanchayats: useGP && selectedGP ? [{ gpName: selectedGP, villages: selectedVillages }] : [],
        municipalities: useMun && selectedMun ? [{ municipalityName: selectedMun, wards: selectedWards }] : [],
      };
      const res = await fetch("/api/helpers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setHelperError(d.error || "Failed"); return; }
      setShowHelperForm(false); setHelperForm(EMPTY_HELPER); setUseGP(false); setUseMun(false); setSelectedGP(""); setSelectedVillages([]); setSelectedMun(""); setSelectedWards([]);
      loadHelpers();
    } catch { setHelperError("Something went wrong"); }
    finally { setHelperLoading(false); }
  }



  const filteredHelpers = helpers.filter(h => {
    if (!helperSearch) return true;
    const q = helperSearch.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.phone.includes(q) ||
      h.block.toLowerCase().includes(q) || h.helperId?.toLowerCase().includes(q) ||
      h.gramPanchayats?.some(g => g.gpName.toLowerCase().includes(q));
  });

  async function handlePatientSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientForm.helperId) { setPatientError("Select a Swasthya Bondhu"); return; }
    setPatientLoading(true); setPatientError(""); setSuccess("");
    try {
      const body = { ...patientForm, incentiveAmount: Number(patientForm.incentiveAmount), address };
      const url = editPatient ? `/api/patients?id=${editPatient._id}` : "/api/patients";
      const method = editPatient ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setPatientError(d.error || "Failed"); return; }
      setSuccess(editPatient ? "Updated!" : "Patient added!"); setShowPatientForm(false); loadPatients();
      setTimeout(() => setSuccess(""), 2500);
    } catch { setPatientError("Something went wrong"); }
    finally { setPatientLoading(false); }
  }

  async function deletePatient(id: string) {
    if (!confirm("Delete this patient?")) return;
    await fetch(`/api/patients?id=${id}`, { method: "DELETE" }); loadPatients();
  }

  function openEditPatient(p: Patient) {
    setEditPatient(p);
    const h = helpers.find(h => h._id === (p.helperId?._id || p.helperId));
    setSelectedHelper(h || null); setHelperSearch(h?.name || "");
    setPatientForm({ name: p.name, mobile: p.mobile, ipdNo: p.ipdNo, doa: p.doa?.slice(0, 10) || "",
      helperId: p.helperId?._id || p.helperId, incentiveAmount: String(p.incentiveAmount),
      pincode: p.address?.pincode || "", aadharNumber: (p as any).aadharNumber || "", swasthaSathNumber: (p as any).swasthaSathNumber || "" });
    setAddress(p.address || EMPTY_ADDRESS); setPatientError(""); setShowPatientForm(true);
  }

  const displayPatients = filterHelper ? patients.filter(p => (p.helperId?._id || p.helperId) === filterHelper) : patients;
  const checkStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
    border: `2px solid ${active ? "var(--green-mid)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)", background: active ? "var(--green-light)" : "var(--surface)",
    cursor: "pointer", fontSize: 13, userSelect: "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      {/* Header */}
      <div
        style={{
          background: "var(--green-dark)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
            Rogmukto Bangla
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
            Block Coordinator Panel{" "}
            {bc ? `— ${bc.name} (${bc.coordinatorId})` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/view" target="_blank" className="btn btn-secondary btn-sm">
            ↗ View Panel
          </a>
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {success && (
          <div className="alert alert-success" style={{ marginBottom: 14 }}>
            {success}
          </div>
        )}

        {/* Tab toggle */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div className="toggle-group">
            <button
              className={`toggle-btn ${activeTab === "patients" ? "active" : ""}`}
              onClick={() => setActiveTab("patients")}
            >
              🏥 Patients
            </button>
            <button
              className={`toggle-btn ${activeTab === "discharge" ? "active" : ""}`}
              onClick={() => setActiveTab("discharge")}
            >
              🚪 Discharge
            </button>
            <button
              className={`toggle-btn ${activeTab === "helpers" ? "active" : ""}`}
              onClick={() => setActiveTab("helpers")}
            >
              👥 Swasthya Bondhu
            </button>
          </div>
          {activeTab === "patients" && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditPatient(null);
                setPatientForm({
                  ...EMPTY_PATIENT,
                  incentiveAmount: String(defaultAmount),
                });
                setAddress(EMPTY_ADDRESS);
                setSelectedHelper(null);
                setHelperSearch("");
                setPatientError("");
                setShowPatientForm(true);
              }}
            >
              + Add Patient
            </button>
          )}
          {activeTab === "helpers" && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setHelperForm(EMPTY_HELPER);
                setUseGP(false);
                setUseMun(false);
                setSelectedGP("");
                setSelectedVillages([]);
                setSelectedMun("");
                setSelectedWards([]);
                setHelperError("");
                setShowHelperForm(true);
              }}
            >
              + Add Swasthya Bondhu
            </button>
          )}
        </div>

        {/* PATIENTS TAB */}
        {activeTab === "patients" && (
          <>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 14,
                flexWrap: "wrap",
                alignItems: "flex-end",
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
                  style={{ width: 180 }}
                  value={filterHelper}
                  onChange={(e) => setFilterHelper(e.target.value)}
                >
                  <option value="">All</option>
                  {helpers.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>IPD</th>
                    <th>DOA</th>
                    <th>Helper</th>
                    <th>Address</th>
                    <th>₹</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPatients.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state" style={{ padding: 24 }}>
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
                          {p.helperId?.name || "—"}
                        </td>
                        <td
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          {p.address?.type === "gp"
                            ? `${p.address.gramPanchayat}${p.address.village ? ` / ${p.address.village}` : ""}`
                            : p.address?.type === "municipality"
                              ? `${p.address.municipality}${p.address.ward ? ` / ${p.address.ward}` : ""}`
                              : "—"}
                        </td>
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
                              onClick={() => openEditPatient(p)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => deletePatient(p._id)}
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
          </>
        )}

        {/* DISCHARGE TAB */}
        {activeTab === "discharge" && (
          <DischargePanel patients={patients} onRefresh={loadPatients} />
        )}

        {/* HELPERS TAB */}
        {activeTab === "helpers" && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Swasthya Bondhu ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Block</th>
                  <th>GP / Municipality</th>
                  <th>Tag</th>
                </tr>
              </thead>
              <tbody>
                {helpers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state" style={{ padding: 24 }}>
                        <p>No Swasthya Bondhu added yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  helpers.map((h) => (
                    <tr key={h._id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {h.helperId || "—"}
                      </td>
                      <td style={{ fontWeight: 500 }}>{h.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {h.phone}
                      </td>
                      <td style={{ fontSize: 12 }}>{h.block}</td>
                      <td style={{ fontSize: 11 }}>
                        {h.gramPanchayats?.map((g) => (
                          <div key={g.gpName}>
                            🌿 {g.gpName}
                            {g.villages.length > 0
                              ? ` (${g.villages.length})`
                              : ""}
                          </div>
                        ))}
                        {h.municipalities?.map((m) => (
                          <div key={m.municipalityName}>
                            🏙 {m.municipalityName}
                            {m.wards.length > 0 ? ` (${m.wards.length})` : ""}
                          </div>
                        ))}
                      </td>
                      <td>
                        <span className="badge badge-green">{h.tag}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Helper Modal — using shared component */}
      {showHelperForm && (
        <AddHelperModal
          onClose={() => setShowHelperForm(false)}
          onSave={() => {
            loadHelpers();
          }}
        />
      )}

      {/* Add/Edit Patient Modal */}
      {showPatientForm && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowPatientForm(false)
          }
        >
          <div
            className="modal"
            style={{ maxWidth: 540, maxHeight: "92vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <h3>{editPatient ? "Edit Patient" : "Add Patient"}</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowPatientForm(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePatientSubmit}>
              <div className="modal-body">
                {patientError && (
                  <div className="alert alert-error">{patientError}</div>
                )}
                <div
                  className="form-group"
                  ref={dropRef}
                  style={{ position: "relative" }}
                >
                  <label className="form-label">Swasthya Bondhu *</label>
                  <input
                    className="form-input"
                    placeholder="🔍 Search by name, phone, block, GP, ID..."
                    value={helperSearch}
                    autoComplete="off"
                    onFocus={() => setShowHelperDrop(true)}
                    onChange={(e) => {
                      setHelperSearch(e.target.value);
                      setSelectedHelper(null);
                      setPatientForm((f) => ({ ...f, helperId: "" }));
                      setShowHelperDrop(true);
                    }}
                  />
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
                        maxHeight: 200,
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
                              padding: "9px 14px",
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
                            onClick={() => {
                              setSelectedHelper(h);
                              setHelperSearch(h.name);
                              setPatientForm((f) => ({
                                ...f,
                                helperId: h._id,
                              }));
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
                              }}
                            >
                              📞 {h.phone} · 📍 {h.block}
                              {h.helperId ? ` · ID: ${h.helperId}` : ""}
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
                        padding: "7px 10px",
                        background: "var(--green-light)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        color: "var(--green-dark)",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        ✓ <strong>{selectedHelper.name}</strong> ·{" "}
                        {selectedHelper.block}
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
                          setPatientForm((f) => ({ ...f, helperId: "" }));
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
                      value={patientForm.name}
                      onChange={(e) =>
                        setPatientForm({ ...patientForm, name: e.target.value })
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile *</label>
                    <input
                      className="form-input"
                      required
                      value={patientForm.mobile}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          mobile: e.target.value,
                        })
                      }
                      placeholder="10-digit"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IPD No. *</label>
                    <input
                      className="form-input"
                      required
                      value={patientForm.ipdNo}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          ipdNo: e.target.value,
                        })
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
                      value={patientForm.doa}
                      onChange={(e) =>
                        setPatientForm({ ...patientForm, doa: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Incentive Amount (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    required
                    value={patientForm.incentiveAmount}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        incentiveAmount: e.target.value,
                      })
                    }
                  />
                </div>
                <PatientExtraFields
                  pincode={patientForm.pincode}
                  aadharNumber={patientForm.aadharNumber}
                  swasthaSathNumber={patientForm.swasthaSathNumber}
                  onChange={(field, value) =>
                    setPatientForm((f) => ({ ...f, [field]: value }))
                  }
                />
                <PatientAddressSelect value={address} onChange={setAddress} />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPatientForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={patientLoading || !patientForm.helperId}
                >
                  {patientLoading
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
