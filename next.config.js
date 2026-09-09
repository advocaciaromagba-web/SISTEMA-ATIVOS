/**
 * Configuração de produção do Next.js.
 *
 * Existia zero configuração própria antes disto — nenhum cabeçalho de
 * segurança saía nas respostas. O HTTPS em si já funcionava (o Railway
 * provisiona o certificado e redireciona HTTP para HTTPS automaticamente),
 * mas cabeçalho de segurança é outra camada, e nenhuma vinha configurada:
 * nada dizia ao navegador para recusar carregar o site num iframe alheio,
 * para não adivinhar o tipo de um arquivo, ou para sempre usar HTTPS mesmo
 * que alguém digite "http://" por engano.
 *
 * Os cabeçalhos abaixo valem para toda rota, e nenhum deles muda o
 * comportamento visível do site — só o que o navegador faz por trás.
 */

const seisdMeses = 60 * 60 * 24 * 180;

const cabecalhosDeSeguranca = [
  {
    // Instrui o navegador a sempre usar HTTPS neste domínio pelos próximos
    // 180 dias, mesmo que alguém digite "http://" de propósito ou por
    // engano — fecha a janela de um ataque de downgrade nesse meio-tempo.
    // Sem "preload": entrar para a lista de pré-carregamento dos navegadores
    // é quase irreversível (fica gravado no binário do Chrome/Firefox por
    // muito tempo, mesmo depois de removido daqui) — é uma decisão à parte,
    // não um padrão para ligar de passagem.
    key: "Strict-Transport-Security",
    value: `max-age=${seisdMeses}; includeSubDomains`,
  },
  {
    // Nenhuma página deste site tem por que ser exibida dentro de um
    // <iframe> de outro site. Sem isso, um site malicioso poderia sobrepor
    // um iframe invisível do Blackbird sobre botões falsos (clickjacking) —
    // por exemplo, cobrir um "Confirmar assinatura" de verdade.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Impede que o navegador tente "adivinhar" o tipo de um arquivo servido
    // com Content-Type diferente do real — uma via clássica de fazer um
    // navegador executar como script algo que devia ser só dado.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Ao sair para outro site por um link, o navegador manda só a origem
    // (blackbirdsolucoes.com.br), não a página exata visitada — protege
    // contra vazar, no cabeçalho Referer, que caminho do sistema alguém
    // estava usando quando clicou num link externo.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // A plataforma nunca precisa de câmera, microfone ou geolocalização do
    // navegador — desligar explicitamente impede que um script de terceiro
    // (ou um bug futuro) peça essas permissões sem que ninguém tenha notado.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O gerador de documentos usa a biblioteca "docx" no servidor. Sem isto o
  // Next tenta empacotá-la para o navegador e a build quebra.
  serverExternalPackages: ["docx", "@prisma/client", "bcryptjs", "otplib"],

  experimental: {
    // O Next recusa, por padrão, qualquer Server Action com corpo maior que
    // 1 MB — antes mesmo do código da ação rodar, com "Body exceeded 1 MB
    // limit" (HTTP 413), sem chegar no try/catch de ninguém. Toda tela de
    // upload deste sistema (contrato do Agrojud, certidão do Compliance,
    // edital de Licitações, documento de Verificação...) já validava um
    // limite próprio de 10 a 20 MB no código — mas esse código nunca era
    // alcançado para qualquer arquivo acima de 1 MB, porque o Next barrava
    // antes. Um PDF de contrato escaneado passa de 1 MB com facilidade; daí
    // o "This page couldn't load" ao carregar o contrato. 20 MB cobre o
    // maior limite já declarado no código (edital de licitação).
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },

  // Some com o cabeçalho "X-Powered-By: Next.js". Não protege nada sozinho,
  // mas também não há motivo para anunciar de graça, para quem for procurar
  // falha conhecida do framework, qual framework e versão o site roda.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: cabecalhosDeSeguranca,
      },
      {
        // Área interna: pede aos buscadores para nunca indexar, em toda
        // rota administrativa — não só na tela de login, como estava.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

module.exports = nextConfig;
