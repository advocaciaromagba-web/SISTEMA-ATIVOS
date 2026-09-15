import type { ClassificacaoParticipante, TipoAchado } from "@/lib/licitacoes/classificacao";
import { dataCurta } from "@/lib/formato";

export const ROTULO_RECOMENDACAO: Record<string, string> = {
  HABILITAR: "habilitar",
  INABILITAR: "inabilitar",
  DILIGENCIA: "diligência",
};

export const COR_RECOMENDACAO: Record<string, string> = {
  HABILITAR: "bg-emerald-100 text-emerald-800",
  INABILITAR: "bg-red-100 text-red-800",
  DILIGENCIA: "bg-amber-100 text-amber-800",
};

const ROTULO_ACHADO: Record<TipoAchado, string> = {
  IMPEDIMENTO: "Impedimento",
  IRREGULARIDADE: "Irregularidade",
  PENDENCIA: "Pendência",
  CONFERIR: "Conferir",
};

const COR_ACHADO: Record<TipoAchado, string> = {
  IMPEDIMENTO: "border-red-200 bg-red-50",
  IRREGULARIDADE: "border-amber-200 bg-amber-50",
  PENDENCIA: "border-amber-200 bg-amber-50",
  CONFERIR: "border-slate-200 bg-slate-50",
};

const ORDEM: TipoAchado[] = ["IMPEDIMENTO", "IRREGULARIDADE", "PENDENCIA", "CONFERIR"];

/**
 * Mostra a recomendação automática e o que a sustenta.
 *
 * Em nenhum lugar esta tela diz que o participante "está" habilitado ou
 * inabilitado: quem decide é a comissão, no parecer logo abaixo. O que está
 * aqui é o insumo, com a origem de cada achado à vista.
 */
export function ClassificacaoVista({
  classificacao,
  classificadoEm,
}: {
  classificacao: ClassificacaoParticipante | null;
  classificadoEm: Date | null;
}) {
  if (!classificacao) {
    return <p className="text-sm text-slate-500">Ainda não classificado automaticamente.</p>;
  }

  const porTipo = ORDEM.map((tipo) => ({
    tipo,
    itens: classificacao.achados.filter((a) => a.tipo === tipo),
  })).filter((g) => g.itens.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm">Recomendação:</strong>
        <span className={`etiqueta ${COR_RECOMENDACAO[classificacao.recomendacao] ?? "bg-slate-100 text-slate-700"}`}>
          {ROTULO_RECOMENDACAO[classificacao.recomendacao] ?? classificacao.recomendacao}
        </span>
        {classificacao.microempresa && <span className="etiqueta bg-slate-100 text-slate-700">ME/EPP</span>}
        {classificadoEm && <span className="text-xs text-slate-400">em {dataCurta(classificadoEm)}</span>}
      </div>

      <p className="text-sm text-slate-700">{classificacao.resumo}</p>

      <p className="text-xs text-slate-500">
        {classificacao.requisitosDoEdital > 0
          ? `${classificacao.requisitosAtendidos} de ${classificacao.requisitosDoEdital} requisitos do edital atendidos com o que está anexado ou foi emitido na fonte.`
          : "O edital deste certame ainda não foi lido automaticamente — sem isso não há conferência de documentação."}
        {classificacao.requisitosSemConferenciaAutomatica > 0 &&
          ` ${classificacao.requisitosSemConferenciaAutomatica} exigência(s) do edital não têm conferência automática.`}
      </p>

      {porTipo.map((grupo) => (
        <div key={grupo.tipo}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {ROTULO_ACHADO[grupo.tipo]} ({grupo.itens.length})
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {grupo.itens.map((a, i) => (
              <li key={i} className={`rounded-lg border px-3 py-2 text-sm ${COR_ACHADO[grupo.tipo]}`}>
                <div className="font-medium text-slate-900">{a.titulo}</div>
                <div className="mt-0.5 text-slate-700">{a.detalhe}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Fonte: {a.fonte}
                  {a.baseLegal ? ` · ${a.baseLegal}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
        Esta é uma recomendação automática, montada com o que as fontes responderam e com os requisitos lidos do
        edital. A decisão de habilitar ou inabilitar é da comissão, e é o parecer abaixo que vale.
      </p>
    </div>
  );
}
