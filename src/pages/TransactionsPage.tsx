import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../lib/neon';
import type { Transacao } from '../types/database';
import {
  ArrowLeftRight,
  PlusCircle,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  Repeat,
  Trash2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<(Transacao & { conta_nome?: string; cartao_nome?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');

  // Selected attachment to view in modal
  const [viewingAttachment, setViewingAttachment] = useState<{ nome: string; base64: string } | null>(null);

  const loadTransactions = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      const rows = await sql`
        SELECT 
          t.*, 
          c.nome_instituicao as conta_nome,
          cc.nome_cartao as cartao_nome
        FROM transacoes t
        JOIN contas c ON t.conta_id = c.id
        LEFT JOIN cartoes_credito cc ON t.cartao_id = cc.id
        WHERE c.usuario_id = ${user.id}
        ORDER BY t.data_vencimento DESC NULLS LAST, t.created_at DESC;
      `;

      const mapped = (rows as unknown as (Transacao & { conta_nome?: string; cartao_nome?: string })[]).map(t => ({
        ...t,
        valor: Number(t.valor) || 0
      }));

      setTransactions(mapped);
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();

    const handleCreated = () => loadTransactions();
    window.addEventListener('transaction-created', handleCreated);
    return () => window.removeEventListener('transaction-created', handleCreated);
  }, [user?.id]);

  const toggleTransactionStatus = async (id: string, currentStatus: string, valor: number) => {
    if (!user?.id) return;
    try {
      const newStatus = currentStatus === 'Pago' || currentStatus === 'Recebido' 
        ? 'Pendente' 
        : (valor > 0 ? 'Recebido' : 'Pago');

      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;
      await sql`
        UPDATE transacoes 
        SET status = ${newStatus}, 
            data_pagamento = ${newStatus === 'Pendente' ? null : new Date().toISOString().split('T')[0]}
        WHERE id = ${id};
      `;

      loadTransactions();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;
      await sql`DELETE FROM transacoes WHERE id = ${id};`;

      loadTransactions();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao excluir transação:', err);
    }
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = t.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (t.categoria && t.categoria.toLowerCase().includes(search.toLowerCase())) ||
      (t.observacoes && t.observacoes.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'todos' || t.status === statusFilter;
    
    const isIncome = t.valor > 0 || t.status === 'Recebido';
    const matchesTipo = tipoFilter === 'todos' || 
      (tipoFilter === 'receita' && isIncome) ||
      (tipoFilter === 'despesa' && !isIncome);

    return matchesSearch && matchesStatus && matchesTipo;
  });

  const totalReceitas = transactions
    .filter(t => t.valor > 0 || t.status === 'Recebido')
    .reduce((acc, t) => acc + Math.abs(t.valor), 0);

  const totalDespesas = transactions
    .filter(t => t.valor < 0 || (t.status === 'Pago' && !t.categoria?.toLowerCase().includes('receita')))
    .reduce((acc, t) => acc + Math.abs(t.valor), 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Transações</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão completa do fluxo de caixa: receitas, despesas fixas e variáveis
          </p>
        </div>

        <button
          onClick={() => navigate('/transacoes/novo')}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Cadastrar Transação</span>
        </button>
      </div>

      {/* Mini Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Receitas</span>
            <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{formatCurrency(totalReceitas)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Despesas</span>
            <p className="text-lg font-bold text-rose-400 font-mono mt-0.5">{formatCurrency(totalDespesas)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <TrendingDown className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Balanço Líquido</span>
            <p className={`text-lg font-bold font-mono mt-0.5 ${totalReceitas - totalDespesas >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(totalReceitas - totalDespesas)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
            <DollarSign className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, categoria ou notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="Pendente">Pendentes</option>
            <option value="Pago">Pagos</option>
            <option value="Recebido">Recebidos</option>
            <option value="Atrasado">Atrasados</option>
          </select>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="py-2 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="receita">Receitas (Entradas)</option>
            <option value="despesa">Despesas (Saídas)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-slate-900/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Tag className="w-8 h-8 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma transação encontrada</p>
            <p className="text-xs text-slate-500">Cadastre seus lançamentos para controlar suas finanças.</p>
            <button
              onClick={() => navigate('/transacoes/novo')}
              className="mt-2 py-2 px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer"
            >
              Criar Primeiro Lançamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Descrição / Categoria</th>
                  <th className="py-3.5 px-4">Conta / Cartão</th>
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4 text-right">Valor</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((t) => {
                  const isIncome = t.valor > 0 || t.status === 'Recebido';
                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors group">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {isIncome ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate max-w-xs">{t.descricao}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>{t.categoria || 'Geral'}</span>
                              {t.recorrente && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400">
                                  <Repeat className="w-3 h-3" />
                                  {t.frequencia || 'Recorrente'}
                                </span>
                              )}
                              {t.anexo_nome && (
                                <button
                                  onClick={() => setViewingAttachment({ nome: t.anexo_nome!, base64: t.anexo_base64 || '' })}
                                  className="inline-flex items-center gap-1 text-[10px] text-teal-400 hover:underline cursor-pointer"
                                >
                                  <FileCheck className="w-3 h-3" />
                                  Anexo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {t.conta_nome || 'Conta Principal'}
                        {t.cartao_nome && (
                          <span className="block text-[10px] text-indigo-400">Cartão {t.cartao_nome}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-mono">
                        {t.data_vencimento ? new Date(t.data_vencimento).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className={`py-4 px-4 text-right font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {isIncome ? '+' : '-'} {formatCurrency(Math.abs(t.valor))}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          t.status === 'Pago' || t.status === 'Recebido'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : t.status === 'Pendente'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => toggleTransactionStatus(t.id, t.status, t.valor)}
                            title="Alternar Pago/Pendente"
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer"
                          >
                            {t.status === 'Pago' || t.status === 'Recebido' ? 'Desfazer' : 'Liquidar'}
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            title="Excluir transação"
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attachment Preview Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 max-w-lg w-full border border-slate-700/80 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-400" />
                <span>{viewingAttachment.nome}</span>
              </h3>
              <button
                onClick={() => setViewingAttachment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-auto flex items-center justify-center bg-slate-900 rounded-2xl p-2 border border-slate-800">
              {viewingAttachment.base64?.startsWith('data:image') ? (
                <img
                  src={viewingAttachment.base64}
                  alt={viewingAttachment.nome}
                  className="max-h-80 w-auto rounded-xl object-contain"
                />
              ) : (
                <iframe
                  src={viewingAttachment.base64}
                  title={viewingAttachment.nome}
                  className="w-full h-80 rounded-xl"
                />
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewingAttachment(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
