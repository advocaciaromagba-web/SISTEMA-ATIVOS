"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { lerArquivos, type ResultadoLeituraAcao } from "@/app/painel/leitura/acoes";
import { rotuloDoCampo, valorParaExibir, type Confianca, type Perfil } from "@/lib/ia/leitura";

const inicial: ResultadoLeituraAcao = {};

const CORES_CONFIANCA: Record<Confianca, string> = {
  ALTA: "bg-emerald-100 text-emerald-800",
  MEDIA: "bg-amber-100 text-amber-800",
  BAIXA: "bg-red-100 text-red-800",
};

const ROTULO_CONFIANCA: Record<Confianca, string> = {
  ALTA: "leitura clara",
  MEDIA: "confira",
  BAIXA: "confira com atenção",
};

const AJUDA_POR_PERFIL: Record<Perfil, string> = {
  PESSOA_PF: "RG ou CNH, CPF, comprovante de endereço, certidão de casamento.",
  PESSOA_PJ: "Contrato social ou última alteração, cartão CNPJ, documento do representante.",
  OPERACAO_PRECATORIO: "Ofício requisitório, certidão de precatório, certidão de objeto e pé.",
  CERTIDAO: "A certidão em PDF, de preferência a original baixada do site do órgão.",
};

function BotaoLer() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="botao-principal" disabled={pending}>
      {pending ? "Lendo os documentos..." : "Ler documentos"}
    </button>
  );
}

/**
 * Envia documentos, mostra o que a IA leu e deixa a pessoa escolher o que
 * aplicar. Nada é gravado por este componente: ele preenche os campos do
 * formulário que está na mesma tela.
 */
export function LeitorDocumentos({
  perfil,
  aoAplicar,
}: {
  perfil: Perfil;
  /** Recebe os campos aprovados e preenche o formulário da tela. */
  aoAplicar: (campos: Record<string, string>) => void;
}) {
  const [estado, acao] = useFormState(lerArquivos, inicial);
  const [aberto, setAberto] = useState(false);
  const [descartados, setDescartados] = useState<Set<string>>(new Set());
  const [aplicado, setAplicado] = useState(false);

  const campos = estado.leitura?.campos ?? {};
  const chaves = Object.keys(campos);

  function alternar(chave: string) {
    setDescartados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function aplicar() {
    const aprovados: Record<string, string> = {};
    for (const [chave, campo] of Object.entries(campos)) {
      if (descartados.has(chave)) continue;
      aprovados[chave] = campo.valor;
    }
    aoAplicar(aprovados);
    setAplicado(true);
  }

  return (
    <section className="cartao border-dashed">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Preencher a partir de documentos</h2>
          <p className="text-sm text-slate-500">
            Envie os documentos e o sistema lê os campos para você conferir. Nada é gravado sem a sua confirmação.
          </p>
        </div>
        <button type="button" onClick={() => setAberto(!aberto)} className="botao-secundario">
          {aberto ? "Fechar" : "Enviar documentos"}
        </button>
      </div>

      {aberto && (
        <div className="mt-4 space-y-4">
          <form action={acao} className="rounded-lg bg-slate-50 p-4">
            <input type="hidden" name="perfil" value={perfil} />

            <label className="rotulo" htmlFor="arquivos">
              Documentos
            </label>
            <input
              id="arquivos"
              name="arquivos"
              type="file"
              multiple
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="campo py-1.5"
            />
            <p className="ajuda">{AJUDA_POR_PERFIL[perfil]} Até 6 arquivos, 10 MB cada.</p>

            <div className="mt-3">
              <BotaoLer />
            </div>
          </form>

          {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

          {estado.leitura && (
            <div className="space-y-4">
              {estado.leitura.documentosReconhecidos.length > 0 && (
                <p className="text-sm text-slate-600">
                  Reconhecido: {estado.leitura.documentosReconhecidos.join(", ")}.
                </p>
              )}

              {estado.leitura.avisos.map((aviso, i) => (
                <div key={i} className="aviso-atencao">
                  {aviso}
                </div>
              ))}

              {estado.conferenciaReceita && estado.conferenciaReceita.length > 0 && (
                <div className="aviso-erro">
                  <strong className="block">O documento diverge do cadastro da Receita</strong>
                  <ul className="mt-2 space-y-1">
                    {estado.conferenciaReceita.map((d, i) => (
                      <li key={i}>
                        <span className="font-medium">{d.campo}:</span> no documento &ldquo;{d.lido}&rdquo;; na
                        Receita &ldquo;{d.oficial}&rdquo;.
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    Divergência assim costuma ser documento desatualizado — mas também pode ser documento de outra
                    empresa. Confirme antes de aplicar.
                  </p>
                </div>
              )}

              {chaves.length === 0 ? (
                <div className="aviso-atencao">
                  Nenhum campo foi extraído. Confira se os documentos estão legíveis e se são do tipo esperado.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="tabela">
                      <thead>
                        <tr>
                          <th className="w-10">Usar</th>
                          <th>Campo</th>
                          <th>Valor lido</th>
                          <th>Leitura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chaves.map((chave) => {
                          const campo = campos[chave];
                          const usar = !descartados.has(chave);
                          return (
                            <tr key={chave} className={usar ? "" : "opacity-40"}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={usar}
                                  onChange={() => alternar(chave)}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                              </td>
                              <td className="text-slate-600">{rotuloDoCampo(perfil, chave)}</td>
                              <td className="font-medium text-slate-900">
                                {valorParaExibir(chave, campo.valor)}
                                {campo.problema && (
                                  <div className="mt-0.5 text-xs font-normal text-red-700">{campo.problema}</div>
                                )}
                              </td>
                              <td>
                                <span className={`etiqueta ${CORES_CONFIANCA[campo.confianca]}`}>
                                  {ROTULO_CONFIANCA[campo.confianca]}
                                </span>
                                <div className="mt-0.5 text-xs text-slate-500">{campo.origem}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={aplicar} className="botao-principal">
                      Preencher o formulário
                    </button>
                    {aplicado && (
                      <span className="text-sm text-emerald-700">
                        Campos preenchidos abaixo. Confira e salve.
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    A inteligência artificial sugere; quem confirma é você. CPF, CNPJ e número de processo já
                    passaram pela conferência dos dígitos — o que não fechou está marcado em vermelho.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
