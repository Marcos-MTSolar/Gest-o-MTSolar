// Página criada para MT Solar — Gerador de Propostas Solares
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Zap, 
  Package, 
  CreditCard, 
  FileDown, 
  Calculator, 
  Sun, 
  TrendingUp,
  Check,
  Settings,
  Wrench,
  ShieldCheck,
  Info,
  Plus,
  Camera,
  History,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

type TabType = 'dados' | 'kit' | 'calculo' | 'financiamento' | 'servicos' | 'historico';

interface FormData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  kitName: string;
  kitPower: string;
  kitCost: string;
  marginPercent: string;
  monthlyBill: string;
  energyRate: string;
  financeValue: string;
  financeTerm: string;
  financeRate: string;
  moduleModel: string;
  modulePower: string;
  moduleQty: string;
  inverterModel: string;
  inverterBrand: string;
  inverterPower: string;
  inverterQty: string;
  garantiaModuloDefeito: string;
  garantiaModuloEficiencia: string;
  garantiaInversorDefeito: string;
  garantiaEstrutura: string;
  garantiaInstalacao: string;
  includePhotos: boolean;
  photos: string[];
  kitSupplier: string;
  financeGracePeriod: string;
}

interface Results {
  salePrice: number;
  annualSavings: number;
  fiveYearSavings: number;
  paybackMonths: number;
  monthlyInstallment: number;
}

const AVAILABLE_SERVICES = [
  {
    id: 'limpeza',
    name: 'Limpeza de Módulos',
    description: 'Limpeza técnica dos módulos fotovoltaicos com produtos adequados, removendo sujeira, pó e resíduos que reduzem a eficiência do sistema.',
    norms: 'NBR 16274, recomendações do fabricante dos módulos.'
  },
  {
    id: 'instalacao',
    name: 'Instalação dos Módulos Fotovoltaicos',
    description: 'Instalação completa dos módulos fotovoltaicos, incluindo fixação estrutural, cabeamento CC, conexão ao inversor e testes de funcionamento.',
    norms: 'NBR 16690, NBR 5410, Resolução Normativa ANEEL 482/2012 e atualizações.'
  },
  {
    id: 'terreno',
    name: 'Limpeza de Terreno',
    description: 'Limpeza e preparação do terreno para instalação de usinas fotovoltaicas, incluindo remoção de vegetação e nivelamento básico.',
    norms: 'Legislação ambiental municipal e estadual aplicável.'
  },
  {
    id: 'comissionamento',
    name: 'Comissionamento Fotovoltaico',
    description: 'Verificação e testes completos do sistema instalado, incluindo medição de parâmetros elétricos, verificação de string, análise de inversores e emissão de laudo técnico.',
    norms: 'NBR 16274, IEC 62446-1.'
  },
  {
    id: 'projeto_subestacao',
    name: 'Projeto de Subestação',
    description: 'Elaboração de projeto elétrico de subestação conforme requisitos da concessionária local, incluindo memorial descritivo, diagramas unifilares e especificação de equipamentos.',
    norms: 'NBR 14039, NBR 5460, normas da concessionária local.'
  },
  {
    id: 'projeto_usina',
    name: 'Projeto de Usina Fotovoltaica',
    description: 'Elaboração de projeto completo de usina fotovoltaica, incluindo dimensionamento do sistema, memorial de cálculo, diagramas elétricos, layout e documentação para homologação.',
    norms: 'NBR 16690, NBR 5410, NBR 16274, Resolução Normativa ANEEL 482/2012.'
  },
  {
    id: 'homologacao',
    name: 'Homologação',
    description: 'Acompanhamento e execução de todo o processo de homologação junto à concessionária de energia, incluindo protocolo de documentos, acompanhamento do processo e vistoria técnica.',
    norms: 'Resolução Normativa ANEEL 482/2012, Resolução Normativa ANEEL 687/2015 e normativas da concessionária local.'
  }
];

