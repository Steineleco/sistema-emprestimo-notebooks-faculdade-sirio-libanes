import * as XLSX from 'xlsx';
import { Emprestimo, Notebook } from '../types';

export function exportLoansAndInventoryToExcel(
  loans: Emprestimo[],
  notebooks: Notebook[],
  fileName = 'Relatorio_Emprestimos_Faculdade_Sirio_Libanes.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // 1. Tabela de Empréstimos
  const loansData = loans.map((l) => ({
    'Protocolo': l.protocolo,
    'Status': l.status,
    'Nome Aluno': l.nome,
    'RA': l.ra,
    'Curso': l.curso,
    'Semestre': l.semestre,
    'E-mail Institucional': l.email,
    'WhatsApp': l.whatsapp,
    'Notebook (Hostname)': l.hostname,
    'Data de Saída': l.dataSaida ? new Date(l.dataSaida).toLocaleString('pt-BR') : '-',
    'Previsão de Devolução': l.dataPrevistaDevolucao ? new Date(l.dataPrevistaDevolucao).toLocaleString('pt-BR') : '-',
    'Data de Devolução': l.dataDevolucao ? new Date(l.dataDevolucao).toLocaleString('pt-BR') : 'Pendente',
    'Técnico Liberação': l.tecnicoSaida,
    'Técnico Devolução': l.tecnicoDevolucao || '-',
    'Checklist / Observações': l.checklistDevolucao ? (l.checklistDevolucao.houveDano ? 'AVARIA REGISTRADA' : 'EQUIPAMENTO ÍNTEGRO') : l.observacoes || '-',
  }));

  const wsLoans = XLSX.utils.json_to_sheet(loansData);
  // Auto-width for columns
  wsLoans['!cols'] = [
    { wch: 20 }, // Protocolo
    { wch: 12 }, // Status
    { wch: 28 }, // Nome
    { wch: 14 }, // RA
    { wch: 22 }, // Curso
    { wch: 12 }, // Semestre
    { wch: 32 }, // Email
    { wch: 18 }, // WhatsApp
    { wch: 16 }, // Hostname
    { wch: 20 }, // Saida
    { wch: 20 }, // Prev Devolucao
    { wch: 20 }, // Devolucao
    { wch: 22 }, // Tecnico Saida
    { wch: 22 }, // Tecnico Devolucao
    { wch: 30 }, // Obs
  ];
  XLSX.utils.book_append_sheet(wb, wsLoans, 'Empréstimos');

  // 2. Tabela de Inventário
  const inventoryData = notebooks.map((n) => ({
    'Hostname': n.hostname,
    'Marca': n.marca,
    'Modelo': n.modelo,
    'Status Atual': n.status,
    'Validado TI': n.validado ? 'SIM' : 'NÃO',
    'Número de Série': n.numeroSerie || '-',
    'Localização / Observações': n.observacoes || '-',
    'Última Atualização': n.updatedAt ? new Date(n.updatedAt).toLocaleString('pt-BR') : '-',
  }));

  const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
  wsInventory['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 26 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 32 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventário Notebooks');

  // 3. Indicadores Gerais
  const totalEquipamentos = notebooks.length;
  const guardados = notebooks.filter((n) => n.status === 'GUARDADO').length;
  const emprestados = notebooks.filter((n) => n.status === 'EMPRESTADO').length;
  const manutencao = notebooks.filter((n) => n.status === 'MANUTENCAO').length;
  const totalEmprestimos = loans.length;
  const ativos = loans.filter((l) => l.status === 'ABERTO').length;
  const atrasados = loans.filter((l) => l.status === 'ATRASADO').length;
  const devolvidos = loans.filter((l) => l.status === 'DEVOLVIDO').length;

  const kpiData = [
    { Indicador: 'Total de Notebooks no Patrimônio', Valor: totalEquipamentos },
    { Indicador: 'Notebooks Disponíveis (GUARDADO)', Valor: guardados },
    { Indicador: 'Notebooks em Uso (EMPRESTADO)', Valor: emprestados },
    { Indicador: 'Notebooks em Manutenção (MANUTENCAO)', Valor: manutencao },
    { Indicador: 'Taxa de Ocupação da Frota', Valor: totalEquipamentos > 0 ? `${((emprestados / totalEquipamentos) * 100).toFixed(1)}%` : '0%' },
    { Indicador: 'Total Histórico de Empréstimos Registrados', Valor: totalEmprestimos },
    { Indicador: 'Empréstimos Em Aberto', Valor: ativos },
    { Indicador: 'Empréstimos Atrasados', Valor: atrasados },
    { Indicador: 'Empréstimos Finalizados com Sucesso', Valor: devolvidos },
    { Indicador: 'Data da Geração do Relatório', Valor: new Date().toLocaleString('pt-BR') },
  ];

  const wsKpi = XLSX.utils.json_to_sheet(kpiData);
  wsKpi['!cols'] = [{ wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Resumo Indicadores');

  // Grava o arquivo para download no navegador
  XLSX.writeFile(wb, fileName);
}

/**
 * Escapa células CSV para evitar quebras em vírgulas e aspas
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Helper para download direto de arquivos no navegador
 */
function triggerFileDownload(content: string, fileName: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta o Histórico Completo de Empréstimos para formato CSV (.csv)
 */
export function exportLoansToCSV(
  loans: Emprestimo[],
  fileName = 'Historico_Completo_Emprestimos_Sirio_Libanes.csv'
) {
  const headers = [
    'Protocolo',
    'Status',
    'Nome Aluno',
    'RA (14 Digitos)',
    'Curso',
    'Semestre',
    'E-mail Institucional',
    'WhatsApp',
    'Notebook (Hostname)',
    'Data Saida',
    'Previsao Devolucao',
    'Data Devolucao',
    'Tecnico Liberacao',
    'Tecnico Devolucao',
    'Integridade / Checklist',
    'Observacoes',
  ];

  const rows = loans.map((l) => [
    escapeCsvCell(l.protocolo),
    escapeCsvCell(l.status),
    escapeCsvCell(l.nome),
    escapeCsvCell(l.ra),
    escapeCsvCell(l.curso),
    escapeCsvCell(l.semestre),
    escapeCsvCell(l.email),
    escapeCsvCell(l.whatsapp),
    escapeCsvCell(l.hostname),
    escapeCsvCell(l.dataSaida ? new Date(l.dataSaida).toLocaleString('pt-BR') : '-'),
    escapeCsvCell(l.dataPrevistaDevolucao ? new Date(l.dataPrevistaDevolucao).toLocaleString('pt-BR') : '-'),
    escapeCsvCell(l.dataDevolucao ? new Date(l.dataDevolucao).toLocaleString('pt-BR') : 'Pendente'),
    escapeCsvCell(l.tecnicoSaida || '-'),
    escapeCsvCell(l.tecnicoDevolucao || '-'),
    escapeCsvCell(l.checklistDevolucao ? (l.checklistDevolucao.houveDano ? 'AVARIA REGISTRADA' : 'EQUIPAMENTO ÍNTEGRO') : 'N/A'),
    escapeCsvCell(l.observacoes || '-'),
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((r) => r.join(';')),
  ].join('\r\n');

  triggerFileDownload(csvContent, fileName);
}

/**
 * Exporta Métricas de Uso da Frota e Indicadores Institucionais para CSV (.csv)
 */
export function exportUsageMetricsToCSV(
  loans: Emprestimo[],
  notebooks: Notebook[],
  fileName = 'Metricas_Uso_Patrimonio_Sirio_Libanes.csv'
) {
  const totalEquipamentos = notebooks.length;
  const guardados = notebooks.filter((n) => n.status === 'GUARDADO').length;
  const emprestados = notebooks.filter((n) => n.status === 'EMPRESTADO').length;
  const manutencao = notebooks.filter((n) => n.status === 'MANUTENCAO').length;
  const totalEmprestimos = loans.length;
  const ativos = loans.filter((l) => l.status === 'ABERTO').length;
  const atrasados = loans.filter((l) => l.status === 'ATRASADO').length;
  const devolvidos = loans.filter((l) => l.status === 'DEVOLVIDO').length;
  const taxaOcupacao = totalEquipamentos > 0 ? `${((emprestados / totalEquipamentos) * 100).toFixed(1)}%` : '0%';

  // Métricas por curso
  const cursoCounts: Record<string, number> = {};
  loans.forEach((l) => {
    cursoCounts[l.curso] = (cursoCounts[l.curso] || 0) + 1;
  });

  const lines: string[] = [
    '=== RELATÓRIO INSTITUCIONAL DE MÉTRICAS E USO DA FROTA DE NOTEBOOKS ===',
    `Faculdade Sírio-Libanês - Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
    'CATEGORIA;INDICADOR;VALOR;DETALHAMENTO',
    `Patrimônio;Total de Notebooks Cadastrados;${totalEquipamentos};Equipamentos na base ativa`,
    `Patrimônio;Disponíveis para Empréstimo (GUARDADO);${guardados};Prontos na Central de TI`,
    `Patrimônio;Empréstimos Ativos (EMPRESTADO);${emprestados};Em posse dos estudantes`,
    `Patrimônio;Em Manutenção Técnica;${manutencao};Indisponíveis temporariamente`,
    `Performance;Taxa de Ocupação da Frota;${taxaOcupacao};Percentual em uso concomitante`,
    `Histórico;Total Histórico de Empréstimos;${totalEmprestimos};Registros auditados`,
    `Histórico;Empréstimos em Aberto no Momento;${ativos};Sem pendência de atraso`,
    `Histórico;Empréstimos em Atraso;${atrasados};Excederam prazo de devolução`,
    `Histórico;Empréstimos Devolvidos com Sucesso;${devolvidos};Finalizados com checklist`,
    '',
    '=== DEMANDA DE EMPRÉSTIMOS POR CURSO GRADUAÇÃO / PÓS ===',
    'CURSO;TOTAL DE EMPRÉSTIMOS;PARTICIPAÇÃO %',
    ...Object.entries(cursoCounts).map(([curso, qtd]) => {
      const pct = totalEmprestimos > 0 ? `${((qtd / totalEmprestimos) * 100).toFixed(1)}%` : '0%';
      return `${escapeCsvCell(curso)};${qtd};${pct}`;
    }),
  ];

  triggerFileDownload(lines.join('\r\n'), fileName);
}

