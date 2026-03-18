import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-provider";
import { TRPCProvider } from "@/lib/trpc-provider";

export const metadata: Metadata = {
  title: "Dental CRM - Gestión Inteligente",
  description: "CRM con IA para clínicas dentales",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans">
        <AuthProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
