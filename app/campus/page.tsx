import { redirect } from "next/navigation";
import { backendConfigured, userClient } from "@/lib/supabase/server";
import { collegeEmail } from "@/lib/validation";
import { CampusShell, SetupNotice } from "@/components/CampusShell";
import LiveWorkspace from "@/components/LiveWorkspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!backendConfigured())
    return (
      <CampusShell
        title="Your campus workspace."
        subtitle="Built for RV University."
      >
        <SetupNotice />
      </CampusShell>
    );
  const client = await userClient();
  const { data } = await client.auth.getUser();
  if (
    !data.user?.email_confirmed_at ||
    !collegeEmail.safeParse(data.user.email).success
  )
    redirect("/login");
  return (
    <CampusShell
      title="A little lost. Not gone."
      subtitle="Your belongings. Your campus. A way back."
    >
      <LiveWorkspace email={data.user.email!} />
    </CampusShell>
  );
}
