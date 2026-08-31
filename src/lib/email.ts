import { Resend } from "resend";
import { marca } from "@/lib/marca";

/**
 * Envio de e-mails transacionais (hoje só redefinição de senha).
 *
 * Compartilhado entre as soluções porque é infraestrutura pura — não guarda
 * nem expõe dado de nenhuma solução. O que continua isolado por solução é o
 * conteúdo de cada e-mail e o link de redefinição.
 */

let cliente: Resend | null = null;

function clienteResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada — não é possível enviar e-mail.");
  }
  if (!cliente) cliente = new Resend(process.env.RESEND_API_KEY);
  return cliente;
}

function remetente(): string {
  const email = process.env.RESEND_FROM_EMAIL || marca.emailSuporte || "contato@blackbirdsolucoes.com.br";
  return `${marca.nome} <${email}>`;
}

/** Rodapé com identificação da empresa, repetido em todo e-mail transacional. */
function assinatura(): string {
  const contatos = [marca.telefone, marca.emailSuporte].filter(Boolean).join(" · ");
  return `
    <table role="presentation" width="100%" style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
      <tr>
        <td>
          <p style="margin: 0; color: #1e293b; font-size: 13px; font-weight: 600;">${marca.nome}${marca.assinatura ? ` — ${marca.assinatura}` : ""}</p>
          ${contatos ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">${contatos}</p>` : ""}
          ${marca.site ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;"><a href="${marca.site}" style="color:#94a3b8;">${marca.site.replace(/^https?:\/\//, "")}</a></p>` : ""}
        </td>
      </tr>
    </table>
  `;
}

export async function enviarEmailRedefinicaoSenha(params: {
  destinatario: string;
  nomeSolucao: string;
  link: string;
}): Promise<void> {
  const { destinatario, nomeSolucao, link } = params;

  const resultado = await clienteResend().emails.send({
    from: remetente(),
    to: destinatario,
    subject: `Redefinir senha — ${nomeSolucao}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
        <img src="${marca.site}/marca/horizontal.png" alt="${marca.nome}" width="160" style="display:block; margin: 0 0 24px;" />
        <p>Foi pedida a redefinição da senha da sua conta em <strong>${nomeSolucao}</strong>, na ${marca.nome}.</p>
        <p>Se foi você, clique no link abaixo para escolher uma nova senha. Ele vale por 1 hora.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
            Redefinir senha
          </a>
        </p>
        <p style="color:#64748b;font-size:13px;">Se não foi você quem pediu, pode ignorar este e-mail — sua senha continua a mesma.</p>
        ${assinatura()}
      </div>
    `,
  });

  // O SDK do Resend não lança exceção em erro da API — devolve { error } no
  // próprio retorno. Sem checar isso à mão, todo envio falho passava por
  // "enviado com sucesso" pra quem pediu a redefinição.
  if (resultado.error) {
    throw new Error(resultado.error.message || "Falha ao enviar e-mail pelo Resend.");
  }
}
