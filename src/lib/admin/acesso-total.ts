/**
 * Acesso do administrador da Blackbird às soluções, como usuário comum.
 *
 * O administrador entra em qualquer solução pela tela de login NORMAL dela,
 * com o mesmo e-mail e a mesma senha da administração, e usa a solução inteira
 * sem assinatura, sem cota de teste e sem limite.
 *
 * Quatro decisões sustentam isto:
 *
 * 1. **Toda linha de dado pertence a uma conta.** Empresa, licitante, pessoa,
 *    contrato, documento: nenhuma dessas tabelas aceita linha sem conta, e
 *    toda consulta filtra por ela. Não existe "usar a solução sem conta" —
 *    então o administrador tem, em cada solução, uma conta da própria casa,
 *    criada sozinha no primeiro acesso. Ela mora na tabela daquela solução
 *    como qualquer outra: o isolamento entre soluções continua de pé, e o
 *    trabalho do administrador não se mistura com o de nenhum cliente.
 *
 * 2. **Quem solta os limites é o `statusAssinatura = "INTERNA"`.** Ver
 *    `src/lib/acesso-interno.ts`.
 *
 * 3. **A senha da conta interna não abre nada.** O `passwordHash` dela é de um
 *    segredo aleatório descartado na mesma linha em que é criado — ninguém,
 *    nem o próprio administrador, entra por ela pelo caminho comum. O único
 *    jeito de assumir essa conta é provando ser administrador, aqui.
 *
 * 4. **A exigência não afrouxa.** Se o administrador tem verificação em duas
 *    etapas ligada, ela é pedida também aqui. Seria um contrassenso o acesso
 *    irrestrito ser mais fácil de obter que o restrito.
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { verify as verificarCodigoOtp } from "otplib";
import { prisma } from "@/lib/prisma";
import { descritor, modelo, type ChaveSolucaoAdmin } from "@/lib/admin/solucoes";
import { NOME_CONTA_INTERNA, STATUS_INTERNA } from "@/lib/acesso-interno";
import type { ModeloGenerico } from "@/lib/modelo-prisma";

/** O que o `authorize()` de cada solução precisa devolver. */
export type UsuarioInterno = {
  id: string;
  nome: string;
  email: string;
  contaId: string;
  papel: string;
};

type AdministradorMinimo = { id: string; nome: string; email: string; passwordHash: string; ativo: boolean };

/**
 * Um e-mail que não colida com cliente nenhum daquela solução.
 *
 * O normal é o usuário interno ficar com o próprio e-mail do administrador —
 * é a mesma pessoa, e é o que aparece no cabeçalho do painel. Só que o e-mail
 * é único por solução: se algum cliente daquela solução já tiver cadastrado
 * exatamente esse endereço, tomá-lo seria roubar a conta dele.
 */
async function emailLivre(usuarios: ModeloGenerico, emailDoAdmin: string): Promise<string> {
  const ocupado = await usuarios.findFirst({ where: { email: emailDoAdmin } });
  if (!ocupado) return emailDoAdmin;

  const [local, dominio] = emailDoAdmin.split("@");
  return `${local}+interno@${dominio}`;
}

/**
 * A conta interna daquela solução, criando-a se ainda não existir.
 *
 * Procura por status E nome juntos: se um dia uma conta de cliente for parar
 * no status interno por engano, ela não é adotada como sendo a da casa.
 */
