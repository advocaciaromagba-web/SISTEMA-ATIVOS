"use server";

import { revalidatePath } from "next/cache";
import { exigirSessaoAgro } from "@/lib/agro/sessao";
import { obterAcompanhamentoMp } from "@/lib/agro/acompanhamento";

/**
 * Reconsulta a situação da MP na hora, ignorando o que estava guardado.
 *
 * Existe porque o dia em que a MP muda de estado é justamente o dia em que
 * ninguém quer esperar a validade do cache expirar.
 */
export async function conferirVigenciaAgora(): Promise<void> {
  await exigirSessaoAgro();
  await obterAcompanhamentoMp({ forcar: true });
  revalidatePath("/agrojud/painel", "layout");
}
