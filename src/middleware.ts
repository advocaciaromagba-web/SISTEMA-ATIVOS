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
 * - /entrar ........ tela de escolha de solução, antes de saber qual login usar
 * - /login, /cadastro, /esqueci-senha, /redefinir-senha ... senão não haveria como entrar,
 *                    assinar nem recuperar acesso à Gestão de Ativos
 * - /cliente ....... conta única do assinante, login PRÓPRIO — escolhe e
 *                    troca entre as seis soluções sem precisar de um
 *                    cadastro por solução
 * - /licitacoes, /compliance, /serasa, /diligencia, /verificacao ... soluções com login PRÓPRIO —
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
    "/((?!entrar|login|cadastro|esqueci-senha|redefinir-senha|cliente|licitacoes|compliance|serasa|diligencia|verificacao|api|solucoes|planos|institucional|termos|privacidade|seguranca|fontes|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).+)",
  ],
};
