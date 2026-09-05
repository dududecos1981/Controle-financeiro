import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../lib/neon';
import type { CartaoCredito } from '../types/database';
import {
  CreditCard,
  PlusCircle,
  Loader2,
  X
} from 'lucide-react';

export const CardsPage: React.FC = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CartaoCredito[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New card form state
  const [nomeCartao, setNomeCartao] = useState('');
  const [limiteTotal, setLimiteTotal] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('10');
  const [diaVencimento, setDiaVencimento] = useState('17');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCards = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      const rows = await sql`
        SELECT * FROM cartoes_credito 
        WHERE usuario_id = ${user.id}
        ORDER BY created_at DESC;
      `;
      setCards(rows as unknown as CartaoCredito[]);
    } catch (err) {
      console.error('Erro ao buscar cartões:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [user?.id]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setErrorMessage(null);

    const numLimite = parseFloat(limiteTotal.replace(',', '.'));
    if (!nomeCartao.trim() || isNaN(numLimite) || numLimite <= 0) {
      setErrorMessage('Preencha os campos obrigatórios corretamente.');
      return;
    }

    try {
      setIsSubmitting(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      await sql`
        INSERT INTO cartoes_credito (usuario_id, nome_cartao, limite_total, dia_fechamento, dia_vencimento)
        VALUES (${user.id}, ${nomeCartao.trim()}, ${numLimite}, ${parseInt(diaFechamento)}, ${parseInt(diaVencimento)});
      `;

      setNomeCartao('');
      setLimiteTotal('');
      setIsModalOpen(false);
      loadCards();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao cadastrar cartão:', err);
      setErrorMessage('Erro ao salvar no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Cartões de Crédito</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhe faturas, limites disponíveis e melhores datas de compra
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Adicionar Cartão</span>
        </button>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-52 bg-slate-900/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 border border-slate-800">
          <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <CreditCard className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhum cartão cadastrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Cadastre seus cartões de crédito para calcular parcelamentos e fechamentos de fatura automaticamente.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-2.5 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Meu Primeiro Cartão</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => {
            const gradients = [
              'from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/30',
              'from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30',
              'from-slate-900 via-purple-950 to-slate-900 border-purple-500/30',
            ];
            const currentGradient = gradients[idx % gradients.length];

            return (
              <div
                key={card.id}
                className={`rounded-3xl p-6 bg-gradient-to-br ${currentGradient} border shadow-xl flex flex-col justify-between h-56 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cartão de Crédito</span>
                    <h3 className="text-lg font-extrabold text-white mt-0.5">{card.nome_cartao}</h3>
                  </div>
                  <div className="w-10 h-7 rounded-md bg-amber-400/80 ring-1 ring-amber-300/40 shadow-inner" />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Limite Total</span>
                  <p className="text-2xl font-black text-white font-mono">
                    {formatCurrency(Number(card.limite_total) || 0)}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Fechamento</span>
                    <span className="font-semibold">Dia {card.dia_fechamento || '10'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Vencimento</span>
                    <span className="font-semibold text-emerald-400">Dia {card.dia_vencimento || '17'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Adicionar Cartão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Cartão</h3>
                  <p className="text-xs text-slate-400">Insira as informações do cartão de crédito</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateCard} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Cartão (Instituição/Bandeira)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank Mastercard, XP Visa Infinite"
                  value={nomeCartao}
                  onChange={(e) => setNomeCartao(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Limite Total (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Ex: 5000,00"
                  value={limiteTotal}
                  onChange={(e) => setLimiteTotal(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dia Fechamento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={diaFechamento}
                    onChange={(e) => setDiaFechamento(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dia Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={diaVencimento}
                    onChange={(e) => setDiaVencimento(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Cartão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
