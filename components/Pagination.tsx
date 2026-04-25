"use client";
import React from "react";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ total, page, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const btn = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 6, fontSize: 13, fontWeight: active ? 700 : 400,
    border: `1px solid ${active ? "var(--green-dark,#1b4332)" : "var(--border,#e0e0e0)"}`,
    background: active ? "var(--green-dark,#1b4332)" : "var(--surface,#fff)",
    color: active ? "#fff" : disabled ? "var(--text-muted)" : "var(--text)",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, minWidth: 36, textAlign: "center",
  });

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", padding: "14px 0 4px" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 8 }}>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <button style={btn(false, page === 1)} onClick={() => page > 1 && onPageChange(page - 1)} disabled={page === 1}>←</button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`d${i}`} style={{ padding: "0 4px", color: "var(--text-muted)" }}>…</span>
        : <button key={p} style={btn(p === page)} onClick={() => onPageChange(p as number)}>{p}</button>
      )}
      <button style={btn(false, page === totalPages)} onClick={() => page < totalPages && onPageChange(page + 1)} disabled={page === totalPages}>→</button>
    </div>
  );
}
