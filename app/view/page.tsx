"use client";
import ViewHeader from "@/components/ViewHeader";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface GP { _id: string; name: string }
interface Municipality { _id: string; name: string }
interface Block { _id: string; name: string; gramPanchayats: GP[]; municipalities: Municipality[] }
interface SubDiv { _id: string; name: string; blocks: Block[] }
interface BC { _id: string; coordinatorId: string; name: string; phone: string; subDivision: string; blocks: string[]; address: string }
interface Helper { _id: string; helperId: string; name: string; phone: string; subDivision: string; block: string; gramPanchayats: { gpName: string }[]; municipalities: { municipalityName: string }[]; tag: string; blockCoordinatorId: any }
interface ReportRow {
  helper: { _id: string; name: string; phone: string; subDivision: string; block: string; gramPanchayat: string; tag: string };
  totalPatients: number; totalIncentive: number; pendingIncentive: number; clearedIncentive: number;
}
interface Patient {
  _id: string; name: string; mobile: string; ipdNo: string; doa: string;
  incentiveAmount: number; paymentStatus: string; paymentDetail?: any;
  aadharNumber?: string; pincode?: string; swasthaSathNumber?: string;
  dischargeStatus?: string; blockingAmount?: number; dischargeAmount?: number; dischargeDate?: string;
  helperId: { _id: string; name: string; block: string; subDivision: string; gramPanchayats: any[]; tag: string };
  address?: any;
}

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = [
  { val: "01", label: "January" }, { val: "02", label: "February" }, { val: "03", label: "March" },
  { val: "04", label: "April" }, { val: "05", label: "May" }, { val: "06", label: "June" },
  { val: "07", label: "July" }, { val: "08", label: "August" }, { val: "09", label: "September" },
  { val: "10", label: "October" }, { val: "11", label: "November" }, { val: "12", label: "December" },
];
type TabType = "coordinator" | "helper" | "patient";

