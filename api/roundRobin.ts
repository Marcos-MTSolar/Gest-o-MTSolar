/**
 * roundRobin.ts
 * Função pura de ordenação do rodízio de vendedores.
 *
 * Esta função NÃO acessa banco de dados nem serviços externos.
 * Recebe os dados já enriquecidos e retorna o vendedor escolhido ou null.
 *
 * CRITÉRIO DE ESCOLHA (imutável — não alterar sem aprovar com CEO):
 *   Primário  : lastAssignedAt ASC — null (nunca recebeu) vai primeiro
 *   Secundário: totalInProgress ASC — menor carga em aberto (desempate)
 */

export interface VendedorEnriquecido {
  id: number;
  name: string;
  lastAssignedAt: string | null;
  totalInProgress: number;
}

/**
 * Escolhe o próximo vendedor pelo algoritmo de Round-Robin.
 *
 * @param elegiveis Lista de vendedores já enriquecidos com lastAssignedAt e totalInProgress.
 * @returns O vendedor escolhido, ou null se a lista estiver vazia.
 */
export function escolherVendedor(
  elegiveis: VendedorEnriquecido[]
): VendedorEnriquecido | null {
  if (!elegiveis || elegiveis.length === 0) return null;

  const sorted = [...elegiveis].sort((a, b) => {
    // Vendedor sem nenhuma conversa atribuída vai sempre primeiro
    if (a.lastAssignedAt === null && b.lastAssignedAt !== null) return -1;
    if (a.lastAssignedAt !== null && b.lastAssignedAt === null) return 1;

    // Ambos nunca receberam → desempate por menor in_progress
    if (a.lastAssignedAt === null && b.lastAssignedAt === null) {
      return a.totalInProgress - b.totalInProgress;
    }

    // Critério primário: quem recebeu lead há mais tempo vai antes
    const diff =
      new Date(a.lastAssignedAt!).getTime() -
      new Date(b.lastAssignedAt!).getTime();
    if (diff !== 0) return diff;

    // Mesmo timestamp (improvável): desempate por menor in_progress
    return a.totalInProgress - b.totalInProgress;
  });

  return sorted[0];
}

