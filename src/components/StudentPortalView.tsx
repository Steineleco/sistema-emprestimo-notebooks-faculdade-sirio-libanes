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
  Building2,
  Lock,
  ChevronRight,
  ShieldAlert,
  Search,
  Check,
} from 'lucide-react';
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
  RegisteredStudent,
} from '../data/studentRegistry';
import { useAuth } from '../context/AuthContext';
import { SuccessProtocolModal } from './SuccessProtocolModal';
import { LiveAvailabilityCard } from './LiveAvailabilityCard';

interface StudentPortalViewProps {
  onAdminAccess?: () => void;
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

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({ onAdminAccess }) => {
  const { profile, setRole } = useAuth();

  // Data atual (sempre a data atual para o empréstimo)
  const currentDateFormatted = new Date().toLocaleDateString('pt-BR');

  // Notebooks disponíveis e TODOS os notebooks cadastrados no sistema
  const [availableNotebooks, setAvailableNotebooks] = useState<Notebook[]>([]);
  const [allRegisteredNotebooks, setAllRegisteredNotebooks] = useState<Notebook[]>(
    INITIAL_NOTEBOOKS.map((nb) => ({ ...nb, id: nb.hostname }))
  );
  const [loadingNotebooks, setLoadingNotebooks] = useState(true);

  // Estados dos campos do Aluno (conforme formulário do QR Code)
  const [nome, setNome] = useState('');
  const [ra, setRa] = useState(''); // Exatamente 14 caracteres numéricos
  const [curso, setCurso] = useState(COURSES[0]);
  const [semestre, setSemestre] = useState('3º Semestre');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [hostname, setHostname] = useState('');
  const [hostnameMode, setHostnameMode] = useState<'dropdown' | 'manual'>('dropdown');
  const [statusEmprestimo] = useState('EMPRESTADO'); // Status(Emprestimo) sempre fixado

  // Previsão de Devolução & Atendimento
  const [dataPrevistaDevolucao, setDataPrevistaDevolucao] = useState('');
  const [termoAceito, setTermoAceito] = useState(true);

  // Status de validação, bloqueio de 1 preenchimento por aluno e submissão
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [activeLoanBlock, setActiveLoanBlock] = useState<Emprestimo | null>(null);
  const [alreadySubmittedBlock, setAlreadySubmittedBlock] = useState<Emprestimo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdLoan, setCreatedLoan] = useState<Emprestimo | null>(null);
  const [autofillSuccessNotice, setAutofillSuccessNotice] = useState<string | null>(null);
  const [qrAutofillNotice, setQrAutofillNotice] = useState<string | null>(null);

  // Preenche dados a partir de um aluno cadastrado
  const applyRegisteredStudent = (student: RegisteredStudent) => {
    setNome(student.nome);
    setRa(student.ra); // 14 dígitos numéricos
    setCurso(student.curso);
    setSemestre(student.semestre);
    setEmail(student.email);
    setWhatsapp(student.whatsapp);
    if (student.notebookPadrao && !hostname) {
      setHostname(student.notebookPadrao);
    }
    setAutofillSuccessNotice(
      `Dados de ${student.nome} (RA: ${student.ra}) carregados com sucesso!`
    );
    setTimeout(() => setAutofillSuccessNotice(null), 5000);
  };

