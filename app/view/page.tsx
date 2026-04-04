"use client";
import ViewHeader from "@/components/ViewHeader";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface GP { _id: string; name: string }
interface Block { _id: string; name: string; gramPanchayats: GP[] }
interface SubDiv { _id: string; name: string; blocks: Block[] }
interface ReportRow {
  helper: { _id: string; name: string; phone: string; subDivision: string; block: string; gramPanchayat: string; tag: string };
  totalPatients: number; totalIncentive: number; pendingIncentive: number; clearedIncentive: number;
}
interface Patient {
  _id: string; name: string; mobile: string; ipdNo: string; doa: string;
  incentiveAmount: number; paymentStatus: string; paymentDetail?: any;
  helperId: { name: string; block: string; gramPanchayat: string; subDivision: string; tag: string };
}
interface BC {
  _id: string; coordinatorId: string; name: string; phone: string;
  subDivision: string; blocks: string[]; address: string;
}

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = [
  { val: "01", label: "January" }, { val: "02", label: "February" }, { val: "03", label: "March" },
  { val: "04", label: "April" }, { val: "05", label: "May" }, { val: "06", label: "June" },
  { val: "07", label: "July" }, { val: "08", label: "August" }, { val: "09", label: "September" },
  { val: "10", label: "October" }, { val: "11", label: "November" }, { val: "12", label: "December" },
];

type TabType = "coordinator" | "helper" | "patient";

