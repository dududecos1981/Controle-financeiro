import React from 'react';
import { Link } from 'react-router-dom';
import type { Transacao } from '../../types/database';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  PlusCircle,
  CreditCard,
  Tag
} from 'lucide-react';

interface RecentTransactionsListProps {
  transactions: (Transacao & { conta_nome?: string; cartao_nome?: string })[];
  isLoading?: boolean;
  onOpenNewTransaction: () => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  isLoading = false,
  onOpenNewTransaction,
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Sem data';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Últimos Lançamentos</h3>
          <p className="text-xs text-slate-400">Histórico de movimentações recentes</p>
        </div>
        <Link
          to="/transacoes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-all"
        >
          <span>Ver todas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* List / Empty State */}
      {isLoading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-900/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-300">Nenhum lançamento registrado</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Comece adicionando suas receitas ou despesas
            </p>
          </div>
          <button
            onClick={onOpenNewTransaction}
            className="mt-2 py-2 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Criar Primeiro Lançamento</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {transactions.map((t) => {
            const isIncome = t.valor > 0 || t.status === 'Recebido';
            const statusConfig = {
              Pago: { label: 'Pago', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
              Recebido: { label: 'Recebido', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
              Pendente: { label: 'Pendente', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
              Atrasado: { label: 'Atrasado', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
            };

            const currentStatus = statusConfig[t.status] || statusConfig.Pendente;

            return (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-center justify-between gap-3 group"
              >
                {/* Icon & Title */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-white transition-colors">
                      {t.descricao}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{t.categoria || 'Geral'}</span>
                      <span>•</span>
                      <span>{t.conta_nome || 'Conta'}</span>
                      {t.cartao_nome && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-indigo-400">
                            <CreditCard className="w-3 h-3" />
                            {t.cartao_nome}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount & Date/Status */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-bold font-mono ${
                      isIncome ? 'text-emerald-400' : 'text-slate-100'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatCurrency(Math.abs(t.valor))}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatDate(t.data_vencimento || t.created_at)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${currentStatus.bg}`}
                    >
                      {currentStatus.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