  // Ao alterar o nome completo, verifica se corresponde a um aluno cadastrado e preenche os demais campos
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
      setAutofillSuccessNotice(
        `Campos preenchidos automaticamente com base no aluno(a) ${matched.nome}!`
      );
      setTimeout(() => setAutofillSuccessNotice(null), 5000);
    }
  };

  // Auto-preenchimento ao carregar caso a URL tenha sido aberta via QR Code
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autofill') === 'true' || params.get('nome') || params.get('ra')) {
        const urlNome = params.get('nome');
        const urlRa = params.get('ra');
        if (urlNome) {
          setNome(urlNome);
          const matched = findStudentByName(urlNome);
          if (matched && !urlRa) {
            setRa(matched.ra);
            setCurso(matched.curso);
            setSemestre(matched.semestre);
            setEmail(matched.email);
            setWhatsapp(matched.whatsapp);
          }
        }
        if (urlRa) setRa(urlRa.replace(/\D/g, '').slice(0, 14));
        if (params.get('curso')) setCurso(params.get('curso')!);
        if (params.get('semestre')) setSemestre(params.get('semestre')!);
        if (params.get('email')) setEmail(params.get('email')!);
        if (params.get('whatsapp')) setWhatsapp(params.get('whatsapp')!);
        if (params.get('hostname')) {
          setHostname(params.get('hostname')!);
          setHostnameMode('manual');
        }
        setQrAutofillNotice('Dados carregados com sucesso a partir do QR Code escaneado!');
        setTimeout(() => setQrAutofillNotice(null), 6000);
      }
    } catch (e) {
      console.warn('Erro ao ler parâmetros da URL:', e);
    }
  }, []);

  // Escuta notebooks GUARDADOS (disponíveis) e TODOS os notebooks cadastrados em tempo real
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
        console.error('Falha ao sincronizar notebooks disponíveis:', error);
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
        console.warn('Aviso ao sincronizar catálogo completo de notebooks:', error);
      }
    );

    return () => {
      unsubscribeAvailable();
      unsubscribeAll();
    };
  }, []);

  // Horário sugerido para devolução (Hoje às 18:00 ou amanhã)
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

  // Checagem em tempo real:
  // 1. Cada aluno só pode preencher o formulário 1 única vez
  // 2. Empréstimo em aberto
  useEffect(() => {
    const cleanRa = ra.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    // Checagem se já atingiu 14 dígitos numéricos ou se tem e-mail institucional
    if (cleanRa.length === 14 || (cleanEmail.includes('@') && cleanEmail.endsWith('@faculdadesiriolibanes.org.br'))) {
      let isMounted = true;
      setCheckingEligibility(true);

      const timer = setTimeout(async () => {
        try {
          // 1. Verificar se o aluno já preencheu o formulário anteriormente (Regra de 1x por aluno)
          const alreadySubmitted = await checkStudentAlreadySubmitted(cleanRa, cleanEmail, nome);
          if (!isMounted) return;

          if (alreadySubmitted) {
            setAlreadySubmittedBlock(alreadySubmitted);
          } else {
            // Verificar no localStorage local
            const localSubmitted = localStorage.getItem(`aluno_submetido_${cleanRa}`);
            if (localSubmitted) {
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
                tecnicoSaida: 'Autoatendimento',
              });
            } else {
              setAlreadySubmittedBlock(null);
            }
          }

          // 2. Verificar se possui empréstimo ativo
          const activeLoan = await checkStudentActiveLoan(cleanRa, cleanEmail);
          if (isMounted) {
            setActiveLoanBlock(activeLoan);
          }
        } catch (err) {
          console.warn('Erro ao verificar elegibilidade do aluno:', err);
        } finally {
          if (isMounted) {
            setCheckingEligibility(false);
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

  // Validações
  const isEmailValid = email.trim().toLowerCase().endsWith('@faculdadesiriolibanes.org.br');
  const isRaValid = /^\d{14}$/.test(ra.replace(/\D/g, '')); // Exatamente 14 dígitos numéricos
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
    !checkingEligibility;

  // Presets de devolução rápida
  const applyPresetTime = (hoursFromNow: number) => {
    const d = new Date();
    d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000);
    setDataPrevistaDevolucao(d.toISOString().slice(0, 16));
  };

  // Submissão do formulário do aluno (Inserção de informações)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isFormValid) {
      if (alreadySubmittedBlock) {
        setErrorMessage(
          `Formulário já preenchido: O aluno (RA: ${ra}) já realizou o preenchimento anteriormente no protocolo ${alreadySubmittedBlock.protocolo}. Cada aluno só pode preencher o formulário 1 vez.`
        );
        return;
      }
      if (!isEmailValid) setErrorMessage('O e-mail deve ser institucional: @faculdadesiriolibanes.org.br');
      else if (!isRaValid) setErrorMessage('O RA deve conter exatamente 14 caracteres numéricos.');
      else if (!isWhatsappValid) setErrorMessage('Informe um WhatsApp válido com DDD.');
      else if (activeLoanBlock) setErrorMessage('Você já possui um empréstimo em aberto.');
      return;
    }

    setSubmitting(true);

    try {
      const cleanRaDigits = ra.replace(/\D/g, '');
      const payload: LoanFormData = {
        nome: nome.trim(),
        ra: cleanRaDigits,
        curso,
        semestre,
        email: email.trim().toLowerCase(),
        whatsapp,
        hostname: hostname.trim().toUpperCase(),
        dataPrevistaDevolucao: new Date(dataPrevistaDevolucao).toISOString(),
        tecnicoSaida: 'Terminal de Autoatendimento do Aluno (QR Code)',
        termoAceito,
      };

      const loan = await createLoanTransaction(payload, profile.uid);

      // Marca persistência local da regra de 1x por aluno
      try {
        localStorage.setItem(`aluno_submetido_${cleanRaDigits}`, 'true');
        localStorage.setItem(`aluno_ultimo_protocolo_${cleanRaDigits}`, loan.protocolo);
      } catch {}

      setCreatedLoan(loan);
    } catch (err: any) {
      console.error('Falha ao registrar empréstimo:', err);
      setErrorMessage(err?.message || 'Ocorreu um erro ao processar a solicitação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Topo Institucional Exclusivo da Tela do Aluno */}
      <header className="bg-emerald-950 text-white border-b border-emerald-900 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-1.5">
                <span>Faculdade Sírio-Libanês</span>
                <span className="text-emerald-500">•</span>
                <span className="text-emerald-400">Autoatendimento Aluno</span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Solicitação de Notebook via QR Code
              </h1>
            </div>
          </div>

          {/* Botão de retorno ou acesso administrativo (Apenas ADM tem poderes totais) */}
          <button
            onClick={() => {
              if (onAdminAccess) {
                onAdminAccess();
              } else {
                setRole('ADM');
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white text-xs font-semibold border border-emerald-700/60 transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
            title="Acessar o painel administrativo (Exclusivo ADM com relatórios e exportações)"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Painel Administrativo (ADM)</span>
            <span className="sm:hidden">ADM</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal do Aluno */}
      <main className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Card de Boas-Vindas e Instruções */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center space-x-2 bg-emerald-700/70 px-3 py-1 rounded-full text-xs font-semibold text-emerald-200 mb-2 border border-emerald-500/40">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Formulário Oficial de Empréstimo Acadêmico</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Identificação do Aluno & Notebook
              </h2>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                Ao colocar seu <strong>Nome Completo</strong>, os demais dados acadêmicos são trazidos automaticamente. O <strong>RA</strong> utiliza 14 caracteres numéricos e <strong>cada aluno pode preencher o formulário apenas 1 única vez</strong>.
              </p>
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

          {/* Avisos de preenchimento automático */}
          {autofillSuccessNotice && (
            <div className="p-4 bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs sm:text-sm rounded-2xl flex items-center space-x-3 shadow-sm animate-fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
              <div className="font-semibold">{autofillSuccessNotice}</div>
            </div>
          )}

          {qrAutofillNotice && !autofillSuccessNotice && (
            <div className="p-4 bg-teal-100 border border-teal-400 text-teal-900 text-xs sm:text-sm rounded-2xl flex items-center space-x-3 shadow-sm animate-fade-in">
              <CheckCircle className="w-5 h-5 text-teal-700 shrink-0" />
              <div className="font-semibold">{qrAutofillNotice}</div>
            </div>
          )}

          {/* Banner de Bloqueio: Aluno já preencheu o formulário (1x por aluno) */}
          {alreadySubmittedBlock && (
            <div className="p-5 bg-amber-50 border-2 border-amber-400 rounded-3xl shadow-md flex items-start space-x-4">
              <ShieldAlert className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-900 space-y-1">
                <div className="font-black text-amber-950 text-base flex items-center gap-2">
                  <span>Formulário Já Preenchido (Limite de 1x por Aluno)</span>
                </div>
                <p>
                  Consta no sistema que o(a) aluno(a) <strong>{nome || alreadySubmittedBlock.nome}</strong> (RA: <strong>{ra || alreadySubmittedBlock.ra}</strong>) já preencheu este formulário anteriormente sob o protocolo:
                </p>
                <div className="inline-block px-3 py-1 bg-amber-200/80 rounded-lg font-mono font-bold text-amber-950 text-xs">
                  {alreadySubmittedBlock.protocolo}
                </div>
                <p className="font-medium text-amber-800 pt-1">
                  Por norma institucional da TI da Faculdade Sírio-Libanês, <strong>cada aluno pode preencher o formulário apenas 1 única vez</strong>. Caso necessite de alteração ou suporte, dirija-se presencialmente ao balcão de TI.
                </p>
              </div>
            </div>
          )}

          {/* Formulário Principal com os Campos Requeridos */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden divide-y divide-slate-100"
          >
            {/* Seção 1: Dados do Aluno com Autopreenchimento Inteligente */}
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Dados Pessoais & Matrícula Acadêmica
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ao digitar o Nome Completo, os demais campos (RA 14 dígitos, Curso, Semestre, E-mail e WhatsApp) são preenchidos automaticamente.
                  </p>
                </div>
              </div>

              {/* Botões de Preenchimento Rápido com Alunos Cadastrados */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Alunos Cadastrados na Faculdade (Clique para preencher todos os campos):
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    Preenchimento 1x
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {REGISTERED_STUDENTS.slice(0, 5).map((student) => {
                    const isSelected = nome === student.nome;
                    return (
                      <button
                        key={student.ra}
                        type="button"
                        onClick={() => applyRegisteredStudent(student)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm font-bold'
                            : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        <span>{student.nome}</span>
                        <span className="text-[10px] opacity-75 font-mono">({student.curso})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Nome Completo (Ao colocar, traz os demais campos preenchidos) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>
                      Nome Completo <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Traz os demais campos preenchidos
                    </span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      list="student-names-datalist"
                      value={nome}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ex: Mariana Albuquerque Costa ou Lucas Henrique Silva"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    />
                    <datalist id="student-names-datalist">
                      {REGISTERED_STUDENTS.map((s) => (
                        <option key={s.ra} value={s.nome}>
                          {s.nome} — RA: {s.ra} ({s.curso})
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Digite seu nome completo ou selecione na lista de alunos cadastrados da Faculdade Sírio-Libanês.
                  </p>
                </div>

                {/* 2. Data de Empréstimo (Sempre a data atual, preenchida e bloqueada) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Data de Empréstimo <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                      Automático (Sempre a Data Atual)
                    </span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={currentDateFormatted}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950 font-bold text-sm cursor-not-allowed"
                      title="A data do empréstimo é gerada automaticamente pelo sistema (sempre a data atual)."
                    />
                  </div>
                </div>

                {/* 3. RA (14 Caracteres Numéricos) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>RA (14 Dígitos Numéricos) <span className="text-rose-500">*</span></span>
                    {ra && (
                      <span
                        className={`text-[10px] font-bold ${
                          isRaValid ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isRaValid
                          ? '✓ 14 dígitos numéricos válidos'
                          : `${14 - ra.replace(/\D/g, '').length} dígitos restantes (total 14)`}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      maxLength={14}
                      value={ra}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 14);
                        setRa(val);
                        // Se o RA corresponder a um aluno cadastrado, preenche o nome e demais campos
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
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono tracking-wider ${
                        isRaValid
                          ? 'border-emerald-300 bg-emerald-50/30 font-bold text-emerald-950'
                          : ra.length > 0
                          ? 'border-rose-300 bg-rose-50/20'
                          : 'border-slate-200'
                      } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                    />
                  </div>
                </div>

                {/* 4. Curso */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Curso <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={curso}
                    onChange={(e) => setCurso(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Semestre <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 7. E-mail Institucional */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>E-mail da Faculdade <span className="text-rose-500">*</span></span>
                    {email && !isEmailValid && (
                      <span className="text-[10px] text-rose-600 font-bold">
                        @faculdadesiriolibanes.org.br
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome.sobrenome@faculdadesiriolibanes.org.br"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${
                        isEmailValid
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : email.length > 0
                          ? 'border-rose-300 bg-rose-50/20'
                          : 'border-slate-200'
                      } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                    />
                  </div>
                </div>

                {/* 8. WhatsApp */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    WhatsApp (Com DDD) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(maskWhatsApp(e.target.value))}
                      placeholder="(11) 98765-4321"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 2: Escolha do Notebook (F ou H - Lista ou Manual com Todos os Hosts Cadastrados) */}
            <div className="p-6 sm:p-8 space-y-5 bg-slate-50/50">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Informe o F ou H do Notebook (Hosts Cadastrados)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione na lista suspensa ou insira manualmente o Hostname cadastrado no inventário.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 6. Informe o F ou H do Notebook (Hostname) */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Informe o F ou H do Notebook <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px]">
                      <button
                        type="button"
                        onClick={() => setHostnameMode('dropdown')}
                        className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                          hostnameMode === 'dropdown'
                            ? 'bg-white text-emerald-950 shadow-sm font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Lista Suspensa ({allRegisteredNotebooks.length} Hosts)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHostnameMode('manual')}
                        className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                          hostnameMode === 'manual'
                            ? 'bg-white text-emerald-950 shadow-sm font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Inserção Manual (F ou H)
                      </button>
                    </div>
                  </div>

                  {/* Modo Lista Suspensa */}
                  {hostnameMode === 'dropdown' ? (
                    <div className="relative">
                      <Laptop className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <select
                        value={hostname}
                        onChange={(e) => setHostname(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {loadingNotebooks ? (
                          <option value="">Carregando notebooks cadastrados...</option>
                        ) : allRegisteredNotebooks.length === 0 ? (
                          <option value="">Nenhum notebook cadastrado</option>
                        ) : (
                          allRegisteredNotebooks.map((nb) => {
                            const isGuardado = nb.status === 'GUARDADO';
                            const statusLabel = isGuardado
                              ? '🟢 Disponível'
                              : nb.status === 'EMPRESTADO'
                              ? '🟡 Emprestado'
                              : '🔴 Manutenção';
                            return (
                              <option key={nb.hostname} value={nb.hostname}>
                                {nb.hostname} • {nb.marca} {nb.modelo} [{statusLabel}]
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                  ) : (
                    /* Modo Inserção Manual */
                    <div className="space-y-3">
                      <div className="relative">
                        <Laptop className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          list="registered-hostnames-datalist"
                          value={hostname}
                          onChange={(e) => setHostname(e.target.value.toUpperCase())}
                          placeholder="Ex: FSL-NB-01, FSL-NB-02, H-NOTEBOOK-01..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono uppercase font-bold"
                        />
                        <datalist id="registered-hostnames-datalist">
                          {allRegisteredNotebooks.map((nb) => (
                            <option key={nb.hostname} value={nb.hostname}>
                              {nb.hostname} ({nb.marca} {nb.modelo})
                            </option>
                          ))}
                        </datalist>
                      </div>

                      {/* Exibição dos Hosts dos Notebooks Cadastrados para seleção com 1 clique */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-sm">
                        <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Hosts dos Notebooks Cadastrados no Sistema (Clique para selecionar):</span>
                          <span className="text-[10px] text-slate-400">Total: {allRegisteredNotebooks.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
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
                                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-sm ring-2 ring-emerald-300'
                                    : isAvailable
                                    ? 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 border-emerald-200'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                              >
                                <span>{nb.hostname}</span>
                                <span className="text-[9px] opacity-75 font-sans">
                                  {isAvailable ? '• Disp.' : `• ${nb.status}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 mt-1">
                    Equipamentos identificados pelo prefixo <strong>FSL-NB</strong> ou pela etiqueta de patrimônio institucional <strong>F / H</strong> da Faculdade Sírio-Libanês.
                  </p>
                </div>

                {/* 9. Status (Empréstimo) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Status do Equipamento <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      Fixo (Empréstimo)
                    </span>
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value="EMPRESTADO (Empréstimo Ativo)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-950 font-bold text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Previsão de Devolução */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Previsão de Devolução <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-slate-400">Até às 18h</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="datetime-local"
                      required
                      value={dataPrevistaDevolucao}
                      onChange={(e) => setDataPrevistaDevolucao(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    />
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => applyPresetTime(4)}
                      className="text-[10px] bg-slate-200/70 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded font-medium transition cursor-pointer"
                    >
                      +4 horas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTime(8)}
                      className="text-[10px] bg-slate-200/70 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded font-medium transition cursor-pointer"
                    >
                      +8 horas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTime(24)}
                      className="text-[10px] bg-slate-200/70 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded font-medium transition cursor-pointer"
                    >
                      Amanhã
                    </button>
                  </div>
                </div>
              </div>

              {/* Termo de Responsabilidade */}
              <div className="pt-2">
                <label className="flex items-start space-x-3 p-3.5 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
                  <input
                    type="checkbox"
                    checked={termoAceito}
                    onChange={(e) => setTermoAceito(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Termo de Compromisso e Responsabilidade Sírio-Libanês:</strong>{' '}
                    Declaro que utilizarei o equipamento exclusivamente para atividades acadêmicas e hospitalares, comprometendo-me a zelar pela integridade física da máquina, cabos e carregador, devolvendo-o dentro do prazo estipulado.
                  </div>
                </label>
              </div>
            </div>

            {/* Seção 3: Alertas, Validações e Botão de Envio */}
            <div className="p-6 sm:p-8 space-y-4">
              {/* Alerta de bloqueio se o aluno já preencheu 1 vez */}
              {alreadySubmittedBlock && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start space-x-3">
                  <Ban className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <div className="font-bold text-amber-950 text-sm">
                      Formulário Já Preenchido por este Aluno
                    </div>
                    <div>
                      O aluno com RA <strong>{ra}</strong> já preencheu o formulário anteriormente no protocolo{' '}
                      <strong>{alreadySubmittedBlock.protocolo}</strong>. Cada aluno só pode preencher o formulário 1 única vez.
                    </div>
                  </div>
                </div>
              )}

              {/* Alerta de Empréstimo em Aberto */}
              {activeLoanBlock && !alreadySubmittedBlock && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3">
                  <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-800">
                    <div className="font-bold text-rose-950 text-sm">
                      Empréstimo Ativo Encontrado
                    </div>
                    <div>
                      Você já possui um empréstimo em aberto registrado sob o protocolo{' '}
                      <strong>{activeLoanBlock.protocolo}</strong> (Notebook{' '}
                      <strong>{activeLoanBlock.hostname}</strong>).
                    </div>
                    <div className="mt-1 font-semibold text-rose-900">
                      Dirija-se ao balcão de TI para devolver o equipamento anterior antes de solicitar um novo.
                    </div>
                  </div>
                </div>
              )}

              {/* Erro de Submissão */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Botão de Envio com Bloqueio de 1x por Aluno */}
              <button
                type="submit"
                disabled={submitting || !isFormValid || Boolean(alreadySubmittedBlock)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Validando e Registrando Empréstimo...</span>
                  </>
                ) : checkingEligibility ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Verificando Elegibilidade do Aluno...</span>
                  </>
                ) : alreadySubmittedBlock ? (
                  <>
                    <Ban className="w-5 h-5" />
                    <span>Preenchimento Bloqueado (Limite: 1x por Aluno)</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Confirmar e Registrar Empréstimo</span>
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-slate-400">
                🔒 Seus dados serão transmitidos em ambiente seguro e criptografado da Faculdade Sírio-Libanês.
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Modal de Sucesso com Protocolo e Comprovante */}
      {createdLoan && (
        <SuccessProtocolModal
          loan={createdLoan}
          onClose={() => setCreatedLoan(null)}
        />
      )}

      {/* Rodapé Institucional */}
      <footer className="bg-emerald-950 border-t border-emerald-900 text-emerald-300/80 py-6 px-4 text-xs mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <div className="font-bold text-white">
              Faculdade Sírio-Libanês de Ensino e Pesquisa
            </div>
            <div className="text-[11px] text-emerald-400/80">
              Central de Atendimento ao Aluno • Suporte de Tecnologia da Informação
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">
            Terminal de Empréstimo v1.3.0 • RA 14 Dígitos
          </div>
        </div>
      </footer>
    </div>
  );
};
