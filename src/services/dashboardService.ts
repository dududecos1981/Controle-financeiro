import { getDb } from '../lib/neon';
import type { Conta, CartaoCredito, Imovel, Transacao } from '../types/database';

export interface DashboardMetrics {
  saldoAtual: number;
  faturaCartaoTotal: number;
  contasPagarSemanaTotal: number;
  contasPagarCount: number;
  recebimentosAluguelTotal: number;
  imoveisCount: number;
  chartData: {
    mes: string;
    entradas: number;
    saidas: number;
  }[];
  recentTransactions: (Transacao & { conta_nome?: string; cartao_nome?: string })[];
  contas: Conta[];
  cartoes: CartaoCredito[];
  imoveis: Imovel[];
}

export async function fetchDashboardData(userId: string): Promise<DashboardMetrics> {
  const sql = getDb();

  try {
    // Set RLS user session context
    await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

    // 1. Fetch Accounts
    const contasRaw = await sql`
      SELECT id, usuario_id, nome_instituicao, saldo_inicial, tipo_conta, created_at 
      FROM contas 
      WHERE usuario_id = ${userId}
      ORDER BY created_at ASC;
    `;
    const contas: Conta[] = (contasRaw as unknown as Conta[]).map(c => ({
      ...c,
      saldo_inicial: Number(c.saldo_inicial) || 0
    }));

    // If user has no account yet, create one automatically
    if (contas.length === 0) {
      const createdAccount = await sql`
        INSERT INTO contas (usuario_id, nome_instituicao, saldo_inicial, tipo_conta)
        VALUES (${userId}, 'Conta Principal', 0, 'Corrente')
        RETURNING id, usuario_id, nome_instituicao, saldo_inicial, tipo_conta, created_at;
      `;
      if (createdAccount && createdAccount.length > 0) {
        contas.push({
          ...(createdAccount[0] as unknown as Conta),
          saldo_inicial: Number(createdAccount[0].saldo_inicial) || 0
        });
      }
    }

    // 2. Fetch Credit Cards
    const cartoesRaw = await sql`
      SELECT id, usuario_id, nome_cartao, limite_total, dia_fechamento, dia_vencimento, created_at 
      FROM cartoes_credito 
      WHERE usuario_id = ${userId}
      ORDER BY created_at ASC;
    `;
    const cartoes: CartaoCredito[] = (cartoesRaw as unknown as CartaoCredito[]).map(card => ({
      ...card,
      limite_total: Number(card.limite_total) || 0
    }));

    // 3. Fetch Properties (Imóveis)
    const imoveisRaw = await sql`
      SELECT id, usuario_id, endereco, valor_aluguel, dia_vencimento, inquilino_nome, inquilino_contato, created_at 
      FROM imoveis 
      WHERE usuario_id = ${userId}
      ORDER BY created_at DESC;
    `;
    const imoveis: Imovel[] = (imoveisRaw as unknown as Imovel[]).map(imovel => ({
      ...imovel,
      valor_aluguel: Number(imovel.valor_aluguel) || 0
    }));

    // 4. Fetch Transactions for user's accounts
    const transacoesRaw = await sql`
      SELECT 
        t.id, 
        t.conta_id, 
        t.cartao_id, 
        t.descricao, 
        t.categoria, 
        t.valor, 
        t.data_vencimento, 
        t.data_pagamento, 
        t.status, 
        t.created_at,
        c.nome_instituicao as conta_nome,
        cc.nome_cartao as cartao_nome
      FROM transacoes t
      JOIN contas c ON t.conta_id = c.id
      LEFT JOIN cartoes_credito cc ON t.cartao_id = cc.id
      WHERE c.usuario_id = ${userId}
      ORDER BY t.created_at DESC;
    `;

    const allTransactions = (transacoesRaw as unknown as (Transacao & { conta_nome?: string; cartao_nome?: string })[]).map(t => ({
      ...t,
      valor: Number(t.valor) || 0
    }));

    // Calculations:
    // A. Saldo Atual = Soma dos saldos iniciais + Receitas pagas - Despesas pagas
    const totalSaldoInicial = contas.reduce((acc, c) => acc + c.saldo_inicial, 0);
    const totalReceitasPagas = allTransactions
      .filter(t => (t.status === 'Pago' || t.status === 'Recebido') && (!t.cartao_id) && t.valor > 0)
      .reduce((acc, t) => acc + t.valor, 0);
    const totalDespesasPagas = allTransactions
      .filter(t => t.status === 'Pago' && (!t.cartao_id) && t.valor < 0)
      .reduce((acc, t) => acc + Math.abs(t.valor), 0);
    
    const saldoAtual = totalSaldoInicial + totalReceitasPagas - totalDespesasPagas;

    // B. Fatura do Cartão (Compras no cartão no mês atual ou pendentes)
    const faturaCartaoTotal = allTransactions
      .filter(t => t.cartao_id !== null && t.status !== 'Pago')
      .reduce((acc, t) => acc + Math.abs(t.valor), 0);

    // C. Contas a Pagar (Hoje / Próximos 7 dias)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);
    in7Days.setHours(23, 59, 59, 999);

    const contasPagarSemana = allTransactions.filter(t => {
      if (t.status !== 'Pendente' && t.status !== 'Atrasado') return false;
      if (t.valor >= 0 && !t.categoria?.toLowerCase().includes('despesa')) return false; // only expenses
      if (!t.data_vencimento) return true;
      const vencDate = new Date(t.data_vencimento);
      return vencDate <= in7Days;
    });

    const contasPagarSemanaTotal = contasPagarSemana.reduce((acc, t) => acc + Math.abs(t.valor), 0);
    const contasPagarCount = contasPagarSemana.length;

    // D. Recebimentos de Aluguel (Soma dos aluguéis cadastrados dos imóveis)
    const recebimentosAluguelTotal = imoveis.reduce((acc, im) => acc + (im.valor_aluguel || 0), 0);

    // E. Monthly Cash Flow Chart Data (Últimos 6 meses)
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonthIndex = new Date().getMonth();
    
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(currentMonthIndex - i);
      const mIndex = monthDate.getMonth();
      const mYear = monthDate.getFullYear();
      const mLabel = `${mesesNomes[mIndex]}/${mYear.toString().slice(-2)}`;

      // Filter transactions for this month
      const monthTransactions = allTransactions.filter(t => {
        const d = t.data_pagamento ? new Date(t.data_pagamento) : new Date(t.created_at || '');
        return d.getMonth() === mIndex && d.getFullYear() === mYear;
      });

      const entradas = monthTransactions
        .filter(t => t.valor > 0 || t.status === 'Recebido')
        .reduce((acc, t) => acc + Math.abs(t.valor), 0);

      const saidas = monthTransactions
        .filter(t => t.valor < 0 || (t.status === 'Pago' && t.valor > 0 && !t.categoria?.toLowerCase().includes('receita')))
        .reduce((acc, t) => acc + Math.abs(t.valor), 0);

      // If it's current month and no transactions yet, provide base real numbers or aluguel estimation
      chartData.push({
        mes: mLabel,
        entradas: entradas,
        saidas: saidas
      });
    }

    return {
      saldoAtual,
      faturaCartaoTotal,
      contasPagarSemanaTotal,
      contasPagarCount,
      recebimentosAluguelTotal,
      imoveisCount: imoveis.length,
      chartData,
      recentTransactions: allTransactions.slice(0, 6),
      contas,
      cartoes,
      imoveis
    };
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    throw error;
  }
}

