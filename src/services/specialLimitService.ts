import { getDb } from '../lib/neon';
import type { LimiteEspecial, TransacaoLimiteEspecial } from '../types/database';

/**
 * Garante a criação automática das tabelas de Limite Especial no Neon PostgreSQL
 */
export async function initSpecialLimitTables() {
  const sql = getDb();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS limites_especiais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID NOT NULL,
        conta_id UUID,
        nome_instituicao VARCHAR(255) NOT NULL,
        limite_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
        taxa_juros_mensal NUMERIC(5, 2) DEFAULT 8.0,
        dia_vencimento INT DEFAULT 10,
        observacoes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS transacoes_limite_especial (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        limite_especial_id UUID NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        valor NUMERIC(15, 2) NOT NULL,
        data_operacao DATE DEFAULT CURRENT_DATE,
        descricao VARCHAR(255) NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
  } catch (err) {
    console.warn('Tabelas de limites especiais já inicializadas ou erro de criação:', err);
  }
}

export interface SpecialLimitWithMetrics extends LimiteEspecial {
  valorUtilizado: number;
  limiteDisponivel: number;
  percentualUtilizado: number;
  transacoes: TransacaoLimiteEspecial[];
}

export async function fetchSpecialLimits(userId: string): Promise<SpecialLimitWithMetrics[]> {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  await initSpecialLimitTables();

  const [limitsRaw, txsRaw] = await Promise.all([
    sql`
      SELECT l.*, c.nome_instituicao as conta_nome 
      FROM limites_especiais l
      LEFT JOIN contas c ON l.conta_id = c.id
      WHERE l.usuario_id = ${userId}
      ORDER BY l.created_at DESC;
    `,
    sql`
      SELECT t.* 
      FROM transacoes_limite_especial t
      JOIN limites_especiais l ON t.limite_especial_id = l.id
      WHERE l.usuario_id = ${userId}
      ORDER BY t.data_operacao DESC, t.created_at DESC;
    `
  ]);

  const rawLimits = limitsRaw as unknown as (LimiteEspecial & { conta_nome?: string })[];
  const rawTxs = txsRaw as unknown as TransacaoLimiteEspecial[];

  return rawLimits.map((lim) => {
    const limTotal = Number(lim.limite_total) || 0;
    const limitTxs = rawTxs.filter((t) => t.limite_especial_id === lim.id);

    // Soma das utilizações menos amortizações
    const totalUtilizacoes = limitTxs
      .filter((t) => t.tipo === 'Utilização')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const totalAmortizacoes = limitTxs
      .filter((t) => t.tipo === 'Amortização')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const valorUtilizado = Math.max(0, totalUtilizacoes - totalAmortizacoes);
    const limiteDisponivel = Math.max(0, limTotal - valorUtilizado);
    const percentualUtilizado = limTotal > 0 ? Math.min(100, Math.round((valorUtilizado / limTotal) * 100)) : 0;

    return {
      ...lim,
      limite_total: limTotal,
      taxa_juros_mensal: Number(lim.taxa_juros_mensal) || 0,
      valorUtilizado,
      limiteDisponivel,
      percentualUtilizado,
      transacoes: limitTxs
    };
  });
}

export async function createSpecialLimit(
  userId: string,
  data: {
    nome_instituicao: string;
    conta_id?: string | null;
    limite_total: number;
    taxa_juros_mensal?: number;
    dia_vencimento?: number;
    observacoes?: string | null;
  }
) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;
  await initSpecialLimitTables();

  return await sql`
    INSERT INTO limites_especiais (
      usuario_id,
      conta_id,
      nome_instituicao,
      limite_total,
      taxa_juros_mensal,
      dia_vencimento,
      observacoes
    )
    VALUES (
      ${userId},
      ${data.conta_id || null},
      ${data.nome_instituicao.trim()},
      ${data.limite_total},
      ${data.taxa_juros_mensal ?? 8.0},
      ${data.dia_vencimento ?? 10},
      ${data.observacoes?.trim() || null}
    )
    RETURNING *;
  `;
}

export async function updateSpecialLimit(
  userId: string,
  id: string,
  data: {
    nome_instituicao: string;
    conta_id?: string | null;
    limite_total: number;
    taxa_juros_mensal?: number;
    dia_vencimento?: number;
    observacoes?: string | null;
  }
) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  return await sql`
    UPDATE limites_especiais
    SET nome_instituicao = ${data.nome_instituicao.trim()},
        conta_id = ${data.conta_id || null},
        limite_total = ${data.limite_total},
        taxa_juros_mensal = ${data.taxa_juros_mensal ?? 8.0},
        dia_vencimento = ${data.dia_vencimento ?? 10},
        observacoes = ${data.observacoes?.trim() || null}
    WHERE id = ${id} AND usuario_id = ${userId}
    RETURNING *;
  `;
}

export async function deleteSpecialLimit(userId: string, id: string) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  await sql`DELETE FROM transacoes_limite_especial WHERE limite_especial_id = ${id};`;
  return await sql`DELETE FROM limites_especiais WHERE id = ${id} AND usuario_id = ${userId};`;
}

export async function createSpecialLimitTransaction(
  userId: string,
  data: {
    limite_especial_id: string;
    tipo: 'Utilização' | 'Amortização';
    valor: number;
    data_operacao?: string;
    descricao: string;
    observacoes?: string | null;
  }
) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;
  await initSpecialLimitTables();

  return await sql`
    INSERT INTO transacoes_limite_especial (
      limite_especial_id,
      tipo,
      valor,
      data_operacao,
      descricao,
      observacoes
    )
    VALUES (
      ${data.limite_especial_id},
      ${data.tipo},
      ${Math.abs(data.valor)},
      ${data.data_operacao || new Date().toISOString().split('T')[0]},
      ${data.descricao.trim()},
      ${data.observacoes?.trim() || null}
    )
    RETURNING *;
  `;
}

export async function deleteSpecialLimitTransaction(userId: string, id: string) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  return await sql`DELETE FROM transacoes_limite_especial WHERE id = ${id};`;
}
