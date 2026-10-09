import React from 'react';
import {
  Laptop,
  CheckCircle2,
  BarChart3,
  Layers,
  ShieldAlert,
  UserCheck,
  Wrench,
  GraduationCap,
  Sparkles,
  Wifi,
  WifiOff,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface NavbarProps {
  activeTab: 'solicitacao' | 'devolucao' | 'inventario' | 'dashboard' | 'auditoria';
  setActiveTab: (tab: 'solicitacao' | 'devolucao' | 'inventario' | 'dashboard' | 'auditoria') => void;
  openLoansCount: number;
  delayedLoansCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openLoansCount,
  delayedLoansCount,
}) => {
  const { role, setRole, profile, currentUser, signInWithGoogle, logout } = useAuth();
  const { isOnline } = useNetworkStatus();

  return (
    <header className="bg-emerald-950 text-white shadow-lg border-b border-emerald-800/60 sticky top-0 z-40 backdrop-blur-md">
      {/* Offline Banner when disconnected */}
      {!isOnline && (
        <div className="bg-amber-600 text-amber-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-500 shadow-sm animate-pulse">
          <WifiOff className="w-4 h-4 text-amber-950" />
          <span>
            Modo Offline Ativo — Exibindo inventário e logs armazenados em cache local (IndexedDB Firestore). Alterações serão sincronizadas ao reconectar.
          </span>
          <span className="bg-amber-800/20 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-800/40">
            OFFLINE PERSISTENCE ON
          </span>
        </div>
      )}

      {/* Top Banner: Institutional Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 border-b border-emerald-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-900/50">
              <Laptop className="w-6 h-6 text-emerald-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
                  Faculdade Sírio-Libanês
                </span>
                <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-2 py-0.5 rounded-full font-medium border border-emerald-700/50">
                  TI Acadêmica
                </span>
                {/* Offline persistence status indicator pill */}
                <div
                  className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    isOnline
                      ? 'bg-emerald-900/80 text-emerald-300 border-emerald-700/60'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                  title={isOnline ? 'Conexão ativa com persistência offline pronta' : 'Conexão offline - dados servidos pelo cache do Firestore'}
                >
                  {isOnline ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Sincronizado</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-amber-400" />
                      <span>Cache Offline</span>
                    </>
                  )}
                </div>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Central de Empréstimo de Notebooks
              </h1>
            </div>
          </div>

          {/* Role Switcher & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Quick Role Switcher Pill */}
            <div className="flex items-center bg-emerald-900/80 p-1 rounded-xl border border-emerald-700/60 shadow-inner">
              <span className="text-[11px] font-medium text-emerald-300 px-2 hidden md:inline">
                Perfil:
              </span>
              {(['aluno', 'tecnico', 'ADM'] as UserRole[]).map((r) => {
                const isActive = role === r;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      if (r === 'aluno' && activeTab !== 'solicitacao') {
                        setActiveTab('solicitacao');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center space-x-1 ${
                      isActive
                        ? 'bg-emerald-500 text-emerald-950 shadow-sm'
                        : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
                    }`}
                    title={`Alternar para perfil de ${r}`}
                  >
                    {r === 'aluno' && <GraduationCap className="w-3.5 h-3.5" />}
                    {r === 'tecnico' && <Wrench className="w-3.5 h-3.5" />}
                    {r === 'ADM' && <UserCheck className="w-3.5 h-3.5" />}
                    <span className="capitalize">{r === 'ADM' ? 'ADM' : r}</span>
                  </button>
                );
              })}
            </div>

            {/* Google Auth Status */}
            {currentUser ? (
              <div className="hidden sm:flex items-center space-x-2 bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-800">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                  {currentUser.displayName?.charAt(0) || 'U'}
                </div>
                <div className="text-left text-xs">
                  <div className="font-medium text-emerald-100 truncate max-w-[120px]">
                    {currentUser.displayName || currentUser.email}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="text-[11px] text-emerald-300 hover:text-rose-300 underline ml-1"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-700/80 text-emerald-100 text-xs font-medium rounded-lg border border-emerald-600/60 transition shadow-sm"
              >
                <span>Login Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('solicitacao')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'solicitacao'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-200 hover:text-white hover:bg-emerald-900/60'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Solicitar Empréstimo</span>
            <span className="text-[10px] bg-emerald-800/90 text-emerald-200 px-1.5 py-0.2 rounded font-mono">
              Aluno
            </span>
          </button>

          {role === 'ADM' || role === 'tecnico' ? (
            <>
              <button
                onClick={() => setActiveTab('devolucao')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 whitespace-nowrap relative ${
                  activeTab === 'devolucao'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900/60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aba Devolução</span>
                {openLoansCount > 0 && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                      delayedLoansCount > 0
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-emerald-400 text-emerald-950'
                    }`}
                  >
                    {openLoansCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('inventario')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === 'inventario'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Inventário de Notebooks</span>
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900/60'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard (PDF & Excel)</span>
                <span className="text-[10px] bg-emerald-400 text-emerald-950 px-1.5 py-0.2 rounded font-black font-mono">
                  ADM
                </span>
              </button>

              <button
                onClick={() => setActiveTab('auditoria')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === 'auditoria'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-900/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-emerald-300" />
                <span>Logs de Auditoria</span>
                <span className="text-[10px] bg-emerald-400 text-emerald-950 px-1.5 py-0.2 rounded font-black font-mono">
                  ADM
                </span>
              </button>
            </>
          ) : (
            <div className="flex items-center text-xs text-emerald-300/90 px-3 py-2 italic font-medium">
              *Acesso exclusivo ao autoatendimento do Aluno. Alterne o perfil para ADM ou Técnico no topo para visualizar as ferramentas administrativas.
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
