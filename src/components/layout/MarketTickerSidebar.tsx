import React, { useState, useEffect } from 'react';
import { fetchLiveMarketData, type MarketData } from '../../services/marketService';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity
} from 'lucide-react';

export const MarketTickerSidebar: React.FC = () => {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMarket = async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const data = await fetchLiveMarketData();
      setMarket(data);
    } catch (err) {
      console.error('Erro ao carregar cotações:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMarket();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      loadMarket(false);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 shadow-lg space-y-2.5">
      {/* Header with Live Indicator & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
            Mercado ao Vivo
          </span>
        </div>

        <button
          onClick={() => loadMarket(true)}
          disabled={isRefreshing}
          title="Atualizar cotações agora"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Tickers List */}
      <div className="grid grid-cols-1 gap-2">
        {/* Dólar Comercial */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">Dólar (USD)</p>
              <p className="text-[9px] text-slate-400">Cotação Comercial</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-mono font-extrabold text-white leading-tight">
              {market?.dolar.formattedPrice || 'R$ 5,65'}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              {market?.dolar.isPositive ? (
                <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
              )}
              <span
                className={`text-[10px] font-mono font-semibold ${
                  market?.dolar.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {market?.dolar.changePercent && market.dolar.changePercent > 0 ? '+' : ''}
                {market?.dolar.changePercent ? market.dolar.changePercent.toFixed(2) : '0.00'}%
              </span>
            </div>
          </div>
        </div>

        {/* Bolsa de SP (Ibovespa) */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight">Ibovespa (B3)</p>
              <p className="text-[9px] text-slate-400">Bolsa de São Paulo</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-mono font-extrabold text-white leading-tight">
              {market?.ibovespa.formattedPrice || '135.400 pts'}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              {market?.ibovespa.isPositive ? (
                <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
              )}
              <span
                className={`text-[10px] font-mono font-semibold ${
                  market?.ibovespa.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {market?.ibovespa.changePercent && market.ibovespa.changePercent > 0 ? '+' : ''}
                {market?.ibovespa.changePercent ? market.ibovespa.changePercent.toFixed(2) : '0.00'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-0.5">
        <span className="text-[9px] text-slate-500 font-mono">
          Última checagem: {market?.lastUpdated || 'Agora'}
        </span>
      </div>
    </div>
  );
};
