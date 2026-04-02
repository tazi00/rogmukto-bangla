"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }
      if (data.role === "admin") router.push("/admin");
      else router.push("/reception");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f4f30 0%, #1a7a4a 100%)",
        padding: "20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              fontSize: 26,
            }}
          >
            <Image src={"/logo.png"} width={80} height={80} alt="Logo" />
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 600 }}>
            Rogmukto Bangla
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Sankalpa Bharat Mission
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "28px 24px" }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 20,
              color: "var(--text)",
            }}
          >
            Sign in to continue
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 4,
                padding: "11px",
              }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            marginTop: 20,
          }}
        >
          Basirhat Sub-Division · Patient Tracking System
        </p>
      </div>
    </div>
  );
}
