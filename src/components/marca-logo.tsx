import Image from "next/image";

/**
 * A marca na tela, nas três formas em que ela aparece.
 *
 * Existe um componente só para isso porque logotipo espalhado em cinco telas
 * vira cinco tamanhos diferentes e dois recortes errados. E porque a plataforma
 * é vendida sob a marca de quem a opera: trocando o arquivo em `public/marca`
 * e as variáveis do `.env`, o sistema inteiro muda de dono.
 *
 *  - `horizontal` — logotipo completo em azul, para fundo claro.
 *  - `simbolo`    — só o pássaro dourado, para a barra escura do painel.
 *  - `vertical`   — o lockup inteiro sobre azul, para a tela de entrada.
 *
 * O nome da marca chega por propriedade, e não do `@/lib/marca`, porque estes
 * componentes também são usados dentro de componentes de cliente — e lá o
 * `process.env` não existe. Ler a marca aqui devolveria o valor padrão e a
 * tela do assinante apareceria com o nome errado.
 */
type Forma = "horizontal" | "simbolo" | "vertical";

const ARQUIVOS: Record<Forma, { src: string; largura: number; altura: number }> = {
  horizontal: { src: "/marca/horizontal.png", largura: 900, altura: 257 },
  simbolo: { src: "/marca/simbolo.png", largura: 256, altura: 242 },
  vertical: { src: "/marca/vertical.png", largura: 720, altura: 483 },
};

export function MarcaLogo({
  forma = "horizontal",
  altura = 32,
  className = "",
  prioridade = false,
  alt = "",
}: {
  forma?: Forma;
  /** Altura em pixels na tela. A largura acompanha a proporção. */
  altura?: number;
  className?: string;
  /** Liga para a marca que aparece antes de qualquer rolagem. */
  prioridade?: boolean;
  /**
   * Texto alternativo. Fica vazio de propósito quando o nome da marca já está
   * escrito ao lado: leitor de tela que anuncia o mesmo nome duas vezes atrapalha
   * em vez de ajudar.
   */
  alt?: string;
}) {
  const arquivo = ARQUIVOS[forma];
  const largura = Math.round((arquivo.largura / arquivo.altura) * altura);

  return (
    <Image
      src={arquivo.src}
      alt={alt}
      width={largura}
      height={altura}
      priority={prioridade}
      className={className}
      style={{ height: altura, width: "auto" }}
    />
  );
}

/**
 * Marca da barra escura: pássaro dourado ao lado do nome.
 *
 * O nome vem em texto, não em imagem, por dois motivos — acompanha a fonte da
 * marca sem virar arquivo novo a cada ajuste, e continua legível para leitor
 * de tela e para quem aumenta o tamanho da letra.
 */
export function MarcaEscura({
  nome,
  assinatura,
  altura = 30,
}: {
  nome: string;
  assinatura?: string;
  altura?: number;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <MarcaLogo forma="simbolo" altura={altura} prioridade />
      <span className="leading-none">
        <span className="titulo block text-base font-bold uppercase tracking-[0.14em] text-white">{nome}</span>
        {assinatura && (
          <span className="mt-1 block text-[10px] uppercase tracking-[0.28em] text-[color:var(--marca-destaque)]">
            {assinatura}
          </span>
        )}
      </span>
    </span>
  );
}
