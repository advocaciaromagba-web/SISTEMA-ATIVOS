import { obterAcompanhamentoMp } from "@/lib/agro/acompanhamento";
import { diasAte, MP_ACOMPANHADA, type SituacaoMp } from "@/lib/agro/vigencia-mp";
import { conferirVigenciaAgora } from "./acoes-vigencia";

const ROTULO_SITUACAO: Record<SituacaoMp, string> = {
  EM_TRAMITACAO: "Em tramitação",
  PRORROGADA: "Prazo prorrogado",
  CONVERTIDA_EM_LEI: "Convertida em lei",
  PERDEU_EFICACIA: "Perdeu a eficácia",
  REJEITADA_OU_ARQUIVADA: "Rejeitada ou arquivada",
  INDETERMINADO: "Indeterminada",
};

/** Cor da tarja inteira: vermelho só quando o motor precisa ser revisto. */
const COR_FAIXA: Record<SituacaoMp, string> = {
  EM_TRAMITACAO: "border-slate-200 bg-white",
  PRORROGADA: "border-slate-200 bg-white",
  CONVERTIDA_EM_LEI: "border-red-300 bg-red-50",
  PERDEU_EFICACIA: "border-red-300 bg-red-50",
  REJEITADA_OU_ARQUIVADA: "border-red-300 bg-red-50",
  INDETERMINADO: "border-amber-300 bg-amber-50",
};

const COR_ALERTA: Record<string, string> = {
  CRITICO: "border-red-200 bg-red-50 text-red-900",
  ATENCAO: "border-amber-200 bg-amber-50 text-amber-900",
  INFORMATIVO: "border-slate-200 bg-slate-50 text-slate-700",
};

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function quandoFoi(d: Date | null): string {
  if (!d) return "nunca";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function AvisoVigenciaMp() {
  const acomp = await obterAcompanhamentoMp();
  const v = acomp.vigencia;

  if (!v) {
    return (
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">Não foi possível conferir a situação da {MP_ACOMPANHADA.rotulo}.</p>
        <p className="mt-1">
          A fonte oficial (Câmara dos Deputados) não respondeu e ainda não há um estado guardado. O enquadramento na MP
          continua sendo calculado sobre o texto original — confira a vigência antes de usar o parecer.
        </p>
        <form action={conferirVigenciaAgora} className="mt-2">
          <button type="submit" className="text-sm font-medium underline">
            Tentar de novo
          </button>
        </form>
      </div>
    );
  }

  const dias = diasAte(v.prazoFinal);
  const emCurso = v.situacao === "EM_TRAMITACAO" || v.situacao === "PRORROGADA";

  // O aviso de mudança não pode viver só no instante em que a mudança é
  // detectada — quem não estava com a tela aberta naquele segundo nunca veria.
  // Ele fica de pé por 30 dias depois da virada.
  const DIAS_DE_DESTAQUE = 30;
  const mudancaVisivel =
    acomp.situacaoAnterior !== null &&
    acomp.alteradoEm !== null &&
    Date.now() - acomp.alteradoEm.getTime() < DIAS_DE_DESTAQUE * 86_400_000;

  return (
    <div className={`mb-6 rounded-xl border px-4 py-3 ${COR_FAIXA[v.situacao]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {MP_ACOMPANHADA.rotulo} — {ROTULO_SITUACAO[v.situacao]}
            {v.leiConversao ? ` (${v.leiConversao})` : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {emCurso && v.prazoFinal ? (
              <>
                Prazo de deliberação até {dataCurta(v.prazoFinal)}
                {dias !== null && dias >= 0 ? ` — faltam ${dias} dia(s)` : dias !== null ? ` — vencido há ${-dias} dia(s)` : ""}
                {v.origemPrazo === "CALCULADO_60_DIAS" ? " (estimativa)" : " (despacho oficial)"}
                {" · "}
              </>
            ) : null}
            Conferido em {quandoFoi(acomp.conferidoEm)}
            {acomp.fonteIndisponivel ? " — fonte fora do ar agora, mostrando o último estado conhecido" : ""}
          </p>
        </div>
        <form action={conferirVigenciaAgora}>
          <button type="submit" className="text-xs font-medium text-slate-600 underline">
            Conferir agora
          </button>
        </form>
      </div>

      {mudancaVisivel && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
          A situação mudou em {quandoFoi(acomp.alteradoEm)}
          {acomp.situacaoAnterior ? `: era “${ROTULO_SITUACAO[acomp.situacaoAnterior as SituacaoMp] ?? acomp.situacaoAnterior}”.` : "."}{" "}
          Reveja os pareceres em aberto que dependem da MP.
        </p>
      )}

      {v.alertas.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {v.alertas.map((a, i) => (
            <li key={i} className={`rounded-lg border px-3 py-2 text-sm ${COR_ALERTA[a.gravidade] ?? COR_ALERTA.INFORMATIVO}`}>
              <span className="font-medium">{a.titulo}.</span> {a.texto}
            </li>
          ))}
        </ul>
      )}

      {v.ultimoEvento && (
        <p className="mt-2 text-xs text-slate-500">
          Último andamento oficial: {dataCurta(v.ultimoEvento.data)} — {v.ultimoEvento.descricao ?? "—"}
          {v.ultimoEvento.orgao ? ` (${v.ultimoEvento.orgao})` : ""}.{" "}
          <a href={v.fonte} target="_blank" rel="noreferrer" className="underline">
            Ver ficha de tramitação
          </a>
        </p>
      )}
    </div>
  );
}
