/**
 * Gera as cinco declaracoes de habilitacao e mostra o texto produzido.
 *
 * Usa o mesmo certame do edital real (Pregao Presencial 004/2021, Prefeitura
 * de Icem/SP) para poder comparar a redacao gerada com o anexo original.
 *
 * Uso: node --experimental-strip-types --import ./scripts/registrar.mjs scripts/testar-licitacao.mts
 */
import type { Organizacao, Pessoa, Usuario } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { gerarDocumento } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";

const organizacao = {
  id: "org-exemplo",
  nome: "Mesa Norte Ativos",
  razaoSocial: "MESA NORTE INTERMEDIACAO DE ATIVOS LTDA",
  foroCidade: "Guariba",
  foroUf: "SP",
  logo: null,
  logoTipo: null,
} as unknown as Organizacao;

const usuario = { id: "u1", nome: "Operador", email: "op@exemplo.com.br" } as unknown as Usuario;

const licitante = {
  id: "p1",
  tipo: "PJ",
  nome: "Distribuidora Guariba de Materiais de Limpeza Ltda",
  documento: "11222333000181",
  enderecoRua: "Rua Rui Barbosa",
  enderecoNumero: "1249",
  enderecoBairro: "Jardim Progresso",
  enderecoCidade: "Guariba",
  enderecoUf: "SP",
  enderecoCep: "14842042",
  repNome: "Carlos Eduardo Ferraz",
  repCpf: "52998224725",
  repRg: "34.567.890-1",
  repCargo: "sócio administrador",
  repNacionalidade: "brasileiro",
  repEstadoCivil: "casado",
  repProfissao: "empresário",
} as unknown as Pessoa;

const CAMPOS_CERTAME = {
  orgaoLicitante: "Prefeitura Municipal de Icém/SP",
  modalidade: "Pregão Presencial",
  numeroCertame: "004/2021",
};

const DOCUMENTOS = [
  "LICIT_CREDENCIAMENTO",
  "LICIT_FATO_SUPERVENIENTE",
  "LICIT_NAO_EMPREGA_MENOR",
  "LICIT_PLENO_ATENDIMENTO",
  "LICIT_ME_EPP",
];

async function principal() {
  console.log("");
  for (const tipo of DOCUMENTOS) {
    const contexto: ContextoDocumento = {
      organizacao,
      operacao: null,
      usuario,
      campos: CAMPOS_CERTAME,
      agora: new Date(),
      licitante,
    };

    try {
      const documento = await gerarDocumento(tipo, contexto);
      const destino = path.join(process.cwd(), "exemplos", "licitacao");
      await fs.mkdir(destino, { recursive: true });
      await fs.writeFile(path.join(destino, documento.nomeArquivo), documento.buffer);
      const aviso = documento.pendencias.length > 0 ? `  (${documento.pendencias.length} pendência/s)` : "";
      console.log(`OK   ${tipo.padEnd(28)} ${documento.hashSha256.slice(0, 8).toUpperCase()}${aviso}`);
      if (documento.pendencias.length > 0) {
        documento.pendencias.forEach((p) => console.log(`       - ${p.campo}: ${p.motivo}`));
      }
    } catch (erro) {
      console.log(`ERRO ${tipo}: ${(erro as Error).message}`);
    }
  }
  console.log("");

  // Sem licitante selecionado: confirma que a tela avisaria em vez de gerar
  // um documento com o nome da empresa em branco.
  const semLicitante: ContextoDocumento = {
    organizacao,
    operacao: null,
    usuario,
    campos: CAMPOS_CERTAME,
    agora: new Date(),
  };
  const doc = await gerarDocumento("LICIT_FATO_SUPERVENIENTE", semLicitante);
  console.log("Sem licitante selecionado, pendências:");
  doc.pendencias.forEach((p) => console.log(`  - ${p.campo}: ${p.motivo}`));
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
