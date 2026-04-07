"use client";
import { useEffect, useState } from "react";

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

type AddingState = {
  type: string;
  subDivisionId?: string;
  blockId?: string;
  gpId?: string;
  munId?: string;
} | null;

export default function SettingsPage() {
  const [amount, setAmount] = useState("");
  const [amountSaved, setAmountSaved] = useState(false);
  const [savingAmount, setSavingAmount] = useState(false);
  const [locations, setLocations] = useState<SubDiv[]>([]);
  const [expandedSD, setExpandedSD] = useState<string | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [expandedGP, setExpandedGP] = useState<string | null>(null);
  const [expandedMun, setExpandedMun] = useState<string | null>(null);
  const [blockTab, setBlockTab] = useState<Record<string, "gp" | "mun">>({});
  const [adding, setAdding] = useState<AddingState>(null);
  const [inputVal, setInputVal] = useState("");
  const [locError, setLocError] = useState("");
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setAmount(String(d.defaultIncentiveAmount || 200)));
    loadLocations();
  }, []);

  async function loadLocations() {
    const data = await fetch("/api/locations").then((r) => r.json());
    setLocations(Array.isArray(data) ? data : []);
  }

  async function saveAmount(e: React.FormEvent) {
    e.preventDefault();
    setSavingAmount(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultIncentiveAmount: Number(amount) }),
    });
    setSavingAmount(false);
    setAmountSaved(true);
    setTimeout(() => setAmountSaved(false), 2500);
  }

  async function handleAdd() {
    if (!inputVal.trim()) return;
    setLocLoading(true);
    setLocError("");
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: adding!.type,
        name: inputVal.trim(),
        ...adding,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLocError(data.error || "Failed");
      setLocLoading(false);
      return;
    }
    setAdding(null);
    setInputVal("");
    setLocError("");
    setLocLoading(false);
    loadLocations();
  }

  async function handleDelete(payload: any) {
    if (!confirm("Delete this item and all its children?")) return;
    await fetch("/api/locations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    loadLocations();
  }

  function startAdding(state: AddingState) {
    setAdding(state);
    setInputVal("");
    setLocError("");
  }

  const rowStyle = (color: string) => ({
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    background: color,
    gap: 8,
  });
  const expandBtn = (expanded: boolean) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    color: "var(--green-dark)",
    padding: "0 4px",
    width: 28,
    fontWeight: 600,
  });
  const addBtn = (label: string, onClick: () => void) => (
    <button className="btn btn-secondary btn-sm" onClick={onClick}>
      {label}
    </button>
  );
  const delBtn = (onClick: () => void) => (
    <button className="btn btn-danger btn-sm" onClick={onClick}>
      ✕
    </button>
  );

  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
      </div>
      <div
        className="page-body"
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        {/* Incentive Amount */}
        <div className="card" style={{ maxWidth: 480, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            Default Incentive Amount
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 20,
            }}
          >
            Default ₹ per patient. Receptionist can override.
          </p>
          {amountSaved && (
            <div className="alert alert-success" style={{ marginBottom: 14 }}>
              ✓ Saved!
            </div>
          )}
          <form
            onSubmit={saveAmount}
            style={{ display: "flex", gap: 12, alignItems: "flex-end" }}
          >
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Amount per Patient (₹)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingAmount}
              style={{ marginBottom: 1 }}
            >
              {savingAmount ? "Saving..." : "Save"}
            </button>
          </form>
        </div>

        {/* Location Manager */}
        <div className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Location Hierarchy
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                SubDivision → Block → GP/Municipality → Village/Ward
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => startAdding({ type: "subdivision" })}
            >
              + Add Sub Division
            </button>
          </div>

          {adding?.type === "subdivision" && (
            <AddInline
              placeholder="e.g. Basirhat"
              value={inputVal}
              onChange={setInputVal}
              onAdd={handleAdd}
              onCancel={() => setAdding(null)}
              error={locError}
              loading={locLoading}
              label="New Sub Division"
            />
          )}

          {locations.length === 0 && !adding && (
            <div className="empty-state" style={{ padding: 32 }}>
              <p>No locations added yet.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {locations.map((sd) => (
              <div
                key={sd._id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                }}
              >
                {/* SubDivision */}
                <div style={rowStyle("var(--green-light)")}>
                  <button
                    style={expandBtn(expandedSD === sd._id)}
                    onClick={() =>
                      setExpandedSD(expandedSD === sd._id ? null : sd._id)
                    }
                  >
                    {expandedSD === sd._id ? "▾" : "▸"}
                  </button>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--green-dark)",
                      flex: 1,
                    }}
                  >
                    🏛 {sd.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--green)",
                      marginRight: 8,
                    }}
                  >
                    {sd.blocks.length} blocks
                  </span>
                  {addBtn("+ Block", () => {
                    setExpandedSD(sd._id);
                    startAdding({ type: "block", subDivisionId: sd._id });
                  })}
                  {delBtn(() =>
                    handleDelete({
                      type: "subdivision",
                      subDivisionId: sd._id,
                    }),
                  )}
                </div>

                {expandedSD === sd._id && (
                  <div
                    style={{
                      padding: "8px 12px 12px 28px",
                      background: "var(--surface)",
                    }}
                  >
                    {adding?.type === "block" &&
                      adding.subDivisionId === sd._id && (
                        <AddInline
                          placeholder="e.g. Baduria"
                          value={inputVal}
                          onChange={setInputVal}
                          onAdd={handleAdd}
                          onCancel={() => setAdding(null)}
                          error={locError}
                          loading={locLoading}
                          label="New Block"
                        />
                      )}

                    {sd.blocks.map((block) => (
                      <div key={block._id} style={{ marginBottom: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "7px 10px",
                            background: "var(--gray-50)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <button
                            style={expandBtn(expandedBlock === block._id)}
                            onClick={() =>
                              setExpandedBlock(
                                expandedBlock === block._id ? null : block._id,
                              )
                            }
                          >
                            {expandedBlock === block._id ? "▾" : "▸"}
                          </button>
                          <span
                            style={{ fontWeight: 500, fontSize: 13, flex: 1 }}
                          >
                            📍 {block.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginRight: 4,
                            }}
                          >
                            {block.gramPanchayats.length} GP ·{" "}
                            {block.municipalities.length} Mun
                          </span>
                          {delBtn(() =>
                            handleDelete({
                              type: "block",
                              subDivisionId: sd._id,
                              blockId: block._id,
                            }),
                          )}
                        </div>

                        {expandedBlock === block._id &&
                          (() => {
                            const activeTab = blockTab[block._id] || "gp";
                            const setTab = (t: "gp" | "mun") =>
                              setBlockTab((prev) => ({
                                ...prev,
                                [block._id]: t,
                              }));
                            return (
                              <div style={{ paddingLeft: 20, paddingTop: 8 }}>
                                {/* Tabs */}
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 0,
                                    marginBottom: 12,
                                    borderBottom: "2px solid var(--border)",
                                  }}
                                >
                                  <button
                                    onClick={() => setTab("gp")}
                                    style={{
                                      padding: "6px 18px",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      border: "none",
                                      cursor: "pointer",
                                      background: "none",
                                      borderBottom:
                                        activeTab === "gp"
                                          ? "2px solid var(--green-dark)"
                                          : "2px solid transparent",
                                      color:
                                        activeTab === "gp"
                                          ? "var(--green-dark)"
                                          : "var(--text-muted)",
                                      marginBottom: -2,
                                    }}
                                  >
                                    🌿 Gram Panchayats (
                                    {block.gramPanchayats.length})
                                  </button>
                                  <button
                                    onClick={() => setTab("mun")}
                                    style={{
                                      padding: "6px 18px",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      border: "none",
                                      cursor: "pointer",
                                      background: "none",
                                      borderBottom:
                                        activeTab === "mun"
                                          ? "2px solid var(--green-dark)"
                                          : "2px solid transparent",
                                      color:
                                        activeTab === "mun"
                                          ? "var(--green-dark)"
                                          : "var(--text-muted)",
                                      marginBottom: -2,
                                    }}
                                  >
                                    🏙 Municipalities (
                                    {block.municipalities.length})
                                  </button>
                                </div>

                                {/* GP Tab */}
                                {activeTab === "gp" && (
                                  <div>
                                    {addBtn("+ Add Gram Panchayat", () =>
                                      startAdding({
                                        type: "gp",
                                        subDivisionId: sd._id,
                                        blockId: block._id,
                                      }),
                                    )}
                                    <div style={{ marginTop: 8 }}>
                                      {adding?.type === "gp" &&
                                        adding.blockId === block._id && (
                                          <AddInline
                                            placeholder="e.g. Aturia"
                                            value={inputVal}
                                            onChange={setInputVal}
                                            onAdd={handleAdd}
                                            onCancel={() => setAdding(null)}
                                            error={locError}
                                            loading={locLoading}
                                            label="New Gram Panchayat"
                                          />
                                        )}
                                      {block.gramPanchayats.length === 0 &&
                                        !(
                                          adding?.type === "gp" &&
                                          adding.blockId === block._id
                                        ) && (
                                          <p
                                            style={{
                                              fontSize: 13,
                                              color: "var(--text-muted)",
                                              padding: "8px 0",
                                            }}
                                          >
                                            No Gram Panchayats added yet.
                                          </p>
                                        )}
                                      {block.gramPanchayats.map((gp) => (
                                        <div
                                          key={gp._id}
                                          style={{ marginBottom: 6 }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                              padding: "5px 10px",
                                              background: "#f0f9f4",
                                              borderRadius: "var(--radius-sm)",
                                              border: "1px solid #c8e6d4",
                                            }}
                                          >
                                            <button
                                              style={expandBtn(
                                                expandedGP === gp._id,
                                              )}
                                              onClick={() =>
                                                setExpandedGP(
                                                  expandedGP === gp._id
                                                    ? null
                                                    : gp._id,
                                                )
                                              }
                                            >
                                              {expandedGP === gp._id
                                                ? "▾"
                                                : "▸"}
                                            </button>
                                            <span
                                              style={{ fontSize: 13, flex: 1 }}
                                            >
                                              🌿 {gp.name}
                                            </span>
                                            <span
                                              style={{
                                                fontSize: 11,
                                                color: "var(--text-muted)",
                                                marginRight: 4,
                                              }}
                                            >
                                              {gp.villages.length} villages
                                            </span>
                                            {addBtn("+ Village", () => {
                                              setExpandedGP(gp._id);
                                              startAdding({
                                                type: "village",
                                                subDivisionId: sd._id,
                                                blockId: block._id,
                                                gpId: gp._id,
                                              });
                                            })}
                                            {delBtn(() =>
                                              handleDelete({
                                                type: "gp",
                                                subDivisionId: sd._id,
                                                blockId: block._id,
                                                gpId: gp._id,
                                              }),
                                            )}
                                          </div>
                                          {expandedGP === gp._id && (
                                            <div
                                              style={{
                                                paddingLeft: 20,
                                                paddingTop: 6,
                                              }}
                                            >
                                              {adding?.type === "village" &&
                                                adding.gpId === gp._id && (
                                                  <AddInline
                                                    placeholder="e.g. Village Name"
                                                    value={inputVal}
                                                    onChange={setInputVal}
                                                    onAdd={handleAdd}
                                                    onCancel={() =>
                                                      setAdding(null)
                                                    }
                                                    error={locError}
                                                    loading={locLoading}
                                                    label="New Village"
                                                  />
                                                )}
                                              <div
                                                style={{
                                                  display: "flex",
                                                  flexWrap: "wrap",
                                                  gap: 6,
                                                }}
                                              >
                                                {gp.villages.map((v) => (
                                                  <div
                                                    key={v._id}
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 5,
                                                      padding: "3px 10px",
                                                      background:
                                                        "var(--surface)",
                                                      border:
                                                        "1px solid var(--border)",
                                                      borderRadius: 20,
                                                      fontSize: 12,
                                                    }}
                                                  >
                                                    <span>🏘 {v.name}</span>
                                                    <button
                                                      style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        fontSize: 11,
                                                        color: "var(--red)",
                                                        padding: 0,
                                                      }}
                                                      onClick={() =>
                                                        handleDelete({
                                                          type: "village",
                                                          subDivisionId: sd._id,
                                                          blockId: block._id,
                                                          gpId: gp._id,
                                                          villageId: v._id,
                                                        })
                                                      }
                                                    >
                                                      ✕
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Municipality Tab */}
                                {activeTab === "mun" && (
                                  <div>
                                    {addBtn("+ Add Municipality", () =>
                                      startAdding({
                                        type: "municipality",
                                        subDivisionId: sd._id,
                                        blockId: block._id,
                                      }),
                                    )}
                                    <div style={{ marginTop: 8 }}>
                                      {adding?.type === "municipality" &&
                                        adding.blockId === block._id && (
                                          <AddInline
                                            placeholder="e.g. Baduria Municipality"
                                            value={inputVal}
                                            onChange={setInputVal}
                                            onAdd={handleAdd}
                                            onCancel={() => setAdding(null)}
                                            error={locError}
                                            loading={locLoading}
                                            label="New Municipality"
                                          />
                                        )}
                                      {block.municipalities.length === 0 &&
                                        !(
                                          adding?.type === "municipality" &&
                                          adding.blockId === block._id
                                        ) && (
                                          <p
                                            style={{
                                              fontSize: 13,
                                              color: "var(--text-muted)",
                                              padding: "8px 0",
                                            }}
                                          >
                                            No Municipalities added yet.
                                          </p>
                                        )}
                                      {block.municipalities.map((mun) => (
                                        <div
                                          key={mun._id}
                                          style={{ marginBottom: 6 }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                              padding: "5px 10px",
                                              background: "#f0f4ff",
                                              borderRadius: "var(--radius-sm)",
                                              border: "1px solid #c8d4f0",
                                            }}
                                          >
                                            <button
                                              style={expandBtn(
                                                expandedMun === mun._id,
                                              )}
                                              onClick={() =>
                                                setExpandedMun(
                                                  expandedMun === mun._id
                                                    ? null
                                                    : mun._id,
                                                )
                                              }
                                            >
                                              {expandedMun === mun._id
                                                ? "▾"
                                                : "▸"}
                                            </button>
                                            <span
                                              style={{ fontSize: 13, flex: 1 }}
                                            >
                                              🏙 {mun.name}
                                            </span>
                                            <span
                                              style={{
                                                fontSize: 11,
                                                color: "var(--text-muted)",
                                                marginRight: 4,
                                              }}
                                            >
                                              {mun.wards.length} wards
                                            </span>
                                            {addBtn("+ Ward", () => {
                                              setExpandedMun(mun._id);
                                              startAdding({
                                                type: "ward",
                                                subDivisionId: sd._id,
                                                blockId: block._id,
                                                munId: mun._id,
                                              });
                                            })}
                                            {delBtn(() =>
                                              handleDelete({
                                                type: "municipality",
                                                subDivisionId: sd._id,
                                                blockId: block._id,
                                                munId: mun._id,
                                              }),
                                            )}
                                          </div>
                                          {expandedMun === mun._id && (
                                            <div
                                              style={{
                                                paddingLeft: 20,
                                                paddingTop: 6,
                                              }}
                                            >
                                              {adding?.type === "ward" &&
                                                adding.munId === mun._id && (
                                                  <AddInline
                                                    placeholder="e.g. Ward No. 1"
                                                    value={inputVal}
                                                    onChange={setInputVal}
                                                    onAdd={handleAdd}
                                                    onCancel={() =>
                                                      setAdding(null)
                                                    }
                                                    error={locError}
                                                    loading={locLoading}
                                                    label="New Ward"
                                                  />
                                                )}
                                              <div
                                                style={{
                                                  display: "flex",
                                                  flexWrap: "wrap",
                                                  gap: 6,
                                                }}
                                              >
                                                {mun.wards.map((w) => (
                                                  <div
                                                    key={w._id}
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 5,
                                                      padding: "3px 10px",
                                                      background:
                                                        "var(--surface)",
                                                      border:
                                                        "1px solid var(--border)",
                                                      borderRadius: 20,
                                                      fontSize: 12,
                                                    }}
                                                  >
                                                    <span>🔢 {w.name}</span>
                                                    <button
                                                      style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        fontSize: 11,
                                                        color: "var(--red)",
                                                        padding: 0,
                                                      }}
                                                      onClick={() =>
                                                        handleDelete({
                                                          type: "ward",
                                                          subDivisionId: sd._id,
                                                          blockId: block._id,
                                                          munId: mun._id,
                                                          wardId: w._id,
                                                        })
                                                      }
                                                    >
                                                      ✕
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AddInline({
  placeholder,
  value,
  onChange,
  onAdd,
  onCancel,
  error,
  loading,
  label,
}: any) {
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
    }
    if (e.key === "Escape") onCancel();
  }
  return (
    <div
      style={{
        marginBottom: 10,
        padding: "10px 12px",
        background: "var(--accent-light)",
        border: "1px solid #f0c050",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#7a5200",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 6 }}>
          ⚠ {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="form-input"
          autoFocus
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={onAdd}
          disabled={loading || !value.trim()}
        >
          {loading ? "..." : "Add"}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
