import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../lib/neon';
import type { CartaoCredito } from '../types/database';
import {
  CreditCard,
  PlusCircle,
  Loader2,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign
} from 'lucide-react';

export const CardsPage: React.FC = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CartaoCredito[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CartaoCredito | null>(null);

  // Card form state
  const [nomeCartao, setNomeCartao] = useState('');
  const [limiteTotal, setLimiteTotal] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('10');
  const [diaVencimento, setDiaVencimento] = useState('17');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Card to delete confirmation state
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

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

  const handleOpenCreate = () => {
    setEditingCard(null);
    setNomeCartao('');
    setLimiteTotal('');
    setDiaFechamento('10');
    setDiaVencimento('17');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (card: CartaoCredito) => {
    setEditingCard(card);
    setNomeCartao(card.nome_cartao);
    setLimiteTotal(card.limite_total.toString());
    setDiaFechamento(card.dia_fechamento?.toString() || '10');
    setDiaVencimento(card.dia_vencimento?.toString() || '17');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setErrorMessage(null);

    const numLimite = parseFloat(limiteTotal.toString().replace(',', '.'));
    if (!nomeCartao.trim() || isNaN(numLimite) || numLimite <= 0) {
      setErrorMessage('Por favor, informe o nome e um limite válido maior que zero.');
      return;
    }

    const fechamento = parseInt(diaFechamento, 10);
    const vencimento = parseInt(diaVencimento, 10);

    if (isNaN(fechamento) || fechamento < 1 || fechamento > 31 || isNaN(vencimento) || vencimento < 1 || vencimento > 31) {
      setErrorMessage('Os dias de fechamento e vencimento devem ser entre 1 e 31.');
      return;
    }

    try {
      setIsSubmitting(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      if (editingCard) {
        // UPDATE existing card
        await sql`
          UPDATE cartoes_credito 
          SET nome_cartao = ${nomeCartao.trim()},
              limite_total = ${numLimite},
              dia_fechamento = ${fechamento},
              dia_vencimento = ${vencimento}
          WHERE id = ${editingCard.id} AND usuario_id = ${user.id};
        `;
        showToast('Cartão atualizado com sucesso!');
      } else {
        // INSERT new card
        await sql`
          INSERT INTO cartoes_credito (usuario_id, nome_cartao, limite_total, dia_fechamento, dia_vencimento)
          VALUES (${user.id}, ${nomeCartao.trim()}, ${numLimite}, ${fechamento}, ${vencimento});
        `;
        showToast('Cartão cadastrado com sucesso!');
      }

      setIsModalOpen(false);
      setEditingCard(null);
      await loadCards();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao salvar cartão:', err);
      setErrorMessage('Erro ao salvar as informações no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCard = async (card: CartaoCredito) => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir o cartão "${card.nome_cartao}"?\n\nAs transações vinculadas a este cartão não serão apagadas, mas o vínculo com o cartão será removido.`
    );

    if (!confirmed) return;

    try {
      setDeletingCardId(card.id);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      // Safely unlink transactions if any
      await sql`
        UPDATE transacoes 
        SET cartao_id = NULL 
        WHERE cartao_id = ${card.id};
      `;

      // Delete card
      await sql`
        DELETE FROM cartoes_credito 
        WHERE id = ${card.id} AND usuario_id = ${user.id};
      `;

      showToast(`Cartão "${card.nome_cartao}" excluído com sucesso.`);
      await loadCards();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao excluir cartão:', err);
      alert('Não foi possível excluir o cartão. Tente novamente.');
    } finally {
      setDeletingCardId(null);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-semibold text-xs shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>{successToast}</span>
        </div>
      )}

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
            Gerencie limites, faturas, datas de fechamento e vencimento dos seus cartões
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Adicionar Cartão</span>
        </button>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-60 bg-slate-900/60 rounded-3xl animate-pulse" />
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
              Cadastre seus cartões de crédito para calcular faturas e melhores datas de compra automaticamente.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Meu Primeiro Cartão</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => {
            const gradients = [
              'from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/30 shadow-indigo-500/10',
              'from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30 shadow-emerald-500/10',
              'from-slate-900 via-purple-950 to-slate-900 border-purple-500/30 shadow-purple-500/10',
            ];
            const currentGradient = gradients[idx % gradients.length];
            const isDeleting = deletingCardId === card.id;

            return (
              <div
                key={card.id}
                className={`rounded-3xl p-6 bg-gradient-to-br ${currentGradient} border shadow-xl flex flex-col justify-between h-64 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${
                  isDeleting ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {/* Card Top: Title, Chip & Action Buttons */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Cartão de Crédito
                    </span>
                    <h3 className="text-lg font-extrabold text-white mt-0.5 truncate" title={card.nome_cartao}>
                      {card.nome_cartao}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(card)}
                      title="Editar informações do cartão"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-sm shadow-sm"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteCard(card)}
                      title="Excluir cartão"
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all cursor-pointer backdrop-blur-sm shadow-sm border border-rose-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Middle: Limit & Chip */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400">Limite Total</span>
                    <p className="text-2xl font-black text-white font-mono tracking-tight">
                      {formatCurrency(Number(card.limite_total) || 0)}
                    </p>
                  </div>
                  <div className="w-10 h-7 rounded-md bg-amber-400/80 ring-1 ring-amber-300/40 shadow-inner" />
                </div>

                {/* Card Bottom: Closing and Due Dates */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Fechamento</span>
                      <span className="font-semibold">Dia {card.dia_fechamento || '10'}</span>
                    </div>
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

      {/* Modal Adicionar / Editar Cartão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingCard ? 'Editar Cartão' : 'Cadastrar Cartão'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingCard
                      ? 'Atualize os dados e limites do cartão'
                      : 'Insira as informações do novo cartão de crédito'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCard(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveCard} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Cartão (Instituição/Bandeira) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank Mastercard, Itaú Visa, XP"
                  value={nomeCartao}
                  onChange={(e) => setNomeCartao(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Limite Total (R$) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Ex: 5000,00"
                    value={limiteTotal}
                    onChange={(e) => setLimiteTotal(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dia Fechamento *
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
                  <span className="text-[10px] text-slate-500 mt-1 block">Melhor data de compra</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dia Vencimento *
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
                  <span className="text-[10px] text-slate-500 mt-1 block">Pagamento da fatura</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCard(null);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : editingCard ? (
                    'Salvar Alterações'
                  ) : (
                    'Cadastrar Cartão'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
