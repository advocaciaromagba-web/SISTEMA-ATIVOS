import Link from "next/link";
import { marca } from "@/lib/marca";
import { VALIDADE_AUDITORIA_DIAS } from "@/lib/auditoria/executar";

export const metadata = {
  title: "Segurança",
  description: "Como os dados das operações são protegidos, separados por assinante e registrados.",
};

export default function Seguranca() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Segurança</h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600">
        Num sistema de intermediação, a informação <em>é</em> o ativo: quem detém o crédito, por quanto ele está
        sendo negociado, quem é a contraparte. Vazar isso não é incidente técnico — é perder o negócio para quem
        vazou. O que segue é como isso é tratado aqui.
      </p>

      <Bloco titulo="Separação entre assinantes">
        <p>
          Cada assinante tem seus dados isolados, e a separação não depende de a tela lembrar de filtrar: toda
          consulta ao banco de dados carrega obrigatoriamente o identificador da empresa, vindo da sessão de quem
          está logado. Uma tela nova que esqueça esse filtro simplesmente não retorna dado.
        </p>
        <p>
          O mesmo vale para os arquivos. Baixar um contrato ou uma certidão exige que o documento pertença à sua
          empresa — não basta ter o endereço do arquivo.
        </p>
      </Bloco>

      <Bloco titulo="Acesso">
        <p>
          Entrada por e-mail e senha, com verificação em duas etapas por aplicativo autenticador. Cinco tentativas
          erradas travam o e-mail por quinze minutos, e a senha é conferida mesmo quando o e-mail não existe — para
          que o tempo de resposta não revele quais contas estão cadastradas.
        </p>
        <p>
          As senhas não são guardadas: fica apenas um resumo criptográfico irreversível. Nem nós conseguimos ler a
          sua senha.
        </p>
        <p>
          Dentro da empresa, os acessos são separados por papel: dono, operador e somente leitura. Só o dono libera
          uma parte bloqueada pela auditoria, e essa liberação exige justificativa escrita que fica registrada com
          o nome dele.
        </p>
      </Bloco>

      <Bloco titulo="Registro do que acontece">
        <p>
          Cada entrada no sistema, cada alteração de cadastro, cada documento gerado e cada arquivo baixado ficam
          registrados com autor, data, hora e endereço de origem. Esse registro não é editado nem apagado pelo
          sistema — nem por você, nem por nós.
        </p>
        <p>
          É o que responde à pergunta que aparece justamente quando uma operação dá errado: quem fez isso, e
          quando.
        </p>
      </Bloco>

      <Bloco titulo="Integridade dos documentos">
        <p>
          Todo documento gerado recebe uma impressão digital criptográfica, calculada sobre o arquivo inteiro. Ela
          aparece na tela e o código curto vai impresso no rodapé do próprio documento.
        </p>
        <p>
          Se alguém alterar um único caractere do arquivo depois de emitido, essa impressão muda. É assim que se
          prova, meses depois, que o documento que está na sua mão é o mesmo que saiu daqui.
        </p>
      </Bloco>

      <Bloco titulo="As verificações ficam guardadas">
        <p>
          Toda consulta feita a fontes externas é arquivada com a resposta completa e a data. Não guardamos apenas
          a conclusão: guardamos o que a fonte respondeu naquele momento.
        </p>
        <p>
          É isso que permite reapresentar, a qualquer tempo, a prova de que a diligência foi feita — e do que ela
          mostrava no dia. As auditorias vencem em {VALIDADE_AUDITORIA_DIAS} dias, porque situação cadastral muda e
          verificação velha apresentada como atual é pior que verificação nenhuma.
        </p>
      </Bloco>

      <Bloco titulo="Sigilo das operações">
        <p>
          Operações podem ser marcadas como confidenciais. Os documentos de sigilo — NDA e NCNDA — são gerados
          pela própria plataforma, com a cadeia de intermediação nomeada, para que a proteção alcance quem
          realmente apresentou o negócio.
        </p>
        <p>
          Não usamos os dados das suas operações para nada além de operá-las para você. Não vendemos, não
          cruzamos com dados de outros assinantes e não os usamos para treinar modelo nenhum.
        </p>
      </Bloco>

      <Bloco titulo="O que ainda depende de você">
        <p>
          Segurança de sistema tem uma parte que nenhum fornecedor resolve sozinho. Ligue a verificação em duas
          etapas para todos os acessos da sua equipe, não compartilhe login entre pessoas, e desative o acesso de
          quem sair da empresa no mesmo dia.
        </p>
        <p>
          O sistema mostra, na tela de configurações, quais usuários ainda estão sem a segunda etapa ligada.
        </p>
      </Bloco>

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Encontrou uma falha?</h2>
        <p className="mt-2 leading-relaxed text-slate-600">
          Escreva para{" "}
          {marca.emailSuporte ? (
            <a href={`mailto:${marca.emailSuporte}`} className="font-medium underline">
              {marca.emailSuporte}
            </a>
          ) : (
            <span className="text-amber-700">o e-mail de contato</span>
          )}{" "}
          com o que você encontrou. Respondemos, corrigimos e avisamos quem foi afetado. Se houver incidente com
          dados pessoais, comunicamos a Autoridade Nacional de Proteção de Dados e os titulares, na forma da{" "}
          <Link href="/privacidade" className="underline">
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
