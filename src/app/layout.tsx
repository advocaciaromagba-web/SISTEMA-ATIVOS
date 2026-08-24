import type { Metadata } from "next";
import "./globals.css";
import { marca, variaveisDeCor } from "@/lib/marca";
import { classesDeFonte } from "@/lib/fontes";
import { Sessao } from "@/components/sessao";

export const metadata: Metadata = {
  title: {
    default: marca.assinatura ? `${marca.nome} — ${marca.assinatura}` : marca.nome,
    template: `%s · ${marca.nome}`,
  },
  description: "Gestão de operações, documentos e auditoria para intermediação de ativos",
  robots: { index: false, follow: false },
  // O ícone é o pássaro sobre o azul: é por ele que se acha a aba aberta.
  icons: {
    icon: [
      { url: "/marca/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/marca/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/marca/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={classesDeFonte}>
      <head>
        {/* As cores vêm do .env, então precisam ser injetadas em tempo de
            execução — não dá para fixá-las no CSS compilado. */}
        <style dangerouslySetInnerHTML={{ __html: variaveisDeCor() }} />
        {/* Pinta a barra do navegador no celular com o azul da marca. */}
        <meta name="theme-color" content={marca.cores.principal} />
      </head>
      <body>
        <Sessao>{children}</Sessao>
      </body>
    </html>
  );
}
