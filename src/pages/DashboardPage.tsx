import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardData, type DashboardMetrics } from '../services/dashboardService';
import { fetchLatestOptimizationPlan } from '../services/aiService';
import type { PlanoOtimizacao } from '../types/database';
import { MetricCard } from '../components/dashboard/MetricCard';
import { CashFlowChart } from '../components/dashboard/CashFlowChart';
import { RecentTransactionsList } from '../components/dashboard/RecentTransactionsList';
import { AiOptimizationModal } from '../components/dashboard/AiOptimizationModal';
import {
  Wallet,
  CreditCard,
  Building2,
  CalendarClock,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  Target,
  ArrowRight
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const outletContext = useOutletContext<{ openNewTransaction?: () => void }>();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [latestPlan, setLatestPlan] = useState<PlanoOtimizacao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const loadMetrics = useCallback(async (showRefreshingSpinner = false) => {
    if (!user?.id) return;

    try {
      if (showRefreshingSpinner) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMessage(null);

      const [data, plan] = await Promise.all([
        fetchDashboardData(user.id),
        fetchLatestOptimizationPlan(user.id)
      ]);

      setMetrics(data);
      setLatestPlan(plan);
    } catch (err) {
      console.error('Erro ao buscar métricas do dashboard:', err);
      setErrorMessage('Não foi possível atualizar os dados com o servidor Neon. Tente novamente.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMetrics();

    const handleTransactionCreated = () => loadMetrics(true);
    const handlePlanSaved = () => loadMetrics(true);

    window.addEventListener('transaction-created', handleTransactionCreated);
    window.addEventListener('plan-saved', handlePlanSaved);
    return () => {
      window.removeEventListener('transaction-created', handleTransactionCreated);
      window.removeEventListener('plan-saved', handlePlanSaved);
    };
  }, [loadMetrics]);

  const handleOpenTransactionModal = () => {
    if (outletContext?.openNewTransaction) {
      outletContext.openNewTransaction();
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Painel em Tempo Real</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Olá, {typeof user?.nome === 'string' && user.nome ? user.nome.split(' ')[0] : (user?.nome || 'Usuário')}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Aqui está o resumo consolidado da sua saúde financeira e locatícia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* AI Optimization Action Button */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-600 hover:from-amber-300 hover:to-indigo-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] ring-1 ring-white/20"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Otimizar Finanças com IA</span>
          </button>

          <button
            onClick={() => loadMetrics(true)}
            disabled={isRefreshing || isLoading}
            title="Atualizar dados do Neon"
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenTransactionModal}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4 Main Summary Cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Saldo Atual (Consolidado de Contas) */}
          <MetricCard
            title="Saldo Atual"
            value={metrics?.saldoAtual || 0}
            subtitle={
              metrics?.contas && metrics.contas.length > 0
                ? `${metrics.contas.length} conta(s) ativa(s)`
                : 'Nenhuma conta cadastrada'
            }
            icon={Wallet}
            variant="emerald"
            linkTo="/transacoes"
            emptyText="R$ 0,00"
            badgeText={metrics?.saldoAtual && metrics.saldoAtual > 0 ? 'Positivo' : undefined}
            isLoading={isLoading}
          />

          {/* Card 2: Fatura do Cartão (Total de Faturas do Mês) */}
          <MetricCard
            title="Fatura do Cartão"
            value={metrics?.faturaCartaoTotal || 0}
            subtitle={
              metrics?.cartoes && metrics.cartoes.length > 0
                ? `${metrics.cartoes.length} cartão(ões) vinculado(s)`
                : '0 cartões cadastrados'
            }
            icon={CreditCard}
            variant="indigo"
            linkTo="/cartoes"
            emptyText="Nenhuma fatura em aberto"
            badgeText={metrics?.faturaCartaoTotal && metrics.faturaCartaoTotal > 0 ? 'Aberta' : undefined}
            isLoading={isLoading}
          />

          {/* Card 3: Contas a Pagar (Hoje/Semana) */}
          <MetricCard
            title="Contas a Pagar (7 dias)"
            value={metrics?.contasPagarSemanaTotal || 0}
            subtitle={
              metrics?.contasPagarCount && metrics.contasPagarCount > 0
                ? `${metrics.contasPagarCount} vencimento(s) iminente(s)`
                : 'Nenhum vencimento próximo'
            }
            icon={CalendarClock}
            variant="rose"
            linkTo="/transacoes"
            emptyText="Nenhuma pendência no momento"
            badgeText={metrics?.contasPagarCount && metrics.contasPagarCount > 0 ? 'Atenção' : undefined}
            isLoading={isLoading}
          />

          {/* Card 4: Recebimentos de Aluguel (Pendentes do Mês) */}
          <MetricCard
            title="Recebimentos de Aluguel"
            value={metrics?.recebimentosAluguelTotal || 0}
            subtitle={
              metrics?.imoveisCount && metrics.imoveisCount > 0
                ? `${metrics.imoveisCount} imóvel(is) cadastrado(s)`
                : '0 imóveis locados'
            }
            icon={Building2}
            variant="amber"
            linkTo="/imoveis"
            emptyText="Nenhum aluguel pendente"
            badgeText={metrics?.imoveisCount && metrics.imoveisCount > 0 ? 'Locatício' : undefined}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Active AI Financial Plan Banner (If available) */}
      {latestPlan && (
        <section className="glass-card rounded-3xl p-6 sm:p-8 border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Plano de Otimização Financeira Ativo
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                    Ref: {latestPlan.mes_referencia}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recomendações e metas geradas pelo Consultor Inteligente (Gemini AI)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Meta de Saldo Projetado
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {formatCurrency(Number(latestPlan.projecao_saldo))}
                </span>
              </div>
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <span>Revisar Plano</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-xs">
            {/* Gastos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <TrendingDown className="w-4 h-4" />
                <span>Cortes de Gastos Sugeridos</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                {latestPlan.analise_gastos.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Metas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Target className="w-4 h-4" />
                <span>Metas de Economia</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                {latestPlan.metas_economia.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Alertas Imobiliários */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Building2 className="w-4 h-4" />
                <span>Alertas & Aluguéis</span>
              </div>
              <ul className="space-y-1.5 text-slate-300">
                {latestPlan.alertas_imobiliarios.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Cash Flow Chart & Quick Overview Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fluxo de Caixa Recharts */}
        <div className="lg:col-span-2">
          <CashFlowChart
            data={metrics?.chartData || []}
            isLoading={isLoading}
          />
        </div>

        {/* Bank Accounts Summary Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Minhas Contas</h3>
                  <p className="text-[11px] text-slate-400">Saldos por instituição</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400">
                {metrics?.contas?.length || 0} Ativa(s)
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {metrics?.contas && metrics.contas.length > 0 ? (
                metrics.contas.map((conta) => (
                  <div
                    key={conta.id}
                    className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs">
                        {conta.nome_instituicao.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white leading-tight">
                          {conta.nome_instituicao}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {conta.tipo_conta || 'Conta Corrente'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-100">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        conta.saldo_inicial || 0
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  Nenhuma conta adicional vinculada
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Proteção RLS Ativa</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Os dados bancários e lançamentos são criptografados e acessíveis exclusivamente pelo seu usuário.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Transactions List */}
      <section>
        <RecentTransactionsList
          transactions={metrics?.recentTransactions || []}
          isLoading={isLoading}
          onOpenNewTransaction={handleOpenTransactionModal}
        />
      </section>

      {/* AI Optimization Modal */}
      <AiOptimizationModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onPlanSaved={() => loadMetrics(true)}
      />
    </div>
  );
};
