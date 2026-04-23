"use client";
import { useEffect, useState } from "react";

interface DataEntryOperator {
  _id: string;
  name: string;
  username: string;
  plainPassword: string;
  createdAt: string;
}
const EMPTY = { name: "", username: "", password: "" };

export default function DataEntryOperatorsPage() {
  const [list, setList] = useState<DataEntryOperator[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<DataEntryOperator | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "username" | "createdAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }
  const SortTh = ({ label, k }: { label: string; k: typeof sortKey }) => (
    <th onClick={() => toggleSort(k)} style={{ cursor: "pointer", userSelect: "none" }}>
      {label}{" "}{sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );

  async function load() {
    const data = await fetch("/api/data-entry-operators").then((r) => r.json());
    setList(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setEditItem(null); setForm(EMPTY); setShowPassword(false); setError(""); setShowModal(true); }
  function openEdit(op: DataEntryOperator) {
    setEditItem(op);
    setForm({ name: op.name, username: op.username, password: op.plainPassword || "" });
    setShowPassword(true); setError(""); setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const url = editItem ? `/api/data-entry-operators?id=${editItem._id}` : "/api/data-entry-operators";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
      setShowModal(false); load();
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this Data Entry Operator?")) return;
    await fetch(`/api/data-entry-operators?id=${id}`, { method: "DELETE" }); load();
  }

  const q = search.toLowerCase();
  const filtered = list
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.username.toLowerCase().includes(q))
    .sort((a, b) => {
      const va = sortKey === "createdAt" ? new Date(a.createdAt).getTime() : (a[sortKey] || "").toLowerCase();
      const vb = sortKey === "createdAt" ? new Date(b.createdAt).getTime() : (b[sortKey] || "").toLowerCase();
      return sortDir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });

  return (
    <>
      <div className="page-header">
        <h2>Data Entry Operators</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Operator</button>
      </div>
      <div className="page-body">
        <div style={{ marginBottom: 14 }}>
          <input className="form-input" placeholder="🔍 Search by name or username..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <SortTh label="Name" k="name" />
                <SortTh label="Username" k="username" />
                <th>Password</th>
                <SortTh label="Added On" k="createdAt" />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><p>{search ? "No results found." : "No operators added yet."}</p></div></td></tr>
              ) : (
                filtered.map((op) => (
                  <tr key={op._id}>
                    <td style={{ fontWeight: 500 }}>{op.name}</td>
                    <td><span style={{ fontFamily: "monospace", fontSize: 12, background: "var(--gray-100)", padding: "2px 8px", borderRadius: 4 }}>{op.username}</span></td>
                    <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{op.plainPassword || "—"}</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(op.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(op)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(op._id)}>Remove</button>
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
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editItem ? "Edit Operator" : "Add Data Entry Operator"}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Das" />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Login username" />
                </div>
                <div className="form-group">
                  <label className="form-label">{editItem ? "Password (edit to change)" : "Password *"}</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input className="form-input" type={showPassword ? "text" : "password"} required={!editItem} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" style={{ flex: 1 }} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : editItem ? "Update" : "Add Operator"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
