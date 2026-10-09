import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { EmailNotification, Emprestimo, NotificationType } from '../types';

export const IT_SUPPORT_EMAIL = 'suporte.ti@faculdadesiriolibanes.org.br';

/**
 * Escuta notificações e alertas em tempo real
 */
export function subscribeNotifications(
  callback: (notifications: EmailNotification[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'notifications');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: EmailNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as EmailNotification;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Ordenar do mais recente para o mais antigo
      items.sort((a, b) => new Date(b.enviadoEm).getTime() - new Date(a.enviadoEm).getTime());
      callback(items);
    },
    (err) => {
      console.warn('Aviso ao escutar notificações:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
      try {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      } catch (e) {
        // Error logged per FirestoreErrorInfo format
      }
    }
  );
}

/**
 * Executa verificação em lote de empréstimos em aberto e dispara alertas para Aluno e Técnico
 */
export async function checkAndDispatchNotifications(
  loans: Emprestimo[]
): Promise<{ dispatchedCount: number; delayedCount: number; nearDueCount: number }> {
  const now = new Date();
  let dispatchedCount = 0;
  let delayedCount = 0;
  let nearDueCount = 0;

  const activeLoans = loans.filter((l) => l.status === 'ABERTO' || l.status === 'ATRASADO');

  for (const loan of activeLoans) {
    if (!loan.dataPrevistaDevolucao) continue;

    const dueDate = new Date(loan.dataPrevistaDevolucao);
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 1. Empréstimo em atraso (diffHours < 0)
    if (diffHours < 0) {
      delayedCount++;
      const horasAtraso = Math.abs(Math.round(diffHours));

      // Alerta para o Aluno
      const alertIdAluno = `ALERT-ATRASO-${loan.protocolo}-ALUNO-${now.toISOString().slice(0, 10)}`;
      const notifAluno: EmailNotification = {
        id: alertIdAluno,
        protocolo: loan.protocolo,
        hostname: loan.hostname,
        destinatarioEmail: loan.email,
        destinatarioNome: loan.nome,
        destinatarioTipo: 'ALUNO',
        tipoAlerta: 'ATRASADO',
        assunto: `[URGENTE] Atraso na Devolução do Notebook ${loan.hostname} — Protocolo ${loan.protocolo}`,
        statusEnvio: 'ENVIADO',
        enviadoEm: now.toISOString(),
        horasAtraso,
        disparadoPor: 'SISTEMA_AUTO',
      };

      try {
        await setDoc(doc(db, 'notifications', alertIdAluno), notifAluno, { merge: true });
        dispatchedCount++;
      } catch (err) {
        console.warn('Erro ao salvar notificação:', err);
      }

      // Alerta para o Técnico
      const alertIdTec = `ALERT-ATRASO-${loan.protocolo}-TEC-${now.toISOString().slice(0, 10)}`;
      const notifTec: EmailNotification = {
        id: alertIdTec,
        protocolo: loan.protocolo,
        hostname: loan.hostname,
        destinatarioEmail: IT_SUPPORT_EMAIL,
        destinatarioNome: 'Equipe de TI Sírio-Libanês',
        destinatarioTipo: 'TECNICO',
        tipoAlerta: 'ATRASADO',
        assunto: `[ALERTA TI] Equipamento em Atraso: ${loan.hostname} (${loan.nome} - RA: ${loan.ra})`,
        statusEnvio: 'ENVIADO',
        enviadoEm: now.toISOString(),
        horasAtraso,
        disparadoPor: 'SISTEMA_AUTO',
      };

      try {
        await setDoc(doc(db, 'notifications', alertIdTec), notifTec, { merge: true });
        dispatchedCount++;
      } catch (err) {
        console.warn('Erro ao salvar notificação técnico:', err);
      }
    }
    // 2. Próximo do vencimento (< 24 horas restantes)
    else if (diffHours >= 0 && diffHours <= 24) {
      nearDueCount++;
      const horasRestantes = Math.max(1, Math.round(diffHours));

      // Lembrete para o Aluno
      const alertIdAluno = `ALERT-VENC-${loan.protocolo}-ALUNO-${now.toISOString().slice(0, 10)}`;
      const notifAluno: EmailNotification = {
        id: alertIdAluno,
        protocolo: loan.protocolo,
        hostname: loan.hostname,
        destinatarioEmail: loan.email,
        destinatarioNome: loan.nome,
        destinatarioTipo: 'ALUNO',
        tipoAlerta: 'PROXIMO_VENCIMENTO',
        assunto: `Lembrete: Devolução do Notebook ${loan.hostname} vence em ${horasRestantes}h`,
        statusEnvio: 'ENVIADO',
        enviadoEm: now.toISOString(),
        horasRestantes,
        disparadoPor: 'SISTEMA_AUTO',
      };

      try {
        await setDoc(doc(db, 'notifications', alertIdAluno), notifAluno, { merge: true });
        dispatchedCount++;
      } catch (err) {
        console.warn('Erro ao salvar lembrete:', err);
      }

      // Notificação para o Técnico
      const alertIdTec = `ALERT-VENC-${loan.protocolo}-TEC-${now.toISOString().slice(0, 10)}`;
      const notifTec: EmailNotification = {
        id: alertIdTec,
        protocolo: loan.protocolo,
        hostname: loan.hostname,
        destinatarioEmail: IT_SUPPORT_EMAIL,
        destinatarioNome: 'Equipe de TI Sírio-Libanês',
        destinatarioTipo: 'TECNICO',
        tipoAlerta: 'PROXIMO_VENCIMENTO',
        assunto: `[Previsão Devolução Hoje] Notebook ${loan.hostname} — Aluno: ${loan.nome}`,
        statusEnvio: 'ENVIADO',
        enviadoEm: now.toISOString(),
        horasRestantes,
        disparadoPor: 'SISTEMA_AUTO',
      };

      try {
        await setDoc(doc(db, 'notifications', alertIdTec), notifTec, { merge: true });
        dispatchedCount++;
      } catch (err) {
        console.warn('Erro ao salvar lembrete técnico:', err);
      }
    }
  }

  return { dispatchedCount, delayedCount, nearDueCount };
}

