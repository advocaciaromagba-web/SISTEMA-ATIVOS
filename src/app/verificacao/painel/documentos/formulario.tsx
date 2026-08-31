"use client";

import { useFormState } from "react-dom";
import { verificarDocumento, type ResultadoAcao } from "./acoes";
import { BotaoSalvar } from "@/components/campos";

const inicial: ResultadoAcao = {};

const TIPOS: Array<{ valor: string; nome: string }> = [
  { valor: "CERTIDAO", nome: "Certidão" },
  { valor: "CONTRATO_SOCIAL", nome: "Contrato social" },
  { valor: "RG", nome: "RG" },
  { valor: "CPF", nome: "CPF" },
  { valor: "OUTRO", nome: "Outro" },
];

export function FormularioDocumento() {
  const [estado, acao] = useFormState(verificarDocumento, inicial);

  return (
    <form action={acao} className="space-y-4">
      {estado.erro && <div className="aviso-erro">{estado.erro}</div>}
      {estado.ok && <div className="aviso-ok">Documento verificado — veja no histórico.</div>}

      <div>
        <label className="rotulo" htmlFor="titulo">
          Título
        </label>
        <input id="titulo" name="titulo" className="campo" placeholder="Ex.: Certidão negativa — Fornecedor X" required />
      </div>

      <div>
        <label className="rotulo" htmlFor="tipo">
          Tipo
        </label>
        <select id="tipo" name="tipo" className="campo" defaultValue="OUTRO">
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="rotulo" htmlFor="documento">
          CPF ou CNPJ (opcional)
        </label>
        <input id="documento" name="documento" className="campo" placeholder="A quem este documento se refere" />
        <p className="ajuda">Preenchendo, dá para comparar depois com uma emissão feita direto no órgão.</p>
      </div>

      <div>
        <label className="rotulo" htmlFor="arquivo">
          Arquivo
        </label>
        <input id="arquivo" name="arquivo" type="file" className="campo" required />
        <p className="ajuda">PDF ou imagem, até 15 MB. Gera a impressão digital (hash) do arquivo automaticamente.</p>
      </div>

      <div>
        <label className="rotulo" htmlFor="validaAte">
          Válido até (opcional)
        </label>
        <input id="validaAte" name="validaAte" type="date" className="campo" />
      </div>

      <BotaoSalvar>Verificar documento</BotaoSalvar>
    </form>
  );
}
