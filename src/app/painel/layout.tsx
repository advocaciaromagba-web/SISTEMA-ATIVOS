import { exigirSessao, situacaoAssinatura } from "@/lib/sessao";
import { marca } from "@/lib/marca";
import { Navegacao } from "@/components/navegacao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { usuario, organizacao } = await exigirSessao();
  const assinatura = situacaoAssinatura(organizacao);

  return (
    <div className="min-h-screen">
      <Navegacao
        marcaNome={marca.nome}
        marcaAssinatura={marca.assinatura}
        usuarioNome={usuario.nome}
        organizacaoNome={organizacao.nome}
      />

      {/* Aviso de assinatura: aparece em toda tela enquanto houver pendência,
          para que ninguém descubra o bloqueio só na hora de gerar um contrato. */}
      {!assinatura.liberado && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          {assinatura.motivo}{" "}
          <a href="/painel/configuracoes/assinatura" className="font-medium underline">
            Regularizar
          </a>
        </div>
      )}
      {assinatura.liberado && assinatura.diasRestantes != null && assinatura.diasRestantes <= 7 && (
        <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-center text-sm text-sky-900">
          Seu período de teste termina em {assinatura.diasRestantes}{" "}
          {assinatura.diasRestantes === 1 ? "dia" : "dias"}.
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-slate-400">
        {marca.razaoSocial || marca.nome}
        {marca.cnpj ? ` — CNPJ ${marca.cnpj}` : ""}
      </footer>
    </div>
  );
}
