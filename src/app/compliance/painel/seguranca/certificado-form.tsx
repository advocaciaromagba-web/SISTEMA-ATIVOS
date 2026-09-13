"use client";

import { useActionState, useState, useTransition } from "react";
import { enviarCertificado, removerCertificado, type ResultadoSeguranca } from "./acoes";
import { BotaoSalvar } from "@/components/campos";

const INICIAL: ResultadoSeguranca = {};

export function FormularioCertificado({
  nome,
  enviadoEm,
  validade,
  ehDono,
  cofrePronto,
}: {
  nome: string | null;
  enviadoEm: string | null;
  validade: string | null;
  ehDono: boolean;
  /** O cofre de segredos está configurado — sem ele o sistema não guarda a senha. */
  cofrePronto: boolean;
}) {
  const [estado, acao] = useActionState(enviarCertificado, INICIAL);
  const [processando, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function remover() {
    setErro("");
    iniciar(async () => {
      const r = await removerCertificado();
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        A certidão federal (Receita e PGFN) e as certidões do Tribunal de Justiça só são emitidas para quem está
        logado no gov.br. Com o certificado da sua empresa aqui, o sistema emite sozinho, em nome dela.
      </p>

      {(estado.erro || erro) && <div className="aviso-erro">{estado.erro || erro}</div>}
      {estado.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Certificado guardado. As certidões que dependem de gov.br já podem ser emitidas.
        </div>
      )}

      {!cofrePronto && (
        <div className="aviso-atencao">
          O envio de certificado está indisponível no momento por uma configuração pendente do sistema. Nenhuma
          senha é guardada sem proteção — por isso o envio fica bloqueado até isso ser resolvido.
        </div>
      )}

      {nome ? (
        <div className="rounded-lg border border-slate-200 p-3 text-sm">
          <div className="font-medium text-slate-900">{nome}</div>
          <div className="mt-1 text-xs text-slate-500">
            enviado em {enviadoEm}
            {validade ? ` · vence em ${validade}` : " · validade não informada"}
          </div>
          {ehDono && (
            <button
              type="button"
              onClick={remover}
              disabled={processando}
              className="mt-2 text-xs text-red-600 underline disabled:opacity-50"
            >
              remover certificado
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Nenhum certificado enviado.</p>
      )}

      {ehDono && cofrePronto && (
        <form action={acao} className="space-y-3 border-t border-slate-100 pt-3">
          <div>
            <label className="rotulo" htmlFor="certificado">
              Arquivo do certificado A1 (.pfx ou .p12)
            </label>
            <input id="certificado" name="certificado" type="file" accept=".pfx,.p12" className="campo" required />
            <p className="ajuda">
              Só funciona com certificado A1, que é um arquivo. O A3 fica num token ou cartão e precisa estar
              plugado no computador de quem assina — nesse caso, emita no site do órgão e anexe a certidão.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="rotulo" htmlFor="senha">
                Senha do certificado
              </label>
              <input id="senha" name="senha" type="password" className="campo" autoComplete="off" required />
            </div>
            <div>
              <label className="rotulo" htmlFor="validade">
                Vence em
              </label>
              <input id="validade" name="validade" type="date" className="campo" />
              <p className="ajuda">Para avisarmos antes de vencer.</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            O arquivo e a senha ficam guardados cifrados e são usados só nas consultas da sua conta. Você pode
            removê-los quando quiser.
          </p>

          <BotaoSalvar>Enviar certificado</BotaoSalvar>
        </form>
      )}
    </div>
  );
}
