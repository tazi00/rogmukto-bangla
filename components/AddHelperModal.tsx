"use client";
import { useEffect, useState, useRef } from "react";
import CreatableSearchSelect from "./CreatableSearchSelect";

interface BC {
  _id: string;
  coordinatorId: string;
  name: string;
  subDivision: string;
  blocks: string[];
  phone?: string;
}
interface Village {
  _id: string;
  name: string;
}
interface Ward {
  _id: string;
  name: string;
}
interface GP {
  _id: string;
  name: string;
  villages: Village[];
}
interface Municipality {
  _id: string;
  name: string;
  wards: Ward[];
}
interface Block {
  _id: string;
  name: string;
  gramPanchayats: GP[];
  municipalities: Municipality[];
}
interface SubDiv {
  _id: string;
  name: string;
  blocks: Block[];
}

interface Props {
  onClose: () => void;
  onSave: () => void;
  role?: "admin" | "receptionist" | "block-coordinator" | "data-entry";
  currentBCId?: string; // logged-in BC's _id (only relevant when role === 'block-coordinator')
}

export default function AddHelperModal({
  onClose,
  onSave,
  role = "admin",
  currentBCId,
}: Props) {
  const [bcs, setBcs] = useState<BC[]>([]);
  const [locations, setLocations] = useState<SubDiv[]>([]);
  const [form, setForm] = useState({
    helperId: "",
    name: "",
    phone: "",
    tag: "Swasthya Bondhu",
  });
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
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  const isAdmin = role === "admin";
  const isBC = role === "block-coordinator";

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []));

    // BC role: auto-load and lock their own BC
    if (isBC && currentBCId) {
      fetch("/api/block-coordinators")
        .then((r) => r.json())
        .then((data: BC[]) => {
          if (Array.isArray(data)) {
            setBcs(data);
            const myBC = data.find((bc) => bc._id === currentBCId);
            if (myBC) selectBC(myBC);
          }
        });
    } else {
      fetch("/api/block-coordinators")
        .then((r) => r.json())
        .then((d) => setBcs(Array.isArray(d) ? d : []));
    }

    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowBCDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // BC search — search by name, coordinatorId, phone, GP name
  const filteredBCs = bcs.filter((bc) => {
    if (!bcSearch) return true;
    const q = bcSearch.toLowerCase();
    return (
      bc.name.toLowerCase().includes(q) ||
      bc.coordinatorId.toLowerCase().includes(q) ||
      (bc.phone || "").toLowerCase().includes(q) ||
      bc.blocks.some((b) => b.toLowerCase().includes(q))
    );
  });

  const selectedSD = locations.find((sd) => sd._id === selectedSDId);
  const blockData = selectedSD?.blocks.find((b) => b.name === selectedBlock);
  const gpData = blockData?.gramPanchayats.find((g) => g.name === selectedGP);
  const munData = blockData?.municipalities.find((m) => m.name === selectedMun);

  const sdOptions = locations.map((sd) => ({ label: sd.name, value: sd._id }));
  const blockOptions =
    selectedSD?.blocks.map((b) => ({ label: b.name, value: b.name })) || [];
  const gpOptions =
    blockData?.gramPanchayats.map((g) => ({ label: g.name, value: g.name })) ||
    [];
  const munOptions =
    blockData?.municipalities.map((m) => ({ label: m.name, value: m.name })) ||
    [];
  const villageOptions =
    gpData?.villages.map((v) => ({ label: v.name, value: v.name })) || [];
  const wardOptions =
    munData?.wards.map((w) => ({ label: w.name, value: w.name })) || [];

  async function reloadLocations() {
    const data = await fetch("/api/locations").then((r) => r.json());
    setLocations(Array.isArray(data) ? data : []);
    return Array.isArray(data) ? data : [];
  }

  async function createSD(name: string) {
    setCreating(true);
    await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "subdivision", name }),
    });
    const data = await reloadLocations();
    const sd = data.find((s: SubDiv) => s.name === name);
    if (sd) {
      setSelectedSDId(sd._id);
      setSelectedBlock("");
      setSelectedGP("");
      setSelectedMun("");
    }
    setCreating(false);
  }

  async function createBlock(name: string) {
    if (!selectedSDId) return;
    setCreating(true);
    await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "block",
        name,
        subDivisionId: selectedSDId,
      }),
    });
    await reloadLocations();
    setSelectedBlock(name);
    setSelectedGP("");
    setSelectedMun("");
    setCreating(false);
  }

  async function createGP(name: string) {
    if (!selectedSDId || !selectedBlock) return;
    setCreating(true);
    const sd = locations.find((s) => s._id === selectedSDId);
    const block = sd?.blocks.find((b) => b.name === selectedBlock);
    if (block) {
      await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "gp",
          name,
          subDivisionId: selectedSDId,
          blockId: block._id,
        }),
      });
      await reloadLocations();
      setSelectedGP(name);
      setSelectedVillages([]);
    }
    setCreating(false);
  }

  async function createMun(name: string) {
    if (!selectedSDId || !selectedBlock) return;
    setCreating(true);
    const sd = locations.find((s) => s._id === selectedSDId);
    const block = sd?.blocks.find((b) => b.name === selectedBlock);
    if (block) {
      await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "municipality",
          name,
          subDivisionId: selectedSDId,
          blockId: block._id,
        }),
      });
      await reloadLocations();
      setSelectedMun(name);
      setSelectedWards([]);
    }
    setCreating(false);
  }

  async function createVillage(name: string) {
    if (!selectedSDId || !selectedBlock || !selectedGP) return;
    setCreating(true);
    const sd = locations.find((s) => s._id === selectedSDId);
    const block = sd?.blocks.find((b) => b.name === selectedBlock);
    const gp = block?.gramPanchayats.find((g) => g.name === selectedGP);
    if (gp && block) {
      await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "village",
          name,
          subDivisionId: selectedSDId,
          blockId: block._id,
          gpId: gp._id,
        }),
      });
      await reloadLocations();
      setSelectedVillages((prev) => [...prev, name]);
    }
    setCreating(false);
  }

  async function createWard(name: string) {
    if (!selectedSDId || !selectedBlock || !selectedMun) return;
    setCreating(true);
    const sd = locations.find((s) => s._id === selectedSDId);
    const block = sd?.blocks.find((b) => b.name === selectedBlock);
    const mun = block?.municipalities.find((m) => m.name === selectedMun);
    if (mun && block) {
      await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ward",
          name,
          subDivisionId: selectedSDId,
          blockId: block._id,
          munId: mun._id,
        }),
      });
      await reloadLocations();
      setSelectedWards((prev) => [...prev, name]);
    }
    setCreating(false);
  }

  function selectBC(bc: BC) {
    setSelectedBC(bc);
    setBcSearch(bc.name);
    setShowBCDrop(false);
    const sd = locations.find((s) => s.name === bc.subDivision);
    setSelectedSDId(sd?._id || "");
    setSelectedBlock(bc.blocks.length === 1 ? bc.blocks[0] : "");
    setUseGP(false);
    setSelectedGP("");
    setSelectedVillages([]);
    setUseMun(false);
    setSelectedMun("");
    setSelectedWards([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBC) {
      setError("Select a Block Coordinator");
      return;
    }
    if (!selectedSDId) {
      setError("Select a Sub Division");
      return;
    }
    if (!selectedBlock) {
      setError("Select a Block");
      return;
    }
    if (!useGP && !useMun) {
      setError("Select at least GP or Municipality");
      return;
    }
    if (useGP && !selectedGP) {
      setError("Select a Gram Panchayat");
      return;
    }
    if (useMun && !selectedMun) {
      setError("Select a Municipality");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body = {
        ...form,
        blockCoordinatorId: selectedBC._id,
        subDivision: selectedSD?.name || "",
        block: selectedBlock,
        gramPanchayats:
          useGP && selectedGP
            ? [{ gpName: selectedGP, villages: selectedVillages }]
            : [],
        municipalities:
          useMun && selectedMun
            ? [{ municipalityName: selectedMun, wards: selectedWards }]
            : [],
      };
      const res = await fetch("/api/helpers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed");
        return;
      }
      onSave();
      onClose();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const checkStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    border: `2px solid ${active ? "var(--green-mid)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)",
    background: active ? "var(--green-light)" : "var(--surface)",
    cursor: "pointer",
    fontSize: 13,
    userSelect: "none",
  });

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header">
          <h3>Add Swasthya Bondhu</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            {/* FIELD ORDER:
                1. Swasthya Bondhu ID (admin: enabled | reception/BC: disabled+grayed)
                2. Full Name + Phone
                3. Block Coordinator (BC role: hidden/auto-locked | others: searchable)
                4. SubDiv + Block (auto-filled)
                5. Location Type + GP/Municipality
                6. Tag
            */}

            {/* 1. Swasthya Bondhu ID */}
            <div className="form-group">
              <label className="form-label">
                Swasthya Bondhu ID
                {!isAdmin && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 400,
                    }}
                  ></span>
                )}
              </label>
              <input
                className="form-input"
                placeholder={
                  isAdmin ? "e.g. SB-001" : "ID will be assigned by Admin"
                }
                value={form.helperId}
                onChange={(e) => setForm({ ...form, helperId: e.target.value })}
                disabled={!isAdmin}
                style={
                  !isAdmin
                    ? {
                        background: "var(--gray-50)",
                        color: "var(--text-muted)",
                        cursor: "not-allowed",
                      }
                    : {}
                }
              />
            </div>

            {/* 2. Full Name + Phone */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ramu Das"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input
                  className="form-input"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit"
                  maxLength={10}
                />
              </div>
            </div>

            {/* 3. Block Coordinator */}
            {isBC ? (
              /* BC role: show locked BC info, no dropdown */
              <div className="form-group">
                <label className="form-label">Block Coordinator</label>
                {selectedBC ? (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "var(--green-light)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      color: "var(--green-dark)",
                      border: "1px solid #c8e6d4",
                    }}
                  >
                    🔒 <strong>{selectedBC.name}</strong>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
                      ID: {selectedBC.coordinatorId} · {selectedBC.subDivision}
                    </span>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      Swasthya Bondhu will be added under your account
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "var(--gray-50)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading your account...
                  </div>
                )}
              </div>
            ) : (
              /* Admin / Receptionist: searchable BC dropdown */
              <div
                className="form-group"
                ref={dropRef}
                style={{ position: "relative" }}
              >
                <label className="form-label">Block Coordinator *</label>
                <input
                  className="form-input"
                  placeholder="🔍 Search by ID or name or GP or phone no..."
                  value={bcSearch}
                  autoComplete="off"
                  onFocus={() => setShowBCDrop(true)}
                  onChange={(e) => {
                    setBcSearch(e.target.value);
                    setSelectedBC(null);
                    setShowBCDrop(true);
                    setSelectedSDId("");
                    setSelectedBlock("");
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 3,
                  }}
                >
                  💡 SubDivision & Block auto-fill after selection
                </div>
                {showBCDrop && !selectedBC && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 400,
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--surface)",
                      boxShadow: "var(--shadow-md)",
                      maxHeight: 180,
                      overflowY: "auto",
                    }}
                  >
                    {filteredBCs.length === 0 ? (
                      <div
                        style={{
                          padding: "12px 14px",
                          color: "var(--text-muted)",
                          fontSize: 13,
                        }}
                      >
                        No coordinators found
                      </div>
                    ) : (
                      filteredBCs.map((bc) => (
                        <div
                          key={bc._id}
                          style={{
                            padding: "9px 14px",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--gray-100)",
                          }}
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.background =
                              "var(--gray-50)")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.background =
                              "")
                          }
                          onClick={() => selectBC(bc)}
                        >
                          <div style={{ fontWeight: 500, fontSize: 13 }}>
                            {bc.name}
                          </div>
                          <div
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            ID: {bc.coordinatorId} · {bc.subDivision} ·{" "}
                            {bc.blocks.join(", ")}
                            {bc.phone ? ` · ${bc.phone}` : ""}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {selectedBC && (
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
                      ✓ <strong>{selectedBC.name}</strong> (
                      {selectedBC.coordinatorId})
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
                        setSelectedBC(null);
                        setBcSearch("");
                        setSelectedSDId("");
                        setSelectedBlock("");
                        setShowBCDrop(true);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 4. SubDivision + Block (auto-filled, shown after BC selected) */}
            {selectedBC && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div className="form-group">
                  <CreatableSearchSelect
                    label="Sub Division *"
                    options={sdOptions}
                    value={selectedSDId}
                    onChange={(v) => {
                      setSelectedSDId(v);
                      setSelectedBlock("");
                      setSelectedGP("");
                      setSelectedMun("");
                    }}
                    onCreateOption={createSD}
                    creating={creating}
                    placeholder="Search or add new..."
                  />
                  {selectedSD?.name &&
                    selectedSD.name !== selectedBC.subDivision && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--accent)",
                          marginTop: 3,
                        }}
                      >
                        ⚠ Different from BC ({selectedBC.subDivision})
                      </div>
                    )}
                </div>
                <div className="form-group">
                  <CreatableSearchSelect
                    label="Block *"
                    options={blockOptions}
                    value={selectedBlock}
                    onChange={(v) => {
                      setSelectedBlock(v);
                      setSelectedGP("");
                      setSelectedMun("");
                    }}
                    onCreateOption={selectedSDId ? createBlock : undefined}
                    creating={creating}
                    placeholder={
                      selectedSDId
                        ? "Search or add new..."
                        : "Select Sub Division first"
                    }
                    disabled={!selectedSDId}
                  />
                </div>
              </div>
            )}

            {/* 5. Location Type + GP/Municipality */}
            {selectedBC && selectedSDId && selectedBlock && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Location Type *{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
                      (ek ya dono choose karo)
                    </span>
                  </label>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <label
                      style={checkStyle(useGP)}
                      onClick={() => {
                        setUseGP(!useGP);
                        if (useGP) {
                          setSelectedGP("");
                          setSelectedVillages([]);
                        }
                      }}
                    >
                      {useGP ? "✓ " : ""}🌿 Gram Panchayat
                    </label>
                    <label
                      style={checkStyle(useMun)}
                      onClick={() => {
                        setUseMun(!useMun);
                        if (useMun) {
                          setSelectedMun("");
                          setSelectedWards([]);
                        }
                      }}
                    >
                      {useMun ? "✓ " : ""}🏙 Municipality
                    </label>
                  </div>
                </div>

                {useGP && (
                  <div className="form-group">
                    <CreatableSearchSelect
                      label="Gram Panchayat *"
                      options={gpOptions}
                      value={selectedGP}
                      onChange={(v) => {
                        setSelectedGP(v);
                        setSelectedVillages([]);
                      }}
                      onCreateOption={createGP}
                      creating={creating}
                      placeholder="Search or add Gram Panchayat..."
                    />
                    {selectedGP && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingLeft: 12,
                          borderLeft: "3px solid var(--green-light)",
                        }}
                      >
                        <label
                          className="form-label"
                          style={{ marginBottom: 6 }}
                        >
                          🌿 {selectedGP} — Villages
                        </label>
                        <CreatableSearchSelect
                          options={villageOptions.filter(
                            (v) => !selectedVillages.includes(v.value),
                          )}
                          value=""
                          onChange={(v) => {
                            if (v && !selectedVillages.includes(v))
                              setSelectedVillages((prev) => [...prev, v]);
                          }}
                          onCreateOption={createVillage}
                          creating={creating}
                          placeholder="Search or add village..."
                        />
                        {selectedVillages.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 5,
                              marginTop: 6,
                            }}
                          >
                            {selectedVillages.map((v) => (
                              <span
                                key={v}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 20,
                                  fontSize: 11,
                                }}
                              >
                                🏘 {v}{" "}
                                <span
                                  onClick={() =>
                                    setSelectedVillages((prev) =>
                                      prev.filter((vv) => vv !== v),
                                    )
                                  }
                                  style={{
                                    cursor: "pointer",
                                    opacity: 0.6,
                                    fontSize: 10,
                                  }}
                                >
                                  ✕
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {useMun && (
                  <div className="form-group">
                    <CreatableSearchSelect
                      label="Municipality *"
                      options={munOptions}
                      value={selectedMun}
                      onChange={(v) => {
                        setSelectedMun(v);
                        setSelectedWards([]);
                      }}
                      onCreateOption={createMun}
                      creating={creating}
                      placeholder="Search or add Municipality..."
                    />
                    {selectedMun && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingLeft: 12,
                          borderLeft: "3px solid #d0d8ff",
                        }}
                      >
                        <label
                          className="form-label"
                          style={{ marginBottom: 6 }}
                        >
                          🏙 {selectedMun} — Wards
                        </label>
                        <CreatableSearchSelect
                          options={wardOptions.filter(
                            (w) => !selectedWards.includes(w.value),
                          )}
                          value=""
                          onChange={(v) => {
                            if (v && !selectedWards.includes(v))
                              setSelectedWards((prev) => [...prev, v]);
                          }}
                          onCreateOption={createWard}
                          creating={creating}
                          placeholder="Search or add ward..."
                        />
                        {selectedWards.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 5,
                              marginTop: 6,
                            }}
                          >
                            {selectedWards.map((w) => (
                              <span
                                key={w}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 20,
                                  fontSize: 11,
                                }}
                              >
                                🔢 {w}{" "}
                                <span
                                  onClick={() =>
                                    setSelectedWards((prev) =>
                                      prev.filter((ww) => ww !== w),
                                    )
                                  }
                                  style={{
                                    cursor: "pointer",
                                    opacity: 0.6,
                                    fontSize: 10,
                                  }}
                                >
                                  ✕
                                </span>
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

            {/* 6. Tag */}
            <div className="form-group">
              <label className="form-label">Tag</label>
              <select
                className="form-input"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
              >
                <option value="Swasthya Bondhu">Swasthya Bondhu</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                loading || !selectedBC || !selectedSDId || !selectedBlock
              }
            >
              {loading ? "Saving..." : "Add Swasthya Bondhu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
