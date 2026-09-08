"use client";

import { useState } from "react";
import { useActionState } from "react";
import { salvarRascunho, publicarContrato, type ResultadoContrato } from "./acoes";

const INICIAL: ResultadoContrato = {};

function Recado({ estado }: { estado: ResultadoContrato }) {
  if (estado.erro) return <div className="aviso-erro mt-3">{estado.erro}</div>;
  if (estado.ok)
    return <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{estado.ok}</div>;
  return null;
}

export function FormularioRascunho({
  solucao,
  titulo,
  conteudo,
  versao,
  temRascunho,
}: {
  solucao: string;
  titulo: string;
  conteudo: string;
  versao: number | null;
  temRascunho: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useActionState(salvarRascunho, INICIAL);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm font-medium underline">
        {temRascunho ? `Editar rascunho da versão ${versao}` : "Escrever nova versão"}
      </button>
    );
  }

  return (
    <form action={acao} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="solucao" value={solucao} />

      <div>
        <label className="rotulo">Título do contrato</label>
        <input name="titulo" className="campo" defaultValue={titulo} required />
      </div>

      <div>
        <label className="rotulo">Texto</label>
        <textarea name="conteudo" className="campo font-mono text-xs" rows={22} defaultValue={conteudo} required />
        <p className="ajuda">
          Linha começando com <code>## </code> vira título de seção. Linha em branco separa parágrafos. Sem
          formatação além disso — contrato é para ser lido, não decorado.
        </p>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="botao-principal">
          Salvar rascunho
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-sm underline">
          Fechar
        </button>
      </div>

      <Recado estado={estado} />
    </form>
  );
}

export function FormularioPublicar({ solucao, versao }: { solucao: string; versao: number }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useActionState(publicarContrato, INICIAL);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm font-medium text-emerald-700 underline">
        Publicar versão {versao}
      </button>
    );
  }

  return (
    <form action={acao} className="mt-3 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <input type="hidden" name="solucao" value={solucao} />
      <p className="text-sm text-amber-900">
        Publicar congela o texto da versão {versao}. Ele passa a ser o que os clientes aceitam, e{" "}
        <span className="font-semibold">não poderá mais ser editado</span> — para mudar, será preciso criar outra
        versão. Quem já aceitou continua vinculado à versão que aceitou.
      </p>
      <div>
        <label className="rotulo">Digite PUBLICAR para confirmar</label>
        <input name="confirmacao" className="campo" placeholder="PUBLICAR" autoComplete="off" required />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Publicar
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-sm underline">
          Cancelar
        </button>
      </div>
      <Recado estado={estado} />
    </form>
  );
}
