import React, { useState, useEffect } from 'react';
import {
  Laptop,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  ShieldCheck,
  Send,
  Loader2,
  Sparkles,
  Ban,
  ExternalLink,
  QrCode,
  Camera,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Notebook, Emprestimo, LoanFormData } from '../types';
import {
  subscribeAvailableNotebooks,
  subscribeAllNotebooks,
  INITIAL_NOTEBOOKS,
} from '../services/notebookService';
import {
  createLoanTransaction,
  checkStudentActiveLoan,
  checkStudentAlreadySubmitted,
} from '../services/emprestimoService';
import {
  REGISTERED_STUDENTS,
  findStudentByName,
  findStudentByRa,
} from '../data/studentRegistry';
import { useAuth } from '../context/AuthContext';
import { StudentQrCodeModal, QrCodeLoanData } from './StudentQrCodeModal';
import { LiveAvailabilityCard } from './LiveAvailabilityCard';

interface StudentLoanFormProps {
  onSuccess: (loan: Emprestimo) => void;
}

const COURSES = [
  'Medicina',
  'Enfermagem',
  'Biomedicina',
  'Fisioterapia',
  'Farmácia',
  'Psicologia',
  'Nutrição',
  'Gestão Hospitalar',
  'Tecnologia em Saúde & IA',
  'Residência Médica / Pós-Graduação',
];

const SEMESTERS = [
  '1º Semestre',
  '2º Semestre',
  '3º Semestre',
  '4º Semestre',
  '5º Semestre',
  '6º Semestre',
  '7º Semestre',
  '8º Semestre',
  '9º Semestre',
  '10º Semestre',
  '11º Semestre',
  '12º Semestre',
];

const QUICK_PROFILES = [
  {
    nome: 'Mariana Albuquerque Costa',
    ra: '20241088420001',
    curso: 'Medicina',
    semestre: '5º Semestre',
    email: 'mariana.costa@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98123-4567',
    hostname: 'FSL-NB-01',
  },
  {
    nome: 'Lucas Henrique Silva',
    ra: '20241045810002',
    curso: 'Medicina',
    semestre: '3º Semestre',
    email: 'lucas.silva@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98765-4321',
    hostname: 'FSL-NB-03',
  },
  {
    nome: 'Carolina Mendes de Oliveira',
    ra: '20231099200003',
    curso: 'Enfermagem',
    semestre: '6º Semestre',
    email: 'carolina.mendes@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 97654-3210',
    hostname: 'FSL-NB-05',
  },
  {
    nome: 'Gabriel Ramos Vasconcelos',
    ra: '20251022140004',
    curso: 'Biomedicina',
    semestre: '2º Semestre',
    email: 'gabriel.ramos@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 99887-6543',
    hostname: 'FSL-NB-02',
  },
];

function maskWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const StudentLoanForm: React.FC<StudentLoanFormProps> = ({ onSuccess }) => {
  const { profile, setRole } = useAuth();

  // Data atual (sempre a data atual para o empréstimo)
  const currentDateFormatted = new Date().toLocaleDateString('pt-BR');
  const currentDateIso = new Date().toISOString();

  // Notebooks disponíveis e catálogo completo cadastrado
  const [availableNotebooks, setAvailableNotebooks] = useState<Notebook[]>([]);
  const [allRegisteredNotebooks, setAllRegisteredNotebooks] = useState<Notebook[]>(
    INITIAL_NOTEBOOKS.map((nb) => ({ ...nb, id: nb.hostname }))
  );
  const [loadingNotebooks, setLoadingNotebooks] = useState(true);

  // Estados dos 9 campos solicitados pelo usuário
  const [nome, setNome] = useState('');
  const [ra, setRa] = useState(''); // 14 caracteres numéricos
  const [curso, setCurso] = useState(COURSES[0]);
  const [semestre, setSemestre] = useState('3º Semestre');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [hostname, setHostname] = useState('');
  const [hostnameMode, setHostnameMode] = useState<'dropdown' | 'manual'>('dropdown');
  const [statusEmprestimo] = useState('EMPRESTADO'); // Status(Emprestimo)

  // Previsão de Devolução & Atendimento
  const [dataPrevistaDevolucao, setDataPrevistaDevolucao] = useState('');
  const [tecnicoSaida, setTecnicoSaida] = useState('Central TI - Atendimento Sírio-Libanês');
  const [termoAceito, setTermoAceito] = useState(true);

  // QR Code Integrado & Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [inlineQrCodeUrl, setInlineQrCodeUrl] = useState<string>('');
  const [qrAutofillNotice, setQrAutofillNotice] = useState<string | null>(null);
  const [showQrCard, setShowQrCard] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Status de validação, bloqueio de 1 preenchimento por aluno e submissão
  const [checkingActiveLoan, setCheckingActiveLoan] = useState(false);
  const [activeLoanBlock, setActiveLoanBlock] = useState<Emprestimo | null>(null);
  const [alreadySubmittedBlock, setAlreadySubmittedBlock] = useState<Emprestimo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ao alterar o nome completo, preenche automaticamente os demais campos com aluno cadastrado
  const handleNameChange = (val: string) => {
    setNome(val);
    const matched = findStudentByName(val);
    if (matched) {
      setRa(matched.ra); // 14 dígitos
      setCurso(matched.curso);
      setSemestre(matched.semestre);
      setEmail(matched.email);
      setWhatsapp(matched.whatsapp);
      if (matched.notebookPadrao && !hostname) {
        setHostname(matched.notebookPadrao);
      }
      setQrAutofillNotice(`Dados de ${matched.nome} preenchidos automaticamente com base no Nome Completo!`);
      setTimeout(() => setQrAutofillNotice(null), 5000);
    }
  };

  // Auto-preenchimento por parâmetros de URL ao carregar via QR Code
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autofill') === 'true' || params.get('nome') || params.get('ra')) {
        if (params.get('nome')) {
          const urlNome = params.get('nome')!;
          setNome(urlNome);
          const matched = findStudentByName(urlNome);
          if (matched && !params.get('ra')) {
            setRa(matched.ra);
            setCurso(matched.curso);
            setSemestre(matched.semestre);
            setEmail(matched.email);
            setWhatsapp(matched.whatsapp);
          }
        }
        if (params.get('ra')) setRa(params.get('ra')!.replace(/\D/g, '').slice(0, 14));
        if (params.get('curso')) setCurso(params.get('curso')!);
        if (params.get('semestre')) setSemestre(params.get('semestre')!);
        if (params.get('email')) setEmail(params.get('email')!);
        if (params.get('whatsapp')) setWhatsapp(params.get('whatsapp')!);
        if (params.get('hostname')) {
          setHostname(params.get('hostname')!);
          setHostnameMode('manual');
        }
        setQrAutofillNotice('Formulário preenchido automaticamente via QR Code!');
        setTimeout(() => setQrAutofillNotice(null), 6000);
      }
    } catch {}
  }, []);

  // 1. Escuta notebooks GUARDADO e TODOS os notebooks cadastrados via onSnapshot
  useEffect(() => {
    setLoadingNotebooks(true);
    const unsubscribeAvailable = subscribeAvailableNotebooks(
      (notebooks) => {
        setAvailableNotebooks(notebooks);
        setLoadingNotebooks(false);
        if (notebooks.length > 0 && !hostname) {
          setHostname(notebooks[0].hostname);
        }
      },
      (error) => {
        console.error('Falha ao sincronizar notebooks:', error);
        setLoadingNotebooks(false);
      }
    );

    const unsubscribeAll = subscribeAllNotebooks(
      (allList) => {
        if (allList.length > 0) {
          setAllRegisteredNotebooks(allList);
        }
      },
      (error) => {
        console.warn('Aviso ao sincronizar catálogo de notebooks:', error);
      }
    );

    return () => {
      unsubscribeAvailable();
      unsubscribeAll();
    };
  }, []);

  // Preencher valor padrão para data de devolução (Hoje às 18:00 ou amanhã)
  useEffect(() => {
    if (!dataPrevistaDevolucao) {
      const today = new Date();
      today.setHours(18, 0, 0, 0);
      if (new Date().getHours() >= 17) {
        today.setDate(today.getDate() + 1);
      }
      setDataPrevistaDevolucao(today.toISOString().slice(0, 16));
    }
  }, [dataPrevistaDevolucao]);

  // Gera o QR Code inline para visualização e auto-preenchimento
  useEffect(() => {
    const targetNome = nome || QUICK_PROFILES[0].nome;
    const targetRa = ra || QUICK_PROFILES[0].ra;
    const targetCurso = curso || QUICK_PROFILES[0].curso;
    const targetSemestre = semestre || QUICK_PROFILES[0].semestre;
    const targetEmail = email || QUICK_PROFILES[0].email;
    const targetWhatsapp = whatsapp || QUICK_PROFILES[0].whatsapp;
    const targetHostname = hostname || QUICK_PROFILES[0].hostname;

    const origin = window.location.origin;
    const params = new URLSearchParams({
      aluno: 'true',
      autofill: 'true',
      nome: targetNome,
      ra: targetRa,
      curso: targetCurso,
      semestre: targetSemestre,
      hostname: targetHostname,
      email: targetEmail,
      whatsapp: targetWhatsapp,
      status: 'EMPRESTADO',
      dataEmprestimo: currentDateFormatted,
    });

    const payloadUrl = `${origin}/?${params.toString()}`;

    QRCode.toDataURL(payloadUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#064e3b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setInlineQrCodeUrl(url))
      .catch((err) => console.error('Erro ao gerar QR Code inline:', err));
  }, [nome, ra, curso, semestre, email, whatsapp, hostname, currentDateFormatted]);

  // 2. Validação em tempo real: checar regra de 1x por aluno e empréstimo ativo
  useEffect(() => {
    const cleanRa = ra.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    if (cleanRa.length === 14 || (cleanEmail.includes('@') && cleanEmail.endsWith('@faculdadesiriolibanes.org.br'))) {
      let isMounted = true;
      setCheckingActiveLoan(true);

      const timer = setTimeout(async () => {
        try {
          // Checar se o aluno já preencheu 1 vez
          const alreadySubmitted = await checkStudentAlreadySubmitted(cleanRa, cleanEmail, nome);
          if (!isMounted) return;
          if (alreadySubmitted) {
            setAlreadySubmittedBlock(alreadySubmitted);
          } else {
            const localFlag = localStorage.getItem(`aluno_submetido_${cleanRa}`);
            if (localFlag) {
              setAlreadySubmittedBlock({
                id: 'local',
                protocolo: localStorage.getItem(`aluno_ultimo_protocolo_${cleanRa}`) || 'Registrado',
                nome,
                ra: cleanRa,
                curso,
                semestre,
                email,
                whatsapp,
                hostname,
                dataSaida: new Date().toISOString(),
                dataPrevistaDevolucao: new Date().toISOString(),
                status: 'ABERTO',
                tecnicoSaida,
              });
            } else {
              setAlreadySubmittedBlock(null);
            }
          }

          // Checar empréstimo ativo
          const active = await checkStudentActiveLoan(cleanRa, cleanEmail);
          if (isMounted) {
            setActiveLoanBlock(active);
          }
        } catch (err) {
          console.warn('Erro ao verificar situação do aluno:', err);
        } finally {
          if (isMounted) {
            setCheckingActiveLoan(false);
          }
        }
      }, 350);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else {
      setActiveLoanBlock(null);
      setAlreadySubmittedBlock(null);
    }
  }, [ra, email, nome]);

  // Regras de validação em tempo real (14 caracteres numéricos no RA)
  const isEmailValid = email.trim().toLowerCase().endsWith('@faculdadesiriolibanes.org.br');
  const isRaValid = /^\d{14}$/.test(ra.replace(/\D/g, ''));
  const isWhatsappValid = whatsapp.replace(/\D/g, '').length >= 10;
  const isNomeValid = nome.trim().length >= 3;
  const isFormValid =
    isNomeValid &&
    isRaValid &&
    isEmailValid &&
    isWhatsappValid &&
    Boolean(hostname) &&
    Boolean(dataPrevistaDevolucao) &&
    termoAceito &&
    !alreadySubmittedBlock &&
    !activeLoanBlock &&
    !checkingActiveLoan;

  // Aplica dados de um preset de estudante
  const handleApplyPresetProfile = (p: (typeof QUICK_PROFILES)[0]) => {
    setNome(p.nome);
    setRa(p.ra);
    setEmail(p.email);
    setWhatsapp(p.whatsapp);
    setCurso(p.curso);
    setSemestre(p.semestre);
    // Se o notebook do preset estiver disponível na lista suspensa, mantemos dropdown, senão manual
    const existsInAvailable = availableNotebooks.some((nb) => nb.hostname === p.hostname);
    if (existsInAvailable) {
      setHostname(p.hostname);
      setHostnameMode('dropdown');
    } else if (availableNotebooks.length > 0) {
      setHostname(availableNotebooks[0].hostname);
      setHostnameMode('dropdown');
    } else {
      setHostname(p.hostname);
      setHostnameMode('manual');
    }

    setQrAutofillNotice(`Dados do perfil ${p.nome} preenchidos automaticamente!`);
    setTimeout(() => setQrAutofillNotice(null), 5000);
  };

  // Preenchimento automático acionado pelo QR Code
  const handleApplyQrData = (data: QrCodeLoanData) => {
    setNome(data.nome);
    setRa(data.ra);
    setCurso(data.curso);
    setSemestre(data.semestre);
    setEmail(data.email);
    setWhatsapp(data.whatsapp);
    setHostname(data.hostname);

    const existsInAvailable = availableNotebooks.some((nb) => nb.hostname === data.hostname);
    if (existsInAvailable) {
      setHostnameMode('dropdown');
    } else {
      setHostnameMode('manual');
    }

    setQrAutofillNotice(
      `Dados do aluno ${data.nome} (RA ${data.ra}) e notebook ${data.hostname} preenchidos automaticamente com sucesso via QR Code!`
    );
    setTimeout(() => setQrAutofillNotice(null), 6000);
  };

  // Copia o link codificado com os 9 campos
  const handleCopyAutofillLink = async () => {
    try {
      const origin = window.location.origin;
      const params = new URLSearchParams({
        aluno: 'true',
        autofill: 'true',
        nome: nome || QUICK_PROFILES[0].nome,
        ra: ra || QUICK_PROFILES[0].ra,
        curso: curso || QUICK_PROFILES[0].curso,
        semestre: semestre || QUICK_PROFILES[0].semestre,
        hostname: hostname || QUICK_PROFILES[0].hostname,
        email: email || QUICK_PROFILES[0].email,
        whatsapp: whatsapp || QUICK_PROFILES[0].whatsapp,
        status: 'EMPRESTADO',
        dataEmprestimo: currentDateFormatted,
      });
      await navigator.clipboard.writeText(`${origin}/?${params.toString()}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  // Preset rápido de devolução
  const applyPresetTime = (hoursFromNow: number) => {
    const d = new Date();
    d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000);
    setDataPrevistaDevolucao(d.toISOString().slice(0, 16));
  };

  // Submissão com transação atômica
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isFormValid) {
      if (!isEmailValid) setErrorMessage('O e-mail deve ser institucional: @faculdadesiriolibanes.org.br');
      else if (!isRaValid) setErrorMessage('O RA deve conter exatamente 10 dígitos numéricos.');
      else if (!isWhatsappValid) setErrorMessage('Informe um WhatsApp válido com DDD.');
      else if (activeLoanBlock) setErrorMessage('Não é permitido solicitar novo notebook enquanto houver empréstimo em aberto.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: LoanFormData = {
        nome,
        ra: ra.replace(/\D/g, ''),
        curso,
        semestre,
        email: email.trim().toLowerCase(),
        whatsapp,
        hostname,
        dataPrevistaDevolucao: new Date(dataPrevistaDevolucao).toISOString(),
        tecnicoSaida,
        termoAceito,
      };

      const loan = await createLoanTransaction(payload, profile.uid);
      onSuccess(loan);
    } catch (err: any) {
      console.error('Falha ao criar empréstimo:', err);
      setErrorMessage(err?.message || 'Ocorreu um erro ao processar o empréstimo. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Header Institucional com Atalho de QR Code */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-700/60 px-3 py-1 rounded-full text-xs font-medium text-emerald-200 mb-2 border border-emerald-600/40">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Aba Aluno • Solicitação de Equipamento Acadêmico</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Empréstimo de Notebook
            </h2>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              Retire seu notebook na Central de TI com validação em tempo real ou preencha instantaneamente via QR Code.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="text-xs bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-lg border border-emerald-200 cursor-pointer"
              title="Abrir gerador e scanner de QR Code para preenchimento automático dos 9 campos"
            >
              <QrCode className="w-4 h-4 stroke-[2.5]" />
              <span>QR Code (Preenchimento dos 9 Campos)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Componente de Status ao Vivo: Disponibilidade na Unidade (Unidade vs. Total) */}
      <LiveAvailabilityCard
        notebooks={allRegisteredNotebooks}
        loading={loadingNotebooks}
        unitName="Central de TI — Faculdade Sírio-Libanês"
        selectedHostname={hostname}
        onSelectHostname={(selectedHost) => {
          setHostname(selectedHost);
          setHostnameMode('dropdown');
        }}
      />

      {/* PAINEL OFICIAL DE QR CODE (NA ABA ALUNO) COM AUTO-PREENCHIMENTO DOS 9 CAMPOS */}
      <div className="mb-6 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-800/60 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-4 mb-4 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center font-black shadow-md">
              <QrCode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/90 px-2 py-0.5 rounded border border-emerald-700/60">
                  Aba Aluno • Auto-Preenchimento
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-800/40 px-2 py-0.5 rounded">
                  9 Campos Oficiais
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                QR Code de Preenchimento Automático
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowQrCard(!showQrCard)}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-800/50 transition text-xs flex items-center space-x-1 cursor-pointer"
            >
              <span>{showQrCard ? 'Recolher' : 'Expandir QR Code'}</span>
              {showQrCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showQrCard && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Visual do QR Code com Borda de Alta Resolução */}
            <div className="md:col-span-4 flex flex-col items-center text-center">
              <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-emerald-400">
                {inlineQrCodeUrl ? (
                  <img
                    src={inlineQrCodeUrl}
                    alt="QR Code de Empréstimo de Notebook"
                    className="w-40 h-40 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">
                    Gerando QR Code...
                  </div>
                )}
              </div>
              <span className="mt-2 text-[11px] font-mono text-emerald-300 font-semibold">
                Status: EMPRESTADO • {currentDateFormatted}
              </span>
            </div>

            {/* Informações dos 9 Campos & Ações Imediatas */}
            <div className="md:col-span-8 space-y-3 text-xs">
              <div className="text-emerald-100 text-[12px] leading-relaxed">
                Este QR Code codifica todos os <strong className="text-white">9 campos essenciais</strong> do empréstimo para preenchimento instantâneo no formulário da Faculdade Sírio-Libanês:
              </div>

              {/* Grid de Badges dos 9 Campos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">1. Nome Completo</span>
                </div>
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">2. Data Atual ({currentDateFormatted})</span>
                </div>
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">3. RA (10 dígitos)</span>
                </div>
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">4. Curso</span>
                </div>
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">5. Semestre</span>
                </div>
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <Laptop className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">6. F ou H (Lista/Manual)</span>
                </div>
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">7. Email Sírio-Libanês</span>
                </div>
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">8. WhatsApp</span>
                </div>
                <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/50 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">9. Status: EMPRESTADO</span>
                </div>
              </div>

              {/* Botões de Ação Imediata no Card */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPresetProfile(QUICK_PROFILES[0])}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md cursor-pointer"
                  title="Aplica todos os 9 campos diretamente no formulário abaixo"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Preencher Formulário com Este QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-2 bg-emerald-800/80 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 border border-emerald-600/50 cursor-pointer"
                  title="Abre o leitor de câmera, gerador de etiquetas e importador"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Escanear Câmera / Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAutofillLink}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-emerald-100 font-medium rounded-xl text-xs transition flex items-center space-x-1 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="text-emerald-300 font-bold">Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link do QR</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRole('aluno')}
                  className="px-3 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/40 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer"
                  title="Abrir a tela exclusiva do aluno conforme é exibida no QR Code"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-teal-300" />
                  <span>📱 Ver Tela do Aluno (QR Code)</span>
                </button>
              </div>

              {/* Seletor rápido de perfis de alunos */}
              <div className="pt-2 flex items-center space-x-2 text-[11px] text-emerald-200/90 overflow-x-auto">
                <span className="font-semibold text-white shrink-0">Modelos Rápidos:</span>
                {QUICK_PROFILES.map((p) => (
                  <button
                    key={p.ra}
                    type="button"
                    onClick={() => handleApplyPresetProfile(p)}
                    className="px-2.5 py-1 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white rounded-lg border border-emerald-700/60 transition shrink-0 cursor-pointer"
                  >
                    {p.nome.split(' ')[0]} ({p.curso})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Banner de Aviso de Auto-Preenchimento via QR Code */}
      {qrAutofillNotice && (
        <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center space-x-3 text-emerald-950 shadow-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <strong className="block text-sm text-emerald-900 font-bold">
              Preenchimento Automático Concluído
            </strong>
            <span>{qrAutofillNotice}</span>
          </div>
        </div>
      )}

      {/* Banner de Bloqueio se o aluno já preencheu o formulário (1x por aluno) */}
      {alreadySubmittedBlock && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-start space-x-3.5 text-amber-900 shadow-sm">
          <Ban className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold text-amber-950 text-base flex items-center gap-1.5">
              <span>Formulário Já Preenchido por este Aluno (Limite: 1x por Aluno)</span>
            </h4>
            <p className="mt-1">
              O aluno com RA <span className="font-mono font-bold">{alreadySubmittedBlock.ra}</span> ({nome || alreadySubmittedBlock.nome}) já realizou o preenchimento deste formulário anteriormente no protocolo:
            </p>
            <div className="mt-2 bg-amber-100/90 p-2.5 rounded-lg border border-amber-300 font-mono text-xs text-amber-950 font-bold">
              Protocolo: {alreadySubmittedBlock.protocolo}
            </div>
            <p className="mt-2 text-xs text-amber-800">
              Regra da Faculdade Sírio-Libanês: <strong>cada aluno pode preencher o formulário apenas 1 única vez</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Bloqueio de Aluno Ativo */}
      {activeLoanBlock && !alreadySubmittedBlock && (
        <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl flex items-start space-x-3.5 text-rose-900 shadow-sm animate-pulse">
          <Ban className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold text-rose-800 text-base flex items-center gap-1.5">
              <span>Empréstimo Ativo Detectado — Solicitação Bloqueada</span>
            </h4>
            <p className="mt-1">
              O aluno com RA <span className="font-mono font-bold">{activeLoanBlock.ra}</span> / {activeLoanBlock.nome} já possui um empréstimo em aberto:
            </p>
            <div className="mt-2 bg-white/80 p-2.5 rounded-lg border border-rose-200 font-mono text-xs text-rose-950 flex flex-wrap gap-x-4 gap-y-1">
              <span><strong>Protocolo:</strong> {activeLoanBlock.protocolo}</span>
              <span><strong>Notebook:</strong> {activeLoanBlock.hostname}</span>
              <span><strong>Status:</strong> {activeLoanBlock.status}</span>
              <span><strong>Prev. Devolução:</strong> {new Date(activeLoanBlock.dataPrevistaDevolucao).toLocaleString('pt-BR')}</span>
            </div>
            <p className="mt-2 text-xs text-rose-700">
              É necessário comparecer ao balcão de TI e realizar a devolução do equipamento atual antes de solicitar um novo notebook.
            </p>
          </div>
        </div>
      )}

      {/* Erro Geral */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center space-x-3 text-amber-900 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Formulário Principal com os 9 Campos Exigidos */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
        {/* Banner com 2. Data de Empréstimo (sempre a data atual) e 9. Status (Empréstimo) */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 rounded-xl border border-emerald-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold text-emerald-950 text-sm block">
                2. Data de Empréstimo: {currentDateFormatted} (Sempre a data atual)
              </span>
              <span className="text-[11px] text-emerald-700">
                Registrada automaticamente com a data e horário oficial no momento do envio.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
              9. Status: {statusEmprestimo}
            </span>
          </div>
        </div>

        {/* Seção 1: Identificação do Aluno */}
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Dados Acadêmicos do Aluno</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* 1. Nome Completo */}
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  1. Nome Completo do Aluno *
                </label>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  ✨ Preenche os demais campos automaticamente
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  list="admin-registered-students"
                  value={nome}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Mariana Albuquerque Costa ou Lucas Henrique Silva"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                    nome && !isNomeValid
                      ? 'border-rose-300 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
                <datalist id="admin-registered-students">
                  {REGISTERED_STUDENTS.map((s) => (
                    <option key={s.ra} value={s.nome}>
                      {s.nome} — RA: {s.ra} ({s.curso})
                    </option>
                  ))}
                </datalist>
                {nome && isNomeValid && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 absolute right-3.5 top-3" />
                )}
              </div>

              {/* Botões rápidos com alunos da instituição */}
              <div className="mt-2 flex flex-wrap gap-1 items-center">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Alunos Cadastrados:</span>
                {REGISTERED_STUDENTS.slice(0, 4).map((s) => (
                  <button
                    key={s.ra}
                    type="button"
                    onClick={() => {
                      setNome(s.nome);
                      setRa(s.ra);
                      setCurso(s.curso);
                      setSemestre(s.semestre);
                      setEmail(s.email);
                      setWhatsapp(s.whatsapp);
                      if (s.notebookPadrao) setHostname(s.notebookPadrao);
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 rounded text-[10px] font-medium transition cursor-pointer"
                  >
                    {s.nome.split(' ')[0]} ({s.curso})
                  </button>
                ))}
              </div>
            </div>

            {/* 3. RA (14 dígitos numéricos) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  3. RA do Aluno (14 dígitos) *
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {ra.replace(/\D/g, '').length}/14 dígitos
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={ra}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 14);
                    setRa(val);
                    const matched = findStudentByRa(val);
                    if (matched) {
                      setNome(matched.nome);
                      setCurso(matched.curso);
                      setSemestre(matched.semestre);
                      setEmail(matched.email);
                      setWhatsapp(matched.whatsapp);
                    }
                  }}
                  placeholder="Ex: 20241088420001 (14 dígitos)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition focus:outline-none focus:ring-2 ${
                    ra && !isRaValid
                      ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                      : ra && isRaValid
                      ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-200 font-bold'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
                <div className="absolute right-3.5 top-3 flex items-center space-x-1">
                  {checkingActiveLoan && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  )}
                  {ra && isRaValid && !activeLoanBlock && !alreadySubmittedBlock && (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  )}
                  {ra && !isRaValid && (
                    <span className="text-[10px] text-rose-500 font-bold">14 dígitos</span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Curso */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                4. Curso de Graduação / Pós *
              </label>
              <select
                value={curso}
                onChange={(e) => setCurso(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Semestre */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                5. Semestre Atual *
              </label>
              <select
                value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Email da Faculdade (Sírio-Libanês) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  7. E-mail Institucional (@faculdadesiriolibanes.org.br) *
                </label>
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="nome.sobrenome@faculdadesiriolibanes.org.br"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                    email && !isEmailValid
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200'
                      : email && isEmailValid
                      ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-200'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
                <div className="absolute right-3.5 top-3 flex items-center space-x-1">
                  {email && isEmailValid ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : email ? (
                    <span className="text-[10px] text-rose-500 font-medium">Domínio incorreto</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 8. WhatsApp com máscara */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                8. WhatsApp com DDD (para envio de protocolo comprovante) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(maskWhatsApp(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                    whatsapp && !isWhatsappValid
                      ? 'border-rose-300 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />
                {whatsapp && isWhatsappValid && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 absolute right-3.5 top-3" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Equipamento e Previsão de Devolução */}
        <div className="pt-2">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Laptop className="w-4 h-4 text-emerald-600" />
            <span>Equipamento & Devolução</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* 6. Informe o F ou H do Notebook (Lista suspensa ou inserção manual com hosts cadastrados) */}
            <div className="md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  6. Informe o F ou H do Notebook (Hosts Cadastrados) *
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setHostnameMode('dropdown')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                        hostnameMode === 'dropdown'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Lista Suspensa ({allRegisteredNotebooks.length} Hosts)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHostnameMode('manual')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                        hostnameMode === 'manual'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Inserção Manual (F / H)
                    </button>
                  </div>
                </div>
              </div>

              {hostnameMode === 'dropdown' ? (
                loadingNotebooks ? (
                  <div className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Sincronizando notebooks cadastrados via Firestore...</span>
                  </div>
                ) : allRegisteredNotebooks.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">Nenhum equipamento cadastrado!</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    required
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 shadow-xs"
                  >
                    {allRegisteredNotebooks.map((nb) => {
                      const isAvailable = nb.status === 'GUARDADO';
                      return (
                        <option key={nb.hostname} value={nb.hostname}>
                          💻 {nb.hostname} — {nb.marca} {nb.modelo} [{isAvailable ? '🟢 DISPONÍVEL' : `🟡 ${nb.status}`}]
                        </option>
                      );
                    })}
                  </select>
                )
              ) : (
                <div className="space-y-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      list="admin-registered-hosts-datalist"
                      value={hostname}
                      onChange={(e) => setHostname(e.target.value.toUpperCase())}
                      placeholder="Informe o F ou H do notebook (ex: FSL-NB-01, H-02, F-04)..."
                      className="w-full px-3.5 py-3 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 shadow-xs uppercase"
                    />
                    <datalist id="admin-registered-hosts-datalist">
                      {allRegisteredNotebooks.map((nb) => (
                        <option key={nb.hostname} value={nb.hostname}>
                          {nb.hostname} — {nb.marca} {nb.modelo} ({nb.status})
                        </option>
                      ))}
                    </datalist>
                    <div className="absolute right-3.5 top-3 flex items-center space-x-1.5 text-xs text-slate-400">
                      <Laptop className="w-4 h-4 text-emerald-600" />
                      <span className="font-mono font-bold text-emerald-800">F / H</span>
                    </div>
                  </div>

                  {/* Exibição dos Hosts dos notebooks cadastrados para seleção direta */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Hosts dos Notebooks Cadastrados no Sistema (Clique para selecionar):</span>
                      <span className="text-[10px] text-slate-400">{allRegisteredNotebooks.length} notebooks</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {allRegisteredNotebooks.map((nb) => {
                        const isSelected = hostname === nb.hostname;
                        const isAvailable = nb.status === 'GUARDADO';
                        return (
                          <button
                            key={nb.hostname}
                            type="button"
                            onClick={() => setHostname(nb.hostname)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                                : isAvailable
                                ? 'bg-white hover:bg-emerald-50 text-emerald-950 border-emerald-200'
                                : 'bg-slate-200/80 text-slate-700 border-slate-300'
                            }`}
                          >
                            <span>{nb.hostname}</span>
                            <span className="text-[9px] font-sans opacity-70">
                              {isAvailable ? '• Disp.' : `• ${nb.status}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Previsão de Devolução */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Data Prevista para Devolução *
                </label>
                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => applyPresetTime(4)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded font-medium transition cursor-pointer"
                  >
                    +4h
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTime(8)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded font-medium transition cursor-pointer"
                  >
                    +8h
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTime(24)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded font-medium transition cursor-pointer"
                  >
                    Amanhã
                  </button>
                </div>
              </div>
              <input
                type="datetime-local"
                required
                value={dataPrevistaDevolucao}
                onChange={(e) => setDataPrevistaDevolucao(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Técnico / Ponto de Atendimento */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Ponto de Atendimento / Técnico Responsável *
              </label>
              <input
                type="text"
                required
                value={tecnicoSaida}
                onChange={(e) => setTecnicoSaida(e.target.value)}
                placeholder="Nome do técnico da Central TI"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Termo de Compromisso */}
        <div className="pt-2">
          <label className="flex items-start space-x-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60 transition">
            <input
              type="checkbox"
              checked={termoAceito}
              onChange={(e) => setTermoAceito(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              Declaro que retiro o equipamento em perfeito estado de funcionamento e me comprometo
              a utilizá-lo estritamente para atividades acadêmicas da <strong>Faculdade Sírio-Libanês</strong>,
              devolvendo-o no prazo estipulado sob as normas da instituição.
            </span>
          </label>
        </div>

        {/* Botão de Envio */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Validação atômica e geração de protocolo NB-AAAAMMDD-NNNN</span>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || submitting}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer ${
              !isFormValid || submitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-700/20 hover:shadow-lg active:scale-[0.99]'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando Empréstimo...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirmar Empréstimo & Gerar Protocolo</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal Completo de QR Code (Scanner de Câmera, Impressão, Download) */}
      {showQrModal && (
        <StudentQrCodeModal
          initialData={{
            nome,
            ra,
            curso,
            semestre,
            email,
            whatsapp,
            hostname,
          }}
          availableNotebooks={availableNotebooks}
          onApplyData={handleApplyQrData}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