/**
 * Cria o corpo HTML do e-mail com identidade visual da Faculdade Sírio-Libanês
 */
export function buildNotificationHtmlBody(
  notif: EmailNotification,
  loan?: Emprestimo
): string {
  const isOverdue = notif.tipoAlerta === 'ATRASADO';
  const cor = isOverdue ? '#dc2626' : '#059669';
  const tagText = isOverdue ? 'ALERTA DE ATRASO CRÍTICO' : 'LEMBRETE DE VENCIMENTO (< 24 HORAS)';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #064e3b; padding: 24px; text-align: center; color: #ffffff;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #6ee7b7; font-weight: 700;">Faculdade Sírio-Libanês</span>
        <h2 style="margin: 8px 0 0 0; font-size: 19px; font-weight: 800;">Central de Tecnologia da Informação</h2>
      </div>
      <div style="padding: 24px;">
        <div style="display: inline-block; background-color: ${cor}; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: 800; margin-bottom: 16px;">
          ${tagText}
        </div>
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b;">
          Olá, ${notif.destinatarioNome}!
        </h3>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
          ${
            isOverdue
              ? `Constatamos que o prazo previsto para devolução do equipamento <strong>${notif.hostname}</strong> expirou ${
                  notif.horasAtraso ? `há cerca de ${notif.horasAtraso} horas` : ''
                }. Solicitamos a devolução imediata no balcão de TI.`
              : `Lembramos que o empréstimo do notebook <strong>${notif.hostname}</strong> está programado para ser devolvido ${
                  notif.horasRestantes ? `nas próximas ${notif.horasRestantes} horas` : 'em breve'
                }.`
          }
        </p>

        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #1e293b; border-left: 4px solid ${cor};">
          <div style="margin-bottom: 6px;"><strong>📋 Protocolo:</strong> <span style="font-family: monospace; font-weight: 700;">${notif.protocolo}</span></div>
          <div style="margin-bottom: 6px;"><strong>💻 Equipamento:</strong> ${notif.hostname}</div>
          ${loan?.curso ? `<div style="margin-bottom: 6px;"><strong>🎓 Curso:</strong> ${loan.curso} (${loan.semestre})</div>` : ''}
          ${loan?.ra ? `<div style="margin-bottom: 6px;"><strong>🆔 RA:</strong> ${loan.ra}</div>` : ''}
          <div><strong>⏰ Data/Hora Prevista:</strong> ${loan?.dataPrevistaDevolucao ? new Date(loan.dataPrevistaDevolucao).toLocaleString('pt-BR') : 'Consulte seu protocolo'}</div>
        </div>

        <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 12px; font-size: 12px; color: #854d0e; margin-bottom: 20px;">
          <strong>Importante:</strong> Não se esqueça de entregar o carregador original e cabo de força íntegros junto ao equipamento.
        </div>

        <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
          Dúvidas ou necessidade de prorrogação? Entre em contato com a equipe técnica:
        </p>
        <p style="font-size: 12px; font-weight: 700; color: #064e3b; margin: 4px 0 0 0;">
          E-mail: suporte.ti@faculdadesiriolibanes.org.br • Ramal 4420 • Bloco Acadêmico, Térreo
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
}
