import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../lib/neon';
import { createCardPurchase, createTransaction } from '../services/dashboardService';
import {
  fetchSpecialLimits,
  createSpecialLimit,
  updateSpecialLimit,
  deleteSpecialLimit,
  createSpecialLimitTransaction,
  deleteSpecialLimitTransaction,
  type SpecialLimitWithMetrics
} from '../services/specialLimitService';
import type { CartaoCredito, Conta, Transacao, LimiteEspecial } from '../types/database';
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
  Tag,
  Zap,
  Landmark,
  Percent,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft
} from 'lucide-react';

interface CardWithMetrics extends CartaoCredito {
  valorUtilizado: number;
  limiteDisponivel: number;
  percentualUtilizado: number;
}

interface ContaWithMetrics extends Conta {
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  transacoesCount: number;
}

export const CardsPage: React.FC = () => {
  const { user } = useAuth();

  // Active Main Tab: 'cartoes' (Crédito) | 'debito' (Débito & Contas) | 'limite_especial' (Cheque Especial)
  const [activeTab, setActiveTab] = useState<'cartoes' | 'debito' | 'limite_especial'>('cartoes');

  // Credit Cards State
  const [cards, setCards] = useState<CardWithMetrics[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [contasWithMetrics, setContasWithMetrics] = useState<ContaWithMetrics[]>([]);
  const [cardTransactions, setCardTransactions] = useState<(Transacao & { cartao_nome?: string })[]>([]);
  const [debitTransactions, setDebitTransactions] = useState<(Transacao & { conta_nome?: string })[]>([]);
  
  const [selectedCardId, setSelectedCardId] = useState<string>('todos');
  const [selectedDebitContaId, setSelectedDebitContaId] = useState<string>('todos');
  const [isLoading, setIsLoading] = useState(true);

  // Special Limits (Cheque / Limite Especial) State
  const [specialLimits, setSpecialLimits] = useState<SpecialLimitWithMetrics[]>([]);
  const [isLoadingSpecialLimits, setIsLoadingSpecialLimits] = useState(false);
  const [selectedSpecialLimitId, setSelectedSpecialLimitId] = useState<string>('todos');

  // Modal 1: Adicionar / Editar Cartão de Crédito
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CartaoCredito | null>(null);
  const [nomeCartao, setNomeCartao] = useState('');
  const [limiteTotal, setLimiteTotal] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('10');
  const [diaVencimento, setDiaVencimento] = useState('17');
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null);

  // Modal 2: Nova Compra com Parcelamento (Cartão Crédito)
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

  // Modal 3: Adicionar / Editar Cartão de Débito / Conta Bancária
  const [isDebitAccountModalOpen, setIsDebitAccountModalOpen] = useState(false);
  const [editingDebitAccount, setEditingDebitAccount] = useState<Conta | null>(null);
  const [debitNomeInstituicao, setDebitNomeInstituicao] = useState('');
  const [debitTipoConta, setDebitTipoConta] = useState('Conta Corrente / Débito');
  const [debitSaldoInicial, setDebitSaldoInicial] = useState('0');
  const [isSubmittingDebitAccount, setIsSubmittingDebitAccount] = useState(false);
  const [debitAccountErrorMessage, setDebitAccountErrorMessage] = useState<string | null>(null);

  // Modal 4: Lançar Movimentação no Débito (Despesa ou Depósito / Entrada de Saldo)
  const [isDebitTxModalOpen, setIsDebitTxModalOpen] = useState(false);
  const [debitTxContaId, setDebitTxContaId] = useState('');
  const [debitTxTipo, setDebitTxTipo] = useState<'despesa' | 'deposito'>('despesa');
  const [debitTxValor, setDebitTxValor] = useState('');
  const [debitTxDescricao, setDebitTxDescricao] = useState('');
  const [debitTxCategoria, setDebitTxCategoria] = useState('Geral');
  const [debitTxData, setDebitTxData] = useState(new Date().toISOString().split('T')[0]);
  const [debitTxObservacoes, setDebitTxObservacoes] = useState('');
  const [isSubmittingDebitTx, setIsSubmittingDebitTx] = useState(false);
  const [debitTxErrorMessage, setDebitTxErrorMessage] = useState<string | null>(null);

  // Modal 5: Adicionar / Editar Limite Especial
  const [isSpecialLimitModalOpen, setIsSpecialLimitModalOpen] = useState(false);
  const [editingSpecialLimit, setEditingSpecialLimit] = useState<LimiteEspecial | null>(null);
  const [spNomeInstituicao, setSpNomeInstituicao] = useState('');
  const [spContaId, setSpContaId] = useState('');
  const [spLimiteTotal, setSpLimiteTotal] = useState('');
  const [spTaxaJuros, setSpTaxaJuros] = useState('8.0');
  const [spDiaVencimento, setSpDiaVencimento] = useState('10');
  const [spObservacoes, setSpObservacoes] = useState('');
  const [isSubmittingSpecialLimit, setIsSubmittingSpecialLimit] = useState(false);
  const [specialLimitErrorMessage, setSpecialLimitErrorMessage] = useState<string | null>(null);

  // Modal 6: Lançar Utilização / Amortização de Limite Especial
  const [isSpTxModalOpen, setIsSpTxModalOpen] = useState(false);
  const [spTxLimitId, setSpTxLimitId] = useState('');
  const [spTxTipo, setSpTxTipo] = useState<'Utilização' | 'Amortização'>('Utilização');
  const [spTxValor, setSpTxValor] = useState('');
  const [spTxData, setSpTxData] = useState(new Date().toISOString().split('T')[0]);
  const [spTxDescricao, setSpTxDescricao] = useState('');
  const [spTxObservacoes, setSpTxObservacoes] = useState('');
  const [isSubmittingSpTx, setIsSubmittingSpTx] = useState(false);
  const [spTxErrorMessage, setSpTxErrorMessage] = useState<string | null>(null);

  // Toast notification
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [deletingDebitAccountId, setDeletingDebitAccountId] = useState<string | null>(null);
  const [deletingSpLimitId, setDeletingSpLimitId] = useState<string | null>(null);

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

      const [cardsRaw, accountsRaw, creditTxsRaw, debitTxsRaw] = await Promise.all([
        sql`SELECT * FROM cartoes_credito WHERE usuario_id = ${user.id} ORDER BY created_at DESC;`,
        sql`SELECT * FROM contas WHERE usuario_id = ${user.id} ORDER BY created_at ASC;`,
        sql`
          SELECT t.*, cc.nome_cartao as cartao_nome
          FROM transacoes t
          JOIN cartoes_credito cc ON t.cartao_id = cc.id
          WHERE cc.usuario_id = ${user.id}
          ORDER BY t.data_vencimento ASC NULLS LAST, t.created_at DESC;
        `,
        sql`
          SELECT t.*, c.nome_instituicao as conta_nome
          FROM transacoes t
          JOIN contas c ON t.conta_id = c.id
          WHERE c.usuario_id = ${user.id} AND t.cartao_id IS NULL
          ORDER BY t.data_pagamento DESC NULLS LAST, t.created_at DESC;
        `
      ]);

      const baseCards = cardsRaw as unknown as CartaoCredito[];
      const accs = (accountsRaw as unknown as Conta[]).map(a => ({
        ...a,
        saldo_inicial: Number(a.saldo_inicial) || 0
      }));

      // If user has no account yet, create one default
      if (accs.length === 0) {
        const created = await sql`
          INSERT INTO contas (usuario_id, nome_instituicao, saldo_inicial, tipo_conta)
          VALUES (${user.id}, 'Conta Principal (Débito)', 0, 'Conta Corrente / Débito')
          RETURNING id, usuario_id, nome_instituicao, saldo_inicial, tipo_conta, created_at;
        `;
        if (created && created.length > 0) {
          accs.push({
            ...(created[0] as unknown as Conta),
            saldo_inicial: Number(created[0].saldo_inicial) || 0
          });
        }
      }

      const creditTxs = (creditTxsRaw as unknown as (Transacao & { cartao_nome?: string })[]).map((t) => ({
        ...t,
        valor: Number(t.valor) || 0
      }));

      const debTxs = (debitTxsRaw as unknown as (Transacao & { conta_nome?: string })[]).map((t) => ({
        ...t,
        valor: Number(t.valor) || 0
      }));

      setContas(accs);
      setCardTransactions(creditTxs);
      setDebitTransactions(debTxs);

      // Compute metrics per credit card
      const enrichedCards: CardWithMetrics[] = baseCards.map((c) => {
        const limTotal = Number(c.limite_total) || 0;
        const cardPendingTxs = creditTxs.filter((t) => t.cartao_id === c.id && t.status !== 'Pago');
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

      // Compute metrics per debit account / card
      const enrichedContas: ContaWithMetrics[] = accs.map((acc) => {
        const sInicial = Number(acc.saldo_inicial) || 0;
        const myTxs = debTxs.filter((t) => t.conta_id === acc.id);
        const totalEntradas = myTxs
          .filter((t) => (t.status === 'Pago' || t.status === 'Recebido') && t.valor > 0)
          .reduce((sum, t) => sum + t.valor, 0);
        const totalSaidas = myTxs
          .filter((t) => t.status === 'Pago' && t.valor < 0)
          .reduce((sum, t) => sum + Math.abs(t.valor), 0);
        const saldoAtual = sInicial + totalEntradas - totalSaidas;

        return {
          ...acc,
          saldo_inicial: sInicial,
          totalEntradas,
          totalSaidas,
          saldoAtual,
          transacoesCount: myTxs.length
        };
      });
      setContasWithMetrics(enrichedContas);

      if (baseCards.length > 0 && !purchaseCartaoId) {
        setPurchaseCartaoId(baseCards[0].id);
      }
      if (accs.length > 0) {
        if (!purchaseContaId) setPurchaseContaId(accs[0].id);
        if (!spContaId) setSpContaId(accs[0].id);
        if (!debitTxContaId) setDebitTxContaId(accs[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar cartões e transações:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, purchaseCartaoId, purchaseContaId, spContaId, debitTxContaId]);

  const loadSpecialLimitsData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoadingSpecialLimits(true);
      const res = await fetchSpecialLimits(user.id);
      setSpecialLimits(res);
      if (res.length > 0 && !spTxLimitId) {
        setSpTxLimitId(res[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar limites especiais:', err);
    } finally {
      setIsLoadingSpecialLimits(false);
    }
  }, [user?.id, spTxLimitId]);

  useEffect(() => {
    loadData();
    loadSpecialLimitsData();

    const handleCreated = () => {
      loadData();
      loadSpecialLimitsData();
    };
    window.addEventListener('transaction-created', handleCreated);
    return () => window.removeEventListener('transaction-created', handleCreated);
  }, [loadData, loadSpecialLimitsData]);

  // =========================================================================
  // HANDLERS: CARTÃO DE CRÉDITO
  // =========================================================================
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
        showToast('Cartão de crédito atualizado com sucesso!');
      } else {
        await sql`
          INSERT INTO cartoes_credito (usuario_id, nome_cartao, limite_total, dia_fechamento, dia_vencimento)
          VALUES (${user.id}, ${nomeCartao.trim()}, ${numLimite}, ${fechamento}, ${vencimento});
        `;
        showToast('Cartão de crédito cadastrado com sucesso!');
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

  // =========================================================================
  // HANDLERS: COMPRA / PARCELAS (CRÉDITO)
  // =========================================================================
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

  // =========================================================================
  // HANDLERS: CARTÃO DE DÉBITO / CONTA BANCÁRIA COM SALDO
  // =========================================================================
  const handleOpenCreateDebitAccount = () => {
    setEditingDebitAccount(null);
    setDebitNomeInstituicao('');
    setDebitTipoConta('Conta Corrente / Débito');
    setDebitSaldoInicial('0');
    setDebitAccountErrorMessage(null);
    setIsDebitAccountModalOpen(true);
  };

  const handleOpenEditDebitAccount = (conta: Conta) => {
    setEditingDebitAccount(conta);
    setDebitNomeInstituicao(conta.nome_instituicao);
    setDebitTipoConta(conta.tipo_conta || 'Conta Corrente / Débito');
    setDebitSaldoInicial(conta.saldo_inicial.toString());
    setDebitAccountErrorMessage(null);
    setIsDebitAccountModalOpen(true);
  };

  const handleSaveDebitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setDebitAccountErrorMessage(null);

    const numSaldo = parseFloat(debitSaldoInicial.toString().replace(',', '.'));
    if (!debitNomeInstituicao.trim()) {
      setDebitAccountErrorMessage('Por favor, informe o nome da instituição ou cartão de débito.');
      return;
    }

    if (isNaN(numSaldo)) {
      setDebitAccountErrorMessage('Por favor, informe um saldo inicial válido (pode ser 0).');
      return;
    }

    try {
      setIsSubmittingDebitAccount(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      if (editingDebitAccount) {
        await sql`
          UPDATE contas 
          SET nome_instituicao = ${debitNomeInstituicao.trim()},
              tipo_conta = ${debitTipoConta},
              saldo_inicial = ${numSaldo}
          WHERE id = ${editingDebitAccount.id} AND usuario_id = ${user.id};
        `;
        showToast('Cartão de Débito / Conta atualizado com sucesso!');
      } else {
        await sql`
          INSERT INTO contas (usuario_id, nome_instituicao, tipo_conta, saldo_inicial)
          VALUES (${user.id}, ${debitNomeInstituicao.trim()}, ${debitTipoConta}, ${numSaldo});
        `;
        showToast('Cartão de Débito / Conta cadastrado com sucesso!');
      }

      setIsDebitAccountModalOpen(false);
      setEditingDebitAccount(null);
      await loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao salvar conta/cartão débito:', err);
      setDebitAccountErrorMessage('Erro ao salvar as informações no banco de dados.');
    } finally {
      setIsSubmittingDebitAccount(false);
    }
  };

  const handleDeleteDebitAccount = async (conta: Conta) => {
    if (!user?.id) return;

    if (contas.length <= 1) {
      alert('Você precisa manter pelo menos uma conta/cartão de débito principal no sistema.');
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente excluir o Cartão de Débito / Conta "${conta.nome_instituicao}"?\n\nTodas as movimentações vinculadas a esta conta serão removidas.`
    );
    if (!confirmed) return;

    try {
      setDeletingDebitAccountId(conta.id);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      await sql`DELETE FROM transacoes WHERE conta_id = ${conta.id};`;
      await sql`DELETE FROM contas WHERE id = ${conta.id} AND usuario_id = ${user.id};`;

      showToast(`Conta/Cartão "${conta.nome_instituicao}" excluído com sucesso.`);
      await loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      alert('Não foi possível excluir a conta.');
    } finally {
      setDeletingDebitAccountId(null);
    }
  };

  // =========================================================================
  // HANDLERS: MOVIMENTAÇÃO NO DÉBITO (DESPESA OU DEPÓSITO DE SALDO)
  // =========================================================================
  const handleOpenDebitTxModal = (
    targetContaId?: string,
    defaultTipo: 'despesa' | 'deposito' = 'despesa'
  ) => {
    if (targetContaId) {
      setDebitTxContaId(targetContaId);
    } else if (contas.length > 0) {
      setDebitTxContaId(contas[0].id);
    }
    setDebitTxTipo(defaultTipo);
    setDebitTxValor('');
    setDebitTxDescricao('');
    setDebitTxCategoria(defaultTipo === 'despesa' ? 'Alimentação & Mercado' : 'Depósito / Saldo');
    setDebitTxData(new Date().toISOString().split('T')[0]);
    setDebitTxObservacoes('');
    setDebitTxErrorMessage(null);
    setIsDebitTxModalOpen(true);
  };

  const handleSaveDebitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setDebitTxErrorMessage(null);

    const numValor = parseFloat(debitTxValor.replace(',', '.'));
    if (!debitTxDescricao.trim() || isNaN(numValor) || numValor <= 0) {
      setDebitTxErrorMessage('Informe uma descrição e um valor válido maior que zero.');
      return;
    }

    if (!debitTxContaId) {
      setDebitTxErrorMessage('Selecione o cartão de débito / conta bancária.');
      return;
    }

    try {
      setIsSubmittingDebitTx(true);
      const finalValor = debitTxTipo === 'despesa' ? -Math.abs(numValor) : Math.abs(numValor);
      const finalStatus = debitTxTipo === 'deposito' ? 'Recebido' : 'Pago';

      await createTransaction(user.id, {
        conta_id: debitTxContaId,
        cartao_id: null,
        descricao: debitTxDescricao.trim(),
        categoria: debitTxCategoria,
        valor: finalValor,
        status: finalStatus,
        data_pagamento: debitTxData,
        data_vencimento: debitTxData,
        observacoes: debitTxObservacoes.trim() || null
      });

      showToast(
        debitTxTipo === 'despesa'
          ? 'Despesa no Débito registrada com sucesso!'
          : 'Depósito/Saldo creditado com sucesso na conta!'
      );

      setIsDebitTxModalOpen(false);
      await loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao lançar movimentação no débito:', err);
      setDebitTxErrorMessage('Erro ao persistir a movimentação no banco de dados.');
    } finally {
      setIsSubmittingDebitTx(false);
    }
  };

  // =========================================================================
  // HANDLERS: LIMITE ESPECIAL (CHEQUE ESPECIAL)
  // =========================================================================
  const handleOpenCreateSpecialLimit = () => {
    setEditingSpecialLimit(null);
    setSpNomeInstituicao('');
    if (contas.length > 0) setSpContaId(contas[0].id);
    setSpLimiteTotal('');
    setSpTaxaJuros('8.0');
    setSpDiaVencimento('10');
    setSpObservacoes('');
    setSpecialLimitErrorMessage(null);
    setIsSpecialLimitModalOpen(true);
  };

  const handleOpenEditSpecialLimit = (limit: SpecialLimitWithMetrics) => {
    setEditingSpecialLimit(limit);
    setSpNomeInstituicao(limit.nome_instituicao);
    setSpContaId(limit.conta_id || (contas.length > 0 ? contas[0].id : ''));
    setSpLimiteTotal(limit.limite_total.toString());
    setSpTaxaJuros(limit.taxa_juros_mensal?.toString() || '8.0');
    setSpDiaVencimento(limit.dia_vencimento?.toString() || '10');
    setSpObservacoes(limit.observacoes || '');
    setSpecialLimitErrorMessage(null);
    setIsSpecialLimitModalOpen(true);
  };

  const handleSaveSpecialLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSpecialLimitErrorMessage(null);

    const numLimite = parseFloat(spLimiteTotal.replace(',', '.'));
    if (!spNomeInstituicao.trim() || isNaN(numLimite) || numLimite <= 0) {
      setSpecialLimitErrorMessage('Informe o nome da instituição e um limite total válido maior que zero.');
      return;
    }

    try {
      setIsSubmittingSpecialLimit(true);
      const taxa = parseFloat(spTaxaJuros.replace(',', '.')) || 8.0;
      const diaVenc = parseInt(spDiaVencimento, 10) || 10;

      if (editingSpecialLimit) {
        await updateSpecialLimit(user.id, editingSpecialLimit.id, {
          nome_instituicao: spNomeInstituicao.trim(),
          conta_id: spContaId || null,
          limite_total: numLimite,
          taxa_juros_mensal: taxa,
          dia_vencimento: diaVenc,
          observacoes: spObservacoes.trim() || null
        });
        showToast('Limite Especial atualizado com sucesso!');
      } else {
        await createSpecialLimit(user.id, {
          nome_instituicao: spNomeInstituicao.trim(),
          conta_id: spContaId || null,
          limite_total: numLimite,
          taxa_juros_mensal: taxa,
          dia_vencimento: diaVenc,
          observacoes: spObservacoes.trim() || null
        });
        showToast('Limite Especial cadastrado com sucesso!');
      }

      setIsSpecialLimitModalOpen(false);
      setEditingSpecialLimit(null);
      await loadSpecialLimitsData();
    } catch (err) {
      console.error('Erro ao salvar limite especial:', err);
      setSpecialLimitErrorMessage('Erro ao persistir o limite especial.');
    } finally {
      setIsSubmittingSpecialLimit(false);
    }
  };

  const handleDeleteSpecialLimit = async (limit: SpecialLimitWithMetrics) => {
    if (!user?.id) return;
    const confirmed = window.confirm(`Deseja excluir o Limite Especial "${limit.nome_instituicao}" e seu histórico?`);
    if (!confirmed) return;

    try {
      setDeletingSpLimitId(limit.id);
      await deleteSpecialLimit(user.id, limit.id);
      showToast('Limite Especial excluído.');
      await loadSpecialLimitsData();
    } catch (err) {
      console.error('Erro ao excluir limite especial:', err);
      alert('Não foi possível excluir o limite especial.');
    } finally {
      setDeletingSpLimitId(null);
    }
  };

  // Special Limit Transactions (Utilização / Amortização)
  const handleOpenSpTxModal = (targetLimitId?: string, defaultTipo: 'Utilização' | 'Amortização' = 'Utilização') => {
    if (targetLimitId) {
      setSpTxLimitId(targetLimitId);
    } else if (specialLimits.length > 0) {
      setSpTxLimitId(specialLimits[0].id);
    }
    setSpTxTipo(defaultTipo);
    setSpTxValor('');
    setSpTxData(new Date().toISOString().split('T')[0]);
    setSpTxDescricao(defaultTipo === 'Utilização' ? 'Uso do Cheque Especial' : 'Cobertura / Amortização');
    setSpTxObservacoes('');
    setSpTxErrorMessage(null);
    setIsSpTxModalOpen(true);
  };

  const handleSaveSpTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSpTxErrorMessage(null);

    const numValor = parseFloat(spTxValor.replace(',', '.'));
    if (!spTxDescricao.trim() || isNaN(numValor) || numValor <= 0) {
      setSpTxErrorMessage('Informe uma descrição e um valor válido.');
      return;
    }

    if (!spTxLimitId) {
      setSpTxErrorMessage('Selecione o limite especial correspondente.');
      return;
    }

    try {
      setIsSubmittingSpTx(true);
      await createSpecialLimitTransaction(user.id, {
        limite_especial_id: spTxLimitId,
        tipo: spTxTipo,
        valor: numValor,
        data_operacao: spTxData,
        descricao: spTxDescricao.trim(),
        observacoes: spTxObservacoes.trim() || null
      });

      showToast(
        spTxTipo === 'Utilização'
          ? 'Utilização do Limite Especial registrada.'
          : 'Amortização/Cobertura registrada com sucesso.'
      );

      setIsSpTxModalOpen(false);
      await loadSpecialLimitsData();
    } catch (err) {
      console.error('Erro ao salvar operação de limite especial:', err);
      setSpTxErrorMessage('Erro ao persistir a operação.');
    } finally {
      setIsSubmittingSpTx(false);
    }
  };

  const handleDeleteSpTx = async (txId: string) => {
    if (!user?.id) return;
    if (!window.confirm('Deseja excluir esta movimentação de limite especial?')) return;
    try {
      await deleteSpecialLimitTransaction(user.id, txId);
      showToast('Movimentação excluída.');
      await loadSpecialLimitsData();
    } catch (err) {
      console.error('Erro ao excluir transação de limite especial:', err);
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
    if (!window.confirm('Deseja excluir este lançamento?')) return;
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

  // Filtered transactions for the credit cards invoice table
  const filteredCreditTransactions = cardTransactions.filter((t) => {
    if (selectedCardId === 'todos') return true;
    return t.cartao_id === selectedCardId;
  });

  // Filtered transactions for the debit account extrato table
  const filteredDebitTransactions = debitTransactions.filter((t) => {
    if (selectedDebitContaId === 'todos') return true;
    return t.conta_id === selectedDebitContaId;
  });

  // Consolidated metrics for Debit Accounts
  const totalSaldoDebito = contasWithMetrics.reduce((acc, c) => acc + c.saldoAtual, 0);
  const totalEntradasDebito = contasWithMetrics.reduce((acc, c) => acc + c.totalEntradas, 0);
  const totalSaidasDebito = contasWithMetrics.reduce((acc, c) => acc + c.totalSaidas, 0);

  // Consolidated metrics for Special Limits
  const totalSpContratado = specialLimits.reduce((acc, l) => acc + l.limite_total, 0);
  const totalSpUtilizado = specialLimits.reduce((acc, l) => acc + l.valorUtilizado, 0);
  const totalSpDisponivel = specialLimits.reduce((acc, l) => acc + l.limiteDisponivel, 0);

  // All Special Limit Transactions flattened
  const allSpTransactions = specialLimits.flatMap((l) =>
    l.transacoes.map((t) => ({ ...t, limit_nome: l.nome_instituicao }))
  );
  const filteredSpTransactions = allSpTransactions.filter((t) => {
    if (selectedSpecialLimitId === 'todos') return true;
    return t.limite_especial_id === selectedSpecialLimitId;
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

  const categoriasDebito = [
    'Alimentação & Mercado',
    'Contas & Boletos',
    'Transporte & Combustível',
    'Saúde & Farmácia',
    'Lazer & Entretenimento',
    'Salário & Honorários',
    'Transferência / Pix Recebido',
    'Depósito / Saldo',
    'Rendimentos / Investimento',
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

      {/* Main Tabs Header: Cartões de Crédito vs Cartões de Débito vs Limite Especial */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Gestão de Cartões, Contas & Limites
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Controle cartões de crédito, cartões de débito com saldo em conta e linhas de crédito especial
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex flex-wrap items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner self-start lg:self-auto gap-1">
          {/* TAB 1: Crédito */}
          <button
            onClick={() => setActiveTab('cartoes')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'cartoes'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cartões de Crédito</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/30 text-white font-mono">
              {cards.length}
            </span>
          </button>

          {/* TAB 2: Débito & Saldo */}
          <button
            onClick={() => setActiveTab('debito')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'debito'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4 stroke-[2.5]" />
            <span>Cartões de Débito & Saldo</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/20 text-slate-950 font-mono font-bold">
              {contasWithMetrics.length}
            </span>
          </button>

          {/* TAB 3: Limite Especial */}
          <button
            onClick={() => setActiveTab('limite_especial')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'limite_especial'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 stroke-[2.5]" />
            <span>Limite Especial</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/20 text-slate-950 font-mono font-bold">
              {specialLimits.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: CARTÕES DE CRÉDITO */}
      {/* ========================================================================= */}
      {activeTab === 'cartoes' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Subheader Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Meus Cartões de Crédito</h3>
              <p className="text-xs text-slate-400">
                Acompanhe o limite total, valor utilizado, faturas e compras parceladas
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
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
                <span>Adicionar Cartão de Crédito</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
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
                <h3 className="text-base font-bold text-white">Nenhum cartão de crédito cadastrado</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Cadastre seus cartões de crédito para calcular limites, faturas e parcelamentos automaticamente.
                </p>
              </div>
              <button
                onClick={handleOpenCreateCard}
                className="py-2.5 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar Primeiro Cartão</span>
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
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
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
                  <h3 className="text-base font-bold text-white">Extrato de Compras no Cartão de Crédito</h3>
                  <p className="text-xs text-slate-400">Detalhamento de faturas e compras parceladas</p>
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
                    <option value="todos">Todos os Cartões de Crédito</option>
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_cartao}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {filteredCreditTransactions.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
                  <Tag className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-300">Nenhuma compra registrada neste cartão de crédito</p>
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
                    {filteredCreditTransactions.map((t) => {
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CARTÕES DE DÉBITO & SALDO EM CONTA */}
      {/* ========================================================================= */}
      {activeTab === 'debito' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Subheader Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Saldo em Conta
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">Cartões de Débito & Contas Bancárias</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Acompanhe o saldo atual em conta, saldo inicial e extrato de compras e depósitos no débito
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {contasWithMetrics.length > 0 && (
                <>
                  <button
                    onClick={() => handleOpenDebitTxModal(undefined, 'despesa')}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Lançar Despesa no Débito</span>
                  </button>

                  <button
                    onClick={() => handleOpenDebitTxModal(undefined, 'deposito')}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    <span>Adicionar Saldo / Depósito</span>
                  </button>
                </>
              )}

              <button
                onClick={handleOpenCreateDebitAccount}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Adicionar Cartão de Débito</span>
              </button>
            </div>
          </div>

          {/* Consolidated Debit Balance Banner */}
          {contasWithMetrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                    Saldo Total em Débito
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-300 font-mono mt-0.5">
                    {formatCurrency(totalSaldoDebito)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Wallet className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-teal-400 tracking-wider">
                    Total de Entradas / Depósitos
                  </span>
                  <p className="text-xl font-extrabold text-teal-300 font-mono mt-0.5">
                    + {formatCurrency(totalEntradasDebito)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400">
                  <TrendingUp className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">
                    Total de Saídas no Débito
                  </span>
                  <p className="text-xl font-extrabold text-rose-400 font-mono mt-0.5">
                    - {formatCurrency(totalSaidasDebito)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                  <TrendingDown className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
            </div>
          )}

          {/* Debit Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-slate-900/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : contasWithMetrics.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 border border-slate-800">
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Nenhum cartão de débito cadastrado</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Cadastre sua conta bancária ou cartão de débito para acompanhar o saldo atual e controlar despesas e depósitos.
                </p>
              </div>
              <button
                onClick={handleOpenCreateDebitAccount}
                className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar Cartão de Débito</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contasWithMetrics.map((conta, idx) => {
                const gradients = [
                  'from-slate-900 via-teal-950/60 to-slate-900 border-teal-500/30 shadow-teal-500/10',
                  'from-slate-900 via-cyan-950/60 to-slate-900 border-cyan-500/30 shadow-cyan-500/10',
                  'from-slate-900 via-emerald-950/60 to-slate-900 border-emerald-500/30 shadow-emerald-500/10',
                ];
                const currentGradient = gradients[idx % gradients.length];
                const isDeleting = deletingDebitAccountId === conta.id;
                const isPositiveBalance = conta.saldoAtual >= 0;

                return (
                  <div
                    key={conta.id}
                    className={`rounded-3xl p-6 bg-gradient-to-br ${currentGradient} border shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${
                      isDeleting ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {/* Metallic/Chip decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                    {/* Header: Institution Name & Quick Actions */}
                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            CARTÃO DE DÉBITO
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-white mt-1 truncate" title={conta.nome_instituicao}>
                          {conta.nome_instituicao}
                        </h3>
                        <span className="text-[11px] text-slate-400 block">
                          {conta.tipo_conta || 'Conta Corrente / Débito'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenDebitTxModal(conta.id, 'despesa')}
                          title="Lançar compra no débito"
                          className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-all cursor-pointer backdrop-blur-sm border border-rose-500/30"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDebitTxModal(conta.id, 'deposito')}
                          title="Adicionar saldo / depósito"
                          className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 transition-all cursor-pointer backdrop-blur-sm border border-emerald-500/30"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditDebitAccount(conta)}
                          title="Editar dados da conta"
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-sm shadow-sm"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDebitAccount(conta)}
                          title="Excluir conta"
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all cursor-pointer backdrop-blur-sm border border-rose-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Chip and Contactless visual icon */}
                    <div className="flex items-center justify-between py-1 relative z-10">
                      <div className="w-10 h-7 rounded-lg bg-gradient-to-tr from-amber-400/80 via-amber-200/90 to-amber-500/80 border border-amber-300/60 shadow-sm flex items-center justify-center">
                        <div className="w-6 h-4 border border-amber-950/30 rounded flex items-center justify-center">
                          <div className="w-3 h-2 border-r border-amber-950/30" />
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-500 tracking-widest">
                        •••• •••• •••• {conta.id.slice(-4)}
                      </span>
                    </div>

                    {/* Center Saldo Atual Display */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 relative z-10">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Saldo Atual em Conta / Débito
                      </span>
                      <p
                        className={`text-2xl font-black font-mono mt-1 ${
                          isPositiveBalance ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(conta.saldoAtual)}
                      </p>
                    </div>

                    {/* Footer Summary: Saldo Inicial, Entradas e Saídas */}
                    <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs relative z-10">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Saldo Inicial</span>
                        <span className="font-mono font-semibold text-slate-300">
                          {formatCurrency(conta.saldo_inicial)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-400 block">Entradas</span>
                        <span className="font-mono font-semibold text-teal-300">
                          +{formatCurrency(conta.totalEntradas)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-400 block">Saídas Débito</span>
                        <span className="font-mono font-semibold text-rose-400">
                          -{formatCurrency(conta.totalSaidas)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Debit Transactions Extrato Table */}
          <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden space-y-4 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Extrato de Movimentações no Débito</h3>
                  <p className="text-xs text-slate-400">Histórico de despesas e depósitos debitados/creditados na conta</p>
                </div>
              </div>

              {contasWithMetrics.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Filtrar por Conta:</label>
                  <select
                    value={selectedDebitContaId}
                    onChange={(e) => setSelectedDebitContaId(e.target.value)}
                    className="py-1.5 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="todos">Todas as Contas / Cartões Débito</option>
                    {contasWithMetrics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_instituicao} (Saldo: {formatCurrency(c.saldoAtual)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {filteredDebitTransactions.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
                  <Tag className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-300">Nenhuma movimentação registrada nesta conta</p>
                <p className="text-xs text-slate-500">
                  Utilize os botões "Lançar Despesa no Débito" ou "Adicionar Saldo" para movimentar a conta.
                </p>
                {contasWithMetrics.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleOpenDebitTxModal(undefined, 'despesa')}
                      className="py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Lançar Débito</span>
                    </button>
                    <button
                      onClick={() => handleOpenDebitTxModal(undefined, 'deposito')}
                      className="py-2 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Adicionar Saldo</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Descrição / Estabelecimento</th>
                      <th className="py-3 px-4">Cartão / Conta</th>
                      <th className="py-3 px-4">Data Pagamento</th>
                      <th className="py-3 px-4 text-center">Tipo</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredDebitTransactions.map((t) => {
                      const isEntry = t.valor > 0;
                      return (
                        <tr key={t.id} className="hover:bg-slate-900/40 transition-colors group">
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-semibold text-white truncate max-w-xs">{t.descricao}</p>
                              <span className="text-[11px] text-slate-400">{t.categoria || 'Geral'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {t.conta_nome || 'Conta'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-mono">
                            {formatDate(t.data_pagamento || t.data_vencimento || t.created_at)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isEntry
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              }`}
                            >
                              {isEntry ? 'Entrada / Depósito' : 'Saída Débito'}
                            </span>
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right font-mono font-bold ${
                              isEntry ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isEntry ? '+' : '-'} {formatCurrency(Math.abs(t.valor))}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                              Efetivado
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              title="Excluir lançamento"
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: LIMITE ESPECIAL (CHEQUE ESPECIAL / CRÉDITO ESPECIAL) */}
      {/* ========================================================================= */}
      {activeTab === 'limite_especial' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Subheader Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Crédito Rotativo
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">Limite & Cheque Especial</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitore linhas de crédito especial bancárias, juros incidentes, saldo em uso e coberturas
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {specialLimits.length > 0 && (
                <button
                  onClick={() => handleOpenSpTxModal()}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  <span>Lançar Uso / Amortização</span>
                </button>
              )}

              <button
                onClick={handleOpenCreateSpecialLimit}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar Limite Especial</span>
              </button>
            </div>
          </div>

          {/* Special Limits Consolidated Overview Banner */}
          {specialLimits.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Limite Total Contratado
                  </span>
                  <p className="text-xl font-extrabold text-white font-mono mt-0.5">
                    {formatCurrency(totalSpContratado)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">
                    Total em Uso / Utilizado
                  </span>
                  <p className="text-xl font-extrabold text-rose-400 font-mono mt-0.5">
                    {formatCurrency(totalSpUtilizado)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                  <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                    Disponível Restante
                  </span>
                  <p className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                    {formatCurrency(totalSpDisponivel)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
            </div>
          )}

          {/* Special Limits Cards List */}
          {isLoadingSpecialLimits ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-slate-900/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : specialLimits.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 border border-slate-800">
              <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Nenhum Limite Especial cadastrado</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Cadastre seus limites de cheque especial ou linhas de crédito bancárias para monitorar juros e valores em uso.
                </p>
              </div>
              <button
                onClick={handleOpenCreateSpecialLimit}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar Primeiro Limite Especial</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialLimits.map((limit) => {
                const isDeleting = deletingSpLimitId === limit.id;

                return (
                  <div
                    key={limit.id}
                    className={`rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 shadow-xl shadow-amber-500/5 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${
                      isDeleting ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {/* Header: Institution & Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                            Limite Especial
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-white mt-0.5 truncate" title={limit.nome_instituicao}>
                          {limit.nome_instituicao}
                        </h3>
                        {limit.conta_nome && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Conta: {limit.conta_nome}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenSpTxModal(limit.id, 'Utilização')}
                          title="Lançar utilização do limite"
                          className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition-all cursor-pointer backdrop-blur-sm border border-amber-500/30"
                        >
                          <ArrowDownRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenSpTxModal(limit.id, 'Amortização')}
                          title="Amortizar / Cobrir limite"
                          className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 transition-all cursor-pointer backdrop-blur-sm border border-emerald-500/30"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditSpecialLimit(limit)}
                          title="Editar limite especial"
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-sm shadow-sm"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSpecialLimit(limit)}
                          title="Excluir limite especial"
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all cursor-pointer backdrop-blur-sm border border-rose-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Values Overview: Em Uso vs Disponível */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] font-semibold uppercase text-rose-400 block">
                          Valor em Uso
                        </span>
                        <p className="text-lg font-extrabold text-rose-300 font-mono mt-0.5">
                          {formatCurrency(limit.valorUtilizado)}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] font-semibold uppercase text-emerald-400 block">
                          Disponível
                        </span>
                        <p className="text-lg font-extrabold text-emerald-300 font-mono mt-0.5">
                          {formatCurrency(limit.limiteDisponivel)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar for Special Limit Usage */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Total Contratado: <strong className="text-white font-mono">{formatCurrency(limit.limite_total)}</strong>
                        </span>
                        <span className={`font-bold font-mono ${limit.percentualUtilizado > 50 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {limit.percentualUtilizado}% usado
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            limit.percentualUtilizado > 80
                              ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                              : limit.percentualUtilizado > 30
                              ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                              : 'bg-gradient-to-r from-teal-400 to-amber-400'
                          }`}
                          style={{ width: `${Math.max(2, limit.percentualUtilizado)}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer: Taxa de Juros & Dia de Cobrança */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-amber-400" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Taxa de Juros</span>
                          <span className="font-semibold text-amber-300">{limit.taxa_juros_mensal}% a.m.</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Cobrança/Venc.</span>
                        <span className="font-semibold text-white">Dia {limit.dia_vencimento || '10'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Special Limit Transactions Table */}
          <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden space-y-4 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Extrato de Utilizações & Amortizações</h3>
                  <p className="text-xs text-slate-400">Movimentações das linhas de crédito especial</p>
                </div>
              </div>

              {specialLimits.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Filtrar por Limite:</label>
                  <select
                    value={selectedSpecialLimitId}
                    onChange={(e) => setSelectedSpecialLimitId(e.target.value)}
                    className="py-1.5 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="todos">Todos os Limites Especiais</option>
                    {specialLimits.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome_instituicao}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {filteredSpTransactions.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
                  <Tag className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-300">Nenhuma movimentação registrada</p>
                <p className="text-xs text-slate-500">
                  Utilize os botões de ação para registrar saídas (utilização) ou coberturas (amortização).
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Descrição / Operação</th>
                      <th className="py-3 px-4">Instituição</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4 text-center">Tipo</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSpTransactions.map((t) => {
                      const isUtilizacao = t.tipo === 'Utilização';
                      return (
                        <tr key={t.id} className="hover:bg-slate-900/40 transition-colors group">
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-semibold text-white">{t.descricao}</p>
                              {t.observacoes && (
                                <span className="text-[11px] text-slate-400">{t.observacoes}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {t.limit_nome || 'Limite Especial'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-mono">
                            {formatDate(t.data_operacao || t.created_at)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isUtilizacao
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}
                            >
                              {isUtilizacao ? 'Utilização (Saída)' : 'Amortização (Entrada)'}
                            </span>
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right font-mono font-bold ${
                              isUtilizacao ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {isUtilizacao ? '-' : '+'} {formatCurrency(Number(t.valor))}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleDeleteSpTx(t.id)}
                              title="Excluir movimentação"
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Adicionar / Editar Cartão de Crédito */}
      {/* ========================================================================= */}
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
                    {editingCard ? 'Editar Cartão de Crédito' : 'Cadastrar Cartão de Crédito'}
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

      {/* ========================================================================= */}
      {/* MODAL 2: Lançar Compra / Parcelas no Cartão de Crédito */}
      {/* ========================================================================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-700/80 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Lançar Compra no Cartão de Crédito</h3>
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

      {/* ========================================================================= */}
      {/* MODAL 3: Cadastrar / Editar Cartão de Débito / Conta Bancária */}
      {/* ========================================================================= */}
      {isDebitAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Wallet className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingDebitAccount ? 'Editar Cartão de Débito' : 'Cadastrar Cartão de Débito'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingDebitAccount
                      ? 'Atualize o nome e o saldo inicial da conta'
                      : 'Cadastre sua conta bancária / cartão com saldo inicial'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDebitAccountModalOpen(false);
                  setEditingDebitAccount(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {debitAccountErrorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{debitAccountErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveDebitAccount} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Cartão / Instituição Bancária *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank Débito, Itaú Conta Corrente, Inter, C6 Bank"
                  value={debitNomeInstituicao}
                  onChange={(e) => setDebitNomeInstituicao(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tipo de Conta / Cartão
                </label>
                <select
                  value={debitTipoConta}
                  onChange={(e) => setDebitTipoConta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="Conta Corrente / Débito">Conta Corrente / Débito</option>
                  <option value="Conta Poupança">Conta Poupança</option>
                  <option value="Conta Salário">Conta Salário</option>
                  <option value="Conta Investimento">Conta Investimento</option>
                  <option value="Cartão Pré-pago">Cartão Pré-pago</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Saldo Inicial Cadastrado (R$) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={debitSaldoInicial}
                    onChange={(e) => setDebitSaldoInicial(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Saldo disponível na abertura ou ponto de partida
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDebitAccountModalOpen(false);
                    setEditingDebitAccount(null);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDebitAccount}
                  className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDebitAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : editingDebitAccount ? (
                    'Salvar Alterações'
                  ) : (
                    'Cadastrar Cartão de Débito'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Lançar Movimentação no Débito (Despesa vs Depósito) */}
      {/* ========================================================================= */}
      {isDebitTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    debitTxTipo === 'despesa'
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {debitTxTipo === 'despesa' ? (
                    <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {debitTxTipo === 'despesa' ? 'Lançar Despesa no Débito' : 'Adicionar Saldo / Depósito'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {debitTxTipo === 'despesa'
                      ? 'Debitar valor imediatamente do saldo da conta'
                      : 'Creditar depósito ou receita no saldo da conta'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDebitTxModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {debitTxErrorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{debitTxErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveDebitTx} className="mt-5 space-y-4">
              {/* Toggle Tipo: Despesa vs Depósito */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setDebitTxTipo('despesa');
                    if (debitTxCategoria === 'Depósito / Saldo') {
                      setDebitTxCategoria('Alimentação & Mercado');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    debitTxTipo === 'despesa'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                  <span>Despesa (Débito)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDebitTxTipo('deposito');
                    if (debitTxCategoria === 'Alimentação & Mercado') {
                      setDebitTxCategoria('Depósito / Saldo');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    debitTxTipo === 'deposito'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  <span>Depósito (Entrada)</span>
                </button>
              </div>

              {/* Cartão de Débito / Conta */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cartão de Débito / Conta Bancária *
                </label>
                <select
                  value={debitTxContaId}
                  onChange={(e) => setDebitTxContaId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {contasWithMetrics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_instituicao} (Saldo Atual: {formatCurrency(c.saldoAtual)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição da Movimentação *
                </label>
                <input
                  type="text"
                  placeholder={
                    debitTxTipo === 'despesa'
                      ? 'Ex: Supermercado Pão de Açúcar, Posto Shell, Farmácia'
                      : 'Ex: Depósito em conta, Salário, Pix Recebido, Transferência'
                  }
                  value={debitTxDescricao}
                  onChange={(e) => setDebitTxDescricao(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>

              {/* Valor & Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={debitTxValor}
                    onChange={(e) => setDebitTxValor(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    value={debitTxData}
                    onChange={(e) => setDebitTxData(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={debitTxCategoria}
                  onChange={(e) => setDebitTxCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {categoriasDebito.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
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
                  placeholder="Ex: Pago com cartão físico de aproximação"
                  value={debitTxObservacoes}
                  onChange={(e) => setDebitTxObservacoes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDebitTxModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDebitTx}
                  className={`py-2.5 px-5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                    debitTxTipo === 'despesa'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {isSubmittingDebitTx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <span>{debitTxTipo === 'despesa' ? 'Confirmar Despesa Débito' : 'Confirmar Depósito'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Cadastrar / Editar Limite Especial */}
      {/* ========================================================================= */}
      {isSpecialLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingSpecialLimit ? 'Editar Limite Especial' : 'Cadastrar Limite Especial'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina o cheque especial ou linha de crédito rotativo
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSpecialLimitModalOpen(false);
                  setEditingSpecialLimit(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {specialLimitErrorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{specialLimitErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveSpecialLimit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome da Linha / Instituição *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Itaú Cheque Especial, Santander LIS, BB Giro"
                  value={spNomeInstituicao}
                  onChange={(e) => setSpNomeInstituicao(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Conta Bancária Vinculada
                </label>
                <select
                  value={spContaId}
                  onChange={(e) => setSpContaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Nenhuma / Geral</option>
                  {contas.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome_instituicao} ({acc.tipo_conta || 'Conta Corrente'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Limite Total Contratado (R$) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Ex: 2000,00"
                    value={spLimiteTotal}
                    onChange={(e) => setSpLimiteTotal(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Taxa de Juros (% a.m.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={spTaxaJuros}
                    onChange={(e) => setSpTaxaJuros(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Juros médios do contrato</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dia Cobrança / Venc.
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={spDiaVencimento}
                    onChange={(e) => setSpDiaVencimento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Data de cobrança</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 10 dias sem juros se cobrir até dia 20"
                  value={spObservacoes}
                  onChange={(e) => setSpObservacoes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSpecialLimitModalOpen(false);
                    setEditingSpecialLimit(null);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSpecialLimit}
                  className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSpecialLimit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : editingSpecialLimit ? (
                    'Salvar Alterações'
                  ) : (
                    'Cadastrar Limite Especial'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: Lançar Utilização / Amortização de Limite Especial */}
      {/* ========================================================================= */}
      {isSpTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Movimentação do Limite Especial</h3>
                  <p className="text-xs text-slate-400">
                    Registre a utilização (saída) ou cobertura/amortização (entrada)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSpTxModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {spTxErrorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{spTxErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveSpTx} className="mt-5 space-y-4">
              {/* Toggle Tipo: Utilização vs Amortização */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSpTxTipo('Utilização');
                    if (!spTxDescricao || spTxDescricao === 'Cobertura / Amortização') {
                      setSpTxDescricao('Uso do Cheque Especial');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    spTxTipo === 'Utilização'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                  <span>Utilização (Saída)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSpTxTipo('Amortização');
                    if (!spTxDescricao || spTxDescricao === 'Uso do Cheque Especial') {
                      setSpTxDescricao('Cobertura / Amortização');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    spTxTipo === 'Amortização'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  <span>Cobrir (Entrada)</span>
                </button>
              </div>

              {/* Seleção do Limite Especial */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Linha de Limite Especial *
                </label>
                <select
                  value={spTxLimitId}
                  onChange={(e) => setSpTxLimitId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  {specialLimits.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome_instituicao} (Disp: {formatCurrency(l.limiteDisponivel)} / Uso: {formatCurrency(l.valorUtilizado)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor & Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={spTxValor}
                    onChange={(e) => setSpTxValor(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Data da Operação *
                  </label>
                  <input
                    type="date"
                    value={spTxData}
                    onChange={(e) => setSpTxData(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição da Movimentação *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cobertura de saldo devedor, Pagamento emergencial"
                  value={spTxDescricao}
                  onChange={(e) => setSpTxDescricao(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Transferência via Pix para cobrir limite"
                  value={spTxObservacoes}
                  onChange={(e) => setSpTxObservacoes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSpTxModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSpTx}
                  className={`py-2.5 px-5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                    spTxTipo === 'Utilização'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {isSubmittingSpTx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar Operação</span>
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
