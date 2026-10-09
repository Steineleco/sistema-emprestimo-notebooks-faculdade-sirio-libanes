/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { StudentLoanForm } from './components/StudentLoanForm';
import { StudentPortalView } from './components/StudentPortalView';
import { ReturnChecklistTab } from './components/ReturnChecklistTab';
import { DashboardTab } from './components/DashboardTab';
import { NotebookInventoryTab } from './components/NotebookInventoryTab';
import { AuditLogsTab } from './components/AuditLogsTab';
import { SuccessProtocolModal } from './components/SuccessProtocolModal';
import { Notebook, Emprestimo, AuditLog, EmailNotification } from './types';
import {
  subscribeAllNotebooks,
  seedInitialNotebooksIfEmpty,
} from './services/notebookService';
import { subscribeAllLoans } from './services/emprestimoService';
import { subscribeAuditLogs, seedAuditLogsIfEmpty } from './services/auditService';
import {
  subscribeNotifications,
  checkAndDispatchNotifications,
} from './services/notificationService';
import {
  Laptop,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  GraduationCap,
  Shield,
} from 'lucide-react';

function MainApp() {
  const { role, setRole } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'solicitacao' | 'devolucao' | 'inventario' | 'dashboard' | 'auditoria'
  >(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (
          params.get('tab') === 'devolucao' ||
          params.get('devolucao') === 'true' ||
          params.has('protocolo')
        ) {
          return 'devolucao';
        }
      }
    } catch {}
    return 'solicitacao';
  });

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loans, setLoans] = useState<Emprestimo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [createdLoan, setCreatedLoan] = useState<Emprestimo | null>(null);

  // Se o perfil for aluno (ou acessado via QR Code do Aluno), exibe exclusivamente a Tela do Aluno
  if (role === 'aluno') {
    return (
      <StudentPortalView
        onAdminAccess={() => {
          setRole('ADM');
          try {
            if (window.history.pushState) {
              const url = new URL(window.location.href);
              url.searchParams.delete('aluno');
              url.searchParams.delete('autofill');
              window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
            }
          } catch {}
        }}
      />
    );
  }

  // Auto-seed initial notebooks on first load if empty
  useEffect(() => {
    seedInitialNotebooksIfEmpty().catch((err) =>
      console.warn('Auto seed notice:', err)
    );
  }, []);

  // Subscribe all notebooks
  useEffect(() => {
    const unsub = subscribeAllNotebooks((list) => {
      setNotebooks(list);
    });
    return () => unsub();
  }, []);

  // Subscribe all loans
  useEffect(() => {
    const unsub = subscribeAllLoans((list) => {
      setLoans(list);
      // Dispara verificação automática em segundo plano para alertas
      if (list.length > 0) {
        checkAndDispatchNotifications(list).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // Subscribe all notifications
  useEffect(() => {
    const unsub = subscribeNotifications((list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, []);

  // Subscribe all audit logs
  useEffect(() => {
    const unsub = subscribeAuditLogs((list) => {
      setAuditLogs(list);
      // Auto seed initial audit logs if collection is empty
      if (list.length === 0 && loans.length > 0) {
        seedAuditLogsIfEmpty(loans, notebooks).catch(() => {});
      }
    });
    return () => unsub();
  }, [loans, notebooks]);

  // Contadores para o Navbar
  const openLoansCount = loans.filter(
    (l) => l.status === 'ABERTO' || l.status === 'ATRASADO'
  ).length;
  const delayedLoansCount = loans.filter((l) => l.status === 'ATRASADO').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950">
      {/* Barra de Navegação */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openLoansCount={openLoansCount}
        delayedLoansCount={delayedLoansCount}
      />

      {/* Conteúdo da Aba Ativa */}
      <main className="flex-1 pb-16">
        {activeTab === 'solicitacao' && (
          <StudentLoanForm
            onSuccess={(loan) => {
              setCreatedLoan(loan);
            }}
          />
        )}

        {activeTab === 'devolucao' && <ReturnChecklistTab loans={loans} />}

        {activeTab === 'inventario' && (
          <NotebookInventoryTab notebooks={notebooks} />
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            loans={loans}
            notebooks={notebooks}
            notifications={notifications}
          />
        )}

        {activeTab === 'auditoria' && <AuditLogsTab logs={auditLogs} />}
      </main>

      {/* Modal de Sucesso com Protocolo, QR Code e Link de Devolução */}
      {createdLoan && (
        <SuccessProtocolModal
          loan={createdLoan}
          onClose={() => setCreatedLoan(null)}
          onNavigateToReturn={(protocolo) => {
            setCreatedLoan(null);
            setActiveTab('devolucao');
          }}
        />
      )}

      {/* Rodapé Institucional */}
      <footer className="bg-emerald-950 border-t border-emerald-900/80 text-emerald-200/80 py-8 px-4 text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/40 flex items-center justify-center text-emerald-300">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white">
                Faculdade Sírio-Libanês de Ensino e Pesquisa
              </div>
              <div className="text-[11px] text-emerald-300/70">
                Diretoria de Tecnologia da Informação & Operações Acadêmicas
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Sincronização em Tempo Real (Firestore)
            </span>
            <span>•</span>
            <span>Transações Atômicas de Segurança</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">v1.2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
