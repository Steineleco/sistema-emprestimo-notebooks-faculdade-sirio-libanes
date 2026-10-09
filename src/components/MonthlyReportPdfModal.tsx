import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  Calendar,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Laptop,
  Users,
  Download,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Emprestimo, Notebook } from '../types';
import { useAuth } from '../context/AuthContext';

interface MonthlyReportPdfModalProps {
  loans: Emprestimo[];
  notebooks: Notebook[];
  onClose: () => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MonthlyReportPdfModal: React.FC<MonthlyReportPdfModalProps> = ({
  loans,
  notebooks,
  onClose,
}) => {
  const { profile } = useAuth();

  // Mês e Ano padrão (ano e mês atuais: ex 2026-10)
  const today = new Date();
  const defaultYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(defaultYearMonth);

  const [selectedYear, selectedMonthNum] = useMemo(() => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    return [y || today.getFullYear(), m || today.getMonth() + 1];
  }, [selectedYearMonth]);

  const monthLabel = `${MONTH_NAMES[selectedMonthNum - 1]} de ${selectedYear}`;

  // Filtragem e cálculo dos dados do mês selecionado
  const monthData = useMemo(() => {
    // Empréstimos que saíram no mês
    const checkoutsInMonth = loans.filter((l) => {
      const d = l.dataSaida ? new Date(l.dataSaida) : null;
      if (!d) return false;
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonthNum;
    });

    // Devoluções ocorridas no mês
    const returnsInMonth = loans.filter((l) => {
      if (!l.dataDevolucao) return false;
      const d = new Date(l.dataDevolucao);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonthNum;
    });

    // Todas as movimentações (saídas ou devoluções no mês)
    const movementsInMonthMap = new Map<string, Emprestimo>();
    checkoutsInMonth.forEach((l) => movementsInMonthMap.set(l.id, l));
    returnsInMonth.forEach((l) => movementsInMonthMap.set(l.id, l));
    const allMovements = Array.from(movementsInMonthMap.values());

    // Métricas
    const totalSaidas = checkoutsInMonth.length;
    const totalDevolucoes = returnsInMonth.length;
    const totalMovimentacoes = totalSaidas + totalDevolucoes;

    const abertosNoPeriodo = checkoutsInMonth.filter((l) => l.status === 'ABERTO').length;
    const atrasadosNoPeriodo = checkoutsInMonth.filter((l) => l.status === 'ATRASADO').length;
    const devolvidosNoPeriodo = checkoutsInMonth.filter((l) => l.status === 'DEVOLVIDO').length;

    const taxaPontualidade =
      totalDevolucoes > 0
        ? `${Math.round(((totalDevolucoes - atrasadosNoPeriodo) / totalDevolucoes) * 100)}%`
        : '100%';

    // Distribuição por curso no mês
    const courseCounts: Record<string, number> = {};
    checkoutsInMonth.forEach((l) => {
      const c = l.curso || 'Não informado';
      courseCounts[c] = (courseCounts[c] || 0) + 1;
    });

    const coursesArray = Object.entries(courseCounts)
      .map(([curso, qtd]) => ({
        curso,
        qtd,
        pct: totalSaidas > 0 ? `${Math.round((qtd / totalSaidas) * 100)}%` : '0%',
      }))
      .sort((a, b) => b.qtd - a.qtd);

    return {
      allMovements,
      totalSaidas,
      totalDevolucoes,
      totalMovimentacoes,
      abertosNoPeriodo,
      atrasadosNoPeriodo,
      devolvidosNoPeriodo,
      taxaPontualidade,
      coursesArray,
    };
  }, [loans, selectedYear, selectedMonthNum]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/85 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 animate-in fade-in">
      {/* Contêiner principal */}
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col my-auto border border-slate-200 overflow-hidden">
        {/* Barra Superior de Controles (Escondida na impressão) */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Relatório Mensal de Empréstimos para Impressão (PDF)
              </h3>
              <p className="text-xs text-slate-300">
                Selecione o mês desejado e clique em imprimir para salvar em PDF (A4).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Seletor de Mês e Ano */}
            <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">Mês:</span>
              <input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              />
            </div>

            {/* Botão de Impressão */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            ÁREA DO RELATÓRIO OFICIAL (Formatada para tela e para impressão A4 / PDF)
            ========================================================================= */}
        <div id="printable-monthly-report" className="print-area p-8 sm:p-12 text-slate-900 bg-white space-y-6">
          {/* Cabeçalho Institucional Oficial */}
          <div className="border-b-2 border-emerald-900 pb-5 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase tracking-widest font-black text-emerald-800">
                  Faculdade Sírio-Libanês de Ensino e Pesquisa
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                RELATÓRIO MENSAL DE MOVIMENTAÇÕES DE NOTEBOOKS
              </h1>
              <p className="text-xs text-slate-600">
                Diretoria de Tecnologia da Informação • Gerência de Infraestrutura e Atendimento Acadêmico
              </p>
            </div>

            <div className="text-right text-[11px] text-slate-500 font-mono space-y-0.5">
              <div>
                <strong>Mês de Competência:</strong>{' '}
                <span className="text-emerald-900 font-bold uppercase">{monthLabel}</span>
              </div>
              <div>
                <strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div>
                <strong>Emissor:</strong> {profile.displayName || 'Setor de TI'}
              </div>
              <div>
                <strong>Documento:</strong> REL-TI-{selectedYearMonth.replace('-', '')}-FSL
              </div>
            </div>
          </div>

          {/* Quadro de Resumo de Indicadores Mensais */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
              <span>1. Resumo Executivo das Movimentações do Mês</span>
            </h2>

            <div className="grid grid-cols-4 gap-3 text-center">
              {/* Total Movimentações */}
              <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Total de Movimentações
                </span>
                <span className="text-2xl font-black text-emerald-950 mt-1 block">
                  {monthData.totalMovimentacoes}
                </span>
                <span className="text-[9px] text-emerald-700">saídas + devoluções</span>
              </div>

              {/* Saídas */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">
                  Empréstimos Concedidos
                </span>
                <span className="text-2xl font-black text-blue-950 mt-1 block">
                  {monthData.totalSaidas}
                </span>
                <span className="text-[9px] text-blue-700">novas retiradas</span>
              </div>

              {/* Devoluções */}
              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40">
                <span className="text-[10px] uppercase font-bold text-teal-800 block">
                  Devoluções Recebidas
                </span>
                <span className="text-2xl font-black text-teal-950 mt-1 block">
                  {monthData.totalDevolucoes}
                </span>
                <span className="text-[9px] text-teal-700">com checklist técnico</span>
              </div>

              {/* Atrasados / Pontualidade */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Atrasos no Mês
                </span>
                <span className="text-2xl font-black text-amber-950 mt-1 block">
                  {monthData.atrasadosNoPeriodo}
                </span>
                <span className="text-[9px] text-amber-700">
                  Pontualidade: {monthData.taxaPontualidade}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 2: Distribuição das Movimentações por Curso */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
              <span>2. Demanda por Curso de Graduação e Pós-Graduação</span>
              <span className="text-[10px] font-normal text-slate-500">
                Base: {monthData.totalSaidas} saídas registradas em {monthLabel}
              </span>
            </h2>

            {monthData.coursesArray.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                Nenhum empréstimo registrado neste mês de competência.
              </div>
            ) : (
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Curso / Programa</th>
                    <th className="py-2 px-3 text-center">Quantidade de Notebooks</th>
                    <th className="py-2 px-3 text-center">Participação Relativa (%)</th>
                    <th className="py-2 px-3">Representação Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthData.coursesArray.map((c) => (
                    <tr key={c.curso}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{c.curso}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                        {c.qtd}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-600">
                        {c.pct}
                      </td>
                      <td className="py-2 px-3">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: c.pct }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Seção 3: Relação Nominal de Movimentações */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
              <span>3. Livro Registro das Movimentações do Período ({monthData.allMovements.length})</span>
              <span className="text-[10px] font-mono text-slate-500">Ordem cronológica</span>
            </h2>

            {monthData.allMovements.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                Sem lançamentos no período de {monthLabel}.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px] text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[9px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Protocolo</th>
                      <th className="py-2 px-2.5">Equipamento</th>
                      <th className="py-2 px-2.5">Aluno / RA</th>
                      <th className="py-2 px-2.5">Curso</th>
                      <th className="py-2 px-2.5">Data Saída</th>
                      <th className="py-2 px-2.5">Data Devolução</th>
                      <th className="py-2 px-2.5">Status</th>
                      <th className="py-2 px-2.5">Técnico Resp.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {monthData.allMovements.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900">
                          {l.protocolo}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-emerald-800">
                          {l.hostname}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className="font-semibold text-slate-900">{l.nome}</span>
                          <span className="block text-[9px] text-slate-400 font-mono">
                            RA: {l.ra}
                          </span>
                        </td>
                        <td className="py-2 px-2.5">{l.curso}</td>
                        <td className="py-2 px-2.5 font-mono text-[10px]">
                          {l.dataSaida ? new Date(l.dataSaida).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-[10px]">
                          {l.dataDevolucao
                            ? new Date(l.dataDevolucao).toLocaleDateString('pt-BR')
                            : 'Pendente'}
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              l.status === 'DEVOLVIDO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : l.status === 'ATRASADO'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-[10px] text-slate-500">
                          {l.tecnicoDevolucao || l.tecnicoSaida}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seção 4: Bloco de Assinaturas e Termo de Conformidade */}
          <div className="pt-8 border-t border-slate-200 mt-8 space-y-8">
            <p className="text-[10px] text-slate-500 text-center italic">
              Certifico que as informações acima refletem fidedignamente os registros de movimentação
              de patrimônio acadêmico mantidos pelo Setor de Tecnologia da Informação da Faculdade Sírio-Libanês.
            </p>

            <div className="grid grid-cols-2 gap-12 pt-4">
              <div className="text-center space-y-1">
                <div className="border-t border-slate-400 w-4/5 mx-auto pt-2" />
                <span className="font-bold text-xs text-slate-900 block">
                  {profile.displayName || 'Técnico Especialista em TI'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Responsável pela Emissão • Central de TI Acadêmica
                </span>
              </div>

              <div className="text-center space-y-1">
                <div className="border-t border-slate-400 w-4/5 mx-auto pt-2" />
                <span className="font-bold text-xs text-slate-900 block">
                  Coordenação de Infraestrutura e Tecnologia
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Faculdade Sírio-Libanês de Ensino e Pesquisa
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
