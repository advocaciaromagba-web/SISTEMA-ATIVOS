"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { emitirCertidaoAutomatica, excluirCertidao, registrarCertidao } from "@/app/painel/auditoria/certidoes-acoes";
import type { ResultadoAcao } from "@/app/painel/pessoas/acoes";
import { BotaoSalvar } from "@/components/campos";
import { ROTULO_NATUREZA } from "@/lib/auditoria/certidoes";
import { LeitorDocumentos } from "@/components/leitor-documentos";

const inicial: ResultadoAcao = {};

const CORES_ESTADO: Record<string, string> = {
  OK: "bg-emerald-100 text-emerald-800",
  APONTAMENTO: "bg-red-100 text-red-800",
  FALTA: "bg-amber-100 text-amber-800",
  VENCIDA: "bg-amber-100 text-amber-800",
  PENDENTE: "bg-slate-100 text-slate-600",
};

const ROTULO_ESTADO: Record<string, string> = {
  OK: "nada consta",
  APONTAMENTO: "consta",
  FALTA: "não apresentada",
  VENCIDA: "vencida",
  PENDENTE: "aguardando leitura",
};

const ROTULO_EIXO: Record<string, string> = {
  CRIMINAL: "Criminal",
  PATRIMONIAL: "Patrimonial",
  FISCAL: "Fiscal",
  TRABALHISTA: "Trabalhista",
  ATIVO: "Sobre o ativo",
};

export type ItemCertidao = {
  chave: string;
  nome: string;
  orgao: string;
  eixo: string;
  porQue: string;
  comoObter: string;
  url: string | null;
  obrigatoria: boolean;
  motivo: string;
  estado: string;
  /** A plataforma consegue emitir esta certidao sozinha? */
  emissaoAutomatica: boolean;
  /** Caminho mais curto para tirar esta certidao. */
  acesso: { url: string; direto: boolean; instrucao: string; captcha: boolean } | null;
  certidao: {
    id: string;
    numero: string | null;
    emitidaEm: string | null;
    validaAte: string | null;
    resultado: string;
    natureza: string;
    apontamento: string | null;
    arquivoNome: string | null;
    temArquivo: boolean;
  } | null;
};

