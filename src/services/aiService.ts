import { getDb } from '../lib/neon';
import type { PropostaOtimizacao, PlanoOtimizacao } from '../types/database';

export async function requestFinancialOptimization(userId: string): Promise<PropostaOtimizacao> {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  // 1. Gather all financial context from Neon
  const [contas, transacoes, cartoes, imoveis] = await Promise.all([
    sql`SELECT nome_instituicao, saldo_inicial, tipo_conta FROM contas WHERE usuario_id = ${userId};`,
    sql`SELECT descricao, categoria, valor, data_vencimento, data_pagamento, status FROM transacoes t JOIN contas c ON t.conta_id = c.id WHERE c.usuario_id = ${userId} ORDER BY t.created_at DESC LIMIT 50;`,
    sql`SELECT nome_cartao, limite_total, dia_fechamento, dia_vencimento FROM cartoes_credito WHERE usuario_id = ${userId};`,
    sql`SELECT endereco, valor_aluguel, dia_vencimento, inquilino_nome FROM imoveis WHERE usuario_id = ${userId};`
  ]);

  const dadosContext = {
    contasBancarias: contas,
    ultimasTransacoes: transacoes,
    cartoesCredito: cartoes,
    imoveisLocados: imoveis,
    dataAtual: new Date().toISOString().split('T')[0]
  };

  try {
    const response = await fetch('/api/otimizar-financas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dados_financeiros_e_imobiliarios: dadosContext })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const json = await response.json();
    
    // Validate schema
    if (json?.proposta_otimizacao) {
      const prop = json.proposta_otimizacao;
      return {
        mes_referencia: String(prop.mes_referencia || 'Próximo Mês'),
        analise_gastos: Array.isArray(prop.analise_gastos) ? prop.analise_gastos : [],
        metas_economia: Array.isArray(prop.metas_economia) ? prop.metas_economia : [],
        alertas_imobiliarios: Array.isArray(prop.alertas_imobiliarios) ? prop.alertas_imobiliarios : [],
        projecao_saldo: Number(prop.projecao_saldo) || 0
      };
    }

    throw new Error('Formato de resposta inválido');
  } catch (err) {
    console.error('Falha ao consultar endpoint de IA, gerando plano inteligente baseado nos dados:', err);
    
    // Heuristic fallback if offline / backend API key not configured yet
    return generateFallbackOptimization(dadosContext);
  }
}

/**
 * Salva o plano de otimização revisado pelo usuário no Neon PostgreSQL
 */
export async function saveOptimizationPlan(
  userId: string,
  proposta: PropostaOtimizacao
): Promise<PlanoOtimizacao> {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  const rows = await sql`
    INSERT INTO planos_otimizacao (
      usuario_id,
      mes_referencia,
      analise_gastos,
      metas_economia,
      alertas_imobiliarios,
      projecao_saldo,
      status
    )
    VALUES (
      ${userId},
      ${proposta.mes_referencia},
      ${JSON.stringify(proposta.analise_gastos)}::jsonb,
      ${JSON.stringify(proposta.metas_economia)}::jsonb,
      ${JSON.stringify(proposta.alertas_imobiliarios)}::jsonb,
      ${proposta.projecao_saldo},
      'Ativo'
    )
    RETURNING *;
  `;

  return rows[0] as unknown as PlanoOtimizacao;
}

/**
 * Busca o plano de otimização ativo mais recente
 */
export async function fetchLatestOptimizationPlan(userId: string): Promise<PlanoOtimizacao | null> {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;

  const rows = await sql`
    SELECT * FROM planos_otimizacao 
    WHERE usuario_id = ${userId}
    ORDER BY created_at DESC 
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) return null;
  return rows[0] as unknown as PlanoOtimizacao;
}

/**
 * Gerador de fallback inteligente baseado nos dados reais do usuário
 */
function generateFallbackOptimization(dados: {
  contasBancarias: Record<string, unknown>[];
  ultimasTransacoes: Record<string, unknown>[];
  cartoesCredito: Record<string, unknown>[];
  imoveisLocados: Record<string, unknown>[];
}): PropostaOtimizacao {
  const totalAluguel = dados.imoveisLocados.reduce((acc, im) => acc + (Number(im.valor_aluguel) || 0), 0);
  const totalGastos = dados.ultimasTransacoes
    .filter(t => Number(t.valor) < 0)
    .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0);

  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const nextMonthName = meses[(new Date().getMonth() + 1) % 12];

  return {
    mes_referencia: `${nextMonthName} de ${new Date().getFullYear()}`,
    analise_gastos: [
      totalGastos > 0 
        ? `Despesas variáveis somaram R$ ${totalGastos.toFixed(2)}. Recomenda-se reduzir 15% em gastos com lazer e compras avulsas.`
        : 'Organize suas contas fixas e variáveis para identificar oportunidades imediatas de corte de custos.',
      dados.cartoesCredito.length > 0
        ? `Concentre compras no cartão com melhor data de fechamento para estender o prazo de pagamento em até 40 dias.`
        : 'Evite rotativo de cartão de crédito e parcele compras apenas sem juros.'
    ],
    metas_economia: [
      `Aporte mensal sugerido de R$ ${(Math.max(500, totalAluguel * 0.2)).toFixed(2)} em reserva de emergência ou renda fixa.`,
      'Limitar despesas com alimentação fora de casa a no máximo 10% da receita líquida total.'
    ],
    alertas_imobiliarios: dados.imoveisLocados.length > 0
      ? [
          `Receita locatícia prevista de R$ ${totalAluguel.toFixed(2)}. Monitore vencimentos para evitar atrasos de inquilinos.`,
          'Reserve 5% do valor dos aluguéis para fundo de manutenção preventiva e vacância.'
        ]
      : [
          'Cadastre seus imóveis e inquilinos no Módulo Imobiliário para ter projeções automáticas de adimplência e rentabilidade.'
        ],
    projecao_saldo: Math.max(1000, totalAluguel * 1.1)
  };
}
