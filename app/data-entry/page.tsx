"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AddHelperModal from "@/components/AddHelperModal";

// ── Types ──────────────────────────────────────────────────────────────────
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
}

interface HealthIssue {
  whose: string;
  age: string;
  type: "serious" | "within_1_month" | "within_2_months" | "others" | "";
}

interface Survey {
  _id: string;
  familyName: string;
  village: string;
  ward: string;
  membersM: number; membersF: number;
  childM: number; childF: number;
  above65M: number; above65F: number;
  healthIssueDetected: boolean;
  healthIssues: { whose: string; age: number; type: string }[];
  sbId: { _id: string; name: string; helperId: string };
  createdAt: string;
}

const HEALTH_CONFIG = {
  serious:          { label: "Serious",          color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  within_1_month:   { label: "Within 1 Month",   color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
  within_2_months:  { label: "Within 2 Months",  color: "#ca8a04", bg: "#fefce8", border: "#fde047" },
  others:           { label: "Others",            color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" },
} as const;

const EMPTY_SURVEY = {
  familyName: "", mobile: "", whatsapp: "",
  membersM: 0, membersF: 0,
  childM: 0, childF: 0, above65M: 0, above65F: 0,
  healthIssueDetected: false,
};

// ── Sidebar nav tabs ───────────────────────────────────────────────────────
type Tab = "surveys" | "create-survey" | "add-sb";

export default function DataEntryPage() {
  const router = useRouter();
  const [opName, setOpName] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("surveys");

  // SB list + search (shared for both survey create and sb list display)
  const [helpers, setHelpers] = useState<Helper[]>([]);

  // Surveys
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);

  // SB search for survey creation
  const [sbSearch, setSbSearch] = useState("");
  const [selectedSB, setSelectedSB] = useState<Helper | null>(null);
  const [showSBDrop, setShowSBDrop] = useState(false);
  const [filterSubDiv, setFilterSubDiv] = useState("");
  const [filterBlock, setFilterBlock] = useState("");
  const [filterGP, setFilterGP] = useState("");
  const sbDropRef = useRef<HTMLDivElement>(null);

  // Survey form
  const [surveyForm, setSurveyForm] = useState(EMPTY_SURVEY);
  const [selectedVillage, setSelectedVillage] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Add SB modal
  const [showAddSB, setShowAddSB] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split(";").reduce<Record<string, string>>((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = decodeURIComponent(v || "");
      return acc;
    }, {});
    if (cookies["role_hint"] !== "data-entry") { router.push("/login"); return; }
    setOpName(cookies["username"] || "Operator");
    loadHelpers();
    loadSurveys();

    const handleClick = (e: MouseEvent) => {
      if (sbDropRef.current && !sbDropRef.current.contains(e.target as Node))
        setShowSBDrop(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadHelpers() {
    const data = await fetch("/api/helpers").then((r) => r.json());
    setHelpers(Array.isArray(data) ? data : []);
  }

  async function loadSurveys() {
    setSurveysLoading(true);
    const data = await fetch("/api/surveys").then((r) => r.json());
    setSurveys(Array.isArray(data) ? data : []);
    setSurveysLoading(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // ── Filter options for SB search ──────────────────────────────────────
  const allSubDivs = [...new Set(helpers.map((h) => h.subDivision).filter(Boolean))].sort();
  const allBlocks = [...new Set(
    helpers.filter((h) => !filterSubDiv || h.subDivision === filterSubDiv).map((h) => h.block).filter(Boolean)
  )].sort();
  const allGPs = [...new Set(
    helpers
      .filter((h) => (!filterSubDiv || h.subDivision === filterSubDiv) && (!filterBlock || h.block === filterBlock))
      .flatMap((h) => h.gramPanchayats.map((g) => g.gpName))
  )].sort();

  const sbQ = sbSearch.toLowerCase();
  const filteredSBs = helpers.filter((h) => {
    const matchQ = !sbQ || h.name.toLowerCase().includes(sbQ) || (h.helperId || "").toLowerCase().includes(sbQ) || h.phone.includes(sbQ);
    const matchSD = !filterSubDiv || h.subDivision === filterSubDiv;
    const matchBlock = !filterBlock || h.block === filterBlock;
    const matchGP = !filterGP || h.gramPanchayats.some((g) => g.gpName === filterGP);
    return matchQ && matchSD && matchBlock && matchGP;
  });

  function selectSB(h: Helper) {
    setSelectedSB(h); setSbSearch(h.name); setShowSBDrop(false);
    setSelectedVillage(""); setSelectedWard("");
  }

  const sbVillages = selectedSB?.gramPanchayats.flatMap((g) => g.villages) || [];
  const sbWards = selectedSB?.municipalities.flatMap((m) => m.wards) || [];

  // ── Health issue helpers ───────────────────────────────────────────────
  function addIssue() { setHealthIssues((p) => [...p, { whose: "", age: "", type: "" }]); }
  function removeIssue(i: number) { setHealthIssues((p) => p.filter((_, idx) => idx !== i)); }
  function updateIssue(i: number, field: keyof HealthIssue, val: string) {
    setHealthIssues((p) => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  // ── Submit survey ──────────────────────────────────────────────────────
  async function handleSubmitSurvey(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSB) { setFormError("Swasthya Bondhu select karo"); return; }
    if (!surveyForm.familyName.trim()) { setFormError("Family name required"); return; }
    if (surveyForm.healthIssueDetected) {
      if (healthIssues.length === 0) { setFormError("Kam se kam ek health issue add karo"); return; }
      if (healthIssues.some((h) => !h.whose.trim() || !h.age || !h.type)) { setFormError("Saare health issue fields fill karo"); return; }
    }
    setFormLoading(true); setFormError("");
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...surveyForm,
          sbId: selectedSB._id,
          village: selectedVillage,
          ward: selectedWard,
          healthIssues: surveyForm.healthIssueDetected ? healthIssues.map((h) => ({ ...h, age: Number(h.age) })) : [],
        }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error || "Failed"); return; }
      setFormSuccess(true);
      setSurveyForm(EMPTY_SURVEY); setHealthIssues([]);
      setSelectedSB(null); setSbSearch(""); setSelectedVillage(""); setSelectedWard("");
      loadSurveys();
      setTimeout(() => { setFormSuccess(false); setActiveTab("surveys"); }, 1200);
    } catch { setFormError("Something went wrong"); }
    finally { setFormLoading(false); }
  }

  // ── Shared styles ──────────────────────────────────────────────────────
  const tabBtn = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 16px", background: active ? "rgba(255,255,255,0.15)" : "transparent",
    border: "none", color: active ? "#fff" : "rgba(255,255,255,0.65)",
    cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400,
    borderRadius: 6, margin: "2px 8px", width: "calc(100% - 16px)", textAlign: "left",
  });

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 10, border: "1px solid var(--border)", padding: "20px 24px", marginBottom: 16,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#1b4332",
  };

  return (
    <div style={{ display: "flex" }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 230, minHeight: "100vh", background: "#0f4f30", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 100 }}>
        <div style={{ padding: "22px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Rogmukto Bangla</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>Data Entry Panel</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 0" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 20px 4px" }}>Surveys</div>
          <button style={tabBtn(activeTab === "surveys")} onClick={() => setActiveTab("surveys")}>📋 My Surveys</button>
          <button style={tabBtn(activeTab === "create-survey")} onClick={() => setActiveTab("create-survey")}>➕ New Survey</button>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "16px 20px 4px" }}>Manage</div>
          <button style={tabBtn(activeTab === "add-sb")} onClick={() => setActiveTab("add-sb")}>👥 Add Swasthya Bondhu</button>
        </nav>
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>👤 {opName}</div>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.75)", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, width: "100%" }}>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ marginLeft: 230, minHeight: "100vh", background: "#f8f9fa", width: "calc(100% - 230px)" }}>

        {/* ══ MY SURVEYS TAB ══ */}
        {activeTab === "surveys" && (
          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>My Surveys</h2>
              <button className="btn btn-primary" onClick={() => setActiveTab("create-survey")}>+ New Survey</button>
            </div>
            {surveysLoading ? (
              <div style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}>Loading...</div>
            ) : surveys.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Koi survey nahi mila</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>New Survey se shuru karo</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {surveys.map((s) => (
                  <div key={s._id} style={{ background: "#fff", borderRadius: 10, border: "1px solid var(--border)", padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{s.familyName} Family</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
                          SB: {s.sbId?.name} ({s.sbId?.helperId || "—"})
                          {(s.village || s.ward) ? ` · ${s.village || s.ward}` : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
                      <span>👥 M: {s.membersM} / F: {s.membersF}</span>
                      <span>👶 Child M: {s.childM} / F: {s.childF}</span>
                      <span>🧓 65+ M: {s.above65M} / F: {s.above65F}</span>
                    </div>
                    {s.healthIssueDetected && s.healthIssues.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {s.healthIssues.map((hi, i) => {
                          const cfg = HEALTH_CONFIG[hi.type as keyof typeof HEALTH_CONFIG] || HEALTH_CONFIG.others;
                          return (
                            <span key={i} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                              {hi.whose} ({hi.age}y) — {cfg.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CREATE SURVEY TAB ══ */}
        {activeTab === "create-survey" && (
          <div style={{ padding: "28px 32px", maxWidth: 740 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>New Family Survey</h2>

            {formSuccess && (
              <div style={{ background: "#d8f3dc", color: "#1b4332", border: "1px solid #95d5b2", borderRadius: 8, padding: "12px 16px", fontWeight: 600, marginBottom: 20 }}>
                ✅ Survey saved successfully!
              </div>
            )}

            <form onSubmit={handleSubmitSurvey}>
              {/* Step 1 — SB Select */}
              <div style={card}>
                <div style={sectionTitle}>Step 1 — Swasthya Bondhu Select Karo</div>

                {/* Filters */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Sub Division</label>
                    <select className="form-input" value={filterSubDiv} onChange={(e) => { setFilterSubDiv(e.target.value); setFilterBlock(""); setFilterGP(""); }}>
                      <option value="">All</option>
                      {allSubDivs.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Block</label>
                    <select className="form-input" value={filterBlock} onChange={(e) => { setFilterBlock(e.target.value); setFilterGP(""); }}>
                      <option value="">All</option>
                      {allBlocks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>GP</label>
                    <select className="form-input" value={filterGP} onChange={(e) => setFilterGP(e.target.value)}>
                      <option value="">All</option>
                      {allGPs.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                {/* SB Search dropdown */}
                <div ref={sbDropRef} style={{ position: "relative" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Search by Name / ID / Phone *</label>
                  <input
                    className="form-input"
                    placeholder="🔍 Search Swasthya Bondhu..."
                    value={sbSearch} autoComplete="off"
                    onFocus={() => setShowSBDrop(true)}
                    onChange={(e) => { setSbSearch(e.target.value); setSelectedSB(null); setShowSBDrop(true); }}
                  />
                  {showSBDrop && !selectedSB && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 300, border: "1px solid var(--border)", borderRadius: 8, background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxHeight: 240, overflowY: "auto" }}>
                      {filteredSBs.length === 0
                        ? <div style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: 13 }}>Koi SB nahi mila</div>
                        : filteredSBs.map((h) => (
                          <div key={h._id}
                            style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f0fdf4")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                            onClick={() => selectSB(h)}
                          >
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                              {h.helperId || "—"} · 📞 {h.phone} · {h.subDivision} → {h.block}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  {selectedSB && (
                    <div style={{ marginTop: 8, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#166534" }}>✓ {selectedSB.name}</div>
                        <div style={{ fontSize: 12, color: "#166534", opacity: 0.8, marginTop: 2 }}>{selectedSB.helperId || "—"} · {selectedSB.subDivision} · {selectedSB.block}</div>
                      </div>
                      <button type="button" onClick={() => { setSelectedSB(null); setSbSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontSize: 18 }}>✕</button>
                    </div>
                  )}
                </div>

                {/* Village / Ward */}
                {selectedSB && (sbVillages.length > 0 || sbWards.length > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                    {sbVillages.length > 0 && (
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Village</label>
                        <select className="form-input" value={selectedVillage} onChange={(e) => setSelectedVillage(e.target.value)}>
                          <option value="">Select village</option>
                          {sbVillages.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    )}
                    {sbWards.length > 0 && (
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Ward</label>
                        <select className="form-input" value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
                          <option value="">Select ward</option>
                          {sbWards.map((w) => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2 — Family Details */}
              <div style={card}>
                <div style={sectionTitle}>Step 2 — Family Details</div>
                <div className="form-group">
                  <label className="form-label">Family Name *</label>
                  <input className="form-input" placeholder="e.g. Dutta" value={surveyForm.familyName} onChange={(e) => setSurveyForm({ ...surveyForm, familyName: e.target.value })} required />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Mobile No.</label>
                    <input className="form-input" placeholder="10-digit" maxLength={10} value={surveyForm.mobile ?? ""} onChange={(e) => setSurveyForm({ ...surveyForm, mobile: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp No.</label>
                    <input className="form-input" placeholder="10-digit (if different)" maxLength={10} value={surveyForm.whatsapp ?? ""} onChange={(e) => setSurveyForm({ ...surveyForm, whatsapp: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                  {([
                    { label: "Members", mKey: "membersM", fKey: "membersF" },
                    { label: "Children", mKey: "childM", fKey: "childF" },
                    { label: "Above 65", mKey: "above65M", fKey: "above65F" },
                  ] as const).map(({ label, mKey, fKey }) => (
                    <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {(["M", "F"] as const).map((gender) => {
                          const key = gender === "M" ? mKey : fKey;
                          return (
                            <div key={gender} style={{ flex: 1 }}>
                              <label style={{ fontSize: 11, color: "var(--text-muted)" }}>{gender === "M" ? "Male" : "Female"}</label>
                              <input type="number" min={0} className="form-input" style={{ marginTop: 3 }}
                                value={(surveyForm as any)[key]}
                                onChange={(e) => setSurveyForm({ ...surveyForm, [key]: Number(e.target.value) })}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3 — Health Issues */}
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={sectionTitle}>Step 3 — Health Issues</div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                    <input type="checkbox" checked={surveyForm.healthIssueDetected}
                      onChange={(e) => { setSurveyForm({ ...surveyForm, healthIssueDetected: e.target.checked }); if (!e.target.checked) setHealthIssues([]); }}
                    />
                    Health issue detected?
                  </label>
                </div>
                {surveyForm.healthIssueDetected && (
                  <>
                    {healthIssues.map((issue, i) => (
                      <div key={i} style={{ background: "#f9fafb", borderRadius: 8, padding: "14px 16px", marginBottom: 10, border: "1px solid var(--border)", position: "relative" }}>
                        <button type="button" onClick={() => removeIssue(i)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 16 }}>✕</button>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Whose (naam / relation) *</label>
                            <input className="form-input" placeholder="e.g. Grandfather" value={issue.whose} onChange={(e) => updateIssue(i, "whose", e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Age *</label>
                            <input type="number" min={0} max={120} className="form-input" value={issue.age} onChange={(e) => updateIssue(i, "age", e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Type *</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(Object.entries(HEALTH_CONFIG) as [string, typeof HEALTH_CONFIG[keyof typeof HEALTH_CONFIG]][]).map(([key, cfg]) => (
                              <button key={key} type="button" onClick={() => updateIssue(i, "type", key)}
                                style={{
                                  padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                  background: issue.type === key ? cfg.bg : "#fff",
                                  color: issue.type === key ? cfg.color : "var(--text-muted)",
                                  border: `1.5px solid ${issue.type === key ? cfg.border : "var(--border)"}`,
                                }}
                              >{cfg.label}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addIssue}
                      style={{ background: "none", border: "1.5px dashed var(--border)", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13, color: "#1b4332", fontWeight: 600, width: "100%" }}>
                      + Add Health Issue
                    </button>
                  </>
                )}
              </div>

              {formError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{formError}</div>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setActiveTab("surveys"); setFormError(""); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading || !selectedSB}>
                  {formLoading ? "Saving..." : "Submit Survey"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══ ADD SB TAB ══ */}
        {activeTab === "add-sb" && (
          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>Swasthya Bondhu</h2>
              <button className="btn btn-primary" onClick={() => setShowAddSB(true)}>+ Add Swasthya Bondhu</button>
            </div>
            {/* SB list — read only, no edit/delete */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>ID</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>Name</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>Phone</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>Sub Division</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>Block</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>GP / Municipality</th>
                  </tr>
                </thead>
                <tbody>
                  {helpers.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Koi SB nahi mila</td></tr>
                  ) : helpers.map((h) => (
                    <tr key={h._id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13 }}>{h.helperId || "—"}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{h.name}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 13 }}>{h.phone}</td>
                      <td style={{ padding: "12px 16px" }}>{h.subDivision}</td>
                      <td style={{ padding: "12px 16px" }}>{h.block}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        {h.gramPanchayats.map((g) => `🌿 ${g.gpName}`).join(", ") || ""}
                        {h.municipalities.map((m) => `🏙 ${m.municipalityName}`).join(", ") || ""}
                        {!h.gramPanchayats.length && !h.municipalities.length && "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add SB Modal — reusing existing component */}
      {showAddSB && (
        <AddHelperModal
          onClose={() => setShowAddSB(false)}
          onSave={() => { setShowAddSB(false); loadHelpers(); }}
          role="data-entry"
        />
      )}
    </div>
  );
}
