import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoDiligencia } from "@/lib/diligencia/sessao";
import { formatarDocumento } from "@/lib/validacao";
import { dataCurta } from "@/lib/formato";
import { BotaoReauditar } from "./reauditar-botao";
import { LiberacaoPessoa } from "./liberacao";

export const dynamic = "force-dynamic";

const ROTULO_IDONEIDADE: Record<string, string> = {
  SEM_APONTAMENTO: "sem apontamentos",
  ATENCAO: "atenção",
  RESTRICAO: "restrição",
};
const COR_IDONEIDADE: Record<string, string> = {
  SEM_APONTAMENTO: "bg-emerald-100 text-emerald-800",
  ATENCAO: "bg-amber-100 text-amber-800",
  RESTRICAO: "bg-red-100 text-red-800",
};

type Apontamento = { titulo: string; detalhe: string };

export default async function DetalhePessoa({ params }: { params: { id: string } }) {
  const { usuario, conta } = await exigirSessaoDiligencia();

  const pessoa = await prisma.diligenciaPessoa.findFirst({
    where: { id: params.id, diligenciaContaId: conta.id },
    include: {
      auditorias: { orderBy: { criadoEm: "desc" }, take: 1 },
    },
  });
  if (!pessoa) notFound();

  const ultimaAuditoria = pessoa.auditorias[0] ?? null;
  const apontamentos = (ultimaAuditoria?.apontamentos as unknown as Apontamento[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/diligencia/painel/pessoas" className="text-sm text-slate-500 hover:underline">
          ← Pessoas
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{pessoa.nome}</h1>
        <p className="text-sm text-slate-500">{formatarDocumento(pessoa.documento)}</p>
      </div>

      {pessoa.situacaoCompliance ? (
        <div className={`aviso ${pessoa.situacaoCompliance === "RESTRICAO" ? "aviso-erro" : "aviso-info"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <strong>Diligência:</strong>
            <span className={`etiqueta ${COR_IDONEIDADE[pessoa.situacaoCompliance] ?? "bg-slate-100 text-slate-700"}`}>
              {ROTULO_IDONEIDADE[pessoa.situacaoCompliance] ?? pessoa.situacaoCompliance}
            </span>
            {pessoa.pontuacao != null && <span className="text-xs text-slate-500">pontuação {pessoa.pontuacao}/100</span>}
            {pessoa.complianceEm && (
              <span className="text-xs text-slate-500">auditado em {dataCurta(pessoa.complianceEm)}</span>
            )}
            <span className="ml-auto">
              <BotaoReauditar pessoaId={pessoa.id} />
            </span>
          </div>
          {ultimaAuditoria?.parecer && <p className="mt-2">{ultimaAuditoria.parecer}</p>}
          {apontamentos.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {apontamentos.map((a, i) => (
                <li key={i}>
                  <span className="font-medium">{a.titulo}</span> — {a.detalhe}
                </li>
              ))}
            </ul>
          )}
          <LiberacaoPessoa
            diligenciaPessoaId={pessoa.id}
            bloqueada={pessoa.bloqueada}
            ehDono={usuario.papel === "DONO"}
            liberacao={
              pessoa.liberadaEm
                ? {
                    justificativa: pessoa.justificativaLiberacao ?? "",
                    por: pessoa.liberadaPorNome,
                    em: pessoa.liberadaEm.toLocaleDateString("pt-BR"),
                  }
                : null
            }
          />
        </div>
      ) : (
        <div className="aviso-atencao flex items-center justify-between gap-3">
          <span>Ainda não auditada.</span>
          <BotaoReauditar pessoaId={pessoa.id} />
        </div>
      )}

      <section className="cartao max-w-md">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Dados</h2>
        <dl className="space-y-2.5 text-sm">
          <Linha rotulo="UF" valor={pessoa.uf} />
          <Linha rotulo="Nome da mãe" valor={pessoa.nomeMae} />
          <Linha
            rotulo="Data de nascimento"
            valor={pessoa.dataNascimento ? pessoa.dataNascimento.toLocaleDateString("pt-BR") : null}
          />
          <Linha rotulo="E-mail" valor={pessoa.emailContato} />
          <Linha rotulo="Telefone" valor={pessoa.telefone} />
        </dl>
      </section>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="text-right font-medium text-slate-900">{valor}</dd>
    </div>
  );
}
