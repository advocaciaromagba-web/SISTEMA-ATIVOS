import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { FormularioPessoa } from "../formulario";
import { PAPEIS } from "@/lib/documentos/catalogo";

export const dynamic = "force-dynamic";

export default async function EditarPessoa({ params }: { params: { id: string } }) {
  const { organizacao } = await exigirSessao();

  const pessoa = await prisma.pessoa.findFirst({
    where: { id: params.id, organizacaoId: organizacao.id },
    include: {
      partes: { include: { operacao: { select: { id: true, codigo: true, titulo: true, fase: true } } } },
    },
  });

  if (!pessoa) notFound();

  const { partes, ...dados } = pessoa;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/painel/pessoas" className="text-sm text-slate-500 hover:underline">
          ← Partes
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{pessoa.nome}</h1>
      </div>

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
