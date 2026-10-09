import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  AlertTriangle,
  Laptop,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  Building,
  FileSpreadsheet,
  Printer,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Filter,
  Cloud,
  HardDrive,
  ChevronDown,
  FileText,
  Check,
} from 'lucide-react';
import { Emprestimo, Notebook, EmailNotification } from '../types';
import {
  exportLoansAndInventoryToExcel,
  exportLoansToCSV,
  exportUsageMetricsToCSV,
} from '../services/excelService';
import { MonthlyReportPdfModal } from './MonthlyReportPdfModal';
import { EmailNotificationsModal } from './EmailNotificationsModal';
import { AdminBackupModal } from './AdminBackupModal';
import { useAuth } from '../context/AuthContext';

interface DashboardTabProps {
  loans: Emprestimo[];
  notebooks: Notebook[];
  notifications?: EmailNotification[];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  loans,
  notebooks,
  notifications = [],
}) => {
  const { role } = useAuth();
  const isAdmin = role === 'ADM';

  const [exporting, setExporting] = useState(false);
  const [showPdfReportModal, setShowPdfReportModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Métricas principais
  const totalNotebooks = notebooks.length;
  const guardados = notebooks.filter((n) => n.status === 'GUARDADO').length;
  const emprestados = notebooks.filter((n) => n.status === 'EMPRESTADO').length;
  const manutencao = notebooks.filter((n) => n.status === 'MANUTENCAO').length;

  const totalLoans = loans.length;
  const openLoans = loans.filter((l) => l.status === 'ABERTO').length;
  const delayedLoans = loans.filter((l) => l.status === 'ATRASADO').length;
  const returnedLoans = loans.filter((l) => l.status === 'DEVOLVIDO').length;

  const taxaOcupacao = totalNotebooks > 0 ? ((emprestados / totalNotebooks) * 100).toFixed(1) : '0';

  // 2. Gráfico por Curso
  const loansByCourse = useMemo(() => {
    const counts: Record<string, number> = {};
    loans.forEach((l) => {
      const c = l.curso || 'Outros';
      counts[c] = (counts[c] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxVal = entries.length > 0 ? entries[0][1] : 1;

    return entries.map(([course, count]) => ({
      course,
      count,
      percentage: totalLoans > 0 ? ((count / totalLoans) * 100).toFixed(1) : '0',
      barWidth: `${Math.round((count / maxVal) * 100)}%`,
    }));
  }, [loans, totalLoans]);

  // 3. Gráfico por Data (Agrupado por dia recente)
  const loansByDate = useMemo(() => {
    const datesMap: Record<string, { total: number; abertos: number; devolvidos: number }> = {};

    loans.forEach((l) => {
      const rawDate = l.dataSaida || l.createdAt;
      if (!rawDate) return;
      const dayStr = new Date(rawDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });

      if (!datesMap[dayStr]) {
        datesMap[dayStr] = { total: 0, abertos: 0, devolvidos: 0 };
      }
      datesMap[dayStr].total += 1;
      if (l.status === 'ABERTO' || l.status === 'ATRASADO') {
        datesMap[dayStr].abertos += 1;
      } else if (l.status === 'DEVOLVIDO') {
        datesMap[dayStr].devolvidos += 1;
      }
    });

    const entries = Object.entries(datesMap).slice(0, 10);
    const maxCount = Math.max(...entries.map(([, data]) => data.total), 1);

    return entries.map(([day, data]) => ({
      day,
      ...data,
      heightPct: `${Math.max(15, Math.round((data.total / maxCount) * 100))}%`,
    }));
  }, [loans]);

  // 4. Distribuição por Marca
  const brandsDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    notebooks.forEach((n) => {
      counts[n.marca] = (counts[n.marca] || 0) + 1;
    });
    return Object.entries(counts).map(([marca, count]) => ({
      marca,
      count,
      pct: totalNotebooks > 0 ? ((count / totalNotebooks) * 100).toFixed(1) : '0',
    }));
  }, [notebooks, totalNotebooks]);

  // Exportar Excel Completo (.xlsx) (Restrito ao perfil ADM)
  const handleExportExcel = () => {
    if (!isAdmin) {
      alert('Acesso negado: Somente o Administrador Geral (ADM) possui permissão para exportar relatórios.');
      return;
    }
    setExporting(true);
    setShowExportDropdown(false);
    try {
      exportLoansAndInventoryToExcel(loans, notebooks);
      setExportNotice('Planilha Excel (.xlsx) gerada com sucesso com abas de Empréstimos, Inventário e Indicadores!');
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      alert('Falha ao gerar arquivo Excel.');
    } finally {
      setTimeout(() => setExporting(false), 600);
    }
  };

  // Exportar Histórico de Empréstimos para CSV (.csv)
  const handleExportLoansCSV = () => {
    if (!isAdmin) {
      alert('Acesso negado: Somente o Administrador Geral (ADM) possui permissão para exportar relatórios.');
      return;
    }
    setExporting(true);
    setShowExportDropdown(false);
    try {
      exportLoansToCSV(loans);
      setExportNotice('Histórico completo de empréstimos exportado para CSV com sucesso!');
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err) {
      console.error('Erro ao exportar CSV de empréstimos:', err);
      alert('Falha ao gerar arquivo CSV.');
    } finally {
      setTimeout(() => setExporting(false), 600);
    }
  };

  // Exportar Métricas e Indicadores de Uso para CSV (.csv)
  const handleExportMetricsCSV = () => {
    if (!isAdmin) {
      alert('Acesso negado: Somente o Administrador Geral (ADM) possui permissão para exportar relatórios.');
      return;
    }
    setExporting(true);
    setShowExportDropdown(false);
    try {
      exportUsageMetricsToCSV(loans, notebooks);
      setExportNotice('Métricas de uso institucional exportadas para CSV com sucesso!');
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err) {
      console.error('Erro ao exportar CSV de métricas:', err);
      alert('Falha ao gerar arquivo CSV.');
    } finally {
      setTimeout(() => setExporting(false), 600);
    }
  };

  const handleOpenPdfReport = () => {
    if (!isAdmin) {
      alert('Acesso negado: Somente o Administrador Geral (ADM) possui permissão para gerar relatórios resumidos em PDF.');
      return;
    }
    setShowPdfReportModal(true);
  };

  // Histórico filtrado
  const filteredHistory = loans.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      l.protocolo.toLowerCase().includes(term) ||
      l.nome.toLowerCase().includes(term) ||
      l.ra.toLowerCase().includes(term) ||
      l.hostname.toLowerCase().includes(term) ||
      l.curso.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header com Botão de Exportação Excel */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-800/60 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 mb-2 border border-emerald-700/50">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Indicadores em Tempo Real & BI</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Painel Executivo de Empréstimos
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Monitoramento de patrimônio institucional, taxa de ocupação de notebooks e fluxo de empréstimos por curso da Faculdade Sírio-Libanês.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-4 py-3.5 rounded-2xl bg-emerald-800/80 hover:bg-emerald-700/80 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 border border-emerald-600/60 transition cursor-pointer shadow-sm relative"
            title="Gerenciar alertas automáticos por e-mail via Cloud Functions"
          >
            <Clock className="w-4 h-4 text-emerald-300" />
            <span>Alertas por E-mail</span>
            {notifications.length > 0 && (
              <span className="bg-emerald-400 text-emerald-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Botão de Automação de Backup Firebase Functions & Storage */}
          <button
            onClick={() => setShowBackupModal(true)}
            className={`px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 border transition cursor-pointer ${
              isAdmin
                ? 'bg-emerald-700/80 hover:bg-emerald-600 text-white border-emerald-500/50 shadow-md shadow-emerald-950/20'
                : 'bg-white/5 text-slate-400 border-white/10 opacity-70 cursor-not-allowed'
            }`}
            title={isAdmin ? "Automação de Backup Firebase Functions & Firebase Storage" : "Exclusivo para perfil ADM"}
          >
            <Cloud className="w-4 h-4 text-emerald-300" />
            <span>Backup Storage</span>
            <span className="text-[10px] bg-emerald-400 text-emerald-950 font-black px-1.5 py-0.2 rounded-full">
              ADM
            </span>
          </button>

          <button
            onClick={handleOpenPdfReport}
            className={`px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 border transition cursor-pointer ${
              isAdmin
                ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                : 'bg-white/5 text-slate-400 border-white/10 opacity-70 cursor-not-allowed'
            }`}
            title={isAdmin ? "Gera relatório mensal formatado para impressão em A4 e salvamento em PDF" : "Exclusivo para perfil ADM"}
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>Relatório Mensal PDF</span>
            <span className="text-[10px] bg-emerald-400 text-emerald-950 font-black px-1.5 py-0.2 rounded-full">
              ADM
            </span>
          </button>

          {/* Menu de Exportação de Dados (Excel e CSV) */}
          <div className="relative">
            <button
              onClick={() => {
                if (!isAdmin) {
                  alert('Acesso negado: Somente o Administrador Geral (ADM) possui permissão para exportar relatórios.');
                  return;
                }
                setShowExportDropdown(!showExportDropdown);
              }}
              disabled={exporting || !isAdmin}
              className={`px-5 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center space-x-2.5 shadow-lg transition-all transform cursor-pointer ${
                isAdmin
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 shadow-emerald-500/25 hover:scale-[1.02]'
                  : 'bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed'
              }`}
              title={isAdmin ? "Exportar dados para Excel (.xlsx) ou CSV (.csv)" : "Exclusivo para perfil ADM"}
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-950 stroke-[2.5]" />
              <span>{exporting ? 'Exportando...' : 'Exportar Dados (Excel / CSV)'}</span>
              <ChevronDown className={`w-4 h-4 text-emerald-950 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
              <span className="text-[10px] bg-emerald-950 text-emerald-200 font-bold px-1.5 py-0.2 rounded-md">
                ADM
              </span>
            </button>

            {/* Dropdown com opções de exportação */}
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 space-y-1.5 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Formatos de Exportação Institucional
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Selecione o arquivo desejado para download imediato
                  </div>
                </div>

                {/* Opção 1: Excel Completo */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 transition flex items-start space-x-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 flex items-center gap-1.5">
                      <span>Planilha Excel (.xlsx)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1 rounded">Consolidado</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Inclui 3 abas: Histórico de Empréstimos, Inventário de Notebooks e Indicadores Gerais.
                    </div>
                  </div>
                </button>

                {/* Opção 2: CSV Histórico */}
                <button
                  type="button"
                  onClick={handleExportLoansCSV}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-teal-50 transition flex items-start space-x-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-teal-600 group-hover:text-white transition">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-teal-900 flex items-center gap-1.5">
                      <span>Histórico de Empréstimos (.csv)</span>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-mono px-1 rounded">CSV</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Base completa com todos os empréstimos (protocolos, alunos, RA, cursos, datas e técnicos).
                    </div>
                  </div>
                </button>

                {/* Opção 3: CSV Métricas de Uso */}
                <button
                  type="button"
                  onClick={handleExportMetricsCSV}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 transition flex items-start space-x-3 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 flex items-center gap-1.5">
                      <span>Métricas de Uso & Ocupação (.csv)</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono px-1 rounded">BI</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Taxa de ocupação da frota, status de patrimônio e participação de demanda por curso.
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner de Feedback de Exportação */}
      {exportNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-950 text-xs sm:text-sm shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{exportNotice}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Banner Informativo de Notificações Automáticas */}
      {delayedLoans > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <strong className="text-rose-900 block font-bold text-sm">
                Atenção: {delayedLoans} empréstimo(s) com devolução em atraso!
              </strong>
              <span className="text-rose-700">
                O serviço Firebase Cloud Functions monitora os prazos e notifica automaticamente o aluno e a equipe de TI.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            Visualizar Alertas Disparados
          </button>
        </div>
      )}

      {/* Cards de Contadores Principais (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Notebooks */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total da Frota</span>
            <Laptop className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalNotebooks}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">cadastrados na TI</span>
          </div>
        </div>

        {/* Disponíveis */}
        <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <span>Disponíveis</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950">{guardados}</span>
            <span className="text-[11px] text-emerald-700 block mt-0.5 font-medium">status GUARDADO</span>
          </div>
        </div>

        {/* Emprestados */}
        <div className="bg-blue-50/70 p-4 sm:p-5 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800 text-xs font-bold uppercase tracking-wider">
            <span>Emprestados</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-blue-950">{emprestados}</span>
            <span className="text-[11px] text-blue-700 block mt-0.5 font-medium">em mãos de alunos</span>
          </div>
        </div>

        {/* Atrasados */}
        <div className="bg-rose-50/70 p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold uppercase tracking-wider">
            <span>Atrasados</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-rose-950">{delayedLoans}</span>
            <span className="text-[11px] text-rose-700 block mt-0.5 font-medium">prazo vencido</span>
          </div>
        </div>

        {/* Manutenção */}
        <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider">
            <span>Manutenção</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-950">{manutencao}</span>
            <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">reparo em lab</span>
          </div>
        </div>

        {/* Ocupação */}
        <div className="bg-indigo-50/70 p-4 sm:p-5 rounded-2xl border border-indigo-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-bold uppercase tracking-wider">
            <span>Taxa Ocupação</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-indigo-950">{taxaOcupacao}%</span>
            <span className="text-[11px] text-indigo-700 block mt-0.5 font-medium">da frota ativa</span>
          </div>
        </div>
      </div>

      {/* Seção de Gráficos e Distribuições */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Empréstimos por Curso */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">
                Distribuição de Empréstimos por Curso
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total: {totalLoans} solicitações
            </span>
          </div>

          {loansByCourse.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum dado registrado para gerar estatísticas de cursos.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {loansByCourse.map((item) => (
                <div key={item.course} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 truncate max-w-[240px]">
                      {item.course}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      <strong>{item.count}</strong> ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: item.barWidth }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico 2: Linha Temporal / Empréstimos por Data */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-800">
                Fluxo de Empréstimos por Período / Data
              </h3>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Abertos
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded bg-slate-300 inline-block" /> Devolvidos
              </span>
            </div>
          </div>

          {loansByDate.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum registro por data disponível no momento.
            </div>
          ) : (
            <div className="pt-2">
              <div className="flex items-end justify-between gap-2 h-48 px-2 border-b border-slate-200 pb-2">
                {loansByDate.map((item) => (
                  <div
                    key={item.day}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none transition shadow whitespace-nowrap z-10">
                      Total: {item.total} (Abertos: {item.abertos}, Devolvidos: {item.devolvidos})
                    </div>

                    <div
                      className="w-full max-w-[32px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all hover:opacity-90 shadow-sm"
                      style={{ height: item.heightPct }}
                    >
                      <div
                        className="bg-emerald-500 w-full"
                        style={{
                          height: item.total > 0 ? `${(item.abertos / item.total) * 100}%` : '0%',
                        }}
                      />
                      <div
                        className="bg-slate-300 w-full"
                        style={{
                          height:
                            item.total > 0 ? `${(item.devolvidos / item.total) * 100}%` : '0%',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 mt-2 rotate-[-25deg] origin-top-left">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribuição por Fabricante */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Parque Tecnológico por Marca:</span>
            <div className="flex items-center space-x-3">
              {brandsDistribution.map((b) => (
                <span key={b.marca} className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                  <strong>{b.marca}:</strong> {b.count} ({b.pct}%)
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico Recente e Auditoria */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Histórico Consolidado de Empréstimos
            </h3>
            <p className="text-xs text-slate-500">
              Registro auditável de saídas e devoluções com dados do aluno e técnico responsável.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar histórico..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        {/* Tabela de histórico */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Protocolo</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Equipamento</th>
                <th className="py-2.5 px-3">Aluno / RA</th>
                <th className="py-2.5 px-3">Curso</th>
                <th className="py-2.5 px-3">Retirada</th>
                <th className="py-2.5 px-3">Previsão</th>
                <th className="py-2.5 px-3">Devolução</th>
                <th className="py-2.5 px-3">Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhum empréstimo cadastrado.
                  </td>
                </tr>
              ) : (
                filteredHistory.slice(0, 15).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {l.protocolo}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'ATRASADO'
                            ? 'bg-rose-100 text-rose-800'
                            : l.status === 'DEVOLVIDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-900">
                      {l.hostname}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{l.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">RA: {l.ra}</div>
                    </td>
                    <td className="py-2.5 px-3">{l.curso}</td>
                    <td className="py-2.5 px-3">{new Date(l.dataSaida).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2.5 px-3">
                      {new Date(l.dataPrevistaDevolucao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3">
                      {l.dataDevolucao ? new Date(l.dataDevolucao).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      {l.tecnicoDevolucao || l.tecnicoSaida}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Impressão do Relatório Mensal em PDF */}
      {showPdfReportModal && (
        <MonthlyReportPdfModal
          loans={loans}
          notebooks={notebooks}
          onClose={() => setShowPdfReportModal(false)}
        />
      )}

      {/* Modal de Alertas e Notificações por E-mail (Cloud Functions) */}
      {showEmailModal && (
        <EmailNotificationsModal
          notifications={notifications}
          loans={loans}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* Modal de Automação de Backup Firebase Functions & Storage */}
      {showBackupModal && (
        <AdminBackupModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          notebooks={notebooks}
          loans={loans}
        />
      )}
    </div>
  );
};
