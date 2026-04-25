"use client";
import Pagination from "@/components/Pagination";
import { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import MultiSearchSelect from "@/components/MultiSearchSelect";

interface BC {
  _id: string;
  coordinatorId: string;
  name: string;
  phone: string;
  subDivision: string;
  blocks: string[];
  address: string;
  username: string;
  password: string;
}
interface SubDiv {
  _id: string;
  name: string;
  blocks: { _id: string; name: string }[];
}

const EMPTY = {
  coordinatorId: "",
  name: "",
  phone: "",
  subDivision: "",
  blocks: [] as string[],
  address: "",
  username: "",
  password: "",
};

export default function BlockCoordinatorsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [list, setList] = useState<BC[]>([]);
  const [locations, setLocations] = useState<SubDiv[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BC | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<
    "coordinatorId" | "name" | "subDivision"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const cookies = document.cookie
      .split(";")
      .reduce<Record<string, string>>((acc, c) => {
        const [k, v] = c.trim().split("=");
        acc[k] = decodeURIComponent(v || "");
        return acc;
      }, {});
    setRole(cookies["role_hint"] || null);
    load();
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []));
  }, []);

  async function load() {
    const data = await fetch("/api/block-coordinators").then((r) => r.json());
    setList(Array.isArray(data) ? data : []);
  }

  const selectedSD = locations.find((sd) => sd.name === form.subDivision);
  const blockOptions =
    selectedSD?.blocks.map((b) => ({ label: b.name, value: b.name })) || [];
  const sdOptions = locations.map((sd) => ({ label: sd.name, value: sd.name }));

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY);
    setError("");
    setShowModal(true);
  }
  function openEdit(bc: BC) {
    setEditItem(bc);
    setForm({
      coordinatorId: bc.coordinatorId || "",
      name: bc.name || "",
      phone: bc.phone || "",
      subDivision: bc.subDivision || "",
      blocks: bc.blocks || [],
      address: bc.address || "",
      username: bc.username || "",
      password: (bc as any).plainPassword || "",
    });
    setShowPassword(true);
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.blocks.length === 0) {
      setError("Select at least one block");
      return;
    }
    if (!editItem && !form.password) {
      setError("Password is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = editItem
        ? `/api/block-coordinators?id=${editItem._id}`
        : "/api/block-coordinators";
      const method = editItem ? "PUT" : "POST";
      const body = { ...form };
      if (editItem && !body.password) delete (body as any).password;
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
    if (!confirm("Delete this Block Coordinator?")) return;
    await fetch(`/api/block-coordinators?id=${id}`, { method: "DELETE" });
    load();
  }

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
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
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
      (bc) =>
        !q ||
        bc.name.toLowerCase().includes(q) ||
        bc.coordinatorId.toLowerCase().includes(q) ||
        bc.subDivision.toLowerCase().includes(q) ||
        bc.phone.includes(q),
    )
    .sort((a, b) => {
      const va = (a[sortKey] || "").toLowerCase();
      const vb = (b[sortKey] || "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const pagedList = filteredList.slice((page - 1) * 5, page * 5);

  return (
    <>
      <div className="page-header">
        <h2>Block Coordinators</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Block Coordinator
        </button>
      </div>
      <div className="page-body">
        <div style={{ marginBottom: 14 }}>
          <input
            className="form-input"
            placeholder="🔍 Search by name or id or phone or sub division..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: 400, fontSize: 13 }}
          />
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <SortTh label="ID" k="coordinatorId" />
                <SortTh label="Name" k="name" />
                <th>Phone</th>
                <th>Username</th>
                <SortTh label="Sub Division" k="subDivision" />
                <th>Blocks</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <p>
                        {search
                          ? "No results found."
                          : "No block coordinators yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedList.map((bc) => (
                  <tr key={bc._id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {bc.coordinatorId}
                    </td>
                    <td style={{ fontWeight: 500 }}>{bc.name}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {bc.phone}
                    </td>
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
                        {bc.username}
                      </span>
                    </td>
                    <td>{bc.subDivision}</td>
                    <td>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {bc.blocks.map((b) => (
                          <span key={b} className="badge badge-gray">
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {bc.address || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {role === "admin" && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEdit(bc)}
                          >
                            Edit
                          </button>
                        )}
                        {role === "admin" && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(bc._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        total={filteredList.length}
        page={page}
        pageSize={5}
        onPageChange={setPage}
      />

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <h3>
                {editItem ? "Edit Block Coordinator" : "Add Block Coordinator"}
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
                    <label className="form-label">Block Coordinator ID *</label>
                    <input
                      className="form-input"
                      required
                      value={form.coordinatorId}
                      onChange={(e) =>
                        setForm({ ...form, coordinatorId: e.target.value })
                      }
                      placeholder="e.g. BC-001"
                      disabled={!!editItem}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Full name"
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
                  <div className="form-group">
                    <label className="form-label">Sub Division *</label>
                    <SearchableSelect
                      options={sdOptions}
                      value={form.subDivision}
                      onChange={(v) =>
                        setForm({ ...form, subDivision: v, blocks: [] })
                      }
                      placeholder="Select Sub Division"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username *</label>
                    <input
                      className="form-input"
                      required
                      value={form.username ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      placeholder="Login username"
                    />
                  </div>
                  <div className="form-group" style={{ position: "relative" }}>
                    <label className="form-label">
                      {editItem ? "Password (edit to change)" : "Password *"}
                    </label>
                    <input
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      required={!editItem}
                      value={form.password ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="btn btn-secondary"
                      style={{
                        marginLeft: 8,
                        right: 5,
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-12%)",
                        zIndex: 1,
                        padding: "4px 8px",
                      }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <MultiSearchSelect
                    label="Blocks * (multiple select)"
                    options={blockOptions}
                    values={form.blocks}
                    onChange={(blocks) => setForm({ ...form, blocks })}
                    placeholder={
                      form.subDivision
                        ? "Search and select blocks..."
                        : "First select Sub Division"
                    }
                    disabled={!form.subDivision}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Full address"
                    style={{ resize: "vertical", fontFamily: "inherit" }}
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
                  {loading
                    ? "Saving..."
                    : editItem
                      ? "Update Block Coordinator"
                      : "Add Block Coordinator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
