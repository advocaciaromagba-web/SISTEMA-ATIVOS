/**
 * Gera o NCNDA para varios ativos e mostra o que muda entre eles.
 *
 * Serve para conferir de olho que o documento se adapta ao cadastro: o mesmo
 * jogo de partes, trocando so o tipo de ativo, tem de produzir objeto,
 * garantias e advertencias diferentes. Se sair tudo igual, a adaptacao nao
 * esta funcionando.
 *
 * Uso:
 *   node --experimental-strip-types --import ./scripts/registrar.mjs scripts/comparar-ncnda.mts
 */
import fs from "fs/promises";
import path from "path";
import type { Operacao, Organizacao, ParteOperacao, Pessoa, Usuario } from "@prisma/client";
import { gerarDocumento } from "@/lib/documentos";
import type { ContextoDocumento } from "@/lib/documentos/contexto";
import { perfilDoAtivo } from "@/lib/ativos/perfis";

const organizacao = {
  id: "org-exemplo",
  nome: "Mesa Norte Ativos",
  razaoSocial: "MESA NORTE INTERMEDIACAO DE ATIVOS LTDA",
  cnpj: "11222333000181",
  emailContato: "contato@mesanorte.com.br",
  enderecoCidade: "São Paulo",
  enderecoUf: "SP",
  logo: null,
  logoTipo: null,
} as unknown as Organizacao;

const usuario = { id: "u1", nome: "Operador", email: "op@exemplo.com.br" } as unknown as Usuario;

function pessoa(dados: Partial<Pessoa>): Pessoa {
  return { tipo: "PJ", enderecoUf: "SP", enderecoCidade: "São Paulo", ...dados } as unknown as Pessoa;
}

const divulgador = pessoa({
  id: "p1",
  nome: "TSA Consultoria e Empreendimentos Ltda",
  documento: "11222333000181",
  enderecoRua: "Avenida Deputado Jamel Cecílio",
  enderecoNumero: "2690",
  enderecoCidade: "Goiânia",
  enderecoUf: "GO",
  repNome: "Herika Tsuruda Araki",
  repCpf: "52998224725",
  repCargo: "procuradora",
});

const intermediario = pessoa({
  id: "p2",
  nome: "Romacred Soluções Financeiras Ltda",
  documento: "12ABC34501DE35",
  enderecoRua: "Praça Sílvio Vaz de Arruda",
  enderecoNumero: "140",
  enderecoCidade: "Guariba",
  repNome: "José Luciano da Costa Roma",
  repCpf: "11144477735",
  repCargo: "sócio administrador",
});

const receptor = pessoa({
  id: "p3",
  nome: "MA Guilherme Consultoria Ltda",
  documento: "11444777000161",
  enderecoRua: "Rua Camargo Paes",
  enderecoNumero: "25",
  enderecoCidade: "Campinas",
  repNome: "Marcos A. Guilherme",
  repCpf: "52998224725",
  repCargo: "sócio",
});

function vinculo(p: Pessoa, papel: string, extras: Partial<ParteOperacao> = {}) {
  return {
    id: `parte-${p.id}-${papel}`,
    operacaoId: "op",
    pessoaId: p.id,
    papel,
    comissaoPercentual: null,
    ordemCadeia: null,
    criadoEm: new Date(),
    ...extras,
    pessoa: p,
  } as unknown as ParteOperacao & { pessoa: Pessoa };
}

const partes = [
  vinculo(divulgador, "DIVULGADOR"),
  vinculo(intermediario, "INTERMEDIARIO", { comissaoPercentual: 2.5 as never, ordemCadeia: 1 }),
  vinculo(receptor, "MANDATARIO_COMPRA"),
];

