import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Shield,
  Database,
  LogOut,
  CheckCircle2,
  Server
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Configurações</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerenciamento de perfil, banco de dados e preferências do sistema
          </p>
        </div>
      </div>

      {/* User profile card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{user?.nome}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mt-2">
              <CheckCircle2 className="w-3 h-3" />
              Conta Ativa & Verificada
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Identificador de Usuário (UUID)</span>
            <p className="font-mono text-slate-200 font-semibold truncate">{user?.id}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Data de Criação</span>
            <p className="font-mono text-slate-200 font-semibold">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
            </p>
          </div>
        </div>
      </div>

      {/* Infrastructure & Security info */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-5">
        <div className="flex items-center gap-2 text-white">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold">Infraestrutura & Segurança</h3>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">Neon PostgreSQL Serverless</p>
                <p className="text-[11px] text-slate-400">Branch: production | Pooler Ativo</p>
              </div>
            </div>
            <span className="text-emerald-400 font-bold">Conectado</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="font-semibold text-white">Row Level Security (RLS)</p>
                <p className="text-[11px] text-slate-400">Políticas ativas em 100% das tabelas</p>
              </div>
            </div>
            <span className="text-emerald-400 font-bold">Isolado</span>
          </div>
        </div>
      </div>

      {/* Session Actions */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={logout}
          className="py-3 px-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </div>
  );
};
