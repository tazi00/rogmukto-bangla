"use client";
import { useEffect, useState, useRef } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import MultiSearchSelect from "@/components/MultiSearchSelect";
import CreatableSearchSelect from "@/components/CreatableSearchSelect";

interface BC {
  _id: string;
  coordinatorId: string;
  name: string;
  subDivision: string;
  blocks: string[];
}
interface Village { _id: string; name: string; }
interface Ward { _id: string; name: string; }
interface GP { _id: string; name: string; villages: Village[]; }
interface Municipality { _id: string; name: string; wards: Ward[]; }
interface Block { _id: string; name: string; gramPanchayats: GP[]; municipalities: Municipality[]; }
interface SubDiv { _id: string; name: string; blocks: Block[]; }
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
  doj?: string;
  blockCoordinatorId: { _id: string; name: string; coordinatorId: string };
}

// ── Survey types ─────────────────────────────────────────────────────────────
interface SurveyHealthIssue {
  whose: string;
  age: number;
  type: "serious" | "within_1_month" | "within_2_months" | "others";
}
interface Survey {
  _id: string;
  familyName: string;
  mobile: string;
  whatsapp: string;
  village: string;
  ward: string;
  membersM: number; membersF: number;
  childM: number; childF: number;
  above65M: number; above65F: number;
  healthIssueDetected: boolean;
  healthIssues: SurveyHealthIssue[];
  createdAt: string;
}

const EMPTY_SURVEY_FORM = {
  familyName: "", mobile: "", whatsapp: "",
  membersM: 0, membersF: 0, childM: 0, childF: 0, above65M: 0, above65F: 0,
  healthIssueDetected: false,
};

const HEALTH_CONFIG = {
  serious:         { label: "Serious",         color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  within_1_month:  { label: "Within 1 Month",  color: "#b45309", bg: "#fefce8", border: "#fde047" },
  within_2_months: { label: "Within 2 Months", color: "#166534", bg: "#f0fdf4", border: "#86efac" },
  others:          { label: "Others",           color: "#111827", bg: "#f3f4f6", border: "#9ca3af" },
} as const;

const TODAY_ISO = new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { helperId: "", name: "", phone: "", tag: "Swasthya Bondhu", doj: TODAY_ISO };

// ── Hover tooltip for GP/Village columns ─────────────────────────────────────
function InfoTooltip({ items, label }: { items: string[]; label: string }) {
  const [visible, setVisible] = useState(false);
  if (items.length === 0) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const first = items[0];
  const hasMore = items.length > 1;
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 14 }}>{first}</span>
      {hasMore && (
        <span
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 20, height: 20, borderRadius: "50%",
            background: "var(--green-mid, #2d6a4f)", color: "#fff",
            fontSize: 11, fontWeight: 700, cursor: "default", flexShrink: 0,
          }}
        >ⓘ</span>
      )}
      {visible && hasMore && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500,
          background: "var(--surface, #fff)", border: "1px solid var(--border, #e0e0e0)",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", minWidth: 200, padding: "10px 14px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ fontSize: 13, padding: "4px 0", borderBottom: i < items.length - 1 ? "1px solid var(--border, #f0f0f0)" : "none" }}>
              {item}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

