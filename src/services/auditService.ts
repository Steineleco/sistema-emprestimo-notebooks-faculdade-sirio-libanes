import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { AuditLog, Emprestimo, Notebook } from '../types';
import * as XLSX from 'xlsx';

/**
 * Registra um log de auditoria imutável no Firestore
 */
export async function recordAuditLog(
  log: Omit<AuditLog, 'id'>
): Promise<string> {
  const timestamp = log.timestamp || new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const logId = `LOG-${timestamp.replace(/[:.-]/g, '')}-${randomSuffix}`;
  const docRef = doc(db, 'audit_logs', logId);

  const payload: AuditLog = {
    ...log,
    id: logId,
    timestamp,
  };

  try {
    await setDoc(docRef, payload);
    return logId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `audit_logs/${logId}`);
  }
}

/**
 * Escuta os logs de auditoria em tempo real, ordenados do mais recente para o mais antigo
 */
export function subscribeAuditLogs(
  callback: (logs: AuditLog[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'audit_logs');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const logs: AuditLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AuditLog;
        logs.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Ordenar decrescente por timestamp
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    },
    (error) => {
      console.warn('Aviso ao escutar audit_logs:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      try {
        handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      } catch (e) {
        // Error logged per FirestoreErrorInfo format
      }
    }
  );
}

/**
 * Exporta a lista filtrada de logs de auditoria para Excel (.xlsx)
 */