/**
 * Cria uma transação no Neon PostgreSQL respeitando o RLS
 */
export async function createTransaction(
  userId: string,
  data: {
    conta_id: string;
    cartao_id?: string | null;
    descricao: string;
    categoria: string;
    valor: number;
    data_vencimento?: string;
    data_pagamento?: string;
    status: 'Pendente' | 'Pago' | 'Recebido' | 'Atrasado';
    observacoes?: string | null;
    anexo_nome?: string | null;
    anexo_base64?: string | null;
    recorrente?: boolean;
    frequencia?: string | null;
  }
) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  return await sql`
    INSERT INTO transacoes (
      conta_id, 
      cartao_id, 
      descricao, 
      categoria, 
      valor, 
      data_vencimento, 
      data_pagamento, 
      status,
      observacoes,
      anexo_nome,
      anexo_base64,
      recorrente,
      frequencia
    )
    VALUES (
      ${data.conta_id}, 
      ${data.cartao_id || null}, 
      ${data.descricao}, 
      ${data.categoria}, 
      ${data.valor}, 
      ${data.data_vencimento || null}, 
      ${data.data_pagamento || null}, 
      ${data.status},
      ${data.observacoes || null},
      ${data.anexo_nome || null},
      ${data.anexo_base64 || null},
      ${data.recorrente ?? false},
      ${data.frequencia || null}
    )
    RETURNING *;
  `;
}

