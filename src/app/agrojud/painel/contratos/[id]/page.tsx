import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessaoAgro } from "@/lib/agro/sessao";
import { prisma } from "@/lib/prisma";
import { moeda } from "@/lib/formato";
import type { ResultadoMp1376 } from "@/lib/agro/mp1376";
import type { ResultadoAlongamento } from "@/lib/agro/alongamento";
import { BotaoExcluir } from "./botao-excluir";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const ROTULO_MODALIDADE: Record<string, string> = {
  GERAL: "Modalidade geral (2+ safras, ≥30%)",
  FAVORECIDA: "Modalidade favorecida (3+ safras, só clima, ≥40%)",
};

const ROTULO_GRAVIDADE: Record<string, string> = {
  CRITICO: "Crítico",
  ATENCAO: "Atenção",
  INFORMATIVO: "Informativo",
};

const COR_GRAVIDADE: Record<string, string> = {
  CRITICO: "border-red-300 bg-red-50",
  ATENCAO: "border-amber-300 bg-amber-50",
  INFORMATIVO: "border-slate-200 bg-slate-50",
};

function Selo({ valor }: { valor: boolean | "INDETERMINADO" }) {
  if (valor === true) return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Atende</span>;
  if (valor === false) return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Não atende</span>;
  return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Falta dado</span>;
}

