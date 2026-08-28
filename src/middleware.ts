import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

/**
 * Exige login em TUDO, menos no que está liberado abaixo.
 *
 * A regra é ao contrário de propósito: com lista de telas protegidas escrita à
 * mão, cada tela nova nasce aberta e ninguém percebe. Aqui, tela nova nasce
 * protegida.
 *
 * Ficam de fora:
 * - /login ......... senão não haveria como entrar
 * - /api ........... cada rota confere a sessão por conta própria, e os
 *                    webhooks de pagamento são chamados de fora, sem sessão
 * - estáticos ...... arquivos da própria página
 */
export const config = {
  matcher: [
    // O `.+` no fim (em vez de `.*`) deixa a raiz "/" de fora: ela é a página
    // pública de apresentação. As demais páginas públicas estão nomeadas.
    "/((?!login|api|solucoes|planos|institucional|termos|privacidade|seguranca|fontes|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).+)",
  ],
};
