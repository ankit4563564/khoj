"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Menu,
  X,
  Radar,
  ArrowUpRight,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Home,
  LayoutGrid,
  Plus,
  FileText,
  User,
} from "lucide-react";
import { PortalProvider, usePortal } from "./PortalProvider";

export function Mark({ large = false }: { large?: boolean }) {
  return (
    <span className={`rv-mark ${large ? "large" : ""}`}>
      <Radar size={large ? 44 : 25} strokeWidth={1.5} />
    </span>
  );
}
function Navigation() {
  const { data, act, toast } = usePortal(),
    path = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [notices, setNotices] = useState(false),
    [theme, setTheme] = useState("light");
  useEffect(() => {
    setOpen(false);
    setNotices(false);
  }, [path]);
  useEffect(() => {
    setTheme(localStorage.getItem("rvu-theme") || "dark");
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    localStorage.setItem("rvu-theme", theme);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const links = [
    ["/board", "Browse Items"],
    ["/status", "My Items"],
    ["/report/found", "Found Something"],
    ...(data.user ? [["/profile", "Profile"]] : []),
  ];
  return (
    <>
      <header className="rv-nav">
        <Link
          href="/"
          className="rv-brand"
          aria-label="KHOJ RV University home"
        >
          <Mark />
          <span>
            KHOJ<span className="rv-brand-sub"><span className="kh-pulse-dot" style={{ width: 5, height: 5, marginRight: 5, verticalAlign: 'middle' }} />RU LOST IN RVU?</span>
          </span>
        </Link>
        <button
          className="rv-mobile-toggle rv-icon-button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav aria-label="Main navigation" className={open ? "is-open" : ""}>
          {links.map(([href, label]) => (
            <Link
              key={href}
              className={path === href ? "active" : ""}
              href={href}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/report/found"
            className="ru-btn-found"
            style={{
              padding: "7px 14px",
              fontSize: "0.82rem",
              borderRadius: "999px",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#34d399",
            }}
          >
            Report Found Item
          </Link>
          {data.user ? (
            <>
              <div className="rv-notification-wrap">
                <button
                  className="rv-icon-button"
                  aria-label="Notifications"
                  aria-expanded={notices}
                  onClick={() => setNotices(!notices)}
                >
                  <Bell size={19} />
                  {data.notifications.some((n) => !n.read) && (
                    <span className="rv-dot" />
                  )}
                </button>
                {notices && (
                  <div className="rv-notifications">
                    <div className="rv-between">
                      <strong>Notifications</strong>
                      <button
                        className="rv-text-button"
                        onClick={() =>
                          void act("read_notifications").catch((e) =>
                            toast(e.message),
                          )
                        }
                      >
                        Mark all read
                      </button>
                    </div>
                    {data.notifications.length ? (
                      data.notifications.slice(0, 8).map((n) => (
                        <Link
                          key={n.id}
                          href={n.href}
                          className={n.read ? "" : "unread"}
                        >
                          {n.title}
                          <small>
                            {new Date(n.createdAt).toLocaleDateString()}
                          </small>
                        </Link>
                      ))
                    ) : (
                      <p>You’re all caught up.</p>
                    )}
                  </div>
                )}
              </div>
              <button
                className="rv-account"
                title="Log out"
                onClick={async () => {
                  try {
                    await act("logout");
                    router.push("/login");
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                <span>{data.user.name.split(" ")[0]}</span>
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <Link href="/login" className="rv-nav-signup">
              Sign In with RVU <ArrowUpRight size={13} />
            </Link>
          )}
        </nav>
      </header>
      <label className="rv-theme">
        {theme === "dark" ? (
          <Moon size={14} />
        ) : theme === "light" ? (
          <Sun size={14} />
        ) : (
          <Monitor size={14} />
        )}
        <span className="sr-only">Theme</span>
        <select
          aria-label="Theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="system">Theme: System</option>
          <option value="light">Theme: Light</option>
          <option value="dark">Theme: Dark</option>
        </select>
      </label>
    </>
  );
}

function MobileBottomNav() {
  const path = usePathname();
  const { data } = usePortal();

  return (
    <nav className="kh-bottom-nav" aria-label="Mobile Navigation">
      <Link href="/" className={`kh-bottom-item ${path === "/" ? "active" : ""}`}>
        <Home size={20} />
        <span>Home</span>
      </Link>
      <Link href="/board" className={`kh-bottom-item ${path === "/board" ? "active" : ""}`}>
        <LayoutGrid size={20} />
        <span>Browse</span>
      </Link>
      <Link
        href="/report/found"
        className={`kh-bottom-item kh-bottom-report ${path.startsWith("/report") ? "active" : ""}`}
      >
        <div className="kh-bottom-plus-circle">
          <Plus size={22} strokeWidth={2.5} />
        </div>
        <span>Report</span>
      </Link>
      <Link href="/status" className={`kh-bottom-item ${path === "/status" ? "active" : ""}`}>
        <FileText size={20} />
        <span>My Items</span>
      </Link>
      <Link
        href={data.user ? "/profile" : "/login"}
        className={`kh-bottom-item ${path === "/profile" || path === "/login" ? "active" : ""}`}
      >
        <User size={20} />
        <span>{data.user ? "Profile" : "Sign In"}</span>
      </Link>
    </nav>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PortalProvider>
      <div className="rv-app">
        <Navigation />
        <main id="main-content" className="rv-main">
          {children}
        </main>
        <footer className="rv-footer">
          <Link href="/">
            <strong>KHOJ</strong> <span> / RV University</span>
          </Link>
          <span>A little care. A lot of reunions.</span>
          <span>RV University Campus Lost & Found</span>
        </footer>
        <MobileBottomNav />
      </div>
    </PortalProvider>
  );
}
