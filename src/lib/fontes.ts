/**
 * Tipografia da marca.
 *
 * O manual da Blackbird define dois papéis: título em sans-serif bold e texto
 * secundário em serifada regular. Aqui isso vira três famílias, cada uma com
 * um trabalho:
 *
 *  - Montserrat, geométrica, é a que mais se aproxima do desenho do logotipo.
 *    Fica nos títulos, onde a forma da letra é lida como identidade.
 *  - Inter foi desenhada para tela e continua legível em corpo pequeno. É o
 *    texto da interface — rótulo de campo, tabela, botão. Título bonito que
 *    cansa a vista em formulário é título no lugar errado.
 *  - Lora é a serifada do manual, reservada a texto de leitura corrida e a
 *    trechos que pedem formalidade.
 *
 * As três vêm pelo `next/font`, que baixa os arquivos na compilação e os serve
 * do próprio domínio: a página não depende de servidor de terceiro para
 * desenhar, e não há requisição saindo para o Google quando alguém abre o site.
 */
import { Inter, Lora, Montserrat } from "next/font/google";

export const fonteTexto = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--fonte-texto",
});

export const fonteTitulo = Montserrat({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
  variable: "--fonte-titulo",
});

export const fonteSerifada = Lora({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--fonte-serifada",
});

/** Classe que liga as três variáveis no elemento raiz. */
export const classesDeFonte = [fonteTexto.variable, fonteTitulo.variable, fonteSerifada.variable].join(" ");
