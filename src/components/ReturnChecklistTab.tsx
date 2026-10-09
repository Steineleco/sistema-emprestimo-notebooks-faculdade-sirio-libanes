import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckSquare,
  AlertTriangle,
  Clock,
  User,
  Laptop,
  CheckCircle2,
  FileText,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Filter,
  Check,
  Calendar,
  X,
  Wrench,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Emprestimo, ChecklistDevolucao, NotebookStatus } from '../types';
import { returnLoanTransaction } from '../services/emprestimoService';
import { useAuth } from '../context/AuthContext';

interface ReturnChecklistTabProps {
  loans: Emprestimo[];
}

export const ReturnChecklistTab: React.FC<ReturnChecklistTabProps> = ({ loans }) => {
  const { role, setRole, profile } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('protocolo') || params.get('ra') || '';
      }
    } catch {}
    return '';
  });
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ABERTO' | 'ATRASADO' | 'DEVOLVIDO'>('ABERTO');
  const [qrDetectedNotice, setQrDetectedNotice] = useState<string | null>(null);

  // Devolução modal state
  const [selectedLoan, setSelectedLoan] = useState<Emprestimo | null>(null);
  const [checklist, setChecklist] = useState<ChecklistDevolucao>({
    equipamentoLiga: true,
    carregadorEntregue: true,
    telaIntegra: true,
    tecladoTouchpadOk: true,
    carcacaSemAvarias: true,
    houveDano: false,
    observacoes: '',
  });
  const [tecnicoDevolucao, setTecnicoDevolucao] = useState(
    profile.displayName || 'Técnico Especialista em TI'
  );
  const [observacoes, setObservacoes] = useState('');
  const [destinatarioStatus, setDestinatarioStatus] = useState<NotebookStatus>('GUARDADO');
  const [processingReturn, setProcessingReturn] = useState(false);
  const [returnSuccessMessage, setReturnSuccessMessage] = useState<string | null>(null);
  const [returnErrorMessage, setReturnErrorMessage] = useState<string | null>(null);

  // Auto-detecta parâmetros de retorno presencial via QR Code
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlProtocolo = params.get('protocolo');
        const isFromQr =
          params.get('devolucao') === 'true' ||
          params.get('tab') === 'devolucao' ||
          params.get('origem') === 'qrcode_protocolo';

        if (urlProtocolo) {
          const cleanProto = urlProtocolo.trim();
          setSearchTerm(cleanProto);
          setStatusFilter('ALL');
          setQrDetectedNotice(cleanProto);

          if (loans && loans.length > 0) {
            const matched = loans.find(
              (l) => l.protocolo.toLowerCase() === cleanProto.toLowerCase()
            );
            if (matched && (matched.status === 'ABERTO' || matched.status === 'ATRASADO')) {
              openReturnModal(matched);
            }
          }
        }
      }
    } catch {}
  }, [loans]);

  // Access check for technical role
  if (role === 'aluno') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 shadow-sm">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-700">
            <Wrench className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-amber-950">Acesso Restrito à Equipe Técnica</h2>
          <p className="text-sm text-amber-800 mt-2 max-w-md mx-auto">
            A aba de devolução com checklist e liberação de patrimônio é de uso exclusivo dos técnicos e administradores de TI da Faculdade Sírio-Libanês.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setRole('tecnico')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-md transition"
            >
              Alternar para Perfil de Técnico (Modo Teste)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtragem
  const filteredLoans = loans.filter((loan) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      loan.protocolo.toLowerCase().includes(term) ||
      loan.ra.toLowerCase().includes(term) ||
      loan.nome.toLowerCase().includes(term) ||
      loan.hostname.toLowerCase().includes(term) ||
      loan.email.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ABERTO') return loan.status === 'ABERTO';
    if (statusFilter === 'ATRASADO') return loan.status === 'ATRASADO';
    if (statusFilter === 'DEVOLVIDO') return loan.status === 'DEVOLVIDO';
    return true;
  });

  const openReturnModal = (loan: Emprestimo) => {
    setSelectedLoan(loan);
    setChecklist({
      equipamentoLiga: true,
      carregadorEntregue: true,
      telaIntegra: true,
      tecladoTouchpadOk: true,
      carcacaSemAvarias: true,
      houveDano: false,
      observacoes: '',
    });
    setDestinatarioStatus('GUARDADO');
    setObservacoes('');
    setReturnErrorMessage(null);
  };

  const handleConfirmReturn = async () => {
    if (!selectedLoan) return;

    if (!tecnicoDevolucao.trim()) {
      setReturnErrorMessage('Informe o nome do técnico responsável pelo recebimento.');
      return;
    }

    setProcessingReturn(true);
    setReturnErrorMessage(null);

    try {
      const finalStatus: NotebookStatus =
        checklist.houveDano || !checklist.equipamentoLiga || !checklist.telaIntegra
          ? 'MANUTENCAO'
          : destinatarioStatus;

      await returnLoanTransaction({
        protocolo: selectedLoan.protocolo,
        checklist,
        tecnicoDevolucao: tecnicoDevolucao.trim(),
        observacoes,
        destinatarioStatus: finalStatus,
      });

      setReturnSuccessMessage(
        `Devolução do protocolo ${selectedLoan.protocolo} confirmada com sucesso! O notebook ${selectedLoan.hostname} foi retornado para o status [${finalStatus}].`
      );
      setSelectedLoan(null);
      setTimeout(() => setReturnSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Erro ao processar devolução:', err);
      setReturnErrorMessage(err?.message || 'Erro ao registrar devolução.');
    } finally {
      setProcessingReturn(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      {/* Header técnico */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-teal-800/80 px-3 py-1 rounded-full text-xs font-medium text-teal-200 mb-2 border border-teal-700/50">
              <CheckSquare className="w-3.5 h-3.5 text-teal-300" />
              <span>Módulo Técnico — Balcão de Recepção</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Devolução de Notebooks & Checklist
            </h2>
            <p className="text-teal-100 text-sm mt-1 max-w-xl">
              Localize o empréstimo pelo protocolo ou RA, preencha o checklist de integridade e devolva o equipamento ao inventário em tempo real.
            </p>
          </div>

          <div className="bg-teal-950/70 p-3.5 rounded-xl border border-teal-800 text-xs">
            <span className="text-teal-300 font-semibold block mb-1">Técnico em Atendimento:</span>
            <span className="font-bold text-white text-sm">{profile.displayName}</span>
          </div>
        </div>
      </div>

      {/* Sucesso / Alerta */}
      {returnSuccessMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center space-x-3 text-emerald-900 text-sm shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <span className="font-medium">{returnSuccessMessage}</span>
        </div>
      )}

      {/* Banner de Atendimento Presencial via QR Code */}
      {qrDetectedNotice && (
        <div className="mb-6 p-4 bg-teal-50 border-2 border-teal-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-teal-950 text-sm shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>⚡ Atendimento Presencial Carregado via QR Code</span>
                <span className="text-[10px] bg-teal-200 text-teal-900 px-2 py-0.5 rounded-full font-mono uppercase">
                  Automático
                </span>
              </div>
              <div className="text-xs text-teal-800 mt-0.5">
                Protocolo identificado: <span className="font-mono font-bold">{qrDetectedNotice}</span>. Realize a inspeção física e confirme o recebimento do notebook.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setQrDetectedNotice(null);
              setSearchTerm('');
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('protocolo');
                url.searchParams.delete('devolucao');
                url.searchParams.delete('ra');
                url.searchParams.delete('hostname');
                url.searchParams.delete('nome');
                url.searchParams.delete('curso');
                url.searchParams.delete('origem');
                window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
              } catch {}
            }}
            className="text-xs font-bold px-3 py-1.5 bg-white hover:bg-teal-100 text-teal-800 rounded-xl border border-teal-200 shadow-sm transition whitespace-nowrap cursor-pointer"
          >
            Limpar Filtro
          </button>
        </div>
      )}

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Protocolo (NB-...), RA, Nome ou Hostname..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
          />
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center space-x-1 w-full md:w-auto overflow-x-auto">
          {(
            [
              { key: 'ABERTO', label: 'Em Aberto' },
              { key: 'ATRASADO', label: 'Atrasados' },
              { key: 'DEVOLVIDO', label: 'Devolvidos' },
              { key: 'ALL', label: 'Todos' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem de Empréstimos */}
      <div className="space-y-3">
        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Laptop className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <h3 className="font-bold text-slate-700 text-base">Nenhum empréstimo encontrado</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tente alterar os termos da busca ou selecione outro filtro de status.
            </p>
          </div>
        ) : (
          filteredLoans.map((loan) => {
            const isLate = loan.status === 'ATRASADO';
            const isFinished = loan.status === 'DEVOLVIDO';

            return (
              <div
                key={loan.id}
                className={`bg-white rounded-2xl p-5 border transition-all duration-150 shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isLate
                    ? 'border-rose-300 bg-rose-50/20'
                    : isFinished
                    ? 'border-slate-200 bg-slate-50/40 opacity-80'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-slate-900 text-base">
                      {loan.protocolo}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isLate
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                          : isFinished
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                    >
                      {loan.status}
                    </span>
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      💻 {loan.hostname}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <strong>Aluno:</strong> {loan.nome} (RA: {loan.ra})
                    </span>
                    <span>
                      <strong>Curso:</strong> {loan.curso}
                    </span>
                    <span>
                      <strong>WhatsApp:</strong> {loan.whatsapp}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <span>
                      <strong>Retirada:</strong> {new Date(loan.dataSaida).toLocaleString('pt-BR')}
                    </span>
                    <span className={isLate ? 'text-rose-700 font-bold' : ''}>
                      <strong>Prev. Devolução:</strong>{' '}
                      {new Date(loan.dataPrevistaDevolucao).toLocaleString('pt-BR')}
                    </span>
                    {loan.dataDevolucao && (
                      <span className="text-emerald-700 font-medium">
                        <strong>Devolvido em:</strong>{' '}
                        {new Date(loan.dataDevolucao).toLocaleString('pt-BR')} (por {loan.tecnicoDevolucao})
                      </span>
                    )}
                  </div>
                </div>

                {/* Botão de ação */}
                <div className="shrink-0 flex items-center space-x-2">
                  {!isFinished ? (
                    <button
                      onClick={() => openReturnModal(loan)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-sm ${
                        isLate
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                          : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-700/30'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Fazer Devolução</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Finalizado
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Devolução com Checklist */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Checklist Técnico
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Confirmação de Devolução — {selectedLoan.protocolo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLoan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Empréstimo */}
            <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-400 block">Aluno:</span>
                <strong className="text-slate-800">{selectedLoan.nome}</strong> (RA: {selectedLoan.ra})
              </div>
              <div>
                <span className="text-slate-400 block">Equipamento:</span>
                <strong className="text-emerald-700 font-mono text-sm">{selectedLoan.hostname}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Data Retirada:</span>
                <span>{new Date(selectedLoan.dataSaida).toLocaleString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Previsão:</span>
                <span className={selectedLoan.status === 'ATRASADO' ? 'text-rose-600 font-bold' : ''}>
                  {new Date(selectedLoan.dataPrevistaDevolucao).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {returnErrorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs">
                {returnErrorMessage}
              </div>
            )}

            {/* Checklist de itens */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Itens de Verificação Obrigatórios</span>
              </h4>

              <div className="space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.equipamentoLiga}
                    onChange={(e) =>
                      setChecklist({ ...checklist, equipamentoLiga: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">
                    1. Equipamento liga normalmente e inicializa o sistema operacional
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.carregadorEntregue}
                    onChange={(e) =>
                      setChecklist({ ...checklist, carregadorEntregue: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">
                    2. Fonte de alimentação original e cabo de força entregues
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.telaIntegra}
                    onChange={(e) =>
                      setChecklist({ ...checklist, telaIntegra: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">
                    3. Tela sem trincos, riscos profundos ou manchas de pixel
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.tecladoTouchpadOk}
                    onChange={(e) =>
                      setChecklist({ ...checklist, tecladoTouchpadOk: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">
                    4. Teclado, touchpad, webcam e portas USB operacionais
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.carcacaSemAvarias}
                    onChange={(e) =>
                      setChecklist({ ...checklist, carcacaSemAvarias: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">
                    5. Carcaça íntegra, limpa e com dobradiças firmes
                  </span>
                </label>

                {/* Flag de avaria */}
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg bg-rose-50/60 border border-rose-200">
                    <input
                      type="checkbox"
                      checked={checklist.houveDano}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChecklist({ ...checklist, houveDano: checked });
                        if (checked) {
                          setDestinatarioStatus('MANUTENCAO');
                        } else {
                          setDestinatarioStatus('GUARDADO');
                        }
                      }}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    <span className="font-bold text-rose-900">
                      Reportar avaria ou necessidade de reparo técnico (enviar equipamento para MANUTENÇÃO)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Destino do Notebook */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Destino do Notebook após Devolução:
              </label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setDestinatarioStatus('GUARDADO')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    destinatarioStatus === 'GUARDADO'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>GUARDADO (Disponível para novos empréstimos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDestinatarioStatus('MANUTENCAO')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    destinatarioStatus === 'MANUTENCAO'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>MANUTENCAO (Encaminhar para laboratório)</span>
                </button>
              </div>
            </div>

            {/* Técnico e Observações */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Técnico Responsável pelo Recebimento *
                </label>
                <input
                  type="text"
                  required
                  value={tecnicoDevolucao}
                  onChange={(e) => setTecnicoDevolucao(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Observações da Devolução (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Devolvido com bateria em 80%, capa protetora íntegra"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Botões do Modal */}
            <div className="mt-6 flex space-x-3">
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="w-1/3 py-2.5 rounded-xl border border-slate-200 font-semibold text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={processingReturn}
                className="w-2/3 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20"
              >
                {processingReturn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gravando devolução no Firestore...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Confirmar Devolução e Atualizar Notebook</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
