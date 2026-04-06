import type { ReactNode } from "react";

import { RequireAuth } from "@/components/require-auth";

export default function ProductLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <RequireAuth>{children}</RequireAuth>;
}
