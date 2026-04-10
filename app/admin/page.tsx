"use client";
import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    blockCoordinators: 0,
    helpers: 0,
    patients: 0,
    pending: 0,
    cleared: 0,
  });

  useEffect(() => {
    async function load() {
      const [helpers, patients, bcPerformance] = await Promise.all([
        fetch("/api/helpers").then((r) => r.json()),
        fetch("/api/patients").then((r) => r.json()),
        fetch("/api/bc-performance").then((r) => r.json()),
      ]);
      const pending = patients.filter(
        (p: any) => p.paymentStatus === "pending",
      ).length;
      const cleared = patients.filter(
        (p: any) => p.paymentStatus === "cleared",
      ).length;
      setStats({
        helpers: helpers.length,
        patients: patients.length,
        blockCoordinators: bcPerformance.length,
        pending,
        cleared,
      });
    }
    load();
  }, []);

  const now = new Date();
  const month = now.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {month}
        </span>
      </div>
      <div className="page-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div className="stat-card">
            <div className="stat-label">Total Block Coordinators</div>
            <div className="stat-value">{stats.blockCoordinators}</div>
            <div className="stat-sub">All time</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Swasthya Bondhu</div>
            <div className="stat-value">{stats.helpers}</div>
            <div className="stat-sub">Registered Swasthya Bondhu</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Patients</div>
            <div className="stat-value">{stats.patients}</div>
            <div className="stat-sub">All time</div>
          </div>
          {/* <div className="stat-card">
            <div className="stat-label">Pending Payment</div>
            <div className="stat-value" style={{ color: "var(--accent)" }}>
              {stats.pending}
            </div>
            <div className="stat-sub">Awaiting clearance</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Cleared</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>
              {stats.cleared}
            </div>
            <div className="stat-sub">Payments done</div>
          </div> */}
        </div>

        <div className="card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Quick Actions
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 16,
            }}
          >
            Common tasks you can do from here
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/admin/helpers" className="btn btn-secondary">
              + Add Swasthya Bondhu
            </a>
            <a href="/admin/receptionists" className="btn btn-secondary">
              + Add Receptionist
            </a>
            <a href="/admin/patients" className="btn btn-secondary">
              View All Patients
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
