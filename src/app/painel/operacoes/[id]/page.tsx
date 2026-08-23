import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeEditar } from "@/lib/sessao";
import { FASES, TIPOS_ATIVO, documentosOrdenados } from "@/lib/documentos/catalogo";
import { moeda, percentualComExtenso, dataCurta } from "@/lib/formato";
import { formatarDocumento, formatarNumeroProcessoCnj } from "@/lib/validacao";
import { Partes, type ParteResumo, type PessoaResumo } from "./partes";

export const dynamic = "force-dynamic";

export default async function DetalheOperacao({ params }: { params: { id: string } }) {
  const { organizacao, usuario } = await exigirSessao();

  const operacao = await prisma.operacao.findFirst({
    where: { id: params.id, organizacaoId: organizacao.id },
    include: {
      partes: { include: { pessoa: true }, orderBy: { criadoEm: "asc" } },
      documentos: { orderBy: { criadoEm: "desc" }, take: 20 },
    },
  });

  if (!operacao) notFound();

  const pessoas = await prisma.pessoa.findMany({
    where: { organizacaoId: organizacao.id },
    select: { id: true, nome: true, documento: true, tipo: true },
    orderBy: { nome: "asc" },
  });

  const editavel = podeEditar(usuario);

  const partesSerializadas: ParteResumo[] = operacao.partes.map((p) => ({
    id: p.id,
    papel: p.papel,
    comissaoPercentual: p.comissaoPercentual != null ? String(Number(p.comissaoPercentual)) : null,
    ordemCadeia: p.ordemCadeia,
    pessoa: {
      id: p.pessoa.id,
      nome: p.pessoa.nome,
      documento: formatarDocumento(p.pessoa.documento) || null,
      tipo: p.pessoa.tipo,
    },
  }));

  const pessoasSerializadas: PessoaResumo[] = pessoas.map((p) => ({
    id: p.id,
    nome: p.nome,
    documento: formatarDocumento(p.documento) || null,
    tipo: p.tipo,
  }));

  // Papéis já presentes: usado para dizer quais documentos estão prontos para gerar.
  const papeisPresentes = new Set(operacao.partes.map((p) => p.papel));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/painel/operacoes" className="text-sm text-slate-500 hover:underline">
          ← Operações
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{operacao.titulo}</h1>
          <span className="font-mono text-xs text-slate-500">{operacao.codigo}</span>
          <span className="etiqueta bg-slate-100 text-slate-700">{FASES[operacao.fase] ?? operacao.fase}</span>
          {operacao.confidencial && <span className="etiqueta bg-amber-100 text-amber-800">confidencial</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Partes
            operacaoId={operacao.id}
            partes={partesSerializadas}
            pessoas={pessoasSerializadas}
            podeEditar={editavel}
          />

          <section className="cartao">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Documentos</h2>
              <Link href={`/painel/documentos/novo?operacao=${operacao.id}`} className="botao-secundario">
                Gerar documento
              </Link>
            </div>

            {operacao.documentos.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum documento gerado para esta operação.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {operacao.documentos.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <Link href={`/painel/documentos/${d.id}`} className="font-medium hover:underline">
                        {d.titulo}
                      </Link>
                      <div className="text-xs text-slate-500">
                        versão {d.versao} · {dataCurta(d.criadoEm)}
                      </div>
                    </div>
                    <EstadoDocumento status={d.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="cartao">
            <h2 className="mb-1 text-base font-semibold">Documentos disponíveis</h2>
            <p className="mb-4 text-sm text-slate-500">
              O sinal indica se as partes necessárias já estão vinculadas a esta operação.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {documentosOrdenados().map((tipo) => {
                const pronto = tipo.papeisObrigatorios.every((p) => papeisPresentes.has(p));
                return (
                  <li key={tipo.chave}>
                    <Link
                      href={`/painel/documentos/novo?operacao=${operacao.id}&tipo=${tipo.chave}`}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 transition hover:border-slate-400"
                    >
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${pronto ? "bg-emerald-500" : "bg-slate-300"}`}
                        title={pronto ? "Partes necessárias já vinculadas" : "Faltam partes"}
                      />
                      <span>
                        <span className="text-sm font-medium text-slate-900">{tipo.nome}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{tipo.paraQueServe}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="cartao">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Dados do ativo</h2>
              {editavel && (
                <Link href={`/painel/operacoes/${operacao.id}/editar`} className="text-sm text-slate-500 hover:underline">
                  editar
                </Link>
              )}
            </div>

            <dl className="space-y-2.5 text-sm">
              <Linha rotulo="Tipo" valor={TIPOS_ATIVO[operacao.tipoAtivo] ?? operacao.tipoAtivo} />
              <Linha
                rotulo="Valor de face"
                valor={operacao.valorFace != null ? moeda(Number(operacao.valorFace), operacao.moeda) : null}
              />
              <Linha
                rotulo="Deságio"
                valor={
                  operacao.desagioPercentual != null ? percentualComExtenso(Number(operacao.desagioPercentual)) : null
                }
              />
              <Linha
                rotulo="Valor negociado"
                valor={operacao.valorNegociado != null ? moeda(Number(operacao.valorNegociado), operacao.moeda) : null}
              />
              <Linha rotulo="Tribunal" valor={operacao.tribunal} />
              <Linha rotulo="Precatório" valor={operacao.numeroPrecatorio} />
              <Linha
                rotulo="Processo"
                valor={operacao.numeroProcesso ? formatarNumeroProcessoCnj(operacao.numeroProcesso) : null}
              />
              <Linha rotulo="Devedor" valor={operacao.enteDevedor} />
              <Linha
                rotulo="Natureza"
                valor={
                  operacao.naturezaCredito === "ALIMENTAR"
                    ? "Alimentar"
                    : operacao.naturezaCredito === "COMUM"
                      ? "Comum"
                      : null
                }
              />
              <Linha rotulo="Tributo" valor={operacao.tributo} />
              <Linha rotulo="Produto" valor={operacao.produto} />
              <Linha rotulo="Incoterm" valor={operacao.incoterm} />
            </dl>
          </section>

          {operacao.tipoAtivo === "PRECATORIO" && (
            <div className="aviso-atencao">
              <strong className="block">Antes de fechar</strong>
              <span className="mt-1 block">
                A cessão de precatório só produz efeitos depois de comunicada por petição ao tribunal de origem e à
                entidade devedora (CF, art. 100, § 14). E a preferência por idade, doença ou natureza alimentar não
                passa para o comprador (§ 13).
              </span>
            </div>
          )}

          {operacao.descricao && (
            <section className="cartao">
              <h2 className="mb-2 text-base font-semibold">Descrição</h2>
              <p className="whitespace-pre-line text-sm text-slate-600">{operacao.descricao}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{rotulo}</dt>
      <dd className="text-right font-medium text-slate-900">{valor}</dd>
    </div>
  );
}

function EstadoDocumento({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    RASCUNHO: "bg-slate-100 text-slate-600",
    GERADO: "bg-sky-100 text-sky-800",
    ENVIADO_ASSINATURA: "bg-amber-100 text-amber-800",
    ASSINADO: "bg-emerald-100 text-emerald-800",
    CANCELADO: "bg-red-100 text-red-800",
  };
  const rotulos: Record<string, string> = {
    RASCUNHO: "rascunho",
    GERADO: "gerado",
    ENVIADO_ASSINATURA: "aguardando assinatura",
    ASSINADO: "assinado",
    CANCELADO: "cancelado",
  };
  return <span className={`etiqueta ${estilos[status] ?? "bg-slate-100"}`}>{rotulos[status] ?? status}</span>;
}
