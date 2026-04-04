"use client";
import { useEffect, useState, useRef } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import MultiSearchSelect from "@/components/MultiSearchSelect";

interface BC {
  _id: string;
  coordinatorId: string;
  name: string;
  subDivision: string;
  blocks: string[];
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
  blockCoordinatorId: { _id: string; name: string; coordinatorId: string };
}

const EMPTY_FORM = {
  helperId: "",
  name: "",
  phone: "",
  tag: "Swasthya Bondhu",
};

export default function HelpersPage() {
  const [helpers, setHelpers] = useState<Helper[]>([]);
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
  const [useMun, setUseMun] = useState(false);
  const [selectedGPs, setSelectedGPs] = useState<
    { gpName: string; villages: string[] }[]
  >([]);
  const [selectedMuns, setSelectedMuns] = useState<
    { municipalityName: string; wards: string[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
    fetch("/api/block-coordinators")
      .then((r) => r.json())
      .then((d) => setBcs(Array.isArray(d) ? d : []));
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []));
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowBCDrop(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function load() {
    const data = await fetch("/api/helpers").then((r) => r.json());
    setHelpers(Array.isArray(data) ? data : []);
  }

  const sdData = locations.find((sd) => sd._id === selectedSDId);
  const blockData = sdData?.blocks.find((b) => b.name === selectedBlock);

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setSelectedBC(null);
    setBcSearch("");
    setSelectedSDId("");
    setSelectedBlock("");
    setUseGP(false);
    setUseMun(false);
    setSelectedGPs([]);
    setSelectedMuns([]);
    setError("");
    setShowModal(true);
  }

  function openEdit(h: Helper) {
    setEditItem(h);
    setForm({
      helperId: h.helperId || "",
      name: h.name,
      phone: h.phone,
      tag: h.tag,
    });
    const bc = bcs.find(
      (b) =>
        b._id === (h.blockCoordinatorId as any)?._id ||
        b._id === (h.blockCoordinatorId as any),
    );
    setSelectedBC(bc || null);
    setBcSearch(bc?.name || h.blockCoordinatorId?.name || "");
    setSelectedBlock(h.block);
    setUseGP(h.gramPanchayats.length > 0);
    setUseMun(h.municipalities.length > 0);
    setSelectedGPs(h.gramPanchayats);
    setSelectedMuns(h.municipalities);
    setError("");
    setShowModal(true);
  }

  const filteredBCs = bcs.filter(
    (bc) =>
      !bcSearch ||
      bc.name.toLowerCase().includes(bcSearch.toLowerCase()) ||
      bc.coordinatorId.toLowerCase().includes(bcSearch.toLowerCase()),
  );

  function selectBC(bc: BC) {
    setSelectedBC(bc);
    setBcSearch(bc.name);
    setShowBCDrop(false);
    // Pre-fill SD from BC's location
    const sd = locations.find((s) => s.name === bc.subDivision);
    setSelectedSDId(sd?._id || "");
    setSelectedBlock(bc.blocks.length === 1 ? bc.blocks[0] : "");
    setSelectedGPs([]);
    setSelectedMuns([]);
  }

  // GP multi-select helpers
  function setGPVillages(gpName: string, villages: string[]) {
    setSelectedGPs((prev) =>
      prev.map((g) => (g.gpName === gpName ? { ...g, villages } : g)),
    );
  }
  function toggleGPSelected(gpNames: string[]) {
    setSelectedGPs((prev) => {
      const kept = prev.filter((g) => gpNames.includes(g.gpName));
      const added = gpNames
        .filter((n) => !prev.find((g) => g.gpName === n))
        .map((n) => ({ gpName: n, villages: [] }));
      return [...kept, ...added];
    });
  }
  function setMunWards(munName: string, wards: string[]) {
    setSelectedMuns((prev) =>
      prev.map((m) => (m.municipalityName === munName ? { ...m, wards } : m)),
    );
  }
  function toggleMunSelected(munNames: string[]) {
    setSelectedMuns((prev) => {
      const kept = prev.filter((m) => munNames.includes(m.municipalityName));
      const added = munNames
        .filter((n) => !prev.find((m) => m.municipalityName === n))
        .map((n) => ({ municipalityName: n, wards: [] }));
      return [...kept, ...added];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBC) {
      setError("Select a Block Coordinator");
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
    if (useGP && selectedGPs.length === 0) {
      setError("Select at least one Gram Panchayat");
      return;
    }
    if (useMun && selectedMuns.length === 0) {
      setError("Select at least one Municipality");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body = {
        ...form,
        blockCoordinatorId: selectedBC._id,
        subDivision: sdData?.name || selectedBC.subDivision,
        block: selectedBlock,
        gramPanchayats: useGP ? selectedGPs : [],
        municipalities: useMun ? selectedMuns : [],
      };
      const url = editItem ? `/api/helpers?id=${editItem._id}` : "/api/helpers";
      const method = editItem ? "PUT" : "POST";
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
      setShowModal(false);
      load();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this Swasthya Bondhu?")) return;
    await fetch(`/api/helpers?id=${id}`, { method: "DELETE" });
    load();
  }

  const filtered = helpers.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.block?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="page-header">
        <h2>Swasthya Bondhu</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Swasthya Bondhu
        </button>
      </div>
      <div className="page-body">
        <div style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            style={{ maxWidth: 300 }}
            placeholder="Search by name, block..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Block Coordinator</th>
                <th>Sub Division</th>
                <th>Block</th>
                <th>GP / Municipality</th>
                <th>Tag</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <p>No Swasthya Bondhu found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr key={h._id}>
                    <td style={{ fontWeight: 500 }}>{h.name}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {h.phone}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {h.blockCoordinatorId?.name || "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>{h.subDivision}</td>
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
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(h)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(h._id)}
                        >
                          Delete
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

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <h3>
                {editItem ? "Edit Swasthya Bondhu" : "Add Swasthya Bondhu"}
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

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
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Ramu Das"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input
                      className="form-input"
                      required
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="10-digit"
                    />
                  </div>
                </div>

                {/* Block Coordinator search */}
                <div
                  className="form-group"
                  ref={dropRef}
                  style={{ position: "relative" }}
                >
                  <label className="form-label">Block Coordinator *</label>
                  <input
                    className="form-input"
                    placeholder="🔍 Search by name or ID..."
                    value={bcSearch}
                    autoComplete="off"
                    onFocus={() => setShowBCDrop(true)}
                    onChange={(e) => {
                      setBcSearch(e.target.value);
                      setSelectedBC(null);
                      setShowBCDrop(true);
                      setSelectedBlock("");
                    }}
                  />
                  {!selectedBC && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      💡 SubDivision & Block auto-fill after selection
                    </div>
                  )}
                  {showBCDrop && !selectedBC && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 300,
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface)",
                        boxShadow: "var(--shadow-md)",
                        maxHeight: 200,
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
                            onClick={() => selectBC(bc)}
                          >
                            <div style={{ fontWeight: 500, fontSize: 13 }}>
                              {bc.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              ID: {bc.coordinatorId} · {bc.subDivision} ·{" "}
                              {bc.blocks.join(", ")}
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
                        ✓ <strong>{selectedBC.name}</strong> ·{" "}
                        {selectedBC.subDivision}
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
                          setSelectedBlock("");
                          setShowBCDrop(true);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {selectedBC && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div className="form-group">
                      <label className="form-label">Sub Division *</label>
                      <SearchableSelect
                        options={locations.map((sd) => ({
                          label: sd.name,
                          value: sd._id,
                        }))}
                        value={sdData?._id || ""}
                        onChange={(v) => {
                          const sd = locations.find((s) => s._id === v);
                          setSelectedSDId(v);
                          setSelectedBlock("");
                          setSelectedGPs([]);
                          setSelectedMuns([]);
                          setSelectedGPs([]);
                          setSelectedMuns([]);
                        }}
                        placeholder="Select Sub Division"
                      />
                      {sdData?.name &&
                        sdData.name !== selectedBC.subDivision && (
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
                      <label className="form-label">Block *</label>
                      <SearchableSelect
                        options={
                          sdData?.blocks.map((b) => ({
                            label: b.name,
                            value: b.name,
                          })) || []
                        }
                        value={selectedBlock}
                        onChange={(v) => {
                          setSelectedBlock(v);
                          setSelectedGPs([]);
                          setSelectedMuns([]);
                        }}
                        placeholder={
                          sdData ? "Select Block" : "Select Sub Division first"
                        }
                        disabled={!sdData}
                      />
                    </div>
                  </div>
                )}

                {selectedBC && selectedBlock && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Location Type *</label>
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        {[
                          {
                            key: "gp",
                            label: "🌿 Gram Panchayat",
                            active: useGP,
                            toggle: () => {
                              setUseGP(!useGP);
                              setSelectedGPs([]);
                            },
                          },
                          {
                            key: "mun",
                            label: "🏙 Municipality",
                            active: useMun,
                            toggle: () => {
                              setUseMun(!useMun);
                              setSelectedMuns([]);
                            },
                          },
                        ].map((item) => (
                          <label
                            key={item.key}
                            onClick={item.toggle}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "7px 14px",
                              border: `2px solid ${item.active ? "var(--green-mid)" : "var(--border)"}`,
                              borderRadius: "var(--radius-sm)",
                              background: item.active
                                ? "var(--green-light)"
                                : "var(--surface)",
                              cursor: "pointer",
                              fontSize: 13,
                              userSelect: "none",
                            }}
                          >
                            {item.active ? "✓ " : ""}
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {useGP && blockData && (
                      <div className="form-group">
                        <MultiSearchSelect
                          label="Gram Panchayat(s) *"
                          options={blockData.gramPanchayats.map((g) => ({
                            label: g.name,
                            value: g.name,
                          }))}
                          values={selectedGPs.map((g) => g.gpName)}
                          onChange={toggleGPSelected}
                          placeholder="Select Gram Panchayats..."
                        />
                        {/* Village sub-selects for each selected GP */}
                        {selectedGPs.map((selGP) => {
                          const gpObj = blockData.gramPanchayats.find(
                            (g) => g.name === selGP.gpName,
                          );
                          if (!gpObj || gpObj.villages.length === 0)
                            return null;
                          return (
                            <div
                              key={selGP.gpName}
                              style={{
                                marginTop: 8,
                                paddingLeft: 12,
                                borderLeft: "3px solid var(--green-light)",
                              }}
                            >
                              <MultiSearchSelect
                                label={`🌿 ${selGP.gpName} — Villages`}
                                options={gpObj.villages.map((v) => ({
                                  label: v.name,
                                  value: v.name,
                                }))}
                                values={selGP.villages}
                                onChange={(villages) =>
                                  setGPVillages(selGP.gpName, villages)
                                }
                                placeholder="Select villages..."
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {useMun && blockData && (
                      <div className="form-group">
                        <MultiSearchSelect
                          label="Municipality(s) *"
                          options={blockData.municipalities.map((m) => ({
                            label: m.name,
                            value: m.name,
                          }))}
                          values={selectedMuns.map((m) => m.municipalityName)}
                          onChange={toggleMunSelected}
                          placeholder="Select Municipalities..."
                        />
                        {/* Ward sub-selects for each selected Municipality */}
                        {selectedMuns.map((selMun) => {
                          const munObj = blockData.municipalities.find(
                            (m) => m.name === selMun.municipalityName,
                          );
                          if (!munObj || munObj.wards.length === 0) return null;
                          return (
                            <div
                              key={selMun.municipalityName}
                              style={{
                                marginTop: 8,
                                paddingLeft: 12,
                                borderLeft: "3px solid #d0d8ff",
                              }}
                            >
                              <MultiSearchSelect
                                label={`🏙 ${selMun.municipalityName} — Wards`}
                                options={munObj.wards.map((w) => ({
                                  label: w.name,
                                  value: w.name,
                                }))}
                                values={selMun.wards}
                                onChange={(wards) =>
                                  setMunWards(selMun.municipalityName, wards)
                                }
                                placeholder="Select wards..."
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                <div className="form-group">
                  <div className="form-group">
                    <label className="form-label">
                      Swasthya Bondhu ID{" "}
                      <span
                        style={{
                          fontWeight: 400,
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <input
                      className="form-input"
                      value={form.helperId}
                      onChange={(e) =>
                        setForm({ ...form, helperId: e.target.value })
                      }
                      placeholder="e.g. SB-001"
                    />
                  </div>
                  <label className="form-label">Tag</label>
                  <SearchableSelect
                    options={[
                      { label: "Swasthya Bondhu", value: "Swasthya Bondhu" },
                    ]}
                    value={form.tag}
                    onChange={(v) => setForm({ ...form, tag: v })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !selectedBC || !selectedBlock}
                >
                  {loading
                    ? "Saving..."
                    : editItem
                      ? "Update Swasthya Bondhu"
                      : "Add Swasthya Bondhu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
