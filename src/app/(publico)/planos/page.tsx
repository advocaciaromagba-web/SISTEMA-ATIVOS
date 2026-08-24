import Link from "next/link";
import { marca } from "@/lib/marca";
import { ADICIONAIS, DIAS_DE_TESTE, PLANOS, SERVICOS, economiaAnual } from "@/lib/planos";
import { moeda } from "@/lib/formato";

export const metadata = {
  title: "Planos e preços",
  description: "Preços publicados, sem consulta comercial. Teste antes de assinar.",
};

const limite = (valor: number | null, singular: string, plural: string) =>
  valor == null ? `${plural} sem limite` : `${valor} ${valor === 1 ? singular : plural}`;

export default function Planos() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Planos e preços</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
        Preços publicados. {DIAS_DE_TESTE} dias para testar antes de decidir. Pagando o ano de uma vez, dois meses
        saem de graça.
      </p>

      {/* ---------------- planos ---------------- */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANOS.map((plano) => (
          <div
            key={plano.chave}
            className={`flex flex-col rounded-xl border bg-white p-6 ${
              plano.destaque ? "border-2 shadow-md" : "border-slate-200 shadow-sm"
            }`}
            style={plano.destaque ? { borderColor: "var(--marca)" } : undefined}
          >
            {plano.destaque && (
              <span
                className="mb-3 self-start rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: "var(--marca)" }}
              >
                mais escolhido
              </span>
            )}

            <h2 className="text-xl font-semibold text-slate-900">{plano.nome}</h2>
            <p className="mt-1 text-sm text-slate-500">{plano.paraQuem}</p>

            <div className="mt-5">
              <div className="text-3xl font-semibold text-slate-900">
                {moeda(plano.precoMensal)}
                <span className="text-base font-normal text-slate-500"> /mês</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                ou {moeda(plano.precoAnual)} no ano — economia de {moeda(economiaAnual(plano))}
              </div>
            </div>

            <dl className="mt-5 space-y-1 border-y border-slate-100 py-4 text-sm text-slate-600">
              <Linha rotulo="Usuários" valor={limite(plano.limites.usuarios, "usuário", "usuários")} />
              <Linha rotulo="Operações ativas" valor={limite(plano.limites.operacoesAtivas, "operação", "operações")} />
              <Linha
                rotulo="Documentos por mês"
                valor={limite(plano.limites.documentosPorMes, "documento", "documentos")}
              />
              <Linha
                rotulo="Leitura de documentos"
                valor={plano.limites.leiturasIaPorMes > 0 ? `${plano.limites.leiturasIaPorMes} por mês` : "—"}
              />
              <Linha
                rotulo="Assinatura eletrônica"
                valor={plano.limites.assinaturasPorMes > 0 ? `${plano.limites.assinaturasPorMes} por mês` : "—"}
              />
              <Linha
                rotulo="Bureau de crédito"
                valor={plano.limites.consultasBureauPorMes > 0 ? `${plano.limites.consultasBureauPorMes} por mês` : "—"}
              />
            </dl>

            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
              {plano.inclui.map((linha, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: "var(--marca)" }}>•</span>
                  <span>{linha}</span>
                </li>
              ))}
            </ul>

            {plano.naoInclui && plano.naoInclui.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-slate-400">
                {plano.naoInclui.map((linha, i) => (
                  <li key={i}>não inclui: {linha}</li>
                ))}
              </ul>
            )}

            <Link
              href="/login"
              className={`mt-6 text-center ${plano.destaque ? "botao-principal" : "botao-secundario"}`}
            >
              Começar o teste
            </Link>
          </div>
        ))}
      </div>

      {/* ---------------- adicionais ---------------- */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-slate-900">Cobrado só quando usar</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          O que tem custo por unidade fica fora da mensalidade. Você paga pelo que consumir além do que o plano
          inclui — e o sistema avisa antes.
        </p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="tabela">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-right">Preço</th>
              </tr>
            </thead>
            <tbody>
              {ADICIONAIS.map((a) => (
                <tr key={a.chave}>
                  <td className="text-slate-700">{a.nome}</td>
                  <td className="text-right font-medium text-slate-900">
                    {moeda(a.preco)} <span className="font-normal text-slate-500">por {a.unidade}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- serviços ---------------- */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-slate-900">Due diligence com laudo assinado</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          Quando a decisão precisa de um documento que sustente a diligência, nossa equipe faz a verificação e
          entrega um relatório assinado — com o escopo declarado, os achados e, com o mesmo destaque, o que não foi
          possível verificar.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {SERVICOS.map((s) => (
            <div key={s.chave} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">{s.nome}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.descricao}</p>
              <div className="mt-4 text-2xl font-semibold text-slate-900">{moeda(s.preco)}</div>
              <div className="text-sm text-slate-500">
                entrega em {s.prazoUteis} {s.prazoUteis === 1 ? "dia útil" : "dias úteis"}
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
                {s.abrange.map((linha, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: "var(--marca)" }}>•</span>
                    <span>{linha}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="aviso-atencao mt-6">
          <strong className="block">O que um laudo assinado é, e o que não é</strong>
          <p className="mt-1">
            O relatório declara em que fontes olhamos, em que data, e o que ficou em aberto. Ele é peça de apoio à
            decisão: não substitui a análise jurídica do contrato, a auditoria contábil das partes nem a
            conferência do ativo no órgão de origem, e não constitui recomendação de investimento.
          </p>
        </div>
      </section>

      {/* ---------------- dúvidas ---------------- */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-slate-900">Perguntas que sempre aparecem</h2>

        <div className="mt-6 space-y-5">
          <Pergunta
            pergunta="Preciso de cartão para testar?"
            resposta={`Não. São ${DIAS_DE_TESTE} dias com o sistema inteiro liberado, e você decide depois.`}
          />
          <Pergunta
            pergunta="Posso trocar de plano depois?"
            resposta="A qualquer momento, para cima ou para baixo. A diferença é ajustada na cobrança seguinte."
          />
          <Pergunta
            pergunta="Meus dados ficam misturados com os de outro assinante?"
            resposta="Não. A separação é feita em toda consulta ao banco de dados, pelo identificador da sua empresa. Nenhuma tela do sistema consulta dado sem esse filtro."
          />
          <Pergunta
            pergunta="Se eu cancelar, perco o que já gerei?"
            resposta="Não. Antes do encerramento você exporta os documentos, os cadastros e os dossiês de auditoria."
          />
          <Pergunta
            pergunta="A consulta ao bureau está incluída?"
            resposta="No plano Mesa, 50 por mês. Nos demais, cobrada por consulta. O bureau é a única fonte que enxerga protesto, negativação e recuperação judicial, e a única que alcança pessoa física — por isso é cobrada à parte."
          />
          <Pergunta
            pergunta="Vocês são escritório de advocacia?"
            resposta="Não. A plataforma organiza a operação, gera as minutas e verifica as contrapartes. Os documentos devem ser revisados por advogado antes da assinatura."
          />
        </div>
      </section>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{rotulo}</dt>
      <dd className="text-right font-medium text-slate-900">{valor}</dd>
    </div>
  );
}

function Pergunta({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  return (
    <div>
      <h3 className="font-medium text-slate-900">{pergunta}</h3>
      <p className="mt-1 text-slate-600">{resposta}</p>
    </div>
  );
}
