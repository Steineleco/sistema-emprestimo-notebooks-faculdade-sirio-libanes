import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  X,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  Share2,
  Calendar,
  Laptop,
  CheckCircle2,
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  GraduationCap,
  BookOpen,
  Layers,
  ArrowRight,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Notebook } from '../types';
import {
  REGISTERED_STUDENTS,
  findStudentByName,
  findStudentByRa,
} from '../data/studentRegistry';

export interface QrCodeLoanData {
  nome: string;
  dataEmprestimo: string; // sempre a data atual
  ra: string;
  curso: string;
  semestre: string;
  hostname: string;
  email: string;
  whatsapp: string;
  status: string; // "EMPRESTADO"
}

interface StudentQrCodeModalProps {
  initialData: Partial<QrCodeLoanData>;
  availableNotebooks: Notebook[];
  onApplyData: (data: QrCodeLoanData) => void;
  onClose: () => void;
}

const PRESET_STUDENTS: Omit<QrCodeLoanData, 'dataEmprestimo'>[] = [
  {
    nome: 'Mariana Albuquerque Costa',
    ra: '20241088420001',
    curso: 'Medicina',
    semestre: '5º Semestre',
    hostname: 'FSL-NB-01',
    email: 'mariana.costa@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98123-4567',
    status: 'EMPRESTADO',
  },
  {
    nome: 'Lucas Henrique Silva',
    ra: '20241045810002',
    curso: 'Medicina',
    semestre: '3º Semestre',
    hostname: 'FSL-NB-03',
    email: 'lucas.silva@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98765-4321',
    status: 'EMPRESTADO',
  },
  {
    nome: 'Carolina Mendes de Oliveira',
    ra: '20231099200003',
    curso: 'Enfermagem',
    semestre: '6º Semestre',
    hostname: 'FSL-NB-05',
    email: 'carolina.mendes@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 97654-3210',
    status: 'EMPRESTADO',
  },
  {
    nome: 'Gabriel Ramos Vasconcelos',
    ra: '20251022140004',
    curso: 'Biomedicina',
    semestre: '2º Semestre',
    hostname: 'FSL-NB-02',
    email: 'gabriel.ramos@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 99887-6543',
    status: 'EMPRESTADO',
  },
];