export default async function DetalheContratoAgro(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { conta } = await exigirSessaoAgro();

  const contrato = await prisma.agroContrato.findFirst({ where: { id: params.id, agroContaId: conta.id } });
  if (!contrato) notFound();

  const resultado = contrato.resultadoMp1376 as ResultadoMp1376 | null;
  const resultadoAlongamento = contrato.resultadoAlongamento as ResultadoAlongamento | null;
  const avalistas = (contrato.avalistas as Array<{ nome?: string; documento?: string; patrimonioDescrito?: string }> | null) ?? [];
  const coberturas = (contrato.coberturas as string[] | null) ?? [];
  const riscos = (contrato.riscosIdentificados as string[] | null) ?? [];
  const tiposGarantia = (contrato.tiposGarantia as string[] | null) ?? [];
  const eventosClimaticos = (contrato.eventosClimaticos as string[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/agrojud/painel/contratos" className="text-sm text-slate-500 hover:underline">
            ← Voltar
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">{contrato.titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {contrato.mutuarioNome ?? "Mutuário não informado"} · {contrato.instituicaoFinanceira ?? "instituição não informada"}
          </p>
        </div>
        <BotaoExcluir id={contrato.id} titulo={contrato.titulo} />
      </div>

      {resultado && (
        <div className="cartao space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Enquadramento na MP 1.376/2026</h2>
            <Selo valor={resultado.enquadraNaMP1376} />
          </div>

          {resultado.modalidade && (
            <p className="text-sm text-slate-700">
              <strong>{ROTULO_MODALIDADE[resultado.modalidade]}</strong>
            </p>
          )}

          {resultado.condicoes && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Limite de crédito</div>
                <div className="font-semibold text-slate-900">{moeda(resultado.condicoes.limiteCredito)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Taxa de juros</div>
                <div className="font-semibold text-slate-900">{resultado.condicoes.taxaJurosAnual}% a.a.</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Prazo de reembolso</div>
                <div className="font-semibold text-slate-900">{resultado.condicoes.prazoReembolsoAnos} anos</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Carência</div>
                <div className="font-semibold text-slate-900">{resultado.condicoes.prazoCarenciaAnos} anos</div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist, artigo por artigo</h3>
            <ul className="mt-2 space-y-3">
              {resultado.checklist.map((item, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{item.requisito}</div>
                      <div className="mt-0.5 text-xs font-medium text-slate-500">{item.artigo}</div>
                    </div>
                    <Selo valor={item.atende} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.observacao}</p>
                </li>
              ))}
            </ul>
          </div>

          {resultado.requisitosFaltantes.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              <div className="font-semibold">O que falta para concluir o enquadramento:</div>
              <ul className="mt-1 list-disc pl-5">
                {resultado.requisitosFaltantes.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Prazo para contratação da linha: até {resultado.prazoContratacaoLimite} (120 dias da publicação, Art. 1º, § 4º, IV).
            <br />
            Fonte: {resultado.fonte}. Consultado em {new Date(resultado.dataConsulta).toLocaleString("pt-BR")}.
          </p>
        </div>
      )}

      {resultadoAlongamento && (
        <div className="cartao space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Alongamento da dívida (regime geral)</h2>
            <div className="flex gap-2">
              <a href={`/api/agro/contratos/${contrato.id}/requerimento`} className="botao-secundario py-1.5 text-xs">
                Baixar requerimento administrativo
              </a>
              <a href={`/api/agro/contratos/${contrato.id}/peticao`} className="botao-principal py-1.5 text-xs">
                Baixar minuta de petição inicial
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              Regime: {resultadoAlongamento.regimeAplicavel === "ANTERIOR_5314" ? "anterior à Res. CMN 5.314/2026" : resultadoAlongamento.regimeAplicavel === "POSTERIOR_5314" ? "posterior à Res. CMN 5.314/2026" : "indeterminado"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              Força da tese: {resultadoAlongamento.forcaDaTese === "FORTE" ? "forte" : resultadoAlongamento.forcaDaTese === "CONTROVERTIDA" ? "controvertida" : "indeterminada"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              Caminho recomendado: {resultadoAlongamento.caminhoRecomendado === "ADMINISTRATIVO" ? "administrativo" : resultadoAlongamento.caminhoRecomendado === "JUDICIAL" ? "judicial" : "administrativo e judicial"}
            </span>
          </div>

          {resultadoAlongamento.alertas.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alertas</h3>
              <ul className="mt-2 space-y-2">
                {resultadoAlongamento.alertas.map((a, i) => (
                  <li key={i} className={`rounded-lg border p-3 ${COR_GRAVIDADE[a.gravidade]}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-900">{a.titulo}</div>
                      <span className="text-xs font-semibold uppercase text-slate-500">{ROTULO_GRAVIDADE[a.gravidade]}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{a.texto}</p>
                    <p className="mt-1 text-xs text-slate-400">Fonte: {a.fonte}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultadoAlongamento.orientacoes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Orientações</h3>
              <ul className="mt-2 space-y-2">
                {resultadoAlongamento.orientacoes.map((o, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-900">{o.titulo}</div>
                    <p className="mt-1 text-sm text-slate-600">{o.texto}</p>
                    <p className="mt-1 text-xs text-slate-400">Fonte: {o.fonte}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documentos a reunir</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
              {resultadoAlongamento.documentosNecessarios.map((doc, i) => (
                <li key={i}>{doc}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="cartao space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Enquadramento como crédito rural</h2>
        <p className="text-sm text-slate-600">{contrato.justificativaEnquadramento ?? "Sem detalhamento."}</p>
        <p className="text-xs text-slate-400">Fonte: Lei nº 4.829/65, art. 3º; Manual de Crédito Rural (Bacen).</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="cartao space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Taxas</h2>
          <p className="text-sm text-slate-600">Taxa contratual: {contrato.taxaJurosContratual ? `${contrato.taxaJurosContratual}% a.a.` : "não informada"}</p>
          <p className="text-sm text-slate-600">Indexador: {contrato.indexador ?? "não informado"}</p>
          <p className="text-sm text-slate-600">Encargos moratórios: {contrato.encargosMoratorios ?? "não informado"}</p>
        </div>

        <div className="cartao space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Garantias</h2>
          <p className="text-sm text-slate-600">Tipos: {tiposGarantia.length ? tiposGarantia.join(", ") : "não informado"}</p>
          <p className="text-sm text-slate-600">Valor: {contrato.valorGarantia ? moeda(Number(contrato.valorGarantia)) : "não informado"}</p>
          <p className="text-sm text-slate-600">{contrato.garantiasDescricao ?? ""}</p>
        </div>

        <div className="cartao space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Avalistas</h2>
          {avalistas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum avalista informado.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-600">
              {avalistas.map((a, i) => (
                <li key={i}>
                  {a.nome} {a.documento ? `(${a.documento})` : ""} {a.patrimonioDescrito ? `— ${a.patrimonioDescrito}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cartao space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Seguro rural</h2>
          <p className="text-sm text-slate-600">{contrato.temSeguroRural ? "Contrato possui seguro rural." : "Sem seguro rural identificado."}</p>
          {contrato.temSeguroRural && (
            <>
              <p className="text-sm text-slate-600">Seguradora: {contrato.seguradora ?? "não informada"}</p>
              <p className="text-sm text-slate-600">Apólice: {contrato.apoliceNumero ?? "não informada"}</p>
              <p className="text-sm text-slate-600">Coberturas: {coberturas.length ? coberturas.join(", ") : "não informadas"}</p>
              <p className="text-sm text-slate-600">Proagro: {contrato.temProagro ? "sim" : "não"}</p>
            </>
          )}
        </div>
      </div>

      {(riscos.length > 0 || contrato.desequilibrioContratual) && (
        <div className="cartao space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Riscos e desequilíbrio contratual</h2>
          {riscos.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-slate-600">
              {riscos.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {contrato.desequilibrioContratual && <p className="text-sm text-slate-600">{contrato.desequilibrioContratual}</p>}
        </div>
      )}

      {eventosClimaticos.length > 0 && (
        <p className="text-xs text-slate-400">Eventos climáticos declarados: {eventosClimaticos.join(", ")}.</p>
      )}
    </div>
  );
}
