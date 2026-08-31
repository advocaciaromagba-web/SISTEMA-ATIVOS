import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { ROTULO_ESTADO } from "@/lib/solucoes";

export const metadata: Metadata = { title: "Entrar" };

/**
 * Cada solução tem login e cadastro próprios, sem tabela compartilhada — ver
 * `src/lib/solucoes.ts`. Antes desta tela, o botão "Entrar" do cabeçalho ia
 * direto para o login da Gestão de Ativos (a solução mais antiga), deixando
 * quem assina só Compliance, Diligência, Verificação ou Licitações sem saber
 * onde entrar. Aqui o assinante escolhe a solução primeiro.
 */
const SOLUCOES_ACESSO = [
  { chave: "COMPLIANCE_EMPRESA" as const, nome: "Compliance de empresas", entrar: "/compliance/entrar", cadastro: "/compliance/cadastro" },
  { chave: "DILIGENCIA_PESSOA" as const, nome: "Due diligence de pessoas", entrar: "/diligencia/entrar", cadastro: "/diligencia/cadastro" },
  { chave: "VERIFICACAO_DOCUMENTOS" as const, nome: "Verificação de documentos", entrar: "/verificacao/entrar", cadastro: "/verificacao/cadastro" },
  { chave: "LICITACOES" as const, nome: "Análise de licitações", entrar: "/licitacoes/entrar", cadastro: "/licitacoes/cadastro" },
  { chave: "GESTAO_ATIVOS" as const, nome: "Gestão de ativos e operações", entrar: "/login", cadastro: "/cadastro" },
  { chave: "CONSULTA_CADASTRAL_SERASA" as const, nome: "Consulta cadastral", entrar: "/serasa/entrar", cadastro: "/serasa/cadastro" },
] as const;

const ESTADO_POR_CHAVE: Record<(typeof SOLUCOES_ACESSO)[number]["chave"], keyof typeof ROTULO_ESTADO> = {
  COMPLIANCE_EMPRESA: "DISPONIVEL",
  DILIGENCIA_PESSOA: "PARCIAL",
  VERIFICACAO_DOCUMENTOS: "PARCIAL",
  LICITACOES: "PARCIAL",
  GESTAO_ATIVOS: "DISPONIVEL",
  CONSULTA_CADASTRAL_SERASA: "EM_CONSTRUCAO",
};

export default function EscolherSolucaoParaEntrar() {
  return (
    <main className="faixa-escura flex min-h-screen flex-col items-center px-4 py-14">
      <div className="w-full max-w-2xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <MarcaLogo forma="simbolo" altura={56} prioridade />
          <h1 className="titulo mt-5 text-xl font-bold uppercase tracking-[0.16em] text-white">{marca.nome}</h1>
          <p className="serif mt-5 text-sm text-white/60">
            Cada solução tem conta própria. Escolha em qual você quer entrar.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SOLUCOES_ACESSO.map((s) => (
            <div key={s.chave} className="cartao flex flex-col justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{s.nome}</div>
                <div className="mt-1 text-xs text-slate-500">{ROTULO_ESTADO[ESTADO_POR_CHAVE[s.chave]]}</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Link href={s.entrar} className="botao-principal flex-1 py-1.5 text-center text-sm">
                  Entrar
                </Link>
                <Link href={s.cadastro} className="text-xs font-medium text-slate-600 underline hover:text-slate-900">
                  Assinar
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="serif mt-8 text-center text-xs text-white/50">
          Não sabe qual solução assinar ainda?{" "}
          <Link href="/solucoes" className="font-medium text-white underline">
            Veja as soluções
          </Link>
        </p>
      </div>
    </main>
  );
}
