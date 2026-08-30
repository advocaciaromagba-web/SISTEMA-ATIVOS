import Link from "next/link";
import type { Metadata } from "next";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { moeda } from "@/lib/formato";
import { DIAS_DE_TESTE, CONSULTAS_GRATIS_TESTE } from "@/lib/planos";
import { PLANOS_COMPLIANCE } from "@/lib/compliance/planos";

export const metadata: Metadata = { title: "Planos — Compliance" };

export default function PlanosCompliance() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/compliance/entrar" aria-label={marca.nome}>
            <MarcaLogo altura={30} prioridade />
          </Link>
          <Link href="/compliance/entrar" className="text-sm text-slate-500 hover:underline">
            Já tem conta? Entrar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-16">
        <p className="sobretitulo">Compliance de empresas</p>
        <h1 className="titulo mt-3 text-3xl font-semibold text-slate-900">Planos e preços</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
          Conta própria desta solução, separada de qualquer outra assinatura da {marca.nome}. {DIAS_DE_TESTE} dias
          de teste com {CONSULTAS_GRATIS_TESTE} consultas grátis, sem cartão.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLANOS_COMPLIANCE.map((plano) => (
            <div
              key={plano.chave}
              className={`flex flex-col rounded-xl border bg-white p-6 ${
                plano.destaque ? "border-2 shadow-md" : "border-slate-200 shadow-sm"
              }`}
              style={plano.destaque ? { borderColor: "var(--marca)" } : undefined}
            >
              {plano.destaque && (
                <span
                  className="mb-3 self-start rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: "var(--marca)" }}
                >
                  mais escolhido
                </span>
              )}

              <h2 className="text-xl font-semibold text-slate-900">{plano.nome}</h2>
              <p className="mt-1 text-sm text-slate-500">{plano.paraQuem}</p>

              <div className="mt-5">
                <div className="text-3xl font-semibold text-slate-900">
                  {moeda(plano.precoMensal)}
                  <span className="text-base font-normal text-slate-500"> /mês</span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  ou {moeda(plano.precoAnual)} no ano — economia de{" "}
                  {moeda(plano.precoMensal * 12 - plano.precoAnual)}
                </div>
              </div>

              <ul className="mt-5 flex-1 space-y-2 border-t border-slate-100 pt-5 text-sm text-slate-700">
                {plano.inclui.map((linha, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: "var(--marca)" }}>•</span>
                    <span>{linha}</span>
                  </li>
                ))}
              </ul>

              {plano.naoInclui && plano.naoInclui.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-slate-400">
                  {plano.naoInclui.map((linha, i) => (
                    <li key={i}>não inclui: {linha}</li>
                  ))}
                </ul>
              )}

              <Link
                href="/compliance/cadastro"
                className={`mt-6 text-center ${plano.destaque ? "botao-principal" : "botao-secundario"}`}
              >
                Começar o teste
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
