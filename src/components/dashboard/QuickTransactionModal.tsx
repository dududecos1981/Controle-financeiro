import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createTransaction, createCardPurchase } from '../../services/dashboardService';
import { getDb } from '../../lib/neon';
import type { Conta, CartaoCredito } from '../../types/database';
import {
  X,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Check
} from 'lucide-react';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Geral');
  const [contaId, setContaId] = useState('');
  const [cartaoId, setCartaoId] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [dataVencimento, setDataVencimento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'Pendente' | 'Pago' | 'Recebido'>('Pago');

  const [contas, setContas] = useState<Conta[]>([]);
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load user accounts and cards
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const loadData = async () => {
      try {
        const sql = getDb();
        await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;
        
        const accountsRaw = await sql`SELECT * FROM contas WHERE usuario_id = ${user.id};`;
        const cardsRaw = await sql`SELECT * FROM cartoes_credito WHERE usuario_id = ${user.id};`;
        
        const accs = accountsRaw as unknown as Conta[];
        setContas(accs);
        if (accs.length > 0 && !contaId) {
          setContaId(accs[0].id);
        }
        
        setCartoes(cardsRaw as unknown as CartaoCredito[]);
      } catch (err) {
        console.error('Erro ao carregar contas/cartões:', err);
      }
    };

    loadData();
  }, [isOpen, user?.id, contaId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!descricao.trim()) {
      setErrorMessage('Por favor, informe uma descrição.');
      return;
    }

    const numValor = parseFloat(valor.replace(',', '.'));
    if (isNaN(numValor) || numValor <= 0) {
      setErrorMessage('Por favor, informe um valor válido.');
      return;
    }

    if (!contaId) {
      setErrorMessage('Por favor, selecione uma conta bancária.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (!user?.id) throw new Error('Usuário não autenticado.');

      const numParcelas = parseInt(parcelas, 10) || 1;

      if (tipo === 'despesa' && cartaoId && numParcelas > 1) {
        // Multi-installment card purchase
        await createCardPurchase(user.id, {
          conta_id: contaId,
          cartao_id: cartaoId,
          descricao: descricao.trim(),
          categoria,
          valorTotal: numValor,
          parcelas: numParcelas,
          dataPrimeiraParcela: dataVencimento
        });
      } else {
        // Single transaction
        const finalValor = tipo === 'despesa' ? -Math.abs(numValor) : Math.abs(numValor);
        const finalStatus = tipo === 'receita' && status === 'Pago' ? 'Recebido' : status;

        await createTransaction(user.id, {
          conta_id: contaId,
          cartao_id: cartaoId ? cartaoId : null,
          descricao: descricao.trim(),
          categoria,
          valor: finalValor,
          data_vencimento: dataVencimento,
          data_pagamento: status === 'Pago' || status === 'Recebido' ? dataVencimento : undefined,
          status: finalStatus as 'Pendente' | 'Pago' | 'Recebido' | 'Atrasado'
        });
      }

      // Reset form
      setDescricao('');
      setValor('');
      setCartaoId('');
      setParcelas('1');
      onSuccess();
    } catch (err: unknown) {
      console.error('Erro ao salvar transação:', err);
      setErrorMessage('Erro ao salvar no banco de dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoriasDespesa = ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Contas Fixas', 'Outros'];
  const categoriasReceita = ['Salário', 'Aluguel', 'Rendimento', 'Serviços', 'Outros'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-700/80 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Novo Lançamento</h3>
              <p className="text-xs text-slate-400">Registre entradas ou saídas em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Tipo Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setTipo('despesa');
                setCategoria('Alimentação');
                setStatus('Pago');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tipo === 'despesa'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Despesa (Saída)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTipo('receita');
                setCategoria('Salário');
                setStatus('Recebido');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tipo === 'receita'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Receita (Entrada)</span>
            </button>
          </div>

          {/* Valor & Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Data
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Supermercado, Aluguel Ap 102, Salário"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Categoria, Conta & Cartão */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {(tipo === 'despesa' ? categoriasDespesa : categoriasReceita).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Conta Bancária
              </label>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {contas.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nome_instituicao}
                  </option>
                ))}
              </select>
            </div>

            {tipo === 'despesa' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cartão (Opcional)
                </label>
                <select
                  value={cartaoId}
                  onChange={(e) => setCartaoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Nenhum (Débito)</option>
                  {cartoes.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.nome_cartao}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Parcelamento quando Cartão é selecionado */}
          {tipo === 'despesa' && cartaoId && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-indigo-300">
                  Dividir Compra em Parcelas:
                </label>
                <select
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                  className="py-1 px-3 rounded-xl bg-slate-900 text-white text-xs border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="1">1x à vista</option>
                  <option value="2">2x parcelas</option>
                  <option value="3">3x parcelas</option>
                  <option value="4">4x parcelas</option>
                  <option value="5">5x parcelas</option>
                  <option value="6">6x parcelas</option>
                  <option value="7">7x parcelas</option>
                  <option value="8">8x parcelas</option>
                  <option value="9">9x parcelas</option>
                  <option value="10">10x parcelas</option>
                  <option value="12">12x parcelas</option>
                  <option value="18">18x parcelas</option>
                  <option value="24">24x parcelas</option>
                </select>
              </div>

              {parseInt(parcelas, 10) > 1 && parseFloat(valor.replace(',', '.')) > 0 && (
                <div className="flex items-center justify-between text-xs text-indigo-300 pt-1 border-t border-indigo-500/20">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Valor de cada parcela:
                  </span>
                  <strong className="font-mono text-emerald-400 font-extrabold">
                    {parcelas}x de R${' '}
                    {(parseFloat(valor.replace(',', '.')) / parseInt(parcelas, 10)).toFixed(2)}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Status do Lançamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus(tipo === 'receita' ? 'Recebido' : 'Pago')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  status === 'Pago' || status === 'Recebido'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {tipo === 'receita' ? 'Recebido' : 'Pago (Liquidado)'}
              </button>
              <button
                type="button"
                onClick={() => setStatus('Pendente')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  status === 'Pendente'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Pendente (Agendado)
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Confirmar Lançamento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
