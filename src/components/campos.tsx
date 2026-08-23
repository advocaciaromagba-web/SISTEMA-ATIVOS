"use client";

import { useFormStatus } from "react-dom";

/** Campo de texto com rótulo e ajuda. */
export function Campo({
  nome,
  rotulo,
  valor,
  tipo = "text",
  ajuda,
  obrigatorio,
  placeholder,
  className = "",
}: {
  nome: string;
  rotulo: string;
  valor?: string | number | null;
  tipo?: string;
  ajuda?: string;
  obrigatorio?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="rotulo" htmlFor={nome}>
        {rotulo}
        {obrigatorio && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={nome}
        name={nome}
        type={tipo}
        defaultValue={valor ?? ""}
        placeholder={placeholder}
        required={obrigatorio}
        className="campo"
      />
      {ajuda && <p className="ajuda">{ajuda}</p>}
    </div>
  );
}

export function Area({
  nome,
  rotulo,
  valor,
  ajuda,
  linhas = 3,
  obrigatorio,
  className = "",
}: {
  nome: string;
  rotulo: string;
  valor?: string | null;
  ajuda?: string;
  linhas?: number;
  obrigatorio?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="rotulo" htmlFor={nome}>
        {rotulo}
        {obrigatorio && <span className="text-red-500"> *</span>}
      </label>
      <textarea id={nome} name={nome} rows={linhas} defaultValue={valor ?? ""} required={obrigatorio} className="campo" />
      {ajuda && <p className="ajuda">{ajuda}</p>}
    </div>
  );
}

export function Selecao({
  nome,
  rotulo,
  valor,
  opcoes,
  ajuda,
  obrigatorio,
  vazio,
  className = "",
}: {
  nome: string;
  rotulo: string;
  valor?: string | null;
  opcoes: Array<{ valor: string; rotulo: string }>;
  ajuda?: string;
  obrigatorio?: boolean;
  vazio?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="rotulo" htmlFor={nome}>
        {rotulo}
        {obrigatorio && <span className="text-red-500"> *</span>}
      </label>
      <select id={nome} name={nome} defaultValue={valor ?? ""} required={obrigatorio} className="campo">
        {vazio && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {ajuda && <p className="ajuda">{ajuda}</p>}
    </div>
  );
}

export function Marcador({
  nome,
  rotulo,
  marcado,
  ajuda,
}: {
  nome: string;
  rotulo: string;
  marcado?: boolean;
  ajuda?: string;
}) {
  return (
    <div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name={nome} defaultChecked={marcado} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
        <span className="text-slate-700">{rotulo}</span>
      </label>
      {ajuda && <p className="ajuda ml-6">{ajuda}</p>}
    </div>
  );
}

/** Botão de envio que se desabilita sozinho enquanto o servidor trabalha. */
export function BotaoSalvar({ children = "Salvar" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="botao-principal" disabled={pending}>
      {pending ? "Salvando..." : children}
    </button>
  );
}

export function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="cartao">
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      {descricao && <p className="mb-4 mt-0.5 text-sm text-slate-500">{descricao}</p>}
      <div className={descricao ? "" : "mt-4"}>{children}</div>
    </section>
  );
}
