import { IconeCadastro, IconeLupa, IconeDocumentoCheck, IconeSelo } from "./icones-solucoes";

/**
 * Diagrama das quatro etapas que toda solução segue, independente de qual
 * ativo, empresa, pessoa ou edital está do outro lado. É deliberadamente o
 * mesmo desenho nas cinco soluções — a promessa da marca não é "temos um
 * sistema para cada coisa", é "toda coisa passa pelo mesmo funil".
 *
 * Puramente apresentacional: não lê nenhuma tabela de nenhuma solução.
 */
const ETAPAS = [
  {
    icone: IconeCadastro,
    titulo: "Cadastro",
    texto: "A parte, a empresa ou o ativo entram uma vez — CNPJ, CPF ou os dados do edital.",
  },
  {
    icone: IconeLupa,
    titulo: "Auditoria",
    texto: "Receita, dívida ativa, sanções, CNDT e CNJ consultados nas fontes oficiais, na hora.",
  },
  {
    icone: IconeDocumentoCheck,
    titulo: "Documentos",
    texto: "Contratos, declarações e relatórios montados a partir do cadastro, sem redigitar nada.",
  },
  {
    icone: IconeSelo,
    titulo: "Registro",
    texto: "Cada consulta e cada documento gerado ficam com data, autor e impressão digital.",
  },
] as const;

export function DiagramaOperacao() {
  return (
    <div className="relative">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {ETAPAS.map((etapa, i) => {
          const Icone = etapa.icone;
          return (
            <div key={etapa.titulo} className="relative flex flex-col items-center px-4 text-center lg:px-6">
              {/* conector entre os cartões, só de desktop pra cima */}
              {i < ETAPAS.length - 1 && (
                <div
                  aria-hidden
                  className="absolute right-0 top-9 hidden h-px w-full -translate-y-1/2 translate-x-1/2 lg:block"
                  style={{ background: "linear-gradient(to right, var(--marca-destaque), transparent)" }}
                />
              )}

              <div
                className="relative z-10 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: "var(--marca-destaque)", background: "var(--marca-escura)" }}
              >
                <Icone className="h-7 w-7 text-[color:var(--marca-destaque)]" />
              </div>

              <span className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="titulo mt-1 text-base font-semibold text-white">{etapa.titulo}</h3>
              <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-white/65">{etapa.texto}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
