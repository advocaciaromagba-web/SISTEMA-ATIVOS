import { CATEGORIAS_HABILITACAO, documentoHabilitacao, type CategoriaHabilitacao } from "@/lib/licitacoes/requisitos";
import { dataCurta } from "@/lib/formato";
import type { LeituraEdital } from "@/lib/licitacoes/leitura-edital";

const ROTULO_RESOLUCAO: Record<string, string> = {
  AUTOMATICO: "a plataforma confere sozinha",
  EMISSAO: "a plataforma leva ao órgão, emissão na hora",
  UPLOAD: "depende de documento apresentado pela empresa",
  GERADO: "a plataforma gera a declaração",
};

/**
 * Mostra o resultado da leitura automática do edital — conferência, não
 * preenchimento: os campos aqui NUNCA sobrescrevem o que foi digitado no
 * cadastro, só mostram o que a IA leu no PDF para comparação.
 */
export function LeituraEditalVista({
  leitura,
  erro,
  lidoEm,
}: {
  leitura: LeituraEdital | null;
  erro: string | null;
  lidoEm: Date | null;
}) {
  if (!leitura && !erro) {
    return <p className="text-sm text-slate-500">Ainda não lido automaticamente.</p>;
  }

  if (erro) {
    return <p className="text-sm text-red-700">Leitura automática não concluída: {erro}</p>;
  }

  if (!leitura) return null;

  const porCategoria = new Map<string, typeof leitura.requisitos>();
  for (const r of leitura.requisitos) {
    const lista = porCategoria.get(r.categoria) ?? [];
    lista.push(r);
    porCategoria.set(r.categoria, lista);
  }

  return (
    <div className="space-y-4">
      {lidoEm && <p className="text-xs text-slate-400">Lido por IA em {dataCurta(lidoEm)} — confira contra o edital antes de confiar de olhos fechados.</p>}

      {(leitura.orgaoLicitante || leitura.modalidade || leitura.numeroCertame || leitura.objeto || leitura.prazoEnvio) && (
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="mb-1 font-medium text-slate-700">O que a IA leu no PDF (compare com o que foi digitado):</p>
          {leitura.orgaoLicitante && <p>Órgão: {leitura.orgaoLicitante}</p>}
          {leitura.modalidade && <p>Modalidade: {leitura.modalidade}</p>}
          {leitura.numeroCertame && <p>Número: {leitura.numeroCertame}</p>}
          {leitura.objeto && <p>Objeto: {leitura.objeto}</p>}
          {leitura.prazoEnvio && <p>Prazo de envio: {leitura.prazoEnvio}</p>}
        </div>
      )}

      {leitura.requisitos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma exigência de habilitação identificada no documento.</p>
      ) : (
        <div className="space-y-3">
          {[...porCategoria.entries()].map(([categoria, itens]) => (
            <div key={categoria}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {categoria === "NAO_IDENTIFICADA" ? "Não identificada" : CATEGORIAS_HABILITACAO[categoria as CategoriaHabilitacao].nome}
              </h3>
              <ul className="mt-1 space-y-1.5">
                {itens.map((r, i) => {
                  const doc = r.chaveReconhecida ? documentoHabilitacao(r.chaveReconhecida) : undefined;
                  return (
                    <li key={i} className="text-sm text-slate-700">
                      {r.descricao}
                      {doc ? (
                        <span className="ml-2 text-xs text-emerald-700">— {ROTULO_RESOLUCAO[doc.resolucao]}</span>
                      ) : (
                        <span className="ml-2 text-xs text-amber-700">— não reconhecido no catálogo, conferir manualmente</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