export default function ProposalGenerator() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dados');

  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientCity: '',
    clientState: '',
    kitName: '',
    kitPower: '',
    kitCost: '',
    marginPercent: '',
    monthlyBill: '',
    energyRate: '0.85',
    financeValue: '',
    financeTerm: '60',
    financeRate: '1.5',
    moduleModel: '',
    modulePower: '',
    moduleQty: '',
    inverterModel: '',
    inverterBrand: '',
    inverterPower: '',
    inverterQty: '1',
    garantiaModuloDefeito: '10',
    garantiaModuloEficiencia: '25',
    garantiaInversorDefeito: '10',
    garantiaEstrutura: '5',
    garantiaInstalacao: '1',
    includePhotos: false,
    photos: [],
    kitSupplier: '',
    financeGracePeriod: '0'
  });

  const [results, setResults] = useState<Results>({
    salePrice: 0,
    annualSavings: 0,
    fiveYearSavings: 0,
    paybackMonths: 0,
    monthlyInstallment: 0
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/proposal-history');
      setHistory(res.data);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistory();
    }
  }, [activeTab]);

  const saveToHistory = async () => {
    try {
      await api.post('/api/proposal-history', {
        client_name: formData.clientName || 'Cliente sem nome',
        margin: parseFloat(formData.marginPercent) || 0,
        kit_value: parseFloat(formData.kitCost) || 0,
        proposal_id: `PROP-${Date.now().toString().slice(-6)}`
      });
      fetchHistory();
    } catch (error) {
      console.error('Erro ao salvar no histórico:', error);
    }
  };

  const [serviceFormData, setServiceFormData] = useState({
    clientName: '',
    selectedServices: [] as string[],
    totalValue: '',
    executionTime: '15 dias úteis',
    responsible: '',
    validityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const toggleService = (serviceId: string) => {
    setServiceFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const generateServicePDF = async () => {
    const dataGerada = new Date().toLocaleDateString('pt-BR');
    const validityDateFormatted = new Date(serviceFormData.validityDate).toLocaleDateString('pt-BR');
    
    const servicesList = AVAILABLE_SERVICES.filter(s => serviceFormData.selectedServices.includes(s.id));

    const htmlContent = `
      <html>
      <head>
        <style>
          @page { margin: 0; }
          body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
          .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; box-sizing: border-box; background: #fff; position: relative; }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); height: 25mm; padding: 0 15mm; display: flex; align-items: center; justify-content: space-between; margin: -15mm -15mm 10mm -15mm; }
          .header h1 { color: #fff; margin: 0; font-size: 18pt; }
          .header .logo-text { color: #f59e0b; font-size: 10pt; font-weight: bold; }
          .section-title { font-size: 14pt; font-weight: bold; color: #1e3a5f; border-bottom: 2px solid #f59e0b; padding-bottom: 2mm; margin-bottom: 5mm; text-transform: uppercase; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 10mm; }
          .data-table td { padding: 2mm 0; border-bottom: 1px solid #eee; }
          .label { color: #666; font-size: 9pt; width: 30%; }
          .value { font-weight: bold; color: #1e3a5f; }
          .service-item { margin-bottom: 6mm; padding-bottom: 4mm; border-bottom: 1px dashed #ddd; }
          .service-name { font-size: 12pt; font-weight: bold; color: #1e3a5f; margin-bottom: 1mm; }
          .service-desc { font-size: 10pt; color: #444; line-height: 1.5; margin-bottom: 1mm; text-align: justify; }
          .service-norms { font-size: 8.5pt; color: #166534; font-weight: bold; background: #f0fdf4; padding: 1mm 2mm; border-radius: 4px; display: inline-block; }
          .conditions-card { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 10px; padding: 6mm; margin-top: 10mm; }
          .footer { border-top: 2px solid #f59e0b; padding-top: 4mm; margin-top: 15mm; font-size: 8pt; color: #666; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <h1>Proposta de Serviços</h1>
            <div style="text-align: right;">
              <div class="logo-text">MT SOLAR</div>
              <div style="color: #fff; font-size: 8pt;">ENERGIA RENOVÁVEL</div>
            </div>
          </div>

          <div class="section-title">Dados do Cliente</div>
          <table class="data-table">
            <tr>
              <td class="label">Cliente:</td>
              <td class="value">${serviceFormData.clientName || '—'}</td>
            </tr>
            <tr>
              <td class="label">Data de Emissão:</td>
              <td class="value">${dataGerada}</td>
            </tr>
            <tr>
              <td class="label">Responsável Técnico:</td>
              <td class="value">${serviceFormData.responsible || '—'}</td>
            </tr>
          </table>

          <div class="section-title">Serviços Contratados</div>
          ${servicesList.map(s => `
            <div class="service-item">
              <div class="service-name">✓ ${s.name}</div>
              <div class="service-desc">${s.description}</div>
              <div class="service-norms">Normas: ${s.norms}</div>
            </div>
          `).join('')}

          <div class="section-title">Condições Comerciais</div>
          <div class="conditions-card">
            <table style="width: 100%;">
              <tr>
                <td>
                  <div style="font-size: 9pt; color: #64748b; text-transform: uppercase;">Valor Total dos Serviços</div>
                  <div style="font-size: 18pt; font-weight: 900; color: #1e3a5f;">R$ ${parseFloat(serviceFormData.totalValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </td>
                <td style="text-align: right;">
                  <div style="font-size: 9pt; color: #64748b; text-transform: uppercase;">Tempo de Execução</div>
                  <div style="font-size: 14pt; font-weight: bold; color: #1e3a5f;">${serviceFormData.executionTime}</div>
                </td>
              </tr>
            </table>
            <div style="margin-top: 4mm; font-size: 9pt; color: #666;">
              Validade da Proposta: <strong>${validityDateFormatted}</strong>
            </div>
          </div>

          <div class="footer">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <strong>MT SOLAR — ENERGIA RENOVÁVEL</strong><br/>
                mtsolar.energia@gmail.com | (81) 99700-3260
              </div>
              <div style="text-align: right;">
                Nº da Proposta: <strong>SRV-${Date.now().toString().slice(-6)}</strong>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return;
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    setTimeout(() => newWindow.print(), 1000);

    // Save to backend
    try {
      await api.post('/api/service-proposals', {
        client_name: serviceFormData.clientName,
        services: servicesList,
        total_value: parseFloat(serviceFormData.totalValue) || 0,
        execution_time: serviceFormData.executionTime,
        responsible: serviceFormData.responsible,
        validity_date: serviceFormData.validityDate
      });
    } catch (err) {
      console.error('Erro ao salvar proposta de serviço:', err);
    }
  };

  const updateForm = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  const inputStyle = "border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500";

  useEffect(() => {
    calculateResults();
  }, [formData]);

  const calculateResults = () => {
    const kitCost = parseFloat(formData.kitCost || '0');
    const marginPercent = parseFloat(formData.marginPercent || '0');
    const monthlyBill = parseFloat(formData.monthlyBill || '0');
    const energyRate = parseFloat(formData.energyRate || '0.85');
    const kitPower = parseFloat(formData.kitPower || '0');

    const salePrice = kitCost * (1 + marginPercent / 100);
    const monthlyGeneration = kitPower * 30 * 4.5;
    const monthlySavings = monthlyGeneration * energyRate;
    const annualSavings = monthlySavings * 12;
    const fiveYearSavings = annualSavings * 5;
    const paybackMonths = monthlySavings > 0 ? salePrice / monthlySavings : 0;
    const financeValue = parseFloat(formData.financeValue || salePrice.toString());
    const financeTerm = parseFloat(formData.financeTerm || '60');
    const financeRate = parseFloat(formData.financeRate || '1.5') / 100;

    let monthlyInstallment = 0;
    if (financeRate > 0) {
      monthlyInstallment = (financeValue * financeRate * Math.pow(1 + financeRate, financeTerm)) / (Math.pow(1 + financeRate, financeTerm) - 1);
    } else if (financeTerm > 0) {
      monthlyInstallment = financeValue / financeTerm;
    }

    setResults(prev => ({
      ...prev,
      salePrice,
      annualSavings,
      fiveYearSavings,
      paybackMonths,
      monthlyInstallment
    }));
  };

  const isReady = formData.clientName && formData.kitCost && formData.marginPercent && formData.kitPower;


  const generatePDF = () => {
    const AZUL = '#1e3a5f';
    const AZUL_CLARO = '#d6e4f0';
    const AMARELO = '#f59e0b';
    const CINZA = '#6b7280';

    const newWindow = window.open('', '_blank');
    if (!newWindow) return;

    // Cálculos para o gráfico da Página 4
    const monthlyBillVal = Number(formData.monthlyBill) || 450;
    const energyRateVal = Number(formData.energyRate) || 0.85;
    const consumoMensal = Math.round(monthlyBillVal / energyRateVal);
    const kitPowerVal = Number(formData.kitPower) || 5;
    const fatorSazonalidade = [0.95, 0.92, 0.90, 0.88, 0.82, 0.75, 0.73, 0.80, 0.90, 0.95, 0.97, 0.98];
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const geracaoMes = fatorSazonalidade.map(f => Math.round(kitPowerVal * 30 * 4.5 * f));
    const maxVal = Math.max(consumoMensal, ...geracaoMes) + 100;

    // Cálculos para Página 5: Indicadores de Viabilidade
    const saleP = results.salePrice || (Number(formData.kitCost) * (1 + Number(formData.marginPercent)/100));
    const annualSav = results.annualSavings;
    const reajusteAnual = 0.10; // 10% ao ano
    const paybackMeses = results.paybackMonths;
    const paybackAnos = Math.floor(paybackMeses / 12);
    const paybackMesesRest = Math.round(paybackMeses % 12);
    const roi = annualSav > 0 ? (annualSav * 25 / saleP).toFixed(2) : '0';
    const tir = annualSav > 0 ? ((annualSav / saleP) * 100).toFixed(2) : '0';

    let economiaTotal25 = 0;
    let fluxoCaixa = [];
    let acumulado = -saleP;
    for (let ano = 1; ano <= 25; ano++) {
      const economiaAno = annualSav * Math.pow(1 + reajusteAnual, ano - 1);
      economiaTotal25 += economiaAno;
      acumulado += economiaAno;
      fluxoCaixa.push(acumulado);
    }

    const gModuloDefeito  = formData.garantiaModuloDefeito  || '10';
    const gModuloEfic     = formData.garantiaModuloEficiencia || '25';
    const gInversor       = formData.garantiaInversorDefeito || '10';
    const gEstrutura      = formData.garantiaEstrutura       || '5';
    const gInstalacao     = formData.garantiaInstalacao      || '1';

    const geracaoAnual = kitPowerVal * 365 * 4.5;
    const custokWh = geracaoAnual > 0 ? (saleP / (geracaoAnual * 25)).toFixed(2) : '0';
    const economiakWh = (Number(formData.energyRate) - Number(custokWh)).toFixed(2);

    const dataGerada = new Date().toLocaleDateString('pt-BR');
    const dataValidade = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
    
    const maxFluxo = Math.max(...fluxoCaixa);
    const minFluxo = Math.min(...fluxoCaixa);
    const rangeFluxo = maxFluxo - minFluxo;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proposta Comercial MT Solar</title>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #fff; }
          .page { 
            width: 210mm; 
            min-height: 297mm; 
            margin: 0 auto; 
            page-break-after: always; 
            position: relative; 
            overflow: hidden; 
            box-sizing: border-box; 
            background: #fff;
          }
          @media print {
            @page { size: A4; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }

          /* Capa Styles */
          .sidebar {
            position: absolute;
            left: 0;
            top: 0;
            width: 18mm;
            height: 100%;
            background: ${AZUL};
            z-index: 20;
          }
          .top-bar {
            width: 100%;
            height: 14mm;
            background: #fff;
            border-bottom: 2px solid ${AZUL_CLARO};
            display: flex;
            align-items: center;
            padding-left: 24mm;
            box-sizing: border-box;
          }
          .top-bar span {
            font-size: 9pt;
            color: ${AZUL};
            font-weight: bold;
            letter-spacing: 2px;
          }
          .grid-background {
            position: absolute;
            top: 0;
            left: 18mm;
            right: 0;
            bottom: 0;
            background-image: 
              linear-gradient(${AZUL_CLARO}22 1px, transparent 1px), 
              linear-gradient(90deg, ${AZUL_CLARO}22 1px, transparent 1px);
            background-size: 20mm 20mm;
            opacity: 0.5;
            z-index: 1;
          }
          .content-container {
            position: relative;
            z-index: 10;
            padding-left: 28mm;
            height: calc(100% - 14mm);
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .logo-section {
            margin-top: 60mm;
          }
          .title-section {
            margin-top: 20mm;
          }
          .title-main {
            font-size: 52pt;
            font-weight: 900;
            color: ${AZUL};
            line-height: 1.1;
            display: block;
            text-transform: uppercase;
          }
          .footer-capa {
            position: absolute;
            bottom: 12mm;
            left: 28mm;
            font-size: 9pt;
            color: ${CINZA};
            line-height: 1.8;
            z-index: 10;
          }
        </style>
      </head>
      <body>
        <!-- PÁGINA 1: CAPA -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;overflow:hidden;position:relative;">
          <img src="/Pag__1.jpeg" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>

        <!-- PÁGINA 2: SOBRE NÓS -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;overflow:hidden;position:relative;">
          <img src="/Pag__2.jpeg" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>

        <!-- PÁGINA 3: ESPAÇO DA CARNE (CLIENTES) -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;overflow:hidden;position:relative;">
          <img src="/Pag__3.jpeg" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>

        <!-- PÁGINA 4: SIMPLA ENERGIA (CLIENTES) -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;overflow:hidden;position:relative;">
          <img src="/Pag__4.jpeg" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>

        <!-- PÁGINA 5: DADOS DO CLIENTE + EQUIPAMENTOS -->
        <div style="width:210mm;min-height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;position:relative;">

          <!-- FAIXA DECORATIVA TOPO -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
            height:28mm;padding:0 14mm;display:flex;align-items:center;
            justify-content:space-between;">
            <div>
              <div style="color:#f59e0b;font-size:9pt;font-weight:bold;
                letter-spacing:2px;text-transform:uppercase;">MT Solar — Energia Renovável</div>
              <div style="color:#fff;font-size:16pt;font-weight:900;margin-top:1mm;">
                Proposta Comercial</div>
            </div>
            <div style="text-align:right;">
              <div style="color:rgba(255,255,255,0.7);font-size:8pt;">Proposta Nº</div>
              <div style="color:#f59e0b;font-size:13pt;font-weight:bold;">
                PROP-${Date.now().toString().slice(-6)}</div>
              <div style="color:rgba(255,255,255,0.7);font-size:8pt;">
                ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          <!-- BARRA AMARELA FINA DECORATIVA -->
          <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);"></div>

          <!-- CORPO DA PÁGINA -->
          <div style="padding:8mm 14mm;">

            <!-- DADOS DO CLIENTE -->
            <div style="margin-bottom:6mm;">
              <div style="display:flex;align-items:center;gap:3mm;margin-bottom:3mm;">
                <div style="width:4px;height:16px;background:#f59e0b;border-radius:2px;"></div>
                <span style="font-size:12pt;font-weight:900;color:#1e3a5f;
                  text-transform:uppercase;letter-spacing:1px;">Dados do Cliente</span>
              </div>
              <div style="background:linear-gradient(135deg,#f0f7ff,#e8f4fd);
                border-radius:8px;border-left:4px solid #1e3a5f;padding:5mm 6mm;">
                <table style="width:100%;border-collapse:collapse;font-size:10pt;">
                  <tr>
                    <td style="padding:1mm 0;color:#6b7280;width:35%;">Nome:</td>
                    <td style="padding:1mm 0;font-weight:bold;color:#1e3a5f;">
                      ${formData.clientName || '—'}</td>
                    <td style="padding:1mm 0;color:#6b7280;width:20%;">Telefone:</td>
                    <td style="padding:1mm 0;font-weight:bold;color:#1e3a5f;">
                      ${formData.clientPhone || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding:1mm 0;color:#6b7280;">E-mail:</td>
                    <td style="padding:1mm 0;color:#1e3a5f;" colspan="3">
                      ${formData.clientEmail || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding:1mm 0;color:#6b7280;">Endereço:</td>
                    <td style="padding:1mm 0;color:#1e3a5f;" colspan="3">
                      ${formData.clientAddress || '—'}, ${formData.clientCity || '—'} - ${formData.clientState || '—'}
                    </td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- TÍTULO EQUIPAMENTOS -->
            <div style="display:flex;align-items:center;gap:3mm;margin-bottom:4mm;">
              <div style="width:4px;height:16px;background:#f59e0b;border-radius:2px;"></div>
              <span style="font-size:12pt;font-weight:900;color:#1e3a5f;
                text-transform:uppercase;letter-spacing:1px;">Equipamentos do Sistema</span>
            </div>

            <!-- FORNECEDOR (OPCIONAL) -->
            ${formData.kitSupplier ? `
            <div style="font-size:9pt;color:#6b7280;margin-bottom:1.5mm;text-align:right;">
              Fornecedor: <span style="font-weight:bold;color:#1e3a5f;">${formData.kitSupplier}</span>
            </div>` : ''}

            <!-- KIT DESCRIPTION BADGE -->
            ${formData.kitName ? `
            <div style="background:#1e3a5f;color:#f59e0b;border-radius:6px;
              padding:3mm 5mm;margin-bottom:4mm;font-size:10pt;font-weight:bold;
              text-align:center;letter-spacing:0.5px;">
              ☀️ ${formData.kitName}
            </div>` : ''}

            <!-- GRID MÓDULO + INVERSOR -->
            <table style="width:100%;border-collapse:separate;border-spacing:4mm 0;margin-bottom:4mm;">
              <tr style="vertical-align:top;">

                <!-- MÓDULO FOTOVOLTAICO -->
                <td style="width:50%;background:#f8fafc;border-radius:8px;
                  border:2px solid #d6e4f0;padding:5mm;position:relative;">
                  <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);
                    color:#f59e0b;font-size:10pt;font-weight:900;padding:2mm 4mm;
                    border-radius:5px;margin-bottom:4mm;text-align:center;
                    letter-spacing:0.5px;">
                    🔲 Módulo Fotovoltaico
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Fabricante</td>
                      <td style="padding:1.5mm 0;font-weight:bold;color:#1e3a5f;text-align:right;">
                        ${formData.moduleModel || 'Conforme proposta'}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Potência</td>
                      <td style="padding:1.5mm 0;font-weight:bold;color:#1e3a5f;text-align:right;">
                        ${formData.modulePower ? formData.modulePower + ' Wp' : '—'}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Qtd. Módulos</td>
                      <td style="padding:1.5mm 0;font-weight:bold;color:#1e3a5f;text-align:right;">
                        ${formData.moduleQty || '—'}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Gar. Defeitos</td>
                      <td style="padding:1.5mm 0;text-align:right;">
                        <span style="background:#dcfce7;color:#166534;border-radius:4px;
                          padding:0.5mm 2mm;font-size:8.5pt;font-weight:bold;">
                          ${gModuloDefeito} Anos</span></td>
                    </tr>
                    <tr>
                      <td style="padding:1.5mm 0;color:#6b7280;">Gar. Eficiência</td>
                      <td style="padding:1.5mm 0;text-align:right;">
                        <span style="background:#dcfce7;color:#166534;border-radius:4px;
                          padding:0.5mm 2mm;font-size:8.5pt;font-weight:bold;">
                          ${gModuloEfic} Anos</span></td>
                    </tr>
                  </table>
                </td>

                <!-- INVERSOR -->
                <td style="width:50%;background:#f8fafc;border-radius:8px;
                  border:2px solid #d6e4f0;padding:5mm;">
                  <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);
                    color:#f59e0b;font-size:10pt;font-weight:900;padding:2mm 4mm;
                    border-radius:5px;margin-bottom:4mm;text-align:center;
                    letter-spacing:0.5px;">
                    ⚡ Inversor
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Modelo</td>
                      <td style="padding:1.5mm 0;font-weight:bold;color:#1e3a5f;text-align:right;">
                        ${formData.inverterModel || '—'}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Fabricante</td>
                      <td style="padding:1.5mm 0;font-weight:bold;color:#1e3a5f;text-align:right;">
                        ${formData.inverterBrand || '—'}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Potência</td>
                      <td style="padding:1.5mm 0;font-weight:bold;color:#1e3a5f;text-align:right;">
                        ${formData.inverterPower ? Number(formData.inverterPower).toLocaleString('pt-BR') + ' W' : '—'}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Monitoramento</td>
                      <td style="padding:1.5mm 0;font-weight:bold;color:#1e3a5f;text-align:right;">Wi-Fi</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                      <td style="padding:1.5mm 0;color:#6b7280;">Quantidade</td>
                      <td style="padding:1.5mm 0;font-weight:bold;color:#1e3a5f;text-align:right;">
                        ${formData.inverterQty || '1'}</td>
                    </tr>
                    <tr>
                      <td style="padding:1.5mm 0;color:#6b7280;">Gar. Defeitos</td>
                      <td style="padding:1.5mm 0;text-align:right;">
                        <span style="background:#dcfce7;color:#166534;border-radius:4px;
                          padding:0.5mm 2mm;font-size:8.5pt;font-weight:bold;">
                          ${gInversor} Anos</span></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- ESTRUTURA + ELÉTRICA (linha extra) -->
            <table style="width:100%;border-collapse:separate;border-spacing:4mm 0;margin-bottom:5mm;">
              <tr>
                <td style="width:50%;background:#fff8e7;border:2px solid #f59e0b;
                  border-radius:8px;padding:3mm 5mm;">
                  <div style="font-size:9.5pt;font-weight:bold;color:#1e3a5f;margin-bottom:1mm;">
                    🔩 Estrutura de Fixação
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:9pt;">
                    <span style="color:#6b7280;">Garantia:</span>
                    <span style="background:#dcfce7;color:#166534;border-radius:4px;
                      padding:0.5mm 2mm;font-weight:bold;">${gEstrutura} Anos</span>
                  </div>
                  <div style="font-size:8.5pt;color:#6b7280;margin-top:1mm;">
                    Conforme tipo de telhado/solo do projeto
                  </div>
                </td>
                <td style="width:50%;background:#fff8e7;border:2px solid #f59e0b;
                  border-radius:8px;padding:3mm 5mm;">
                  <div style="font-size:9.5pt;font-weight:bold;color:#1e3a5f;margin-bottom:1mm;">
                    🔌 Instalação Elétrica
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:9pt;">
                    <span style="color:#6b7280;">Garantia:</span>
                    <span style="background:#dcfce7;color:#166534;border-radius:4px;
                      padding:0.5mm 2mm;font-weight:bold;">${gInstalacao} Ano(s)</span>
                  </div>
                  <div style="font-size:8.5pt;color:#6b7280;margin-top:1mm;">
                    Garantia de mão de obra da instalação
                  </div>
                </td>
              </tr>
            </table>

            <!-- RODAPÉ DA PÁGINA -->
            <div style="border-top:3px solid #f59e0b;padding-top:4mm;margin-top:8mm;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:9pt;font-weight:bold;color:#1e3a5f;">
                    MT SOLAR — ENERGIA RENOVÁVEL</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    mtsolar.energia@gmail.com | @mtsolar_</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    (81) 99700-3260 | (81) 99504-3980</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#6b7280;font-size:8pt;">Nº da Proposta</div>
                  <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                    PROP-${Date.now().toString().slice(-6)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 6: INFORMAÇÕES DO SISTEMA -->
        <div style="width:210mm;min-height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;">

          <!-- FAIXA TOPO (mesmo padrão) -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
            height:18mm;padding:0 14mm;display:flex;align-items:center;
            justify-content:space-between;">
            <span style="color:#fff;font-size:13pt;font-weight:900;">
              Informações do Sistema</span>
            <span style="color:#f59e0b;font-size:9pt;font-weight:bold;">MT Solar</span>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);"></div>

          <div style="padding:8mm 14mm;">

            <!-- SUBTÍTULO -->
            <p style="font-size:10pt;color:#6b7280;text-align:center;margin:0 0 5mm 0;">
              As principais informações do sistema proposto estão indicadas nesta seção.
            </p>

            <!-- 4 CARDS DE DADOS -->
            <table style="width:100%;border-collapse:separate;border-spacing:3mm;margin-bottom:6mm;">
              <tr>
                <td style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);
                  border-radius:8px;padding:4mm;text-align:center;">
                  <div style="color:#f59e0b;font-size:8pt;font-weight:bold;
                    text-transform:uppercase;letter-spacing:1px;">Potência</div>
                  <div style="color:#fff;font-size:16pt;font-weight:900;margin:1mm 0;">
                    ${formData.kitPower || '0'} <span style="font-size:11pt;">kWp</span></div>
                  <div style="color:rgba(255,255,255,0.6);font-size:7.5pt;">do sistema</div>
                </td>
                <td style="background:#fff8e7;border:2px solid #f59e0b;
                  border-radius:8px;padding:4mm;text-align:center;">
                  <div style="color:#92400e;font-size:8pt;font-weight:bold;
                    text-transform:uppercase;letter-spacing:1px;">Área Mínima</div>
                  <div style="color:#1e3a5f;font-size:16pt;font-weight:900;margin:1mm 0;">
                    ${(Number(formData.moduleQty||9)*1.87).toFixed(2)} <span style="font-size:11pt;">m²</span></div>
                  <div style="color:#6b7280;font-size:7.5pt;">requerida</div>
                </td>
                <td style="background:#f0fdf4;border:2px solid #86efac;
                  border-radius:8px;padding:4mm;text-align:center;">
                  <div style="color:#166534;font-size:8pt;font-weight:bold;
                    text-transform:uppercase;letter-spacing:1px;">Peso Dist.</div>
                  <div style="color:#1e3a5f;font-size:16pt;font-weight:900;margin:1mm 0;">
                    ${(Number(formData.moduleQty||9)*1.6).toFixed(2)} <span style="font-size:11pt;">kg/m²</span></div>
                  <div style="color:#6b7280;font-size:7.5pt;">dos módulos</div>
                </td>
                <td style="background:#f8fafc;border:2px solid #d6e4f0;
                  border-radius:8px;padding:4mm;text-align:center;">
                  <div style="color:#1e3a5f;font-size:8pt;font-weight:bold;
                    text-transform:uppercase;letter-spacing:1px;">Vida Útil</div>
                  <div style="color:#1e3a5f;font-size:13pt;font-weight:900;margin:1mm 0;">
                    25–35 <span style="font-size:10pt;">Anos</span></div>
                  <div style="color:#6b7280;font-size:7.5pt;">do sistema</div>
                </td>
              </tr>
            </table>

            <!-- TÍTULO GRÁFICO -->
            <div style="display:flex;align-items:center;gap:3mm;margin-bottom:3mm;">
              <div style="width:4px;height:16px;background:#f59e0b;border-radius:2px;"></div>
              <span style="font-size:12pt;font-weight:900;color:#1e3a5f;">
                Consumo X Geração</span>
              <span style="font-size:9pt;color:#6b7280;">(kWh mensais estimados)</span>
            </div>

            <!-- GRÁFICO SVG -->
            <div style="width: 100%; height: 180px;">
              <svg width="100%" height="160" viewBox="0 0 500 160">
                <line x1="10" y1="140" x2="490" y2="140" stroke="#1e3a5f" stroke-width="1" />
                ${meses.map((mes, i) => {
                  const xBase = i * 40 + 10;
                  const hConsumo = (consumoMensal / maxVal) * 120;
                  const hGeracao = (geracaoMes[i] / maxVal) * 120;
                  return `
                    <rect x="${xBase}" y="${140 - hConsumo}" width="14" height="${hConsumo}" fill="#d6e4f0" rx="2" />
                    <rect x="${xBase + 16}" y="${140 - hGeracao}" width="14" height="${hGeracao}" fill="#1e3a5f" rx="2" />
                    <text x="${xBase + 15}" y="155" font-size="7" text-anchor="middle" fill="#6b7280">${mes}</text>
                  `;
                }).join('')}
              </svg>
            </div>

            <!-- LEGENDA DO GRÁFICO -->
            <div style="display:flex;justify-content:center;gap:8mm;
              margin-top:3mm;font-size:9pt;color:#6b7280;">
              <span>⬛ <span style="color:#d6e4f0;background:#d6e4f0;
                border-radius:2px;padding:0 4px;">__</span> Consumo (kWh)</span>
              <span>⬛ <span style="color:#1e3a5f;background:#1e3a5f;
                border-radius:2px;padding:0 4px;">__</span> Geração (kWh)</span>
            </div>

            <!-- GLOSSÁRIO kWp / kWh -->
            <div style="background:#f8fafc;border-radius:8px;border-left:4px solid #f59e0b;
              padding:4mm 5mm;margin-top:5mm;font-size:9pt;color:#374151;line-height:1.7;">
              <p style="margin:0 0 2mm 0;">
                <strong style="color:#1e3a5f;">kWp:</strong>
                Simplificadamente, é a máxima potência que o sistema poderia alcançar na ausência
                de perdas. Tecnicamente, corresponde à máxima potência instantânea que o conjunto
                de módulos fotovoltaicos pode fornecer dentro dos padrões STC.</p>
              <p style="margin:0;">
                <strong style="color:#1e3a5f;">kWh:</strong>
                Unidade de medida padrão de energia elétrica consumida ou gerada em um determinado
                período (convencionalmente, período de um mês).</p>
            </div>

            <!-- RODAPÉ DA PÁGINA -->
            <div style="border-top:3px solid #f59e0b;padding-top:4mm;margin-top:8mm;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:9pt;font-weight:bold;color:#1e3a5f;">
                    MT SOLAR — ENERGIA RENOVÁVEL</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    mtsolar.energia@gmail.com | @mtsolar_</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    (81) 99700-3260 | (81) 99504-3980</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#6b7280;font-size:8pt;">Nº da Proposta</div>
                  <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                    PROP-${Date.now().toString().slice(-6)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 7: INDICADORES DE VIABILIDADE -->
        <div style="width:210mm;min-height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;">

          <!-- FAIXA TOPO -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
            height:18mm;padding:0 14mm;display:flex;align-items:center;
            justify-content:space-between;">
            <span style="color:#fff;font-size:13pt;font-weight:900;">
              Indicadores de Viabilidade</span>
            <span style="color:#f59e0b;font-size:9pt;font-weight:bold;">MT Solar</span>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);"></div>

          <div style="padding:8mm 14mm;">

            <!-- DESTAQUE: VALOR DO SISTEMA -->
            <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);
              border-radius:10px;padding:5mm 8mm;margin-bottom:5mm;
              display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="color:#f59e0b;font-size:8.5pt;font-weight:bold;
                  text-transform:uppercase;letter-spacing:1px;">
                  Valor Total do Sistema</div>
                <div style="color:#fff;font-size:22pt;font-weight:900;margin-top:1mm;">
                  R$ ${saleP.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                </div>
              </div>
              <div style="text-align:right;">
                <div style="color:rgba(255,255,255,0.7);font-size:8pt;">Reajuste anual previsto</div>
                <div style="color:#f59e0b;font-size:14pt;font-weight:bold;">10% a.a.</div>
              </div>
            </div>

            <!-- GRID 3 INDICADORES -->
            <table style="width:100%;border-collapse:separate;border-spacing:3mm;margin-bottom:5mm;">
              <tr>
                <td style="background:#fff8e7;border:2px solid #f59e0b;border-radius:8px;
                  padding:4mm;text-align:center;">
                  <div style="color:#92400e;font-size:8pt;font-weight:bold;
                    text-transform:uppercase;letter-spacing:1px;">Payback</div>
                  <div style="color:#1e3a5f;font-size:15pt;font-weight:900;margin:1mm 0;">
                    ${paybackAnos} anos</div>
                  <div style="color:#6b7280;font-size:8pt;">e ${paybackMesesRest} meses</div>
                </td>
                <td style="background:#f0fdf4;border:2px solid #86efac;border-radius:8px;
                  padding:4mm;text-align:center;">
                  <div style="color:#166534;font-size:8pt;font-weight:bold;
                    text-transform:uppercase;letter-spacing:1px;">ROI</div>
                  <div style="color:#1e3a5f;font-size:15pt;font-weight:900;margin:1mm 0;">
                    ${roi}x</div>
                  <div style="color:#6b7280;font-size:8pt;">retorno sobre investimento</div>
                </td>
                <td style="background:#fdf4ff;border:2px solid #e9d5ff;border-radius:8px;
                  padding:4mm;text-align:center;">
                  <div style="color:#6b21a8;font-size:8pt;font-weight:bold;
                    text-transform:uppercase;letter-spacing:1px;">TIR</div>
                  <div style="color:#1e3a5f;font-size:15pt;font-weight:900;margin:1mm 0;">
                    ${tir}%</div>
                  <div style="color:#6b7280;font-size:8pt;">taxa interna de retorno</div>
                </td>
              </tr>
            </table>

            <!-- ECONOMIA EM DESTAQUE -->
            <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;
              padding:4mm 6mm;margin-bottom:5mm;
              display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="color:#166534;font-size:8.5pt;font-weight:bold;
                  text-transform:uppercase;letter-spacing:1px;">Economia Total em 25 Anos</div>
                <div style="color:#1e3a5f;font-size:18pt;font-weight:900;">
                  R$ ${economiaTotal25.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                </div>
              </div>
              <div style="text-align:right;">
                <div style="color:#6b7280;font-size:8pt;">kWh do sistema FV</div>
                <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                  R$ ${custokWh}/kWh</div>
                <div style="color:#166534;font-size:8.5pt;font-weight:bold;">
                  R$ ${economiakWh} economia/kWh</div>
              </div>
            </div>

            <!-- TÍTULO GRÁFICO FLUXO -->
            <div style="display:flex;align-items:center;gap:3mm;margin-bottom:3mm;">
              <div style="width:4px;height:16px;background:#f59e0b;border-radius:2px;"></div>
              <span style="font-size:12pt;font-weight:900;color:#1e3a5f;">
                Fluxo de Caixa</span>
              <span style="font-size:9pt;color:#6b7280;">(Ano x R$)</span>
            </div>

            <!-- GRÁFICO SVG DE FLUXO DE CAIXA -->
            <div style="width: 100%; height: 180px;">
              <svg width="100%" height="150" viewBox="0 0 520 150">
                <line x1="10" y1="100" x2="510" y2="100" stroke="#1e3a5f" stroke-width="1.5" />
                ${fluxoCaixa.map((val, i) => {
                  const xBase = i * 20 + 10;
                  const isPositive = val >= 0;
                  const barHeight = Math.abs((val / maxFluxo) * 100);
                  const yPos = isPositive ? 100 - barHeight : 100;
                  return `
                    <rect x="${xBase}" y="${yPos}" width="14" height="${barHeight}" fill="${isPositive ? '#1e3a5f' : '#fca5a5'}" rx="1" />
                    ${[1, 5, 10, 15, 20, 25].includes(i + 1) ? `<text x="${xBase + 7}" y="145" font-size="7" text-anchor="middle" fill="#6b7280">${i + 1}ºa</text>` : ''}
                  `;
                }).join('')}
              </svg>
            </div>

            <!-- LEGENDA -->
            <div style="display:flex;justify-content:center;gap:6mm;
              margin-top:2mm;font-size:8.5pt;color:#6b7280;">
              <span>■ <span style="color:#1e3a5f;font-weight:bold;">Fluxo positivo</span></span>
              <span>■ <span style="color:#fca5a5;font-weight:bold;">Período de retorno</span></span>
            </div>

            <!-- RODAPÉ DA PÁGINA -->
            <div style="border-top:3px solid #f59e0b;padding-top:4mm;margin-top:8mm;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:9pt;font-weight:bold;color:#1e3a5f;">
                    MT SOLAR — ENERGIA RENOVÁVEL</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    mtsolar.energia@gmail.com | @mtsolar_</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    (81) 99700-3260 | (81) 99504-3980</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#6b7280;font-size:8pt;">Nº da Proposta</div>
                  <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                    PROP-${Date.now().toString().slice(-6)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 8: SIMULAÇÃO DE FINANCIAMENTO (SE APLICÁVEL) -->
        ${parseFloat(formData.financeValue || results.salePrice.toString()) > 0 ? `
        <div style="width:210mm;min-height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;">

          <!-- FAIXA TOPO -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
            height:18mm;padding:0 14mm;display:flex;align-items:center;
            justify-content:space-between;">
            <span style="color:#fff;font-size:13pt;font-weight:900;">
              Simulação de Financiamento</span>
            <span style="color:#f59e0b;font-size:9pt;font-weight:bold;">MT Solar</span>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);"></div>

          <div style="padding:10mm 14mm;">
            <p style="font-size:10.5pt;color:#6b7280;text-align:center;margin-bottom:8mm;">
              Abaixo apresentamos uma simulação de financiamento para o seu sistema fotovoltaico.
            </p>

            <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:12px;
              border:2px solid #e2e8f0;padding:8mm;margin-bottom:8mm;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;">
                <div>
                  <div style="font-size:9pt;color:#64748b;text-transform:uppercase;font-weight:bold;margin-bottom:1mm;">
                    Valor Financiado</div>
                  <div style="font-size:18pt;font-weight:900;color:#1e3a5f;">
                    R$ ${parseFloat(formData.financeValue || results.salePrice.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div style="font-size:9pt;color:#64748b;text-transform:uppercase;font-weight:bold;margin-bottom:1mm;">
                    Prazo</div>
                  <div style="font-size:18pt;font-weight:900;color:#1e3a5f;">
                    ${formData.financeTerm} meses</div>
                </div>
                <div>
                  <div style="font-size:9pt;color:#64748b;text-transform:uppercase;font-weight:bold;margin-bottom:1mm;">
                    Valor da Parcela (Estimado)</div>
                  <div style="font-size:22pt;font-weight:900;color:#f59e0b;">
                    R$ ${results.monthlyInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div style="font-size:9pt;color:#64748b;text-transform:uppercase;font-weight:bold;margin-bottom:1mm;">
                    Carência</div>
                  <div style="font-size:18pt;font-weight:900;color:#1e3a5f;">
                    ${formData.financeGracePeriod || '0'} meses</div>
                </div>
              </div>

              <div style="margin-top:8mm;padding-top:6mm;border-top:1px solid #cbd5e1;font-size:9.5pt;color:#475569;line-height:1.6;">
                * Simulação baseada na taxa de <strong>${formData.financeRate}% a.m.</strong><br/>
                * Sujeito a análise de crédito e alteração de taxa pelo banco parceiro.<br/>
                * Carência: <strong>${formData.financeGracePeriod || '0'} meses</strong> para o primeiro pagamento.
              </div>
            </div>

            <div style="background:#fff8e7;border:1.5px solid #f59e0b;border-radius:8px;padding:5mm;margin-top:5mm;">
              <div style="font-size:10pt;font-weight:bold;color:#92400e;margin-bottom:2mm;">
                💡 Dica de Economia
              </div>
              <p style="font-size:9.5pt;color:#374151;margin:0;">
                Em muitos casos, a parcela do financiamento é inferior ou equivalente à sua conta de luz atual. 
                Dessa forma, o sistema se paga com a própria economia gerada!
              </p>
            </div>

            <!-- RODAPÉ DA PÁGINA -->
            <div style="position:absolute;bottom:10mm;left:14mm;right:14mm;border-top:3px solid #f59e0b;padding-top:4mm;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:9pt;font-weight:bold;color:#1e3a5f;">
                    MT SOLAR — ENERGIA RENOVÁVEL</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    mtsolar.energia@gmail.com | @mtsolar_</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#6b7280;font-size:8pt;">Nº da Proposta</div>
                  <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                    PROP-${Date.now().toString().slice(-6)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- PÁGINA 9: SERVIÇOS INCLUSOS -->
        <div style="width:210mm;min-height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;">

          <!-- FAIXA TOPO -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
            height:18mm;padding:0 14mm;display:flex;align-items:center;
            justify-content:space-between;">
            <span style="color:#fff;font-size:13pt;font-weight:900;">
              Serviços Inclusos</span>
            <span style="color:#f59e0b;font-size:9pt;font-weight:bold;">MT Solar</span>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);"></div>


          <div style="padding:8mm 14mm;">

            <!-- LISTA DE SERVIÇOS -->
            ${[
              'Vistoria técnica e projeto elétrico do sistema.',
              'Anotação da responsabilidade técnica (ART) do projeto e instalação.',
              'Obtenção das licenças junto à concessionária de energia local.',
              'Montagem dos módulos fotovoltaicos com estruturas apropriadas para o tipo de telhado/solo.',
              'Instalação e montagem elétrica do sistema.',
              'Gestão, supervisão e fiscalização da Obra de instalação.',
              'Frete incluso de todos equipamentos referentes ao sistema.',
              'Documentação personalizada do projeto fotovoltaico.'
            ].map((servico, i) => `
              <div style="display:flex;align-items:flex-start;gap:4mm;
                padding:4mm 0;border-bottom:1px solid #f0f0f0;">
                <div style="min-width:8mm;height:8mm;background:${i % 2 === 0 ? '#1e3a5f' : '#f59e0b'};
                  border-radius:50%;display:flex;align-items:center;justify-content:center;
                  color:${i % 2 === 0 ? '#f59e0b' : '#1e3a5f'};font-weight:900;
                  font-size:9pt;flex-shrink:0;">${i + 1}</div>
                <div style="font-size:10.5pt;color:#374151;line-height:1.5;
                  padding-top:0.5mm;">${servico}</div>
              </div>
            `).join('')}

            <!-- OBS -->
            <div style="background:#fff8e7;border:1.5px solid #f59e0b;border-radius:8px;
              padding:4mm 5mm;margin-top:5mm;">
              <div style="font-size:9pt;font-weight:bold;color:#92400e;margin-bottom:1mm;">
                ⚠️ Observação Importante
              </div>
              <div style="font-size:9.5pt;color:#374151;text-align:justify;line-height:1.6;">
                Não estão inclusos eventuais serviços de alvenaria, reforço estrutural, e/ou
                alterações na rede de distribution as quais eventualmente podem ser solicitadas
                pela concessionária.
              </div>
            </div>

            <!-- TABELA DE GARANTIAS -->
            <div style="margin-top:5mm;">
              <div style="display:flex;align-items:center;gap:3mm;margin-bottom:3mm;">
                <div style="width:4px;height:16px;background:#f59e0b;border-radius:2px;"></div>
                <span style="font-size:12pt;font-weight:900;color:#1e3a5f;">
                  Garantias do Sistema</span>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
                <thead>
                  <tr style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);">
                    <th style="padding:3mm 4mm;text-align:left;color:#f59e0b;
                      border-radius:6px 0 0 0;">Componente</th>
                    <th style="padding:3mm 4mm;text-align:center;color:#fff;">
                      Garantia Defeitos</th>
                    <th style="padding:3mm 4mm;text-align:center;color:#fff;
                      border-radius:0 6px 0 0;">Garantia Eficiência</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background:#f8fafc;">
                    <td style="padding:2.5mm 4mm;color:#374151;border-bottom:1px solid #e5e7eb;">
                      Módulos Fotovoltaicos</td>
                    <td style="padding:2.5mm 4mm;text-align:center;border-bottom:1px solid #e5e7eb;">
                      <span style="background:#dcfce7;color:#166534;border-radius:4px;
                        padding:0.5mm 3mm;font-weight:bold;">${gModuloDefeito} Anos</span></td>
                    <td style="padding:2.5mm 4mm;text-align:center;border-bottom:1px solid #e5e7eb;">
                      <span style="background:#dcfce7;color:#166534;border-radius:4px;
                        padding:0.5mm 3mm;font-weight:bold;">${gModuloEfic} Anos</span></td>
                  </tr>
                  <tr>
                    <td style="padding:2.5mm 4mm;color:#374151;border-bottom:1px solid #e5e7eb;">
                      Inversor</td>
                    <td style="padding:2.5mm 4mm;text-align:center;border-bottom:1px solid #e5e7eb;">
                      <span style="background:#dcfce7;color:#166534;border-radius:4px;
                        padding:0.5mm 3mm;font-weight:bold;">${gInversor} Anos</span></td>
                    <td style="padding:2.5mm 4mm;text-align:center;border-bottom:1px solid #e5e7eb;
                      color:#9ca3af;">—</td>
                  </tr>
                  <tr style="background:#f8fafc;">
                    <td style="padding:2.5mm 4mm;color:#374151;border-bottom:1px solid #e5e7eb;">
                      Estrutura de Fixação</td>
                    <td style="padding:2.5mm 4mm;text-align:center;border-bottom:1px solid #e5e7eb;">
                      <span style="background:#dcfce7;color:#166534;border-radius:4px;
                        padding:0.5mm 3mm;font-weight:bold;">${gEstrutura} Anos</span></td>
                    <td style="padding:2.5mm 4mm;text-align:center;border-bottom:1px solid #e5e7eb;
                      color:#9ca3af;">—</td>
                  </tr>
                  <tr>
                    <td style="padding:2.5mm 4mm;color:#374151;">Instalação Elétrica</td>
                    <td style="padding:2.5mm 4mm;text-align:center;">
                      <span style="background:#dcfce7;color:#166534;border-radius:4px;
                        padding:0.5mm 3mm;font-weight:bold;">${gInstalacao} Ano(s)</span></td>
                    <td style="padding:2.5mm 4mm;text-align:center;color:#9ca3af;">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- RODAPÉ DA PÁGINA -->
            <div style="border-top:3px solid #f59e0b;padding-top:4mm;margin-top:8mm;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:9pt;font-weight:bold;color:#1e3a5f;">
                    MT SOLAR — ENERGIA RENOVÁVEL</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    mtsolar.energia@gmail.com | @mtsolar_</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    (81) 99700-3260 | (81) 99504-3980</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#6b7280;font-size:8pt;">Nº da Proposta</div>
                  <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                    PROP-${Date.now().toString().slice(-6)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 10: CONSIDERAÇÕES FINAIS E VALIDADE -->
        <div style="width:210mm;min-height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;">

          <!-- FAIXA TOPO -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
            height:18mm;padding:0 14mm;display:flex;align-items:center;
            justify-content:space-between;">
            <span style="color:#fff;font-size:13pt;font-weight:900;">
              Considerações Finais e Validade</span>
            <span style="color:#f59e0b;font-size:9pt;font-weight:bold;">MT Solar</span>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);"></div>

          <div style="padding:8mm 14mm;">

            <!-- LISTA DE CONSIDERAÇÕES -->
            ${[
              'Os valores apresentados de geração de energia são estimativas baseadas em informações consultadas no banco de dados do CRESESB, e representam médias mensais e anuais, sendo que a geração varia de acordo com os meses do ano, assim como de acordo com fatores meteorológicos.',
              'As estimativas de geração de energia, custos e economia foram baseadas e projetadas de acordo com as informações de consumo apresentadas pelo cliente, o estudo de irradiação solar local e a análise da inflação energética nos últimos anos.',
              'O sistema proposto foi projetado considerando-se o atual perfil de consumo do cliente, tal como de acordo com os requisitos apresentados pelo cliente.',
              'Por não possuir partes móveis, o sistema não exige manutenção preventiva. Periodicamente (6 meses a 1 ano), é recomendável a limpeza dos módulos fotovoltaicos para otimizar a geração de energia, especialmente em regiões/estações secas.'
            ].map((texto, i) => `
              <div style="display:flex;align-items:flex-start;gap:4mm;
                padding:4mm 0;border-bottom:1px solid #f0f0f0;">
                <div style="min-width:8mm;height:8mm;background:${i % 2 === 0 ? '#1e3a5f' : '#f59e0b'};
                  border-radius:50%;display:flex;align-items:center;justify-content:center;
                  color:${i % 2 === 0 ? '#f59e0b' : '#1e3a5f'};font-weight:900;
                  font-size:9pt;flex-shrink:0;">${i + 1}</div>
                <div style="font-size:10pt;color:#374151;line-height:1.6;
                  text-align:justify;padding-top:0.5mm;">${texto}</div>
              </div>
            `).join('')}

            <!-- VALIDADE -->
            <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);
              border-radius:10px;padding:5mm 8mm;margin-top:6mm;text-align:center;">
              <div style="color:#f59e0b;font-size:8.5pt;font-weight:bold;
                text-transform:uppercase;letter-spacing:2px;margin-bottom:2mm;">
                Validade da Proposta</div>
              <div style="color:#fff;font-size:11pt;line-height:1.8;">
                Esta proposta foi gerada em
                <strong style="color:#f59e0b;">${dataGerada}</strong>
                e é válida até
                <strong style="color:#f59e0b;">${dataValidade}</strong>
              </div>
              <div style="color:rgba(255,255,255,0.6);font-size:8.5pt;margin-top:1mm;">
                7 dias corridos a partir da data de geração</div>
            </div>

            <!-- ASSINATURAS -->
            <table style="width:100%;border-collapse:collapse;margin-top:12mm;">
              <tr>
                <td style="width:45%;text-align:center;padding:0 5mm;">
                  <div style="border-top:2px solid #1e3a5f;padding-top:3mm;">
                    <div style="font-size:10pt;font-weight:bold;color:#1e3a5f;">MT Solar</div>
                    <div style="font-size:9pt;color:#6b7280;">Responsável Técnico</div>
                  </div>
                </td>
                <td style="width:10%;"></td>
                <td style="width:45%;text-align:center;padding:0 5mm;">
                  <div style="border-top:2px solid #1e3a5f;padding-top:3mm;">
                    <div style="font-size:10pt;font-weight:bold;color:#1e3a5f;">
                      ${formData.clientName || 'Cliente'}</div>
                    <div style="font-size:9pt;color:#6b7280;">Contratante</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- RODAPÉ FINAL -->
            <div style="border-top:3px solid #f59e0b;padding-top:4mm;margin-top:10mm;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:9pt;font-weight:bold;color:#1e3a5f;">
                    MT SOLAR — ENERGIA RENOVÁVEL</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    mtsolar.energia@gmail.com | @mtsolar_</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    (81) 99700-3260 | (81) 99504-3980</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#6b7280;font-size:8pt;">Nº da Proposta</div>
                  <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                    PROP-${Date.now().toString().slice(-6)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 11: FOTOS DE VISTORIA (OPCIONAL) -->
        ${formData.includePhotos && formData.photos.length > 0 ? `
        <div style="width:210mm;min-height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;">

          <!-- FAIXA TOPO -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
            height:18mm;padding:0 14mm;display:flex;align-items:center;
            justify-content:space-between;">
            <span style="color:#fff;font-size:13pt;font-weight:900;">
              Fotos de Vistoria</span>
            <span style="color:#f59e0b;font-size:9pt;font-weight:bold;">MT Solar</span>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);"></div>

          <div style="padding:10mm 14mm;">
            <p style="font-size:10pt;color:#6b7280;margin-bottom:8mm;">
              Registros fotográficos realizados durante a vistoria técnica no local da instalação.
            </p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;">
              ${formData.photos.map((url, i) => `
                <div style="border:2px solid #f0f0f0;border-radius:8px;overflow:hidden;background:#f8fafc;">
                  <img src="${url}" style="width:100%;height:65mm;object-fit:cover;display:block;" />
                  <div style="padding:2mm;text-align:center;font-size:8pt;color:#1e3a5f;font-weight:bold;background:#fff;">
                    FOTO 0${i + 1}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- RODAPÉ DA PÁGINA -->
            <div style="position:absolute;bottom:8mm;left:14mm;right:14mm;border-top:3px solid #f59e0b;padding-top:4mm;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:9pt;font-weight:bold;color:#1e3a5f;">
                    MT SOLAR — ENERGIA RENOVÁVEL</div>
                  <div style="font-size:8pt;color:#6b7280;">
                    mtsolar.energia@gmail.com | @mtsolar_</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#6b7280;font-size:8pt;">Nº da Proposta</div>
                  <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                    PROP-${Date.now().toString().slice(-6)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
      </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    // Aguarda carregar recursos (especialmente SVGs) antes de imprimir
    setTimeout(() => {
      newWindow.print();
    }, 1500);

    // Salvar no histórico automaticamente
    saveToHistory();
  };





  const tabs = [
    { id: 'dados' as TabType, label: 'Dados do Cliente', icon: User },
    { id: 'kit' as TabType, label: 'Kit Solar', icon: Package },
    { id: 'calculo' as TabType, label: 'Cálculo & Retorno', icon: Calculator },
    { id: 'financiamento' as TabType, label: 'Financiamento', icon: CreditCard },
    { id: 'servicos' as TabType, label: 'Proposta de Serviços', icon: Wrench },
    { id: 'historico' as TabType, label: 'Histórico', icon: History },
  ];

  const currentStepIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="bg-blue-900 rounded-xl p-6 shadow-lg border-b-4 border-amber-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-amber-400 p-3 rounded-full">
              <Sun className="text-blue-900 w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gerador de Proposta Solar</h1>
              <p className="text-amber-400 font-semibold tracking-wider uppercase text-xs">Engenharia MT Solar</p>
            </div>
          </div>
          <div>
            {!formData.clientName || !formData.kitCost ? (
              <span className="bg-amber-400 text-blue-900 text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-900 rounded-full animate-ping"></div>
                Preencha os dados
              </span>
            ) : (
              <span className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-2">
                <Check size={14} />
                Proposta Pronta
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex justify-between items-center max-w-3xl mx-auto">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
          
          {tabs.map((tab, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={tab.id} className="relative z-10 flex flex-col items-center gap-2">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-amber-400 text-blue-900 ring-4 ring-amber-100 shadow-md scale-110' 
                      : isCompleted 
                        ? 'bg-blue-900 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check size={20} strokeWidth={3} /> : <span className="font-bold">{index + 1}</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${isCurrent ? 'text-blue-900' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-200 rounded-lg overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm transition-all rounded-md ${
              activeTab === tab.id
                ? 'bg-amber-400 text-blue-900 font-bold shadow-md'
                : 'text-gray-500 hover:text-blue-900 hover:bg-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 min-h-[400px]">
        {activeTab === 'dados' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-blue-900 w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-800">Informações do Cliente</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nome Completo *</label>
                <input 
                  type="text" 
                  value={formData.clientName}
                  onChange={(e) => updateForm('clientName', e.target.value)}
                  className={inputStyle}
                  placeholder="Nome do Cliente"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Telefone</label>
                <input 
                  type="text" 
                  value={formData.clientPhone}
                  onChange={(e) => updateForm('clientPhone', e.target.value)}
                  className={inputStyle}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">E-mail</label>
                <input 
                  type="email" 
                  value={formData.clientEmail}
                  onChange={(e) => updateForm('clientEmail', e.target.value)}
                  className={inputStyle}
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Endereço</label>
                <input 
                  type="text" 
                  value={formData.clientAddress}
                  onChange={(e) => updateForm('clientAddress', e.target.value)}
                  className={inputStyle}
                  placeholder="Rua, número, bairro..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Cidade</label>
                <input 
                  type="text" 
                  value={formData.clientCity}
                  onChange={(e) => updateForm('clientCity', e.target.value)}
                  className={inputStyle}
                  placeholder="Ex: Cuiabá"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Estado (UF)</label>
                <input 
                  type="text" 
                  maxLength={2}
                  value={formData.clientState}
                  onChange={(e) => updateForm('clientState', e.target.value.toUpperCase())}
                  className={inputStyle}
                  placeholder="MT"
                />
              </div>
            </div>
1236: 
1237:             {/* SEÇÃO FOTOS DE VISTORIA */}
1238:             <div className="mt-8 border-t pt-8">
1239:               <div className="flex items-center justify-between mb-4">
1240:                 <div className="flex items-center gap-2">
1241:                   <Camera className="text-blue-900 w-6 h-6" />
1242:                   <h2 className="text-xl font-bold text-gray-800">Fotos de Vistoria</h2>
1243:                 </div>
1244:                 <label className="relative inline-flex items-center cursor-pointer">
1245:                   <input 
1246:                     type="checkbox" 
1247:                     className="sr-only peer" 
1248:                     checked={formData.includePhotos}
1249:                     onChange={(e) => updateForm('includePhotos', e.target.checked.toString())}
1250:                   />
1251:                   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
1252:                   <span className="ml-3 text-sm font-medium text-gray-700">Incluir fotos de vistoria na proposta</span>
1253:                 </label>
1254:               </div>
1255: 
1256:               {formData.includePhotos && (
1257:                 <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200">
1258:                   <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
1259:                     {formData.photos.map((url, index) => (
1260:                       <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-white shadow-sm">
1261:                         <img src={url} alt={`Vistoria ${index + 1}`} className="w-full h-full object-cover" />
1262:                         <button
1263:                           type="button"
1264:                           onClick={() => {
1265:                             const newPhotos = [...formData.photos];
1266:                             newPhotos.splice(index, 1);
1267:                             setFormData(prev => ({ ...prev, photos: newPhotos }));
1268:                           }}
1269:                           className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
1270:                         >
1271:                           <Plus size={14} className="rotate-45" />
1272:                         </button>
1273:                       </div>
1274:                     ))}
1275: 
1276:                     {formData.photos.length < 5 && (
1277:                       <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all ${
1278:                         isUploadingPhoto ? 'bg-gray-100 border-gray-300' : 'bg-white border-blue-300 hover:bg-blue-50 hover:border-blue-400'
1279:                       }`}>
1280:                         {isUploadingPhoto ? (
1281:                           <div className="flex flex-col items-center">
1282:                             <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mb-2"></div>
1283:                             <span className="text-[10px] font-bold text-blue-900 uppercase">Subindo...</span>
1284:                           </div>
1285:                         ) : (
1286:                           <>
1287:                             <Plus size={24} className="text-blue-500 mb-1" />
1288:                             <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Adicionar Foto</span>
1289:                             <span className="text-[9px] text-gray-400 mt-1">{formData.photos.length}/5 fotos</span>
1290:                           </>
1291:                         )}
1292:                         <input 
1293:                           type="file" 
1294:                           className="hidden" 
1295:                           accept="image/*"
1296:                           disabled={isUploadingPhoto}
1297:                           onChange={async (e) => {
1298:                             const file = e.target.files?.[0];
1299:                             if (!file) return;
1300:                             
1301:                             setIsUploadingPhoto(true);
1302:                             try {
1303:                               const filename = `proposals/${Date.now()}-${file.name}`;
1304:                               const { data, error } = await supabase.storage
1305:                                 .from('uploads')
1306:                                 .upload(filename, file);
1307:                                 
1308:                               if (error) throw error;
1309:                               
1310:                               const { data: { publicUrl } } = supabase.storage
1311:                                 .from('uploads')
1312:                                 .getPublicUrl(filename);
1313:                                 
1314:                               setFormData(prev => ({ ...prev, photos: [...prev.photos, publicUrl] }));
1315:                             } catch (err) {
1316:                               alert('Erro ao enviar foto: ' + (err as any).message);
1317:                             } finally {
1318:                               setIsUploadingPhoto(false);
1319:                             }
1320:                           }}
1321:                         />
1322:                       </label>
1323:                     )}
1324:                   </div>
1325:                   <div className="mt-4 flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
1326:                     <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
1327:                     <p className="text-[11px] text-amber-800 leading-relaxed">
1328:                       As fotos de vistoria ajudam o cliente a entender melhor a viabilidade técnica da instalação. 
1329:                       Será criada uma seção exclusiva no final da proposta com as imagens enviadas.
1330:                     </p>
1331:                   </div>
1332:                 </div>
1333:               )}
1334:             </div>

            <div className="flex justify-end mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={() => setActiveTab('kit')}
                className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 font-medium"
              >
                Próximo: Kit Solar →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'servicos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-900 p-4 text-white">
                <h3 className="font-bold flex items-center gap-2">
                  <Wrench size={18} className="text-amber-400" />
                  Configuração da Proposta de Serviços
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nome do Cliente</label>
                    <input 
                      type="text" 
                      value={serviceFormData.clientName}
                      onChange={(e) => setServiceFormData({...serviceFormData, clientName: e.target.value})}
                      className={inputStyle}
                      placeholder="Nome completo ou Razão Social"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Responsável Técnico</label>
                    <input 
                      type="text" 
                      value={serviceFormData.responsible}
                      onChange={(e) => setServiceFormData({...serviceFormData, responsible: e.target.value})}
                      className={inputStyle}
                      placeholder="Nome do engenheiro/técnico"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-800 uppercase tracking-wider">Serviços Disponíveis</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AVAILABLE_SERVICES.map(service => (
                      <div 
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                          serviceFormData.selectedServices.includes(service.id)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-100 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          serviceFormData.selectedServices.includes(service.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white border-gray-300'
                        }`}>
                          {serviceFormData.selectedServices.includes(service.id) && <Check size={12} className="text-white" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-800">{service.name}</p>
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Valor Total (R$)</label>
                    <input 
                      type="number" 
                      value={serviceFormData.totalValue}
                      onChange={(e) => setServiceFormData({...serviceFormData, totalValue: e.target.value})}
                      className={inputStyle}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tempo de Execução</label>
                    <input 
                      type="text" 
                      value={serviceFormData.executionTime}
                      onChange={(e) => setServiceFormData({...serviceFormData, executionTime: e.target.value})}
                      className={inputStyle}
                      placeholder="Ex: 15 dias úteis"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Validade</label>
                    <input 
                      type="date" 
                      value={serviceFormData.validityDate}
                      onChange={(e) => setServiceFormData({...serviceFormData, validityDate: e.target.value})}
                      className={inputStyle}
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    onClick={generateServicePDF}
                    disabled={serviceFormData.selectedServices.length === 0 || !serviceFormData.clientName}
                    className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                      serviceFormData.selectedServices.length === 0 || !serviceFormData.clientName
                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-blue-900 hover:bg-blue-800 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <FileDown size={20} />
                    Gerar Proposta de Serviços
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kit' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="text-blue-900 w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-800">Dados do Kit Solar</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Descrição do Kit *</label>
                <input 
                  type="text" 
                  value={formData.kitName}
                  onChange={(e) => updateForm('kitName', e.target.value)}
                  className={inputStyle}
                  placeholder="Ex: Kit 5kWp — 10 Módulos 550W + Inversor Growatt 5kW"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Potência do Sistema (kWp) *</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.1"
                  value={formData.kitPower}
                  onChange={(e) => updateForm('kitPower', e.target.value)}
                  className={inputStyle}
                  placeholder="Ex: 5.5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Custo do Kit (R$) *</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.kitCost}
                  onChange={(e) => updateForm('kitCost', e.target.value)}
                  className={inputStyle}
                  placeholder="Ex: 12000.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Margem de Venda (%) *</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={formData.marginPercent}
                  onChange={(e) => updateForm('marginPercent', e.target.value)}
                  className={inputStyle}
                  placeholder="Ex: 25"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Conta de Luz Média Mensal (R$) *</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.monthlyBill}
                  onChange={(e) => updateForm('monthlyBill', e.target.value)}
                  className={inputStyle}
                  placeholder="Ex: 450.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tarifa de Energia (R$/kWh)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.energyRate}
                  onChange={(e) => updateForm('energyRate', e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Fornecedor do Kit</label>
                <input 
                  type="text" 
                  value={formData.kitSupplier}
                  onChange={(e) => updateForm('kitSupplier', e.target.value)}
                  className={inputStyle}
                  placeholder="Ex: Aldo Solar, WEG, etc."
                />
                <p className="text-[10px] text-gray-400">Opcional - se preenchido, aparece na proposta</p>
              </div>
            </div>

            {/* Preview Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6 shadow-inner relative overflow-hidden">
              {!formData.kitCost || !formData.marginPercent ? (
                <div className="absolute inset-0 bg-blue-50/80 backdrop-blur-[1px] flex items-center justify-center">
                  <p className="text-blue-900 font-bold text-sm italic">Preencha os valores acima para ver o preview</p>
                </div>
              ) : null}
              
              <h3 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wider">Preview do Valor de Venda</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div>
                  <p className="text-xs text-blue-700 uppercase font-medium">Custo do Kit</p>
                  <p className="text-lg font-semibold text-blue-900">R$ {parseFloat(formData.kitCost || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 uppercase font-medium">Margem ({formData.marginPercent || '0'}%)</p>
                  <p className="text-lg font-semibold text-blue-900">R$ {(parseFloat(formData.kitCost || '0') * parseFloat(formData.marginPercent || '0') / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-blue-200 shadow-sm transform hover:scale-105 transition-transform">
                  <p className="text-xs text-blue-700 uppercase font-bold">Valor Final de Venda</p>
                  <p className="text-3xl font-black text-blue-900">
                    R$ {(parseFloat(formData.kitCost || '0') * (1 + parseFloat(formData.marginPercent || '0') / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalhes dos Equipamentos */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-bold text-blue-900 mb-6 flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Detalhes dos Equipamentos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fabricante do Módulo</label>
                  <input 
                    type="text" 
                    value={formData.moduleModel}
                    onChange={(e) => updateForm('moduleModel', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: LEAPTON BIFACIAL"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Potência do Módulo (Wp)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.modulePower}
                    onChange={(e) => updateForm('modulePower', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 585"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Quantidade de Módulos</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.moduleQty}
                    onChange={(e) => updateForm('moduleQty', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Modelo do Inversor</label>
                  <input 
                    type="text" 
                    value={formData.inverterModel}
                    onChange={(e) => updateForm('inverterModel', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: GW5K-DNS-G40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fabricante do Inversor</label>
                  <input 
                    type="text" 
                    value={formData.inverterBrand}
                    onChange={(e) => updateForm('inverterBrand', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: GOODWE"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Potência do Inversor (W)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.inverterPower}
                    onChange={(e) => updateForm('inverterPower', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 5000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Quantidade de Inversores</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.inverterQty}
                    onChange={(e) => updateForm('inverterQty', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 1"
                  />
                </div>
              </div>

              {/* Garantias do Sistema */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-lg font-bold text-blue-900 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Garantias do Sistema
                </h3>
                <p className="text-sm text-gray-400 mb-6">Deixe em branco para usar os valores padrão de cada fabricante</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Garantia Módulo — Defeitos (anos)</label>
                    <input 
                      type="text" 
                      value={formData.garantiaModuloDefeito}
                      onChange={(e) => updateForm('garantiaModuloDefeito', e.target.value)}
                      className={inputStyle}
                      placeholder="Padrão: 10"
                    />
                    <p className="text-[10px] text-gray-400">Ex: Leapton = 10 anos</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Garantia Módulo — Eficiência (anos)</label>
                    <input 
                      type="text" 
                      value={formData.garantiaModuloEficiencia}
                      onChange={(e) => updateForm('garantiaModuloEficiencia', e.target.value)}
                      className={inputStyle}
                      placeholder="Padrão: 25"
                    />
                    <p className="text-[10px] text-gray-400">Ex: Leapton = 25 anos</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Garantia Inversor — Defeitos (anos)</label>
                    <input 
                      type="text" 
                      value={formData.garantiaInversorDefeito}
                      onChange={(e) => updateForm('garantiaInversorDefeito', e.target.value)}
                      className={inputStyle}
                      placeholder="Padrão: 10"
                    />
                    <p className="text-[10px] text-gray-400">Ex: Goodwe = 10 anos | Growatt = 5 anos</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Garantia Estrutura de Fixação (anos)</label>
                    <input 
                      type="text" 
                      value={formData.garantiaEstrutura}
                      onChange={(e) => updateForm('garantiaEstrutura', e.target.value)}
                      className={inputStyle}
                      placeholder="Padrão: 5"
                    />
                    <p className="text-[10px] text-gray-400">Varia conforme material (alumínio, aço galvanizado)</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Garantia Instalação Elétrica (anos)</label>
                    <input 
                      type="text" 
                      value={formData.garantiaInstalacao}
                      onChange={(e) => updateForm('garantiaInstalacao', e.target.value)}
                      className={inputStyle}
                      placeholder="Padrão: 1"
                    />
                    <p className="text-[10px] text-gray-400">Garantia de mão de obra</p>
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex items-start gap-2">
                  <Info className="text-blue-600 w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-800">
                    Os valores preenchidos acima serão exibidos na proposta. Se um campo ficar vazio, o valor padrão será utilizado automaticamente.
                  </p>
                </div>
              </div>
            </div>


            <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={() => setActiveTab('dados')}
                className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                ← Voltar
              </button>
              <button
                onClick={() => setActiveTab('calculo')}
                className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors font-medium flex items-center gap-2"
              >
                Calcular Retorno →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'calculo' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-blue-900 w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-800">Análise de Retorno do Investimento</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-900 text-white rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="text-amber-400 w-5 h-5" />
                  <p className="text-xs uppercase font-medium opacity-80">Valor Total do Sistema</p>
                </div>
                <p className="text-2xl font-bold">R$ {results.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] mt-1 opacity-70">Custo + Margem de {formData.marginPercent}%</p>
              </div>

              <div className="bg-amber-400 text-blue-900 rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <p className="text-xs uppercase font-bold opacity-80">Economia Anual Estimada</p>
                </div>
                <p className="text-2xl font-bold">R$ {results.annualSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] mt-1 font-medium opacity-70">Baseado na conta de R$ {formData.monthlyBill}/mês</p>
              </div>

              <div className="bg-green-600 text-white rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="w-5 h-5" />
                  <p className="text-xs uppercase font-medium opacity-80">Economia em 5 Anos</p>
                </div>
                <p className="text-2xl font-bold">R$ {results.fiveYearSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] mt-1 opacity-70">Projeção sem reajuste tarifário</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Tempo de Retorno (Payback)</h3>
              <div className="flex items-baseline gap-4">
                <p className="text-4xl font-black text-blue-900">{Math.floor(results.paybackMonths)} <span className="text-lg font-bold">meses</span></p>
                <p className="text-2xl font-bold text-gray-500">ou {(results.paybackMonths / 12).toFixed(1)} <span className="text-sm">anos</span></p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-[10px] font-bold">
                    <th className="px-4 py-3 border-b">Ano</th>
                    <th className="px-4 py-3 border-b">Economia Acumulada</th>
                    <th className="px-4 py-3 border-b">Saldo (Econ. - Inv.)</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(ano => {
                    const economiaAcumulada = results.annualSavings * ano;
                    const saldo = economiaAcumulada - results.salePrice;
                    const isPositive = saldo >= 0;
                    return (
                      <tr key={ano} className={isPositive ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-4 py-2 border-b font-bold text-gray-700">{ano}º Ano</td>
                        <td className="px-4 py-2 border-b text-gray-600">R$ {economiaAcumulada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className={`px-4 py-2 border-b font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                          R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={() => setActiveTab('kit')}
                className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                ← Voltar
              </button>
              <button
                onClick={() => setActiveTab('financiamento')}
                className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors font-medium flex items-center gap-2"
              >
                Ver Financiamento →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'financiamento' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="text-blue-900 w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-800">Simulação de Financiamento</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Valor a Financiar (R$)</label>
                <input 
                  type="number" 
                  value={formData.financeValue}
                  onChange={(e) => updateForm('financeValue', e.target.value)}
                  className={inputStyle}
                  placeholder={results.salePrice.toFixed(2)}
                />
                <button 
                  onClick={() => updateForm('financeValue', results.salePrice.toFixed(2))}
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-1"
                >
                  Usar valor do sistema: R$ {results.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Prazo (meses)</label>
                <select 
                  value={formData.financeTerm}
                  onChange={(e) => updateForm('financeTerm', e.target.value)}
                  className={inputStyle}
                >
                  {[12, 24, 36, 48, 60, 72, 84, 96].map(m => (
                    <option key={m} value={m}>{m} meses</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Taxa de Juros Mensal (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.financeRate}
                  onChange={(e) => updateForm('financeRate', e.target.value)}
                  className={inputStyle}
                />
                <p className="text-[10px] text-gray-500 mt-1 italic">Taxa média financeiras solares: 0,99% a 1,99% a.m.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Carência (meses)</label>
                <input 
                  type="number" 
                  min="0"
                  max="24"
                  value={formData.financeGracePeriod}
                  onChange={(e) => updateForm('financeGracePeriod', e.target.value)}
                  className={inputStyle}
                />
                <p className="text-[10px] text-gray-400 mt-1">Carência para o primeiro pagamento (0-24 meses)</p>
              </div>
            </div>

            {/* Result Card */}
            <div className="bg-blue-900 text-white rounded-xl p-6 mt-4 shadow-lg">
              <p className="text-xs uppercase font-bold opacity-80 mb-1">Parcela Mensal Estimada</p>
              <p className="text-5xl font-black text-amber-400 mb-2">
                R$ {results.monthlyInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm opacity-80 mb-4">{formData.financeTerm}x de R$ {results.monthlyInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              
              <div className="border-t border-blue-800 pt-4 mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase opacity-60">Total financiado</p>
                  <p className="text-sm font-bold">R$ {(results.monthlyInstallment * parseFloat(formData.financeTerm)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-60">Juros totais</p>
                  <p className="text-sm font-bold">R$ {(results.monthlyInstallment * parseFloat(formData.financeTerm) - parseFloat(formData.financeValue || results.salePrice.toString())).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            {/* Comparison Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-amber-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Calculator size={16} />
                Parcela vs. Conta de Luz
              </h3>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500">Parcela</p>
                    <p className="text-lg font-bold text-gray-800">R$ {results.monthlyInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="text-gray-300 font-bold text-xl">VS</div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500">Conta Atual</p>
                    <p className="text-lg font-bold text-gray-800">R$ {parseFloat(formData.monthlyBill || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {results.monthlyInstallment <= parseFloat(formData.monthlyBill || '0') ? (
                <div className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center gap-2 text-sm font-bold border border-green-200">
                  <div className="bg-green-500 text-white rounded-full p-0.5">
                    <Zap size={12} fill="currentColor" />
                  </div>
                  ✓ A parcela é menor que sua conta atual!
                </div>
              ) : (
                <div className="bg-blue-100 text-blue-800 p-3 rounded-lg flex items-center gap-2 text-sm font-bold border border-blue-200">
                  <TrendingUp size={16} />
                  O cliente economiza a diferença após o payback
                </div>
              )}
            </div>

            <div className="flex justify-start mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={() => setActiveTab('calculo')}
                className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                ← Voltar
              </button>
            </div>
          </div>
        )}




      </div>


      {/* Footer Action */}
      <div className="flex justify-end pt-4">
        <button
          onClick={() => {
            if (!isReady) return;
            generatePDF();
          }}
          title={!isReady ? "Preencha os dados obrigatórios" : ""}
          className={`flex items-center gap-2 px-8 py-4 font-bold rounded-lg shadow-lg transition-all ${
            isReady 
              ? 'bg-amber-400 text-blue-900 hover:bg-amber-500 hover:scale-105 active:scale-95' 
              : 'bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed'
          }`}
        >
          <FileDown className="w-5 h-5" />
          Baixar Proposta em PDF
        </button>
      </div>

    </div>
  );
}

