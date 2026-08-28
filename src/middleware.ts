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
 * - /login, /cadastro ... senão não haveria como entrar nem como assinar
 * - /licitacoes, /compliance, /serasa ... soluções com login PRÓPRIO —
 *                    cada uma confere a própria sessão em cada página
 *                    (exigirSessaoX()), e nunca deve passar pelo middleware
 *                    da Gestão de Ativos. Bug real encontrado em produção:
 *                    sem esta exclusão, TODA página dessas soluções
 *                    (entrar, cadastro, painel) redirecionava para o login
 *                    da Gestão de Ativos, deixando as duas inacessíveis.
 * - /api ........... cada rota confere a sessão por conta própria, e os
 *                    webhooks de pagamento são chamados de fora, sem sessão
 * - estáticos ...... arquivos da própria página
 */
export const config = {
  matcher: [
    // O `.+` no fim (em vez de `.*`) deixa a raiz "/" de fora: ela é a página
    // pública de apresentação. As demais páginas públicas estão nomeadas.
    "/((?!login|cadastro|licitacoes|compliance|serasa|api|solucoes|planos|institucional|termos|privacidade|seguranca|fontes|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).+)",
  ],
};
