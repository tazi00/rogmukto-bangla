"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const ViewHeader: React.FC = () => {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile: boolean = windowWidth < 768;

  // Dynamic inline styles based on screen size
  const containerStyle: React.CSSProperties = {
    background: "var(--green-dark, #0f4f30)",
    padding: isMobile ? "12px 20px" : "14px 28px",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: isMobile ? "16px" : "10px",
    flexWrap: "wrap",
  };

  const leftSectionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
    justifyContent: isMobile ? "center" : "flex-start",
    textAlign: isMobile ? "center" : "left",
  };

  const logoStyle: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const titleStyle: React.CSSProperties = {
    color: "#fff",
    fontSize: 22,
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.2,
  };

  const subStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 4,
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.5)",
    color: "#fff",
    padding: "8px 20px",
    borderRadius: "30px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    transition: "all 0.2s",
    textAlign: "center",
  };

  return (
    <header style={containerStyle}>
      <div style={leftSectionStyle}>
        <div style={logoStyle}>
          <Image src="/logo.png" width={56} height={56} alt="Logo" />
        </div>
        <div>
          <h1 style={titleStyle}>Rogmukto Bangla</h1>
          <p style={subStyle}>Sankalpa Bharat Mission</p>
        </div>
      </div>
      <a href="/login" style={buttonStyle}>
        Admin Login
      </a>
    </header>
  );
};

export default ViewHeader;