export function exportAuditLogsToExcel(
  logs: AuditLog[],
  fileName = 'Logs_Auditoria_Faculdade_Sirio_Libanes.xlsx'
) {
  const wb = XLSX.utils.book_new();

  const formattedData = logs.map((log) => ({
    'ID Log': log.id,
    'Data/Hora': new Date(log.timestamp).toLocaleString('pt-BR'),
    'Ação': log.acao,
    'Categoria': log.categoria,
    'Técnico Responsável': log.tecnicoResponsavel,
    'Equipamento (Hostname)': log.hostname,
    'Protocolo': log.protocolo || '-',
    'Status Anterior': log.statusAnterior || '-',
    'Status Novo': log.statusNovo || '-',
    'Aluno / RA': log.alunoNome ? `${log.alunoNome} (${log.alunoRa})` : '-',
    'Detalhes / Justificativa': log.detalhes,
  }));

  const ws = XLSX.utils.json_to_sheet(formattedData);
  ws['!cols'] = [
    { wch: 28 }, // ID Log
    { wch: 20 }, // Data/Hora
    { wch: 25 }, // Ação
    { wch: 15 }, // Categoria
    { wch: 24 }, // Técnico
    { wch: 16 }, // Hostname
    { wch: 20 }, // Protocolo
    { wch: 16 }, // Status Anterior
    { wch: 16 }, // Status Novo
    { wch: 28 }, // Aluno
    { wch: 45 }, // Detalhes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Logs de Auditoria');
  XLSX.writeFile(wb, fileName);
}

/**
 * Exporta logs de auditoria formatados em CSV (UTF-8 com BOM para Excel/BI)
 */
export function exportAuditLogsToCSV(
  logs: AuditLog[],
  fileName = 'Logs_Auditoria_Faculdade_Sirio_Libanes.csv'
) {
  const headers = [
    'ID Log',
    'Data/Hora',
    'Ação',
    'Categoria',
    'Técnico Responsável',
    'Equipamento (Hostname)',
    'Protocolo',
    'Status Anterior',
    'Status Novo',
    'Aluno',
    'RA',
    'Detalhes / Justificativa',
  ];

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = logs.map((log) => [
    escapeCell(log.id),
    escapeCell(new Date(log.timestamp).toLocaleString('pt-BR')),
    escapeCell(log.acao),
    escapeCell(log.categoria),
    escapeCell(log.tecnicoResponsavel),
    escapeCell(log.hostname),
    escapeCell(log.protocolo || ''),
    escapeCell(log.statusAnterior || ''),
    escapeCell(log.statusNovo || ''),
    escapeCell(log.alunoNome || ''),
    escapeCell(log.alunoRa || ''),
    escapeCell(log.detalhes),
  ]);

  const csvContent =
    '\uFEFF' + [headers.map(escapeCell).join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
 * Cria logs iniciais de auditoria caso a coleção esteja vazia para apoiar a visualização imediata
 */
export async function seedAuditLogsIfEmpty(
  existingLoans: Emprestimo[],
  existingNotebooks: Notebook[]
): Promise<number> {
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    if (!snap.empty) return 0;

    const sampleLogs: Omit<AuditLog, 'id'>[] = [
      {
        acao: 'CADASTRO_NOTEBOOK',
        categoria: 'NOTEBOOK',
        hostname: 'FSL-NB-01',
        tecnicoResponsavel: 'Administrador Geral TI',
        statusAnterior: 'N/A',
        statusNovo: 'GUARDADO',
        detalhes: 'Notebook Dell Latitude 3420 cadastrado e aprovado para empréstimos institucionais.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
      },
      {
        acao: 'CADASTRO_NOTEBOOK',
        categoria: 'NOTEBOOK',
        hostname: 'FSL-NB-08',
        tecnicoResponsavel: 'Técnico Especialista em TI',
        statusAnterior: 'N/A',
        statusNovo: 'MANUTENCAO',
        detalhes: 'Notebook Dell Inspiron 15 encaminhado para revisão técnica do conector da fonte.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
      },
      {
        acao: 'CRIACAO_EMPRESTIMO',
        categoria: 'EMPRESTIMO',
        protocolo: 'NB-20261006-0001',
        hostname: 'FSL-NB-02',
        tecnicoResponsavel: 'Central TI - Atendimento Sírio-Libanês',
        statusAnterior: 'GUARDADO',
        statusNovo: 'EMPRESTADO',
        alunoNome: 'Beatriz Vasconcelos',
        alunoRa: '2023101140',
        detalhes: 'Empréstimo registrado com sucesso para aluno do 6º semestre de Medicina.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      },
      {
        acao: 'DEVOLUCAO_EMPRESTIMO',
        categoria: 'EMPRESTIMO',
        protocolo: 'NB-20261006-0001',
        hostname: 'FSL-NB-02',
        tecnicoResponsavel: 'Técnico Especialista em TI',
        statusAnterior: 'EMPRESTADO',
        statusNovo: 'GUARDADO',
        alunoNome: 'Beatriz Vasconcelos',
        alunoRa: '2023101140',
        detalhes: 'Devolução concluída com checklist aprovado (carregador entregue, tela íntegra).',
        timestamp: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      },
    ];

    // Adiciona logs correspondentes aos empréstimos já existentes
    for (const loan of existingLoans) {
      sampleLogs.push({
        acao: 'CRIACAO_EMPRESTIMO',
        categoria: 'EMPRESTIMO',
        protocolo: loan.protocolo,
        hostname: loan.hostname,
        tecnicoResponsavel: loan.tecnicoSaida,
        statusAnterior: 'GUARDADO',
        statusNovo: 'EMPRESTADO',
        alunoNome: loan.nome,
        alunoRa: loan.ra,
        detalhes: `Empréstimo protocolado para aluno de ${loan.curso}. Previsão: ${new Date(
          loan.dataPrevistaDevolucao
        ).toLocaleString('pt-BR')}`,
        timestamp: loan.dataSaida || loan.createdAt || new Date().toISOString(),
      });

      if (loan.status === 'DEVOLVIDO' && loan.dataDevolucao) {
        sampleLogs.push({
          acao: 'DEVOLUCAO_EMPRESTIMO',
          categoria: 'EMPRESTIMO',
          protocolo: loan.protocolo,
          hostname: loan.hostname,
          tecnicoResponsavel: loan.tecnicoDevolucao || 'Equipe TI Sírio-Libanês',
          statusAnterior: 'EMPRESTADO',
          statusNovo: 'GUARDADO',
          alunoNome: loan.nome,
          alunoRa: loan.ra,
          detalhes: `Equipamento retornado ao estoque institucional com checklist verificado.`,
          timestamp: loan.dataDevolucao,
        });
      }
    }

    for (const logItem of sampleLogs) {
      await recordAuditLog(logItem);
    }

    return sampleLogs.length;
  } catch (error) {
    console.warn('Audit logs seeding skipped:', error);
    return 0;
  }
}
