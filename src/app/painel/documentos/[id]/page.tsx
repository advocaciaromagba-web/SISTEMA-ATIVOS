import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { CATALOGO_POR_CHAVE } from "@/lib/documentos/catalogo";
import { dataHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

type DadosGuardados = {
  campos?: Record<string, string>;
  pendencias?: Array<{ campo: string; motivo: string }>;
  partes?: Array<{ papel: string; nome: string; documento: string | null; comissaoPercentual: number | null }>;
};

export default async function DetalheDocumento({ params }: { params: { id: string } }) {
  const { organizacao } = await exigirSessao();

  const documento = await prisma.documento.findFirst({
    where: { id: params.id, organizacaoId: organizacao.id },
    include: {
      operacao: { select: { id: true, codigo: true, titulo: true } },
      criadoPor: { select: { nome: true } },
    },
  });

  if (!documento) notFound();

  const definicao = CATALOGO_POR_CHAVE[documento.tipo];
  const dados = (documento.dados ?? {}) as DadosGuardados;
  const pendencias = dados.pendencias ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/painel/documentos" className="text-sm text-slate-500 hover:underline">
          ← Documentos
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{documento.titulo}</h1>
        <p className="text-sm text-slate-500">
          {definicao?.nome ?? documento.tipo} · versão {documento.versao}
          {documento.operacao && (
            <>
              {" · "}
              <Link href={`/painel/operacoes/${documento.operacao.id}`} className="hover:underline">
                {documento.operacao.codigo}
              </Link>
            </>
          )}
        </p>
      </div>

      {pendencias.length > 0 && (
        <div className="aviso-atencao">
          <strong className="block">Este documento saiu com lacunas</strong>
          <p className="mt-1">
            Os pontos abaixo aparecem marcados entre colchetes no arquivo. Complete o cadastro e gere uma nova versão
            antes de mandar assinar.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-0.5">
            {pendencias.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.campo}:</span> {p.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <a href={`/api/documentos/${documento.id}/baixar`} className="botao-principal">
          Baixar Word (.docx)
        </a>
        {documento.operacao && (
          <Link
            href={`/painel/documentos/novo?operacao=${documento.operacao.id}&tipo=${documento.tipo}`}
            className="botao-secundario"
          >
            Gerar nova versão
          </Link>
        )}
      </div>

      <section className="cartao">
        <h2 className="mb-3 text-base font-semibold">Ficha do documento</h2>
        <dl className="space-y-2.5 text-sm">
          <Linha rotulo="Gerado por" valor={documento.criadoPor?.nome} />
          <Linha rotulo="Data" valor={dataHora(documento.criadoEm)} />
          <Linha rotulo="Arquivo" valor={documento.arquivoNome} />
          <Linha
            rotulo="Código de conferência"
            valor={documento.hashSha256 ? documento.hashSha256.slice(0, 8).toUpperCase() : null}
          />
        </dl>

        {documento.hashSha256 && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <div className="text-xs font-medium text-slate-600">Impressão digital do arquivo (SHA-256)</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-500">{documento.hashSha256}</div>
            <p className="ajuda">
              Serve de prova de integridade: se alguém alterar um único caractere do arquivo, este código muda.
            </p>
          </div>
        )}
      </section>

      {dados.partes && dados.partes.length > 0 && (
        <section className="cartao">
          <h2 className="mb-1 text-base font-semibold">Partes no momento da geração</h2>
          <p className="mb-3 text-sm text-slate-500">
            Retrato do cadastro naquela data. Se a parte mudou depois, este registro continua mostrando o que foi
            impresso no documento.
          </p>
          <ul className="divide-y divide-slate-100 text-sm">
            {dados.partes.map((p, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span>
                  <span className="font-medium">{p.nome}</span>
                  <span className="ml-2 text-xs text-slate-500">{p.documento ?? "sem documento"}</span>
                </span>
                <span className="text-slate-500">
                  {p.papel}
                  {p.comissaoPercentual != null ? ` · ${p.comissaoPercentual}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dados.campos && Object.keys(dados.campos).length > 0 && (
        <section className="cartao">
          <h2 className="mb-3 text-base font-semibold">Condições informadas</h2>
          <dl className="space-y-2 text-sm">
            {(definicao?.campos ?? []).map((c) => {
              const valor = dados.campos?.[c.chave];
              if (!valor) return null;
              return (
                <div key={c.chave} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-slate-500">{c.rotulo}</dt>
                  <dd className="text-right text-slate-900">{valor}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
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