export default function HelpersPage() {
  const [role, setRole] = useState<string | null>(null);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [patientCounts, setPatientCounts] = useState<Record<string, number>>({});
  const [surveyCounts, setSurveyCounts] = useState<Record<string, number>>({});
  // Survey modal state
  const [surveyModalSB, setSurveyModalSB] = useState<Helper | null>(null);
  const [surveyList, setSurveyList] = useState<Survey[]>([]);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [surveyEditForm, setSurveyEditForm] = useState(EMPTY_SURVEY_FORM);
  const [surveyEditHealthIssues, setSurveyEditHealthIssues] = useState<SurveyHealthIssue[]>([]);
  const [surveyEditLoading, setSurveyEditLoading] = useState(false);
  const [surveyEditError, setSurveyEditError] = useState("");
  const [bcs, setBcs] = useState<BC[]>([]);
  const [locations, setLocations] = useState<SubDiv[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Helper | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedBC, setSelectedBC] = useState<BC | null>(null);
  const [bcSearch, setBcSearch] = useState("");
  const [showBCDrop, setShowBCDrop] = useState(false);
  const [selectedSDId, setSelectedSDId] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [useGP, setUseGP] = useState(false);
  const [selectedGP, setSelectedGP] = useState("");
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  const [useMun, setUseMun] = useState(false);
  const [selectedMun, setSelectedMun] = useState("");
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "block" | "subDivision">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [creating, setCreating] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce<Record<string, string>>((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = decodeURIComponent(v || "");
      return acc;
    }, {});
    setRole(cookies["role_hint"] || null);
    load();
    fetch("/api/block-coordinators").then((r) => r.json()).then((d) => setBcs(Array.isArray(d) ? d : []));
    fetch("/api/locations").then((r) => r.json()).then((d) => setLocations(Array.isArray(d) ? d : []));
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowBCDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function load() {
    const data = await fetch("/api/helpers").then((r) => r.json());
    const helperList: Helper[] = Array.isArray(data) ? data : [];
    setHelpers(helperList);
    // Fetch patient counts per helper
    const counts: Record<string, number> = {};
    await Promise.all(
      helperList.map(async (h) => {
        const res = await fetch(`/api/patients?helperId=${h._id}`).then((r) => r.json());
        counts[h._id] = Array.isArray(res) ? res.length : 0;
      })
    );
    setPatientCounts(counts);

    // Fetch survey counts per helper
    const sCounts: Record<string, number> = {};
    await Promise.all(
      helperList.map(async (h) => {
        const res = await fetch(`/api/surveys?sbId=${h._id}`).then((r) => r.json());
        sCounts[h._id] = Array.isArray(res) ? res.length : 0;
      })
    );
    setSurveyCounts(sCounts);
  }

  async function openSurveyModal(h: Helper) {
    setSurveyModalSB(h);
    setSelectedSurvey(null);
    setSurveyLoading(true);
    const data = await fetch(`/api/surveys?sbId=${h._id}`).then((r) => r.json());
    const list = Array.isArray(data) ? data : [];
    setSurveyList(list);
    setSelectedSurvey(list.length > 0 ? list[0] : null);
    setSurveyLoading(false);
  }

  const sdData = locations.find((sd) => sd._id === selectedSDId);
  const blockData = sdData?.blocks.find((b) => b.name === selectedBlock);

  function openAdd() {
    setEditItem(null); setForm(EMPTY_FORM); setSelectedBC(null); setBcSearch("");
    setSelectedSDId(""); setSelectedBlock(""); setUseGP(false); setSelectedGP("");
    setSelectedVillages([]); setUseMun(false); setSelectedMun(""); setSelectedWards([]);
    setError(""); setShowModal(true);
  }

  function openEdit(h: Helper) {
    setEditItem(h);
    setForm({ helperId: h.helperId || "", name: h.name, phone: h.phone, tag: h.tag, doj: h.doj ? new Date(h.doj).toISOString().slice(0, 10) : TODAY_ISO });

    const bc = bcs.find((b) => b._id === (h.blockCoordinatorId as any)?._id || b._id === (h.blockCoordinatorId as any));
    setSelectedBC(bc || null);
    setBcSearch(bc?.name || h.blockCoordinatorId?.name || "");

    // ── Fix: SD dhundho helper ke subDivision se, BC ke nahi ──
    const sd = locations.find((s) => s.name === h.subDivision);
    setSelectedSDId(sd?._id || "");
    setSelectedBlock(h.block);

    // GP — saare GPs prefill karo (multiple support ke liye pehla wala hi hai abhi)
    const hasGP = h.gramPanchayats.length > 0;
    setUseGP(hasGP);
    setSelectedGP(h.gramPanchayats[0]?.gpName || "");
    // villages: string[] directly stored hain
    setSelectedVillages(h.gramPanchayats[0]?.villages || []);

    // Municipality
    const hasMun = h.municipalities.length > 0;
    setUseMun(hasMun);
    setSelectedMun(h.municipalities[0]?.municipalityName || "");
    setSelectedWards(h.municipalities[0]?.wards || []);

    setError(""); setShowModal(true);
  }

  const filteredBCs = bcs.filter((bc) =>
    !bcSearch || bc.name.toLowerCase().includes(bcSearch.toLowerCase()) || bc.coordinatorId.toLowerCase().includes(bcSearch.toLowerCase())
  );

  function selectBC(bc: BC) {
    setSelectedBC(bc); setBcSearch(bc.name); setShowBCDrop(false);
    const sd = locations.find((s) => s.name === bc.subDivision);
    setSelectedSDId(sd?._id || "");
    setSelectedBlock(bc.blocks.length === 1 ? bc.blocks[0] : "");
    setUseGP(false); setSelectedGP(""); setSelectedVillages([]);
    setUseMun(false); setSelectedMun(""); setSelectedWards([]);
  }

  async function reloadLocations() {
    const data = await fetch("/api/locations").then((r) => r.json());
    setLocations(Array.isArray(data) ? data : []);
  }

  async function createSD(name: string) {
    setCreating(true);
    await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "subdivision", name }) });
    await reloadLocations();
    const data = await fetch("/api/locations").then((r) => r.json());
    const sd = Array.isArray(data) ? data.find((s: SubDiv) => s.name === name) : null;
    if (sd) { setSelectedSDId(sd._id); setSelectedBlock(""); setSelectedGP(""); setSelectedVillages([]); setSelectedMun(""); setSelectedWards([]); }
    setCreating(false);
  }

  async function createBlock(name: string) {
    if (!selectedSDId) return;
    setCreating(true);
    await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "block", name, subDivisionId: selectedSDId }) });
    await reloadLocations();
    setSelectedBlock(name); setSelectedGP(""); setSelectedVillages([]); setSelectedMun(""); setSelectedWards([]);
    setCreating(false);
  }

  async function createGP(name: string) {
    if (!selectedSDId || !selectedBlock) return;
    setCreating(true);
    const sd = locations.find((s) => s._id === selectedSDId);
    const block = sd?.blocks.find((b) => b.name === selectedBlock);
    if (block) {
      await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "gp", name, subDivisionId: selectedSDId, blockId: block._id }) });
      await reloadLocations(); setSelectedGP(name); setSelectedVillages([]);
    }
    setCreating(false);
  }

  async function createMun(name: string) {
    if (!selectedSDId || !selectedBlock) return;
    setCreating(true);
    const sd = locations.find((s) => s._id === selectedSDId);
    const block = sd?.blocks.find((b) => b.name === selectedBlock);
    if (block) {
      await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "municipality", name, subDivisionId: selectedSDId, blockId: block._id }) });
      await reloadLocations(); setSelectedMun(name); setSelectedWards([]);
    }
    setCreating(false);
  }

  async function createVillage(gpName: string, villageName: string) {
    setCreating(true);
    const sd = locations.find((s) => s._id === selectedSDId);
    const block = sd?.blocks.find((b) => b.name === selectedBlock);
    const gp = block?.gramPanchayats.find((g) => g.name === gpName);
    if (gp && block) {
      await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "village", name: villageName, subDivisionId: selectedSDId, blockId: block._id, gpId: gp._id }) });
      await reloadLocations(); setSelectedVillages((prev) => [...prev, villageName]);
    }
    setCreating(false);
  }

  async function createWard(munName: string, wardName: string) {
    setCreating(true);
    const sd = locations.find((s) => s._id === selectedSDId);
    const block = sd?.blocks.find((b) => b.name === selectedBlock);
    const mun = block?.municipalities.find((m) => m.name === munName);
    if (mun && block) {
      await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "ward", name: wardName, subDivisionId: selectedSDId, blockId: block._id, munId: mun._id }) });
      await reloadLocations(); setSelectedWards((prev) => [...prev, wardName]);
    }
    setCreating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBC) { setError("Select a Block Coordinator"); return; }
    if (!selectedBlock) { setError("Select a Block"); return; }
    if (!useGP && !useMun) { setError("Select at least GP or Municipality"); return; }
    if (useGP && !selectedGP) { setError("Select a Gram Panchayat"); return; }
    if (useMun && !selectedMun) { setError("Select a Municipality"); return; }
    setLoading(true); setError("");
    try {
      const body = {
        ...form,
        blockCoordinatorId: selectedBC._id,
        subDivision: sdData?.name || selectedBC.subDivision,
        block: selectedBlock,
        gramPanchayats: useGP && selectedGP ? [{ gpName: selectedGP, villages: selectedVillages }] : [],
        municipalities: useMun && selectedMun ? [{ municipalityName: selectedMun, wards: selectedWards }] : [],
      };
      const url = editItem ? `/api/helpers?id=${editItem._id}` : "/api/helpers";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      setShowModal(false); load();
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this Swasthya Bondhu?")) return;
    await fetch(`/api/helpers?id=${id}`, { method: "DELETE" }); load();
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const SortTh = ({ label, k }: { label: string; k: typeof sortKey }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label}{" "}{sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );

  const q = search.toLowerCase();
  const filtered = helpers
    .filter((h) =>
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.block?.toLowerCase().includes(q) ||
      h.subDivision?.toLowerCase().includes(q) ||
      h.phone?.includes(q) ||
      (h.helperId || "").toLowerCase().includes(q) ||
      h.gramPanchayats?.some((g) => g.gpName.toLowerCase().includes(q))
    )
    .sort((a, b) => {
      const va = (a[sortKey] || "").toLowerCase();
      const vb = (b[sortKey] || "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const tdStyle: React.CSSProperties = { fontSize: 14, padding: "14px 12px", verticalAlign: "middle" };

  return (
    <>
      <div className="page-header">
        <h2>Swasthya Bondhu</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Swasthya Bondhu</button>
      </div>
      <div className="page-body">
        <div style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            style={{ maxWidth: 380 }}
            placeholder="🔍 Search by name or phone or ID or Sub-Division"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrapper" style={{ overflowX: "auto" }}>
          <table style={{ fontSize: 14, minWidth: 1300 }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>ID</th>
                <SortTh label="Name" k="name" />
                <th style={{ whiteSpace: "nowrap" }}>DOJ</th>
                <th style={{ whiteSpace: "nowrap" }}>Phone</th>
                <th style={{ whiteSpace: "nowrap" }}>Block Coordinator</th>
                <SortTh label="Sub Division" k="subDivision" />
                <SortTh label="Block" k="block" />
                <th style={{ whiteSpace: "nowrap" }}>GP / Municipality</th>
                <th style={{ whiteSpace: "nowrap" }}>Village / Ward</th>
                <th style={{ whiteSpace: "nowrap" }}>Tag</th>
                <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>Survey Report</th>
                <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>Admitted Patients</th>
                <th style={{ whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13}>
                    <div className="empty-state">
                      <p>{search ? "No results found." : "No Swasthya Bondhu found."}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((h) => {
                  const gpNames = h.gramPanchayats?.map((g) => `🌿 ${g.gpName}`) || [];
                  const munNames = h.municipalities?.map((m) => `🏙 ${m.municipalityName}`) || [];
                  const allGPMun = [...gpNames, ...munNames];
                  const villageNames = h.gramPanchayats?.flatMap((g) => g.villages.map((v) => `🏘 ${v}`)) || [];
                  const wardNames = h.municipalities?.flatMap((m) => m.wards.map((w) => `🔢 ${w}`)) || [];
                  const allVillageWard = [...villageNames, ...wardNames];

                  return (
                    <tr key={h._id}>
                      <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {h.helperId || "—"}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {h.name}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        {h.doj ? new Date(h.doj).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        {h.phone}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        {h.blockCoordinatorId?.name || "—"}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{h.subDivision}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{h.block}</td>

                      {/* GP/Municipality — first item + ⓘ hover for rest */}
                      <td style={{ ...tdStyle, maxWidth: 200 }}>
                        <InfoTooltip items={allGPMun} label="GP / Municipality" />
                      </td>

                      {/* Village/Ward — same pattern */}
                      <td style={{ ...tdStyle, maxWidth: 200 }}>
                        <InfoTooltip items={allVillageWard} label="Village / Ward" />
                      </td>

                      <td style={tdStyle}>
                        <span className="badge badge-green">{h.tag}</span>
                      </td>

                      {/* Survey Report — live count, clickable */}
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {(surveyCounts[h._id] ?? 0) === 0 ? (
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>— families</span>
                        ) : (
                          <button
                            onClick={() => openSurveyModal(h)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700,
                              background: "#eff6ff", color: "#1d4ed8", border: "1.5px solid #93c5fd",
                              cursor: "pointer",
                            }}
                          >
                            📋 {surveyCounts[h._id]} {surveyCounts[h._id] === 1 ? "family" : "families"}
                          </button>
                        )}
                      </td>

                      {/* Admitted Patients count — live from API */}
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          minWidth: 38, height: 38, borderRadius: "50%",
                          background: (patientCounts[h._id] ?? 0) > 0 ? "var(--green-light, #d8f3dc)" : "var(--surface)",
                          border: "1px solid var(--border)",
                          fontWeight: 700, fontSize: 15,
                          color: (patientCounts[h._id] ?? 0) > 0 ? "var(--green-dark, #1b4332)" : "var(--text-muted)",
                        }}>
                          {patientCounts[h._id] ?? "…"}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {role === "admin" && (
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(h)}>Edit</button>
                          )}
                          {role === "admin" && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(h._id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal (unchanged logic) ── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3>{editItem ? "Edit Swasthya Bondhu" : "Add Swasthya Bondhu"}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

                <div className="form-group">
                  <label className="form-label">
                    Swasthya Bondhu ID{" "}
                    <span style={{ fontWeight: 400, fontSize: 11, color: "var(--text-muted)" }}>(optional)</span>
                  </label>
                  <input className="form-input" value={form.helperId} onChange={(e) => setForm({ ...form, helperId: e.target.value })} placeholder="e.g. SB-001" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramu Das" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input className="form-input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit" />
                  </div>
                </div>

                {/* DOJ field */}
                <div className="form-group">
                  <label className="form-label">Date of Joining (DOJ)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.doj}
                    onChange={(e) => setForm({ ...form, doj: e.target.value })}
                  />
                </div>

                {/* BC search dropdown */}
                <div className="form-group" ref={dropRef} style={{ position: "relative" }}>
                  <label className="form-label">Block Coordinator *</label>
                  <input
                    className="form-input"
                    placeholder="🔍 Search by ID or name..."
                    value={bcSearch}
                    autoComplete="off"
                    onFocus={() => setShowBCDrop(true)}
                    onChange={(e) => { setBcSearch(e.target.value); setSelectedBC(null); setShowBCDrop(true); setSelectedBlock(""); }}
                  />
                  {!selectedBC && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>💡 SubDivision & Block auto-fill after selection</div>}
                  {showBCDrop && !selectedBC && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 300, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", boxShadow: "var(--shadow-md)", maxHeight: 200, overflowY: "auto" }}>
                      {filteredBCs.length === 0
                        ? <div style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 13 }}>No coordinators found</div>
                        : filteredBCs.map((bc) => (
                          <div key={bc._id}
                            style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--gray-100)" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--gray-50)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                            onClick={() => selectBC(bc)}
                          >
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{bc.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ID: {bc.coordinatorId} · {bc.subDivision} · {bc.blocks.join(", ")}</div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  {selectedBC && (
                    <div style={{ marginTop: 6, padding: "7px 10px", background: "var(--green-light)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--green-dark)", display: "flex", justifyContent: "space-between" }}>
                      <span>✓ <strong>{selectedBC.name}</strong> · {selectedBC.subDivision}</span>
                      <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--green-dark)" }} onClick={() => { setSelectedBC(null); setBcSearch(""); setSelectedBlock(""); setShowBCDrop(true); }}>✕</button>
                    </div>
                  )}
                </div>

                {selectedBC && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Sub Division *</label>
                      <CreatableSearchSelect
                        options={locations.map((sd) => ({ label: sd.name, value: sd._id }))}
                        value={sdData?._id || ""}
                        onChange={(v) => { setSelectedSDId(v); setSelectedBlock(""); setSelectedGP(""); setSelectedVillages([]); setSelectedMun(""); setSelectedWards([]); }}
                        onCreateOption={createSD} creating={creating} placeholder="Search or add new..."
                      />
                      {sdData?.name && sdData.name !== selectedBC.subDivision && (
                        <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 3 }}>⚠ Different from BC ({selectedBC.subDivision})</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Block *</label>
                      <CreatableSearchSelect
                        options={sdData?.blocks.map((b) => ({ label: b.name, value: b.name })) || []}
                        value={selectedBlock}
                        onChange={(v) => { setSelectedBlock(v); setSelectedGP(""); setSelectedVillages([]); setSelectedMun(""); setSelectedWards([]); }}
                        onCreateOption={selectedSDId ? createBlock : undefined} creating={creating}
                        placeholder={sdData ? "Search or add new..." : "Select Sub Division first"} disabled={!sdData}
                      />
                    </div>
                  </div>
                )}

                {selectedBC && selectedBlock && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Location Type *</label>
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        <label onClick={() => { setUseGP(!useGP); if (useGP) { setSelectedGP(""); setSelectedVillages([]); } }}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", border: `2px solid ${useGP ? "var(--green-mid)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: useGP ? "var(--green-light)" : "var(--surface)", cursor: "pointer", fontSize: 13, userSelect: "none" }}>
                          {useGP ? "✓ " : ""}🌿 Gram Panchayat
                        </label>
                        <label onClick={() => { setUseMun(!useMun); if (useMun) { setSelectedMun(""); setSelectedWards([]); } }}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", border: `2px solid ${useMun ? "var(--green-mid)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: useMun ? "var(--green-light)" : "var(--surface)", cursor: "pointer", fontSize: 13, userSelect: "none" }}>
                          {useMun ? "✓ " : ""}🏙 Municipality
                        </label>
                      </div>
                    </div>

                    {useGP && blockData && (
                      <div className="form-group">
                        <CreatableSearchSelect label="Gram Panchayat *"
                          options={blockData.gramPanchayats.map((g) => ({ label: g.name, value: g.name }))}
                          value={selectedGP} onChange={(v) => { setSelectedGP(v); setSelectedVillages([]); }}
                          onCreateOption={createGP} creating={creating} placeholder="Search or add Gram Panchayat..."
                        />
                        {selectedGP && (
                          <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: "3px solid var(--green-light)" }}>
                            <label className="form-label" style={{ marginBottom: 6 }}>🌿 {selectedGP} — Villages</label>
                            <CreatableSearchSelect
                              options={(blockData.gramPanchayats.find((g) => g.name === selectedGP)?.villages || []).map((v) => ({ label: v.name, value: v.name })).filter((v) => !selectedVillages.includes(v.value))}
                              value="" onChange={(v) => { if (v && !selectedVillages.includes(v)) setSelectedVillages((prev) => [...prev, v]); }}
                              onCreateOption={(vName) => createVillage(selectedGP, vName)} creating={creating} placeholder="Search or add village..."
                            />
                            {selectedVillages.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                                {selectedVillages.map((v) => (
                                  <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, fontSize: 11 }}>
                                    🏘 {v} <span onClick={() => setSelectedVillages((prev) => prev.filter((vv) => vv !== v))} style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>✕</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {useMun && blockData && (
                      <div className="form-group">
                        <CreatableSearchSelect label="Municipality *"
                          options={blockData.municipalities.map((m) => ({ label: m.name, value: m.name }))}
                          value={selectedMun} onChange={(v) => { setSelectedMun(v); setSelectedWards([]); }}
                          onCreateOption={createMun} creating={creating} placeholder="Search or add Municipality..."
                        />
                        {selectedMun && (
                          <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: "3px solid #d0d8ff" }}>
                            <label className="form-label" style={{ marginBottom: 6 }}>🏙 {selectedMun} — Wards</label>
                            <CreatableSearchSelect
                              options={(blockData.municipalities.find((m) => m.name === selectedMun)?.wards || []).map((w) => ({ label: w.name, value: w.name })).filter((w) => !selectedWards.includes(w.value))}
                              value="" onChange={(v) => { if (v && !selectedWards.includes(v)) setSelectedWards((prev) => [...prev, v]); }}
                              onCreateOption={(wName) => createWard(selectedMun, wName)} creating={creating} placeholder="Search or add ward..."
                            />
                            {selectedWards.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                                {selectedWards.map((w) => (
                                  <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, fontSize: 11 }}>
                                    🔢 {w} <span onClick={() => setSelectedWards((prev) => prev.filter((ww) => ww !== w))} style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>✕</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Tag</label>
                  <SearchableSelect options={[{ label: "Swasthya Bondhu", value: "Swasthya Bondhu" }]} value={form.tag} onChange={(v) => setForm({ ...form, tag: v })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading || !selectedBC || !selectedBlock}>
                  {loading ? "Saving..." : editItem ? "Update Swasthya Bondhu" : "Add Swasthya Bondhu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══ Survey Report Modal ══ */}
      {surveyModalSB && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { setSurveyModalSB(null); setSelectedSurvey(null); } }}
        >
          <div style={{ background: "#fff", borderRadius: 12, width: "90vw", maxWidth: 900, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            {/* Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>Survey Report — {surveyModalSB.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
                  {surveyModalSB.helperId || "—"} · {surveyModalSB.subDivision} · {surveyModalSB.block}
                </div>
              </div>
              <button onClick={() => { setSurveyModalSB(null); setSelectedSurvey(null); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {surveyLoading ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
            ) : surveyList.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                <div>Koi survey nahi mila</div>
              </div>
            ) : (
              <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* Left — Families list */}
                <div style={{ width: 260, borderRight: "1px solid var(--border)", overflowY: "auto", flexShrink: 0 }}>
                  <div style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>
                    {surveyList.length} {surveyList.length === 1 ? "Family" : "Families"}
                  </div>
                  {surveyList.map((s) => (
                    <div
                      key={s._id}
                      onClick={() => setSelectedSurvey(s)}
                      style={{
                        padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                        background: selectedSurvey?._id === s._id ? "#eff6ff" : "transparent",
                        borderLeft: selectedSurvey?._id === s._id ? "3px solid #3b82f6" : "3px solid transparent",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.familyName} Family</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                        {s.village || s.ward || "—"} · {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </div>
                      {s.healthIssueDetected && s.healthIssues.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                          {s.healthIssues.slice(0, 2).map((hi, i) => {
                            const cfg = HEALTH_CONFIG[hi.type] || HEALTH_CONFIG.others;
                            return (
                              <span key={i} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 600 }}>
                                {cfg.label}
                              </span>
                            );
                          })}
                          {s.healthIssues.length > 2 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{s.healthIssues.length - 2} more</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Right — Selected family detail */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                  {!selectedSurvey ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 14 }}>
                      ← Family select karo
                    </div>
                  ) : editingSurvey?._id === selectedSurvey._id ? (
                    /* ── Edit Form ── */
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Survey</div>
                        <button onClick={() => { setEditingSurvey(null); setSurveyEditError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20 }}>✕</button>
                      </div>
                      {surveyEditError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{surveyEditError}</div>}
                      <div className="form-group">
                        <label className="form-label">Family Name *</label>
                        <input className="form-input" value={surveyEditForm.familyName} onChange={(e) => setSurveyEditForm({ ...surveyEditForm, familyName: e.target.value })} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Mobile</label>
                          <input className="form-input" maxLength={10} value={(surveyEditForm as any).mobile || ""} onChange={(e) => setSurveyEditForm({ ...surveyEditForm, mobile: e.target.value } as any)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">WhatsApp</label>
                          <input className="form-input" maxLength={10} value={(surveyEditForm as any).whatsapp || ""} onChange={(e) => setSurveyEditForm({ ...surveyEditForm, whatsapp: e.target.value } as any)} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                        {([
                          { label: "Members", mKey: "membersM", fKey: "membersF" },
                          { label: "Children", mKey: "childM", fKey: "childF" },
                          { label: "Above 65", mKey: "above65M", fKey: "above65F" },
                        ] as const).map(({ label, mKey, fKey }) => (
                          <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {(["M", "F"] as const).map((g) => {
                                const k = g === "M" ? mKey : fKey;
                                return (
                                  <div key={g} style={{ flex: 1 }}>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{g}</div>
                                    <input type="number" min={0} className="form-input" style={{ padding: "4px 6px", fontSize: 13 }}
                                      value={(surveyEditForm as any)[k]}
                                      onChange={(e) => setSurveyEditForm({ ...surveyEditForm, [k]: Number(e.target.value) })}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, marginBottom: 10 }}>
                          <input type="checkbox" checked={surveyEditForm.healthIssueDetected}
                            onChange={(e) => { setSurveyEditForm({ ...surveyEditForm, healthIssueDetected: e.target.checked }); if (!e.target.checked) setSurveyEditHealthIssues([]); }}
                          />
                          Health issue detected?
                        </label>
                        {surveyEditForm.healthIssueDetected && (
                          <>
                            {surveyEditHealthIssues.map((issue, i) => (
                              <div key={i} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: "1px solid var(--border)", position: "relative" }}>
                                <button type="button" onClick={() => setSurveyEditHealthIssues((p) => p.filter((_, idx) => idx !== i))}
                                  style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>✕</button>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px", gap: 8, marginBottom: 8 }}>
                                  <div>
                                    <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Whose</label>
                                    <input className="form-input" value={issue.whose}
                                      onChange={(e) => setSurveyEditHealthIssues((p) => p.map((it, idx) => idx === i ? { ...it, whose: e.target.value } : it))} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Age</label>
                                    <input type="number" min={0} className="form-input" value={issue.age}
                                      onChange={(e) => setSurveyEditHealthIssues((p) => p.map((it, idx) => idx === i ? { ...it, age: Number(e.target.value) } : it))} />
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {(Object.entries(HEALTH_CONFIG) as [string, typeof HEALTH_CONFIG[keyof typeof HEALTH_CONFIG]][]).map(([key, cfg]) => (
                                    <button key={key} type="button"
                                      onClick={() => setSurveyEditHealthIssues((p) => p.map((it, idx) => idx === i ? { ...it, type: key as any } : it))}
                                      style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: issue.type === key ? cfg.bg : "#fff", color: issue.type === key ? cfg.color : "var(--text-muted)", border: `1.5px solid ${issue.type === key ? cfg.border : "var(--border)"}` }}
                                    >{cfg.label}</button>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <button type="button" onClick={() => setSurveyEditHealthIssues((p) => [...p, { whose: "", age: 0, type: "others" }])}
                              style={{ background: "none", border: "1.5px dashed var(--border)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#1b4332", width: "100%" }}>
                              + Add Health Issue
                            </button>
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => { setEditingSurvey(null); setSurveyEditError(""); }} className="btn btn-secondary">Cancel</button>
                        <button disabled={surveyEditLoading} className="btn btn-primary"
                          onClick={async () => {
                            setSurveyEditLoading(true); setSurveyEditError("");
                            try {
                              const res = await fetch(`/api/surveys?id=${editingSurvey._id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ...surveyEditForm, healthIssues: surveyEditForm.healthIssueDetected ? surveyEditHealthIssues : [] }),
                              });
                              if (!res.ok) { const d = await res.json(); setSurveyEditError(d.error || "Failed"); return; }
                              const data = await fetch(`/api/surveys?sbId=${surveyModalSB!._id}`).then((r) => r.json());
                              const list = Array.isArray(data) ? data : [];
                              setSurveyList(list);
                              setSelectedSurvey(list.find((s: Survey) => s._id === editingSurvey._id) || null);
                              setEditingSurvey(null);
                            } catch { setSurveyEditError("Something went wrong"); }
                            finally { setSurveyEditLoading(false); }
                          }}
                        >{surveyEditLoading ? "Saving..." : "Save Changes"}</button>
                      </div>
                    </div>
                  ) : (
                    /* ── View Detail ── */
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedSurvey.familyName} Family</div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingSurvey(selectedSurvey);
                            setSurveyEditForm({
                              familyName: selectedSurvey.familyName,
                              membersM: selectedSurvey.membersM, membersF: selectedSurvey.membersF,
                              childM: selectedSurvey.childM, childF: selectedSurvey.childF,
                              above65M: selectedSurvey.above65M, above65F: selectedSurvey.above65F,
                              healthIssueDetected: selectedSurvey.healthIssueDetected,
                            } as any);
                            setSurveyEditHealthIssues(selectedSurvey.healthIssues.map((h) => ({ ...h })));
                            setSurveyEditError("");
                          }}
                        >✏ Edit</button>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                        {selectedSurvey.village || selectedSurvey.ward || "—"} · Surveyed on {new Date(selectedSurvey.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                      {(selectedSurvey.mobile || selectedSurvey.whatsapp) && (
                        <div style={{ display: "flex", gap: 20, marginBottom: 14, fontSize: 13 }}>
                          {selectedSurvey.mobile && <span>📞 {selectedSurvey.mobile}</span>}
                          {selectedSurvey.whatsapp && <span>💬 {selectedSurvey.whatsapp}</span>}
                        </div>
                      )}
                      <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 16px", marginBottom: 16, border: "1px solid #86efac" }}>
                        <span style={{ fontSize: 14, color: "#166534", fontWeight: 700 }}>
                          👥 Total Members: {selectedSurvey.membersM + selectedSurvey.membersF + selectedSurvey.childM + selectedSurvey.childF + selectedSurvey.above65M + selectedSurvey.above65F}
                        </span>
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
                      {selectedSurvey.healthIssueDetected && selectedSurvey.healthIssues.length > 0 ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏥 Health Issues Detected</div>
                          <div style={{ display: "grid", gap: 10 }}>
                            {selectedSurvey.healthIssues.map((hi, i) => {
                              const cfg = HEALTH_CONFIG[hi.type] || HEALTH_CONFIG.others;
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
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
