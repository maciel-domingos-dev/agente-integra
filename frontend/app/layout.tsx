import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "Integra Consultoria · Painel do Agente de IA",
  description: "Painel administrativo do atendimento automatizado de candidatos via WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
