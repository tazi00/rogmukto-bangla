"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

// --- Type definitions ---
type NavItemBase = {
  href?: string;
  label?: string;
  icon?: string;
  external?: boolean;
};

type NavSection = {
  section: string;
};

type NavLink = {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
};

type NavItem = NavSection | NavLink;

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "⊞" },
  { section: "Manage" },
  { href: "/admin/block-coordinators", label: "Block Coordinator", icon: "🗂" },
  { href: "/admin/helpers", label: "Swasthya Bondhu", icon: "👥" },
  { href: "/admin/patients", label: "Patients", icon: "🏥" },
  { href: "/admin/receptionists", label: "Receptionists", icon: "🖥" },
  { section: "Config" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
  { section: "View" },
  { href: "/view", label: "Report", icon: "↗", external: true },
];

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(1200);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const isMobile = mounted ? windowWidth < 768 : false;

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // ----- Styles (typed as React.CSSProperties) -----
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 998,
    display: mobileMenuOpen && isMobile ? "block" : "none",
  };

  const sidebarStyle: React.CSSProperties = {
    position: isMobile ? "fixed" : "sticky",
    top: 0,
    left: 0,
    height: "100vh",
    width: isMobile ? (mobileMenuOpen ? "260px" : "0px") : "260px",
    backgroundColor: "#0f4f30",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
    transition: "width 0.2s ease",
    zIndex: 999,
    boxShadow: isMobile ? "2px 0 12px rgba(0,0,0,0.2)" : "none",
  };

  const sidebarInnerStyle: React.CSSProperties = {
    padding: isMobile && !mobileMenuOpen ? 0 : "20px 16px",
    opacity: isMobile && !mobileMenuOpen ? 0 : 1,
    transition: "opacity 0.2s",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const logoStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "24px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "16px",
  };

  const logoImgStyle: React.CSSProperties = {
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "inline-flex",
    padding: "6px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 600,
    margin: "12px 0 4px",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "rgba(255,255,255,0.6)",
  };

  const navSectionStyle: React.CSSProperties = {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "rgba(255,255,255,0.4)",
    margin: "16px 0 8px 0",
  };

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "10px 12px",
    backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
    fontSize: "14px",
    fontWeight: isActive ? 500 : 400,
    cursor: "pointer",
    textAlign: "left",
    marginBottom: "4px",
    transition: "background 0.2s",
  });

  const hamburgerButtonStyle: React.CSSProperties = {
    position: "fixed",
    top: "16px",
    left: "16px",
    zIndex: 1000,
    background: "#0f4f30",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "24px",
    padding: "8px 12px",
    cursor: "pointer",
    display: isMobile ? "block" : "none",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  };

  // Helper to check if a nav item is a section
  const isSection = (item: NavItem): item is NavSection => {
    return "section" in item;
  };

  // Helper to check if a nav item is a link
  const isLink = (item: NavItem): item is NavLink => {
    return "href" in item && typeof item.href === "string";
  };

  return (
    <>
      {/* Hamburger button (mobile only) */}
      <button
        style={hamburgerButtonStyle}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        ☰
      </button>

      {/* Overlay (mobile only) */}
      <div style={overlayStyle} onClick={() => setMobileMenuOpen(false)} />

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={sidebarInnerStyle}>
          <div style={logoStyle}>
            <div style={logoImgStyle}>
              <Image src="/logo.png" width={80} height={80} alt="Logo" />
            </div>
            <h1 style={titleStyle}>Rogmukto Bangla</h1>
            <p style={subtitleStyle}>Admin Panel</p>
          </div>

          <nav style={{ flex: 1 }}>
            {navItems.map((item, i) => {
              if (isSection(item)) {
                return (
                  <div key={i} style={navSectionStyle}>
                    {item.section}
                  </div>
                );
              }
              if (isLink(item)) {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <button
                    key={item.href}
                    style={navItemStyle(isActive)}
                    onClick={() => {
                      if (item.external) {
                        window.open(item.href, "_blank");
                      } else {
                        router.push(item.href);
                        if (isMobile) setMobileMenuOpen(false);
                      }
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              }
              return null;
            })}
          </nav>

          <div style={{ marginTop: "auto", paddingTop: "20px" }}>
            <button style={navItemStyle(false)} onClick={handleLogout}>
              <span style={{ fontSize: "18px" }}>→</span>
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