async function garantirContaInterna(
  chave: ChaveSolucaoAdmin,
  admin: AdministradorMinimo
): Promise<UsuarioInterno> {
  const d = descritor(chave);
  if (!d) throw new Error(`Solução desconhecida: ${chave}`);

  const contas = modelo(d.modeloConta);
  const usuarios = modelo(d.modeloUsuario);

  const encontrada = await contas.findFirst({
    where: { statusAssinatura: STATUS_INTERNA, nome: NOME_CONTA_INTERNA },
    orderBy: { criadoEm: "asc" },
  });

  const conta =
    encontrada ??
    (await contas.create({
      data: {
        tipo: "PJ",
        nome: NOME_CONTA_INTERNA,
        emailContato: admin.email,
        statusAssinatura: STATUS_INTERNA,
      },
    }));

  const contaId = String(conta.id);

  const jaExiste = (await usuarios.findFirst({
    where: { [d.campoContaNoUsuario]: contaId },
    orderBy: { criadoEm: "asc" },
  })) as (Record<string, unknown> & { id: string; nome: string; email: string; papel?: string }) | null;

  if (jaExiste) {
    // O nome do administrador pode ter mudado desde o primeiro acesso.
    if (jaExiste.nome !== admin.nome) {
      await usuarios.update({ where: { id: jaExiste.id }, data: { nome: admin.nome } });
    }
    return {
      id: jaExiste.id,
      nome: admin.nome,
      email: jaExiste.email,
      contaId,
      papel: String(jaExiste.papel ?? "DONO"),
    };
  }

  const senhaImpossivel = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  const criado = (await usuarios.create({
    data: {
      [d.campoContaNoUsuario]: contaId,
      nome: admin.nome,
      email: await emailLivre(usuarios, admin.email),
      passwordHash: senhaImpossivel,
      papel: "DONO",
    },
  })) as Record<string, unknown> & { id: string; email: string };

  return { id: criado.id, nome: admin.nome, email: criado.email, contaId, papel: "DONO" };
}

/**
 * Tenta autenticar as credenciais como sendo do administrador da Blackbird.
 *
 * Devolve `null` — sem barulho — sempre que não for o caso: e-mail que não é
 * de administrador, ou que é mas veio com a senha errada. Nesses casos quem
 * decide é o login normal da solução, que continua rodando logo depois. Isso
 * também cobre o caso raro de um cliente cadastrado com o mesmo e-mail do
 * administrador: com a senha dele, ele entra na conta dele.
 */
export async function autorizarAdminNaSolucao(
  chave: ChaveSolucaoAdmin,
  credenciais: { email?: string; senha?: string; codigo?: string } | undefined
): Promise<UsuarioInterno | null> {
  const email = (credenciais?.email ?? "").toLowerCase().trim();
  const senha = credenciais?.senha ?? "";
  if (!email || !senha) return null;

  const admin = (await prisma.administrador.findUnique({ where: { email } })) as AdministradorMinimo | null;
  if (!admin || !admin.ativo) return null;

  const senhaConfere = await bcrypt.compare(senha, admin.passwordHash);
  if (!senhaConfere) return null;

  const comTotp = admin as AdministradorMinimo & { totpAtivado?: boolean; totpSegredo?: string | null };
  if (comTotp.totpAtivado && comTotp.totpSegredo) {
    const codigo = (credenciais?.codigo ?? "").trim().replace(/\s/g, "");
    // A tela de login de cada solução já reconhece esta mensagem e passa a
    // pedir o código — o mesmo protocolo do login comum.
    if (!codigo) throw new Error("CODIGO_NECESSARIO");

    const conferencia = await verificarCodigoOtp({ secret: comTotp.totpSegredo, token: codigo });
    if (!conferencia.valid) throw new Error("Código de verificação inválido.");
  }

  const usuario = await garantirContaInterna(chave, admin);
  const d = descritor(chave);

  // Gravado direto, sem passar pelo helper de auditoria, pelo mesmo motivo que
  // `src/lib/admin/auth.ts` faz assim: evitar ciclo de import no login.
  await prisma.adminAuditoria.create({
    data: {
      administradorId: admin.id,
      administradorNome: admin.nome,
      administradorEmail: admin.email,
      acao: "ACESSO_INTERNO",
      solucao: chave,
      alvoTipo: "CONTA",
      alvoId: usuario.contaId,
      resumo: `Entrou em ${d?.rotulo ?? chave} pela conta interna da Blackbird.`,
    },
  });

  return usuario;
}
