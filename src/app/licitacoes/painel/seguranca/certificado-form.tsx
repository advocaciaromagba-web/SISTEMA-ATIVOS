"use client";

import { useActionState, useState, useTransition } from "react";
import { enviarCertificadoLicitacoes, removerCertificadoLicitacoes, type ResultadoSeguranca } from "./acoes";
import { BotaoSalvar } from "@/components/campos";

const INICIAL: ResultadoSeguranca = {};

export type DadosCertificadoNaTela = {
  titular: string | null;
  documento: string | null;
  emissor: string | null;
  numeroSerie: string | null;
  certificadosNaCadeia: number | null;
  temCadeia: boolean | null;
};

export function FormularioCertificadoLicitacoes({
  nome,
  enviadoEm,
  validade,
  vencido,
  dados,
  ehDono,
  cofrePronto,
}: {
  nome: string | null;
  enviadoEm: string | null;
  validade: string | null;
  vencido: boolean;
  dados: DadosCertificadoNaTela | null;
  ehDono: boolean;
  /** O cofre de segredos está configurado — sem ele o sistema não guarda a senha. */
  cofrePronto: boolean;
}) {
  const [estado, acao] = useActionState(enviarCertificadoLicitacoes, INICIAL);
  const [processando, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function remover() {
    setErro("");
    iniciar(async () => {
      const r = await removerCertificadoLicitacoes();
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        É com ele que as declarações do envelope saem assinadas digitalmente, em PDF, no padrão ICP-Brasil — que é
        o que o edital aceita. Sem certificado, as declarações continuam sendo geradas, mas sem assinatura.
      </p>

      {(estado.erro || erro) && <div className="aviso-erro">{estado.erro || erro}</div>}
      {estado.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Certificado conferido e guardado{estado.titular ? ` — titular: ${estado.titular}` : ""}. Os próximos
          envelopes saem assinados.
        </div>
      )}
      {estado.aviso && <div className="aviso-atencao">{estado.aviso}</div>}

      {!cofrePronto && (
        <div className="aviso-atencao">
          O envio de certificado está indisponível no momento por uma configuração pendente do sistema. Nenhuma
          senha é guardada sem proteção — por isso o envio fica bloqueado até isso ser resolvido.
        </div>
      )}

      {nome ? (
        <div className="rounded-lg border border-slate-200 p-3 text-sm">
          <div className="font-medium text-slate-900">{dados?.titular || nome}</div>
          {dados?.documento && <div className="text-xs text-slate-600">{dados.documento}</div>}

          <dl className="mt-2 space-y-1 text-xs text-slate-600">
            {dados?.emissor && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Emitido por</dt>
                <dd className="text-right">{dados.emissor}</dd>
              </div>
            )}
            {dados?.numeroSerie && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Número de série</dt>
                <dd className="text-right font-mono">{dados.numeroSerie}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Validade</dt>
              <dd className={`text-right ${vencido ? "font-medium text-red-600" : ""}`}>
                {validade ? (vencido ? `vencido em ${validade}` : `vence em ${validade}`) : "não informada"}
              </dd>
            </div>
            {dados?.certificadosNaCadeia != null && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Cadeia</dt>
                <dd className="text-right">
                  {dados.certificadosNaCadeia} certificado(s)
                  {dados.temCadeia === false ? " — sem a AC emissora" : ""}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Arquivo</dt>
              <dd className="text-right">
                {nome} · enviado em {enviadoEm}
              </dd>
            </div>
          </dl>

          {vencido && (
            <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
              Certificado vencido. Documento assinado com certificado vencido é recusado no certame — envie o
              certificado novo antes de gerar envelopes.
            </div>
          )}
          {dados?.temCadeia === false && (
            <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              Este arquivo trouxe só o certificado da empresa, sem a Autoridade Certificadora. A assinatura sai
              mesmo assim, mas alguns validadores podem não montar a cadeia de confiança sozinhos.
            </div>
          )}

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
              Só A1, que é um arquivo. O A3 fica em token ou cartão e a chave privada não sai do dispositivo — não
              há como um servidor assinar com ele.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="rotulo" htmlFor="senha">
                Senha do certificado
              </label>
              <input id="senha" name="senha" type="password" className="campo" autoComplete="off" required />
              <p className="ajuda">Conferida na hora: se estiver errada, avisamos agora.</p>
            </div>
            <div>
              <label className="rotulo" htmlFor="validade">
                Vence em
              </label>
              <input id="validade" name="validade" type="date" className="campo" />
              <p className="ajuda">Só se o certificado não trouxer a data.</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            O arquivo e a senha ficam cifrados e são usados só para assinar os documentos da sua conta. Você pode
            removê-los quando quiser.
          </p>

          <BotaoSalvar>Enviar certificado</BotaoSalvar>
        </form>
      )}
    </div>
  );
}
