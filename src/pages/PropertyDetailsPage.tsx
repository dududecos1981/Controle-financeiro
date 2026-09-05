import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchPropertyDetails,
  updateProperty,
  createPropertyReceipt,
  createPropertyExpense,
  addPropertyDocument,
  type PropertyDetailsData
} from '../services/propertyService';
import {
  Building2,
  User,
  Phone,
  Calendar,
  DollarSign,
  ArrowLeft,
  Save,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Wrench,
  FilePlus,
  ExternalLink,
  MapPin,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const PropertyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<PropertyDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Section 1 - Editable Property Details Form
  const [endereco, setEndereco] = useState('');
  const [valorAluguel, setValorAluguel] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [inquilinoNome, setInquilinoNome] = useState('');
  const [inquilinoContato, setInquilinoContato] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Section 2 - Modal Registrar Recebimento
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptMesRef, setReceiptMesRef] = useState(
    new Date().toISOString().substring(0, 7) // YYYY-MM
  );
  const [receiptDataRecebimento, setReceiptDataRecebimento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [receiptValor, setReceiptValor] = useState('');
  const [receiptStatus, setReceiptStatus] = useState<'Pago' | 'Atrasado' | 'Parcial'>('Pago');
  const [receiptObservacoes, setReceiptObservacoes] = useState('');
  const [receiptContaId, setReceiptContaId] = useState('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  // Section 3 - Modal Adicionar Despesa
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDescricao, setExpenseDescricao] = useState('');
  const [expenseCategoria, setExpenseCategoria] = useState('Condomínio');
  const [expenseValor, setExpenseValor] = useState('');
  const [expenseDataVenc, setExpenseDataVenc] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expenseStatus, setExpenseStatus] = useState<'Pago' | 'Pendente'>('Pago');
  const [expenseObservacoes, setExpenseObservacoes] = useState('');
  const [expenseContaId, setExpenseContaId] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Section 3 - Modal Adicionar Documento
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docNome, setDocNome] = useState('');
  const [docTipo, setDocTipo] = useState('Contrato de Locação');
  const [docUrl, setDocUrl] = useState('');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetchPropertyDetails(user.id, id);
      setData(res);

      // Populate edit fields
      setEndereco(res.imovel.endereco);
      setValorAluguel(res.imovel.valor_aluguel.toString());
      setDiaVencimento(res.imovel.dia_vencimento?.toString() || '10');
      setInquilinoNome(res.imovel.inquilino_nome || '');
      setInquilinoContato(res.imovel.inquilino_contato || '');
      setReceiptValor(res.imovel.valor_aluguel.toString());

      if (res.contas.length > 0) {
        setReceiptContaId(res.contas[0].id);
        setExpenseContaId(res.contas[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar imóvel:', err);
      setErrorMessage('Não foi possível carregar os detalhes do imóvel.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Section 1 - Save Property Details Handler
  const handleSavePropertyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !id) return;

    const numAluguel = parseFloat(valorAluguel.replace(',', '.'));
    if (!endereco.trim() || isNaN(numAluguel) || numAluguel <= 0) {
      setErrorMessage('Por favor, preencha os dados obrigatórios do imóvel.');
      return;
    }

    try {
      setIsSavingDetails(true);
      await updateProperty(user.id, id, {
        endereco: endereco.trim(),
        valor_aluguel: numAluguel,
        dia_vencimento: parseInt(diaVencimento) || 10,
        inquilino_nome: inquilinoNome.trim() || undefined,
        inquilino_contato: inquilinoContato.trim() || undefined
      });

      setSuccessToast('Dados do imóvel atualizados com sucesso no Neon!');
      setTimeout(() => setSuccessToast(null), 3000);
      loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao salvar imóvel:', err);
      setErrorMessage('Erro ao salvar alterações no banco de dados.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Section 2 - Register Receipt Handler
  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !id) return;

    const numValor = parseFloat(receiptValor.replace(',', '.'));
    if (isNaN(numValor) || numValor <= 0 || !receiptContaId) {
      alert('Informe um valor válido e selecione a conta bancária.');
      return;
    }

    try {
      setIsSubmittingReceipt(true);
      await createPropertyReceipt(user.id, id, {
        dataReferencia: receiptMesRef,
        dataRecebimento: receiptDataRecebimento,
        valor: numValor,
        status: receiptStatus,
        observacoes: receiptObservacoes.trim() || undefined,
        contaId: receiptContaId,
        enderecoImovel: endereco
      });

      setIsReceiptModalOpen(false);
      setReceiptObservacoes('');
      setSuccessToast('Recebimento de aluguel registrado com sucesso!');
      setTimeout(() => setSuccessToast(null), 3000);
      loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao registrar recebimento:', err);
      alert('Erro ao registrar recebimento.');
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  // Section 3 - Add Expense Handler
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !id) return;

    const numValor = parseFloat(expenseValor.replace(',', '.'));
    if (!expenseDescricao.trim() || isNaN(numValor) || numValor <= 0 || !expenseContaId) {
      alert('Preencha os campos obrigatórios da despesa.');
      return;
    }

    try {
      setIsSubmittingExpense(true);
      await createPropertyExpense(user.id, id, {
        descricao: `${expenseDescricao.trim()} (${endereco.substring(0, 20)})`,
        categoria: expenseCategoria,
        valor: numValor,
        dataVencimento: expenseDataVenc,
        dataPagamento: expenseStatus === 'Pago' ? expenseDataVenc : undefined,
        status: expenseStatus,
        observacoes: expenseObservacoes.trim() || undefined,
        contaId: expenseContaId
      });

      setIsExpenseModalOpen(false);
      setExpenseDescricao('');
      setExpenseValor('');
      setExpenseObservacoes('');
      setSuccessToast('Despesa vinculada com sucesso!');
      setTimeout(() => setSuccessToast(null), 3000);
      loadData();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao registrar despesa:', err);
      alert('Erro ao registrar despesa.');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Section 3 - Add Document Handler
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !id) return;

    if (!docNome.trim()) {
      alert('Informe o nome do documento.');
      return;
    }

    try {
      setIsSubmittingDoc(true);
      await addPropertyDocument(user.id, id, {
        id: crypto.randomUUID(),
        nome: docNome.trim(),
        tipo: docTipo,
        url: docUrl.trim() || '#',
        data: new Date().toLocaleDateString('pt-BR')
      });

      setIsDocModalOpen(false);
      setDocNome('');
      setDocUrl('');
      setSuccessToast('Documento anexado com sucesso!');
      setTimeout(() => setSuccessToast(null), 3000);
      loadData();
    } catch (err) {
      console.error('Erro ao adicionar documento:', err);
      alert('Erro ao salvar documento.');
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (isLoading) {
    return (
      <div className="min-h-96 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-xs text-slate-400">Carregando dados do imóvel e contratos...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Imóvel não encontrado</h3>
        <button
          onClick={() => navigate('/imoveis')}
          className="py-2.5 px-4 rounded-xl bg-slate-800 text-xs text-white hover:bg-slate-700"
        >
          Voltar para listagem
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/imoveis')}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Módulo Imobiliário /</span>
              <span className="text-xs font-semibold text-amber-400">Gestão do Imóvel</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{data.imovel.endereco}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-rose-500/50 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-rose-400" />
            <span>Adicionar Despesa</span>
          </button>

          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Recebimento</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Aluguel Mensal */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Aluguel Contratual</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{formatCurrency(data.imovel.valor_aluguel)}</div>
          <div className="text-xs text-slate-400 mt-2">Vencimento todo dia {data.imovel.dia_vencimento || 10}</div>
        </div>

        {/* Total Recebido */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Recebido</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{formatCurrency(data.totalRecebido)}</div>
          <div className="text-xs text-emerald-300 mt-2">{data.recebimentos.length} repasse(s) registrado(s)</div>
        </div>

        {/* Total Despesas */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Despesas / Taxas</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{formatCurrency(data.totalDespesas)}</div>
          <div className="text-xs text-rose-300 mt-2">{data.despesas.length} despesa(s) abatida(s)</div>
        </div>

        {/* Rentabilidade Líquida */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Rentabilidade Líquida</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${data.rentabilidadeLiquida >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(data.rentabilidadeLiquida)}
          </div>
          <div className="text-xs text-slate-400 mt-2">Recebimentos (-) Despesas</div>
        </div>
      </div>

      {/* SEÇÃO 1: Dados do Imóvel e Inquilino (Diretamente Editáveis) */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Seção 1 — Dados do Imóvel e Inquilino</h2>
              <p className="text-xs text-slate-400">Edite os dados cadastrais diretamente nos campos abaixo</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSavePropertyDetails} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Endereço */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Endereço Completo</span>
              </label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-sm rounded-xl border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Valor do Aluguel & Dia de Vencimento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Valor do Aluguel (R$)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={valorAluguel}
                  onChange={(e) => setValorAluguel(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dia Vencimento</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-sm border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Nome do Inquilino */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nome do Inquilino</span>
              </label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={inquilinoNome}
                onChange={(e) => setInquilinoNome(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-sm border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Contato do Inquilino */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-400" />
                <span>Contato / WhatsApp do Inquilino</span>
              </label>
              <input
                type="text"
                placeholder="Ex: (11) 99999-8888"
                value={inquilinoContato}
                onChange={(e) => setInquilinoContato(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-sm border border-slate-700/80 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingDetails}
              className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingDetails ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando no Neon...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* SEÇÃO 2: Histórico de Pagamentos (Recebimentos) & Gráfico */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Seção 2 — Histórico de Pagamentos (Recebimentos)</h2>
              <p className="text-xs text-slate-400">Acompanhamento de adimplência e histórico mensal de aluguéis</p>
            </div>
          </div>

          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Recebimento</span>
          </button>
        </div>

        {/* Gráfico de Recebimentos dos últimos 12 meses */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Adimplência nos Últimos 12 Meses
          </h3>
          <div className="h-60 w-full bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
            {data.monthlyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Nenhum pagamento registrado ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor Recebido']}
                  />
                  <Bar dataKey="valor" name="Aluguel Recebido" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tabela de Recebimentos */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Lista de Recebimentos Registrados
          </h3>

          {data.recebimentos.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
              Nenhum pagamento registrado ainda para este imóvel.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Referência / Descrição</th>
                    <th className="py-3 px-4">Data Pagamento</th>
                    <th className="py-3 px-4 text-right">Valor Pago</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {data.recebimentos.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">{r.descricao}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">
                        {r.data_pagamento ? new Date(r.data_pagamento).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(Math.abs(r.valor))}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{r.observacoes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO 3: Documentos e Manutenção */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Despesas / Manutenções */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <Wrench className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Despesas & Manutenções</h3>
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Custos vinculados a este imóvel (abatidos da rentabilidade líquida).
          </p>

          {data.despesas.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
              Nenhuma despesa ou manutenção vinculada.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {data.despesas.map((d) => (
                <div key={d.id} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">{d.descricao}</p>
                    <span className="text-[10px] text-slate-400">{d.categoria} • {d.data_vencimento ? new Date(d.data_vencimento).toLocaleDateString('pt-BR') : 'Data não informada'}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    - {formatCurrency(Math.abs(d.valor))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção de Documentos & Contratos */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Documentos & Contratos</h3>
            </div>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Anexar</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Contratos de locação, vistorias e documentos anexados.
          </p>

          {!data.imovel.documentos || data.imovel.documentos.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
              Nenhum documento anexado ainda.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {data.imovel.documentos.map((doc) => (
                <div key={doc.id} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{doc.nome}</p>
                      <span className="text-[10px] text-slate-400">{doc.tipo} • {doc.data}</span>
                    </div>
                  </div>
                  {doc.url && doc.url !== '#' && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MODAL: Registrar Recebimento */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Registrar Recebimento</h3>
                  <p className="text-xs text-slate-400">Baixa de aluguel no Neon DB</p>
                </div>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mês de Referência</label>
                  <input
                    type="month"
                    value={receiptMesRef}
                    onChange={(e) => setReceiptMesRef(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data Recebimento</label>
                  <input
                    type="date"
                    value={receiptDataRecebimento}
                    onChange={(e) => setReceiptDataRecebimento(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Recebido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={receiptValor}
                  onChange={(e) => setReceiptValor(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-white font-mono font-bold text-sm rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={receiptStatus}
                    onChange={(e) => setReceiptStatus(e.target.value as 'Pago' | 'Atrasado' | 'Parcial')}
                    className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Pago">Pago (Integral)</option>
                    <option value="Parcial">Pago Parcial</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Conta Bancária</label>
                  <select
                    value={receiptContaId}
                    onChange={(e) => setReceiptContaId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    {data.contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_instituicao}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Recebido via PIX com desconto de taxa..."
                  value={receiptObservacoes}
                  onChange={(e) => setReceiptObservacoes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceipt}
                  className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar Despesa */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Adicionar Despesa do Imóvel</h3>
                  <p className="text-xs text-slate-400">Custos que reduzem a rentabilidade</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: IPTU Parcela 03, Reparo Hidráulico"
                  value={expenseDescricao}
                  onChange={(e) => setExpenseDescricao(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={expenseCategoria}
                    onChange={(e) => setExpenseCategoria(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Condomínio">Condomínio</option>
                    <option value="IPTU">IPTU</option>
                    <option value="Manutenção & Reparos">Manutenção & Reparos</option>
                    <option value="Taxa de Administração">Taxa de Administração</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0,00"
                    value={expenseValor}
                    onChange={(e) => setExpenseValor(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-900 text-white font-mono font-bold text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data Vencimento</label>
                  <input
                    type="date"
                    value={expenseDataVenc}
                    onChange={(e) => setExpenseDataVenc(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status da Despesa</label>
                  <select
                    value={expenseStatus}
                    onChange={(e) => setExpenseStatus(e.target.value as 'Pago' | 'Pendente')}
                    className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Pago">Pago (Liquidado)</option>
                    <option value="Pendente">Pendente (A Pagar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Conta Bancária</label>
                <select
                  value={expenseContaId}
                  onChange={(e) => setExpenseContaId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-rose-500"
                >
                  {data.contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_instituicao}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="py-2.5 px-5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Anexar Documento */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Anexar Documento</h3>
                  <p className="text-xs text-slate-400">Contratos, termos e comprovantes</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título do Documento</label>
                <input
                  type="text"
                  placeholder="Ex: Contrato de Locação 2026-2028"
                  value={docNome}
                  onChange={(e) => setDocNome(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Documento</label>
                <select
                  value={docTipo}
                  onChange={(e) => setDocTipo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Contrato de Locação">Contrato de Locação</option>
                  <option value="Laudo de Vistoria">Laudo de Vistoria</option>
                  <option value="Termo de Entrega de Chaves">Termo de Entrega de Chaves</option>
                  <option value="Comprovante de IPTU">Comprovante de IPTU</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Link ou Referência (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: https://drive.google.com/..."
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDoc}
                  className="py-2.5 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
