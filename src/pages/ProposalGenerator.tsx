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

  const saveToHistory = async (proposalNumber: string) => {
    try {
      const salePrice = results.salePrice || (Number(formData.kitCost) * (1 + Number(formData.marginPercent)/100));
      
      await api.post('/api/proposal-history', {
        client_name: formData.clientName || 'Cliente sem nome',
        margin: parseFloat(formData.marginPercent) || 0,
        kit_value: salePrice,
        proposal_number: proposalNumber
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
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

  const updateForm = (field: string, value: string | boolean) => setFormData(prev => ({ ...prev, [field]: value }));
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

  const generatePDF = async () => {
    const AZUL = '#1e3a5f';
    const AZUL_CLARO = '#d6e4f0';
    const AMARELO = '#f59e0b';
    const CINZA = '#6b7280';
    const proposalNumber = `PROP-${Date.now().toString().slice(-6)}`;
    const dataGerada = new Date().toLocaleDateString('pt-BR');
    const validade = new Date();
    validade.setDate(validade.getDate() + 7);
    const dataValidade = validade.toLocaleDateString('pt-BR');

    // Cálculos para a Página 4
    const monthlyBillVal = Number(formData.monthlyBill) || 450;
    const energyRateVal = Number(formData.energyRate) || 0.85;
    const consumoMensal = Math.round(monthlyBillVal / energyRateVal);
    const kitPowerVal = Number(formData.kitPower) || 5;
    const fatorSazonalidade = [0.95, 0.92, 0.90, 0.88, 0.82, 0.75, 0.73, 0.80, 0.90, 0.95, 0.97, 0.98];
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const geracaoMes = fatorSazonalidade.map(f => Math.round(kitPowerVal * 30 * 4.5 * f));
    const maxVal = Math.max(consumoMensal, ...geracaoMes) + 100;

    // Cálculos para a Página 5
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
    
    const geracaoAnual = kitPowerVal * 365 * 4.5;
    const custokWh = geracaoAnual > 0 ? (saleP / (geracaoAnual * 25)).toFixed(2) : '0';
    const economiakWh = (Number(formData.energyRate) - Number(custokWh)).toFixed(2);
    
    const maxFC = Math.max(...fluxoCaixa);
    const minFC = Math.min(...fluxoCaixa);

    const newWindow = window.open('', '_blank');
    if (!newWindow) return;

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
          }
          @media print {
            @page { size: A4; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }

          /* PÁGINA 1: CAPA */
          .sidebar-capa { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 18mm; 
            height: 100%; 
            background: ${AZUL}; 
          }
          .top-bar-capa { 
            width: 100%; 
            height: 14mm; 
            background: #fff; 
            border-bottom: 2px solid ${AZUL_CLARO}; 
            display: flex; 
            align-items: center; 
            padding-left: 24mm; 
          }
          .top-bar-text { 
            font-size: 9pt; 
            color: ${AZUL}; 
            font-weight: bold; 
            letter-spacing: 2px; 
          }
          .grid-bg { 
            position: absolute; 
            top: 0; 
            left: 18mm; 
            right: 0; 
            bottom: 0; 
            background-image: linear-gradient(${AZUL_CLARO}22 1px, transparent 1px), linear-gradient(90deg, ${AZUL_CLARO}22 1px, transparent 1px);
            background-size: 20mm 20mm;
            opacity: 0.5;
          }
          .capa-content { 
            position: relative; 
            padding-left: 28mm; 
            margin-top: 60mm; 
          }
          .capa-title { 
            margin-top: 20mm; 
          }
          .capa-title span { 
            font-size: 52pt; 
            font-weight: 900; 
            color: ${AZUL}; 
            line-height: 1.1; 
            display: block; 
          }
          .capa-footer { 
            position: absolute; 
            bottom: 12mm; 
            left: 28mm; 
            font-size: 9pt; 
            color: ${CINZA}; 
            line-height: 1.8; 
          }

          /* ESTILOS PÁGINAS INTERNAS */
          .header-interna {
            width: 100%;
            border-bottom: 2px solid ${AZUL};
            margin-bottom: 6mm;
            padding-bottom: 2mm;
          }
          .footer-interna {
            border-top: 2px solid ${AZUL};
            padding-top: 3mm;
            margin-top: auto;
            font-size: 8pt;
            color: ${CINZA};
          }

          /* PÁGINA 2: SOBRE NÓS */
          .page-sobre {
            padding: 16mm 16mm 16mm 28mm;
            display: flex;
            flex-direction: column;
            background: #fff;
          }
          .header-sobre {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-sobre h1 {
            font-size: 18pt;
            font-weight: 900;
            color: ${AZUL};
            margin: 0;
          }
          .separator-sobre {
            border-bottom: 3px solid ${AZUL};
            margin-bottom: 6mm;
            margin-top: 2mm;
          }
          .texto-sobre {
            font-size: 10pt;
            color: #333;
            line-height: 1.8;
            text-align: justify;
          }
          .cards-sobre {
            margin-top: 8mm;
            width: 100%;
            border-collapse: collapse;
          }
          .card-item {
            padding: 6mm;
            text-align: center;
            width: 33.33%;
          }
          .card-title {
            font-size: 16pt;
            font-weight: 900;
            color: ${AZUL};
            margin-bottom: 2mm;
          }
          .section-title-sobre {
            font-size: 12pt;
            font-weight: 900;
            color: ${AZUL};
            margin-top: 8mm;
          }
          .separator-light {
            border-bottom: 2px solid ${AZUL_CLARO};
            margin-bottom: 4mm;
            margin-top: 1mm;
          }
          .map-container {
            width: 100%;
            border-collapse: collapse;
          }

          /* PÁGINA 3: CLIENTE + EQUIPAMENTOS */
          .page-equip {
            padding: 16mm;
            display: flex;
            flex-direction: column;
            background: #fff;
          }
          .card-cliente {
            background: ${AZUL_CLARO}33;
            border-left: 4px solid ${AZUL};
            border-radius: 4px;
            padding: 4mm 6mm;
            margin-bottom: 6mm;
          }
          .equip-table {
            width: 100%;
            border-collapse: collapse;
          }
          .equip-col {
            width: 50%;
            vertical-align: top;
            padding-right: 4mm;
          }
          .equip-item {
            margin-bottom: 2mm;
            font-size: 10pt;
          }
          .equip-label {
            color: ${CINZA};
          }
          .equip-value {
            font-weight: bold;
            color: ${AZUL};
          }

          /* PÁGINA 4: INFORMAÇÕES DO SISTEMA */
          .page-info-sistema {
            padding: 16mm;
            display: flex;
            flex-direction: column;
            background: #fff;
          }
          .card-dados-sistema {
            background: #fff;
            border: 1px solid ${AZUL_CLARO};
            border-radius: 6px;
            padding: 4mm 8mm;
            margin-bottom: 6mm;
          }
          .legenda-item {
            font-size: 9pt;
            color: ${CINZA};
            margin-top: 2mm;
            line-height: 1.4;
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

        <!-- PÁGINA 5: CLIENTE + EQUIPAMENTOS -->
        <div class="page page-equip">
          <table class="header-interna">
            <tr>
              <td>
                <div style="font-size:10pt; font-weight:bold; color:${AZUL};">MT SOLAR</div>
                <div style="font-size:8pt; color:${CINZA};">— Energia renovável —</div>
              </td>
              <td style="text-align:right; color:${CINZA}; font-size:9pt;">
                Proposta Comercial
              </td>
            </tr>
          </table>

          <div class="card-cliente">
            <div style="font-size:11pt; font-weight:bold; color:${AZUL}; margin-bottom:2mm;">DADOS DO CLIENTE</div>
            <table style="width:100%; font-size:10pt; border-collapse: collapse;">
              <tr><td style="color:${CINZA}; width:100px; padding:1mm 0;">Nome:</td><td style="font-weight:bold; color:${AZUL};">${formData.clientName}</td></tr>
              <tr><td style="color:${CINZA}; padding:1mm 0;">Telefone:</td><td style="font-weight:bold; color:${AZUL};">${formData.clientPhone}</td></tr>
              <tr><td style="color:${CINZA}; padding:1mm 0;">E-mail:</td><td style="font-weight:bold; color:${AZUL};">${formData.clientEmail}</td></tr>
              <tr><td style="color:${CINZA}; padding:1mm 0;">Endereço:</td><td style="font-weight:bold; color:${AZUL};">${formData.clientAddress}</td></tr>
              <tr><td style="color:${CINZA}; padding:1mm 0;">Cidade/Estado:</td><td style="font-weight:bold; color:${AZUL};">${formData.clientCity} - ${formData.clientState}</td></tr>
            </table>
            <div style="margin-top:4mm; display:flex; justify-content:space-between;">
              <span style="font-size:9pt; color:${CINZA};">Ref: ${proposalNumber}</span>
              <span style="font-size:9pt; color:${CINZA};">Proposta gerada em: ${dataGerada}</span>
            </div>
          </div>

          <div style="font-size:12pt; font-weight:bold; color:${AZUL}; margin-top:4mm;">EQUIPAMENTOS DO SISTEMA</div>
          <div class="separator-light"></div>
          
          <div style="margin-bottom: 4mm; font-size: 10pt; color: ${CINZA}; font-weight: bold;">
            Descrição do Kit: <span style="color: ${AZUL};">${formData.kitName || 'Kit Fotovoltaico Standard'}</span>
          </div>

          <table class="equip-table">
            <tr>
              <td class="equip-col">
                <div style="display:flex; align-items:center; gap:2mm; margin-bottom:3mm;">
                  <span style="font-size:14pt;">🔲</span>
                  <span style="font-size:11pt; font-weight:bold; color:${AZUL};">Módulo Fotovoltaico</span>
                </div>
                <div class="equip-item"><span class="equip-label">Fabricante:</span> <span class="equip-value">${formData.moduleModel || 'Conforme proposta'}</span></div>
                <div class="equip-item"><span class="equip-label">Potência:</span> <span class="equip-value">${formData.modulePower} Wp</span></div>
                <div class="equip-item"><span class="equip-label">Garantia (defeitos):</span> <span class="equip-value">10 Anos</span></div>
                <div class="equip-item"><span class="equip-label">Garantia (eficiência):</span> <span class="equip-value">25 Anos</span></div>
                <div class="equip-item"><span class="equip-label">Quantidade:</span> <span class="equip-value">${formData.moduleQty} unidades</span></div>
              </td>
              <td class="equip-col">
                <div style="display:flex; align-items:center; gap:2mm; margin-bottom:3mm;">
                  <span style="font-size:14pt;">⚡</span>
                  <span style="font-size:11pt; font-weight:bold; color:${AZUL};">Inversor</span>
                </div>
                <div class="equip-item"><span class="equip-label">Modelo:</span> <span class="equip-value">${formData.inverterModel || 'Conforme proposta'}</span></div>
                <div class="equip-item"><span class="equip-label">Fabricante:</span> <span class="equip-value">${formData.inverterBrand || 'Conforme proposta'}</span></div>
                <div class="equip-item"><span class="equip-label">Potência:</span> <span class="equip-value">${formData.inverterPower} W</span></div>
                <div class="equip-item"><span class="equip-label">Garantia (defeitos):</span> <span class="equip-value">10 Anos</span></div>
                <div class="equip-item"><span class="equip-label">Monitoramento:</span> <span class="equip-value">Wi-Fi</span></div>
                <div class="equip-item"><span class="equip-label">Quantidade:</span> <span class="equip-value">${formData.inverterQty} unidade(s)</span></div>
              </td>
            </tr>
          </table>

          <div style="margin-top: 6mm; background: ${AZUL_CLARO}44; border-radius:4px; padding: 3mm 4mm;">
            <div style="display:flex; align-items:center; gap:2mm; margin-bottom:2mm;">
              <span style="font-size:12pt;">🔌</span>
              <span style="font-size:10pt; font-weight:bold; color:${AZUL};">Equipamento Adicional</span>
            </div>
            <div style="font-size:10pt; color:${AZUL}; font-weight:bold;">ESTRUTURA DE FIXAÇÃO</div>
            <div style="font-size:9pt; color:${CINZA};">Quantidade: conforme projeto</div>
          </div>

          <div class="footer-interna" style="margin-top: auto;">
            <div style="font-weight:bold; color:${AZUL};">MT SOLAR - ENERGIA RENOVÁVEL</div>
            <div>mtsolar.energia@gmail.com | @mtsolar_ | Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE | (81) 99700-3260 | (81) 99504-3980</div>
          </div>
        </div>

        <!-- PÁGINA 6: INFORMAÇÕES DO SISTEMA -->
        <div class="page page-info-sistema">
          <table class="header-interna">
            <tr>
              <td>
                <div style="font-size:10pt; font-weight:bold; color:${AZUL};">MT SOLAR</div>
                <div style="font-size:8pt; color:${CINZA};">— Energia renovável —</div>
              </td>
              <td style="text-align:right; color:${CINZA}; font-size:9pt;">
                Proposta Comercial
              </td>
            </tr>
          </table>

          <div style="text-align:center; margin-bottom: 8mm;">
            <div style="font-size:16pt; font-weight:bold; color:${AZUL};">Informações do Sistema</div>
            <div style="font-size:10pt; color:${CINZA};">As principais informações do sistema proposto estão indicadas nesta seção.</div>
          </div>

          <div class="card-dados-sistema">
            <table style="width:100%; font-size:11pt; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid ${AZUL_CLARO}88;">
                <td style="padding: 3mm 0; color:${CINZA};">Potência do sistema:</td>
                <td style="padding: 3mm 0; text-align:right; color:${AZUL}; font-weight:bold;">${formData.kitPower} kWp</td>
              </tr>
              <tr style="border-bottom: 1px solid ${AZUL_CLARO}88;">
                <td style="padding: 3mm 0; color:${CINZA};">Área mínima requerida:</td>
                <td style="padding: 3mm 0; text-align:right; color:${AZUL}; font-weight:bold;">${(Number(formData.moduleQty || 9) * 1.87).toFixed(2)} m²</td>
              </tr>
              <tr style="border-bottom: 1px solid ${AZUL_CLARO}88;">
                <td style="padding: 3mm 0; color:${CINZA};">Peso distribuído dos módulos:</td>
                <td style="padding: 3mm 0; text-align:right; color:${AZUL}; font-weight:bold;">${(Number(formData.moduleQty || 9) * 1.6).toFixed(2)} kg/m²</td>
              </tr>
              <tr>
                <td style="padding: 3mm 0; color:${CINZA};">Vida útil do sistema:</td>
                <td style="padding: 3mm 0; text-align:right; color:${AZUL}; font-weight:bold;">25 a 35 Anos</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 4mm;">
            <div style="font-size:13pt; font-weight:bold; color:${AZUL}; text-align:center; margin-bottom:6mm;">Consumo X Geração</div>
            
            <div style="width:100%; height:180px; position:relative; margin-bottom: 10mm;">
              <svg width="100%" height="160" viewBox="0 0 500 160" preserveAspectRatio="none">
                <!-- Linhas de grade horizontais -->
                <line x1="0" y1="20" x2="500" y2="20" stroke="${AZUL_CLARO}" stroke-width="0.5" stroke-dasharray="2,2" />
                <line x1="0" y1="60" x2="500" y2="60" stroke="${AZUL_CLARO}" stroke-width="0.5" stroke-dasharray="2,2" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="${AZUL_CLARO}" stroke-width="0.5" stroke-dasharray="2,2" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="${AZUL}" stroke-width="1" />

                ${meses.map((mes, i) => {
                  const xBase = i * 40 + 10;
                  const hConsumo = (consumoMensal / maxVal) * 120;
                  const hGeracao = (geracaoMes[i] / maxVal) * 120;
                  return `
                    <rect x="${xBase}" y="${140 - hConsumo}" width="16" height="${hConsumo}" fill="#9ca3af" rx="2" />
                    <rect x="${xBase + 18}" y="${140 - hGeracao}" width="16" height="${hGeracao}" fill="${AZUL}" rx="2" />
                    <text x="${xBase + 17}" y="155" font-size="7" text-anchor="middle" fill="${CINZA}">${mes}</text>
                  `;
                }).join('')}
              </svg>
            </div>

            <div style="display:flex; justify-content:center; gap:10mm; margin-top:4mm;">
              <div style="display:flex; align-items:center; gap:2mm; font-size:9pt; color:${CINZA};">
                <div style="width:10px; height:10px; background:#9ca3af; border-radius:50%;"></div> Consumo (kWh)
              </div>
              <div style="display:flex; align-items:center; gap:2mm; font-size:9pt; color:${CINZA};">
                <div style="width:10px; height:10px; background:${AZUL}; border-radius:50%;"></div> Geração (kWh)
              </div>
            </div>
          </div>

          <div style="margin-top: 10mm; background: ${AZUL_CLARO}22; padding: 4mm; border-radius: 6px;">
            <div class="legenda-item"><strong>kWp:</strong> Simplificadamente, é a máxima potência que o sistema poderia alcançar em condições ideais de laboratório (STC). É a unidade usada para medir o tamanho do seu sistema.</div>
            <div class="legenda-item"><strong>kWh:</strong> Unidade de medida padrão de energia elétrica consumida ou gerada ao longo do tempo. É o que você paga na sua conta de luz.</div>
          </div>

          <div class="footer-interna" style="margin-top: auto;">
            <div style="font-weight:bold; color:${AZUL};">MT SOLAR - ENERGIA RENOVÁVEL</div>
            <div>mtsolar.energia@gmail.com | @mtsolar_ | Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE | (81) 99700-3260 | (81) 99504-3980</div>
          </div>
        </div>

        <!-- PÁGINA 7: INDICADORES DE VIABILIDADE -->
        <div class="page">
          <table class="header-interna">
            <tr>
              <td>
                <div style="font-size:10pt; font-weight:bold; color:${AZUL};">MT SOLAR</div>
                <div style="font-size:8pt; color:${CINZA};">— Energia renovável —</div>
              </td>
              <td style="text-align:right; color:${CINZA}; font-size:9pt;">
                Proposta Comercial
              </td>
            </tr>
          </table>

          <div style="text-align:center; margin-bottom: 6mm;">
            <div style="font-size:14pt; font-weight:bold; color:${AZUL};">Indicadores de Viabilidade</div>
          </div>

          <div style="background: #fff; border: 1px solid ${AZUL_CLARO}; border-radius:6px; padding:4mm 6mm;">
            <table style="width:100%; border-collapse: collapse; font-size:10pt;">
              <tr style="border-bottom:1px solid ${AZUL_CLARO}33;">
                <td style="padding:3mm 0; font-size:13pt; font-weight:bold; text-decoration:underline; color:${AZUL}">Valor do sistema:</td>
                <td style="padding:3mm 0; text-align:right; font-size:13pt; font-weight:bold; color:${AZUL}">R$ ${saleP.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
              </tr>
              <tr style="border-bottom:1px solid ${AZUL_CLARO}33;">
                <td style="padding:2mm 0; color:${CINZA}">Reajuste anual de energia:</td>
                <td style="padding:2mm 0; text-align:right; font-weight:bold;">10%</td>
              </tr>
              <tr style="border-bottom:1px solid ${AZUL_CLARO}33;">
                <td style="padding:2mm 0; color:${CINZA}">Payback (tempo de retorno):</td>
                <td style="padding:2mm 0; text-align:right; font-weight:bold;">${paybackAnos} anos e ${paybackMesesRest} meses</td>
              </tr>
              <tr style="border-bottom:1px solid ${AZUL_CLARO}33;">
                <td style="padding:2mm 0; color:${CINZA}">ROI (retorno sobre investimento):</td>
                <td style="padding:2mm 0; text-align:right; font-weight:bold;">${roi} vezes</td>
              </tr>
              <tr style="border-bottom:1px solid ${AZUL_CLARO}33;">
                <td style="padding:2mm 0; color:${CINZA}">TIR (taxa interna de retorno):</td>
                <td style="padding:2mm 0; text-align:right; font-weight:bold;">${tir} %</td>
              </tr>
              <tr style="border-bottom:1px solid ${AZUL_CLARO}33;">
                <td style="padding:2mm 0; color:${CINZA}">Valor kWh Sistema FV:</td>
                <td style="padding:2mm 0; text-align:right; font-weight:bold;">R$ ${custokWh}/kWh (R$ ${economiakWh} de economia por kWh)</td>
              </tr>
              <tr>
                <td style="padding:3mm 0; font-weight:bold; color:${AZUL}">Economia total em 25 anos:</td>
                <td style="padding:3mm 0; text-align:right; font-weight:bold; color:${AZUL}">R$ ${economiaTotal25.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
              </tr>
            </table>
          </div>

          <div style="text-align:center; margin-top:8mm; margin-bottom:4mm;">
            <div style="font-size:12pt; font-weight:bold; color:${AZUL};">Fluxo de Caixa (Ano x R$)</div>
          </div>

          <div style="width:100%; height:160px; position:relative;">
            <svg width="100%" height="150" viewBox="0 0 520 150" preserveAspectRatio="none">
              <!-- Eixo X (Zero) -->
              <line x1="0" y1="100" x2="520" y2="100" stroke="${CINZA}" stroke-width="1" />
              
              ${fluxoCaixa.map((val, i) => {
                const xBase = i * 20 + 10;
                const barWidth = 14;
                const absMax = Math.max(maxFC, Math.abs(minFC));
                const barHeight = (Math.abs(val) / absMax) * 80;
                const y = val >= 0 ? 100 - barHeight : 100;
                const color = val >= 0 ? AZUL : '#ef4444';
                
                let label = '';
                if ([1, 5, 10, 15, 20, 25].includes(i + 1)) {
                  label = `<text x="${xBase + 7}" y="145" font-size="8" text-anchor="middle" fill="${CINZA}">${i + 1}</text>`;
                }

                return `
                  <rect x="${xBase}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="1" />
                  ${label}
                `;
              }).join('')}
            </svg>
          </div>
          
          <div style="display:flex; justify-content:center; gap:5mm; margin-top:2mm; font-size:8pt; color:${CINZA};">
            <div style="display:flex; align-items:center; gap:1mm;">
              <div style="width:8px; height:8px; background:${AZUL}; border-radius:2px;"></div> Fluxo de Caixa (R$)
            </div>
          </div>

          <div class="footer-interna" style="margin-top: auto;">
            <div style="font-weight:bold; color:${AZUL};">MT SOLAR - ENERGIA RENOVÁVEL</div>
            <div>mtsolar.energia@gmail.com | @mtsolar_ | Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE | (81) 99700-3260 | (81) 99504-3980</div>
          </div>
        </div>

        <!-- PÁGINA 8: SERVIÇOS INCLUSOS -->
        <div class="page">
          <table class="header-interna">
            <tr>
              <td>
                <div style="font-size:10pt; font-weight:bold; color:${AZUL};">MT SOLAR</div>
                <div style="font-size:8pt; color:${CINZA};">— Energia renovável —</div>
              </td>
              <td style="text-align:right; color:${CINZA}; font-size:9pt;">
                Proposta Comercial
              </td>
            </tr>
          </table>

          <div style="text-align:center; margin-bottom: 6mm;">
            <div style="font-size:16pt; font-weight:bold; color:${AZUL};">Serviços Inclusos</div>
            <div style="margin-top:2mm; border-bottom: 2px solid ${AZUL_CLARO}; width: 60mm; margin: 2mm auto;"></div>
          </div>

          <div style="font-size:11pt; line-height:2; color:#333; margin-top: 6mm;">
            <div style="padding: 2mm 0; border-bottom: 1px solid ${AZUL_CLARO}33;">1. Vistoria técnica e projeto elétrico do sistema.</div>
            <div style="padding: 2mm 0; border-bottom: 1px solid ${AZUL_CLARO}33;">2. Anotação da responsabilidade técnica (ART) do projeto e instalação.</div>
            <div style="padding: 2mm 0; border-bottom: 1px solid ${AZUL_CLARO}33;">3. Obtenção das licenças junto à concessionária de energia local.</div>
            <div style="padding: 2mm 0; border-bottom: 1px solid ${AZUL_CLARO}33;">4. Montagem dos módulos fotovoltaicos com estruturas apropriadas para o tipo de telhado/solo.</div>
            <div style="padding: 2mm 0; border-bottom: 1px solid ${AZUL_CLARO}33;">5. Instalação e montagem elétrica do sistema.</div>
            <div style="padding: 2mm 0; border-bottom: 1px solid ${AZUL_CLARO}33;">6. Gestão, supervisão e fiscalização da Obra de instalação.</div>
            <div style="padding: 2mm 0; border-bottom: 1px solid ${AZUL_CLARO}33;">7. Frete incluso de todos equipamentos referentes ao sistema.</div>
            <div style="padding: 2mm 0; border-bottom: 1px solid ${AZUL_CLARO}33;">8. Documentação personalizada do projeto fotovoltaico.</div>
          </div>

          <div style="background: ${AZUL_CLARO}44; border-radius:4px; padding:4mm; margin-top:6mm;">
            <div style="font-size:10pt; color:${CINZA}; text-align:center; font-style:italic;">
              "OBS: Não estão inclusos eventuais serviços de alvenaria, reforço estrutural, e/ou alterações na rede de distribuição as quais eventualmente podem ser solicitadas pela concessionária."
            </div>
          </div>

          <div style="margin-top: 8mm; background:${AZUL}11; border:1px solid ${AZUL}44; border-radius:6px; padding:6mm;">
            <div style="font-weight:bold; color:${AZUL}; margin-bottom:4mm; font-size:12pt; text-align:center;">Garantias do Sistema</div>
            
            <table style="width:100%; border-collapse: collapse; font-size:10pt; border: 1px solid ${AZUL_CLARO};">
              <thead>
                <tr style="background: ${AZUL}; color: white;">
                  <th style="padding: 3mm; text-align: left;">Componente</th>
                  <th style="padding: 3mm; text-align: center;">Garantia Defeitos</th>
                  <th style="padding: 3mm; text-align: center;">Garantia Eficiência</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid ${AZUL_CLARO};">
                  <td style="padding: 3mm;">Módulos Fotovoltaicos</td>
                  <td style="padding: 3mm; text-align: center;">10 Anos</td>
                  <td style="padding: 3mm; text-align: center;">25 Anos</td>
                </tr>
                <tr style="border-bottom: 1px solid ${AZUL_CLARO};">
                  <td style="padding: 3mm;">Inversor</td>
                  <td style="padding: 3mm; text-align: center;">10 Anos</td>
                  <td style="padding: 3mm; text-align: center;">—</td>
                </tr>
                <tr style="border-bottom: 1px solid ${AZUL_CLARO};">
                  <td style="padding: 3mm;">Estrutura de Fixação</td>
                  <td style="padding: 3mm; text-align: center;">5 Anos</td>
                  <td style="padding: 3mm; text-align: center;">—</td>
                </tr>
                <tr>
                  <td style="padding: 3mm;">Instalação Elétrica</td>
                  <td style="padding: 3mm; text-align: center;">1 Ano</td>
                  <td style="padding: 3mm; text-align: center;">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer-interna" style="margin-top: auto;">
            <div style="font-weight:bold; color:${AZUL};">MT SOLAR - ENERGIA RENOVÁVEL</div>
            <div>mtsolar.energia@gmail.com | @mtsolar_ | Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE | (81) 99700-3260 | (81) 99504-3980</div>
          </div>
        </div>

        <!-- PÁGINA 9: CONSIDERAÇÕES FINAIS E VALIDADE -->
        <div class="page">
          <table class="header-interna">
            <tr>
              <td>
                <div style="font-size:10pt; font-weight:bold; color:${AZUL};">MT SOLAR</div>
                <div style="font-size:8pt; color:${CINZA};">— Energia renovável —</div>
              </td>
              <td style="text-align:right; color:${CINZA}; font-size:9pt;">
                Proposta Comercial
              </td>
            </tr>
          </table>

          <div style="text-align:center; margin-bottom: 6mm;">
            <div style="font-size:16pt; font-weight:bold; color:${AZUL};">Considerações Finais e Validade</div>
          </div>

          <div style="font-size:10pt; line-height:1.8; color:#333; text-align:justify;">
            <div style="padding:2mm 0; border-bottom:1px solid ${AZUL_CLARO}33;">1. Os valores apresentados de geração de energia são estimativas baseadas em informações consultadas no banco de dados do CRESESB, e representam médias mensais e anuais, sendo que a geração varia de acordo com os meses do ano, assim como de acordo com fatores meteorológicos.</div>
            <div style="padding:2mm 0; border-bottom:1px solid ${AZUL_CLARO}33;">2. As estimativas de geração de energia, custos e economia foram baseadas e projetadas de acordo com as informações de consumo apresentadas pelo cliente, o estudo de irradiação solar local e a análise da inflação energética nos últimos anos.</div>
            <div style="padding:2mm 0; border-bottom:1px solid ${AZUL_CLARO}33;">3. O sistema proposto foi projetado considerando-se o atual perfil de consumo do cliente, tal como de acordo com os requisitos apresentados pelo cliente.</div>
            <div style="padding:2mm 0; border-bottom:1px solid ${AZUL_CLARO}33;">4. Por não possuir partes móveis, o sistema não exige manutenção preventiva. Periodicamente (6 meses a 1 ano), é recomendável a limpeza dos módulos fotovoltaicos para otimizar a geração de energia, especialmente em regiões/estações secas.</div>
          </div>

          <div style="margin-top: 8mm; background:${AZUL_CLARO}55; border-radius:6px; padding:5mm; text-align:center;">
            <div style="font-size:11pt; color:#333;">
              Esta proposta foi gerada em <strong style="color:${AZUL}">${dataGerada}</strong> e é válida até <strong style="color:${AMARELO}">${dataValidade}</strong>
            </div>
            <div style="font-size:9pt; color:${CINZA}; margin-top:2mm;">Validade de 7 dias corridos a partir da data de geração.</div>
          </div>

          <div style="margin-top: 15mm;">
            <table style="width:100%; border-collapse: collapse;">
              <tr>
                <td style="width:45%; text-align:center; padding-top:10mm;">
                  <div style="border-top: 1px solid ${CINZA}; padding-top:2mm;">
                    <div style="font-size:10pt; font-weight:bold; color:${AZUL};">MT Solar</div>
                    <div style="font-size:9pt; color:${CINZA};">Responsável Técnico</div>
                  </div>
                </td>
                <td style="width:10%;"></td>
                <td style="width:45%; text-align:center; padding-top:10mm;">
                  <div style="border-top: 1px solid ${CINZA}; padding-top:2mm;">
                    <div style="font-size:10pt; font-weight:bold; color:${AZUL};">${formData.clientName}</div>
                    <div style="font-size:9pt; color:${CINZA};">Cliente</div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <div style="margin-top: auto; border-top: 3px solid ${AZUL}; padding-top:3mm;">
            <div style="font-weight:bold; color:${AZUL}; font-size:9pt;">MT SOLAR - ENERGIA RENOVÁVEL</div>
            <div style="font-size:8pt; color:${CINZA}; margin-top:1mm;">mtsolar.energia@gmail.com | @mtsolar_ | (81) 99700-3260 | (81) 99504-3980</div>
            <div style="font-size:8pt; color:${CINZA}; margin-top:1mm;">Número da proposta: ${proposalNumber}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
    setTimeout(() => { newWindow.print(); }, 1500);
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
  const isReady = !!formData.clientName && !!formData.kitCost;

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

            {/* SEÇÃO FOTOS DE VISTORIA */}
            <div className="mt-8 border-t pt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Camera className="text-blue-900 w-6 h-6" />
                  <h2 className="text-xl font-bold text-gray-800">Fotos de Vistoria</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={formData.includePhotos}
                    onChange={(e) => updateForm('includePhotos', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Incluir fotos de vistoria na proposta</span>
                </label>
              </div>

              {formData.includePhotos && (
                <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {formData.photos.map((url, index) => (
                      <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-white shadow-sm">
                        <img src={url} alt={`Vistoria ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const newPhotos = [...formData.photos];
                            newPhotos.splice(index, 1);
                            setFormData(prev => ({ ...prev, photos: newPhotos }));
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus size={14} className="rotate-45" />
                        </button>
                      </div>
                    ))}

                    {formData.photos.length < 5 && (
                      <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                        isUploadingPhoto ? 'bg-gray-100 border-gray-300' : 'bg-white border-blue-300 hover:bg-blue-50 hover:border-blue-400'
                      }`}>
                        {isUploadingPhoto ? (
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-[10px] font-bold text-blue-900 uppercase">Subindo...</span>
                          </div>
                        ) : (
                          <>
                            <Plus size={24} className="text-blue-500 mb-1" />
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Adicionar Foto</span>
                            <span className="text-[9px] text-gray-400 mt-1">{formData.photos.length}/5 fotos</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          disabled={isUploadingPhoto}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            setIsUploadingPhoto(true);
                            try {
                              const filename = `proposals/${Date.now()}-${file.name}`;
                              const { data, error } = await supabase.storage
                                .from('uploads')
                                .upload(filename, file);
                                
                              if (error) throw error;
                              
                              const { data: { publicUrl } } = supabase.storage
                                .from('uploads')
                                .getPublicUrl(filename);
                                
                              setFormData(prev => ({ ...prev, photos: [...prev.photos, publicUrl] }));
                            } catch (err) {
                              alert('Erro ao enviar foto: ' + (err as any).message);
                            } finally {
                              setIsUploadingPhoto(false);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="mt-4 flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      As fotos de vistoria ajudam o cliente a entender melhor a viabilidade técnica da instalação. 
                      Será criada uma seção exclusiva no final da proposta com as imagens enviadas.
                    </p>
                  </div>
                </div>
              )}
            </div>

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
                ←  Voltar
              </button>
              <button
                onClick={() => setActiveTab('calculo')}
                className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors font-medium flex items-center gap-2"
              >
                Próximo: Retorno →
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
                ←  Voltar
              </button>
              <button
                onClick={() => setActiveTab('financiamento')}
                className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors font-medium flex items-center gap-2"
              >
                Próximo: Financiamento →
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
                ←  Voltar
              </button>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="text-blue-900 w-6 h-6" />
                <h2 className="text-xl font-bold text-gray-800">Histórico de Propostas</h2>
              </div>
              <button 
                onClick={fetchHistory}
                className="text-sm bg-blue-50 text-blue-900 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <Clock size={16} />
                Atualizar Lista
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold tracking-wider">
                      <th className="px-6 py-4 border-b">Data</th>
                      <th className="px-6 py-4 border-b">Cliente</th>
                      <th className="px-6 py-4 border-b text-center">Margem</th>
                      <th className="px-6 py-4 border-b text-right">Valor do Kit</th>
                      <th className="px-6 py-4 border-b">Nº Proposta</th>
                      <th className="px-6 py-4 border-b">Gerado por</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                          Nenhuma proposta gerada no histórico ainda.
                        </td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {new Date(item.created_at).toLocaleDateString('pt-BR')} 
                            <span className="text-[10px] ml-2 opacity-50">{new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800">{item.client_name}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-bold">
                              {item.margin}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-blue-900">
                            R$ {Number(item.kit_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">{item.proposal_number || '—'}</td>
                          <td className="px-6 py-4 text-gray-500">{item.created_by || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-start mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={() => setActiveTab('dados')}
                className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                ←  Voltar ao Início
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
