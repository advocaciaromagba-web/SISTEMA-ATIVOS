import type { Metadata } from "next";
import "./globals.css";
import { marca, variaveisDeCor } from "@/lib/marca";
import { Sessao } from "@/components/sessao";

export const metadata: Metadata = {
  title: marca.nome,
  description: "Gestão de operações, documentos e auditoria para intermediação de ativos",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* As cores vêm do .env, então precisam ser injetadas em tempo de
            execução — não dá para fixá-las no CSS compilado. */}
        <style dangerouslySetInnerHTML={{ __html: variaveisDeCor() }} />
      </head>
      <body>
        <Sessao>{children}</Sessao>
      </body>
    </html>
  );
}
