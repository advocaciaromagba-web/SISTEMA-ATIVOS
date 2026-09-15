"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importarParticipantes, auditarProximoPendente, type ResultadoImportacao } from "../acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoImportacao = {};

/**
 * Importa a lista e, em seguida, audita um participante por vez.
 *
 * A auditoria roda em sequência, uma requisição por empresa, em vez de tudo
 * de uma vez: cada consulta externa leva segundos, e um lote grande numa
 * requisição só estouraria o tempo limite bem no meio — deixando metade
 * auditada sem ninguém saber quais.
 */
export function ImportarParticipantes({ certameId, pendentes }: { certameId: string; pendentes: number }) {
  const router = useRouter();
  const [estado, acao] = useActionState(importarParticipantes, inicial);
  const [processando, iniciar] = useTransition();

  const [restantes, setRestantes] = useState(pendentes);
  const [auditando, setAuditando] = useState(false);
  const [atual, setAtual] = useState<string | null>(null);
  const [erroAuditoria, setErroAuditoria] = useState("");

  // Quando o servidor devolve uma contagem nova (depois de importar, ou de
  // auditar), o contador local acompanha. Ajustar durante a renderização é o
  // caminho que o React recomenda para isto — efeito com setState aqui
  // dispararia renderização em cascata.
  const [pendentesAnterior, setPendentesAnterior] = useState(pendentes);
  if (pendentes !== pendentesAnterior) {
    setPendentesAnterior(pendentes);
    setRestantes(pendentes);
  }

  function auditarTodos() {
    setErroAuditoria("");
    setAuditando(true);

    iniciar(async () => {
      // Um por vez, até não sobrar nenhum.
      for (;;) {
        const r = await auditarProximoPendente(certameId);
        if (r.erro) {
          setErroAuditoria(r.erro);
          break;
        }
        setAtual(r.auditado ?? null);
        setRestantes(r.restantes);
        if (r.restantes === 0) break;
      }
      setAuditando(false);
      setAtual(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form action={acao} className="space-y-3">
        <input type="hidden" name="certameId" value={certameId} />

        {estado.erro && <div className="aviso-erro">{estado.erro}</div>}

        {estado.criados != null && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {estado.criados} participante(s) cadastrado(s).
            {estado.repetidos ? ` ${estado.repetidos} já estavam na lista e foram ignorados.` : ""}
            {estado.criados > 0 && " Agora rode a verificação para auditar cada um."}
          </div>
        )}

        {estado.invalidos && estado.invalidos.length > 0 && (
          <div className="aviso-atencao">
            <strong className="block">{estado.invalidos.length} linha(s) não puderam ser lidas:</strong>
            <ul className="mt-1 list-inside list-disc text-sm">
              {estado.invalidos.map((i, k) => (
                <li key={k}>
                  <span className="font-mono">{i.linha}</span> — {i.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="rotulo" htmlFor="lista">
            Lista de participantes
          </label>
          <textarea
            id="lista"
            name="lista"
            rows={6}
            className="campo font-mono text-sm"
            placeholder={"12.345.678/0001-99 Alfa Comércio Ltda\n98.765.432/0001-10 Beta Suprimentos ME\n11222333000181"}
            required
          />
          <p className="ajuda">
            Um por linha. O CNPJ pode vir com ou sem pontuação, antes ou depois do nome. Linha sem CNPJ válido é
            apontada, não descartada em silêncio. CNPJ repetido ou já cadastrado é ignorado.
          </p>
        </div>

        <BotaoSalvar>Cadastrar em lote</BotaoSalvar>
      </form>

      {restantes > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <strong className="text-slate-900">
                {restantes} participante(s) ainda sem verificação
              </strong>
              {auditando && atual && <div className="text-xs text-slate-500">verificando {atual}…</div>}
              {!auditando && (
                <div className="text-xs text-slate-500">
                  Cada verificação consulta Receita, cadastros de sanções e dívida ativa, e emite a CNDT.
                </div>
              )}
            </div>
            <button type="button" onClick={auditarTodos} disabled={processando} className="botao-principal">
              {auditando ? "Verificando..." : "Verificar todos"}
            </button>
          </div>
          {erroAuditoria && <p className="mt-2 text-xs text-red-600">{erroAuditoria}</p>}
        </div>
      )}
    </div>
  );
}
