import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { FormularioPessoa } from "../formulario";
import { PAPEIS } from "@/lib/documentos/catalogo";
import { Dossie } from "@/components/dossie";
import { auditoriaVencida } from "@/lib/auditoria/executar";
import type { Apontamento, Capacidade, Idoneidade } from "@/lib/auditoria/tipos";
import { dataHora, moeda } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function EditarPessoa({ params }: { params: { id: string } }) {
  const { organizacao, usuario } = await exigirSessao();

  const pessoa = await prisma.pessoa.findFirst({
    where: { id: params.id, organizacaoId: organizacao.id },
    include: {
      partes: { include: { operacao: { select: { id: true, codigo: true, titulo: true, fase: true } } } },
      auditorias: {
        orderBy: { criadoEm: "desc" },
        take: 1,
        include: {
          operacao: { select: { codigo: true, titulo: true } },
          consultas: { select: { fonte: true, status: true, resumo: true } },
        },
      },
    },
  });

  if (!pessoa) notFound();

  const { partes, auditorias, ...dados } = pessoa;
  const ultima = auditorias[0] ?? null;

  const liberadaPor = pessoa.liberadaPorId
    ? await prisma.usuario.findUnique({ where: { id: pessoa.liberadaPorId }, select: { nome: true } })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/painel/pessoas" className="text-sm text-slate-500 hover:underline">
          ← Partes
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{pessoa.nome}</h1>
          {pessoa.bloqueada && <span className="etiqueta bg-red-100 text-red-800">bloqueada</span>}
        </div>
      </div>

      <Dossie
        pessoaId={pessoa.id}
        pessoaNome={pessoa.nome}
        bloqueada={pessoa.bloqueada}
        ehDono={usuario.papel === "DONO"}
        liberacao={
          pessoa.justificativaLiberacao && pessoa.liberadaEm
            ? {
                justificativa: pessoa.justificativaLiberacao,
                por: liberadaPor?.nome ?? null,
                em: dataHora(pessoa.liberadaEm),
              }
            : null
        }
        auditoria={
          ultima
            ? {
                idoneidade: ultima.idoneidade as Idoneidade | null,
                capacidade: ultima.capacidade as Capacidade | null,
                pontuacao: ultima.pontuacao,
                parecer: ultima.parecer,
                apontamentos: (ultima.apontamentos ?? []) as unknown as Apontamento[],
                criadoEm: dataHora(ultima.criadoEm),
                vencida: auditoriaVencida(pessoa.complianceEm),
                valorReferencia: ultima.valorReferencia != null ? moeda(Number(ultima.valorReferencia)) : null,
                operacao: ultima.operacao ? `${ultima.operacao.codigo} — ${ultima.operacao.titulo}` : null,
                fontes: ultima.consultas.map((c) => ({
                  fonte: c.fonte,
                  status: c.status,
                  resumo: c.resumo,
                })),
              }
            : null
        }
        operacoes={partes.map((p) => ({
          id: p.operacao.id,
          codigo: p.operacao.codigo,
          titulo: p.operacao.titulo,
        }))}
      />

      {partes.length > 0 && (
        <section className="cartao">
          <h2 className="mb-3 text-base font-semibold">Operações em que participa</h2>
          <ul className="space-y-2 text-sm">
            {partes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <Link href={`/painel/operacoes/${p.operacao.id}`} className="text-slate-900 hover:underline">
                  <span className="font-medium">{p.operacao.codigo}</span> · {p.operacao.titulo}
                </Link>
                <span className="etiqueta bg-slate-100 text-slate-600">
                  {PAPEIS[p.papel as keyof typeof PAPEIS]?.replace(/ \(.*\)$/, "") ?? p.papel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FormularioPessoa pessoa={dados} />
    </div>
  );
}
