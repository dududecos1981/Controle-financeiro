import { getDb } from '../lib/neon';
import type { Imovel, Transacao, Conta, ImovelDocumento } from '../types/database';

export interface PropertyDetailsData {
  imovel: Imovel;
  totalRecebido: number;
  totalDespesas: number;
  rentabilidadeLiquida: number;
  monthlyChartData: {
    mes: string;
    valor: number;
    status: 'Recebido' | 'Pendente' | 'Sem Pagamento';
  }[];
  recebimentos: Transacao[];
  despesas: Transacao[];
  contas: Conta[];
}

export async function fetchPropertyDetails(
  userId: string,
  propertyId: string
): Promise<PropertyDetailsData> {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  // 1. Fetch Property
  const propertyRows = await sql`
    SELECT * FROM imoveis 
    WHERE id = ${propertyId} AND usuario_id = ${userId}
    LIMIT 1;
  `;

  if (!propertyRows || propertyRows.length === 0) {
    throw new Error('Imóvel não encontrado.');
  }

  const imovelRaw = propertyRows[0];
  const imovel: Imovel = {
    ...(imovelRaw as unknown as Imovel),
    valor_aluguel: Number(imovelRaw.valor_aluguel) || 0,
    documentos: (imovelRaw.documentos as ImovelDocumento[]) || []
  };

  // 2. Fetch User Accounts (to allow registering receipts/expenses into bank accounts)
  const contasRaw = await sql`
    SELECT * FROM contas 
    WHERE usuario_id = ${userId}
    ORDER BY created_at ASC;
  `;
  const contas: Conta[] = (contasRaw as unknown as Conta[]).map(c => ({
    ...c,
    saldo_inicial: Number(c.saldo_inicial) || 0
  }));

  // 3. Fetch Transactions associated with this property
  const transactionsRaw = await sql`
    SELECT t.*, c.nome_instituicao as conta_nome
    FROM transacoes t
    JOIN contas c ON t.conta_id = c.id
    WHERE (t.imovel_id = ${propertyId} OR (t.categoria = 'Aluguel' AND t.descricao ILIKE ${'%' + imovel.endereco.substring(0, 15) + '%'}))
      AND c.usuario_id = ${userId}
    ORDER BY COALESCE(t.data_pagamento, t.data_vencimento, t.created_at) DESC;
  `;

  const allTx = (transactionsRaw as unknown as (Transacao & { conta_nome?: string })[]).map(t => ({
    ...t,
    valor: Number(t.valor) || 0
  }));

  const recebimentos = allTx.filter(t => t.valor > 0 || t.status === 'Recebido' || t.categoria === 'Aluguel');
  const despesas = allTx.filter(t => t.valor < 0 || (t.categoria !== 'Aluguel' && t.valor <= 0));

  const totalRecebido = recebimentos
    .filter(t => t.status === 'Pago' || t.status === 'Recebido')
    .reduce((acc, t) => acc + Math.abs(t.valor), 0);

  const totalDespesas = despesas
    .reduce((acc, t) => acc + Math.abs(t.valor), 0);

  const rentabilidadeLiquida = totalRecebido - totalDespesas;

  // 4. Monthly Chart Data (Last 12 Months)
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyChartData = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const mIdx = d.getMonth();
    const mYear = d.getFullYear();
    const mLabel = `${mesesNomes[mIdx]}/${mYear.toString().slice(-2)}`;

    // Check if there was a payment in this month
    const matchingReceipts = recebimentos.filter(t => {
      const txDate = t.data_pagamento ? new Date(t.data_pagamento) : (t.data_vencimento ? new Date(t.data_vencimento) : null);
      return txDate && txDate.getMonth() === mIdx && txDate.getFullYear() === mYear;
    });

    const sumPaid = matchingReceipts
      .filter(t => t.status === 'Recebido' || t.status === 'Pago')
      .reduce((acc, t) => acc + Math.abs(t.valor), 0);

    const hasPending = matchingReceipts.some(t => t.status === 'Pendente' || t.status === 'Atrasado');

    monthlyChartData.push({
      mes: mLabel,
      valor: sumPaid,
      status: (sumPaid > 0 ? 'Recebido' : (hasPending ? 'Pendente' : 'Sem Pagamento')) as 'Recebido' | 'Pendente' | 'Sem Pagamento'
    });
  }

  return {
    imovel,
    totalRecebido,
    totalDespesas,
    rentabilidadeLiquida,
    monthlyChartData,
    recebimentos,
    despesas,
    contas
  };
}

