import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
export function CampusShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="campus-shell">
      <header className="campus-top">
        <Link href="/campus" className="brand">
          <span className="brand-mark">
            <Search />
          </span>
          <div>
            <strong>KHOJ</strong>
            <span>RV University</span>
          </div>
        </Link>
        <nav>
          <Link href="/report">Report a find</Link>
          <Link href="/">
            Try KHOJ <ArrowUpRight size={14} />
          </Link>
        </nav>
      </header>
      <div className="campus-body">
        <div className="page-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </div>
      <footer>
        KHOJ <span>RV University · A little kindness goes a long way.</span>
      </footer>
    </div>
  );
}
export function SetupNotice() {
  return (
    <div className="form-panel">
      <h2>KHOJ is getting ready for your campus.</h2>
      <p className="muted">
        Sign-in and real reports are not available yet. You can try KHOJ with
        example items while campus setup is being finished.
      </p>
      <Link className="primary" href="/">
        Try the practice version
      </Link>
    </div>
  );
}
