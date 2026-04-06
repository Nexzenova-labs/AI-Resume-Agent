import type { Metadata } from "next";
import { AppProvider } from "@/components/providers/app-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Agent",
  description: "AI-powered resume builder, ATS analyzer, and interview coach.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
