import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createTransaction } from '../../services/dashboardService';
import { getDb } from '../../lib/neon';
import type { Conta, CartaoCredito } from '../../types/database';
import {
  TrendingUp,
  TrendingDown,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Repeat,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  X,
  FileCheck
} from 'lucide-react';

interface TransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialType?: 'despesa' | 'receita';
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSuccess,
  onCancel,
  initialType = 'despesa',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'basico' | 'detalhes'>('basico');

  // Form Fields - Tab 1: Informações Básicas
  const [tipo, setTipo] = useState<'despesa' | 'receita'>(initialType);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'Pendente' | 'Pago' | 'Recebido' | 'Atrasado'>('Pago');
  const [dataPagamento, setDataPagamento] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [categoria, setCategoria] = useState('Alimentação');

  // Form Fields - Tab 2: Detalhes Adicionais
  const [contaId, setContaId] = useState('');
  const [cartaoId, setCartaoId] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState('Mensal');
  const [observacoes, setObservacoes] = useState('');
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [anexoBase64, setAnexoBase64] = useState<string | null>(null);

  // Lists from DB
  const [contas, setContas] = useState<Conta[]>([]);
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Accounts and Credit Cards from Neon
  useEffect(() => {
    if (!user?.id) return;

    const loadUserData = async () => {
      try {
        setIsLoadingData(true);
        const sql = getDb();
        await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

        const [accountsRaw, cardsRaw] = await Promise.all([
          sql`SELECT * FROM contas WHERE usuario_id = ${user.id} ORDER BY created_at ASC;`,
          sql`SELECT * FROM cartoes_credito WHERE usuario_id = ${user.id} ORDER BY created_at ASC;`
        ]);

        const accs = accountsRaw as unknown as Conta[];
        setContas(accs);
        if (accs.length > 0) {
          setContaId(accs[0].id);
        }

        setCartoes(cardsRaw as unknown as CartaoCredito[]);
      } catch (err) {
        console.error('Erro ao buscar contas e cartões:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadUserData();
  }, [user?.id]);

  // Handle status change & UX auto-fill date
  const handleStatusChange = (newStatus: 'Pendente' | 'Pago' | 'Recebido' | 'Atrasado') => {
    setStatus(newStatus);
    if (newStatus === 'Pago' || newStatus === 'Recebido') {
      if (!dataPagamento) {
        setDataPagamento(new Date().toISOString().split('T')[0]);
      }
    } else {
      setDataPagamento('');
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('O arquivo deve ter no máximo 5MB.');
        return;
      }

      setAnexoNome(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnexoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAnexo = () => {
    setAnexoNome(null);
    setAnexoBase64(null);
  };

  // Categories list
  const categoriasDespesa = [
    'Alimentação',
    'Moradia',
    'Transporte',
    'Lazer & Entretenimento',
    'Saúde & Farmácia',
    'Educação',
    'Contas Fixas (Água/Luz/Internet)',
    'Cartão de Crédito',
    'Impostos & Taxas',
    'Outros'
  ];

  const categoriasReceita = [
    'Salário / Pró-labore',
    'Rendimento de Aluguel',
    'Investimentos / Dividendos',
    'Prestação de Serviços',
    'Reembolso',
    'Venda de Ativos',
    'Outros'
  ];

  // Save transaction
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validations
    if (!descricao.trim()) {
      setActiveTab('basico');
      setErrorMessage('Por favor, informe a descrição da transação.');
      return;
    }

    const numValor = parseFloat(valor.replace(',', '.'));
    if (isNaN(numValor) || numValor <= 0) {
      setActiveTab('basico');
      setErrorMessage('Por favor, informe um valor válido maior que zero.');
      return;
    }

    if (!dataVencimento) {
      setActiveTab('basico');
      setErrorMessage('Por favor, informe a data de vencimento.');
      return;
    }

    if (!contaId) {
      setActiveTab('detalhes');
      setErrorMessage('Por favor, selecione a conta bancária vinculada.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (!user?.id) throw new Error('Usuário não autenticado.');

      // Amount: Negative for expense, Positive for income
      const finalValor = tipo === 'despesa' ? -Math.abs(numValor) : Math.abs(numValor);
      const finalStatus = tipo === 'receita' && status === 'Pago' ? 'Recebido' : status;

      await createTransaction(user.id, {
        conta_id: contaId,
        cartao_id: cartaoId ? cartaoId : null,
        descricao: descricao.trim(),
        categoria,
        valor: finalValor,
        data_vencimento: dataVencimento,
        data_pagamento: (finalStatus === 'Pago' || finalStatus === 'Recebido') && dataPagamento ? dataPagamento : undefined,
        status: finalStatus,
        observacoes: observacoes.trim() || null,
        anexo_nome: anexoNome,
        anexo_base64: anexoBase64,
        recorrente,
        frequencia: recorrente ? frequencia : null
      });

      setSuccessMessage('Transação registrada com sucesso!');
      window.dispatchEvent(new Event('transaction-created'));

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/transacoes');
        }
      }, 700);
    } catch (err: unknown) {
      console.error('Erro ao salvar transação:', err);
      setErrorMessage('Erro ao persistir no banco de dados Neon. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPagoOrRecebido = status === 'Pago' || status === 'Recebido';

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-2xl max-w-3xl mx-auto">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/10 ${
              tipo === 'despesa'
                ? 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-rose-500/20'
                : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {tipo === 'despesa' ? (
              <TrendingDown className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <TrendingUp className="w-6 h-6 stroke-[2.5]" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {tipo === 'despesa' ? 'Cadastrar Conta a Pagar' : 'Cadastrar Conta a Receber'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Preencha os dados da movimentação financeira
            </p>
          </div>
        </div>

        {/* Tipo Toggle Selector */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setTipo('despesa');
              setCategoria('Alimentação');
              setStatus('Pago');
              setDataPagamento(new Date().toISOString().split('T')[0]);
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tipo === 'despesa'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Despesa</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTipo('receita');
              setCategoria('Salário / Pró-labore');
              setStatus('Recebido');
              setDataPagamento(new Date().toISOString().split('T')[0]);
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tipo === 'receita'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Receita</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="grid grid-cols-2 gap-2 mt-6 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('basico')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'basico'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>1. Informações Básicas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('detalhes')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'detalhes'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>2. Detalhes Adicionais</span>
          {(recorrente || anexoNome || observacoes) && (
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-emerald-300 text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="mt-6">
        {/* ABA 1: Informações Básicas */}
        {activeTab === 'basico' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="tx-desc">
                Descrição da Transação <span className="text-rose-400">*</span>
              </label>
              <input
                id="tx-desc"
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Compra de supermercado, Aluguel do mês, Pagamento de energia"
                required
                className="w-full px-4 py-3 bg-slate-900 text-slate-100 text-sm rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
              />
            </div>

            {/* Valor & Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="tx-val">
                  Valor (R$) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-xs font-bold pointer-events-none">
                    R$
                  </span>
                  <input
                    id="tx-val"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 text-white font-mono font-bold text-sm rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="tx-cat">
                  Categoria <span className="text-rose-400">*</span>
                </label>
                <select
                  id="tx-cat"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {(tipo === 'despesa' ? categoriasDespesa : categoriasReceita).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status do Lançamento <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(tipo === 'receita' ? 'Recebido' : 'Pago')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    status === 'Pago' || status === 'Recebido'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tipo === 'receita' ? 'Recebido' : 'Pago'}
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange('Pendente')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    status === 'Pendente'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pendente
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange('Atrasado')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    status === 'Atrasado'
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-400 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Atrasado
                </button>

                <div className="hidden sm:flex items-center justify-center p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400">
                  {status}
                </div>
              </div>
            </div>

            {/* Datas: Vencimento & Pagamento (Condicional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="tx-venc">
                  Data de Vencimento <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="tx-venc"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    required
                    className="w-full px-3.5 py-3 bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {isPagoOrRecebido ? (
                <div className="animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-emerald-400 mb-1.5" htmlFor="tx-pag">
                    Data de Pagamento (Liquidado)
                  </label>
                  <input
                    id="tx-pag"
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    required={isPagoOrRecebido}
                    className="w-full px-3.5 py-3 bg-slate-900 text-slate-100 text-xs rounded-xl border border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 text-slate-500 text-xs">
                  Conta ainda não liquidada
                </div>
              )}
            </div>

            {/* Next tab button */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('detalhes')}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Avançar para Detalhes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA 2: Detalhes Adicionais */}
        {activeTab === 'detalhes' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Conta Bancária & Cartão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="tx-conta">
                  Conta Vinculada <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    id="tx-conta"
                    value={contaId}
                    onChange={(e) => setContaId(e.target.value)}
                    required
                    disabled={isLoadingData}
                    className="w-full px-3.5 py-3 bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_instituicao} (Saldo: R$ {Number(c.saldo_inicial).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="tx-cartao">
                  Cartão de Crédito (Opcional)
                </label>
                <select
                  id="tx-cartao"
                  value={cartaoId}
                  onChange={(e) => setCartaoId(e.target.value)}
                  disabled={isLoadingData || tipo === 'receita'}
                  className="w-full px-3.5 py-3 bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                >
                  <option value="">Nenhum (Débito em Conta)</option>
                  {cartoes.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.nome_cartao} (Limite: R$ {Number(card.limite_total).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recorrência */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Repeat className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">Lançamento Recorrente</p>
                    <p className="text-[11px] text-slate-400">Repete automaticamente em períodos definidos</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recorrente}
                    onChange={(e) => setRecorrente(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>

              {recorrente && (
                <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Frequência</label>
                    <select
                      value={frequencia}
                      onChange={(e) => setFrequencia(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 text-xs rounded-xl border border-slate-700/80 text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Semanal">Semanal</option>
                      <option value="Mensal">Mensal</option>
                      <option value="Bimestral">Bimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Anexo de Comprovante */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Anexo de Comprovante / Recibo
              </label>
              {anexoNome ? (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 min-w-0">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate font-medium">{anexoNome}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeAnexo}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition-all">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-400">
                    Clique para selecionar foto do comprovante ou PDF (Máx. 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="tx-obs">
                Observações Gerais
              </label>
              <textarea
                id="tx-obs"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes adicionais, número de nota fiscal ou lembretes..."
                className="w-full px-3.5 py-2.5 bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
              />
            </div>

            {/* Back button in tab 2 */}
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={() => setActiveTab('basico')}
                className="py-2 px-3 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Básicos</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
              else navigate('/transacoes');
            }}
            className="py-3 px-5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`py-3 px-6 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              tipo === 'despesa'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-rose-500/20'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando no Neon...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Transação</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
