import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../lib/neon';
import type { Imovel } from '../types/database';
import {
  Building2,
  PlusCircle,
  User,
  Phone,
  Loader2,
  X,
  MapPin,
  ChevronRight
} from 'lucide-react';

export const PropertiesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Imovel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [endereco, setEndereco] = useState('');
  const [valorAluguel, setValorAluguel] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [inquilinoNome, setInquilinoNome] = useState('');
  const [inquilinoContato, setInquilinoContato] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProperties = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      const rows = await sql`
        SELECT * FROM imoveis 
        WHERE usuario_id = ${user.id}
        ORDER BY created_at DESC;
      `;
      setProperties(rows as unknown as Imovel[]);
    } catch (err) {
      console.error('Erro ao buscar imóveis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, [user?.id]);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setErrorMessage(null);

    const numAluguel = parseFloat(valorAluguel.replace(',', '.'));
    if (!endereco.trim() || isNaN(numAluguel) || numAluguel <= 0) {
      setErrorMessage('Preencha os campos obrigatórios corretamente.');
      return;
    }

    try {
      setIsSubmitting(true);
      const sql = getDb();
      await sql`SELECT set_config('app.current_user_id', ${user.id}, true);`;

      await sql`
        INSERT INTO imoveis (usuario_id, endereco, valor_aluguel, dia_vencimento, inquilino_nome, inquilino_contato)
        VALUES (${user.id}, ${endereco.trim()}, ${numAluguel}, ${parseInt(diaVencimento)}, ${inquilinoNome.trim() || null}, ${inquilinoContato.trim() || null});
      `;

      setEndereco('');
      setValorAluguel('');
      setInquilinoNome('');
      setInquilinoContato('');
      setIsModalOpen(false);
      loadProperties();
      window.dispatchEvent(new Event('transaction-created'));
    } catch (err) {
      console.error('Erro ao cadastrar imóvel:', err);
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
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Módulo Imobiliário (Aluguéis)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de locações, inquilinos, vencimentos, despesas e rentabilidade líquida
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Cadastrar Imóvel</span>
        </button>
      </div>

      {/* Grid of properties */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-slate-900/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 border border-slate-800">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhum imóvel locado cadastrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Cadastre seus imóveis para acompanhar inquilinos, vencimentos de mensalidades e rentabilidade bruta e líquida.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Meu Primeiro Imóvel</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <div
              key={prop.id}
              onClick={() => navigate(`/imoveis/${prop.id}`)}
              className="glass-card rounded-3xl p-6 border border-slate-800/80 hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group cursor-pointer shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    Locação Ativa
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    Vencimento Dia {prop.dia_vencimento || '10'}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 mt-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <h3 className="text-sm font-bold text-white leading-snug group-hover:text-amber-400 transition-colors">
                    {prop.endereco}
                  </h3>
                </div>

                <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      Inquilino:
                    </span>
                    <span className="font-semibold text-white">{prop.inquilino_nome || 'Não informado'}</span>
                  </div>

                  {prop.inquilino_contato && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        Contato:
                      </span>
                      <span className="font-mono">{prop.inquilino_contato}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Aluguel Mensal</span>
                  <span className="text-base font-bold text-amber-400 font-mono">
                    {formatCurrency(Number(prop.valor_aluguel) || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-slate-300 group-hover:text-amber-400 transition-colors">
                  <span>Gerenciar</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar Imóvel */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-700/80 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Imóvel</h3>
                  <p className="text-xs text-slate-400">Insira os dados do imóvel e locação</p>
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

            <form onSubmit={handleCreateProperty} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Endereço Completo do Imóvel
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Paulista, 1000 - Apto 42"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Aluguel Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0,00"
                    value={valorAluguel}
                    onChange={(e) => setValorAluguel(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Inquilino
                </label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={inquilinoNome}
                  onChange={(e) => setInquilinoNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Telefone / Contato do Inquilino
                </label>
                <input
                  type="text"
                  placeholder="Ex: (11) 99999-8888"
                  value={inquilinoContato}
                  onChange={(e) => setInquilinoContato(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-sm border border-slate-700/80 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
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
                  className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Imóvel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
