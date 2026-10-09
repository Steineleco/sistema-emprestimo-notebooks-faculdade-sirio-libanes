import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Laptop,
  Calendar,
  User,
  Clock,
  Printer,
  X,
  MessageCircle,
  QrCode,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { Emprestimo } from '../types';

interface SuccessProtocolModalProps {
  loan: Emprestimo;
  onClose: () => void;
  onNavigateToReturn?: (protocol: string) => void;
}

export const SuccessProtocolModal: React.FC<SuccessProtocolModalProps> = ({
  loan,
  onClose,
  onNavigateToReturn,
}) => {
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [copiedReturnUrl, setCopiedReturnUrl] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [generatingQr, setGeneratingQr] = useState<boolean>(true);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Gera o link direto de devolução com todos os parâmetros essenciais para atendimento presencial
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  const returnParams = new URLSearchParams({
    tab: 'devolucao',
    devolucao: 'true',
    protocolo: loan.protocolo,
    ra: loan.ra,
    hostname: loan.hostname,
    nome: loan.nome,
    curso: loan.curso,
    origem: 'qrcode_protocolo',
  });

  const returnDirectUrl = `${baseUrl}?${returnParams.toString()}`;

  // Gera o QR Code visual com alta resolução e contraste
  useEffect(() => {
    let isMounted = true;
    setGeneratingQr(true);

    QRCode.toDataURL(returnDirectUrl, {
      width: 340,
      margin: 2,
      color: {
        dark: '#064e3b', // Tom esmeralda institucional de alto contraste e legibilidade
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrCodeDataUrl(url);
          setGeneratingQr(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao gerar QR Code de devolução:', err);
        if (isMounted) {
          setGeneratingQr(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [returnDirectUrl]);

  // Sanitiza o WhatsApp para formato internacional (55XXXXXXXXXXX)
  const cleanPhone = loan.whatsapp.replace(/\D/g, '');
  const internationalPhone = cleanPhone.startsWith('55')
    ? cleanPhone
    : `55${cleanPhone}`;

  // Mensagem pronta para o WhatsApp
  const dataSaidaFormatada = new Date(loan.dataSaida).toLocaleString('pt-BR');
  const dataPrevistaFormatada = new Date(loan.dataPrevistaDevolucao).toLocaleString('pt-BR');

  const whatsappMessageText =
`*Faculdade Sírio-Libanês — Comprovante de Empréstimo* 🏥💻

Olá, ${loan.nome}! Seu empréstimo de equipamento acadêmico foi confirmado com sucesso.

📋 *Protocolo Oficial:* ${loan.protocolo}
💻 *Equipamento:* ${loan.hostname}
🎓 *Curso:* ${loan.curso} (${loan.semestre})
🆔 *RA:* ${loan.ra}
📅 *Retirada:* ${dataSaidaFormatada}
⏰ *Previsão de Devolução:* ${dataPrevistaFormatada}
👨‍🔧 *Técnico de Saída:* ${loan.tecnicoSaida}

⚡ *Link Direto para Devolução Presencial (QR Code):*
${returnDirectUrl}

*Instruções para Devolução:*
• Apresente este QR Code ou link ao devolver o equipamento no balcão da Central de TI.
• O técnico escaneará o código para carregar o checklist de recebimento instantaneamente.
• Mantenha o carregador original e cabo de força juntos ao notebook.`;

  const whatsappUrl = `https://wa.me/${internationalPhone}?text=${encodeURIComponent(
    whatsappMessageText
  )}`;

  const handleCopyProtocol = async () => {
    try {
      await navigator.clipboard.writeText(loan.protocolo);
      setCopiedProtocol(true);
      setTimeout(() => setCopiedProtocol(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyReturnUrl = async () => {
    try {
      await navigator.clipboard.writeText(returnDirectUrl);
      setCopiedReturnUrl(true);
      setTimeout(() => setCopiedReturnUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    try {
      const link = document.createElement('a');
      link.download = `QRCode_Devolucao_${loan.protocolo}_${loan.ra}.png`;
      link.href = qrCodeDataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (e) {
      console.error('Erro ao baixar QR code:', e);
    }
  };

  const handleOpenReturnDirect = () => {
    if (onNavigateToReturn) {
      onNavigateToReturn(loan.protocolo);
    } else {
      window.location.href = returnDirectUrl;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto py-6 sm:py-8">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-emerald-100 relative overflow-hidden my-auto max-h-[92vh] overflow-y-auto print-area">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-100 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none no-print" />

        {/* Close icon */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition no-print"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header de Sucesso */}
        <div className="text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-inner">
            <CheckCircle2 className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-600" />
          </div>
          <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Empréstimo Confirmado
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            Protocolo Gerado com Sucesso!
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Faculdade Sírio-Libanês — Setor de Tecnologia da Informação
          </p>
        </div>

        {/* Card do Protocolo Destacado */}
        <div className="mt-4 p-3.5 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-500/40 rounded-2xl text-center relative">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-emerald-800">
            Código do Protocolo
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-950 tracking-wider my-0.5 sm:my-1">
            {loan.protocolo}
          </div>
          <button
            onClick={handleCopyProtocol}
            className="mt-1 inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white px-3 py-1 rounded-lg border border-emerald-200 shadow-sm transition no-print"
          >
            {copiedProtocol ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Protocolo Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>

        {/* Card Dinâmico do QR Code de Devolução Presencial */}
        <div className="mt-4 p-4 sm:p-5 bg-gradient-to-b from-slate-900 to-emerald-950 text-white rounded-2xl border border-emerald-700/40 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black tracking-wide text-white block uppercase">
                  QR Code de Devolução Presencial
                </span>
                <span className="text-[10px] text-emerald-300/80">
                  Agilize o atendimento no balcão da Central de TI
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Link Dinâmico
            </span>
          </div>

          {/* Área do QR Code Renderizado */}
          <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
            <div className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-xl shrink-0 border-2 border-emerald-300/60 relative">
              {generatingQr ? (
                <div className="w-36 h-36 sm:w-40 sm:h-40 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                  <span className="text-[11px] font-medium text-slate-600">Gerando QR Code...</span>
                </div>
              ) : qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code Devolução ${loan.protocolo}`}
                  className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-xl block"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-xs text-rose-500">
                  Erro ao gerar QR Code
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2.5 text-center sm:text-left">
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Ao devolver o notebook, apresente este QR Code ao técnico. O código contém o link direto com todos os parâmetros do seu empréstimo para preenchimento imediato do checklist.
              </p>

              {/* Parâmetros embutidos no QR Code */}
              <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start text-[10px]">
                <span className="bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 px-2 py-0.5 rounded-md font-mono">
                  Prot: {loan.protocolo}
                </span>
                <span className="bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 px-2 py-0.5 rounded-md font-mono">
                  RA: {loan.ra}
                </span>
                <span className="bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 px-2 py-0.5 rounded-md font-mono">
                  Host: {loan.hostname}
                </span>
              </div>

              {/* Botões de Ação do QR Code */}
              <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start no-print">
                <button
                  type="button"
                  onClick={handleCopyReturnUrl}
                  className="px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border border-emerald-600/50 shadow-sm"
                  title="Copiar link direto contendo parâmetros de devolução"
                >
                  {copiedReturnUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="text-emerald-300">Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                  title="Baixar imagem PNG do QR Code"
                >
                  {downloadSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Baixado!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar PNG</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenReturnDirect}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-emerald-100 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border border-white/20 shadow-sm"
                  title="Testar e abrir diretamente a aba de devolução com este protocolo"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Acessar Devolução</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detalhes do Empréstimo */}
        <div className="mt-4 space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Laptop className="w-3.5 h-3.5 text-emerald-600" />
              Equipamento:
            </span>
            <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
              {loan.hostname}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Aluno:
            </span>
            <span className="font-semibold text-slate-800">
              {loan.nome} (RA: {loan.ra})
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
            <span className="text-slate-500 font-medium">Curso / Semestre:</span>
            <span className="font-medium text-slate-800">
              {loan.curso} • {loan.semestre}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Data de Saída:
            </span>
            <span className="font-medium text-slate-800">{dataSaidaFormatada}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Previsão Devolução:
            </span>
            <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {dataPrevistaFormatada}
            </span>
          </div>
        </div>

        {/* Ações: WhatsApp button, Imprimir e Concluir */}
        <div className="mt-5 space-y-2.5 no-print">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 transition shadow-md shadow-emerald-600/30 text-center"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Enviar comprovante & QR por WhatsApp</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir com QR Code</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl font-semibold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition"
            >
              <span>Concluir & Novo Empréstimo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

