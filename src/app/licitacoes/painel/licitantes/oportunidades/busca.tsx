"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { buscarOportunidades, salvarEditalDoPncp, type ResultadoAcao } from "../acoes";
import { MODALIDADES_PNCP, UFS, type OportunidadePncp } from "@/lib/licitacoes/pncp";
import { BotaoSalvar } from "@/components/campos";

export function BuscaOportunidades({ ufPadrao }: { ufPadrao: string }) {
  const [modalidade, setModalidade] = useState("");
  const [uf, setUf] = useState(ufPadrao);
  const [palavraChave, setPalavraChave] = useState("");
  const [pagina, setPagina] = useState(1);

  const [rodando, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<{ total: number; itens: OportunidadePncp[] } | null>(null);

  function buscar(paginaAlvo: number) {
    setErro("");
    iniciar(async () => {
      const r = await buscarOportunidades({ modalidade, uf, palavraChave, pagina: paginaAlvo });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setPagina(paginaAlvo);
      setResultado({ total: r.total, itens: r.itens });
    });
  }

  return (
    <div className="space-y-6">
      <section className="cartao">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="rotulo" htmlFor="modalidade">
              Modalidade
            </label>
            <select
              id="modalidade"
              className="campo"
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
            >
              <option value="">Todas</option>
              {MODALIDADES_PNCP.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="rotulo" htmlFor="uf">
              Estado
            </label>
            <select id="uf" className="campo" value={uf} onChange={(e) => setUf(e.target.value)}>
              <option value="">Todos</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="rotulo" htmlFor="palavraChave">
              Palavra-chave
            </label>
            <input
              id="palavraChave"
              className="campo"
              placeholder="Ex.: informática, merenda, engenharia"
              value={palavraChave}
              onChange={(e) => setPalavraChave(e.target.value)}
            />
            <p className="ajuda">
              O PNCP não classifica edital por atividade — a palavra-chave busca no título e no objeto.
            </p>
          </div>
        </div>

        <button onClick={() => buscar(1)} disabled={rodando} className="botao-principal mt-4">
          {rodando ? "Buscando..." : "Buscar"}
        </button>

        {erro && <div className="aviso-erro mt-4">{erro}</div>}
      </section>

      {resultado && (
        <section className="space-y-4">
          <p className="text-sm text-slate-500">
            {resultado.total.toLocaleString("pt-BR")} resultado(s) — mostrando a página {pagina}.
          </p>

          {resultado.itens.length === 0 ? (
            <div className="cartao text-center text-sm text-slate-500">Nada encontrado com esses filtros.</div>
          ) : (
            <ul className="space-y-3">
              {resultado.itens.map((o) => (
                <CartaoOportunidade key={o.numeroControlePncp} oportunidade={o} />
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            {pagina > 1 && (
              <button onClick={() => buscar(pagina - 1)} disabled={rodando} className="botao-secundario">
                Página anterior
              </button>
            )}
            {resultado.itens.length > 0 && (
              <button onClick={() => buscar(pagina + 1)} disabled={rodando} className="botao-secundario">
                Próxima página
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

const inicial: ResultadoAcao = {};

function CartaoOportunidade({ oportunidade: o }: { oportunidade: OportunidadePncp }) {
  const [estado, acao] = useFormState(salvarEditalDoPncp, inicial);

  return (
    <li className="cartao">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="etiqueta bg-slate-100 text-slate-700">{o.modalidade}</span>
            <span className="text-xs text-slate-400">
              {o.municipio ? `${o.municipio}/${o.uf}` : o.uf}
            </span>
          </div>
          <h3 className="titulo mt-1.5 text-sm font-semibold text-slate-900">{o.titulo}</h3>
          <p className="text-xs text-slate-500">{o.orgao}</p>
        </div>
        <a href={o.link} target="_blank" rel="noopener noreferrer" className="botao-secundario shrink-0 text-xs">
          Ver no PNCP
        </a>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-600">{o.objeto}</p>

      {estado.ok ? (
        <p className="aviso-ok mt-3">Salvo na sua lista de editais de interesse.</p>
      ) : (
        <form action={acao} className="mt-3">
          <input type="hidden" name="orgaoLicitante" value={o.orgao} />
          <input type="hidden" name="modalidade" value={o.modalidade} />
          <input type="hidden" name="numeroCertame" value={o.titulo} />
          <input type="hidden" name="objeto" value={o.objeto} />
          <input type="hidden" name="numeroControlePncp" value={o.numeroControlePncp} />
          <input type="hidden" name="linkPncp" value={o.link} />
          {estado.erro && <div className="aviso-erro mb-2">{estado.erro}</div>}
          <BotaoSalvar>Salvar como edital de interesse</BotaoSalvar>
        </form>
      )}
    </li>
  );
}