export default function ViewPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<TabType>("coordinator");
  const [selYear, setSelYear] = useState(String(now.getFullYear()));
  const [selMonth, setSelMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));

  const [locations, setLocations] = useState<SubDiv[]>([]);
  const [selSDId, setSelSDId] = useState("");
  const [selBlockId, setSelBlockId] = useState("");
  const [selGPId, setSelGPId] = useState("");
  const [selHelperId, setSelHelperId] = useState("");
  const [selBCId, setSelBCId] = useState("");

  const [helpers, setHelpers] = useState<any[]>([]);
  const [blockCoordinators, setBlockCoordinators] = useState<BC[]>([]);
  const [helperReport, setHelperReport] = useState<ReportRow[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : []));
    fetch("/api/helpers").then(r => r.json()).then(d => setHelpers(Array.isArray(d) ? d : []));
    fetch("/api/block-coordinators").then(r => r.json()).then(d => setBlockCoordinators(Array.isArray(d) ? d : []));
  }, []);

  const selectedSD = locations.find(sd => sd._id === selSDId);
  const selectedBlock = selectedSD?.blocks.find(b => b._id === selBlockId);
  const sdName = selectedSD?.name || "";
  const blockName = selectedBlock?.name || "";
  const gpName = selectedBlock?.gramPanchayats.find(g => g._id === selGPId)?.name || "";

  useEffect(() => {
    if (activeTab === "helper") loadHelperReport();
    else if (activeTab === "patient") loadPatients();
  }, [activeTab, selYear, selMonth, selSDId, selBlockId, selGPId, selHelperId, selBCId]);

  async function loadHelperReport() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("month", `${selYear}-${selMonth}`);
    if (sdName) params.set("subDivision", sdName);
    if (blockName) params.set("block", blockName);
    if (gpName) params.set("gramPanchayat", gpName);
    if (selHelperId) params.set("helperId", selHelperId);
    const data = await fetch(`/api/reports?${params}`).then(r => r.json());
    setHelperReport(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadPatients() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("month", `${selYear}-${selMonth}`);
    if (selHelperId) params.set("helperId", selHelperId);
    let data = await fetch(`/api/patients?${params}`).then(r => r.json());
    if (!Array.isArray(data)) data = [];
    if (sdName) data = data.filter((p: Patient) => p.helperId?.subDivision === sdName);
    if (blockName) data = data.filter((p: Patient) => p.helperId?.block === blockName);
    if (gpName) data = data.filter((p: Patient) => p.helperId?.gramPanchayat === gpName);
    setPatients(data);
    setLoading(false);
  }

  function resetFilters() { setSelSDId(""); setSelBlockId(""); setSelGPId(""); setSelHelperId(""); setSelBCId(""); }

  const filteredHelpers = helpers.filter(h => {
    if (sdName && h.subDivision !== sdName) return false;
    if (blockName && h.block !== blockName) return false;
    return true;
  });

  const filteredBCs = selSDId
    ? blockCoordinators.filter(bc => bc.subDivision === sdName)
    : blockCoordinators;

  // BC view filtered list
  const displayBCs = selBCId
    ? blockCoordinators.filter(bc => bc._id === selBCId)
    : selSDId
      ? blockCoordinators.filter(bc => bc.subDivision === sdName)
      : blockCoordinators;

  const totalPatients = activeTab === "helper"
    ? helperReport.reduce((s, r) => s + r.totalPatients, 0) : patients.length;
  const totalIncentive = activeTab === "helper"
    ? helperReport.reduce((s, r) => s + r.totalIncentive, 0)
    : patients.reduce((s, p) => s + p.incentiveAmount, 0);
  const pendingAmount = activeTab === "helper"
    ? helperReport.reduce((s, r) => s + r.pendingIncentive, 0)
    : patients.filter(p => p.paymentStatus === "pending").reduce((s, p) => s + p.incentiveAmount, 0);

  // Export functions
  function exportBCs() {
    const rows = displayBCs.map(bc => ({
      "Coordinator ID": bc.coordinatorId,
      "Name": bc.name,
      "Phone": bc.phone,
      "Sub Division": bc.subDivision,
      "Blocks": bc.blocks.join(", "),
      "Address": bc.address,
      "Swasthya Bondhu Count": helpers.filter(h => {
        const hbc = h.blockCoordinatorId;
        return (typeof hbc === 'object' ? hbc?._id : hbc)?.toString() === bc._id
      }).length,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [14, 18, 14, 14, 24, 24, 18].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Block Coordinators");
    XLSX.writeFile(wb, `BlockCoordinators.xlsx`);
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
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [20, 14, 16, 14, 18, 16, 14, 18, 14, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Swasthya Bondhu");
    XLSX.writeFile(wb, `SwasthyaBondhu_${monthLabel}_${selYear}.xlsx`);
  }

  function exportPatients() {
    const monthLabel = MONTHS.find(m => m.val === selMonth)?.label || selMonth;
    const rows = patients.map(p => ({
      "Patient Name": p.name, "Mobile": p.mobile, "IPD No.": p.ipdNo,
      "Date of Admission": new Date(p.doa).toLocaleDateString("en-IN"),
      "Helper Name": p.helperId?.name || "", "Sub Division": p.helperId?.subDivision || "",
      "Block": p.helperId?.block || "", "Gram Panchayat": p.helperId?.gramPanchayat || "",
      "Incentive (₹)": p.incentiveAmount,
      "Payment Status": p.paymentStatus === "clearance" ? "Clearance" : "Pending",
      "Payment Mode": p.paymentDetail?.mode === "cash" ? "Cash" : p.paymentDetail?.mode === "online" ? "Online" : "",
      "Remarks": p.paymentDetail?.remarks || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [18, 14, 14, 16, 16, 14, 14, 16, 14, 14, 12, 24].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, `Patients_${monthLabel}_${selYear}.xlsx`);
  }

  function handleExport() {
    if (activeTab === "coordinator") exportBCs();
    else if (activeTab === "helper") exportHelpers();
    else exportPatients();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      <ViewHeader />
      <div style={{ padding: "24px 28px" }}>

        {/* Tabs + Export + Stats */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="toggle-group">
              <button className={`toggle-btn ${activeTab === "coordinator" ? "active" : ""}`} onClick={() => setActiveTab("coordinator")}>
                🗂 Block Coordinator
              </button>
              <button className={`toggle-btn ${activeTab === "helper" ? "active" : ""}`} onClick={() => setActiveTab("helper")}>
                👥 Swasthya Bondhu
              </button>
              <button className={`toggle-btn ${activeTab === "patient" ? "active" : ""}`} onClick={() => setActiveTab("patient")}>
                🏥 Patients
              </button>
            </div>
            <button className="btn btn-secondary" onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              📥 Export Excel
            </button>
          </div>

          {activeTab !== "coordinator" && (
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Total Patients", value: totalPatients, color: "var(--text)" },
                { label: "Total Incentive", value: `₹${totalIncentive.toLocaleString()}`, color: "var(--text)" },
                { label: "Pending", value: `₹${pendingAmount.toLocaleString()}`, color: "var(--accent)" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "right" as const }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* Year + Month — only for helper/patient tabs */}
            {activeTab !== "coordinator" && (<>
              <div className="form-group" style={{ minWidth: 100 }}>
                <label className="form-label">Year</label>
                <select className="form-select" value={selYear} onChange={e => setSelYear(e.target.value)}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ minWidth: 140 }}>
                <label className="form-label">Month</label>
                <select className="form-select" value={selMonth} onChange={e => setSelMonth(e.target.value)}>
                  {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
              </div>
            </>)}

            {/* Sub Division */}
            <div className="form-group" style={{ minWidth: 160 }}>
              <label className="form-label">Sub Division</label>
              <select className="form-select" value={selSDId}
                onChange={e => { setSelSDId(e.target.value); setSelBlockId(""); setSelGPId(""); setSelHelperId(""); setSelBCId(""); }}>
                <option value="">All</option>
                {locations.map(sd => <option key={sd._id} value={sd._id}>{sd.name}</option>)}
              </select>
            </div>

            {/* Block — for helper/patient */}
            {activeTab !== "coordinator" && (
              <div className="form-group" style={{ minWidth: 150 }}>
                <label className="form-label">Block</label>
                <select className="form-select" value={selBlockId} disabled={!selSDId}
                  onChange={e => { setSelBlockId(e.target.value); setSelGPId(""); setSelHelperId(""); }}>
                  <option value="">{selSDId ? "All Blocks" : "—"}</option>
                  {selectedSD?.blocks.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {/* GP — for helper/patient */}
            {activeTab !== "coordinator" && (
              <div className="form-group" style={{ minWidth: 150 }}>
                <label className="form-label">Gram Panchayat</label>
                <select className="form-select" value={selGPId} disabled={!selBlockId}
                  onChange={e => { setSelGPId(e.target.value); setSelHelperId(""); }}>
                  <option value="">{selBlockId ? "All GPs" : "—"}</option>
                  {selectedBlock?.gramPanchayats.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
              </div>
            )}

            {/* Block Coordinator filter */}
            <div className="form-group" style={{ minWidth: 180 }}>
              <label className="form-label">Block Coordinator</label>
              <select className="form-select" value={selBCId} onChange={e => setSelBCId(e.target.value)}>
                <option value="">All Coordinators</option>
                {filteredBCs.map(bc => <option key={bc._id} value={bc._id}>{bc.name} — {bc.subDivision}</option>)}
              </select>
            </div>

            {/* Swasthya Bondhu — for helper/patient */}
            {activeTab !== "coordinator" && (
              <div className="form-group" style={{ minWidth: 180 }}>
                <label className="form-label">Swasthya Bondhu</label>
                <select className="form-select" value={selHelperId} onChange={e => setSelHelperId(e.target.value)}>
                  <option value="">All</option>
                  {filteredHelpers.map(h => <option key={h._id} value={h._id}>{h.name} — {h.block}</option>)}
                </select>
              </div>
            )}

            {(selSDId || selBlockId || selGPId || selHelperId || selBCId) && (
              <button className="btn btn-secondary btn-sm" style={{ marginBottom: 1 }} onClick={resetFilters}>✕ Reset</button>
            )}
          </div>
        </div>

        {/* Tables */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading...</div>
        ) : activeTab === "coordinator" ? (

          /* Block Coordinator View */
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Coordinator ID</th><th>Name</th><th>Phone</th>
                  <th>Sub Division</th><th>Blocks</th><th>Address</th><th>SB Count</th>
                </tr>
              </thead>
              <tbody>
                {displayBCs.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><p>No block coordinators found.</p></div></td></tr>
                ) : displayBCs.map(bc => {
                  const sbCount = helpers.filter(h => {
                    const hbc = h.blockCoordinatorId;
                    return (typeof hbc === 'object' ? hbc?._id : hbc)?.toString() === bc._id
                  }).length;
                  return (
                    <tr key={bc._id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{bc.coordinatorId}</td>
                      <td style={{ fontWeight: 500 }}>{bc.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{bc.phone}</td>
                      <td style={{ fontSize: 12 }}>{bc.subDivision}</td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {bc.blocks.map(b => <span key={b} className="badge badge-gray">{b}</span>)}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{bc.address || "—"}</td>
                      <td style={{ fontWeight: 600, textAlign: "center" }}>
                        <span className="badge badge-green">{sbCount}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        ) : activeTab === "helper" ? (

          /* Helper View */
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Swasthya Bondhu</th><th>Phone</th><th>Sub Division</th>
                  <th>Block</th><th>GP</th><th>Tag</th>
                  <th>Patients</th><th>Total ₹</th><th>Pending</th><th>Cleared</th>
                </tr>
              </thead>
              <tbody>
                {helperReport.length === 0 ? (
                  <tr><td colSpan={10}><div className="empty-state"><p>No data for selected filters.</p></div></td></tr>
                ) : helperReport.map(row => (
                  <tr key={row.helper._id}>
                    <td style={{ fontWeight: 500 }}>{row.helper.name}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.helper.phone}</td>
                    <td style={{ fontSize: 12 }}>{row.helper.subDivision}</td>
                    <td style={{ fontSize: 12 }}>{row.helper.block}</td>
                    <td style={{ fontSize: 12 }}>{row.helper.gramPanchayat}</td>
                    <td><span className="badge badge-green">{row.helper.tag}</span></td>
                    <td style={{ fontWeight: 600, textAlign: "center" }}>{row.totalPatients}</td>
                    <td style={{ fontWeight: 600 }}>₹{row.totalIncentive.toLocaleString()}</td>
                    <td><span className="badge badge-amber">₹{row.pendingIncentive.toLocaleString()}</span></td>
                    <td><span className="badge badge-green">₹{row.clearedIncentive.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (

          /* Patient View */
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th><th>Mobile</th><th>IPD No.</th><th>DOA</th>
                  <th>Referred By</th><th>Block / GP</th><th>Incentive</th><th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><p>No patients for selected filters.</p></div></td></tr>
                ) : patients.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.mobile}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.ipdNo}</td>
                    <td style={{ fontSize: 12 }}>{new Date(p.doa).toLocaleDateString("en-IN")}</td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.helperId?.name}</div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.helperId?.block} / {p.helperId?.gramPanchayat}</td>
                    <td style={{ fontWeight: 600 }}>₹{p.incentiveAmount}</td>
                    <td>
                      <span className={`badge ${p.paymentStatus === "clearance" ? "badge-green" : "badge-amber"}`}>
                        {p.paymentStatus === "clearance" ? "✓ Clearance" : "⏳ Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
