import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessaoCompliance } from "@/lib/compliance/sessao";
import { formatarDocumento } from "@/lib/validacao";
import { dataCurta } from "@/lib/formato";
import { FormularioCertidao } from "./certidao-form";
import { FormularioRelatorio } from "./relatorio-form";
import { BotaoReauditar } from "./reauditar-botao";
import { LiberacaoEmpresa } from "./liberacao";

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
const ROTULO_CERTIDAO: Record<string, string> = {
  CERTIDAO_TRIBUTOS_FEDERAIS: "Certidão de tributos federais",
  CERTIDAO_FGTS: "Certidão do FGTS",
  CNDT: "CNDT",
  CERTIDAO_FALENCIA_CONCORDATA: "Certidão de falência e concordata",
  OUTRO: "Outro",
};

type Apontamento = { titulo: string; detalhe: string };

export default async function DetalheEmpresa({ params }: { params: { id: string } }) {
  const { usuario, conta } = await exigirSessaoCompliance();

  const empresa = await prisma.complianceEmpresa.findFirst({
    where: { id: params.id, complianceContaId: conta.id },
    include: {
      certidoes: { orderBy: { criadoEm: "desc" } },
      documentos: { orderBy: { criadoEm: "desc" } },
      auditorias: { orderBy: { criadoEm: "desc" }, take: 1 },
    },
  });
  if (!empresa) notFound();

  const ultimaAuditoria = empresa.auditorias[0] ?? null;
  const apontamentos = (ultimaAuditoria?.apontamentos as unknown as Apontamento[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/compliance/painel/empresas" className="text-sm text-slate-500 hover:underline">
          ← Empresas
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{empresa.nome}</h1>
        <p className="text-sm text-slate-500">{formatarDocumento(empresa.documento)}</p>
      </div>

      {/* ---- resultado da auditoria ---- */}
      {empresa.situacaoCompliance ? (
        <div className={`aviso ${empresa.situacaoCompliance === "RESTRICAO" ? "aviso-erro" : "aviso-info"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <strong>Compliance:</strong>
            <span className={`etiqueta ${COR_IDONEIDADE[empresa.situacaoCompliance] ?? "bg-slate-100 text-slate-700"}`}>
              {ROTULO_IDONEIDADE[empresa.situacaoCompliance] ?? empresa.situacaoCompliance}
            </span>
            {empresa.pontuacao != null && <span className="text-xs text-slate-500">pontuação {empresa.pontuacao}/100</span>}
            {empresa.complianceEm && (
              <span className="text-xs text-slate-500">auditado em {dataCurta(empresa.complianceEm)}</span>
            )}
            <span className="ml-auto">
              <BotaoReauditar empresaId={empresa.id} />
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
          <LiberacaoEmpresa
            complianceEmpresaId={empresa.id}
            bloqueada={empresa.bloqueada}
            ehDono={usuario.papel === "DONO"}
            liberacao={
              empresa.liberadaEm
                ? {
                    justificativa: empresa.justificativaLiberacao ?? "",
                    por: empresa.liberadaPorNome,
                    em: empresa.liberadaEm.toLocaleDateString("pt-BR"),
                  }
                : null
            }
          />
        </div>
      ) : (
        <div className="aviso-atencao flex items-center justify-between gap-3">
          <span>Ainda não auditada.</span>
          <BotaoReauditar empresaId={empresa.id} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- certidões ---- */}
        <section className="cartao">
          <h2 className="mb-1 text-base font-semibold">Certidões</h2>
          <p className="mb-4 text-sm text-slate-500">Anexe as certidões apresentadas, com o prazo de validade.</p>

          {empresa.certidoes.length > 0 && (
            <ul className="mb-2 divide-y divide-slate-100 text-sm">
              {empresa.certidoes.map((c) => {
                const vencida = c.validaAte && c.validaAte < new Date();
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <span className="etiqueta bg-slate-100 text-slate-700">{ROTULO_CERTIDAO[c.tipo] ?? c.tipo}</span>
                      <span className="ml-2 text-slate-600">{c.nomeArquivo}</span>
                    </div>
                    <span className={`text-xs ${vencida ? "font-medium text-red-600" : "text-slate-400"}`}>
                      {c.validaAte ? `${vencida ? "venceu em" : "válida até"} ${dataCurta(c.validaAte)}` : "sem prazo"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <FormularioCertidao complianceEmpresaId={empresa.id} />
        </section>

        {/* ---- relatório assinado ---- */}
        <section className="cartao">
          <h2 className="mb-1 text-base font-semibold">Relatório de compliance</h2>
          <p className="mb-4 text-sm text-slate-500">
            Consolida o resultado da auditoria num documento assinado, com o que não foi possível verificar no
            mesmo destaque do resto.
          </p>

          {empresa.documentos.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100 text-sm">
              {empresa.documentos.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-slate-700">{d.titulo}</span>
                  <span className="text-xs text-slate-400">{dataCurta(d.criadoEm)}</span>
                </li>
              ))}
            </ul>
          )}

          <FormularioRelatorio complianceEmpresaId={empresa.id} nomeUsuario={usuario.nome} />
        </section>
      </div>
    </div>
  );
}
