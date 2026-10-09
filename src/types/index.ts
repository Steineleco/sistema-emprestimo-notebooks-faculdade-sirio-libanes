export type NotebookStatus = 'GUARDADO' | 'EMPRESTADO' | 'MANUTENCAO';

export interface Notebook {
  id: string; // document id (usually hostname)
  hostname: string;
  marca: string;
  modelo: string;
  status: NotebookStatus;
  validado: boolean;
  numeroSerie?: string;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EmprestimoStatus = 'ABERTO' | 'DEVOLVIDO' | 'ATRASADO';

export interface ChecklistDevolucao {
  equipamentoLiga: boolean;
  carregadorEntregue: boolean;
  telaIntegra: boolean;
  tecladoTouchpadOk: boolean;
  carcacaSemAvarias: boolean;
  houveDano: boolean;
  observacoes?: string;
}

export interface Emprestimo {
  id: string; // Document ID (usually equals protocolo)
  protocolo: string; // NB-AAAAMMDD-NNNN
  nome: string;
  ra: string; // 14 numeric digits
  curso: string;
  semestre: string;
  email: string; // @faculdadesiriolibanes.org.br
  whatsapp: string; // (XX) XXXXX-XXXX
  hostname: string;
  dataSaida: string; // ISO string
  dataPrevistaDevolucao: string; // ISO string
  dataDevolucao?: string | null;
  status: EmprestimoStatus;
  tecnicoSaida: string;
  tecnicoDevolucao?: string | null;
  checklistDevolucao?: ChecklistDevolucao;
  alunoUid?: string;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = 'aluno' | 'tecnico' | 'ADM';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  ra?: string;
  curso?: string;
  whatsapp?: string;
}

export interface LoanFormData {
  nome: string;
  ra: string;
  curso: string;
  semestre: string;
  email: string;
  whatsapp: string;
  hostname: string;
  dataPrevistaDevolucao: string;
  tecnicoSaida: string;
  termoAceito: boolean;
}

export type AuditAction =
  | 'CRIACAO_EMPRESTIMO'
  | 'DEVOLUCAO_EMPRESTIMO'
  | 'ALTERACAO_STATUS_NOTEBOOK'
  | 'CADASTRO_NOTEBOOK'
  | 'ENVIO_MANUTENCAO'
  | 'RETORNO_MANUTENCAO'
  | 'BACKUP_ADMINISTRATIVO';

export interface AuditLog {
  id: string;
  acao: AuditAction;
  categoria: 'EMPRESTIMO' | 'NOTEBOOK' | 'SISTEMA';
  protocolo?: string;
  hostname: string;
  tecnicoResponsavel: string;
  statusAnterior?: string;
  statusNovo?: string;
  detalhes: string;
  alunoNome?: string;
  alunoRa?: string;
  timestamp: string; // ISO date string
}

export type NotificationType = 'PROXIMO_VENCIMENTO' | 'ATRASADO';
export type NotificationRecipient = 'ALUNO' | 'TECNICO';

export interface EmailNotification {
  id: string;
  protocolo: string;
  hostname: string;
  destinatarioEmail: string;
  destinatarioNome: string;
  destinatarioTipo: NotificationRecipient;
  tipoAlerta: NotificationType;
  assunto: string;
  corpoHtml?: string;
  statusEnvio: 'ENVIADO' | 'PENDENTE' | 'FALHA';
  enviadoEm: string;
  horasRestantes?: number;
  horasAtraso?: number;
  disparadoPor?: 'CLOUD_FUNCTION' | 'SISTEMA_AUTO' | 'MANUAL';
}

export interface BackupLog {
  id: string;
  backupId: string;
  timestamp: string; // ISO date
  bucket: string;
  storagePath: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  notebooksCount: number;
  emprestimosCount: number;
  totalRecords: number;
  fileSizeBytes: number;
  sha256Hash: string;
  triggeredBy: 'FIREBASE_FUNCTIONS_SCHEDULE' | 'ADMIN_MANUAL' | 'HTTP_TRIGGER';
  errorMessage?: string;
  integrityVerified: boolean;
  metadata?: Record<string, any>;
}

export interface BackupPayload {
  backupId: string;
  timestamp: string;
  environment: string;
  schemaVersion: string;
  integrity: {
    algorithm: string;
    sha256: string;
    totalRecords: number;
    fileSizeBytes: number;
  };
  collections: {
    notebooks: {
      count: number;
      data: Notebook[];
    };
    emprestimos: {
      count: number;
      data: Emprestimo[];
    };
  };
}