/**
 * Atualiza dados cadastrais do imóvel
 */
export async function updateProperty(
  userId: string,
  propertyId: string,
  data: {
    endereco: string;
    valor_aluguel: number;
    dia_vencimento: number;
    inquilino_nome?: string;
    inquilino_contato?: string;
  }
) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  return await sql`
    UPDATE imoveis 
    SET endereco = ${data.endereco},
        valor_aluguel = ${data.valor_aluguel},
        dia_vencimento = ${data.dia_vencimento},
        inquilino_nome = ${data.inquilino_nome || null},
        inquilino_contato = ${data.inquilino_contato || null}
    WHERE id = ${propertyId} AND usuario_id = ${userId}
    RETURNING *;
  `;
}

/**
 * Registra um recebimento de aluguel vinculado ao imóvel
 */
export async function createPropertyReceipt(
  userId: string,
  propertyId: string,
  data: {
    dataReferencia: string;
    dataRecebimento: string;
    valor: number;
    status: 'Pago' | 'Atrasado' | 'Parcial';
    observacoes?: string;
    contaId: string;
    enderecoImovel?: string;
  }
) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  const descricao = `Aluguel Ref. ${data.dataReferencia} - ${data.enderecoImovel || 'Imóvel'}`;
  const txStatus = data.status === 'Atrasado' ? 'Atrasado' : 'Recebido';

  return await sql`
    INSERT INTO transacoes (
      conta_id,
      imovel_id,
      descricao,
      categoria,
      valor,
      data_vencimento,
      data_pagamento,
      status,
      observacoes
    )
    VALUES (
      ${data.contaId},
      ${propertyId},
      ${descricao},
      'Aluguel',
      ${Math.abs(data.valor)},
      ${data.dataReferencia ? `${data.dataReferencia}-01` : null},
      ${data.dataRecebimento || null},
      ${txStatus},
      ${data.observacoes || null}
    )
    RETURNING *;
  `;
}

/**
 * Registra uma despesa vinculada ao imóvel (IPTU, Condomínio, Manutenção)
 */
export async function createPropertyExpense(
  userId: string,
  propertyId: string,
  data: {
    descricao: string;
    categoria: string;
    valor: number;
    dataVencimento: string;
    dataPagamento?: string;
    status: 'Pago' | 'Pendente';
    observacoes?: string;
    contaId: string;
  }
) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  return await sql`
    INSERT INTO transacoes (
      conta_id,
      imovel_id,
      descricao,
      categoria,
      valor,
      data_vencimento,
      data_pagamento,
      status,
      observacoes
    )
    VALUES (
      ${data.contaId},
      ${propertyId},
      ${data.descricao},
      ${data.categoria || 'Manutenção Imóvel'},
      ${-Math.abs(data.valor)},
      ${data.dataVencimento || null},
      ${data.status === 'Pago' ? (data.dataPagamento || data.dataVencimento) : null},
      ${data.status},
      ${data.observacoes || null}
    )
    RETURNING *;
  `;
}

/**
 * Adiciona um documento ou contrato anexado ao imóvel
 */
export async function addPropertyDocument(
  userId: string,
  propertyId: string,
  doc: ImovelDocumento
) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  // Fetch existing documents
  const propRows = await sql`
    SELECT documentos FROM imoveis WHERE id = ${propertyId} AND usuario_id = ${userId};
  `;
  const existingDocs = (propRows[0]?.documentos as ImovelDocumento[]) || [];
  const updatedDocs = [...existingDocs, doc];

  return await sql`
    UPDATE imoveis 
    SET documentos = ${JSON.stringify(updatedDocs)}::jsonb
    WHERE id = ${propertyId} AND usuario_id = ${userId}
    RETURNING *;
  `;
}