const selStyle: React.CSSProperties = { fontSize: 13, padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", minWidth: 130 };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, display: "block" };

export default function ViewPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<TabType>("coordinator");
  const [selYear, setSelYear] = useState(String(now.getFullYear()));
  const [selMonth, setSelMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));

  const [locations, setLocations] = useState<SubDiv[]>([]);
  const [selSDId, setSelSDId] = useState("");
  const [selBlockId, setSelBlockId] = useState("");
  const [locFilterType, setLocFilterType] = useState<"gp" | "municipality">("gp");
  const [selGPId, setSelGPId] = useState("");
  const [selMunId, setSelMunId] = useState("");
  const [selBCId, setSelBCId] = useState("");
  const [selHelperId, setSelHelperId] = useState("");
  const [dischargeFilter, setDischargeFilter] = useState("");
  const [patientSearch, setPatientSearch] = useState("");

  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [blockCoordinators, setBlockCoordinators] = useState<BC[]>([]);
  const [helperReport, setHelperReport] = useState<ReportRow[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : []));
    fetch("/api/helpers").then(r => r.json()).then(d => setHelpers(Array.isArray(d) ? d : []));
    fetch("/api/block-coordinators").then(r => r.json()).then(d => setBlockCoordinators(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (activeTab === "helper") loadHelperReport();
    else if (activeTab === "patient") loadPatients();
  }, [activeTab, selYear, selMonth, selSDId, selBlockId, selGPId, selMunId, selHelperId, selBCId]);

  const selectedSD = locations.find(sd => sd._id === selSDId);
  const selectedBlock = selectedSD?.blocks.find(b => b._id === selBlockId);
  const sdName = selectedSD?.name || "";
  const blockName = selectedBlock?.name || "";
  const gpName = selectedBlock?.gramPanchayats.find(g => g._id === selGPId)?.name || "";
  const munName = selectedBlock?.municipalities.find(m => m._id === selMunId)?.name || "";

  // SBs filtered by BC selection
  const filteredHelpers = helpers.filter(h => {
    if (selBCId) {
      const bcId = typeof h.blockCoordinatorId === "object" ? h.blockCoordinatorId?._id : h.blockCoordinatorId;
      if (bcId?.toString() !== selBCId) return false;
    }
    if (sdName && h.subDivision !== sdName) return false;
    if (blockName && h.block !== blockName) return false;
    return true;
  });

  // BCs filtered by SD selection
  const filteredBCs = selSDId ? blockCoordinators.filter(bc => bc.subDivision === sdName) : blockCoordinators;

  async function loadHelperReport() {
    setLoading(true);
    const params = new URLSearchParams({ month: `${selYear}-${selMonth}` });
    if (sdName) params.set("subDivision", sdName);
    if (blockName) params.set("block", blockName);
    if (gpName) params.set("gramPanchayat", gpName);
    if (selHelperId) params.set("helperId", selHelperId);
    const data = await fetch(`/api/reports?${params}`).then(r => r.json());
    let rows = Array.isArray(data) ? data : [];
    // Filter by BC
    if (selBCId) {
      const bcHelperIds = helpers.filter(h => {
        const bcId = typeof h.blockCoordinatorId === "object" ? h.blockCoordinatorId?._id : h.blockCoordinatorId;
        return bcId?.toString() === selBCId;
      }).map(h => h._id);
      rows = rows.filter((r: ReportRow) => bcHelperIds.includes(r.helper._id));
    }
    setHelperReport(rows);
    setLoading(false);
  }

  async function loadPatients() {
    setLoading(true);
    const params = new URLSearchParams({ month: `${selYear}-${selMonth}` });
    if (selHelperId) params.set("helperId", selHelperId);
    let data = await fetch(`/api/patients?${params}`).then(r => r.json());
    if (!Array.isArray(data)) data = [];
    if (sdName) data = data.filter((p: Patient) => p.helperId?.subDivision === sdName);
    if (blockName) data = data.filter((p: Patient) => p.helperId?.block === blockName);
    if (gpName) data = data.filter((p: Patient) => p.address?.gramPanchayat === gpName || p.helperId?.gramPanchayats?.some((g: any) => g.gpName === gpName));
    if (munName) data = data.filter((p: Patient) => p.address?.municipality === munName);
    if (selBCId) {
      const bcHelperIds = helpers.filter(h => {
        const bcId = typeof h.blockCoordinatorId === "object" ? h.blockCoordinatorId?._id : h.blockCoordinatorId;
        return bcId?.toString() === selBCId;
      }).map(h => h._id);
      data = data.filter((p: Patient) => bcHelperIds.includes((p.helperId as any)?._id || p.helperId));
    }
    setPatients(data);
    setLoading(false);
  }

  function resetFilters() {
    setSelSDId(""); setSelBlockId(""); setSelGPId(""); setSelMunId("");
    setSelHelperId(""); setSelBCId(""); setDischargeFilter(""); setPatientSearch("");
  }

  // BC tab display
  const displayBCs = selBCId ? blockCoordinators.filter(bc => bc._id === selBCId) :
    selSDId ? blockCoordinators.filter(bc => bc.subDivision === sdName) : blockCoordinators;

  // Patient display — search + discharge filter
  const displayPatients = patients
    .filter(p => !dischargeFilter || (p.dischargeStatus || "admitted") === dischargeFilter)
    .filter(p => {
      if (!patientSearch) return true;
      const q = patientSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.mobile.includes(q) ||
        p.ipdNo.toLowerCase().includes(q) || (p.helperId as any)?.name?.toLowerCase().includes(q);
    });

  // Stats
  const totalPatients = activeTab === "helper" ? helperReport.reduce((s, r) => s + r.totalPatients, 0) : displayPatients.length;
  const totalIncentive = activeTab === "helper" ? helperReport.reduce((s, r) => s + r.totalIncentive, 0) : displayPatients.reduce((s, p) => s + p.incentiveAmount, 0);
  const pendingAmount = activeTab === "helper" ? helperReport.reduce((s, r) => s + r.pendingIncentive, 0) : displayPatients.filter(p => p.paymentStatus === "pending").reduce((s, p) => s + p.incentiveAmount, 0);

  // BC stats
  function getBCStats(bc: BC) {
    const bcSBs = helpers.filter(h => {
      const bcId = typeof h.blockCoordinatorId === "object" ? h.blockCoordinatorId?._id : h.blockCoordinatorId;
      return bcId?.toString() === bc._id;
    });
    const sbIds = bcSBs.map(h => h._id);
    return { sbCount: bcSBs.length, patientCount: patients.length > 0 ? patients.filter(p => sbIds.includes((p.helperId as any)?._id)).length : "—" };
  }

  // Export functions
  function exportBCs() {
    const rows = displayBCs.map(bc => {
      const stats = getBCStats(bc);
      return {
        "Coordinator ID": bc.coordinatorId, "Name": bc.name, "Phone": bc.phone,
        "Sub Division": bc.subDivision, "Blocks": bc.blocks.join(", "),
        "Address": bc.address, "SB Count": stats.sbCount,
      };
    });
    writeXlsx(rows, "BlockCoordinators");
  }

  function exportHelpers() {
    const monthLabel = MONTHS.find(m => m.val === selMonth)?.label || selMonth;
    const rows = helperReport.map(row => ({
      "Name": row.helper.name, "Phone": row.helper.phone,
      "Sub Division": row.helper.subDivision, "Block": row.helper.block,
      "Gram Panchayat": row.helper.gramPanchayat, "Tag": row.helper.tag,
      "Total Patients": row.totalPatients, "Total Incentive (₹)": row.totalIncentive,
      "Pending (₹)": row.pendingIncentive, "Cleared (₹)": row.clearedIncentive,
    }));
    writeXlsx(rows, `SwasthyaBondhu_${monthLabel}_${selYear}`);
  }

  function exportPatients() {
    const monthLabel = MONTHS.find(m => m.val === selMonth)?.label || selMonth;
    const rows = displayPatients.map(p => ({
      "Patient Name": p.name, "Mobile": p.mobile, "IPD No.": p.ipdNo,
      "Date of Admission": new Date(p.doa).toLocaleDateString("en-IN"),
      "Aadhar Number": p.aadharNumber || "",
      "Swastha Sath No.": p.swasthaSathNumber || "",
      "Pincode": p.pincode || "",
      "Helper Name": (p.helperId as any)?.name || "",
      "Sub Division": (p.helperId as any)?.subDivision || "",
      "Block": (p.helperId as any)?.block || "",
      "Address Type": p.address?.type === "gp" ? "Gram Panchayat" : p.address?.type === "municipality" ? "Municipality" : "",
      "GP / Municipality": p.address?.type === "gp" ? p.address?.gramPanchayat : p.address?.municipality || "",
      "Village / Ward": p.address?.type === "gp" ? p.address?.village : p.address?.ward || "",
      "Incentive (₹)": p.incentiveAmount,
      "Payment Status": p.paymentStatus === "clearance" ? "Clearance" : "Pending",
      "Payment Mode": p.paymentDetail?.mode === "cash" ? "Cash" : p.paymentDetail?.mode === "online" ? "Online" : "",
      "Discharge Status": p.dischargeStatus === "continued" ? "Continued" : p.dischargeStatus === "transferred" ? "Transferred" : "Admitted",
      "Blocking Amount (₹)": p.blockingAmount || "",
      "Discharge Amount (₹)": p.dischargeAmount || "",
      "Discharge Date": p.dischargeDate ? new Date(p.dischargeDate).toLocaleDateString("en-IN") : "",
      "Remarks": p.paymentDetail?.remarks || "",
    }));
    writeXlsx(rows, `Patients_${monthLabel}_${selYear}`);
  }

  function writeXlsx(rows: any[], sheetName: string) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const cols = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }));
    ws["!cols"] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, `${sheetName}.xlsx`);
  }

  function handleExport() {
    if (activeTab === "coordinator") exportBCs();
    else if (activeTab === "helper") exportHelpers();
    else exportPatients();
  }

  const hasFilters = selSDId || selBlockId || selGPId || selMunId || selHelperId || selBCId || dischargeFilter || patientSearch;

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      <ViewHeader />
      <div style={{ padding: "20px 24px" }}>

        {/* Tabs + Export */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="toggle-group">
              <button className={`toggle-btn ${activeTab === "coordinator" ? "active" : ""}`} onClick={() => setActiveTab("coordinator")}>🗂 Block Coordinator</button>
              <button className={`toggle-btn ${activeTab === "helper" ? "active" : ""}`} onClick={() => setActiveTab("helper")}>👥 Swasthya Bondhu</button>
              <button className={`toggle-btn ${activeTab === "patient" ? "active" : ""}`} onClick={() => setActiveTab("patient")}>🏥 Patients</button>
            </div>
            <button className="btn btn-secondary" onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              📥 Export Excel
            </button>
          </div>

          {/* Stats */}
          {activeTab !== "coordinator" && (
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Total Patients", value: totalPatients },
                { label: "Total Incentive", value: `₹${totalIncentive.toLocaleString()}` },
                { label: "Pending", value: `₹${pendingAmount.toLocaleString()}`, accent: true },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.accent ? "var(--accent)" : "var(--text)" }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FILTER BAR */}
        <div className="card" style={{ padding: "14px 18px", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>

            {/* Year + Month — helper/patient only */}
            {activeTab !== "coordinator" && (<>
              <div>
                <span style={labelStyle}>Year</span>
                <select style={selStyle} value={selYear} onChange={e => setSelYear(e.target.value)}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <span style={labelStyle}>Month</span>
                <select style={selStyle} value={selMonth} onChange={e => setSelMonth(e.target.value)}>
                  {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
              </div>
            </>)}

            {/* Sub Division */}
            <div>
              <span style={labelStyle}>Sub Division</span>
              <select style={selStyle} value={selSDId} onChange={e => { setSelSDId(e.target.value); setSelBlockId(""); setSelGPId(""); setSelMunId(""); setSelBCId(""); setSelHelperId(""); }}>
                <option value="">All</option>
                {locations.map(sd => <option key={sd._id} value={sd._id}>{sd.name}</option>)}
              </select>
            </div>

            {/* Block */}
            <div>
              <span style={labelStyle}>Block</span>
              <select style={selStyle} value={selBlockId} disabled={!selSDId} onChange={e => { setSelBlockId(e.target.value); setSelGPId(""); setSelMunId(""); setSelHelperId(""); }}>
                <option value="">{selSDId ? "All Blocks" : "—"}</option>
                {selectedSD?.blocks.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            {/* GP / Municipality toggle — for helper/patient */}
            {activeTab !== "coordinator" && selBlockId && (
              <div>
                <span style={labelStyle}>Location</span>
                <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                  {["gp", "municipality"].map(t => (
                    <button key={t} onClick={() => { setLocFilterType(t as any); setSelGPId(""); setSelMunId(""); }}
                      style={{ padding: "7px 10px", fontSize: 12, border: "none", cursor: "pointer", background: locFilterType === t ? "var(--green-mid)" : "var(--surface)", color: locFilterType === t ? "#fff" : "var(--text-muted)", fontWeight: locFilterType === t ? 600 : 400 }}>
                      {t === "gp" ? "🌿 GP" : "🏙 Mun"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* GP filter */}
            {activeTab !== "coordinator" && selBlockId && locFilterType === "gp" && (
              <div>
                <span style={labelStyle}>Gram Panchayat</span>
                <select style={selStyle} value={selGPId} onChange={e => { setSelGPId(e.target.value); setSelMunId(""); }}>
                  <option value="">All GPs</option>
                  {selectedBlock?.gramPanchayats.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
              </div>
            )}

            {/* Municipality filter */}
            {activeTab !== "coordinator" && selBlockId && locFilterType === "municipality" && (
              <div>
                <span style={labelStyle}>Municipality</span>
                <select style={selStyle} value={selMunId} onChange={e => { setSelMunId(e.target.value); setSelGPId(""); }}>
                  <option value="">All Municipalities</option>
                  {selectedBlock?.municipalities.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
            )}

            {/* Block Coordinator */}
            <div>
              <span style={labelStyle}>Block Coordinator</span>
              <select style={{ ...selStyle, minWidth: 170 }} value={selBCId} onChange={e => { setSelBCId(e.target.value); setSelHelperId(""); }}>
                <option value="">All Coordinators</option>
                {filteredBCs.map(bc => <option key={bc._id} value={bc._id}>{bc.name} — {bc.subDivision}</option>)}
              </select>
            </div>

            {/* Swasthya Bondhu — auto filtered by BC */}
            {activeTab !== "coordinator" && (
              <div>
                <span style={labelStyle}>Swasthya Bondhu {selBCId && <span style={{ color: "var(--green-mid)", fontWeight: 400 }}>(filtered)</span>}</span>
                <select style={{ ...selStyle, minWidth: 170 }} value={selHelperId} onChange={e => setSelHelperId(e.target.value)}>
                  <option value="">All</option>
                  {filteredHelpers.map(h => <option key={h._id} value={h._id}>{h.name} — {h.block}</option>)}
                </select>
              </div>
            )}

            {/* Discharge status — patient tab only */}
            {activeTab === "patient" && (
              <div>
                <span style={labelStyle}>Discharge Status</span>
                <select style={selStyle} value={dischargeFilter} onChange={e => setDischargeFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="admitted">Admitted</option>
                  <option value="continued">Continued</option>
                  <option value="transferred">Transferred</option>
                </select>
              </div>
            )}

            {hasFilters && (
              <button className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-end" }} onClick={resetFilters}>✕ Reset</button>
            )}
          </div>

          {/* Patient search — inline below filters */}
          {activeTab === "patient" && (
            <div style={{ marginTop: 10 }}>
              <input className="form-input" placeholder="🔍 Search patient by name, mobile, IPD No, or Swasthya Bondhu..."
                value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                style={{ maxWidth: 480, fontSize: 13 }} />
            </div>
          )}
        </div>

        {/* TABLES */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading...</div>
        ) : activeTab === "coordinator" ? (

          /* ── BLOCK COORDINATOR TABLE ── */
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>ID</th><th>Name</th><th>Phone</th><th>Sub Division</th><th>Blocks</th><th>SB Count</th><th>Address</th></tr>
              </thead>
              <tbody>
                {displayBCs.length === 0
                  ? <tr><td colSpan={7}><div className="empty-state"><p>No block coordinators found.</p></div></td></tr>
                  : displayBCs.map(bc => {
                    const { sbCount } = getBCStats(bc);
                    return (
                      <tr key={bc._id}>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{bc.coordinatorId}</td>
                        <td style={{ fontWeight: 500 }}>{bc.name}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{bc.phone}</td>
                        <td style={{ fontSize: 12 }}>{bc.subDivision}</td>
                        <td><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{bc.blocks.map(b => <span key={b} className="badge badge-gray">{b}</span>)}</div></td>
                        <td style={{ textAlign: "center" }}><span className="badge badge-green">{sbCount}</span></td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{bc.address || "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

        ) : activeTab === "helper" ? (

          /* ── SWASTHYA BONDHU TABLE ── */
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>Phone</th><th>Sub Division</th><th>Block</th><th>GP</th><th>Tag</th><th>Patients</th><th>Total ₹</th><th>Pending</th><th>Cleared</th></tr>
              </thead>
              <tbody>
                {helperReport.length === 0
                  ? <tr><td colSpan={10}><div className="empty-state"><p>No data for selected filters.</p></div></td></tr>
                  : helperReport.map(row => (
                    <tr key={row.helper._id}>
                      <td style={{ fontWeight: 500 }}>{row.helper.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.helper.phone}</td>
                      <td style={{ fontSize: 12 }}>{row.helper.subDivision}</td>
                      <td style={{ fontSize: 12 }}>{row.helper.block}</td>
                      <td style={{ fontSize: 12 }}>{row.helper.gramPanchayat}</td>
                      <td><span className="badge badge-green">{row.helper.tag}</span></td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{row.totalPatients}</td>
                      <td style={{ fontWeight: 600 }}>₹{row.totalIncentive.toLocaleString()}</td>
                      <td><span className="badge badge-amber">₹{row.pendingIncentive.toLocaleString()}</span></td>
                      <td><span className="badge badge-green">₹{row.clearedIncentive.toLocaleString()}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

        ) : (

          /* ── PATIENT TABLE ── */
          <>
            {/* Discharge summary pills */}
            {patients.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                {[
                  { key: "", label: `All (${patients.length})`, color: "var(--text-muted)" },
                  { key: "admitted", label: `Admitted (${patients.filter(p => !p.dischargeStatus || p.dischargeStatus === "admitted").length})`, color: "var(--green)" },
                  { key: "continued", label: `Continued (${patients.filter(p => p.dischargeStatus === "continued").length})`, color: "#2563eb" },
                  { key: "transferred", label: `Transferred (${patients.filter(p => p.dischargeStatus === "transferred").length})`, color: "var(--red)" },
                ].map(pill => (
                  <button key={pill.key} onClick={() => setDischargeFilter(pill.key)}
                    style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: dischargeFilter === pill.key ? 600 : 400, border: `1.5px solid ${dischargeFilter === pill.key ? pill.color : "var(--border)"}`, background: dischargeFilter === pill.key ? pill.color + "18" : "var(--surface)", color: dischargeFilter === pill.key ? pill.color : "var(--text-muted)", cursor: "pointer" }}>
                    {pill.label}
                  </button>
                ))}
                <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>Showing {displayPatients.length}</span>
              </div>
            )}

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th><th>IPD</th><th>DOA</th><th>Swasthya Bondhu</th>
                    <th>Address</th><th>Incentive</th><th>Payment</th><th>Discharge</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPatients.length === 0
                    ? <tr><td colSpan={8}><div className="empty-state"><p>No patients found.</p></div></td></tr>
                    : displayPatients.map(p => (
                      <tr key={p._id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.mobile}</div>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.ipdNo}</td>
                        <td style={{ fontSize: 12 }}>{new Date(p.doa).toLocaleDateString("en-IN")}</td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{(p.helperId as any)?.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{(p.helperId as any)?.block}</div>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {p.address?.type === "gp"
                            ? `🌿 ${p.address.gramPanchayat}${p.address.village ? ` / ${p.address.village}` : ""}`
                            : p.address?.type === "municipality"
                            ? `🏙 ${p.address.municipality}${p.address.ward ? ` / ${p.address.ward}` : ""}`
                            : "—"}
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{p.incentiveAmount}</td>
                        <td>
                          <span className={`badge ${p.paymentStatus === "clearance" ? "badge-green" : "badge-amber"}`}>
                            {p.paymentStatus === "clearance" ? "✓ Cleared" : "⏳ Pending"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${p.dischargeStatus === "continued" ? "badge-green" : p.dischargeStatus === "transferred" ? "badge-red" : "badge-gray"}`}>
                            {p.dischargeStatus === "continued" ? "✓ Continued" : p.dischargeStatus === "transferred" ? "↗ Transferred" : "🏥 Admitted"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
