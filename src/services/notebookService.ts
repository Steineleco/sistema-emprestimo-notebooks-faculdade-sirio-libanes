import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Notebook, NotebookStatus } from '../types';
import { recordAuditLog } from './auditService';

export const INITIAL_NOTEBOOKS: Omit<Notebook, 'id'>[] = [
  {
    hostname: 'FSL-NB-01',
    marca: 'Dell',
    modelo: 'Latitude 3420 (i5, 16GB)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: 'BR-DEL-98421',
    observacoes: 'Bancada Sala TI - Bloco B',
  },
  {
    hostname: 'FSL-NB-02',
    marca: 'Dell',
    modelo: 'Latitude 3420 (i5, 16GB)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: 'BR-DEL-98422',
    observacoes: 'Bancada Sala TI - Bloco B',
  },
  {
    hostname: 'FSL-NB-03',
    marca: 'Lenovo',
    modelo: 'ThinkPad E14 Gen 4 (Ryzen 5, 16GB)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: 'PF-388291',
    observacoes: 'Armário TI - Prateleira 1',
  },
  {
    hostname: 'FSL-NB-04',
    marca: 'Lenovo',
    modelo: 'ThinkPad E14 Gen 4 (Ryzen 5, 16GB)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: 'PF-388292',
    observacoes: 'Armário TI - Prateleira 1',
  },
  {
    hostname: 'FSL-NB-05',
    marca: 'HP',
    modelo: 'ProBook 440 G8 (i7, 16GB)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: '5CD-1290K2',
    observacoes: 'Kit Simulação Realística',
  },
  {
    hostname: 'FSL-NB-06',
    marca: 'HP',
    modelo: 'ProBook 440 G8 (i5, 8GB)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: '5CD-1290K3',
    observacoes: 'Laboratório de Habilidades',
  },
  {
    hostname: 'FSL-NB-07',
    marca: 'Apple',
    modelo: 'MacBook Air M1 (8GB, 256GB)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: 'C02FX879Q6L4',
    observacoes: 'Núcleo de Telemedicina',
  },
  {
    hostname: 'FSL-NB-08',
    marca: 'Dell',
    modelo: 'Inspiron 15 3520 (i5, 8GB)',
    status: 'MANUTENCAO',
    validado: false,
    numeroSerie: 'BR-DEL-77120',
    observacoes: 'Troca de conector da fonte pendente',
  },
  {
    hostname: 'FSL-NB-09',
    marca: 'Lenovo',
    modelo: 'ThinkPad L13 (i5, 16GB Touch)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: 'PF-440192',
    observacoes: 'Suporte a prontuário eletrônico',
  },
  {
    hostname: 'FSL-NB-10',
    marca: 'Dell',
    modelo: 'Latitude 5430 (i7, 16GB)',
    status: 'GUARDADO',
    validado: true,
    numeroSerie: 'BR-DEL-99105',
    observacoes: 'Coordenação de Graduação',
  },
];

/**
 * Escuta em tempo real apenas notebooks com status GUARDADO e validado = true
 */
