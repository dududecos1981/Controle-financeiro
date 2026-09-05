import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight, Clock, ChevronRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'indigo' | 'rose' | 'amber';
  linkTo?: string;
  emptyText?: string;
  badgeText?: string;
  isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'emerald',
  linkTo,
  emptyText = 'Nenhuma pendência no momento',
  badgeText,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);

  const variantStyles = {
    emerald: {
      border: 'hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      glow: 'shadow-emerald-500/10',
      trendColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    indigo: {
      border: 'hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      glow: 'shadow-indigo-500/10',
      trendColor: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    },
    rose: {
      border: 'hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400',
      glow: 'shadow-rose-500/10',
      trendColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    },
    amber: {
      border: 'hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      glow: 'shadow-amber-500/10',
      trendColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
  };

  const currentStyle = variantStyles[variant];

  const handleClick = () => {
    if (linkTo) {
      navigate(linkTo);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`glass-card rounded-2xl p-5 sm:p-6 border border-slate-800/80 transition-all duration-300 relative overflow-hidden group ${
        linkTo ? `cursor-pointer ${currentStyle.border} hover:-translate-y-1 hover:shadow-xl ${currentStyle.glow}` : ''
      }`}
    >
      {/* Top row: Title and Icon */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${currentStyle.iconBg} transition-transform group-hover:scale-110`}>
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>

      {/* Main value */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse py-1">
          <div className="h-8 bg-slate-800 rounded-lg w-3/4" />
          <div className="h-4 bg-slate-800/60 rounded-md w-1/2" />
        </div>
      ) : (
        <>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formattedValue}
          </div>

          {/* Subtitle / Trend */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              {value === 0 && !badgeText ? (
                <span className="text-slate-500 italic">{emptyText}</span>
              ) : (
                <>
                  {variant === 'emerald' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />}
                  {variant === 'rose' && <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                  {variant === 'amber' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                  <span className={currentStyle.trendColor}>
                    {subtitle || (value > 0 ? 'Atualizado' : emptyText)}
                  </span>
                </>
              )}
            </div>

            {badgeText && (
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${currentStyle.badgeBg}`}>
                {badgeText}
              </span>
            )}

            {linkTo && (
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
            )}
          </div>
        </>
      )}
    </div>
  );
};
