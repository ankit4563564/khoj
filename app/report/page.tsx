import { backendConfigured } from "@/lib/supabase/server";
import { CampusShell, SetupNotice } from "@/components/CampusShell";
import LiveFinder from "@/components/LiveFinder";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <CampusShell
      title="Found something?"
      subtitle="One photo. One small act. A way back to its owner."
    >
      {backendConfigured() ? <LiveFinder /> : <SetupNotice />}
    </CampusShell>
  );
}
