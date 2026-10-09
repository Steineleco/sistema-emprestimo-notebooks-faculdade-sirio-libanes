import React, { useState } from 'react';
import {
  Mail,
  X,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  User,
  Laptop,
  Terminal,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { EmailNotification, Emprestimo } from '../types';
import {
  checkAndDispatchNotifications,
  buildNotificationHtmlBody,
} from '../services/notificationService';

interface EmailNotificationsModalProps {
  notifications: EmailNotification[];
  loans: Emprestimo[];
  onClose: () => void;
}

export const EmailNotificationsModal: React.FC<EmailNotificationsModalProps> = ({
  notifications,
  loans,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'alertas' | 'codigo'>('alertas');
  const [selectedPreviewNotif, setSelectedPreviewNotif] = useState<EmailNotification | null>(
    null
  );
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Contadores
  const totalAlertas = notifications.length;
  const alertasVencimento = notifications.filter((n) => n.tipoAlerta === 'PROXIMO_VENCIMENTO').length;
  const alertasAtraso = notifications.filter((n) => n.tipoAlerta === 'ATRASADO').length;

  const handleRunManualCheck = async () => {
    setRunningCheck(true);
    setCheckResult(null);
    try {
      const res = await checkAndDispatchNotifications(loans);
      setCheckResult(
        `Verificação executada com sucesso! ${res.dispatchedCount} notificações geradas (${res.nearDueCount} empréstimos próximos do prazo, ${res.delayedCount} em atraso).`
      );
      setTimeout(() => setCheckResult(null), 6000);
    } catch (err: any) {
      console.error('Erro na checagem manual:', err);
      setCheckResult('Erro ao processar verificação.');
    } finally {
      setRunningCheck(false);
    }
  };

  const cloudFunctionCode = `// functions/src/index.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as nodemailer from 'nodemailer';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Executa a cada 1 hora 24/7 na GCP
export const checkLoansAndSendEmailAlerts = onSchedule(
  { schedule: 'every 1 hours', timeZone: 'America/Sao_Paulo' },
  async () => {
    const now = new Date();
    const snap = await db.collection('emprestimos')
      .where('status', 'in', ['ABERTO', 'ATRASADO']).get();

    for (const doc of snap.docs) {
      const loan = doc.data();
      const dueDate = new Date(loan.dataPrevistaDevolucao);
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        // Alerta de Atraso Crítico para Aluno e Técnico de TI
        await sendOverdueAlert(loan, now);
      } else if (diffHours <= 24) {
        // Lembrete de devolução próxima (< 24h)
        await sendUpcomingDueReminder(loan, now);
      }
    }
  }
);`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(cloudFunctionCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-teal-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-emerald-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/60">
                  Firebase Cloud Functions
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Ativo (Cron 1h)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Central de Alertas e Notificações por E-mail
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs de Navegação */}
        <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveSubTab('alertas')}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center space-x-2 border-t-2 ${
                activeSubTab === 'alertas'
                  ? 'bg-white text-emerald-900 border-emerald-600 shadow-sm'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Histórico de Alertas ({totalAlertas})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('codigo')}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition flex items-center space-x-2 border-t-2 ${
                activeSubTab === 'codigo'
                  ? 'bg-white text-emerald-900 border-emerald-600 shadow-sm'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Código Cloud Functions & Deploy</span>
            </button>
          </div>

          <button
            onClick={handleRunManualCheck}
            disabled={runningCheck}
            className="mb-2 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            {runningCheck ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Executar Verificação Agora</span>
              </>
            )}
          </button>
        </div>

        {/* Feedback de execução */}
        {checkResult && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{checkResult}</span>
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeSubTab === 'alertas' ? (
            <>
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Total de Disparos
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{totalAlertas}</div>
                  <span className="text-[11px] text-slate-400">alunos e técnicos notificados</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-700">
                    Lembretes de Prazo (&lt; 24h)
                  </span>
                  <div className="text-2xl font-black text-amber-950 mt-1">{alertasVencimento}</div>
                  <span className="text-[11px] text-amber-700">próximos do vencimento</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-700">
                    Alertas Críticos de Atraso
                  </span>
                  <div className="text-2xl font-black text-rose-950 mt-1">{alertasAtraso}</div>
                  <span className="text-[11px] text-rose-700">equipamentos em atraso</span>
                </div>
              </div>

              {/* Lista de Notificações */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Alertas Processados no Sistema</span>
                </h3>

                {notifications.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs">
                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Nenhum alerta disparado ainda.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clique no botão "Executar Verificação Agora" acima para analisar empréstimos ativos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => {
                      const isOverdue = notif.tipoAlerta === 'ATRASADO';
                      const isAluno = notif.destinatarioTipo === 'ALUNO';

                      return (
                        <div
                          key={notif.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                            isOverdue
                              ? 'bg-rose-50/30 border-rose-200'
                              : 'bg-emerald-50/20 border-emerald-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isOverdue
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isOverdue ? 'Atrasado' : 'Prazo < 24h'}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  isAluno
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {notif.destinatarioTipo}
                              </span>

                              <span className="font-mono text-slate-500 text-[11px]">
                                {new Date(notif.enviadoEm).toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className="font-semibold text-slate-800">{notif.assunto}</div>

                            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                              <span>
                                <strong>Para:</strong> {notif.destinatarioNome} ({notif.destinatarioEmail})
                              </span>
                              <span>
                                <strong>Equipamento:</strong> {notif.hostname}
                              </span>
                              <span>
                                <strong>Protocolo:</strong> {notif.protocolo}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => setSelectedPreviewNotif(notif)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition flex items-center space-x-1"
                            >
                              <ExternalLink className="w-3 h-3 text-emerald-600" />
                              <span>Ver E-mail HTML</span>
                            </button>

                            <a
                              href={`mailto:${notif.destinatarioEmail}?subject=${encodeURIComponent(
                                notif.assunto
                              )}&body=${encodeURIComponent(
                                `Prezado(a) ${notif.destinatarioNome},\n\nComunicado oficial sobre o empréstimo do notebook ${notif.hostname} (Protocolo: ${notif.protocolo}).\n\nCentral de TI - Faculdade Sírio-Libanês`
                              )}`}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1"
                              title="Abrir no cliente de e-mail local"
                            >
                              <Send className="w-3 h-3" />
                              <span>Enviar Mailto</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Tab de Código da Cloud Function */
            <div className="space-y-4 text-xs">
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    functions/src/index.ts (Cloud Functions v2)
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto text-[11px] text-emerald-300 leading-relaxed max-h-72 scrollbar-thin">
                  {cloudFunctionCode}
                </pre>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900">Como implantar no Firebase do projeto:</h4>
                <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] text-slate-600">
                  <li>Navegue até a pasta: <code className="text-emerald-700">cd functions</code></li>
                  <li>Instale dependências: <code className="text-emerald-700">npm install</code></li>
                  <li>Compile o TypeScript: <code className="text-emerald-700">npm run build</code></li>
                  <li>Implante na Google Cloud: <code className="text-emerald-700">firebase deploy --only functions</code></li>
                </ol>
                <p className="text-[11px] text-slate-500 pt-1">
                  *A função agendada (<code className="text-emerald-700">onSchedule("every 1 hours")</code>) executará automaticamente na infraestrutura serverless da Google Cloud, disparando os alertas mesmo com a página web fechada.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Preview do E-mail HTML */}
      {selectedPreviewNotif && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Visualização de Mensagem
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedPreviewNotif.assunto}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreviewNotif(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview do HTML do e-mail */}
            <div
              className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner"
              dangerouslySetInnerHTML={{
                __html: buildNotificationHtmlBody(
                  selectedPreviewNotif,
                  loans.find((l) => l.protocolo === selectedPreviewNotif.protocolo)
                ),
              }}
            />

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedPreviewNotif(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-50"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
