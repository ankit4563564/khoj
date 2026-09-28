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
            Explore demo <ArrowUpRight size={14} />
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
      <h2>The campus connection is next.</h2>
      <p className="muted">
        The RV University workspace is built, but its Supabase service hasn’t
        been configured yet. Sign-in and real reports will be available once it
        is connected.
      </p>
      <Link className="primary" href="/">
        Explore the working demo
      </Link>
    </div>
  );
}
