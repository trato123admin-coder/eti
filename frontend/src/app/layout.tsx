import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import AppNavigation from "@/components/AppNavigation";
import AppFooter from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "eTrade Trading Intelligence (ETI) — Addendum v2.3",
  description: "Plataforma ETI: Ingesta de Canales, Subtítulos Desacoplados y Rule Packs para Robot eTrade",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
        <AuthProvider>
          <AppNavigation />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <AppFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