export function subscribeAvailableNotebooks(
  callback: (notebooks: Notebook[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, 'notebooks'),
    where('status', '==', 'GUARDADO')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Notebook[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          hostname: data.hostname || docSnap.id,
          marca: data.marca || '',
          modelo: data.modelo || '',
          status: data.status || 'GUARDADO',
          validado: data.validado ?? true,
          numeroSerie: data.numeroSerie || '',
          observacoes: data.observacoes || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      // Sort alphabetically by hostname
      items.sort((a, b) => a.hostname.localeCompare(b.hostname));
      callback(items);
    },
    (err) => {
      console.warn('Aviso ao sincronizar notebooks disponíveis:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
      try {
        handleFirestoreError(err, OperationType.LIST, 'notebooks');
      } catch (e) {
        // Error logged per FirestoreErrorInfo format
      }
    }
  );
}

/**
 * Escuta todos os notebooks para a tela do técnico / ADM
 */
export function subscribeAllNotebooks(
  callback: (notebooks: Notebook[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, 'notebooks');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Notebook[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          hostname: data.hostname || docSnap.id,
          marca: data.marca || '',
          modelo: data.modelo || '',
          status: data.status || 'GUARDADO',
          validado: data.validado ?? true,
          numeroSerie: data.numeroSerie || '',
          observacoes: data.observacoes || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      items.sort((a, b) => a.hostname.localeCompare(b.hostname));
      callback(items);
    },
    (err) => {
      console.warn('Aviso ao sincronizar todos os notebooks:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
      try {
        handleFirestoreError(err, OperationType.LIST, 'notebooks');
      } catch (e) {
        // Error logged per FirestoreErrorInfo format
      }
    }
  );
}

/**
 * Cria ou atualiza um notebook no Firestore
 */
export async function saveNotebook(notebook: Partial<Notebook> & { hostname: string }): Promise<void> {
  const docId = notebook.hostname.trim().toUpperCase();
  const docRef = doc(db, 'notebooks', docId);

  const payload = {
    hostname: docId,
    marca: notebook.marca || 'Genérica',
    modelo: notebook.modelo || 'Padrão',
    status: notebook.status || 'GUARDADO',
    validado: Boolean(notebook.validado),
    numeroSerie: notebook.numeroSerie || '',
    observacoes: notebook.observacoes || '',
    updatedAt: new Date().toISOString(),
    createdAt: notebook.createdAt || new Date().toISOString(),
  };

  try {
    await setDoc(docRef, payload, { merge: true });

    recordAuditLog({
      acao: 'CADASTRO_NOTEBOOK',
      categoria: 'NOTEBOOK',
      hostname: docId,
      tecnicoResponsavel: 'Administração TI Sírio-Libanês',
      statusNovo: payload.status,
      detalhes: `Equipamento ${docId} (${payload.marca} ${payload.modelo}) salvo/atualizado no inventário. S/N: ${payload.numeroSerie || 'N/A'}.`,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notebooks/${docId}`);
  }
}

/**
 * Atualiza status específico de um notebook (ex: MANUTENCAO, GUARDADO)
 */
export async function updateNotebookStatus(
  hostname: string,
  status: NotebookStatus,
  observacoes?: string,
  tecnicoResponsavel = 'Técnico Especialista em TI'
): Promise<void> {
  const docRef = doc(db, 'notebooks', hostname);
  try {
    let statusAnterior = 'N/A';
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data() as Notebook;
        statusAnterior = currentData.status;
      }
    } catch {}

    const data: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (observacoes !== undefined) {
      data.observacoes = observacoes;
    }
    await updateDoc(docRef, data);

    const acaoName =
      status === 'MANUTENCAO'
        ? 'ENVIO_MANUTENCAO'
        : status === 'GUARDADO'
        ? 'RETORNO_MANUTENCAO'
        : 'ALTERACAO_STATUS_NOTEBOOK';

    recordAuditLog({
      acao: acaoName,
      categoria: 'NOTEBOOK',
      hostname,
      tecnicoResponsavel,
      statusAnterior,
      statusNovo: status,
      detalhes: `Status do equipamento ${hostname} alterado de [${statusAnterior}] para [${status}]. ${observacoes || ''}`,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notebooks/${hostname}`);
  }
}

/**
 * Remove um notebook
 */
export async function deleteNotebook(hostname: string): Promise<void> {
  const docRef = doc(db, 'notebooks', hostname);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notebooks/${hostname}`);
  }
}

/**
 * Seed inicial automático se a coleção de notebooks estiver vazia
 */
export async function seedInitialNotebooksIfEmpty(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, 'notebooks'));
    if (snap.empty) {
      for (const item of INITIAL_NOTEBOOKS) {
        await saveNotebook(item);
      }
      return INITIAL_NOTEBOOKS.length;
    }
    return 0;
  } catch (error) {
    console.error('Failed to seed notebooks:', error);
    return 0;
  }
}
