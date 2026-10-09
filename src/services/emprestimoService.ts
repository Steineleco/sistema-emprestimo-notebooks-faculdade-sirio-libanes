import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  Emprestimo,
  ChecklistDevolucao,
  LoanFormData,
  NotebookStatus,
} from '../types';
import { recordAuditLog } from './auditService';

/**
 * Formata data no formato AAAAMMDD para o protocolo
 */
function getFormattedDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Verifica se o aluno já possui algum empréstimo em aberto ou atrasado
 */
export async function checkStudentActiveLoan(
  ra: string,
  email?: string
): Promise<Emprestimo | null> {
  const cleanRa = ra.trim();
  if (!cleanRa) return null;

  try {
    const qRa = query(
      collection(db, 'emprestimos'),
      where('ra', '==', cleanRa)
    );
    const snap = await getDocs(qRa);

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Emprestimo;
      if (data.status === 'ABERTO' || data.status === 'ATRASADO') {
        return {
          ...data,
          id: docSnap.id,
        };
      }
    }

    if (email && email.trim()) {
      const qEmail = query(
        collection(db, 'emprestimos'),
        where('email', '==', email.trim().toLowerCase())
      );
      const snapEmail = await getDocs(qEmail);
      for (const docSnap of snapEmail.docs) {
        const data = docSnap.data() as Emprestimo;
        if (data.status === 'ABERTO' || data.status === 'ATRASADO') {
          return {
            ...data,
            id: docSnap.id,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao verificar empréstimo ativo do aluno:', error);
    return null;
  }
}

/**
 * Verifica se o aluno já realizou o preenchimento do formulário anteriormente
 * Regra: cada aluno preenche o formulário 1 única vez
 */
export async function checkStudentAlreadySubmitted(
  ra: string,
  email?: string,
  _nome?: string
): Promise<Emprestimo | null> {
  const cleanRa = ra.replace(/\D/g, '').trim();
  const cleanEmail = email?.trim().toLowerCase();

  try {
    // 1. Consulta por RA (14 dígitos)
    if (cleanRa && cleanRa.length >= 10) {
      const qRa = query(
        collection(db, 'emprestimos'),
        where('ra', '==', cleanRa)
      );
      const snap = await getDocs(qRa);
      if (!snap.empty) {
        const firstDoc = snap.docs[0];
        return {
          ...(firstDoc.data() as Emprestimo),
          id: firstDoc.id,
        };
      }
    }

    // 2. Consulta por e-mail institucional
    if (cleanEmail && cleanEmail.includes('@faculdadesiriolibanes.org.br')) {
      const qEmail = query(
        collection(db, 'emprestimos'),
        where('email', '==', cleanEmail)
      );
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const firstDoc = snapEmail.docs[0];
        return {
          ...(firstDoc.data() as Emprestimo),
          id: firstDoc.id,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('Aviso ao consultar histórico de preenchimento do aluno:', error);
    return null;
  }
}

/**
 * Criação de empréstimo atômica via runTransaction:
 * 1. Confere se o aluno já preencheu o formulário (regra de 1x por aluno)
 * 2. Confere se o aluno tem empréstimo em aberto
 * 3. Confere disponibilidade do notebook selecionado (status GUARDADO)
 * 4. Gera protocolo sequencial atômico NB-AAAAMMDD-NNNN
 * 5. Salva documento de empréstimo
 * 6. Marca notebook como EMPRESTADO
 */
export async function createLoanTransaction(
  formData: LoanFormData,
  alunoUid?: string
): Promise<Emprestimo> {
  const cleanRa = formData.ra.replace(/\D/g, '');
  const cleanEmail = formData.email.trim().toLowerCase();
  const cleanHostname = formData.hostname.trim().toUpperCase();

  // Pré-verificação 1: Regra de cada aluno preencher o formulário apenas 1 única vez
  const alreadySubmitted = await checkStudentAlreadySubmitted(cleanRa, cleanEmail, formData.nome);
  if (alreadySubmitted) {
    throw new Error(
      `O aluno ${formData.nome} (RA: ${cleanRa}) já preencheu o formulário anteriormente no protocolo ${alreadySubmitted.protocolo}. Regra do sistema: cada aluno pode preencher o formulário apenas 1 única vez.`
    );
  }

  // Pré-verificação 2: Empréstimo ativo
  const activeExisting = await checkStudentActiveLoan(cleanRa, cleanEmail);
  if (activeExisting) {
    throw new Error(
      `O aluno já possui um empréstimo em aberto com o protocolo ${activeExisting.protocolo} (Equipamento: ${activeExisting.hostname}). É necessário devolver o equipamento atual antes de solicitar outro.`
    );
  }

  const todayStr = getFormattedDate();
  const counterRef = doc(db, 'counters', `protocol_${todayStr}`);
  const notebookRef = doc(db, 'notebooks', cleanHostname);

  try {
    const createdLoan = await runTransaction(db, async (transaction) => {
      const nowIso = new Date().toISOString();

      // 1. Verificar disponibilidade do notebook
      const notebookDoc = await transaction.get(notebookRef);
      if (!notebookDoc.exists()) {
        // Se inserido manualmente com F ou H e ainda não cadastrado, cria automaticamente no inventário
        transaction.set(notebookRef, {
          hostname: cleanHostname,
          marca: 'Equipamento Institucional',
          modelo: 'Notebook Acadêmico (F/H)',
          status: 'EMPRESTADO',
          validado: true,
          observacoes: 'Cadastrado automaticamente via identificador F/H no empréstimo',
          updatedAt: nowIso,
          createdAt: nowIso,
        });
      } else {
        const notebookData = notebookDoc.data();
        if (notebookData.status !== 'GUARDADO') {
          throw new Error(
            `O notebook ${cleanHostname} não está disponível (Status atual: ${notebookData.status}). Por favor selecione outro equipamento.`
          );
        }
        // Atualizar status do notebook para EMPRESTADO
        transaction.update(notebookRef, {
          status: 'EMPRESTADO',
          updatedAt: nowIso,
        });
      }

      // 2. Obter ou incrementar sequencial do dia
      const counterDoc = await transaction.get(counterRef);
      let seqNumber = 1;
      if (counterDoc.exists()) {
        seqNumber = (counterDoc.data().seq || 0) + 1;
      }
      transaction.set(
        counterRef,
        {
          seq: seqNumber,
          date: todayStr,
          lastUpdated: nowIso,
        },
        { merge: true }
      );

      const seqPadded = String(seqNumber).padStart(4, '0');
      const protocolo = `NB-${todayStr}-${seqPadded}`;
      const loanDocRef = doc(db, 'emprestimos', protocolo);

      const loanData: Emprestimo = {
        id: protocolo,
        protocolo,
        nome: formData.nome.trim(),
        ra: cleanRa,
        curso: formData.curso.trim(),
        semestre: formData.semestre.trim(),
        email: cleanEmail,
        whatsapp: formData.whatsapp.trim(),
        hostname: cleanHostname,
        dataSaida: nowIso,
        dataPrevistaDevolucao: formData.dataPrevistaDevolucao,
        dataDevolucao: null,
        status: 'ABERTO',
        tecnicoSaida: formData.tecnicoSaida.trim() || 'Central TI Sírio-Libanês',
        tecnicoDevolucao: null,
        alunoUid: alunoUid || 'aluno-guest',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 3. Salvar empréstimo
      transaction.set(loanDocRef, loanData);

      return loanData;
    });

    // Registra log de auditoria
    recordAuditLog({
      acao: 'CRIACAO_EMPRESTIMO',
      categoria: 'EMPRESTIMO',
      protocolo: createdLoan.protocolo,
      hostname: createdLoan.hostname,
      tecnicoResponsavel: createdLoan.tecnicoSaida,
      statusAnterior: 'GUARDADO',
      statusNovo: 'EMPRESTADO',
      alunoNome: createdLoan.nome,
      alunoRa: createdLoan.ra,
      detalhes: `Empréstimo protocolado para ${createdLoan.nome} (RA: ${createdLoan.ra}, ${createdLoan.curso}). Previsão de devolução: ${new Date(createdLoan.dataPrevistaDevolucao).toLocaleString('pt-BR')}`,
      timestamp: new Date().toISOString(),
    }).catch((err) => console.warn('Erro ao gravar log de auditoria:', err));

    return createdLoan;
  } catch (error) {
    if (error instanceof Error && error.message.includes('não está disponível')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('já possui um empréstimo')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'emprestimos');
  }
}

/**
 * Processamento de devolução com checklist (Técnico / ADM):
 * Confere empréstimo, atualiza status para DEVOLVIDO e volta notebook para GUARDADO
 */
export async function returnLoanTransaction(params: {
  protocolo: string;
  checklist: ChecklistDevolucao;
  tecnicoDevolucao: string;
  observacoes?: string;
  destinatarioStatus?: NotebookStatus; // GUARDADO ou MANUTENCAO se avariado
}): Promise<void> {
  const loanRef = doc(db, 'emprestimos', params.protocolo);

  try {
    const returnResult = await runTransaction(db, async (transaction) => {
      const loanDoc = await transaction.get(loanRef);
      if (!loanDoc.exists()) {
        throw new Error(`Protocolo ${params.protocolo} não foi encontrado.`);
      }

      const loanData = loanDoc.data() as Emprestimo;
      if (loanData.status === 'DEVOLVIDO') {
        throw new Error(`Este empréstimo já foi finalizado em ${loanData.dataDevolucao}.`);
      }

      const hostname = loanData.hostname;
      const notebookRef = doc(db, 'notebooks', hostname);
      const nowIso = new Date().toISOString();

      const newNotebookStatus: NotebookStatus =
        params.destinatarioStatus ||
        (params.checklist.houveDano || !params.checklist.equipamentoLiga ? 'MANUTENCAO' : 'GUARDADO');

      // Atualiza o empréstimo
      transaction.update(loanRef, {
        status: 'DEVOLVIDO',
        dataDevolucao: nowIso,
        tecnicoDevolucao: params.tecnicoDevolucao.trim(),
        checklistDevolucao: params.checklist,
        observacoes: params.observacoes || loanData.observacoes || '',
        updatedAt: nowIso,
      });

      // Atualiza o notebook correspondente
      transaction.update(notebookRef, {
        status: newNotebookStatus,
        observacoes: params.checklist.observacoes || `Retornado em ${nowIso.substring(0, 10)} via protocolo ${params.protocolo}`,
        updatedAt: nowIso,
      });

      return {
        hostname,
        alunoNome: loanData.nome,
        alunoRa: loanData.ra,
      };
    });

    // Registra log de auditoria da devolução
    const finalDestStatus: NotebookStatus =
      params.destinatarioStatus ||
      (params.checklist.houveDano || !params.checklist.equipamentoLiga ? 'MANUTENCAO' : 'GUARDADO');

    recordAuditLog({
      acao: 'DEVOLUCAO_EMPRESTIMO',
      categoria: 'EMPRESTIMO',
      protocolo: params.protocolo,
      hostname: returnResult.hostname,
      tecnicoResponsavel: params.tecnicoDevolucao.trim(),
      statusAnterior: 'EMPRESTADO',
      statusNovo: finalDestStatus,
      alunoNome: returnResult.alunoNome,
      alunoRa: returnResult.alunoRa,
      detalhes: `Devolução concluída para ${returnResult.alunoNome} (RA: ${returnResult.alunoRa}). Checklist: Liga (${params.checklist.equipamentoLiga ? 'OK' : 'Falha'}), Carregador (${params.checklist.carregadorEntregue ? 'OK' : 'Faltante'}), Tela (${params.checklist.telaIntegra ? 'OK' : 'Avaria'}). ${params.checklist.houveDano ? '[AVARIA REPORTADA]' : '[EQUIPAMENTO ÍNTEGRO]'}. ${params.observacoes || ''}`,
      timestamp: new Date().toISOString(),
    }).catch((err) => console.warn('Erro ao gravar log de auditoria na devolução:', err));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Protocolo')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `emprestimos/${params.protocolo}`);
  }
}

/**
 * Escuta todos os empréstimos em tempo real
 */
export function subscribeAllLoans(
  callback: (loans: Emprestimo[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, 'emprestimos');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const loans: Emprestimo[] = [];
      const now = new Date();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Emprestimo;
        // Calcular atraso em tempo real se ainda estiver ABERTO
        let computedStatus = data.status;
        if (computedStatus === 'ABERTO' && data.dataPrevistaDevolucao) {
          const due = new Date(data.dataPrevistaDevolucao);
          if (now > due) {
            computedStatus = 'ATRASADO';
          }
        }

        loans.push({
          ...data,
          id: docSnap.id,
          status: computedStatus,
        });
      });

      // Ordenar do mais recente para o mais antigo
      loans.sort((a, b) => {
        const da = new Date(a.createdAt || a.dataSaida).getTime();
        const db = new Date(b.createdAt || b.dataSaida).getTime();
        return db - da;
      });

      callback(loans);
    },
    (err) => {
      console.warn('Aviso ao sincronizar empréstimos:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
      try {
        handleFirestoreError(err, OperationType.LIST, 'emprestimos');
      } catch (e) {
        // Error logged per FirestoreErrorInfo format
      }
    }
  );
}

/**
 * Busca detalhada de um empréstimo por protocolo
 */
export async function getLoanByProtocol(protocolo: string): Promise<Emprestimo | null> {
  const clean = protocolo.trim().toUpperCase();
  try {
    const docRef = doc(db, 'emprestimos', clean);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      ...(snap.data() as Emprestimo),
      id: snap.id,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `emprestimos/${clean}`);
  }
}