export const StudentQrCodeModal: React.FC<StudentQrCodeModalProps> = ({
  initialData,
  availableNotebooks,
  onApplyData,
  onClose,
}) => {
  // Sempre a data atual
  const currentDateFormatted = new Date().toLocaleDateString('pt-BR');
  const currentDateIso = new Date().toISOString();

  // Estados dos 9 campos exigidos no QR Code
  const [nome, setNome] = useState(initialData.nome || PRESET_STUDENTS[0].nome);
  const [ra, setRa] = useState(initialData.ra || PRESET_STUDENTS[0].ra);
  const [curso, setCurso] = useState(initialData.curso || PRESET_STUDENTS[0].curso);
  const [semestre, setSemestre] = useState(initialData.semestre || PRESET_STUDENTS[0].semestre);
  const [email, setEmail] = useState(initialData.email || PRESET_STUDENTS[0].email);
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp || PRESET_STUDENTS[0].whatsapp);

  // Informe o F ou H do Notebook (Lista suspensa ou inserção manual)
  const [hostnameMode, setHostnameMode] = useState<'dropdown' | 'manual'>('dropdown');
  const [hostname, setHostname] = useState(
    initialData.hostname || (availableNotebooks[0]?.hostname ?? 'FSL-NB-01')
  );

  const [activeTab, setActiveTab] = useState<'gerador' | 'scanner' | 'manual'>('gerador');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Referências para scanner de webcam e canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Objeto de dados consolidado
  const currentQrData: QrCodeLoanData = {
    nome,
    dataEmprestimo: currentDateFormatted, // sempre a data atual
    ra,
    curso,
    semestre,
    hostname,
    email,
    whatsapp,
    status: 'EMPRESTADO',
  };

  // Constrói URL de auto-preenchimento
  const generateAutofillUrl = () => {
    const origin = window.location.origin;
    const params = new URLSearchParams({
      aluno: 'true',
      autofill: 'true',
      nome: currentQrData.nome,
      ra: currentQrData.ra,
      curso: currentQrData.curso,
      semestre: currentQrData.semestre,
      hostname: currentQrData.hostname,
      email: currentQrData.email,
      whatsapp: currentQrData.whatsapp,
      status: 'EMPRESTADO',
      dataEmprestimo: currentDateFormatted,
    });
    return `${origin}/?${params.toString()}`;
  };

  // Gera o QR Code visual
  useEffect(() => {
    const payloadUrl = generateAutofillUrl();

    QRCode.toDataURL(payloadUrl, {
      width: 380,
      margin: 2,
      color: {
        dark: '#064e3b', // Verde Floresta Sírio-Libanês
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [nome, ra, curso, semestre, hostname, email, whatsapp]);

  // Carrega modelo de preset rápido
  const handleApplyPreset = (preset: (typeof PRESET_STUDENTS)[0]) => {
    setNome(preset.nome);
    setRa(preset.ra);
    setCurso(preset.curso);
    setSemestre(preset.semestre);
    setEmail(preset.email);
    setWhatsapp(preset.whatsapp);
    if (preset.hostname) setHostname(preset.hostname);
  };

  // Aplica dados diretamente no formulário do aluno
  const handleApplyToForm = (data?: QrCodeLoanData) => {
    const dataToApply = data || currentQrData;
    onApplyData(dataToApply);
    stopCamera();
    onClose();
  };

  // Copia o link para área de transferência
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generateAutofillUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  // Baixa imagem PNG do QR Code
  const handleDownloadImage = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.download = `QRCode_Emprestimo_${ra || 'aluno'}_${hostname || 'notebook'}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  // Imprime etiqueta de QR Code
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - Empréstimo de Notebook - Faculdade Sírio-Libanês</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .card { border: 2px solid #064e3b; border-radius: 12px; padding: 20px; max-width: 400px; margin: 0 auto; }
            h2 { color: #064e3b; margin-bottom: 4px; }
            p { margin: 4px 0; font-size: 14px; }
            img { width: 260px; height: 260px; margin: 10px 0; }
            .badge { background: #064e3b; color: #fff; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Faculdade Sírio-Libanês</h2>
            <p><strong>Auto-Preenchimento de Empréstimo</strong></p>
            <img src="${qrCodeDataUrl}" />
            <p><strong>Aluno:</strong> ${nome}</p>
            <p><strong>RA:</strong> ${ra} • <strong>Curso:</strong> ${curso}</p>
            <p><strong>Notebook:</strong> ${hostname} • <strong>Data:</strong> ${currentDateFormatted}</p>
            <div style="margin-top:10px;"><span class="badge">STATUS: EMPRESTADO</span></div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Processa texto bruto ou URL escaneada
  const parseScannedData = (rawText: string) => {
    try {
      if (rawText.includes('?') || rawText.includes('autofill=')) {
        const urlObj = new URL(rawText.startsWith('http') ? rawText : `https://dummy.org/${rawText}`);
        const params = urlObj.searchParams;
        const result: QrCodeLoanData = {
          nome: params.get('nome') || nome,
          ra: params.get('ra') || ra,
          curso: params.get('curso') || curso,
          semestre: params.get('semestre') || semestre,
          hostname: params.get('hostname') || hostname,
          email: params.get('email') || email,
          whatsapp: params.get('whatsapp') || whatsapp,
          dataEmprestimo: params.get('dataEmprestimo') || currentDateFormatted,
          status: params.get('status') || 'EMPRESTADO',
        };
        handleApplyToForm(result);
        return true;
      }

      // Tentativa de JSON
      const parsed = JSON.parse(rawText);
      const result: QrCodeLoanData = {
        nome: parsed.nome || nome,
        ra: parsed.ra || ra,
        curso: parsed.curso || curso,
        semestre: parsed.semestre || semestre,
        hostname: parsed.hostname || hostname,
        email: parsed.email || email,
        whatsapp: parsed.whatsapp || whatsapp,
        dataEmprestimo: parsed.dataEmprestimo || currentDateFormatted,
        status: parsed.status || 'EMPRESTADO',
      };
      handleApplyToForm(result);
      return true;
    } catch {
      return false;
    }
  };

  // Inicia leitura de câmera com jsQR
  const startCamera = async () => {
    setScanError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        requestAnimationFrame(tickScanCamera);
      }
    } catch (err: any) {
      console.warn('Erro ao acessar câmera:', err);
      setScanError('Não foi possível acessar a câmera. Você pode carregar uma imagem ou colar o código.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const tickScanCamera = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(tickScanCamera);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        stopCamera();
        const success = parseScannedData(code.data);
        if (!success) {
          setScanError(`Código lido: "${code.data.slice(0, 50)}...". Formato incompatível com os campos.`);
        }
        return;
      }
    }

    animationFrameId.current = requestAnimationFrame(tickScanCamera);
  };

  // Leitura de arquivo de imagem com QR Code
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const success = parseScannedData(code.data);
          if (!success) {
            setScanError('QR Code encontrado na imagem, mas o formato não continha os campos esperados.');
          }
        } else {
          setScanError('Nenhum QR Code legível foi detectado na imagem enviada.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Limpa stream ao desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Superior */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-emerald-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <QrCode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-700/60">
                  Preenchimento Automático dos 9 Campos
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded">
                  Aba Aluno
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                QR Code de Empréstimo Institucional
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas do Modal */}
        <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                stopCamera();
                setActiveTab('gerador');
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center space-x-2 border-t-2 cursor-pointer ${
                activeTab === 'gerador'
                  ? 'bg-white text-emerald-900 border-emerald-600 shadow-sm'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>1. Gerar & Visualizar QR Code</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('scanner');
                startCamera();
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center space-x-2 border-t-2 cursor-pointer ${
                activeTab === 'scanner'
                  ? 'bg-white text-emerald-900 border-emerald-600 shadow-sm'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>2. Escanear Câmera / Imagem</span>
            </button>

            <button
              onClick={() => {
                stopCamera();
                setActiveTab('manual');
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center space-x-2 border-t-2 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-emerald-900 border-emerald-600 shadow-sm'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>3. Colar Link / JSON</span>
            </button>
          </div>

          {/* Atalhos de Demonstração Rápidos */}
          {activeTab === 'gerador' && (
            <div className="hidden sm:flex items-center space-x-1.5 mb-2">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Modelos:</span>
              {PRESET_STUDENTS.slice(0, 3).map((p) => (
                <button
                  key={p.ra}
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 rounded-lg text-[10px] font-medium transition cursor-pointer"
                  title={`Carregar dados de ${p.nome}`}
                >
                  {p.nome.split(' ')[0]} ({p.curso})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'gerador' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Formulário dos 9 campos do QR Code */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                {/* Banner com Data Atual e Status Fixado */}
                <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-950 text-sm block">
                        Data de Empréstimo: {currentDateFormatted} (Sempre a data atual)
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        Carregada de forma automática pelo sistema no momento do empréstimo.
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
                    Status: EMPRESTADO
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Nome Completo */}
                  <div className="sm:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-semibold text-slate-700">
                        1. Nome Completo *
                      </label>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        ✨ Preenche os demais campos automaticamente
                      </span>
                    </div>
                    <input
                      type="text"
                      list="modal-students-datalist"
                      value={nome}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNome(val);
                        const matched = findStudentByName(val);
                        if (matched) {
                          setRa(matched.ra);
                          setCurso(matched.curso);
                          setSemestre(matched.semestre);
                          setEmail(matched.email);
                          setWhatsapp(matched.whatsapp);
                          if (matched.notebookPadrao) setHostname(matched.notebookPadrao);
                        }
                      }}
                      placeholder="Ex: Mariana Albuquerque Costa ou Lucas Henrique Silva"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                    />
                    <datalist id="modal-students-datalist">
                      {REGISTERED_STUDENTS.map((s) => (
                        <option key={s.ra} value={s.nome}>
                          {s.nome} — RA: {s.ra} ({s.curso})
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {/* 2. RA (14 dígitos) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-semibold text-slate-700">
                        2. RA (14 dígitos) *
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {ra.replace(/\D/g, '').length}/14
                      </span>
                    </div>
                    <input
                      type="text"
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
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                    />
                  </div>

                  {/* 3. Curso */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      3. Curso *
                    </label>
                    <input
                      type="text"
                      value={curso}
                      onChange={(e) => setCurso(e.target.value)}
                      placeholder="Medicina, Enfermagem..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                    />
                  </div>

                  {/* 4. Semestre */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      4. Semestre *
                    </label>
                    <input
                      type="text"
                      value={semestre}
                      onChange={(e) => setSemestre(e.target.value)}
                      placeholder="5º Semestre"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                    />
                  </div>

                  {/* 5. WhatsApp */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      5. WhatsApp com DDD *
                    </label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(11) 98123-4567"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                    />
                  </div>

                  {/* 6. Email da Faculdade */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      6. E-mail Institucional (@faculdadesiriolibanes.org.br) *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      placeholder="mariana.costa@faculdadesiriolibanes.org.br"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                    />
                  </div>

                  {/* 7. Informe o F ou H do Notebook */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-slate-700">
                        7. Informe o F ou H do Notebook *
                      </label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setHostnameMode('dropdown')}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            hostnameMode === 'dropdown'
                              ? 'bg-emerald-700 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Lista Suspensa ({availableNotebooks.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setHostnameMode('manual')}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            hostnameMode === 'manual'
                              ? 'bg-emerald-700 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Inserção Manual (F / H)
                        </button>
                      </div>
                    </div>

                    {hostnameMode === 'dropdown' ? (
                      <select
                        value={hostname}
                        onChange={(e) => setHostname(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono font-medium text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                      >
                        {availableNotebooks.length === 0 ? (
                          <option value="FSL-NB-01">FSL-NB-01 (Padrão)</option>
                        ) : (
                          availableNotebooks.map((nb) => (
                            <option key={nb.hostname} value={nb.hostname}>
                              💻 {nb.hostname} — {nb.marca} {nb.modelo} [DISPONÍVEL]
                            </option>
                          ))
                        )}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={hostname}
                            onChange={(e) => setHostname(e.target.value.toUpperCase())}
                            placeholder="Informe o F ou H (ex: FSL-NB-05, H-02, F-14)..."
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs uppercase focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                          />
                          <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-mono">
                            Etiqueta F / H
                          </span>
                        </div>
                        {/* Chips de hosts cadastrados */}
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                          {availableNotebooks.map((nb) => (
                            <button
                              key={nb.hostname}
                              type="button"
                              onClick={() => setHostname(nb.hostname)}
                              className={`text-[10px] px-2 py-0.5 rounded border font-mono transition cursor-pointer ${
                                hostname === nb.hostname
                                  ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                                  : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {nb.hostname}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna Visual do QR Code e Ações */}
              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full mb-3">
                  QR Code Oficial Sírio-Libanês
                </span>

                {/* Exibição do QR Code */}
                <div className="p-3 bg-white rounded-2xl border-2 border-emerald-600/30 shadow-md">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code de Empréstimo"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                      Gerando QR Code...
                    </div>
                  )}
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                  <div className="font-bold text-slate-900">{nome}</div>
                  <div className="font-mono text-[11px] text-emerald-800">
                    RA: {ra} • {hostname}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Data: <strong>{currentDateFormatted}</strong> • Status: <strong>EMPRESTADO</strong>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="w-full mt-4 space-y-2">
                  <button
                    onClick={() => handleApplyToForm()}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-700/20 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Preencher Formulário com Este QR Code</span>
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleDownloadImage}
                      className="py-2 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
                      title="Baixar imagem PNG do QR Code"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PNG</span>
                    </button>

                    <button
                      onClick={handlePrint}
                      className="py-2 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
                      title="Imprimir etiqueta com QR Code"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="py-2 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
                      title="Copiar link com dados para auto-preenchimento"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <a
                    href={generateAutofillUrl()}
                    target="_self"
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer mt-1"
                    title="Abre a tela exclusiva do aluno conforme é carregada pelo QR Code"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                    <span>📱 Abrir Tela do Aluno (Via QR Code)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="max-w-xl mx-auto py-2 space-y-5 text-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Escanear QR Code com a Câmera ou Enviar Imagem
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Aponte a câmera para um QR Code gerado pelo sistema para preencher os 9 campos do formulário na hora.
                </p>
              </div>

              {/* Viewfinder da Câmera */}
              <div className="relative mx-auto w-full max-w-sm aspect-video bg-black rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 border-2 border-dashed border-emerald-400/70 m-8 rounded-xl pointer-events-none animate-pulse" />
                {!cameraActive && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-white">
                    <Camera className="w-10 h-10 text-slate-400 mb-2" />
                    <span className="text-xs text-slate-300 mb-3">Câmera desativada ou indisponível</span>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Ativar Câmera
                    </button>
                  </div>
                )}
              </div>

              {scanError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center space-x-2 text-left">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Alternativa: Upload de Arquivo com QR Code */}
              <div className="pt-2 border-t border-slate-200">
                <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs cursor-pointer transition">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  <span>Ou Carregar Foto/Arquivo com QR Code</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="max-w-xl mx-auto py-4 space-y-4 text-xs">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  Importar via Link ou Dados
                </h3>
                <p className="text-slate-500 text-xs">
                  Cole aqui a URL de preenchimento gerada ou o conteúdo escaneado.
                </p>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder="Cole aqui a URL (ex: https://.../?autofill=true&nome=Mariana...) ou JSON..."
                  className="w-full p-3.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const success = parseScannedData(pasteInput);
                    if (!success) {
                      alert('Não foi possível identificar dados válidos no texto informado.');
                    }
                  }}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  Importar e Preencher Formulário
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
