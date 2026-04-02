"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const ReceptionHeader: React.FC = () => {
  const router = useRouter();
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile: boolean = windowWidth < 768;

  const containerStyle: React.CSSProperties = {
    background: "var(--green-dark, #0f4f30)",
    padding: isMobile ? "12px 20px" : "14px 20px",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: isMobile ? "12px" : "10px",
  };

  const leftSectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: isMobile ? "center" : "flex-start",
    textAlign: isMobile ? "center" : "left",
  };

  const logoStyle: React.CSSProperties = {
    width: 50,
    height: 50,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const titleStyle: React.CSSProperties = {
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.2,
  };

  const subStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 2,
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "center",
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.5)",
    color: "#fff",
    padding: "6px 16px",
    borderRadius: "30px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    transition: "all 0.2s",
    textAlign: "center",
  };

  const handleLogout = async (): Promise<void> => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header style={containerStyle}>
      <div style={leftSectionStyle}>
        <div style={logoStyle}>
          <Image src="/logo.png" width={50} height={50} alt="Logo" />
        </div>
        <div>
          <h1 style={titleStyle}>Rogmukto Bangla</h1>
          <p style={subStyle}>Reception Panel</p>
        </div>
      </div>
      <div style={buttonGroupStyle}>
        <a href="/view" target="_blank" style={buttonStyle}>
          ↗ View Panel
        </a>
        <button style={buttonStyle} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default ReceptionHeader;
