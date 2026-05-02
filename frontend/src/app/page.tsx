import { createClient } from "@/lib/supabase/server";
import { LandingShell } from "@/components/landing-shell";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LandingShell />;
}
