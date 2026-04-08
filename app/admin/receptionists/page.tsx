"use client";
import { useEffect, useState } from "react";

interface Receptionist {
  _id: string;
  name: string;
  username: string;
  createdAt: string;
}
const EMPTY = { name: "", username: "", password: "" };

export default function ReceptionistsPage() {
  const [list, setList] = useState<Receptionist[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Receptionist | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "username" | "createdAt">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  const SortTh = ({ label, k }: { label: string; k: typeof sortKey }) => (
    <th
      onClick={() => toggleSort(k)}
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      {label}{" "}
      {sortKey === k ? (
        sortDir === "asc" ? (
          "↑"
        ) : (
          "↓"
        )
      ) : (
        <span style={{ opacity: 0.3 }}>↕</span>
      )}
    </th>
  );

  const q = search.toLowerCase();
  const filteredList = list
    .filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q),
    )
    .sort((a, b) => {
      const va =
        sortKey === "createdAt"
          ? new Date(a.createdAt).getTime()
          : (a[sortKey] || "").toLowerCase();
      const vb =
        sortKey === "createdAt"
          ? new Date(b.createdAt).getTime()
          : (b[sortKey] || "").toLowerCase();
      return sortDir === "asc"
        ? va < vb
          ? -1
          : va > vb
            ? 1
            : 0
        : va > vb
          ? -1
          : va < vb
            ? 1
            : 0;
    });

  async function load() {
    const data = await fetch("/api/receptionists").then((r) => r.json());
    setList(Array.isArray(data) ? data : []);
  }
  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY);
    setError("");
    setShowModal(true);
  }
  function openEdit(r: Receptionist) {
    setEditItem(r);
    setForm({ name: r.name, username: r.username, password: "" });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = editItem
        ? `/api/receptionists?id=${editItem._id}`
        : "/api/receptionists";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    if (!confirm("Remove this receptionist?")) return;
    await fetch(`/api/receptionists?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div className="page-header">
        <h2>Receptionists</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Receptionist
        </button>
      </div>
      <div className="page-body">
        <div style={{ marginBottom: 14 }}>
          <input
            className="form-input"
            placeholder="🔍 Search by name ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 360, fontSize: 13 }}
          />
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <SortTh label="Name" k="name" />
                <SortTh label="Username" k="username" />
                <SortTh label="Added On" k="createdAt" />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <p>
                        {search
                          ? "No results found."
                          : "No receptionists added yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          background: "var(--gray-100)",
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {r.username}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(r._id)}
                        >
                          Remove
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
          <div className="modal">
            <div className="modal-header">
              <h3>{editItem ? "Edit Receptionist" : "Add Receptionist"}</h3>
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
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Priya Sen"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    className="form-input"
                    required
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    placeholder="Login username"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {editItem
                      ? "New Password (leave blank to keep)"
                      : "Password *"}
                  </label>
                  <input
                    className="form-input"
                    type="password"
                    required={!editItem}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Password"
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
                  disabled={loading}
                >
                  {loading ? "Saving..." : editItem ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
