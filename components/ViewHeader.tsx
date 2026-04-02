"use client";

export default function ViewHeader() {
  return (
    <header
      style={{
        background: "var(--green-dark, #0f4f30)",
        padding: "14px 28px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          🏥
        </div>
        <div>
          <h1
            style={{ color: "#fff", fontSize: 18, fontWeight: 600, margin: 0 }}
          >
            Rogmukto Bangla
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            Sankalpa Bharat Mission
          </p>
        </div>
      </div>

      <a
        href="/login"
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.5)",
          color: "#fff",
          padding: "8px 20px",
          borderRadius: 30,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        Admin Login
      </a>
    </header>
  );
}
