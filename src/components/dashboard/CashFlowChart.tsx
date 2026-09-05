import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CashFlowChartProps {
  data: {
    mes: string;
    entradas: number;
    saidas: number;
  }[];
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const entradas = payload.find(p => p.dataKey === 'entradas')?.value || 0;
    const saidas = payload.find(p => p.dataKey === 'saidas')?.value || 0;
    const saldo = entradas - saidas;

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-44">
        <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5">{label}</p>
        <div className="flex items-center justify-between text-emerald-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Entradas:
          </span>
          <span className="font-semibold font-mono">{formatCurrency(entradas)}</span>
        </div>
        <div className="flex items-center justify-between text-rose-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Saídas:
          </span>
          <span className="font-semibold font-mono">{formatCurrency(saidas)}</span>
        </div>
        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-slate-200 font-bold">
          <span>Resultado:</span>
          <span className={`font-mono ${saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(saldo)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, isLoading = false }) => {
  const currentMonthData = data[data.length - 1] || { entradas: 0, saidas: 0 };
  const totalEntradas = currentMonthData.entradas;
  const totalSaidas = currentMonthData.saidas;
  const resultadoMes = totalEntradas - totalSaidas;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Fluxo de Caixa Mensal</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Comparativo entre Entradas (Receitas e Aluguéis) vs Saídas (Despesas e Faturas)
          </p>
        </div>

        {/* Quick Month Metrics Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Entradas:</span>
            <span className="font-bold">{formatCurrency(totalEntradas)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400">Saídas:</span>
            <span className="font-bold">{formatCurrency(totalSaidas)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200">
            <span className="text-slate-400">Saldo Líquido:</span>
            <span className={`font-bold ${resultadoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(resultadoMes)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-72 w-full pt-2">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="h-48 w-full bg-slate-900/60 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="mes"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
                iconType="circle"
              />
              <Bar
                dataKey="entradas"
                name="Entradas (R$)"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="saidas"
                name="Saídas (R$)"
                fill="#f43f5e"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
