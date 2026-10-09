import React, { useState } from 'react';
import {
  Laptop,
  Plus,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Trash2,
  ShieldCheck,
  Loader2,
  Wifi,
  WifiOff,
  Database,
} from 'lucide-react';
import { Notebook, NotebookStatus } from '../types';
import {
  saveNotebook,
  updateNotebookStatus,
  deleteNotebook,
  seedInitialNotebooksIfEmpty,
} from '../services/notebookService';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface NotebookInventoryTabProps {
  notebooks: Notebook[];
}

export const NotebookInventoryTab: React.FC<NotebookInventoryTabProps> = ({ notebooks }) => {
  const { role } = useAuth();
  const isAdmin = role === 'ADM';
  const { isOnline } = useNetworkStatus();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  // Modal para cadastrar / editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHostname, setEditingHostname] = useState<string | null>(null);
  const [formHostname, setFormHostname] = useState('');
  const [formMarca, setFormMarca] = useState('Dell');
  const [formModelo, setFormModelo] = useState('Latitude 3420 (i5, 16GB)');
  const [formNumeroSerie, setFormNumeroSerie] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formStatus, setFormStatus] = useState<NotebookStatus>('GUARDADO');
  const [formValidado, setFormValidado] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filtragem
  const filteredNotebooks = notebooks.filter((n) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      n.hostname.toLowerCase().includes(term) ||
      n.marca.toLowerCase().includes(term) ||
      n.modelo.toLowerCase().includes(term) ||
      (n.numeroSerie && n.numeroSerie.toLowerCase().includes(term));

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return n.status === statusFilter;
  });

  const openCreateModal = () => {
    if (!isAdmin) {
      alert('Acesso negado: Somente o Administrador Geral (ADM) pode cadastrar novos equipamentos no inventário.');
      return;
    }
    setEditingHostname(null);
    const nextIndex = notebooks.length + 1;
    setFormHostname(`FSL-NB-${String(nextIndex).padStart(2, '0')}`);
    setFormMarca('Dell');
    setFormModelo('Latitude 3420 (i5, 16GB)');
    setFormNumeroSerie('');
    setFormObservacoes('Bancada TI - Bloco Acadêmico');
    setFormStatus('GUARDADO');
    setFormValidado(true);
    setIsModalOpen(true);
  };

  const openEditModal = (n: Notebook) => {
    if (!isAdmin) {
      alert('Acesso negado: Somente o Administrador Geral (ADM) pode editar equipamentos no inventário.');
      return;
    }
    setEditingHostname(n.hostname);
    setFormHostname(n.hostname);
    setFormMarca(n.marca);
    setFormModelo(n.modelo);
    setFormNumeroSerie(n.numeroSerie || '');
    setFormObservacoes(n.observacoes || '');
    setFormStatus(n.status);
    setFormValidado(n.validado);
    setIsModalOpen(true);
  };

  const handleSaveNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Acesso restrito ao perfil Administrador (ADM).');
      return;
    }
    setSaving(true);
    try {
      await saveNotebook({
        hostname: formHostname.trim().toUpperCase(),
        marca: formMarca.trim(),
        modelo: formModelo.trim(),
        numeroSerie: formNumeroSerie.trim(),
        observacoes: formObservacoes.trim(),
        status: formStatus,
        validado: formValidado,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar notebook:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (hostname: string, newStatus: NotebookStatus) => {
    if (!isAdmin) {
      alert('Acesso restrito: Somente o Administrador Geral (ADM) pode alterar o status de equipamentos.');
      return;
    }
    try {
      await updateNotebookStatus(hostname, newStatus);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleSeedNotebooks = async () => {
    if (!isAdmin) {
      alert('Acesso restrito ao perfil Administrador (ADM).');
      return;
    }
    setSeeding(true);
    setSeedNotice(null);
    try {
      const count = await seedInitialNotebooksIfEmpty();
      if (count > 0) {
        setSeedNotice(`Sucesso! ${count} notebooks institucionais cadastrados.`);
      } else {
        setSeedNotice('A base já possui equipamentos cadastrados.');
      }
      setTimeout(() => setSeedNotice(null), 4000);
    } catch (err) {
      console.error('Erro ao seedar notebooks:', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Offline Persistence Notification Banner */}
      {!isOnline && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Modo Offline (Persistência Firestore Ativa):</span> Você está visualizando o inventário atual mantido em cache local. Equipamentos disponíveis e manutenções podem ser consultados normalmente sem internet.
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded-md font-mono text-[10px] font-bold">
            CACHE LOCAL ({notebooks.length} ITENS)
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-800/60 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 mb-2 border border-emerald-700/50">
            <Laptop className="w-3.5 h-3.5" />
            <span>Gestão de Ativos de TI</span>
            <span className="text-[10px] bg-emerald-900/90 text-emerald-200 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 border border-emerald-600/40">
              <Database className="w-2.5 h-2.5" /> Persistência Offline
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Inventário de Equipamentos
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Cadastro, validação técnica e acompanhamento do estado físico e operacional de cada notebook. Disponível online e offline via cache persistente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notebooks.length === 0 && (
            <button
              onClick={handleSeedNotebooks}
              disabled={seeding}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs flex items-center space-x-1.5 transition shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{seeding ? 'Carregando...' : 'Popular com 10 Notebooks Iniciais'}</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-md shadow-emerald-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Notebook</span>
          </button>
        </div>
      </div>

      {seedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{seedNotice}</span>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por hostname, marca, modelo..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { key: 'ALL', label: `Todos (${notebooks.length})` },
            {
              key: 'GUARDADO',
              label: `Guardados (${notebooks.filter((n) => n.status === 'GUARDADO').length})`,
            },
            {
              key: 'EMPRESTADO',
              label: `Emprestados (${notebooks.filter((n) => n.status === 'EMPRESTADO').length})`,
            },
            {
              key: 'MANUTENCAO',
              label: `Manutenção (${notebooks.filter((n) => n.status === 'MANUTENCAO').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Notebooks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotebooks.map((n) => {
          const isAvailable = n.status === 'GUARDADO';
          const isLoaned = n.status === 'EMPRESTADO';
          const isMaintenance = n.status === 'MANUTENCAO';

          return (
            <div
              key={n.hostname}
              className={`bg-white rounded-2xl p-5 border transition-all duration-150 shadow-sm hover:shadow-md flex flex-col justify-between ${
                isAvailable
                  ? 'border-emerald-200'
                  : isLoaned
                  ? 'border-blue-200'
                  : 'border-amber-300 bg-amber-50/20'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-base font-black text-slate-900">
                      {n.hostname}
                    </span>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">
                      {n.marca} {n.modelo}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isAvailable
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isLoaned
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {n.status}
                  </span>
                </div>

                {n.numeroSerie && (
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    S/N: {n.numeroSerie}
                  </div>
                )}

                {n.observacoes && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-3 border border-slate-100">
                    {n.observacoes}
                  </div>
                )}

                <div className="mt-3 flex items-center space-x-2 text-[11px] text-slate-500">
                  <ShieldCheck
                    className={`w-3.5 h-3.5 ${
                      n.validado ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                  />
                  <span>
                    {n.validado ? 'Validado pela Engenharia de TI' : 'Pendente de validação'}
                  </span>
                </div>
              </div>

              {/* Ações rápidas */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1">
                  {n.status !== 'GUARDADO' && (
                    <button
                      onClick={() => handleQuickStatusChange(n.hostname, 'GUARDADO')}
                      className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-[11px] border border-emerald-200"
                      title="Voltar para GUARDADO"
                    >
                      Liberar (GUARDADO)
                    </button>
                  )}
                  {n.status !== 'MANUTENCAO' && (
                    <button
                      onClick={() => handleQuickStatusChange(n.hostname, 'MANUTENCAO')}
                      className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-[11px] border border-amber-200"
                      title="Enviar para Manutenção"
                    >
                      Manutenção
                    </button>
                  )}
                </div>

                <button
                  onClick={() => openEditModal(n)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  title="Editar dados"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingHostname ? `Editar ${editingHostname}` : 'Cadastrar Notebook'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotebook} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hostname *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingHostname)}
                  value={formHostname}
                  onChange={(e) => setFormHostname(e.target.value.toUpperCase())}
                  placeholder="Ex: FSL-NB-11"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marca *</label>
                  <input
                    type="text"
                    required
                    value={formMarca}
                    onChange={(e) => setFormMarca(e.target.value)}
                    placeholder="Dell, Lenovo..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    value={formModelo}
                    onChange={(e) => setFormModelo(e.target.value)}
                    placeholder="Latitude 3420"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Número de Série (Patrimônio)
                </label>
                <input
                  type="text"
                  value={formNumeroSerie}
                  onChange={(e) => setFormNumeroSerie(e.target.value)}
                  placeholder="BR-DEL-..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Inicial *</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as NotebookStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="GUARDADO">GUARDADO (Disponível)</option>
                  <option value="EMPRESTADO">EMPRESTADO</option>
                  <option value="MANUTENCAO">MANUTENCAO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Localização física, detalhes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValidado}
                    onChange={(e) => setFormValidado(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-slate-700 font-medium">
                    Validado e Aprovado pela equipe de TI
                  </span>
                </label>
              </div>

              <div className="pt-4 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {saving ? 'Salvando...' : 'Salvar Notebook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