/** Mesmas partes, mesmos valores. So o ativo muda. */
const CASOS: Array<{ tipoAtivo: string; extras: Partial<Operacao> }> = [
  {
    tipoAtivo: "PRECATORIO",
    extras: {
      titulo: "Precatório TJSP — Município de Ribeirão Preto",
      tribunal: "Tribunal de Justiça do Estado de São Paulo",
      numeroPrecatorio: "2019.00874-3",
      enteDevedor: "Município de Ribeirão Preto",
      naturezaCredito: "COMUM",
      anoOrcamentario: 2027,
    } as Partial<Operacao>,
  },
  {
    tipoAtivo: "CREDITO_PIS_COFINS",
    extras: {
      titulo: "Crédito de PIS/COFINS homologado",
      tributo: "PIS e COFINS",
      processoAdmin: "10880.720123/2023-11",
      homologado: true,
    } as Partial<Operacao>,
  },
  {
    tipoAtivo: "OURO",
    extras: {
      titulo: "Ouro em barras — 100 kg",
      produto: "ouro em barras",
      teor: "999,9",
      forma: "barra de 1 kg",
      quantidade: 100 as never,
      unidade: "quilogramas",
      laudoEnsaio: "nº 4471/2026, Laboratório Metalquímica",
      tituloMinerario: "ANM 802.115/2019",
      incoterm: "FOB Guarulhos",
      destino: "Zurique, Suíça",
    } as Partial<Operacao>,
  },
  {
    tipoAtivo: "COMMODITY",
    extras: {
      titulo: "Açúcar VHP — 12.500 TM",
      produto: "açúcar VHP polarização 99",
      quantidade: 12500 as never,
      unidade: "toneladas métricas",
      incoterm: "CIF",
      origem: "Porto de Santos",
      destino: "Porto de Xiamen",
      embarque: "março de 2027",
    } as Partial<Operacao>,
  },
];

const CAMPOS = {
  prazoMeses: "24",
  comissaoPercentual: "2.5",
  multaPercentual: "30",
  multaPiso: "200000",
  transacoesFuturas: "sim",
};

async function principal() {
  const destino = path.join(process.cwd(), "exemplos", "ncnda-por-ativo");
  await fs.mkdir(destino, { recursive: true });

  console.log("");
  for (const caso of CASOS) {
    const operacao = {
      id: "op",
      organizacaoId: "org-exemplo",
      codigo: "OP-0001",
      tipoAtivo: caso.tipoAtivo,
      moeda: "BRL",
      valorFace: 1000000,
      desagioPercentual: 40,
      valorNegociado: 600000,
      comissaoPercentual: 2.5,
      fase: "NDA",
      confidencial: true,
      ...caso.extras,
      partes,
    } as unknown as Operacao & { partes: Array<ParteOperacao & { pessoa: Pessoa }> };

    const contexto: ContextoDocumento = {
      organizacao,
      operacao,
      usuario,
      campos: CAMPOS,
      agora: new Date(),
    };

    const perfil = perfilDoAtivo(caso.tipoAtivo);

    try {
      const documento = await gerarDocumento("NCNDA", contexto);
      const nome = `NCNDA-${caso.tipoAtivo}.docx`;
      await fs.writeFile(path.join(destino, nome), documento.buffer);

      console.log("=".repeat(78));
      console.log(`${perfil.nome}   (${caso.tipoAtivo})`);
      console.log("=".repeat(78));
      console.log(`  arquivo    ${nome}   ${documento.hashSha256.slice(0, 8).toUpperCase()}`);
      console.log(`  objeto     ${perfil.objeto}`);
      console.log(`  natureza   ${perfil.natureza}   ${perfil.vocabulario.transmitente} -> ${perfil.vocabulario.adquirente}`);
      console.log(`  garante    ${perfil.garante.length} itens`);
      console.log(`  NAO garante:`);
      perfil.naoGarante.forEach((n) => console.log(`      - ${n}`));
      console.log(`  risco central:`);
      console.log(`      ${quebrar(perfil.riscoCentral, 70, "      ")}`);
      console.log(`  advertencias: ${perfil.alertas.length}`);
      if (documento.pendencias.length > 0) {
        console.log(`  pendencias: ${documento.pendencias.join(" | ")}`);
      }
      console.log("");
    } catch (erro) {
      console.log(`  ERRO ${caso.tipoAtivo}: ${(erro as Error).message}`);
    }
  }

  console.log(`Arquivos em: ${destino}`);
}

function quebrar(texto: string, largura: number, recuo: string): string {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    if ((atual + " " + palavra).trim().length > largura) {
      linhas.push(atual.trim());
      atual = palavra;
    } else {
      atual += " " + palavra;
    }
  }
  if (atual.trim()) linhas.push(atual.trim());
  return linhas.join("\n" + recuo);
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
