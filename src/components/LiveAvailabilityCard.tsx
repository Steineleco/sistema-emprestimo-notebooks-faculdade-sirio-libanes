import React, { useState } from 'react';
import {
  Laptop,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  ChevronDown,
  ChevronUp,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Notebook } from '../types';

interface LiveAvailabilityCardProps {
  notebooks: Notebook[];
  loading?: boolean;
  unitName?: string;
  onSelectHostname?: (hostname: string) => void;
  selectedHostname?: string;
}

export const LiveAvailabilityCard: React.FC<LiveAvailabilityCardProps> = ({
  notebooks,
  loading = false,
  unitName = 'Central de TI — Campus Bela Vista',
  onSelectHostname,
  selectedHostname,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Cálculos em tempo real da unidade vs. total
  const total = notebooks.length;
  const disponiveis = notebooks.filter((n) => n.status === 'GUARDADO');
  const emUso = notebooks.filter((n) => n.status === 'EMPRESTADO');
  const emManutencao = notebooks.filter((n) => n.status === 'MANUTENCAO');

  const disponiveisCount = disponiveis.length;
  const emUsoCount = emUso.length;
  const emManutencaoCount = emManutencao.length;

  const percentualDisponivel = total > 0 ? Math.round((disponiveisCount / total) * 100) : 0;

  // Status de disponibilidade da frota
  const isEsgotado = disponiveisCount === 0;
  const isBaixo = !isEsgotado && percentualDisponivel <= 25;

  return (
    <div className="mb-6 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-100/90 relative overflow-hidden transition-all duration-200">
      {/* Glow de fundo */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-50/70 rounded-full blur-2xl pointer-events-none -mr-16 -mt-8" />

      {/* Top Header com indicador AO VIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Disponibilidade da Frota
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                AO VIVO
              </span>
            </div>
            <div className="flex items-center text-[11px] text-slate-500 gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>{unitName}</span>
            </div>
          </div>
        </div>

        {/* Badge de status do estoque */}
        <div>
          {isEsgotado ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              Frota Esgotada na Unidade
            </span>
          ) : isBaixo ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              Estoque Baixo na Unidade
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Disponibilidade Normal
            </span>
          )}
        </div>
      </div>

      {/* Seção Principal: Números Unidade vs. Total */}
      <div className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Destaque Principal: Unidade vs. Total */}
        <div className="sm:col-span-5 flex items-baseline gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Notebooks na Unidade
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl sm:text-4xl font-mono font-black text-emerald-950">
                {loading ? '...' : disponiveisCount}
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-slate-400">
                / {loading ? '...' : total}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1">
                unidades
              </span>
            </div>
          </div>

          <div className="ml-auto sm:hidden">
            <span className="text-lg font-black font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
              {percentualDisponivel}%
            </span>
          </div>
        </div>

        {/* Barra de Progresso e Métricas Rápidas */}
        <div className="sm:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Taxa de Prontidão Imediata</span>
            <span className="font-mono font-bold text-emerald-800">
              {percentualDisponivel}% da frota pronta
            </span>
          </div>

          {/* Barra de Progresso Visual */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80 flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isEsgotado
                  ? 'bg-rose-500'
                  : isBaixo
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500'
              }`}
              style={{ width: `${Math.max(percentualDisponivel, 3)}%` }}
            />
          </div>

          {/* Mini-Indicadores (Disponíveis, Em Uso, Manutenção) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200/70 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span><strong>{disponiveisCount}</strong> Disponíveis na Unidade</span>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200/70 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span><strong>{emUsoCount}</strong> Em Empréstimo</span>
            </div>

            {emManutencaoCount > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200/70 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span><strong>{emManutencaoCount}</strong> Em Manutenção</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botão de Expansão para Ver Todos os Equipamentos */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Sincronizado instantaneamente com o banco Firestore da Faculdade Sírio-Libanês.
        </span>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition py-1 px-2 rounded-lg hover:bg-emerald-50 cursor-pointer"
        >
          <span>{showDetails ? 'Ocultar Equipamentos' : 'Ver Equipamentos da Unidade'}</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Lista Retrátil com os Notebooks da Unidade */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
          <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
            <span>Equipamentos Cadastrados na Unidade (Clique para selecionar):</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {disponiveisCount} disponíveis de {total}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {notebooks.map((nb) => {
              const isAvailable = nb.status === 'GUARDADO';
              const isSelected = selectedHostname === nb.hostname;

              return (
                <button
                  key={nb.hostname}
                  type="button"
                  onClick={() => {
                    if (onSelectHostname && isAvailable) {
                      onSelectHostname(nb.hostname);
                    }
                  }}
                  disabled={!isAvailable && !onSelectHostname}
                  className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                      : isAvailable
                      ? 'border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-800 cursor-pointer'
                      : 'border-slate-200 bg-slate-50/80 text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                  title={
                    isAvailable
                      ? `Equipamento disponível: ${nb.marca} ${nb.modelo}`
                      : `Indisponível no momento (${nb.status})`
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[11px]">
                      {nb.hostname}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAvailable
                          ? 'bg-emerald-500'
                          : nb.status === 'MANUTENCAO'
                          ? 'bg-amber-500'
                          : 'bg-blue-400'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {nb.marca} {nb.modelo}
                  </div>
                  <div className="mt-1 text-[9px] font-semibold uppercase">
                    {isAvailable ? (
                      <span className="text-emerald-700">🟢 Disponível</span>
                    ) : nb.status === 'MANUTENCAO' ? (
                      <span className="text-amber-700">🟡 Manutenção</span>
                    ) : (
                      <span className="text-slate-500">🔵 Empréstimo</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
