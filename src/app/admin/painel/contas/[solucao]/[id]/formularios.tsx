"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { bloquearConta, desbloquearConta, excluirContaDefinitivo, type ResultadoAcaoAdmin } from "../../acoes";
import { entrarComoCliente, type ResultadoAcesso } from "../../acoes-acesso";

const INICIAL: ResultadoAcaoAdmin = {};

function Recado({ estado }: { estado: ResultadoAcaoAdmin }) {
  if (estado.erro) return <div className="aviso-erro mt-3">{estado.erro}</div>;
  if (estado.ok) return <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{estado.ok}</div>;
  return null;
}

export function FormularioBloqueio({
  solucao,
  id,
  bloqueada,
  motivoAtual,
}: {
  solucao: string;
  id: string;
  bloqueada: boolean;
  motivoAtual: string | null;
}) {
  const [estadoBloqueio, acaoBloquear] = useFormState(bloquearConta, INICIAL);
  const [estadoDesbloqueio, acaoDesbloquear] = useFormState(desbloquearConta, INICIAL);

  if (bloqueada) {
    return (
      <div className="cartao">
        <h2 className="text-sm font-semibold text-slate-900">Bloqueio</h2>
        <p className="mt-1 text-sm text-slate-600">
          Conta bloqueada. Motivo registrado: <span className="font-medium">{motivoAtual ?? "—"}</span>
        </p>
        <form action={acaoDesbloquear} className="mt-3">
          <input type="hidden" name="solucao" value={solucao} />
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="botao-principal">
            Desbloquear conta
          </button>
        </form>
        <Recado estado={estadoDesbloqueio} />
      </div>
    );
  }

  return (
    <div className="cartao">
      <h2 className="text-sm font-semibold text-slate-900">Bloqueio</h2>
      <p className="mt-1 text-sm text-slate-600">
        Bloquear tira o acesso do cliente sem apagar nada. O dado e o histórico ficam.
      </p>
      <form action={acaoBloquear} className="mt-3 space-y-3">
        <input type="hidden" name="solucao" value={solucao} />
        <input type="hidden" name="id" value={id} />
        <div>
          <label className="rotulo" htmlFor="motivo-bloqueio">
            Motivo
          </label>
          <input id="motivo-bloqueio" name="motivo" className="campo" placeholder="por que esta conta está sendo bloqueada" required />
          <p className="ajuda">Fica no registro de auditoria, junto com seu nome e a data.</p>
        </div>
        <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
          Bloquear conta
        </button>
      </form>
      <Recado estado={estadoBloqueio} />
    </div>
  );
}

export function FormularioAcesso({ solucao, id, nome }: { solucao: string; id: string; nome: string }) {
  const [estado, acao] = useFormState<ResultadoAcesso, FormData>(entrarComoCliente, {});

  return (
    <div className="cartao">
      <h2 className="text-sm font-semibold text-slate-900">Entrar na conta como o cliente</h2>
      <p className="mt-1 text-sm text-slate-600">
        Você passa a ver o painel de <span className="font-medium">{nome}</span> com os dados reais dele. Enquanto durar,
        uma tarja vermelha fica visível em todas as telas, e o acesso aparece na auditoria com início e fim.
      </p>
      <form action={acao} className="mt-3 space-y-3">
        <input type="hidden" name="solucao" value={solucao} />
        <input type="hidden" name="id" value={id} />
        <div>
          <label className="rotulo" htmlFor="motivo-acesso">
            Motivo do acesso
          </label>
          <input id="motivo-acesso" name="motivo" className="campo" placeholder="ex.: apurar erro relatado pelo cliente" required />
        </div>
        <button type="submit" className="botao-principal">
          Entrar como o cliente
        </button>
      </form>
      {estado.erro && <div className="aviso-erro mt-3">{estado.erro}</div>}
    </div>
  );
}

export function FormularioExclusao({ solucao, id, nome }: { solucao: string; id: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useFormState(excluirContaDefinitivo, INICIAL);

  return (
    <div className="cartao border-red-200">
      <h2 className="text-sm font-semibold text-red-900">Apagar definitivamente</h2>
      <p className="mt-1 text-sm text-slate-600">
        Apaga a conta e tudo que depende dela. Não tem volta e leva junto o histórico — que pode ser necessário depois,
        inclusive como prova de algo que foi feito. Na maioria dos casos o certo é bloquear.
      </p>

      {!aberto ? (
        <button type="button" onClick={() => setAberto(true)} className="mt-3 text-sm font-medium text-red-700 underline">
          Preciso apagar mesmo assim
        </button>
      ) : (
        <form action={acao} className="mt-3 space-y-3">
          <input type="hidden" name="solucao" value={solucao} />
          <input type="hidden" name="id" value={id} />
          <div>
            <label className="rotulo" htmlFor="motivo-exclusao">
              Motivo da exclusão
            </label>
            <input id="motivo-exclusao" name="motivo" className="campo" required />
          </div>
          <div>
            <label className="rotulo" htmlFor="confirmacao">
              Digite o nome exato da conta para confirmar
            </label>
            <input id="confirmacao" name="confirmacao" className="campo" placeholder={nome} required autoComplete="off" />
            <p className="ajuda">
              Precisa ser igual a <span className="font-medium">{nome}</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Apagar definitivamente
            </button>
            <button type="button" onClick={() => setAberto(false)} className="text-sm underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <Recado estado={estado} />
    </div>
  );
}
