import Link from "next/link";
import { marca } from "@/lib/marca";
import { SOLUCOES } from "@/lib/solucoes";
import { AbasSolucoes } from "./abas";

export const metadata = {
  title: "Soluções",
  description:
    "Compliance de empresas, due diligence de pessoas, verificação de documentos, análise de licitações e " +
    "gestão de ativos financeiros e commodities.",
  robots: { index: true, follow: true },
};

export default function Solucoes() {
  return (
    <>
      <section className="faixa-escura border-b-2 border-[color:var(--marca-destaque)]">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="sobretitulo">Soluções estratégicas</p>
          <h1 className="titulo mt-4 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
            Saber com quem se está tratando, antes de assinar.
          </h1>
          <p className="serif mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            {marca.nome} reúne as verificações que o mercado de ativos financeiros e commodities exige — e as
            entrega no formato de um parecer que se guarda, se mostra e se defende.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <AbasSolucoes solucoes={SOLUCOES} />
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="titulo regua-destaque text-2xl font-semibold text-slate-900">Como se contrata</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="cartao">
              <h3 className="titulo text-base font-semibold text-slate-900">Por assinatura</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Para quem verifica com frequência. O plano inclui uma cota mensal de verificações, os documentos e
                o painel, e o que exceder é cobrado só quando usado.
              </p>
              <Link href="/planos" className="botao-secundario mt-4">
                Ver planos
              </Link>
            </div>
            <div className="cartao">
              <h3 className="titulo text-base font-semibold text-slate-900">Avulso, sem assinatura</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Para quem precisa de uma verificação pontual. Paga-se por parecer, com preço publicado e prazo
                declarado. Há opção com entrega em 24 horas úteis.
              </p>
              <Link href="/planos#avulsos" className="botao-secundario mt-4">
                Ver preços avulsos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
