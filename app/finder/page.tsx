import { backendConfigured } from "@/lib/supabase/server";
import { CampusShell, SetupNotice } from "@/components/CampusShell";
import LiveFinder from "@/components/LiveFinder";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <CampusShell
      title="A way back, together."
      subtitle="Your private found-item case."
    >
      {backendConfigured() ? <LiveFinder tracking /> : <SetupNotice />}
    </CampusShell>
  );
}
