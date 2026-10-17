import type { Metadata } from "next";
import { Bricolage_Grotesque, Poppins, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import "./globals.css";

// Awarome brand type: Poppins for body and UI, Bricolage Grotesque for headings and big numbers.
const sans = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--tabular-nums",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Awarome Admin",
  description: "Internal admin dashboard for Awarome",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isDark = cookieStore.get("awarome.theme")?.value === "dark";

  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased${isDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* useSearchParams needs a boundary so it never forces client rendering. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
