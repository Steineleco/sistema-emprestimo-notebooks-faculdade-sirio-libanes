import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Calendar,
  User,
  Filter,
  FileSpreadsheet,
  Laptop,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  FileText,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Database,
  Cloud,
  FileDown,
  History,
  Check,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AuditLog, AuditAction } from '../types';
import {
  exportAuditLogsToExcel,
  exportAuditLogsToCSV,
} from '../services/auditService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../context/AuthContext';

interface AuditLogsTabProps {
  logs: AuditLog[];
}

type ScopeFilter = 'ALL' | 'NOTEBOOK_STATUS' | 'EMPRESTIMOS' | 'MANUTENCAO';

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ logs }) => {
  const { isOnline } = useNetworkStatus();
  const { role } = useAuth();
  const isAdmin = role === 'ADM';

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTecnico, setSelectedTecnico] = useState<string>('ALL');
  const [selectedAcao, setSelectedAcao] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Lista dinâmica de técnicos únicos que realizaram operações
  const uniqueTecnicos = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.tecnicoResponsavel && log.tecnicoResponsavel.trim()) {
        set.add(log.tecnicoResponsavel.trim());
      }
    });
    return Array.from(set).sort();
  }, [logs]);

  // Contagens para os KPIs e abas de escopo
  const totalCount = logs.length;
  const notebookStatusCount = useMemo(
    () =>
      logs.filter(
        (l) =>
          l.categoria === 'NOTEBOOK' ||
          l.acao === 'ALTERACAO_STATUS_NOTEBOOK' ||
          l.acao === 'CADASTRO_NOTEBOOK' ||
          l.acao === 'ENVIO_MANUTENCAO' ||
          l.acao === 'RETORNO_MANUTENCAO'
      ).length,
    [logs]
  );
  const loanHistoryCount = useMemo(
    () =>
      logs.filter(
        (l) =>
          l.categoria === 'EMPRESTIMO' ||
          l.acao === 'CRIACAO_EMPRESTIMO' ||
          l.acao === 'DEVOLUCAO_EMPRESTIMO'
      ).length,
    [logs]
  );
  const maintenanceCount = useMemo(
    () =>
      logs.filter(
        (l) =>
          l.acao === 'ENVIO_MANUTENCAO' ||
          l.acao === 'RETORNO_MANUTENCAO' ||
          (l.statusNovo && l.statusNovo === 'MANUTENCAO')
      ).length,
    [logs]
  );

  // Atalhos de filtro por data
  const applyDateShortcut = (type: 'today' | '7days' | '30days' | 'thisMonth') => {
    const now = new Date();
    const endStr = now.toISOString().split('T')[0];

    if (type === 'today') {
      setStartDate(endStr);
      setEndDate(endStr);
    } else if (type === '7days') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (type === '30days') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (type === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedTecnico('ALL');
    setSelectedAcao('ALL');
    setScopeFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  // Filtragem combinada
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Filtro de escopo
      if (scopeFilter === 'NOTEBOOK_STATUS') {
        const isNb =
          log.categoria === 'NOTEBOOK' ||
          log.acao === 'ALTERACAO_STATUS_NOTEBOOK' ||
          log.acao === 'CADASTRO_NOTEBOOK' ||
          log.acao === 'ENVIO_MANUTENCAO' ||
          log.acao === 'RETORNO_MANUTENCAO';
        if (!isNb) return false;
      } else if (scopeFilter === 'EMPRESTIMOS') {
        const isLoan =
          log.categoria === 'EMPRESTIMO' ||
          log.acao === 'CRIACAO_EMPRESTIMO' ||
          log.acao === 'DEVOLUCAO_EMPRESTIMO';
        if (!isLoan) return false;
      } else if (scopeFilter === 'MANUTENCAO') {
        const isMaint =
          log.acao === 'ENVIO_MANUTENCAO' ||
          log.acao === 'RETORNO_MANUTENCAO' ||
          log.statusNovo === 'MANUTENCAO';
        if (!isMaint) return false;
      }

      // 2. Filtro textual
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matchesTerm =
          log.hostname.toLowerCase().includes(term) ||
          (log.protocolo && log.protocolo.toLowerCase().includes(term)) ||
          log.detalhes.toLowerCase().includes(term) ||
          log.tecnicoResponsavel.toLowerCase().includes(term) ||
          (log.alunoNome && log.alunoNome.toLowerCase().includes(term)) ||
          (log.alunoRa && log.alunoRa.toLowerCase().includes(term));

        if (!matchesTerm) return false;
      }

      // 3. Filtro de técnico
      if (selectedTecnico !== 'ALL' && log.tecnicoResponsavel.trim() !== selectedTecnico.trim()) {
        return false;
      }

      // 4. Filtro de ação específica
      if (selectedAcao !== 'ALL' && log.acao !== selectedAcao) {
        return false;
      }

      // 5. Filtro por data
      if (startDate) {
        const logDateStr = log.timestamp.split('T')[0];
        if (logDateStr < startDate) return false;
      }
      if (endDate) {
        const logDateStr = log.timestamp.split('T')[0];
        if (logDateStr > endDate) return false;
      }

      return true;
    });
  }, [logs, scopeFilter, searchTerm, selectedTecnico, selectedAcao, startDate, endDate]);

  const handleExportExcel = () => {
    if (!isAdmin) {
      alert('Acesso restrito: Somente o Administrador Geral (ADM) possui permissão para exportar relatórios para Excel.');
      return;
    }
    setExportingExcel(true);
    try {
      exportAuditLogsToExcel(
        filteredLogs,
        `Auditoria_Sirio_Libanes_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (err) {
      console.error('Falha ao exportar logs Excel:', err);
    } finally {
      setTimeout(() => setExportingExcel(false), 800);
    }
  };

  const handleExportCsv = () => {
    if (!isAdmin) {
      alert('Acesso restrito: Somente o Administrador Geral (ADM) possui permissão para exportar relatórios.');
      return;
    }
    setExportingCsv(true);
    try {
      exportAuditLogsToCSV(
        filteredLogs,
        `Auditoria_Sirio_Libanes_${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err) {
      console.error('Falha ao exportar logs CSV:', err);
    } finally {
      setTimeout(() => setExportingCsv(false), 800);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'GUARDADO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            🟢 GUARDADO
          </span>
        );
      case 'EMPRESTADO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            🔵 EMPRESTADO
          </span>
        );
      case 'MANUTENCAO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            🟠 MANUTENÇÃO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-slate-700 bg-slate-100 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getActionBadge = (acao: AuditAction) => {
    switch (acao) {
      case 'CRIACAO_EMPRESTIMO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <PlusCircle className="w-3 h-3 text-blue-600" />
            Empréstimo Criado
          </span>
        );
      case 'DEVOLUCAO_EMPRESTIMO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Devolução Concluída
          </span>
        );
      case 'ENVIO_MANUTENCAO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Envio para Manutenção
          </span>
        );
      case 'RETORNO_MANUTENCAO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <RotateCcw className="w-3 h-3 text-teal-600" />
            Retorno para Guarda
          </span>
        );
      case 'CADASTRO_NOTEBOOK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Laptop className="w-3 h-3 text-purple-600" />
            Equipamento Cadastrado
          </span>
        );
      case 'BACKUP_ADMINISTRATIVO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <Cloud className="w-3 h-3 text-teal-600" />
            Backup Firebase Storage
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <Layers className="w-3 h-3 text-slate-600" />
            Alteração de Status
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Offline Persistence Notification Banner */}
      {!isOnline && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Modo Offline (Persistência Firestore Ativa):</span> Visualizando histórico de auditoria preservado em cache local. Os logs permanecem disponíveis para consulta mesmo sem conexão ativa.
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-md font-mono text-[10px] font-bold">
            CACHE LOCAL ({logs.length} LOGS)
          </span>
        </div>
      )}

      {/* Header Institucional de Auditoria */}
      <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-800/70 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 mb-2 border border-emerald-600/50">
            <Lock className="w-3.5 h-3.5" />
            <span>Trilha de Auditoria Interna & Compliance</span>
            <span className="text-[10px] bg-emerald-900/90 text-emerald-200 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 border border-emerald-600/40">
              <Database className="w-2.5 h-2.5" /> Persistência Firestore
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <span>Logs de Auditoria</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Registro cronológico imutável de todas as alterações de status dos notebooks, histórico de empréstimos e devoluções para fins de auditoria interna e rastreabilidade institucional.
          </p>
        </div>

        {/* Botões de Exportação (Excel & CSV) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || filteredLogs.length === 0 || !isAdmin}
            className={`px-4 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center space-x-2 shadow-lg transition transform cursor-pointer ${
              isAdmin
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 shadow-emerald-500/25 hover:scale-[1.02]'
                : 'bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isAdmin ? 'Exportar trilha de auditoria para planilha Excel (.xlsx)' : 'Ação restrita ao Administrador Geral (ADM)'}
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
            <span>{exportingExcel ? 'Exportando...' : 'Exportar Excel (.xlsx)'}</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-200 font-bold px-1.5 py-0.2 rounded-md">
              ADM
            </span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exportingCsv || filteredLogs.length === 0 || !isAdmin}
            className={`px-3.5 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-md transition transform cursor-pointer border ${
              isAdmin
                ? 'bg-emerald-900/80 hover:bg-emerald-800/80 text-emerald-200 border-emerald-700/60 hover:text-white'
                : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60 cursor-not-allowed'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isAdmin ? 'Exportar trilha de auditoria para arquivo CSV (UTF-8 com BOM)' : 'Ação restrita ao Administrador Geral (ADM)'}
          >
            <FileDown className="w-4 h-4" />
            <span>{exportingCsv ? 'Exportando...' : 'CSV'}</span>
          </button>
        </div>
      </div>

      {/* Cartões de Indicadores Chave de Auditoria (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total de Eventos
            </span>
            <span className="text-2xl font-black font-mono text-slate-900">
              {totalCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Eventos registrados
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Status de Notebooks
            </span>
            <span className="text-2xl font-black font-mono text-emerald-950">
              {notebookStatusCount}
            </span>
            <span className="text-[10px] text-emerald-600/80 block mt-0.5">
              Transições de frota
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Laptop className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
              Empréstimos & Devoluções
            </span>
            <span className="text-2xl font-black font-mono text-blue-950">
              {loanHistoryCount}
            </span>
            <span className="text-[10px] text-blue-600/80 block mt-0.5">
              Histórico acadêmico
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
              Técnicos Ativos
            </span>
            <span className="text-2xl font-black font-mono text-purple-950">
              {uniqueTecnicos.length}
            </span>
            <span className="text-[10px] text-purple-600/80 block mt-0.5">
              Responsáveis na trilha
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Seletores Rápidos de Escopo (Pílulas Superiores) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setScopeFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
            scopeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Todos os Registros</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setScopeFilter('NOTEBOOK_STATUS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
            scopeFilter === 'NOTEBOOK_STATUS'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Alterações de Status dos Notebooks</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {notebookStatusCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setScopeFilter('EMPRESTIMOS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
            scopeFilter === 'EMPRESTIMOS'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Histórico de Empréstimos & Devoluções</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {loanHistoryCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setScopeFilter('MANUTENCAO')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
            scopeFilter === 'MANUTENCAO'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Manutenções & Reparos</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {maintenanceCount}
          </span>
        </button>
      </div>

      {/* Painel de Filtros Avançados: Data, Técnico e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-800">
              Filtros para Auditoria Interna
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Exibindo <strong>{filteredLogs.length}</strong> de {logs.length} eventos auditados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Busca textual */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Termo de Busca
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hostname, Protocolo, RA, Aluno..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* 2. Filtro por Técnico Responsável */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Técnico Responsável
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={selectedTecnico}
                onChange={(e) => setSelectedTecnico(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 font-medium"
              >
                <option value="ALL">Todos os Técnicos ({uniqueTecnicos.length})</option>
                {uniqueTecnicos.map((tec) => (
                  <option key={tec} value={tec}>
                    {tec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Filtro por Tipo de Ação Específica */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Tipo de Operação
            </label>
            <select
              value={selectedAcao}
              onChange={(e) => setSelectedAcao(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 font-medium"
            >
              <option value="ALL">Todas as Operações</option>
              <option value="CRIACAO_EMPRESTIMO">Criação de Empréstimo</option>
              <option value="DEVOLUCAO_EMPRESTIMO">Devolução de Empréstimo</option>
              <option value="ALTERACAO_STATUS_NOTEBOOK">Alteração de Status</option>
              <option value="CADASTRO_NOTEBOOK">Cadastro de Notebook</option>
              <option value="ENVIO_MANUTENCAO">Envio para Manutenção</option>
              <option value="RETORNO_MANUTENCAO">Retorno para Guarda</option>
              <option value="BACKUP_ADMINISTRATIVO">Backup Storage</option>
            </select>
          </div>

          {/* 4. Filtro por Intervalo de Data */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Intervalo de Datas
            </label>
            <div className="flex items-center space-x-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-200 font-mono"
                title="Data inicial da auditoria"
              />
              <span className="text-slate-400 text-xs">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-200 font-mono"
                title="Data final da auditoria"
              />
            </div>
          </div>
        </div>

        {/* Atalhos Rápidos de Data e Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500 text-[11px]">Período Rápido:</span>
            <button
              type="button"
              onClick={() => applyDateShortcut('today')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px] transition cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => applyDateShortcut('7days')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px] transition cursor-pointer"
            >
              Últimos 7 dias
            </button>
            <button
              type="button"
              onClick={() => applyDateShortcut('30days')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px] transition cursor-pointer"
            >
              Últimos 30 dias
            </button>
            <button
              type="button"
              onClick={() => applyDateShortcut('thisMonth')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px] transition cursor-pointer"
            >
              Mês Atual
            </button>
          </div>

          {(startDate ||
            endDate ||
            selectedTecnico !== 'ALL' ||
            selectedAcao !== 'ALL' ||
            scopeFilter !== 'ALL' ||
            searchTerm) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition cursor-pointer border border-rose-200"
            >
              Limpar Todos os Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela / Linha do Tempo dos Logs de Auditoria */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Linha do Tempo de Ações Registradas ({filteredLogs.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Registros imutáveis protegidos contra edição e exclusão
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">Nenhum registro de auditoria encontrado</h4>
            <p className="text-xs text-slate-400 mt-1">
              Tente redefinir os filtros de data, técnico responsável ou termo de busca.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-3 px-4 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Restaurar Todos os Logs
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const dateFormatted = new Date(log.timestamp).toLocaleString('pt-BR');

              return (
                <div
                  key={log.id}
                  className={`p-4 transition hover:bg-slate-50/70 ${
                    isExpanded ? 'bg-slate-50/90' : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Coluna 1: Ação, Data, Equipamento e Transição de Status */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(log.acao)}
                        <span className="text-xs font-mono font-medium text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {dateFormatted}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                          <Laptop className="w-3 h-3 text-emerald-700" />
                          {log.hostname}
                        </span>

                        {log.protocolo && (
                          <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Prot: {log.protocolo}
                          </span>
                        )}

                        {/* Transição de Status (Antes ➔ Depois) */}
                        {log.statusAnterior && log.statusNovo && (
                          <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Status:</span>
                            {getStatusBadge(log.statusAnterior)}
                            <ArrowRight className="w-3 h-3 text-emerald-600 inline shrink-0" />
                            {getStatusBadge(log.statusNovo)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coluna 2: Técnico Responsável e Aluno */}
                    <div className="flex flex-col md:items-end text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-slate-400 font-medium">Técnico:</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTecnico(log.tecnicoResponsavel.trim())}
                          className="text-slate-900 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 px-2 py-0.5 rounded font-mono text-[11px] font-bold transition cursor-pointer border border-slate-200"
                          title={`Filtrar apenas logs de ${log.tecnicoResponsavel}`}
                        >
                          {log.tecnicoResponsavel}
                        </button>
                      </div>

                      {log.alunoNome && (
                        <div className="text-[11px] text-slate-500">
                          Aluno: <strong className="text-slate-800">{log.alunoNome}</strong>
                          {log.alunoRa && (
                            <span className="font-mono text-slate-600 ml-1">
                              (RA: {log.alunoRa})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Coluna 3: Botão de Expansão */}
                    <div className="shrink-0 flex items-center">
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                        title="Ver justificativa e detalhes completos do registro"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Detalhe expandido */}
                  {isExpanded && (
                    <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2.5 animate-in fade-in">
                      <div>
                        <span className="font-bold text-slate-600 block mb-1">
                          Justificativa / Descrição Técnica:
                        </span>
                        <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed">
                          {log.detalhes}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono text-[10px] text-slate-500 border-t border-slate-100">
                        <div>
                          <span className="block font-bold text-slate-400 uppercase">ID do Registro:</span>
                          <span className="block text-slate-800 truncate select-all">{log.id}</span>
                        </div>
                        <div>
                          <span className="block font-bold text-slate-400 uppercase">Categoria:</span>
                          <span className="block text-slate-800">{log.categoria}</span>
                        </div>
                        <div>
                          <span className="block font-bold text-slate-400 uppercase">Equipamento:</span>
                          <span className="block text-slate-800 font-bold">{log.hostname}</span>
                        </div>
                        <div>
                          <span className="block font-bold text-slate-400 uppercase">Timestamp ISO:</span>
                          <span className="block text-slate-800 truncate">{log.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
