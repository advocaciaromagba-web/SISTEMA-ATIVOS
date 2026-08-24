import Link from "next/link";
import { marca } from "@/lib/marca";
import { VALIDADE_AUDITORIA_DIAS } from "@/lib/auditoria/executar";

export const metadata = {
  title: "Política de privacidade",
  description: "Como os dados pessoais são tratados, com que base legal, por quanto tempo e como exercer direitos.",
};

const empresa = marca.razaoSocial || marca.nome;

export default function Privacidade() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Política de privacidade</h1>
      <p className="mt-2 text-sm text-slate-500">
        Como {empresa} trata dados pessoais na plataforma {marca.nome}, conforme a Lei nº 13.709/2018.
      </p>

      <Secao numero="1" titulo="Duas relações diferentes, e isso muda tudo">
        <p>
          Nesta plataforma existem dois tipos de dado pessoal, com papéis distintos — e a lei trata cada um de um
          jeito.
        </p>
        <p>
          <strong>Dados de quem assina.</strong> Nome, e-mail, CPF ou CNPJ e dados de cobrança de quem contrata e
          de quem usa o sistema. Aqui {empresa} é <strong>controladora</strong>: decide por que e como tratar.
        </p>
        <p>
          <strong>Dados das contrapartes cadastradas pelo assinante.</strong> Os cedentes, cessionários,
          intermediários e representantes que o assinante insere para operar. Aqui {empresa} é{" "}
          <strong>operadora</strong>: trata esses dados por conta e ordem do assinante, que é o controlador e
          responde por ter base legal para inseri-los.
        </p>
      </Secao>

      <Secao numero="2" titulo="Que dados são tratados">
        <p>
          <strong>De quem assina:</strong> identificação e contato, dados da empresa, credenciais de acesso
          (guardadas apenas como resumo criptográfico irreversível), registros de acesso com data, hora e endereço
          de origem, e dados de cobrança.
        </p>
        <p>
          <strong>Das contrapartes:</strong> qualificação civil e empresarial, endereço, contato, documentos de
          identificação enviados, certidões apresentadas e o resultado das consultas a fontes públicas.
        </p>
        <p>
          <strong>Dados sensíveis e de natureza criminal.</strong> Certidões criminais e resultados de consultas
          sobre processos, quando o assinante as insere, recebem tratamento restrito: são usadas somente para a
          análise de contraparte e para o cumprimento das obrigações da Lei nº 9.613/1998, nunca para outra
          finalidade, e o acesso a elas fica registrado.
        </p>
      </Secao>

      <Secao numero="3" titulo="Com que base legal">
        <ul className="list-inside list-disc space-y-1.5">
          <li>
            <strong>Execução de contrato</strong> (art. 7º, V): tudo o que é necessário para operar a plataforma
            para quem assinou.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal</strong> (art. 7º, II): verificação de contraparte, guarda de
            registros e conservação de documentos exigidos pela legislação de prevenção à lavagem de dinheiro e
            pela legislação fiscal.
          </li>
          <li>
            <strong>Legítimo interesse</strong> (art. 7º, IX): segurança da plataforma, prevenção a fraude e
            registro de auditoria. Sempre limitado ao necessário e sem sobrepor direitos dos titulares.
          </li>
          <li>
            <strong>Exercício regular de direitos</strong> (art. 7º, VI): conservação do que possa ser necessário
            em processo judicial ou administrativo.
          </li>
        </ul>
        <p>
          Não usamos dados pessoais para publicidade, não os vendemos, não os cedemos a terceiros para uso próprio
          deles e <strong>não os usamos para treinar modelos de inteligência artificial</strong>.
        </p>
      </Secao>

      <Secao numero="4" titulo="Com quem os dados são compartilhados">
        <p>Apenas com quem é necessário para o serviço funcionar, e sempre no limite da finalidade:</p>
        <ul className="list-inside list-disc space-y-1.5">
          <li>provedor de hospedagem e banco de dados;</li>
          <li>
            provedor de inteligência artificial, quando o assinante envia um documento para leitura — apenas o
            arquivo enviado, para extrair os campos, sem uso para treinamento;
          </li>
          <li>provedor de assinatura eletrônica, quando o assinante manda um documento assinar;</li>
          <li>provedor de meios de pagamento, para cobrança da assinatura;</li>
          <li>bureau de crédito, quando o assinante solicita a consulta;</li>
          <li>autoridades públicas, quando houver requisição legal.</li>
        </ul>
        <p>
          As consultas a fontes públicas — Receita Federal, PGFN, CNJ, listas de sanções — são feitas por nós às
          bases oficiais; elas não recebem dado seu além do documento consultado.
        </p>
      </Secao>

      <Secao numero="5" titulo="Por quanto tempo">
        <ul className="list-inside list-disc space-y-1.5">
          <li>
            <strong>Enquanto durar a assinatura</strong>, os dados operacionais permanecem disponíveis. Auditorias
            vencem em {VALIDADE_AUDITORIA_DIAS} dias para fins de uso, mas o dossiê continua arquivado como prova
            da diligência feita.
          </li>
          <li>
            <strong>Encerrada a assinatura</strong>, trinta dias para exportação e então eliminação, ressalvado o
            que segue.
          </li>
          <li>
            <strong>Registros de acesso</strong>: seis meses, no mínimo, conforme o Marco Civil da Internet.
          </li>
          <li>
            <strong>Documentos, dossiês e registros ligados a obrigações da Lei nº 9.613/1998</strong>: pelo prazo
            que a legislação exigir, ainda que a assinatura tenha terminado. Essa conservação é obrigação legal e
            não pode ser dispensada a pedido.
          </li>
          <li>
            <strong>Dados fiscais da cobrança</strong>: pelos prazos da legislação tributária.
          </li>
        </ul>
      </Secao>

      <Secao numero="6" titulo="Direitos dos titulares">
        <p>
          Qualquer titular pode pedir confirmação de tratamento, acesso, correção, anonimização, portabilidade,
          informação sobre compartilhamentos e, quando cabível, eliminação ou oposição ao tratamento.
        </p>
        <p>
          <strong>Um ponto importante:</strong> se o dado foi inserido por um assinante — o caso das contrapartes —
          quem decide sobre ele é esse assinante, como controlador. Recebendo o pedido, nós o encaminhamos a ele e
          acompanhamos a resposta, mas não alteramos nem apagamos por conta própria dado de operação alheia.
        </p>
        <p>
          Pedidos são respondidos em até quinze dias. Direito de eliminação não alcança o que a lei obriga a
          conservar.
        </p>
      </Secao>

      <Secao numero="7" titulo="Segurança e incidentes">
        <p>
          As medidas técnicas estão descritas na{" "}
          <Link href="/seguranca" className="underline">
            página de segurança
          </Link>
          : separação por assinante em toda consulta, verificação em duas etapas, senhas irreversíveis, registro
          imutável de acessos e impressão digital nos documentos.
        </p>
        <p>
          Havendo incidente de segurança com risco relevante aos titulares, comunicamos a Autoridade Nacional de
          Proteção de Dados e os titulares afetados em prazo razoável, informando o que ocorreu, quais dados
          foram atingidos e o que está sendo feito — na forma do art. 48 da Lei nº 13.709/2018.
        </p>
      </Secao>

      <Secao numero="8" titulo="Encarregado pelo tratamento de dados">
        <p>
          Para exercer direitos ou tirar dúvidas sobre esta política, procure o encarregado:
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 py-2">
            <span className="text-slate-500">Encarregado</span>
            <span className="font-medium text-slate-900">
              {marca.encarregadoNome || <span className="font-normal text-amber-700">a nomear na configuração</span>}
            </span>
          </div>
          <div className="flex flex-wrap justify-between gap-3 py-2">
            <span className="text-slate-500">Contato</span>
            <span className="font-medium text-slate-900">
              {marca.encarregadoEmail || marca.emailSuporte || (
                <span className="font-normal text-amber-700">a preencher na configuração</span>
              )}
            </span>
          </div>
        </div>
        <p className="text-sm">
          A indicação e a divulgação do encarregado são exigidas pelo art. 41 da Lei nº 13.709/2018.
        </p>
      </Secao>

      <Secao numero="9" titulo="Alterações">
        <p>
          Mudanças relevantes nesta política são comunicadas por e-mail e dentro da plataforma, com trinta dias de
          antecedência.
        </p>
      </Secao>

      <div className="aviso-atencao mt-12">
        <strong className="block">Antes de publicar</strong>
        <p className="mt-1">
          Esta política foi escrita para refletir o que o sistema realmente faz, e não um modelo genérico. Ainda
          assim, deve ser revisada por advogado e confrontada com a operação real antes de entrar no ar — em
          especial os prazos de retenção e a lista de operadores contratados.
        </p>
      </div>
    </div>
  );
}

function Secao({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-xl font-semibold text-slate-900">
        {numero}. {titulo}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
