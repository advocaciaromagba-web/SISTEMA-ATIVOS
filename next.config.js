/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O gerador de documentos usa a biblioteca "docx" no servidor. Sem isto o
  // Next tenta empacotá-la para o navegador e a build quebra.
  experimental: {
    serverComponentsExternalPackages: ["docx", "@prisma/client", "bcryptjs", "otplib"],
  },
};

module.exports = nextConfig;
