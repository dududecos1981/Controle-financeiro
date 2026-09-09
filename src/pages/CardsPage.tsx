import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../lib/neon';
import { createCardPurchase } from '../services/dashboardService';
import type { CartaoCredito, Conta, Transacao } from '../types/database';
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
  DollarSign,
  ShoppingBag,
  Layers,
  ArrowRight,
  Check,
  Tag
} from 'lucide-react';

interface CardWithMetrics extends CartaoCredito {
  valorUtilizado: number;
  limiteDisponivel: number;
  percentualUtilizado: number;
}

export const CardsPage: React.FC = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardWithMetrics[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [cardTransactions, setCardTransactions] = useState<(Transacao & { cartao_nome?: string })[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);

  // Modal 1: Adicionar / Editar Cartão
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CartaoCredito | null>(null);
  const [nomeCartao, setNomeCartao] = useState('');
  const [limiteTotal, setLimiteTotal] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('10');
  const [diaVencimento, setDiaVencimento] = useState('17');
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null);

  // Modal 2: Nova Compra com Parcelamento
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseCartaoId, setPurchaseCartaoId] = useState('');
  const [purchaseContaId, setPurchaseContaId] = useState('');
  const [purchaseDescricao, setPurchaseDescricao] = useState('');
  const [purchaseValorTotal, setPurchaseValorTotal] = useState('');
  const [purchaseParcelas, setPurchaseParcelas] = useState('1');
  const [purchaseCategoria, setPurchaseCategoria] = useState('Compras & Variados');
  const [purchaseDataPrimeira, setPurchaseDataPrimeira] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [purchaseObservacoes, setPurchaseObservacoes] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseErrorMessage, setPurchaseErrorMessage] = useState<string | null>(null);

  // Toast notification
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      const [cardsRaw, accountsRaw, transactionsRaw] = await Promise.all([
        sql`SELECT * FROM cartoes_credito WHERE usuario_id = ${user.id} ORDER BY created_at DESC;`,
        sql`SELECT * FROM contas WHERE usuario_id = ${user.id} ORDER BY created_at ASC;`,
        sql`
          SELECT t.*, cc.nome_cartao as cartao_nome
          FROM transacoes t
          JOIN cartoes_credito cc ON t.cartao_id = cc.id
          WHERE cc.usuario_id = ${user.id}
          ORDER BY t.data_vencimento ASC NULLS LAST, t.created_at DESC;
        `
      ]);

      const baseCards = cardsRaw as unknown as CartaoCredito[];
      const accs = accountsRaw as unknown as Conta[];
      const txs = (transactionsRaw as unknown as (Transacao & { cartao_nome?: string })[]).map((t) => ({
        ...t,
        valor: Number(t.valor) || 0
      }));

      setContas(accs);
      setCardTransactions(txs);

      // Compute metrics per card
      const enrichedCards: CardWithMetrics[] = baseCards.map((c) => {
        const limTotal = Number(c.limite_total) || 0;
        // Total utilized is the sum of pending / unpaid transactions in this card
        const cardPendingTxs = txs.filter((t) => t.cartao_id === c.id && t.status !== 'Pago');
        const valorUtilizado = cardPendingTxs.reduce((acc, t) => acc + Math.abs(t.valor), 0);
        const limiteDisponivel = Math.max(0, limTotal - valorUtilizado);
        const percentualUtilizado = limTotal > 0 ? Math.min(100, Math.round((valorUtilizado / limTotal) * 100)) : 0;

        return {
          ...c,
          limite_total: limTotal,
          valorUtilizado,
          limiteDisponivel,
          percentualUtilizado
        };
      });

      setCards(enrichedCards);

      if (baseCards.length > 0 && !purchaseCartaoId) {
        setPurchaseCartaoId(baseCards[0].id);
      }
      if (accs.length > 0 && !purchaseContaId) {
        setPurchaseContaId(accs[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar cartões e transações:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, purchaseCartaoId, purchaseContaId]);

  useEffect(() => {
    loadData();

    const handleCreated = () => loadData();
    window.addEventListener('transaction-created', handleCreated);
    return () => window.removeEventListener('transaction-created', handleCreated);
  }, [loadData]);

  // Card Modal Handlers
  const handleOpenCreateCard = () => {
    setEditingCard(null);
    setNomeCartao('');
    setLimiteTotal('');
    setDiaFechamento('10');
    setDiaVencimento('17');
    setCardErrorMessage(null);
    setIsCardModalOpen(true);
  };

  const handleOpenEditCard = (card: CartaoCredito) => {
    setEditingCard(card);
    setNomeCartao(card.nome_cartao);
    setLimiteTotal(card.limite_total.toString());
    setDiaFechamento(card.dia_fechamento?.toString() || '10');
    setDiaVencimento(card.dia_vencimento?.toString() || '17');
    setCardErrorMessage(null);
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setCardErrorMessage(null);

    const numLimite = parseFloat(limiteTotal.toString().replace(',', '.'));
    if (!nomeCartao.trim() || isNaN(numLimite) || numLimite <= 0) {
      setCardErrorMessage('Por favor, informe o nome do cartão e um limite válido.');
      return;
    }

    const fechamento = parseInt(diaFechamento, 10);
    const vencimento = parseInt(diaVencimento, 10);

    if (isNaN(fechamento) || fechamento < 1 || fechamento > 31 || isNaN(vencimento) || vencimento < 1 || vencimento > 31) {
      setCardErrorMessage('Os dias de fechamento e vencimento devem ser entre 1 e 31.');
      return;
    }

    try {
      setIsSubmittingCard(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      if (editingCard) {
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
        await sql`
          INSERT INTO cartoes_credito (usuario_id, nome_cartao, limite_total, dia_fechamento, dia_vencimento)
          VALUES (${user.id}, ${nomeCartao.trim()}, ${numLimite}, ${fechamento}, ${vencimento});
        `;
        showToast('Cartão cadastrado com sucesso!');
      }

      setIsCardModalOpen(false);
      setEditingCard(null);
      await loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao salvar cartão:', err);
      setCardErrorMessage('Erro ao salvar as informações no banco de dados.');
    } finally {
      setIsSubmittingCard(false);
    }
  };

  const handleDeleteCard = async (card: CartaoCredito) => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir o cartão "${card.nome_cartao}"?\n\nAs transações deste cartão serão mantidas no histórico desvinculadas.`
    );
    if (!confirmed) return;

    try {
      setDeletingCardId(card.id);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      await sql`UPDATE transacoes SET cartao_id = NULL WHERE cartao_id = ${card.id};`;
      await sql`DELETE FROM cartoes_credito WHERE id = ${card.id} AND usuario_id = ${user.id};`;

      showToast(`Cartão "${card.nome_cartao}" excluído.`);
      await loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao excluir cartão:', err);
      alert('Não foi possível excluir o cartão.');
    } finally {
      setDeletingCardId(null);
    }
  };

  // Purchase Modal Handlers (Lançar Compra / Parcelamento)
  const handleOpenPurchaseModal = (targetCardId?: string) => {
    if (targetCardId) {
      setPurchaseCartaoId(targetCardId);
    } else if (cards.length > 0) {
      setPurchaseCartaoId(cards[0].id);
    }
    if (contas.length > 0 && !purchaseContaId) {
      setPurchaseContaId(contas[0].id);
    }
    setPurchaseDescricao('');
    setPurchaseValorTotal('');
    setPurchaseParcelas('1');
    setPurchaseCategoria('Compras & Variados');
    setPurchaseDataPrimeira(new Date().toISOString().split('T')[0]);
    setPurchaseObservacoes('');
    setPurchaseErrorMessage(null);
    setIsPurchaseModalOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setPurchaseErrorMessage(null);

    const numTotal = parseFloat(purchaseValorTotal.replace(',', '.'));
    if (!purchaseDescricao.trim() || isNaN(numTotal) || numTotal <= 0) {
      setPurchaseErrorMessage('Informe uma descrição e um valor total válido maior que zero.');
      return;
    }

    if (!purchaseCartaoId) {
      setPurchaseErrorMessage('Selecione o cartão de crédito da compra.');
      return;
    }

    if (!purchaseContaId) {
      setPurchaseErrorMessage('Selecione uma conta bancária vinculada para pagamento.');
      return;
    }

    const numParcelas = parseInt(purchaseParcelas, 10);
    if (isNaN(numParcelas) || numParcelas < 1 || numParcelas > 48) {
      setPurchaseErrorMessage('O número de parcelas deve ser entre 1 e 48.');
      return;
    }

    try {
      setIsSubmittingPurchase(true);

      await createCardPurchase(user.id, {
        conta_id: purchaseContaId,
        cartao_id: purchaseCartaoId,
        descricao: purchaseDescricao.trim(),
        categoria: purchaseCategoria,
        valorTotal: numTotal,
        parcelas: numParcelas,
        dataPrimeiraParcela: purchaseDataPrimeira,
        observacoes: purchaseObservacoes.trim() || null
      });

      showToast(
        numParcelas > 1
          ? `Compra parcelada em ${numParcelas}x de R$ ${(numTotal / numParcelas).toFixed(2)} cadastrada com sucesso!`
          : 'Compra no cartão lançada com sucesso!'
      );

      setIsPurchaseModalOpen(false);
      await loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao lançar compra parcelada:', err);
      setPurchaseErrorMessage('Erro ao persistir as parcelas no banco de dados.');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const handleToggleTransactionStatus = async (txId: string, currentStatus: string) => {
    if (!user?.id) return;
    try {
      const newStatus = currentStatus === 'Pago' ? 'Pendente' : 'Pago';
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;
      await sql`
        UPDATE transacoes 
        SET status = ${newStatus}, 
            data_pagamento = ${newStatus === 'Pago' ? new Date().toISOString().split('T')[0] : null}
        WHERE id = ${txId};
      `;
      await loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao liquidar parcela:', err);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!user?.id) return;
    if (!window.confirm('Deseja excluir este lançamento de fatura?')) return;
    try {
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;
      await sql`DELETE FROM transacoes WHERE id = ${txId};`;
      showToast('Lançamento excluído.');
      await loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao excluir transação:', err);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return 'Sem data';
    try {
      if (typeof dateVal === 'string') {
        const parts = dateVal.split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Sem data';
      return d.toLocaleDateString('pt-BR');
    } catch {
      return 'Sem data';
    }
  };

  // Filtered transactions for the invoice table
  const filteredTransactions = cardTransactions.filter((t) => {
    if (selectedCardId === 'todos') return true;
    return t.cartao_id === selectedCardId;
  });

  // Calculate live preview for parcelas in modal
  const previewValorTotal = parseFloat(purchaseValorTotal.replace(',', '.')) || 0;
  const previewParcelas = parseInt(purchaseParcelas, 10) || 1;
  const previewValorParcela = previewValorTotal > 0 && previewParcelas > 0 ? previewValorTotal / previewParcelas : 0;

  const categoriasCompra = [
    'Compras & Variados',
    'Eletrônicos',
    'Supermercado / Alimentação',
    'Vestuário & Moda',
    'Saúde & Farmácia',
    'Assinaturas & Streaming',
    'Transporte & Combustível',
    'Viagens & Hospedagem',
    'Lazer & Entretenimento',
    'Outros'
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
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
            Acompanhe o limite total, valor utilizado, faturas e compras divididas em parcelas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {cards.length > 0 && (
            <button
              onClick={() => handleOpenPurchaseModal()}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              <span>Lançar Compra / Parcelas</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateCard}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Adicionar Cartão</span>
          </button>
        </div>
      </div>

      {/* Cards List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-slate-900/60 rounded-3xl animate-pulse" />
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
              Cadastre seus cartões de crédito para calcular limites, faturas e parcelamentos automaticamente.
            </p>
          </div>
          <button
            onClick={handleOpenCreateCard}
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
                className={`rounded-3xl p-6 bg-gradient-to-br ${currentGradient} border shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${
                  isDeleting ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {/* Header: Name, Badge & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Cartão de Crédito
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-0.5 truncate" title={card.nome_cartao}>
                      {card.nome_cartao}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenPurchaseModal(card.id)}
                      title="Lançar compra neste cartão"
                      className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 transition-all cursor-pointer backdrop-blur-sm border border-emerald-500/30"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEditCard(card)}
                      title="Editar dados do cartão"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-sm shadow-sm"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card)}
                      title="Excluir cartão"
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all cursor-pointer backdrop-blur-sm border border-rose-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Values Overview: Utilizado vs Disponível */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] font-semibold uppercase text-rose-400 block">
                      Valor Utilizado
                    </span>
                    <p className="text-lg font-extrabold text-rose-300 font-mono mt-0.5">
                      {formatCurrency(card.valorUtilizado)}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] font-semibold uppercase text-emerald-400 block">
                      Limite Disponível
                    </span>
                    <p className="text-lg font-extrabold text-emerald-300 font-mono mt-0.5">
                      {formatCurrency(card.limiteDisponivel)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar for Limit Usage */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Limite Total: <strong className="text-white font-mono">{formatCurrency(card.limite_total)}</strong>
                    </span>
                    <span className={`font-bold font-mono ${card.percentualUtilizado > 80 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {card.percentualUtilizado}% usado
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        card.percentualUtilizado > 80
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                          : card.percentualUtilizado > 50
                          ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                          : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                      }`}
                      style={{ width: `${Math.max(2, card.percentualUtilizado)}%` }}
                    />
                  </div>
                </div>

                {/* Footer: Fechamento & Vencimento */}
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

      {/* Invoice & Installment Transactions Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden space-y-4 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Extrato de Compras & Parcelas</h3>
              <p className="text-xs text-slate-400">Detalhamento de faturas e compras divididas</p>
            </div>
          </div>

          {cards.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Filtrar por Cartão:</label>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="py-1.5 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="todos">Todos os Cartões</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_cartao}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
              <Tag className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">Nenhuma compra registrada para este cartão</p>
            <p className="text-xs text-slate-500">
              Clique em "Lançar Compra / Parcelas" para registrar uma nova despesa dividida.
            </p>
            {cards.length > 0 && (
              <button
                onClick={() => handleOpenPurchaseModal()}
                className="mt-2 py-2 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Compra Agora</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Compra / Descrição</th>
                  <th className="py-3 px-4">Cartão</th>
                  <th className="py-3 px-4">Vencimento Fatura</th>
                  <th className="py-3 px-4 text-right">Valor da Parcela</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((t) => {
                  const isPaid = t.status === 'Pago' || t.status === 'Recebido';
                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-white truncate max-w-xs">{t.descricao}</p>
                          <span className="text-[11px] text-slate-400">{t.categoria || 'Geral'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {t.cartao_nome || 'Cartão'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">
                        {formatDate(t.data_vencimento || t.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                        - {formatCurrency(Math.abs(t.valor))}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {isPaid ? 'Fatura Paga' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleToggleTransactionStatus(t.id, t.status)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer"
                          >
                            {isPaid ? 'Desmarcar' : 'Liquidar'}
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            title="Excluir lançamento"
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

      {/* MODAL 1: Adicionar / Editar Cartão */}
      {isCardModalOpen && (
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
                  setIsCardModalOpen(false);
                  setEditingCard(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cardErrorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cardErrorMessage}</span>
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
                  Limite Total do Cartão (R$) *
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
                    setIsCardModalOpen(false);
                    setEditingCard(null);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCard}
                  className="py-2.5 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCard ? (
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

      {/* MODAL 2: Lançar Compra / Parcelas no Cartão */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-700/80 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Lançar Compra no Cartão</h3>
                  <p className="text-xs text-slate-400">
                    Registre compras à vista ou divididas em várias parcelas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {purchaseErrorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{purchaseErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePurchase} className="mt-5 space-y-4">
              {/* Seleção do Cartão */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cartão de Crédito *
                </label>
                <select
                  value={purchaseCartaoId}
                  onChange={(e) => setPurchaseCartaoId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_cartao} (Disp: {formatCurrency(c.limiteDisponivel)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição da Compra *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Celular Samsung, Supermercado do Mês, Notebook"
                  value={purchaseDescricao}
                  onChange={(e) => setPurchaseDescricao(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>

              {/* Valor Total & Parcelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor Total da Compra (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={purchaseValorTotal}
                    onChange={(e) => setPurchaseValorTotal(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dividir em Quantas Vezes? *
                  </label>
                  <select
                    value={purchaseParcelas}
                    onChange={(e) => setPurchaseParcelas(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="1">1x à vista (Sem parcelamento)</option>
                    <option value="2">2x parcelas</option>
                    <option value="3">3x parcelas</option>
                    <option value="4">4x parcelas</option>
                    <option value="5">5x parcelas</option>
                    <option value="6">6x parcelas</option>
                    <option value="7">7x parcelas</option>
                    <option value="8">8x parcelas</option>
                    <option value="9">9x parcelas</option>
                    <option value="10">10x parcelas</option>
                    <option value="11">11x parcelas</option>
                    <option value="12">12x parcelas</option>
                    <option value="18">18x parcelas</option>
                    <option value="24">24x parcelas</option>
                    <option value="36">36x parcelas</option>
                    <option value="48">48x parcelas</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Live Parcel Preview Banner */}
              {previewValorTotal > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>
                      {previewParcelas > 1 ? (
                        <>
                          Plano: <strong>{previewParcelas} parcelas mensais</strong>
                        </>
                      ) : (
                        'Compra à vista no cartão'
                      )}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-emerald-400">
                    {previewParcelas > 1
                      ? `${previewParcelas}x de ${formatCurrency(previewValorParcela)}`
                      : formatCurrency(previewValorTotal)}
                  </span>
                </div>
              )}

              {/* Data 1ª Parcela & Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Data da Compra / 1ª Parcela *
                  </label>
                  <input
                    type="date"
                    value={purchaseDataPrimeira}
                    onChange={(e) => setPurchaseDataPrimeira(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={purchaseCategoria}
                    onChange={(e) => setPurchaseCategoria(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {categoriasCompra.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conta Bancária Vinculada */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Conta Bancária (para quitação da fatura) *
                </label>
                <select
                  value={purchaseContaId}
                  onChange={(e) => setPurchaseContaId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {contas.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome_instituicao} ({acc.tipo_conta || 'Conta Corrente'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Compra na Magazine Luiza, Garantia estendida"
                  value={purchaseObservacoes}
                  onChange={(e) => setPurchaseObservacoes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPurchase}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPurchase ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando parcelas...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar Compra</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
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
