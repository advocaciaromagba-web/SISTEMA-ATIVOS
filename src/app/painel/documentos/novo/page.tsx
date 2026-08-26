import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { CATALOGO_POR_CHAVE, PAPEIS, documentosOrdenados } from "@/lib/documentos/catalogo";
import { conferirRequisitos } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import { FormularioGeracao } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NovoDocumento({
  searchParams,
}: {
  searchParams: { operacao?: string; tipo?: string; licitante?: string };
}) {
  const { organizacao, usuario } = await exigirSessao();

  const operacoes = await prisma.operacao.findMany({
    where: { organizacaoId: organizacao.id, fase: { notIn: ["CANCELADA"] } },
    select: { id: true, codigo: true, titulo: true },
    orderBy: { criadoEm: "desc" },
  });

  const operacaoId = searchParams.operacao;
  const licitanteId = searchParams.licitante;
  const tipo = searchParams.tipo;

  // ---- passo 1: escolher o tipo ----
  if (!tipo || !CATALOGO_POR_CHAVE[tipo]) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Gerar documento</h1>
          <p className="text-sm text-slate-500">Escolha o documento. Depois você confere os dados antes de gerar.</p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {documentosOrdenados().map((d) => (
            <li key={d.chave}>
              <Link
                href={`/painel/documentos/novo?tipo=${d.chave}${operacaoId ? `&operacao=${operacaoId}` : ""}`}
                className="block h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400"
              >
                <div className="font-medium text-slate-900">{d.nome}</div>
                <p className="mt-1 text-sm text-slate-500">{d.paraQueServe}</p>
                {d.exigeLicitante ? (
                  <p className="mt-2 text-xs text-slate-400">Exige: empresa licitante</p>
                ) : (
                  d.papeisObrigatorios.length > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      Exige: {d.papeisObrigatorios.map((p) => PAPEIS[p].replace(/ \(.*\)$/, "")).join(", ")}
                    </p>
                  )
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---- passo 2: preencher e conferir ----
  const definicao = CATALOGO_POR_CHAVE[tipo];

  const operacao = definicao.exigeLicitante
    ? null
    : operacaoId
      ? await prisma.operacao.findFirst({
          where: { id: operacaoId, organizacaoId: organizacao.id },
          include: { partes: { include: { pessoa: true } } },
        })
      : null;

  // Declarações de licitação pedem uma empresa avulsa do cadastro, em vez de
  // uma operação com partes — a lista carrega só quando o documento exige.
  const licitantes = definicao.exigeLicitante
    ? await prisma.pessoa.findMany({
        where: { organizacaoId: organizacao.id, tipo: "PJ" },
        select: { id: true, nome: true, documento: true },
        orderBy: { nome: "asc" },
      })
    : [];

  const licitante = definicao.exigeLicitante && licitanteId
    ? await prisma.pessoa.findFirst({ where: { id: licitanteId, organizacaoId: organizacao.id } })
    : null;

  // Confere as partes e a qualificação delas. As pendências de campo do
  // formulário ficam de fora: o operador ainda vai preenchê-los agora.
  const contexto: ContextoDocumento = { organizacao, operacao, usuario, campos: {}, agora: new Date(), licitante };
  const pendencias = conferirRequisitos(tipo, contexto).filter(
    (p) => p.motivo !== "Campo obrigatório não preenchido."
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/painel/documentos/novo${operacaoId ? `?operacao=${operacaoId}` : ""}`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Outros documentos
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{definicao.nome}</h1>
        <p className="text-sm text-slate-500">{definicao.paraQueServe}</p>
      </div>

      {definicao.alerta && (
        <div className="aviso-atencao">
          <strong className="block">Atenção</strong>
          <span className="mt-1 block">{definicao.alerta}</span>
        </div>
      )}

      {definicao.exigeFormaEspecial && (
        <div className="aviso-info">
          <strong className="block">Forma exigida</strong>
          <span className="mt-1 block">{definicao.exigeFormaEspecial}</span>
        </div>
      )}

      {pendencias.length > 0 && (
        <div className="aviso-erro">
          <strong className="block">Faltam dados — o documento sai com lacunas marcadas</strong>
          <ul className="mt-2 list-inside list-disc space-y-0.5">
            {pendencias.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.campo}:</span> {p.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormularioGeracao
        tipo={tipo}
        campos={definicao.campos ?? []}
        operacoes={operacoes}
        operacaoSelecionada={operacaoId ?? ""}
        exigeLicitante={definicao.exigeLicitante ?? false}
        licitantes={licitantes}
        licitanteSelecionado={licitanteId ?? ""}
        exigeTestemunhas={definicao.exigeTestemunhas ?? false}
        baseLegal={definicao.baseLegal}
      />
    </div>
  );
}
