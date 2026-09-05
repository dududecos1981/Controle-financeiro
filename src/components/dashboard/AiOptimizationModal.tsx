import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  requestFinancialOptimization,
  saveOptimizationPlan
} from '../../services/aiService';
import type { PropostaOtimizacao } from '../../types/database';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save
} from 'lucide-react';

interface AiOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanSaved?: () => void;
}

export const AiOptimizationModal: React.FC<AiOptimizationModalProps> = ({
  isOpen,
  onClose,
  onPlanSaved,
}) => {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable Form State
  const [mesReferencia, setMesReferencia] = useState('');
  const [analiseGastos, setAnaliseGastos] = useState<string[]>([]);
  const [metasEconomia, setMetasEconomia] = useState<string[]>([]);
  const [alertasImobiliarios, setAlertasImobiliarios] = useState<string[]>([]);
  const [projecaoSaldo, setProjecaoSaldo] = useState<string>('0');

  // New item inputs
  const [newGasto, setNewGasto] = useState('');
  const [newMeta, setNewMeta] = useState('');
  const [newAlerta, setNewAlerta] = useState('');

  const generatePlan = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const proposta = await requestFinancialOptimization(user.id);

      setMesReferencia(proposta.mes_referencia || 'Próximo Mês');
      setAnaliseGastos(proposta.analise_gastos || []);
      setMetasEconomia(proposta.metas_economia || []);
      setAlertasImobiliarios(proposta.alertas_imobiliarios || []);
      setProjecaoSaldo(proposta.projecao_saldo?.toString() || '0');
    } catch (err) {
      console.error('Erro na otimização:', err);
      setErrorMessage(
        'Não foi possível gerar análise inteligente no momento. Tente novamente mais tarde.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generatePlan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handlers for modifying lists
  const handleUpdateItem = (
    listSetter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    listSetter((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleRemoveItem = (
    listSetter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    listSetter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = (
    listSetter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    clearInput: () => void
  ) => {
    if (value.trim()) {
      listSetter((prev) => [...prev, value.trim()]);
      clearInput();
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const propostaFinal: PropostaOtimizacao = {
        mes_referencia: mesReferencia.trim(),
        analise_gastos: analiseGastos.filter((g) => g.trim().length > 0),
        metas_economia: metasEconomia.filter((m) => m.trim().length > 0),
        alertas_imobiliarios: alertasImobiliarios.filter((a) => a.trim().length > 0),
        projecao_saldo: parseFloat(projecaoSaldo.replace(',', '.')) || 0,
      };

      await saveOptimizationPlan(user.id, propostaFinal);

      setSuccessMessage('Plano de Otimização Financeira salvo com sucesso!');
      window.dispatchEvent(new Event('plan-saved'));

      setTimeout(() => {
        if (onPlanSaved) onPlanSaved();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Erro ao salvar plano:', err);
      setErrorMessage('Erro ao salvar o plano no banco de dados Neon.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card rounded-3xl max-w-3xl w-full border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Consultor Financeiro Inteligente (IA)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Plano de corte de despesas, metas de economia e projeções imobiliárias
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {isLoading ? (
            /* Loading State */
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-pulse">
                  <Sparkles className="w-8 h-8 text-slate-950 animate-spin" />
                </div>
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-white">Analisando suas finanças...</h4>
                <p className="text-xs text-slate-400">
                  O Gemini está cruzando suas receitas, contas a pagar, faturas e rendimentos de aluguéis no Neon.
                </p>
              </div>
            </div>
          ) : (
            /* Editable Form */
            <form onSubmit={handleSavePlan} className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mês de Referência</span>
                  </label>
                  <input
                    type="text"
                    value={mesReferencia}
                    onChange={(e) => setMesReferencia(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Projeção de Saldo (R$)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={projecaoSaldo}
                    onChange={(e) => setProjecaoSaldo(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-slate-900 text-emerald-400 font-mono font-bold text-xs rounded-xl border border-slate-700/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 1. Análise de Gastos & Cortes Sugeridos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    1. Análise de Gastos & Sugestões de Corte
                  </h4>
                </div>

                <div className="space-y-2">
                  {analiseGastos.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) =>
                          handleUpdateItem(setAnaliseGastos, index, e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-xl border border-slate-800 focus:border-rose-500/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(setAnaliseGastos, index)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add new item */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Adicionar nova observação de corte de gastos..."
                      value={newGasto}
                      onChange={(e) => setNewGasto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem(setAnaliseGastos, newGasto, () => setNewGasto(''));
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-950/50 text-slate-300 placeholder:text-slate-600 text-xs rounded-xl border border-dashed border-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleAddItem(setAnaliseGastos, newGasto, () => setNewGasto(''))
                      }
                      className="py-1.5 px-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Metas de Economia & Aportes */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    2. Metas de Economia & Aportes
                  </h4>
                </div>

                <div className="space-y-2">
                  {metasEconomia.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) =>
                          handleUpdateItem(setMetasEconomia, index, e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-xl border border-slate-800 focus:border-emerald-500/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(setMetasEconomia, index)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add new item */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Adicionar nova meta financeira..."
                      value={newMeta}
                      onChange={(e) => setNewMeta(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem(setMetasEconomia, newMeta, () => setNewMeta(''));
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-950/50 text-slate-300 placeholder:text-slate-600 text-xs rounded-xl border border-dashed border-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleAddItem(setMetasEconomia, newMeta, () => setNewMeta(''))
                      }
                      className="py-1.5 px-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Alertas Imobiliários & Rendimentos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Building2 className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    3. Alertas Imobiliários & Aluguéis
                  </h4>
                </div>

                <div className="space-y-2">
                  {alertasImobiliarios.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) =>
                          handleUpdateItem(setAlertasImobiliarios, index, e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-xl border border-slate-800 focus:border-amber-500/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(setAlertasImobiliarios, index)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add new item */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Adicionar novo alerta locatício..."
                      value={newAlerta}
                      onChange={(e) => setNewAlerta(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem(setAlertasImobiliarios, newAlerta, () =>
                            setNewAlerta('')
                          );
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-950/50 text-slate-300 placeholder:text-slate-600 text-xs rounded-xl border border-dashed border-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleAddItem(setAlertasImobiliarios, newAlerta, () =>
                          setNewAlerta('')
                        )
                      }
                      className="py-1.5 px-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={generatePlan}
                  disabled={isLoading || isSaving}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Regenerar Análise</span>
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando no Neon...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar como Plano de Ação</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
