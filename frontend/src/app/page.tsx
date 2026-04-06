import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LandingShell } from "@/components/landing-shell";

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get("access_token") || cookieStore.get("refresh_token")) {
    redirect("/dashboard");
  }

  return <LandingShell />;
}
