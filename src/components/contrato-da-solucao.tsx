import Link from "next/link";
import { marca } from "@/lib/marca";
import { MarcaLogo } from "@/components/marca-logo";
import { contratoVigente, blocosDoContrato } from "@/lib/contratos-solucao";

/**
 * Página de contrato de uma solução.
 *
 * Uma por solução, com o texto daquela solução. Se não houver versão
 * publicada, diz isso com todas as letras em vez de mostrar um contrato
 * genérico — cliente lendo cláusula que não vale para o que ele comprou é
 * pior do que cliente sem cláusula nenhuma.
 */
export async function ContratoDaSolucao({
  solucao,
  rotulo,
  voltarPara,
}: {
  solucao: string;
  rotulo: string;
  voltarPara: string;
}) {
  const contrato = await contratoVigente(solucao);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href={voltarPara} aria-label={marca.nome}>
            <MarcaLogo altura={30} prioridade />
          </Link>
          <Link href={voltarPara} className="text-sm text-slate-500 hover:underline">
            Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="sobretitulo">{rotulo}</p>

        {!contrato ? (
          <>
            <h1 className="titulo mt-3 text-2xl font-semibold text-slate-900">Contrato ainda não publicado</h1>
            <p className="mt-4 text-slate-600">
              Esta solução ainda não tem contrato publicado. Enquanto isso, valem as condições informadas na página de
              planos e o que estiver escrito na proposta. Se você precisa do contrato antes de assinar, fale com a{" "}
              {marca.nome} — é um pedido legítimo e a resposta não deveria demorar.
            </p>
          </>
        ) : (
          <>
            <h1 className="titulo mt-3 text-2xl font-semibold text-slate-900">{contrato.titulo}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Versão {contrato.versao}
              {contrato.publicadoEm
                ? ` · em vigor desde ${new Date(contrato.publicadoEm).toLocaleDateString("pt-BR")}`
                : ""}
            </p>

            <div className="mt-8 space-y-4">
              {blocosDoContrato(contrato.conteudo).map((bloco, i) =>
                bloco.tipo === "titulo" ? (
                  <h2 key={i} className="mt-8 text-base font-semibold text-slate-900">
                    {bloco.texto}
                  </h2>
                ) : (
                  <p key={i} className="leading-relaxed text-slate-700">
                    {bloco.texto}
                  </p>
                )
              )}
            </div>

            <p className="mt-10 break-all border-t border-slate-200 pt-4 text-xs text-slate-400">
              Impressão digital deste texto (SHA-256): {contrato.hashConteudo}
              <br />
              Ela identifica exatamente esta versão. Cada aceite registra esse mesmo código, o que permite conferir
              depois qual texto foi aceito.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
