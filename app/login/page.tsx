import { backendConfigured } from "@/lib/supabase/server";
import { CampusShell } from "@/components/CampusShell";
import LoginForm from "@/components/LoginForm";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <CampusShell
      title="A familiar place."
      subtitle="Your RV University belongings, all in one place."
    >
      <LoginForm
        configured={backendConfigured()}
        expired={params.error === "expired"}
      />
    </CampusShell>
  );
}
