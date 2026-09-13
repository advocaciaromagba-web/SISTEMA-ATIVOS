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
import { EmitirCertidoes, type CertidaoDisponivel } from "./emitir-certidoes";
import { CATALOGO_CERTIDOES } from "@/lib/auditoria/certidoes";
import { infosimplesConfigurado, temEmissaoAutomatica } from "@/lib/auditoria/fontes/infosimples";

export const dynamic = "force-dynamic";

/**
 * Certidões que fazem sentido para uma empresa, na ordem em que uma análise de
 * compliance costuma precisar delas. As de precatório e de processo de origem
 * ficam de fora: são da Gestão de Ativos, não desta solução.
 */
const CERTIDOES_DA_EMPRESA = [
  "CNDT",
  "CND_FEDERAL",
  "DIVIDA_ATIVA_ESTADUAL",
  "PROTESTO",
  "FALENCIA_RECUPERACAO",
  "DISTRIBUICAO_CIVEL",
  "IMPROBIDADE_CNJ",
  "CADIN_FEDERAL",
];

const ROTULO_RESULTADO: Record<string, { texto: string; cor: string }> = {
  NADA_CONSTA: { texto: "nada consta", cor: "bg-emerald-100 text-emerald-800" },
  CONSTA: { texto: "consta", cor: "bg-red-100 text-red-800" },
  PENDENTE: { texto: "não conferida", cor: "bg-slate-100 text-slate-600" },
};

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
/** Nomes dos tipos antigos, anexados antes de o catálogo passar a valer aqui. */
const ROTULO_CERTIDAO_ANTIGA: Record<string, string> = {
  CERTIDAO_TRIBUTOS_FEDERAIS: "Certidão de tributos federais",
  CERTIDAO_FGTS: "Certidão do FGTS",
  CERTIDAO_FALENCIA_CONCORDATA: "Certidão de falência e concordata",
  OUTRO: "Outro",
};

function nomeDaCertidao(tipo: string): string {
  return CATALOGO_CERTIDOES.find((c) => c.chave === tipo)?.nome ?? ROTULO_CERTIDAO_ANTIGA[tipo] ?? tipo;
}

type Apontamento = { titulo: string; detalhe: string };

export default async function DetalheEmpresa(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

  // A cobertura da emissão automática varia por certidão e por estado — quem
  // sabe disso é o mapa de serviços, no servidor, não a tela.
  const certidoesDisponiveis: CertidaoDisponivel[] = CERTIDOES_DA_EMPRESA.flatMap((chave) => {
    const definicao = CATALOGO_CERTIDOES.find((c) => c.chave === chave);
    if (!definicao) return [];
    return [
      {
        chave,
        nome: definicao.nome,
        orgao: definicao.orgao,
        automatica: temEmissaoAutomatica(chave, empresa.enderecoUf),
      },
    ];
  });

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
          <p className="mb-4 text-sm text-slate-500">
            Emita direto na fonte, ou anexe a que a empresa apresentou.
          </p>

          {empresa.certidoes.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100 text-sm">
              {empresa.certidoes.map((c) => {
                const vencida = c.validaAte && c.validaAte < new Date();
                const resultado = ROTULO_RESULTADO[c.resultado] ?? ROTULO_RESULTADO.PENDENTE;
                return (
                  <li key={c.id} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="etiqueta bg-slate-100 text-slate-700">{nomeDaCertidao(c.tipo)}</span>
                        <span className={`etiqueta ml-2 ${resultado.cor}`}>{resultado.texto}</span>
                        {c.emissaoAutomatica && <span className="ml-2 text-xs text-slate-400">emitida na fonte</span>}
                      </div>
                      <span className={`shrink-0 text-xs ${vencida ? "font-medium text-red-600" : "text-slate-400"}`}>
                        {c.validaAte
                          ? `${vencida ? "venceu em" : "válida até"} ${dataCurta(c.validaAte)}`
                          : "sem prazo"}
                      </span>
                    </div>
                    {c.apontamento && <p className="mt-1 text-xs text-red-700">{c.apontamento}</p>}
                  </li>
                );
              })}
            </ul>
          )}

          <EmitirCertidoes
            complianceEmpresaId={empresa.id}
            temContrato={infosimplesConfigurado()}
            certidoes={certidoesDisponiveis}
          />

          <FormularioCertidao
            complianceEmpresaId={empresa.id}
            documento={empresa.documento}
            uf={empresa.enderecoUf}
          />
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
