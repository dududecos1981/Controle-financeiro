import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { ArrowLeft } from 'lucide-react';

export const NewTransactionPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header with Back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/transacoes')}
          className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          title="Voltar para listagem"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Transações /</span>
            <span className="text-xs font-semibold text-emerald-400">Novo Lançamento</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cadastro de Transação</h1>
        </div>
      </div>

      {/* Form Container */}
      <TransactionForm
        onSuccess={() => navigate('/transacoes')}
        onCancel={() => navigate('/transacoes')}
      />
    </div>
  );
};
