import { prisma } from "@/lib/prisma";
import { exigirSessaoVerificacao } from "@/lib/verificacao/sessao";
import { formatarDocumento } from "@/lib/validacao";
import { dataCurta } from "@/lib/formato";
import { iaConfigurada } from "@/lib/ia/claude";
import { infosimplesConfigurado } from "@/lib/auditoria/fontes/infosimples";
import { FormularioDocumento } from "./formulario";
import { FormularioEmissao } from "./formulario-emissao";
import { ExcluirBotao } from "./excluir-botao";

export const dynamic = "force-dynamic";

const ROTULO_TIPO: Record<string, string> = {
  CERTIDAO: "Certidão",
  CONTRATO_SOCIAL: "Contrato social",
  RG: "RG",
  CPF: "CPF",
  OUTRO: "Outro",
};

const ROTULO_RESULTADO: Record<string, string> = {
  NADA_CONSTA: "nada consta",
  CONSTA: "consta apontamento",
  PENDENTE: "pendente",
};
const COR_RESULTADO: Record<string, string> = {
  NADA_CONSTA: "bg-emerald-100 text-emerald-800",
  CONSTA: "bg-red-100 text-red-800",
  PENDENTE: "bg-slate-200 text-slate-700",
};

export default async function Documentos() {
  const { conta } = await exigirSessaoVerificacao();

  const documentos = await prisma.verificacaoDocumento.findMany({
    where: { verificacaoContaId: conta.id },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Verificação de documentos</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Cada documento recebe uma impressão digital (hash) que prova depois que ele não foi alterado, fica com o
          prazo de validade sob controle, e pode ser conferido contra uma emissão de hoje direto no órgão.
        </p>
      </div>

      {!iaConfigurada() && (
        <div className="aviso-atencao">
          <strong className="block">Leitura por IA ainda não configurada</strong>
          <span className="mt-1 block">
            A impressão digital e o controle de validade já funcionam normalmente. A extração automática dos dados
            do documento (tipo, nome, número) fica disponível assim que a chave de IA for cadastrada.
          </span>
        </div>
      )}

      {!infosimplesConfigurado() && (
        <div className="aviso-atencao">
          <strong className="block">Emissão automática de certidão ainda não configurada</strong>
          <span className="mt-1 block">
            Falta o token do Infosimples. O upload e a comparação manual continuam funcionando normalmente.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <section className="cartao">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Novo documento</h2>
            <FormularioDocumento />
          </section>

          <section className="cartao">
            <h2 className="mb-1 text-base font-semibold text-slate-900">Emitir certidão agora</h2>
            <p className="mb-3 text-sm text-slate-500">
              Emite direto no órgão e compara com a última versão apresentada do mesmo tipo e do mesmo documento.
            </p>
            <FormularioEmissao />
          </section>
        </div>

        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Histórico</h2>
          {documentos.length === 0 ? (
            <div className="cartao text-center text-sm text-slate-500">Nenhum documento verificado ainda.</div>
          ) : (
            <ul className="space-y-3">
              {documentos.map((d) => {
                const vencido = d.validaAte && d.validaAte < new Date();
                const leitura = d.leituraIa as Record<string, unknown> | null;
                return (
                  <li key={d.id} className="cartao">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="etiqueta bg-slate-100 text-slate-700">{ROTULO_TIPO[d.tipo] ?? d.tipo}</span>
                          <span className="etiqueta border border-slate-200 bg-white text-slate-600">
                            {d.origem === "EMITIDA" ? "emitido agora" : "apresentado"}
                          </span>
                          {d.resultado && (
                            <span className={`etiqueta ${COR_RESULTADO[d.resultado] ?? "bg-slate-100 text-slate-700"}`}>
                              {ROTULO_RESULTADO[d.resultado] ?? d.resultado}
                            </span>
                          )}
                          <span className="font-medium text-slate-900">{d.titulo}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {d.nomeArquivo ?? "sem arquivo"}
                          {d.documento && <> · {formatarDocumento(d.documento)}</>}
                          {d.orgaoEmissor && <> · {d.orgaoEmissor}</>}
                        </div>
                      </div>
                      <ExcluirBotao id={d.id} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      <span>Verificado em {dataCurta(d.criadoEm)}</span>
                      {d.validaAte && (
                        <span className={vencido ? "font-medium text-red-600" : ""}>
                          {vencido ? "venceu em" : "válido até"} {dataCurta(d.validaAte)}
                        </span>
                      )}
                    </div>

                    {d.hashSha256 && (
                      <div className="mt-2 rounded bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-500">
                        {d.hashSha256}
                      </div>
                    )}

                    {d.apontamento && (
                      <p className="mt-2 text-sm text-slate-700">
                        <strong>Apontamento:</strong> {d.apontamento}
                      </p>
                    )}

                    {d.divergencia && (
                      <div className="aviso-erro mt-3">
                        <strong className="block">Comparação com o apresentado</strong>
                        <span className="mt-1 block">{d.divergencia}</span>
                      </div>
                    )}

                    {leitura && !leitura.erro && (
                      <div className="mt-3 rounded-lg border-l-4 border-sky-400 bg-sky-50 p-3 text-sm text-slate-700">
                        {leitura.tipoIdentificado != null && (
                          <div>
                            <strong>Tipo identificado:</strong> {String(leitura.tipoIdentificado)}
                          </div>
                        )}
                        {leitura.dadosPrincipais != null && (
                          <div>
                            <strong>Dados principais:</strong> {String(leitura.dadosPrincipais)}
                          </div>
                        )}
                        {leitura.validadeEncontrada != null && (
                          <div>
                            <strong>Validade no documento:</strong> {String(leitura.validadeEncontrada)}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
