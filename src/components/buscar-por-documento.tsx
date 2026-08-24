"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { buscarPorDocumento, type ResultadoBusca } from "@/app/painel/cadastro/acoes";
import { rotuloDoCampo, valorParaExibir, type Confianca, type Perfil } from "@/lib/ia/leitura";
import { formatarDocumento, somenteAlfanumerico } from "@/lib/validacao";

const inicial: ResultadoBusca = {};

const CORES_CONFIANCA: Record<Confianca, string> = {
  ALTA: "bg-emerald-100 text-emerald-800",
  MEDIA: "bg-amber-100 text-amber-800",
  BAIXA: "bg-red-100 text-red-800",
};

const ROTULO_CONFIANCA: Record<Confianca, string> = {
  ALTA: "base oficial",
  MEDIA: "confira",
  BAIXA: "confira com atenção",
};

function BotaoBuscar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="botao-principal" disabled={pending}>
      {pending ? "Buscando..." : "Buscar"}
    </button>
  );
}

/**
 * Preenche o cadastro a partir do CPF ou CNPJ colado.
 *
 * É o caminho mais curto de todos, e o mais confiável: não há interpretação de
 * imagem, é o que consta na base da Receita. Fica lado a lado com o envio de
 * documentos porque cada um resolve uma parte — o documento traz endereço,
 * estado civil e profissão de pessoa física, que a base pública não fornece.
 */
export function BuscarPorDocumento({
  perfil,
  aoAplicar,
  aoTrocarTipo,
}: {
  perfil: Perfil;
  aoAplicar: (campos: Record<string, string>) => void;
  /** Avisa a tela quando a busca revelou que é pessoa física ou jurídica. */
  aoTrocarTipo?: (tipo: "PF" | "PJ") => void;
}) {
  const [estado, acao] = useFormState(buscarPorDocumento, inicial);
  const [documento, setDocumento] = useState("");
  const [descartados, setDescartados] = useState<Set<string>>(new Set());
  const [aplicado, setAplicado] = useState(false);
  const [pendente, setPendente] = useState<Record<string, string> | null>(null);

  const limpo = somenteAlfanumerico(documento);
  const ehCpf = limpo.length === 11;
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

  /**
   * Trocar entre pessoa fisica e juridica troca os campos da tela. Escrever
   * num campo que ainda nao foi desenhado nao faz nada — por isso o
   * preenchimento fica pendente e so acontece depois do redesenho.
   */
  useEffect(() => {
    if (!pendente) return;
    aoAplicar(pendente);
    setPendente(null);
    setAplicado(true);
    // aoAplicar vem de fora e muda a cada render; seguir so o que esta pendente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente]);

  function aplicar() {
    const aprovados: Record<string, string> = {};
    for (const [chave, campo] of Object.entries(campos)) {
      if (descartados.has(chave)) continue;
      aprovados[chave] = campo.valor;
    }
    if (estado.tipo && aoTrocarTipo) aoTrocarTipo(estado.tipo);
    setPendente(aprovados);
  }

  // Só faz sentido em cadastro de parte; operação e certidão não têm documento.
  if (perfil !== "PESSOA_PF" && perfil !== "PESSOA_PJ") return null;

  return (
    <section className="cartao">
      <h2 className="text-base font-semibold">Preencher pelo CPF ou CNPJ</h2>
      <p className="text-sm text-slate-500">
        Cole o documento e o cadastro se monta com o que consta na base da Receita. Sem interpretação, sem
        digitação.
      </p>

      <form action={acao} className="mt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="rotulo" htmlFor="documentoBusca">
              CPF ou CNPJ
            </label>
            <input
              id="documentoBusca"
              name="documentoBusca"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="campo font-mono"
            />
            {limpo.length > 0 && (
              <p className="ajuda">
                {limpo.length === 11
                  ? `CPF ${formatarDocumento(limpo)}`
                  : limpo.length === 14
                    ? `CNPJ ${formatarDocumento(limpo)}`
                    : `${limpo.length} caracteres — CPF tem 11, CNPJ tem 14`}
              </p>
            )}
          </div>

          {ehCpf && (
            <div>
              <label className="rotulo" htmlFor="dataNascimentoBusca">
                Data de nascimento
              </label>
              <input id="dataNascimentoBusca" name="dataNascimentoBusca" type="date" className="campo" />
              <p className="ajuda">A Receita exige para consultar CPF.</p>
            </div>
          )}

          <BotaoBuscar />
        </div>
      </form>

      {estado.erro && <div className="aviso-erro mt-4">{estado.erro}</div>}

      {estado.leitura && (
        <div className="mt-5 space-y-4">
          {estado.leitura.documentosReconhecidos.map((d, i) => (
            <p key={i} className="text-sm font-medium text-slate-700">
              {d}
            </p>
          ))}

          {estado.leitura.avisos.map((aviso, i) => (
            <div key={i} className={aviso.startsWith("ATENÇÃO") ? "aviso-erro" : "aviso-info"}>
              {aviso}
            </div>
          ))}

          {chaves.length === 0 ? (
            <div className="aviso-atencao">A consulta não trouxe campos preenchíveis.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th className="w-10">Usar</th>
                      <th>Campo</th>
                      <th>Valor</th>
                      <th>Origem</th>
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
                          <td className="font-medium text-slate-900">{valorParaExibir(chave, campo.valor)}</td>
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
                  <span className="text-sm text-emerald-700">Campos preenchidos abaixo. Confira e salve.</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