export function Certidoes({
  pessoaId,
  documento,
  itens,
  operacoes,
  podeEditar,
}: {
  pessoaId: string;
  /** CPF ou CNPJ da parte, para colar no site do orgao. */
  documento: string | null;
  itens: ItemCertidao[];
  operacoes: Array<{ id: string; codigo: string; titulo: string }>;
  podeEditar: boolean;
}) {
  const [estado, acao] = useFormState(registrarCertidao, inicial);
  const [aberto, setAberto] = useState<string | null>(null);
  const [removendo, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [resultadoEscolhido, setResultadoEscolhido] = useState("NADA_CONSTA");
  const [copiado, setCopiado] = useState("");

  /** Copia o documento da parte para colar no site do orgao. */
  async function copiarDocumento() {
    if (!documento) return;
    try {
      await navigator.clipboard.writeText(documento);
      setCopiado(documento);
      setTimeout(() => setCopiado(""), 2500);
    } catch {
      setErro("Nao foi possivel copiar. Selecione o numero e copie manualmente.");
    }
  }

  /**
   * Preenche o formulario da certidao aberta com o que a IA leu do PDF.
   *
   * O leitor fica fora do formulario de proposito: formulario dentro de
   * formulario e HTML invalido, e o navegador ignora o de dentro sem avisar.
   */
  function aplicarLeitura(campos: Record<string, string>) {
    if (!aberto) return;
    const form = document.getElementById(`form-certidao-${aberto}`);
    if (!(form instanceof HTMLFormElement)) return;

    // O resultado governa quais campos aparecem, entao move o estado do React
    // antes de escrever nos demais.
    if (campos.resultado) setResultadoEscolhido(campos.resultado);

    // Espera o React redesenhar para que os campos condicionais existam.
    setTimeout(() => {
      for (const [chave, valor] of Object.entries(campos)) {
        const campo = form.elements.namedItem(chave);
        if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement || campo instanceof HTMLSelectElement) {
          campo.value = valor;
        }
      }
    }, 0);
  }

  const obrigatoriasPendentes = itens.filter(
    (i) => i.obrigatoria && (i.estado === "FALTA" || i.estado === "VENCIDA" || i.estado === "PENDENTE")
  );

  const porEixo = itens.reduce<Record<string, ItemCertidao[]>>((mapa, item) => {
    (mapa[item.eixo] ??= []).push(item);
    return mapa;
  }, {});

  function remover(id: string) {
    setErro("");
    iniciar(async () => {
      const r = await excluirCertidao(id);
      if (r.erro) setErro(r.erro);
    });
  }

  function emitir(chave: string) {
    setErro("");
    iniciar(async () => {
      const r = await emitirCertidaoAutomatica(pessoaId, chave);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <section className="cartao">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Certidões</h2>
        <p className="text-sm text-slate-500">
          Nenhuma base criminal pública do Brasil aceita consulta automática — o BNMP exige autenticação, a Polícia
          Federal bloqueia robô e os tribunais usam captcha. As certidões são pedidas à parte, e valem mais que
          qualquer consulta: têm código de autenticidade conferível no órgão.
        </p>
      </div>

      {documento && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <span className="text-slate-600">Documento da parte:</span>
          <code className="font-mono text-slate-900">{documento}</code>
          <button type="button" onClick={copiarDocumento} className="botao-secundario py-1 text-xs">
            {copiado ? "Copiado" : "Copiar"}
          </button>
          <span className="text-xs text-slate-500">Cole no site do órgão — é o único campo que muda.</span>
        </div>
      )}

      {aberto && podeEditar && (
        <div className="mb-4">
          <LeitorDocumentos perfil="CERTIDAO" aoAplicar={aplicarLeitura} />
        </div>
      )}

      {erro && <div className="aviso-erro mb-4">{erro}</div>}
      {estado.erro && <div className="aviso-erro mb-4">{estado.erro}</div>}

      {obrigatoriasPendentes.length > 0 && (
        <div className="aviso-erro mb-4">
          <strong className="block">
            {obrigatoriasPendentes.length} certidão(ões) obrigatória(s) pendente(s)
          </strong>
          <span className="mt-1 block">
            Enquanto faltarem, esta parte fica bloqueada para operações e documentos.
          </span>
        </div>
      )}

      <div className="space-y-5">
        {Object.entries(porEixo).map(([eixo, lista]) => (
          <div key={eixo}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {ROTULO_EIXO[eixo] ?? eixo}
            </h3>
            <ul className="space-y-2">
              {lista.map((item) => (
                <li key={item.chave} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{item.nome}</span>
                        <span className={`etiqueta ${CORES_ESTADO[item.estado] ?? ""}`}>
                          {ROTULO_ESTADO[item.estado] ?? item.estado}
                        </span>
                        {item.obrigatoria && (
                          <span className="etiqueta bg-slate-800 text-white">obrigatória</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.orgao}</p>
                    </div>

                    {podeEditar && (
                      <div className="flex gap-2">
                        {item.emissaoAutomatica && (
                          <button
                            onClick={() => emitir(item.chave)}
                            disabled={removendo}
                            className="botao-principal py-1 text-xs disabled:opacity-50"
                          >
                            {removendo ? "Emitindo..." : "Emitir agora"}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setAberto(aberto === item.chave ? null : item.chave);
                            setResultadoEscolhido("NADA_CONSTA");
                          }}
                          className="botao-secundario py-1 text-xs"
                        >
                          {item.certidao ? "Substituir" : "Registrar"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ---- o que a certidão revelou ---- */}
                  {item.certidao && item.certidao.resultado === "CONSTA" && (
                    <div className="mt-2 rounded-lg border-l-4 border-red-400 bg-red-50 p-3 text-sm">
                      <div className="font-medium text-red-900">
                        {ROTULO_NATUREZA[item.certidao.natureza as keyof typeof ROTULO_NATUREZA] ??
                          item.certidao.natureza}
                      </div>
                      {item.certidao.apontamento && (
                        <p className="mt-1 text-red-900">{item.certidao.apontamento}</p>
                      )}
                      {item.certidao.natureza === "PROCESSO_EM_CURSO" && (
                        <p className="mt-2 text-xs text-red-800">
                          Processo em curso não é condenação: a parte é presumida inocente (Constituição, art. 5º,
                          LVII; Súmula 444 do STJ). Serve para decidir se pede garantia, não para tratar a pessoa
                          como culpada.
                        </p>
                      )}
                    </div>
                  )}

                  {item.certidao && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {item.certidao.numero && <span>nº {item.certidao.numero}</span>}
                      {item.certidao.emitidaEm && <span>emitida em {item.certidao.emitidaEm}</span>}
                      {item.certidao.validaAte && <span>válida até {item.certidao.validaAte}</span>}
                      {item.certidao.temArquivo && (
                        <a
                          href={`/api/certidoes/${item.certidao.id}/baixar`}
                          className="font-medium text-slate-700 underline"
                        >
                          {item.certidao.arquivoNome ?? "abrir arquivo"}
                        </a>
                      )}
                      {podeEditar && (
                        <button
                          onClick={() => remover(item.certidao!.id)}
                          disabled={removendo}
                          className="text-red-600 underline disabled:opacity-50"
                        >
                          excluir
                        </button>
                      )}
                    </div>
                  )}

                  {/* ---- por que e onde tirar ---- */}
                  {!item.certidao && (
                    <div className="mt-2 space-y-2 text-xs text-slate-600">
                      <p>{item.porQue}</p>

                      {item.acesso ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                          <p className="text-slate-700">{item.acesso.instrucao}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {item.acesso.url && (
                              <a
                                href={item.acesso.url}
                                target="_blank"
                                rel="noreferrer"
                                className="botao-principal py-1 text-xs"
                              >
                                {item.acesso.direto ? "Abrir a página da certidão" : "Procurar no site do tribunal"}
                              </a>
                            )}
                            {item.acesso.captcha && (
                              <span className="etiqueta bg-amber-100 text-amber-800">exige captcha</span>
                            )}
                            {!item.acesso.direto && item.acesso.url && (
                              <span className="text-slate-500">este tribunal usa sistema próprio</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p>
                          {item.comoObter}{" "}
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer" className="font-medium underline">
                              abrir site do órgão
                            </a>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ---- formulário ---- */}
                  {aberto === item.chave && podeEditar && (
                    <form id={`form-certidao-${item.chave}`} action={acao} className="mt-3 rounded-lg bg-slate-50 p-3">
                      <input type="hidden" name="pessoaId" value={pessoaId} />
                      <input type="hidden" name="tipo" value={item.chave} />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="rotulo text-xs">Resultado</label>
                          <select
                            name="resultado"
                            value={resultadoEscolhido}
                            onChange={(e) => setResultadoEscolhido(e.target.value)}
                            className="campo"
                          >
                            <option value="NADA_CONSTA">Nada consta</option>
                            <option value="CONSTA">Consta apontamento</option>
                            <option value="PENDENTE">Ainda não li</option>
                          </select>
                        </div>

                        <div>
                          <label className="rotulo text-xs">Número da certidão</label>
                          <input name="numero" className="campo" />
                        </div>

                        <div>
                          <label className="rotulo text-xs">Emitida em</label>
                          <input name="emitidaEm" type="date" className="campo" />
                        </div>

                        <div>
                          <label className="rotulo text-xs">Válida até</label>
                          <input name="validaAte" type="date" className="campo" />
                          <p className="ajuda">Em branco, o sistema conta o prazo próprio desta certidão.</p>
                        </div>

                        {resultadoEscolhido === "CONSTA" && (
                          <>
                            <div className="sm:col-span-2">
                              <label className="rotulo text-xs">O que consta</label>
                              <select name="natureza" className="campo" defaultValue="PROCESSO_EM_CURSO">
                                <option value="PROCESSO_EM_CURSO">
                                  Processo em curso (sem trânsito em julgado)
                                </option>
                                <option value="CONDENACAO_TRANSITADA">Condenação transitada em julgado</option>
                                <option value="MANDADO_ABERTO">Mandado de prisão em aberto</option>
                                <option value="MEDIDA_CONSTRITIVA">
                                  Sequestro, indisponibilidade ou penhora de bens
                                </option>
                                <option value="OUTRO">Outro apontamento</option>
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="rotulo text-xs">Descreva o apontamento</label>
                              <textarea
                                name="apontamento"
                                rows={2}
                                className="campo"
                                placeholder="Ex.: ação penal nº 0001234-56.2023.8.26.0100, 2ª Vara Criminal, art. 171 do CP, em instrução."
                              />
                            </div>
                          </>
                        )}

                        {operacoes.length > 0 && (
                          <div className="sm:col-span-2">
                            <label className="rotulo text-xs">Referente à operação</label>
                            <select name="operacaoId" className="campo">
                              <option value="">Vale para todas</option>
                              {operacoes.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.codigo} — {o.titulo}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="sm:col-span-2">
                          <label className="rotulo text-xs">Arquivo da certidão</label>
                          <input
                            name="arquivo"
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            className="campo py-1.5"
                          />
                          <p className="ajuda">
                            PDF original de preferência — é ele que carrega o código de autenticidade do órgão.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <BotaoSalvar>Registrar certidão</BotaoSalvar>
                        <button type="button" onClick={() => setAberto(null)} className="botao-secundario">
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {itens.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhuma certidão é exigida desta parte ainda. As exigências aparecem quando ela é vinculada a uma operação
          — e mudam conforme o papel dela e o tipo de ativo.
        </p>
      )}
    </section>
  );
}
