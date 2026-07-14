// Página criada para MT Solar — Gerador de Propostas Solares
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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
  Clock,
  Layers,
  Edit,
  Trash2,
  X,
  Database,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

type TabType = 'dados' | 'kit' | 'calculo' | 'financiamento' | 'servicos' | 'historico' | 'kits';

interface SolarKit {
  id: string;
  potencia_kwp: number;
  consumo_referencia_kwh?: number | null;
  valor_total: number;
  margem_venda: number;
  quantidade_modulos: number;
  potencia_modulo_w: number;
  marca_modulo: string;
  quantidade_inversores: number;
  potencia_inversor_kw: number;
  marca_inversor: string;
  inversor_ampliacao: boolean;
  potencia_inversor_ampliacao_kw?: number | null;
  marca_inversor_ampliacao?: string | null;
  ativo: boolean;
}

interface Supplier {
  id: string;
  razao_social: string;
  cnpj: string;
  nome_fantasia: string;
  endereco: string;
  telefone: string;
  email: string;
  ativo: boolean;
}

interface StructureItem {
  id: string;
  name: string;
  quantity: number;
  warranty: string;
}

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
  inversorAmpliacao: boolean;
  inverterAmpBrand: string;
  inverterAmpPower: string;
  garantiaModuloDefeito: string;
  garantiaModuloEficiencia: string;
  garantiaInversorDefeito: string;
  garantiaEstrutura: string;
  garantiaInstalacao: string;
  includePhotos: boolean;
  photos: string[];
  kitSupplier: string;
  selectedSupplierData?: Supplier | null;
  financeGracePeriod: string;
  financeDownPayment: string;
  financeBanco: string;
  tipoEstrutura: 'telhado_ceramico' | 'telhado_metalico' | 'telhado_fibrocimento' | 'solo' | 'telhado_shingle' | 'outro';
  structureItems: StructureItem[];
  discountValue: string;
  discountType: 'fixed' | 'percent';
  discountObservation: string;
  margemVenda?: number;
  valorFinalVenda?: number;
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
    norms: 'NBR 16274, recomendações do fabricante dos módulos.',
    hasEquipment: true
  },
  {
    id: 'instalacao',
    name: 'Instalação dos Módulos Fotovoltaicos',
    description: 'Instalação completa dos módulos fotovoltaicos, incluindo fixação estrutural, cabeamento CC, conexão ao inversor e testes de funcionamento.',
    norms: 'NBR 16690, NBR 5410, Resolução Normativa ANEEL 482/2012 e atualizações.',
    hasEquipment: true
  },
  {
    id: 'terreno',
    name: 'Limpeza de Terreno',
    description: 'Limpeza e preparação do terreno para instalação de usinas fotovoltaicas, incluindo remoção de vegetação e nivelamento básico.',
    norms: 'Legislação ambiental municipal e estadual aplicável.',
    hasEquipment: false
  },
  {
    id: 'comissionamento',
    name: 'Comissionamento Fotovoltaico',
    description: 'Verificação e testes completos do sistema instalado, incluindo medição de parâmetros elétricos, verificação de string, análise de inversores e emissão de laudo técnico.',
    norms: 'NBR 16274, IEC 62446-1.',
    hasEquipment: true
  },
  {
    id: 'projeto_subestacao',
    name: 'Projeto de Subestação',
    description: 'Elaboração de projeto elétrico de subestação conforme requisitos da concessionária local, incluindo memorial descritivo, diagramas unifilares e especificação de equipamentos.',
    norms: 'NBR 14039, NBR 5460, normas da concessionária local.',
    hasEquipment: false
  },
  {
    id: 'projeto_usina',
    name: 'Projeto de Usina Fotovoltaica',
    description: 'Elaboração de projeto completo de usina fotovoltaica, incluindo dimensionamento do sistema, memorial de cálculo, diagramas elétricos, layout e documentação para homologação.',
    norms: 'NBR 16690, NBR 5410, NBR 16274, Resolução Normativa ANEEL 482/2012.',
    hasEquipment: false
  },
  {
    id: 'homologacao',
    name: 'Homologação',
    description: 'Acompanhamento e execução de todo o processo de homologação junto à concessionária de energia, incluindo protocolo de documentos, acompanhamento do processo e vistoria técnica.',
    norms: 'Resolução Normativa ANEEL 482/2012, Resolução Normativa ANEEL 687/2015 e normativas da concessionária local.',
    hasEquipment: false
  },
  {
    id: 'remocao',
    name: 'Remoção de Equipamentos Fotovoltaicos',
    description: 'Desmontagem e remoção dos equipamentos fotovoltaicos instalados (módulos, inversores, estruturas e cabeamentos), com descarte ou guarda conforme orientação do cliente.',
    norms: 'NBR 16690, NBR 5410, NBR 10004 (resíduos sólidos).',
    hasEquipment: true,
    hasRemovalObservation: true
  }
];

const TABELA_FINANCIAMENTO = [
  { prazo: 36, carencia: 3, taxa: 2.4 },
  { prazo: 48, carencia: 3, taxa: 2.4 },
  { prazo: 60, carencia: 3, taxa: 2.4 },
];


const EMPTY_KIT: Omit<SolarKit, 'id' | 'ativo'> = {
  potencia_kwp: 0,
  consumo_referencia_kwh: null,
  valor_total: 0,
  margem_venda: 30,
  quantidade_modulos: 0,
  potencia_modulo_w: 0,
  marca_modulo: '',
  quantidade_inversores: 1,
  potencia_inversor_kw: 0,
  marca_inversor: '',
  inversor_ampliacao: false,
  potencia_inversor_ampliacao_kw: null,
  marca_inversor_ampliacao: null,
};

export default function ProposalGenerator() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('dados');
  const [editingProposalId, setEditingProposalId] = useState<number | null>(null);

  // --- Estados para Kits Solares ---
  const [solarKits, setSolarKits] = useState<SolarKit[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [showKitModal, setShowKitModal] = useState(false);
  const [editingKit, setEditingKit] = useState<SolarKit | null>(null);
  const [kitForm, setKitForm] = useState<Omit<SolarKit, 'id' | 'ativo'>>(EMPTY_KIT);
  const [savingKit, setSavingKit] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState<string>('');

  // --- Estados para Fornecedores (Suppliers) ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<Omit<Supplier, 'id' | 'ativo'>>({
    razao_social: '',
    cnpj: '',
    nome_fantasia: '',
    endereco: '',
    telefone: '',
    email: ''
  });
  const [savingSupplier, setSavingSupplier] = useState(false);

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
    financeRate: '2.4',
    moduleModel: '',
    modulePower: '',
    moduleQty: '',
    inverterModel: '',
    inverterBrand: '',
    inverterPower: '',
    inverterQty: '1',
    inversorAmpliacao: false,
    inverterAmpBrand: '',
    inverterAmpPower: '',
    garantiaModuloDefeito: '10',
    garantiaModuloEficiencia: '25',
    garantiaInversorDefeito: '10',
    garantiaEstrutura: '5',
    garantiaInstalacao: '1',
    includePhotos: false,
    photos: [],
    kitSupplier: '',
    selectedSupplierData: null,
    financeGracePeriod: '3',
    financeDownPayment: '',
    financeBanco: 'BV',
    structureItems: [
      { id: '1', name: '', quantity: 1, warranty: '' },
      { id: '2', name: '', quantity: 1, warranty: '' },
      { id: '3', name: '', quantity: 1, warranty: '' },
      { id: '4', name: '', quantity: 1, warranty: '' },
      { id: '5', name: '', quantity: 1, warranty: '' },
    ],
    tipoEstrutura: 'telhado_ceramico',
    discountValue: '',
    discountType: 'percent',
    discountObservation: '',
    margemVenda: 30,
    valorFinalVenda: 0
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
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // Estado para avisos sobre salvamento no histórico (sucesso, warning ou erro crítico)
  const [historyNotice, setHistoryNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (location.state) {
      const { consumoMensal, kWpEstimado, custoMensal } = location.state;
      setFormData(prev => ({
        ...prev,
        monthlyBill: custoMensal ? custoMensal.toFixed(2) : prev.monthlyBill,
        kitPower: kWpEstimado ? kWpEstimado.toFixed(2) : prev.kitPower,
      }));
      // Optional: switch to calculation tab to show results immediately?
      // setActiveTab('calculo');
    }
  }, [location.state]);


  const fetchHistory = async (page = 1) => {
    try {
      const res = await api.get(`/api/proposal-history?page=${page}&limit=10`);
      setHistory(res.data.data ?? []);
      setHistoryPage(res.data.page ?? 1);
      setHistoryTotalPages(res.data.totalPages ?? 1);
      setHistoryTotal(res.data.total ?? 0);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      setHistory([]);
    }
  };

  const deleteHistory = async (id: number) => {
    if (!window.confirm('Deseja excluir este registro do histórico?')) return;
    try {
      await api.delete(`/api/proposal-history/${id}`);
      setHistory(prev => prev.filter((item: any) => item.id !== id));
    } catch (error) {
      console.error('Erro ao excluir histórico:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico') fetchHistory(1);
    if (activeTab === 'kits') fetchSolarKits();
  }, [activeTab]);

  // Carrega kits e fornecedores ao entrar no componente
  useEffect(() => { 
    fetchSolarKits(); 
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const res = await api.get('/api/suppliers');
      setSuppliers(res.data ?? []);
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchSolarKits = async () => {
    setLoadingKits(true);
    try {
      const res = await api.get('/api/solar-kits');
      setSolarKits(res.data ?? []);
    } catch (err) {
      console.error('Erro ao carregar kits solares:', err);
    } finally {
      setLoadingKits(false);
    }
  };

  const openNewKitModal = () => {
    setEditingKit(null);
    setKitForm(EMPTY_KIT);
    setShowKitModal(true);
  };

  const openEditKitModal = (kit: SolarKit) => {
    setEditingKit(kit);
    setKitForm({
      potencia_kwp: kit.potencia_kwp,
      consumo_referencia_kwh: kit.consumo_referencia_kwh ?? null,
      valor_total: kit.valor_total,
      margem_venda: kit.margem_venda,
      quantidade_modulos: kit.quantidade_modulos,
      potencia_modulo_w: kit.potencia_modulo_w,
      marca_modulo: kit.marca_modulo,
      quantidade_inversores: kit.quantidade_inversores,
      potencia_inversor_kw: kit.potencia_inversor_kw,
      marca_inversor: kit.marca_inversor,
      inversor_ampliacao: kit.inversor_ampliacao,
      potencia_inversor_ampliacao_kw: kit.potencia_inversor_ampliacao_kw ?? null,
      marca_inversor_ampliacao: kit.marca_inversor_ampliacao ?? null,
    });
    setShowKitModal(true);
  };

  const saveKit = async () => {
    setSavingKit(true);
    try {
      if (editingKit) {
        await api.put(`/api/solar-kits/${editingKit.id}`, kitForm);
      } else {
        await api.post('/api/solar-kits', kitForm);
      }
      setShowKitModal(false);
      fetchSolarKits();
    } catch (err: any) {
      alert('Erro ao salvar kit: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSavingKit(false);
    }
  };

  const deactivateKit = async (id: string) => {
    if (!window.confirm('Deseja desativar este kit? Ele não aparecerá mais para seleção.')) return;
    try {
      await api.delete(`/api/solar-kits/${id}`);
      fetchSolarKits();
    } catch (err: any) {
      alert('Erro ao desativar kit: ' + (err?.response?.data?.error || err.message));
    }
  };

  const openNewSupplierModal = () => {
    setEditingSupplier(null);
    setSupplierForm({
      razao_social: '',
      cnpj: '',
      nome_fantasia: '',
      endereco: '',
      telefone: '',
      email: ''
    });
    setShowSupplierModal(true);
  };

  const openEditSupplierModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      razao_social: supplier.razao_social,
      cnpj: supplier.cnpj || '',
      nome_fantasia: supplier.nome_fantasia || '',
      endereco: supplier.endereco || '',
      telefone: supplier.telefone || '',
      email: supplier.email || ''
    });
    setShowSupplierModal(true);
  };

  const saveSupplier = async () => {
    setSavingSupplier(true);
    try {
      if (editingSupplier) {
        await api.put(`/api/suppliers/${editingSupplier.id}`, supplierForm);
      } else {
        await api.post('/api/suppliers', supplierForm);
      }
      setShowSupplierModal(false);
      fetchSuppliers();
    } catch (err: any) {
      alert('Erro ao salvar fornecedor: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSavingSupplier(false);
    }
  };

  const deactivateSupplier = async (id: string) => {
    if (!window.confirm('Deseja desativar este fornecedor? Ele não aparecerá mais para seleção.')) return;
    try {
      await api.delete(`/api/suppliers/${id}`);
      fetchSuppliers();
    } catch (err: any) {
      alert('Erro ao desativar fornecedor: ' + (err?.response?.data?.error || err.message));
    }
  };

  // Aplica kit selecionado ao formData do vendedor
  const applySelectedKit = (kitId: string) => {
    setSelectedKitId(kitId);
    if (!kitId) return;
    const kit = solarKits.find(k => k.id === kitId);
    if (!kit) return;
    const margem = kit.margem_venda ?? 30;
    const valorFinal = kit.valor_total * (1 + margem / 100);

    setFormData(prev => ({
      ...prev,
      kitCost: valorFinal.toFixed(2),
      marginPercent: '0', // margem já embutida no preço
      margemVenda: margem,
      valorFinalVenda: valorFinal,
      kitPower: kit.potencia_kwp.toString(),
      moduleModel: kit.marca_modulo,
      modulePower: kit.potencia_modulo_w.toString(),
      moduleQty: kit.quantidade_modulos.toString(),
      inverterBrand: kit.marca_inversor,
      inverterPower: kit.potencia_inversor_kw.toString(),
      inverterQty: kit.quantidade_inversores.toString(),
      inversorAmpliacao: kit.inversor_ampliacao,
      inverterAmpBrand: kit.marca_inversor_ampliacao || '',
      inverterAmpPower: kit.potencia_inversor_ampliacao_kw ? kit.potencia_inversor_ampliacao_kw.toString() : '',
    }));

    setResults(prev => ({
      ...prev,
      salePrice: valorFinal,
    }));
  };

  const loadForEdit = async (id: number) => {
    try {
      const res = await api.get(`/api/propostas/${id}`);
      if (res.data && res.data.raw_data) {
        setFormData(res.data.raw_data);
        setEditingProposalId(id);
        setActiveTab('dados');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Dados completos da proposta não encontrados no histórico antigo.');
      }
    } catch (error) {
      console.error('Erro ao carregar proposta para edição:', error);
      alert('Erro ao carregar proposta.');
    }
  };

  const saveToHistory = async (proposalNumber: string, url_arquivo?: string) => {
    try {
      const kitCostNum = Number(formData.kitCost) || 0;
      const marginNum = formData.margemVenda ?? parseFloat(formData.marginPercent || '0') ?? 0;

      if (!formData.clientName || kitCostNum === 0) {
        console.warn('saveToHistory: dados insuficientes para salvar no histórico.');
        return;
      }

      const payload = {
        client_name: formData.clientName,
        margin: marginNum,
        kit_value: kitCostNum,
        proposal_number: proposalNumber,
        url_arquivo: url_arquivo,
        raw_data: formData
      };

      if (editingProposalId) {
        await api.put(`/api/propostas/${editingProposalId}`, payload);
      } else {
        await api.post('/api/proposal-history', payload);
      }

      // Também salva na tabela de propostas detalhadas para preenchimento automático
      await api.post('/api/proposals', {
        client_name: formData.clientName,
        phone: formData.clientPhone,
        email: formData.clientEmail,
        address: formData.clientAddress,
        proposal_number: proposalNumber,
        margin: marginNum,
        kit_value: kitCostNum,
        inverter_model: formData.inverterModel,
        inverter_power: formData.inverterPower,
        module_model: formData.moduleModel,
        module_power: formData.modulePower
      });

      fetchHistory(1);
    } catch (error) {
      console.error('Erro ao salvar no histórico:', error);
    }
  };

  const [serviceFormData, setServiceFormData] = useState({
    clientName: '',
    selectedServices: [] as string[],
    totalValue: '',
    paymentMethod: 'À Vista',
    paymentConditions: '',
    executionTime: '15 dias úteis',
    responsible: '',
    validityDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Estado para observações do serviço de remoção
  const [serviceObservations, setServiceObservations] = useState<Record<string, string>>({});

  // Interface para detalhamento técnico por serviço
  interface ServiceEquipmentData {
    qtdModulos: string;
    potenciaModuloWp: string;
    potenciaTotalKwp: string; // calculado automaticamente, somente leitura
    marcaModulo: string;
    modeloModulo: string;
    potenciaInversorKw: string;
    marcaInversor: string;
    modeloInversor: string;
  }

  // Estado para dados técnicos de cada serviço (por id do serviço)
  const [serviceEquipmentData, setServiceEquipmentData] = useState<Record<string, ServiceEquipmentData>>({});

  // Atualiza campo de equipamento de um serviço e recalcula potência total
  const updateServiceEquipment = (serviceId: string, field: keyof ServiceEquipmentData, value: string) => {
    setServiceEquipmentData(prev => {
      const current = prev[serviceId] || {
        qtdModulos: '', potenciaModuloWp: '', potenciaTotalKwp: '',
        marcaModulo: '', modeloModulo: '', potenciaInversorKw: '',
        marcaInversor: '', modeloInversor: ''
      };
      const updated = { ...current, [field]: value };
      // Recalcula potência total: quantidade × potência do módulo ÷ 1000
      const qtd = parseFloat(field === 'qtdModulos' ? value : updated.qtdModulos) || 0;
      const potWp = parseFloat(field === 'potenciaModuloWp' ? value : updated.potenciaModuloWp) || 0;
      updated.potenciaTotalKwp = (qtd * potWp / 1000).toFixed(2);
      return { ...prev, [serviceId]: updated };
    });
  };

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

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margemLateral = 15;
    const margemTopo = 20;
    const margemBase = 28;
    const larguraUtil = pageWidth - margemLateral * 2;
    let y = 0;

    const MARGEM_INFERIOR = 25;
    const LIMITE_Y = pageHeight - MARGEM_INFERIOR;

    const adicionarCabecalhoServico = (d: any, w: number) => {
      d.setFontSize(8);
      d.setTextColor(100);
      d.text(`Proposta de Serviços — ${serviceFormData.clientName}`, margemLateral, 12);
      d.text(dataGerada, w - margemLateral, 12, { align: 'right' });
      d.setDrawColor(200);
      d.line(margemLateral, 15, w - margemLateral, 15);
    };

    const checkPage = (altura: number) => {
      if (y + altura > LIMITE_Y) {
        doc.addPage();
        adicionarCabecalhoServico(doc, pageWidth);
        y = margemTopo;
      }
    };

    // PÁGINA 1 — Capa
    let afterLogoY = 15;
    try {
      const logoResponse = await fetch('/PNG_-_MT_SOLAR__1_.png');
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });

      const logoJpeg = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 1.0));
          } else {
            resolve(logoBase64); // fallback if no context
          }
        };
        img.onerror = reject;
        img.src = logoBase64;
      });

      const imgNatural = new Image();
      imgNatural.src = logoJpeg;
      await new Promise(resolve => { imgNatural.onload = resolve; });

      const logoW = 55; // mm
      const logoH = logoW * (imgNatural.naturalHeight / imgNatural.naturalWidth);
      const logoX = (pageWidth - logoW) / 2;
      const logoY = 8; // mm do topo

      // Insere como JPEG 100% opaco
      doc.addImage(logoJpeg, 'JPEG', logoX, logoY, logoW, logoH);
      afterLogoY = logoY + logoH + 4;
    } catch (e) {
      console.warn('Erro ao carregar logo no PDF:', e);
      afterLogoY = 25; // fallback caso dê erro
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text('PROPOSTA DE SERVIÇOS', pageWidth / 2, afterLogoY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(245, 166, 35);
    doc.text('ENERGIA SOLAR FOTOVOLTAICA', pageWidth / 2, afterLogoY + 7, { align: 'center' });

    const lineY = afterLogoY + 12;
    doc.setDrawColor(245, 166, 35);
    doc.setLineWidth(0.8);
    doc.line(15, lineY, pageWidth - 15, lineY);

    y = lineY + 8;
    doc.setFillColor(245, 245, 245);
    doc.rect(margemLateral, y, larguraUtil, 38, 'F');

    doc.setFontSize(10);
    
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Nº da Proposta: ', margemLateral + 5, y + 5);
    doc.setTextColor(30, 58, 95);
    doc.setFont('helvetica', 'bold');
    const propNumber = Date.now().toString().slice(-6);
    doc.text(`SRV-${propNumber}`, margemLateral + 5 + doc.getTextWidth('Nº da Proposta: '), y + 5);

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Data de Emissão: ', margemLateral + 5, y + 11);
    doc.setTextColor(30, 58, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(dataGerada, margemLateral + 5 + doc.getTextWidth('Data de Emissão: '), y + 11);

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Validade: ', margemLateral + 5, y + 17);
    doc.setTextColor(30, 58, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(validityDateFormatted, margemLateral + 5 + doc.getTextWidth('Validade: '), y + 17);

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Cliente: ', margemLateral + 5, y + 23);
    doc.setTextColor(30, 58, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(serviceFormData.clientName || '—', margemLateral + 5 + doc.getTextWidth('Cliente: '), y + 23);

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Responsável Técnico: ', margemLateral + 5, y + 29);
    doc.setTextColor(30, 58, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(serviceFormData.responsible || '—', margemLateral + 5 + doc.getTextWidth('Responsável Técnico: '), y + 29);

    y += 45;

    const missao = 'Democratizar o acesso à energia solar limpa e sustentável, oferecendo soluções fotovoltaicas de alta qualidade com atendimento próximo, técnico e transparente, transformando a conta de energia de nossos clientes em investimento com retorno garantido.';
    const visao = 'Ser referência regional em energia solar fotovoltaica, reconhecida pela excelência técnica, pela confiança dos clientes e pelo compromisso com um futuro mais sustentável e economicamente justo.';
    const valores = 'Transparência · Qualidade · Sustentabilidade · Compromisso com o cliente · Inovação · Responsabilidade técnica';
    const pq = 'A energia solar fotovoltaica é um dos investimentos com melhor relação custo-benefício disponíveis. Com retorno médio entre 3 e 5 anos e vida útil dos painéis superior a 25 anos, o sistema gera economia desde o primeiro mês de operação. Além disso, valoriza o imóvel em até 8%, reduz a emissão de CO2 e oferece independência energética frente às constantes variações tarifárias das concessionárias.';

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const linesMissao = doc.splitTextToSize(missao, larguraUtil - 10);
    const linesVisao = doc.splitTextToSize(visao, larguraUtil - 10);
    const linesValores = doc.splitTextToSize(valores, larguraUtil - 10);
    const linesPq = doc.splitTextToSize(pq, larguraUtil - 10);

    const titleSpace = 4.5;
    const itemSpace = 4.5;
    const bottomSpace = 5;
    const topSpace = 5;
    const lh = 10 * 0.4; // 4mm de height por linha

    const alturaBloco = topSpace + 
                        titleSpace + (linesMissao.length * lh) + itemSpace +
                        titleSpace + (linesVisao.length * lh) + itemSpace +
                        titleSpace + (linesValores.length * lh) + itemSpace +
                        titleSpace + (linesPq.length * lh) + bottomSpace;

    // INSTITUCIONAL
    checkPage(8 + alturaBloco + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text('SOBRE A MT SOLAR', margemLateral, y);
    
    doc.setDrawColor(245, 166, 35);
    doc.setLineWidth(0.5);
    doc.line(margemLateral, y + 2, margemLateral + doc.getTextWidth('SOBRE A MT SOLAR'), y + 2);
    y += 8;

    // Altura já calculada acima
    doc.setFillColor(238, 243, 251);
    doc.rect(margemLateral, y, larguraUtil, alturaBloco, 'F');
    
    let yInst = y + topSpace;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('Nossa Missão:', margemLateral + 5, yInst);
    yInst += titleSpace;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(linesMissao, margemLateral + 5, yInst);
    yInst += linesMissao.length * lh + itemSpace;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('Nossa Visão:', margemLateral + 5, yInst);
    yInst += titleSpace;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(linesVisao, margemLateral + 5, yInst);
    yInst += linesVisao.length * lh + itemSpace;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('Nossos Valores:', margemLateral + 5, yInst);
    yInst += titleSpace;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(linesValores, margemLateral + 5, yInst);
    yInst += linesValores.length * lh + itemSpace;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('Por que contratar a MT Solar?:', margemLateral + 5, yInst);
    yInst += titleSpace;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(linesPq, margemLateral + 5, yInst);

    y += alturaBloco + 6;

    // SERVIÇOS CONTRATADOS
    checkPage(23);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text('SERVIÇOS CONTRATADOS', margemLateral, y);
    doc.setDrawColor(245, 166, 35);
    doc.setLineWidth(0.5);
    doc.line(margemLateral, y + 2, margemLateral + doc.getTextWidth('SERVIÇOS CONTRATADOS'), y + 2);
    y += 8;

    for (const s of servicesList) {
      let customDesc = s.description;
      if (s.id === 'remocao') {
        customDesc = customDesc.replace(', com descarte ou guarda conforme orientação do cliente.', '.').replace(' com descarte ou guarda conforme orientação do cliente.', '.');
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(customDesc, larguraUtil - 6);
      const descLh = 10 * 0.4; // espaçamento de linha = tamanho da fonte * 0.4
      
      let obsLines: string[] = [];
      const obsLh = 10 * 0.4;
      if (s.id === 'remocao' && serviceObservations['remocao']) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        obsLines = doc.splitTextToSize(`Observações: ${serviceObservations['remocao']}`, larguraUtil - 6);
      }
      
      let specLines: {text: string, font: string, size: number, isBold: boolean}[] = [];
      const specLh = 8.5 * 0.4;
      if (s.hasEquipment && serviceEquipmentData[s.id]) {
        const eq = serviceEquipmentData[s.id];
        const fields = [];
        if (eq.qtdModulos) fields.push(`• Qtd. de Módulos: ${eq.qtdModulos} unidades`);
        if (eq.potenciaModuloWp) fields.push(`• Potência do Módulo: ${eq.potenciaModuloWp} Wp`);
        if (eq.potenciaTotalKwp) fields.push(`• Potência Total do Sistema: ${eq.potenciaTotalKwp} kWp`);
        if (eq.marcaModulo || eq.modeloModulo) fields.push(`• Marca/Modelo do Módulo: ${eq.marcaModulo} ${eq.modeloModulo}`.trim());
        if (eq.potenciaInversorKw) fields.push(`• Potência do Inversor: ${eq.potenciaInversorKw} kW`);
        if (eq.marcaInversor || eq.modeloInversor) fields.push(`• Marca/Modelo do Inversor: ${eq.marcaInversor} ${eq.modeloInversor}`.trim());
        
        if (fields.length > 0) {
          specLines.push({ text: 'Especificações Técnicas:', font: 'helvetica', size: 9, isBold: true });
          fields.forEach(f => {
            specLines.push({ text: f, font: 'helvetica', size: 8.5, isBold: false });
          });
        }
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const normLines = doc.splitTextToSize('Normas aplicáveis: ' + s.norms, larguraUtil - 6);
      const normLh = 9 * 0.4;
      
      const titleSpace = 8;
      const descSpace = descLines.length * descLh + 3;
      const obsSpace = obsLines.length > 0 ? obsLines.length * obsLh + 3 : 0;
      const specSpace = specLines.length > 0 ? 2 + specLines.length * specLh + 2 : 0;
      const normSpace = normLines.length * normLh + 4;
      const bottomSpace = 4;

      const alturaServico = titleSpace + descSpace + obsSpace + specSpace + normSpace + bottomSpace;
      checkPage(alturaServico);

      doc.setFillColor(39, 174, 96);
      doc.rect(margemLateral, y, 5, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('✓', margemLateral + 1.2, y + 3.8);

      doc.setTextColor(30, 58, 95);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(s.name, margemLateral + 7, y + 4);
      y += titleSpace;

      doc.setTextColor(68, 68, 68);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(descLines, margemLateral + 6, y);
      y += descSpace;

      if (obsLines.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(obsLines, margemLateral + 6, y);
        y += obsSpace;
      }

      if (specLines.length > 0) {
        y += 2;
        specLines.forEach((line, idx) => {
          doc.setFontSize(line.size);
          doc.setFont(line.font, line.isBold ? 'bold' : 'normal');
          if (idx === 0) {
            doc.setTextColor(30, 58, 95);
          } else {
            doc.setTextColor(80, 80, 80);
          }
          doc.text(line.text, margemLateral + 6, y);
          y += specLh;
        });
        y += 2;
      }

      doc.setTextColor(136, 136, 136);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(normLines, margemLateral + 6, y);
      y += normSpace;

      doc.setDrawColor(221, 221, 221);
      doc.setLineWidth(0.3);
      (doc as any).setLineDash([1, 1]);
      doc.line(margemLateral, y, pageWidth - margemLateral, y);
      (doc as any).setLineDash([]);
      y += bottomSpace;
    }

    // CONDIÇÕES COMERCIAIS
    const condicoesHeight = 10 + 30 + 7 + (serviceFormData.paymentConditions ? 7 : 0) + 7 + 15;
    checkPage(condicoesHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text('CONDIÇÕES COMERCIAIS', margemLateral, y);
    doc.setDrawColor(245, 166, 35);
    doc.setLineWidth(0.5);
    doc.line(margemLateral, y + 2, margemLateral + doc.getTextWidth('CONDIÇÕES COMERCIAIS'), y + 2);
    y += 10;

    doc.setFillColor(30, 58, 95);
    doc.rect(margemLateral, y, larguraUtil, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR TOTAL DOS SERVIÇOS', pageWidth / 2, y + 8, { align: 'center' });
    doc.setTextColor(245, 166, 35);
    doc.setFontSize(18);
    const valorFormatado = parseFloat(serviceFormData.totalValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    doc.text(`R$ ${valorFormatado}`, pageWidth / 2, y + 19, { align: 'center' });
    y += 30;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Forma de Pagamento: ${serviceFormData.paymentMethod || '—'}`, margemLateral, y);
    y += 7;
    if (serviceFormData.paymentConditions) {
      const condLines = doc.splitTextToSize(`Condições: ${serviceFormData.paymentConditions}`, larguraUtil);
      doc.text(condLines, margemLateral, y);
      y += condLines.length * 4 + 3;
    }
    doc.text(`Prazo de Execução: ${serviceFormData.executionTime || '—'}`, margemLateral, y);
    y += 7;
    doc.text(`Validade desta Proposta: ${validityDateFormatted}`, margemLateral, y);
    y += 15;

    checkPage(35);
    const colW = larguraUtil / 2 - 5;
    doc.setDrawColor(100);
    doc.setLineWidth(0.4);

    // Linha esquerda
    doc.line(margemLateral, y + 20, margemLateral + colW, y + 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('MT Solar', margemLateral + colW / 2, y + 25, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(serviceFormData.responsible || 'Responsável Técnico', margemLateral + colW / 2, y + 30, { align: 'center' });

    // Linha direita
    const xDir = margemLateral + colW + 10;
    doc.line(xDir, y + 20, xDir + colW, y + 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(serviceFormData.clientName || 'Contratante', xDir + colW / 2, y + 25, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Contratante', xDir + colW / 2, y + 30, { align: 'center' });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margemLateral, pageHeight - 18, pageWidth - margemLateral, pageHeight - 18);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('MT SOLAR — ENERGIA RENOVÁVEL  |  mtsolar.energia@gmail.com  |  (81) 99700-3260', pageWidth / 2, pageHeight - 13, { align: 'center' });
      doc.text(`Nº SRV-${propNumber}`, margemLateral, pageHeight - 8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margemLateral, pageHeight - 8, { align: 'right' });
    }

    doc.save(`proposta-servicos-${serviceFormData.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().slice(0,10)}.pdf`);

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
    const monthlyBill = parseFloat(formData.monthlyBill || '0');
    const energyRate = parseFloat(formData.energyRate || '0.85');
    const kitPower = parseFloat(formData.kitPower || '0');

    // Usa margemVenda (definida pelo dropdown/input CEO) como fonte primária.
    // Só cai no marginPercent se margemVenda não estiver definida (modo manual).
    const margem = formData.margemVenda != null ? formData.margemVenda : parseFloat(formData.marginPercent || '0');

    // Se valorFinalVenda já foi calculado com a margem correta, use-o diretamente.
    // Caso contrário, recalcula a partir do custo + margem.
    let salePrice = formData.valorFinalVenda && formData.valorFinalVenda > 0
      ? formData.valorFinalVenda
      : kitCost * (1 + margem / 100);

    const discountVal = parseFloat(formData.discountValue || '0');
    let totalDiscount = 0;
    if (formData.discountType === 'percent') {
      totalDiscount = salePrice * (discountVal / 100);
    } else {
      totalDiscount = discountVal;
    }

    salePrice = Math.max(0, salePrice - totalDiscount);

    const monthlyGeneration = kitPower * 30 * 4.5;
    const monthlySavings = monthlyGeneration * energyRate;
    const annualSavings = monthlySavings * 12;
    const fiveYearSavings = annualSavings * 5;
    const paybackMonths = monthlySavings > 0 ? salePrice / monthlySavings : 0;

    const downPayment = parseFloat(formData.financeDownPayment || '0');
    const financeValue = parseFloat(formData.financeValue || (salePrice - downPayment).toString());
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
    if (!isAdminOrCeo && !selectedKitId) {
      alert('Selecione um kit solar para continuar.');
      return;
    }

    let newWindow: Window | null = null;
    if (!Capacitor.isNativePlatform()) {
      newWindow = window.open('', '_blank');
      if (!newWindow) {
        alert('Por favor, permita pop-ups para visualizar a proposta.');
        return;
      }
    } else {
      setIsGeneratingPDF(true);
    }

    const structureTranslations: Record<string, string> = {
      'telhado_ceramico': 'Telhado Cerâmico',
      'telhado_metalico': 'Telhado Metálico',
      'telhado_fibrocimento': 'Telhado Fibrocimento',
      'solo': 'Solo',
      'telhado_shingle': 'Telhado Shingle',
      'outro': 'Outro'
    };
    const AZUL = '#1e3a5f';
    const AZUL_CLARO = '#d6e4f0';
    const AMARELO = '#f59e0b';
    const CINZA = '#6b7280';
    const basePropNum = formData.proposalNumber || Date.now().toString().slice(-6);
    const propNumeroLimpo = basePropNum.startsWith('PROP-') ? basePropNum : `PROP-${basePropNum}`;
    const proposalNumber = propNumeroLimpo;
    
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const dataGeracao = `${dia}/${mes}/${ano}`;
    const dataGerada = dataGeracao;

    const validadeObj = new Date(hoje);
    validadeObj.setDate(validadeObj.getDate() + 30);
    const diaV = String(validadeObj.getDate()).padStart(2, '0');
    const mesV = String(validadeObj.getMonth() + 1).padStart(2, '0');
    const anoV = validadeObj.getFullYear();
    const dataValidade = `${diaV}/${mesV}/${anoV}`;

    // Usa salePrice do estado (já considera margemVenda), com fallback robusto
    const margem = formData.margemVenda != null ? formData.margemVenda : Number(formData.marginPercent || 0);
    const saleP = results.salePrice > 0
      ? results.salePrice
      : (formData.valorFinalVenda || 0) > 0
        ? formData.valorFinalVenda!
        : Number(formData.kitCost) * (1 + margem / 100);
    const originalPrice = Number(formData.kitCost) * (1 + margem / 100);

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
    const annualSav = results.annualSavings;
    const reajusteAnual = 0.10; // 10% ao ano
    const paybackMeses = results.paybackMonths;
    const paybackAnos = Math.floor(paybackMeses / 12);
    const paybackMesesRest = Math.round(paybackMeses % 12);
    
    // ROI Simples (1º ano)
    const roi = annualSav > 0 ? ((annualSav / saleP) * 100).toFixed(2) : '0';
    
    const economiaTotal25 = annualSav > 0 
      ? annualSav * (Math.pow(1 + reajusteAnual, 25) - 1) / reajusteAnual 
      : 0;

    // Função auxiliar para calcular a TIR (Taxa Interna de Retorno) via Newton-Raphson
    const calculateIRR = (cashFlows: number[], guess = 0.1) => {
      const maxTries = 100;
      const epsilon = 1e-5;
      let irr = guess;
      for (let i = 0; i < maxTries; i++) {
        let npv = 0;
        let npvDerivative = 0;
        for (let t = 0; t < cashFlows.length; t++) {
          npv += cashFlows[t] / Math.pow(1 + irr, t);
          if (t > 0) {
            npvDerivative -= (t * cashFlows[t]) / Math.pow(1 + irr, t + 1);
          }
        }
        if (npvDerivative === 0) break;
        const newIrr = irr - npv / npvDerivative;
        if (Math.abs(newIrr - irr) < epsilon) return newIrr;
        irr = newIrr;
      }
      return irr;
    };

    const fluxoCaixaPeriodo = [-saleP];
    let fluxoCaixa = [];
    let acumulado = -saleP;
    for (let ano = 1; ano <= 25; ano++) {
      const economiaAno = annualSav * Math.pow(1 + reajusteAnual, ano - 1);
      fluxoCaixaPeriodo.push(economiaAno);
      acumulado += economiaAno;
      fluxoCaixa.push(acumulado); // Mantém o array acumulado para o gráfico SVG
    }
    
    // TIR real usando o fluxo de caixa
    const tirValue = annualSav > 0 ? calculateIRR(fluxoCaixaPeriodo) : 0;
    const tir = (tirValue * 100).toFixed(2);
    
    const geracaoAnual = kitPowerVal * 365 * 4.5;
    const custokWh = geracaoAnual > 0 ? (saleP / (geracaoAnual * 25)).toFixed(2) : '0';
    const tarifaAtual = Number(formData.energyRate).toFixed(2);
    const economiakWh = (Number(formData.energyRate) - Number(custokWh)).toFixed(2);
    
    const maxFC = Math.max(...fluxoCaixa);
    const minFC = Math.min(...fluxoCaixa);

    // Variáveis de Garantia
    const gModuloDefeito  = formData.garantiaModuloDefeito  || '10';
    const gModuloEfic     = formData.garantiaModuloEficiencia || '25';
    const gInversor       = formData.garantiaInversorDefeito || '10';
    const gEstrutura      = formData.garantiaEstrutura       || '5';
    const gInstalacao     = formData.garantiaInstalacao      || '1';

    // Variáveis para o Gráfico da Página 6
    const maxVal6 = maxVal;
    const meses6 = meses;
    const paddingLeft = 52;  // espaço para labels do eixo Y
    const paddingBottom = 22;
    const chartAreaH = 120;
    const chartAreaW = 430;
    const svgW = paddingLeft + chartAreaW;
    const svgH = chartAreaH + paddingBottom;

    // Monta lista de materiais da estrutura
    const itensEstrutura = formData.structureItems
      .filter(item => item.name.trim() !== '' && item.quantity > 0)
      .map(item => ({
        nome: `${item.name} — Qtd: ${item.quantity}`,
        garantia: item.warranty?.trim() || ''
      }));

    const temItensEstrutura = itensEstrutura.length > 0;

    const gEstruturaFinal = formData.garantiaEstrutura ||
      (temItensEstrutura
        ? (itensEstrutura
            .map(i => Number(i.garantia))
            .filter(n => n > 0)
            .sort((a, b) => a - b)[0]?.toString() || '5')
        : '5');

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
            height: 297mm; 
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


        <!-- PÁGINA 3: ESPAÇO DA CARNE (CLIENTES) -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;overflow:hidden;position:relative;">
          <img src="/Pag__2.jpeg" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>

        <!-- PÁGINA 4: SIMPLA ENERGIA (CLIENTES) -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;overflow:hidden;position:relative;">
          <img src="/Pag__3.jpeg" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>

        <!-- PÁGINA 5: MAIS UMA INSTITUCIONAL -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;overflow:hidden;position:relative;">
          <img src="/Pag__4.jpeg" style="width:100%;height:100%;object-fit:cover;display:block;" />
        </div>

        <!-- PÁGINA 5: DADOS DO CLIENTE + EQUIPAMENTOS -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;position:relative;overflow:hidden;">

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
                ${propNumeroLimpo}</div>
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

            <!-- KIT DESCRIPTION BADGE -->
            ${formData.kitName ? `
            <div style="background:#1e3a5f;color:#f59e0b;border-radius:6px;
              padding:3mm 5mm;margin-bottom:2mm;font-size:10pt;font-weight:bold;
              text-align:center;letter-spacing:0.5px;">
              ☀️ ${formData.kitName}
            </div>` : ''}

            ${formData.kitSupplier ? (() => {
              const sup = formData.selectedSupplierData;
              const titleName = formData.kitSupplier;
              if (sup) {
                const linhasExtras = [
                  (sup.razao_social && sup.razao_social !== sup.nome_fantasia) ? `Razão Social: ${sup.razao_social}` : null,
                  sup.cnpj ? `CNPJ: ${sup.cnpj}` : null,
                  sup.endereco ? `Endereço: ${sup.endereco}` : null,
                  (sup.telefone || sup.email) ? `Contato: ${sup.telefone || ''} ${(sup.telefone && sup.email) ? '|' : ''} ${sup.email || ''}`.trim() : null
                ].filter(Boolean);

                const renderLinhas = linhasExtras.map(l => 
                  `<div style="font-size:7.5pt;color:#6b7280;margin-top:1mm;">${l}</div>`
                ).join('');

                return `
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px; padding:3mm 5mm;margin-bottom:4mm; text-align:right;">
                    <div style="font-size:9pt; color:#1e3a5f; font-weight:bold;">
                      Distribuidor: ${titleName}
                    </div>
                    ${renderLinhas}
                  </div>
                `;
              }
              
              return `
              <div style="text-align:right; font-size:9pt; color:#1e3a5f; font-weight:bold; margin-bottom:2mm;">
                Distribuidor: ${titleName}
              </div>`;
            })() : ''}

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
                  <div style="font-size:9.5pt;font-weight:bold;color:#1e3a5f;
                    margin-bottom:2mm;">🔩 Estrutura de Fixação</div>

                  ${temItensEstrutura ? `
                    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;
                      margin-bottom:2mm;">
                      <tr style="background:#1e3a5f;">
                        <th style="padding:1.5mm 2mm;text-align:left;color:#f59e0b;
                          font-weight:bold;border-radius:3px 0 0 3px;width:70%;">
                          Material</th>
                        <th style="padding:1.5mm 2mm;text-align:center;color:#fff;
                          border-radius:0 3px 3px 0;">Garantia</th>
                      </tr>
                      ${itensEstrutura.map((item, idx) => `
                        <tr style="background:${idx % 2 === 0 ? '#fff' : '#fffbeb'};">
                          <td style="padding:1.5mm 2mm;color:#374151;
                            border-bottom:1px solid #fde68a;">${item.nome}</td>
                          <td style="padding:1.5mm 2mm;text-align:center;
                            border-bottom:1px solid #fde68a;">
                            <span style="background:#dcfce7;color:#166534;
                              border-radius:3px;padding:0.3mm 2mm;font-weight:bold;">
                              ${item.garantia || gEstruturaFinal} Anos
                            </span>
                          </td>
                        </tr>
                      `).join('')}
                    </table>
                  ` : `
                    <div style="font-size:9pt;color:#374151;">
                      Tipo: ${structureTranslations[formData.tipoEstrutura] || 'Conforme tipo de telhado/solo do projeto'}</div>
                    <div style="font-size:8pt;color:#6b7280;margin-top:1mm;">
                      Inclui todos os materiais necessários para a fixação dos módulos.</div>
                  `}

                  <div style="display:flex;justify-content:space-between;align-items:center;
                    margin-top:2mm;padding-top:2mm;border-top:1px solid #f59e0b55;">
                    <span style="font-size:8.5pt;color:#6b7280;">Garantia geral:</span>
                    <span style="background:#dcfce7;color:#166534;border-radius:4px;
                      padding:0.5mm 2mm;font-size:8.5pt;font-weight:bold;">
                      ${gEstruturaFinal} Anos</span>
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
            <div style="border-top:2px solid #1e3a5f;padding-top:3mm;
              display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:8pt;color:#1e3a5f;font-weight:bold;">
                MT SOLAR — ENERGIA RENOVÁVEL
              </div>
              <div style="font-size:7.5pt;color:#6b7280;">
                mtsolar.energia@gmail.com | (81) 99700-3260 | (81) 99951-7110
              </div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 6: INFORMAÇÕES DO SISTEMA -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;overflow:hidden;">

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

            <!-- BLOCO: POR QUE INVESTIR EM ENERGIA SOLAR? -->
            <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;
              border-radius:10px;padding:5mm 7mm;margin-bottom:6mm;">
              <div style="display:flex;align-items:center;gap:3mm;margin-bottom:3mm;">
                <div style="width:4px;height:18px;background:#166534;border-radius:2px;"></div>
                <span style="font-size:12pt;font-weight:900;color:#166534;">Por que investir em energia solar?</span>
              </div>
              <p style="font-size:9.5pt;color:#374151;line-height:1.8;margin:0;text-align:justify;">
                A energia solar fotovoltaica é hoje um dos investimentos com melhor relação custo-benefício disponíveis no mercado. Com retorno médio entre <strong>3 e 5 anos</strong> e vida útil dos painéis superior a <strong>25 anos</strong>, o sistema gera economia na conta de energia desde o primeiro mês de operação. Além da economia financeira, o sistema valoriza o imóvel em até <strong>8%</strong>, reduz a emissão de CO₂ e oferece independência energética frente às constantes variações tarifárias das concessionárias. Cada sistema é dimensionado individualmente para o perfil de consumo do cliente, garantindo máxima eficiência e o menor tempo possível de payback.
              </p>
            </div>

            <!-- TÍTULO GRÁFICO -->
            <div style="display:flex;align-items:center;gap:3mm;margin-bottom:3mm;">
              <div style="width:4px;height:16px;background:#f59e0b;border-radius:2px;"></div>
              <span style="font-size:12pt;font-weight:900;color:#1e3a5f;">
                Consumo X Geração</span>
              <span style="font-size:9pt;color:#6b7280;">(kWh mensais estimados)</span>
            </div>

            <!-- GRÁFICO SVG -->
            <div style="width:100%; height:180px; position:relative; margin-bottom: 10mm;">
              ${(consumoMensal > 0 || geracaoMes.some((g: number) => g > 0)) ? `
              <svg width="${svgW}" height="${svgH}"
                viewBox="0 0 ${svgW} ${svgH}"
                style="width:100%;max-width:${svgW}px;display:block;margin:0 auto;"
                xmlns="http://www.w3.org/2000/svg">

                <!-- LINHAS DE GRADE E LABELS DO EIXO Y -->
                ${Array.from({length: 6}, (_, step) => {
                  const valor = Math.round((maxVal6 / 5) * step);
                  const y = chartAreaH - Math.round((valor / maxVal6) * chartAreaH);
                  return `
                    <line x1="${paddingLeft}" y1="${y}" x2="${paddingLeft + chartAreaW}" y2="${y}"
                      stroke="#e5e7eb" stroke-width="1" stroke-dasharray="${step === 0 ? 'none' : '3,2'}"/>
                    <text x="${paddingLeft - 4}" y="${y + 3.5}"
                      font-size="7.5" text-anchor="end" fill="#6b7280"
                      font-family="Arial">${valor}</text>
                  `;
                }).join('')}

                <!-- LABEL DO EIXO Y -->
                <text x="8" y="${chartAreaH / 2}"
                  font-size="7" text-anchor="middle" fill="#6b7280"
                  font-family="Arial" transform="rotate(-90, 8, ${chartAreaH / 2})">kWh</text>

                <!-- BARRAS -->
                ${meses6.map((mes: string, i: number) => {
                  const xBase = paddingLeft + i * (chartAreaW / 12) + 2;
                  const barW = Math.floor((chartAreaW / 12) - 6);
                  const hConsumo = Math.round((consumoMensal / maxVal6) * chartAreaH);
                  const hGeracao = Math.round((geracaoMes[i] / maxVal6) * chartAreaH);
                  return `
                    <rect x="${xBase}" y="${chartAreaH - hConsumo}"
                      width="${Math.floor(barW / 2) - 1}" height="${hConsumo}"
                      fill="#d6e4f0" rx="2"/>
                    <rect x="${xBase + Math.floor(barW / 2) + 1}" y="${chartAreaH - hGeracao}"
                      width="${Math.floor(barW / 2) - 1}" height="${hGeracao}"
                      fill="#1e3a5f" rx="2"/>
                    <text x="${xBase + Math.floor(barW / 2)}" y="${chartAreaH + 14}"
                      font-size="7" text-anchor="middle"
                      fill="#6b7280" font-family="Arial">${mes}</text>
                  `;
                }).join('')}

                <!-- LINHA BASE DO EIXO X -->
                <line x1="${paddingLeft}" y1="${chartAreaH}"
                  x2="${paddingLeft + chartAreaW}" y2="${chartAreaH}"
                  stroke="#1e3a5f" stroke-width="1.5"/>

              </svg>
              ` : `
              <div style="height:${svgH}px;display:flex;align-items:center;justify-content:center;
                color:#6b7280;font-size:11pt;font-style:italic;border:1px dashed #d1d5db;border-radius:8px;">
                Dados de consumo não informados
              </div>
              `}
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

            <!-- RODAPÉ -->
            <div style="border-top:2px solid #1e3a5f;padding-top:3mm;margin-top:5mm;
              display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:8pt;color:#1e3a5f;font-weight:bold;">
                MT SOLAR — ENERGIA RENOVÁVEL</div>
              <div style="font-size:7.5pt;color:#6b7280;">
                mtsolar.energia@gmail.com | (81) 99700-3260 | (81) 99951-7110</div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 7: INDICADORES DE VIABILIDADE -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;overflow:hidden;">

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
                  Investimento no Sistema</div>
                
                ${(originalPrice - saleP) > 0.01 ? `
                  <div style="color:rgba(255,255,255,0.7);font-size:10pt;text-decoration:line-through;margin-top:1mm;">
                    R$ ${originalPrice.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </div>
                  <div style="color:#fca5a5;font-size:11pt;font-weight:bold;margin-bottom:1mm;">
                    Desconto: - R$ ${(originalPrice - saleP).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </div>
                  <div style="color:#fff;font-size:22pt;font-weight:900;border-top:1px solid rgba(255,255,255,0.2);padding-top:1mm;">
                    Valor Final: R$ ${saleP.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </div>
                ` : `
                  <div style="color:#fff;font-size:22pt;font-weight:900;margin-top:1mm;">
                    R$ ${saleP.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </div>
                `}
              </div>
              <div style="text-align:right;">
                <div style="color:rgba(255,255,255,0.7);font-size:8pt;">Reajuste anual previsto</div>
                <div style="color:#f59e0b;font-size:14pt;font-weight:bold;">10% a.a.</div>
              </div>
            </div>

            <!-- OBSERVAÇÃO DE DESCONTO -->
            ${formData.discountObservation ? `
              <div style="background:#fff;border-left:5px solid #ef4444;border-radius:6px;
                padding:4mm 6mm;margin-bottom:5mm;box-shadow:0 2px 10px rgba(0,0,0,0.05);
                border-top:1px solid #fee2e2;border-right:1px solid #fee2e2;border-bottom:1px solid #fee2e2;">
                <div style="display:flex;align-items:flex-start;gap:3mm;">
                  <div style="flex-grow:1;">
                    <span style="color:#ef4444;font-size:10pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-right:2mm;">
                      Desconto:
                    </span>
                    <span style="color:#374151;font-size:10pt;font-weight:bold;line-height:1.5;">
                      ${formData.discountObservation}
                    </span>
                  </div>
                </div>
              </div>
            ` : ''}

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
                    ${roi}% a.a.</div>
                  <div style="color:#6b7280;font-size:8pt;">retorno no primeiro ano</div>
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
              <div style="display:flex;gap:4mm;text-align:right;">
                <div>
                  <div style="color:#6b7280;font-size:8pt;">Tarifa Atual</div>
                  <div style="color:#ef4444;font-size:10pt;font-weight:bold;text-decoration:line-through;">
                    R$ ${tarifaAtual}/kWh</div>
                </div>
                <div>
                  <div style="color:#6b7280;font-size:8pt;">Custo com Solar</div>
                  <div style="color:#1e3a5f;font-size:10pt;font-weight:bold;">
                    R$ ${custokWh}/kWh</div>
                </div>
                <div>
                  <div style="color:#6b7280;font-size:8pt;">Economia Líquida</div>
                  <div style="color:#166534;font-size:11pt;font-weight:bold;">
                    R$ ${economiakWh}/kWh</div>
                </div>
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
            <div style="width:100%; height:160px; position:relative;">
              <svg width="100%" height="150" viewBox="0 0 520 150" preserveAspectRatio="none">
                <!-- Eixo X (Zero) -->
                <line x1="0" y1="100" x2="520" y2="100" stroke="#1e3a5f" stroke-width="1.5" />
                
                ${fluxoCaixa.map((val, i) => {
                  const xBase = i * 20 + 10;
                  const barWidth = 14;
                  const absMax = Math.max(maxFC, Math.abs(minFC));
                  const barHeight = (Math.abs(val) / absMax) * 80;
                  const y = val >= 0 ? 100 - barHeight : 100;
                  const color = val >= 0 ? '#1e3a5f' : '#fca5a5';
                  
                  let label = '';
                  if ([1, 5, 10, 15, 20, 25].includes(i + 1)) {
                    label = `<text x="${xBase + 7}" y="145" font-size="8" text-anchor="middle" fill="#6b7280">${i + 1}</text>`;
                  }

                  return `
                    <rect x="${xBase}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="1" />
                    ${label}
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

            ${formData.financeBanco ? `
            <!-- CONDIÇÕES DE FINANCIAMENTO -->
            <div style="background:#f8fafc;border:1.5px solid #d6e4f0;border-radius:8px;
              padding:3mm 5mm;margin-top:4mm;">
              <div style="font-size:9pt;font-weight:bold;color:#1e3a5f;margin-bottom:1mm;text-transform:uppercase;letter-spacing:1px;">
                🏦 Simulação de Financiamento Solar
              </div>
              <div style="font-size:10pt;color:#374151;line-height:1.4;">
                Banco: <strong>${formData.financeBanco}</strong> | 
                Taxa: <strong>${formData.financeRate}% a.m.</strong> | 
                Carência: <strong>${formData.financeGracePeriod} meses</strong><br/>
                Investimento: <strong>R$ ${results.salePrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong> |
                Entrada: <strong>R$ ${parseFloat(formData.financeDownPayment || '0').toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong><br/>
                Parcelas: <strong style="color:#1e3a5f;font-size:11pt;">${formData.financeTerm}x de R$ ${results.monthlyInstallment.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
              </div>
            </div>
            ` : ''}

            <!-- RODAPÉ -->
            <div style="border-top:2px solid #1e3a5f;padding-top:3mm;margin-top:4mm;
              display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:8pt;color:#1e3a5f;font-weight:bold;">
                MT SOLAR — ENERGIA RENOVÁVEL</div>
              <div style="font-size:7.5pt;color:#6b7280;">
                mtsolar.energia@gmail.com | (81) 99700-3260 | (81) 99951-7110</div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 8: SERVIÇOS INCLUSOS -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;overflow:hidden;">

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
                alterações na rede de distribuição as quais eventualmente podem ser solicitadas
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
                    <td style="padding:2.5mm 4mm;color:#374151;
                      border-bottom:1px solid #e5e7eb;vertical-align:top;">
                      Estrutura de Fixação
                      ${temItensEstrutura ? `
                        <div style="font-size:7.5pt;color:#6b7280;margin-top:1mm;
                          line-height:1.6;">
                          ${itensEstrutura.map(i =>
                            `${i.nome}${i.garantia ? ' (' + i.garantia + ' anos)' : ''}`
                          ).join('<br/>')}
                        </div>` : ''}
                    </td>
                    <td style="padding:2.5mm 4mm;text-align:center;
                      border-bottom:1px solid #e5e7eb;vertical-align:top;">
                      <span style="background:#dcfce7;color:#166534;border-radius:4px;
                        padding:0.5mm 3mm;font-weight:bold;">
                        ${gEstruturaFinal} Anos</span>
                    </td>
                    <td style="padding:2.5mm 4mm;text-align:center;
                      border-bottom:1px solid #e5e7eb;color:#9ca3af;">—</td>
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

            <!-- RODAPÉ -->
            <div style="border-top:2px solid #1e3a5f;padding-top:3mm;margin-top:5mm;
              display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:8pt;color:#1e3a5f;font-weight:bold;">
                MT SOLAR — ENERGIA RENOVÁVEL</div>
              <div style="font-size:7.5pt;color:#6b7280;">
                mtsolar.energia@gmail.com | (81) 99700-3260 | (81) 99951-7110</div>
            </div>

          </div>
        </div>

        <!-- PÁGINA 9: CONSIDERAÇÕES FINAIS E VALIDADE -->
        <div style="width:210mm;height:297mm;margin:0 auto;page-break-after:auto;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;overflow:hidden;">

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
                30 dias corridos a partir da data de geração</div>
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
                    (81) 99700-3260 | (81) 99951-7110</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#6b7280;font-size:8pt;">Nº da Proposta</div>
                  <div style="color:#1e3a5f;font-size:11pt;font-weight:bold;">
                    ${propNumeroLimpo}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;

    // Montar a página HTML de fotos separadamente para o print do navegador
    let photosHtml = '';
    if (formData.includePhotos && formData.photos && formData.photos.length > 0) {
      photosHtml = `
        <div style="width:210mm;min-height:297mm;margin:0 auto;page-break-before:always;
          box-sizing:border-box;font-family:Arial,sans-serif;background:#fff;padding-bottom:10mm;">
          <!-- FAIXA TOPO -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);
            height:18mm;padding:0 14mm;display:flex;align-items:center;
            justify-content:space-between;">
            <span style="color:#fff;font-size:13pt;font-weight:900;">
              Fotos de Vistoria Técnica</span>
            <span style="color:#f59e0b;font-size:9pt;font-weight:bold;">MT Solar</span>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b);"></div>
          <div style="padding:8mm 14mm;text-align:center;">
            ${formData.photos.map(url => `
              <div style="margin-bottom:8mm;">
                <img src="${url}" style="max-width:100%;max-height:100mm;object-fit:contain;border:1px solid #e5e7eb;padding:2mm;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1);"/>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Para o print no navegador, juntamos tudo
    const htmlParaNavegador = htmlContent.replace('</body>', `${photosHtml}</body>`);

    if (!Capacitor.isNativePlatform() && newWindow) {
      newWindow.document.write(htmlParaNavegador);
      newWindow.document.close();
      setTimeout(() => { newWindow?.print(); }, 2000);
    }

    // Função para upload de PDF completo em background
    const uploadFullPDF = async (html: string) => {
      try {
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        const pageWidth  = 210; // mm
        const pageHeight = 297; // mm

        // ETAPA 1: Criar container oculto fora da viewport
        const container = document.createElement('div');
        container.style.cssText = [
          'position:fixed',
          'top:0',
          'left:-9999px',
          'width:210mm',
          'visibility:hidden',
          'z-index:-1',
          'pointer-events:none',
          'overflow:visible',
        ].join(';');
        container.innerHTML = html;
        document.body.appendChild(container);

        try {
          // ETAPA 2: Aguardar todas as <img> carregarem
          const imgs = Array.from(container.querySelectorAll('img'));
          await Promise.all(
            imgs.map(img =>
              new Promise<void>(resolve => {
                if (img.complete && img.naturalHeight !== 0) {
                  resolve();
                  return;
                }
                const timeout = setTimeout(resolve, 15000);
                img.onload  = () => { clearTimeout(timeout); resolve(); };
                img.onerror = () => { clearTimeout(timeout); resolve(); };
              })
            )
          );

          // ETAPA 3: Capturar cada página com html2canvas
          const pageDivs = Array.from(
            container.querySelectorAll<HTMLElement>('div[style*="210mm"]')
          ).filter(el => {
            const style = el.getAttribute('style') || '';
            return style.includes('height:297mm') || style.includes('min-height:297mm');
          });

          console.log(`[PDF html2canvas] Capturando ${pageDivs.length} páginas...`);
          const t0 = performance.now();

          let primeiraPage = true;
          for (let i = 0; i < pageDivs.length; i++) {
            const pageEl = pageDivs[i];

            const canvas = await html2canvas(pageEl, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              logging: false,
              width:  pageEl.scrollWidth,
              height: pageEl.scrollHeight,
              windowWidth:  pageEl.scrollWidth,
              windowHeight: pageEl.scrollHeight,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            if (!primeiraPage) {
              doc.addPage();
            }
            primeiraPage = false;

            doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
            console.log(`[PDF html2canvas] Página ${i + 1}/${pageDivs.length} capturada.`);
          }

          const t1 = performance.now();
          console.log(`[PDF html2canvas] Geração concluída em ${((t1 - t0) / 1000).toFixed(1)}s.`);

        } finally {
          // ETAPA 4: Remover container do DOM
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        }

        const pdfBlob = doc.output('blob');
        const fileName = `${proposalNumber}-${Date.now()}.pdf`;

        if (Capacitor.isNativePlatform()) {
          try {
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(pdfBlob);
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
            });
            
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents
            });
            
            const uriResult = await Filesystem.getUri({
              directory: Directory.Documents,
              path: fileName
            });
            
            await Share.share({
              title: `Proposta MT Solar - ${formData.clientName || 'Cliente'}`,
              text: 'Confira a proposta comercial.',
              url: uriResult.uri,
              dialogTitle: 'Compartilhar Proposta'
            });
          } catch (mobileErr) {
            console.error('Erro ao compartilhar PDF no mobile:', mobileErr);
            alert('Erro ao gerar/compartilhar o PDF no dispositivo.');
          } finally {
            setIsGeneratingPDF(false);
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('propostas')
          .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('propostas')
          .getPublicUrl(fileName);

        return publicUrl;
      } catch (err) {
        console.error('Erro no upload do PDF completo:', err);
        if (Capacitor.isNativePlatform()) setIsGeneratingPDF(false);
        return null;
      }
    };
    // O download do PDF (abertura da nova aba) já foi disparado via newWindow.open
    // O salvamento no histórico é feito de forma assíncrona, mas agora com feedback visual ao usuário.
    (async () => {
      // Etapa 1: Tenta fazer o upload do PDF para o storage
      let urlArquivo: string | undefined = undefined;
      let uploadFalhou = false;

      try {
        const url = await uploadFullPDF(htmlContent);
        if (url) {
          urlArquivo = url;
        } else {
          uploadFalhou = true;
        }
      } catch {
        uploadFalhou = true;
      }

      // Se o upload falhou, avisa o usuário mas continua para salvar o registro sem o PDF
      if (uploadFalhou) {
        setHistoryNotice({
          type: 'warning',
          message: 'Proposta gerada, mas houve um problema ao salvar o arquivo. O registro será salvo sem o PDF anexado.'
        });
      }

      // Etapa 2: Tenta salvar o registro no histórico (com ou sem URL do arquivo)
      try {
        await saveToHistory(proposalNumber, urlArquivo);

        // Se estava editando, limpa o estado após salvar com sucesso
        if (editingProposalId) {
          setEditingProposalId(null);
        }

        // Se o upload funcionou, exibe mensagem de sucesso (substitui o aviso de warning)
        if (!uploadFalhou) {
          setHistoryNotice({
            type: 'success',
            message: 'Proposta gerada e salva no histórico com sucesso!'
          });
          // Remove a mensagem de sucesso após 5 segundos
          setTimeout(() => setHistoryNotice(null), 5000);
        }
      } catch (saveError: any) {
        // Falha crítica: o registro NÃO foi salvo no histórico
        console.error('[HISTÓRICO] Falha crítica ao salvar proposta no histórico:', saveError);
        setHistoryNotice({
          type: 'error',
          message:
            `⚠️ ATENÇÃO: A proposta NÃO foi salva no histórico. ` +
            `Erro: ${saveError?.response?.data?.error || saveError?.message || 'Falha de rede'}. ` +
            `Tente gerar a proposta novamente ou entre em contato com o suporte.`
        });
      } finally {
        if (Capacitor.isNativePlatform()) setIsGeneratingPDF(false);
      }
    })();

    // Retornar para tela inicial da proposta imediatamente (não aguarda o salvamento)
    setActiveTab('dados');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAdminOrCeo = user?.role === 'CEO' || user?.role === 'ADMIN';

  const tabs = [
    { id: 'dados' as TabType, label: 'Dados do Cliente', icon: User },
    { id: 'kit' as TabType, label: 'Kit Solar', icon: Package },
    { id: 'calculo' as TabType, label: 'Cálculo & Retorno', icon: Calculator },
    { id: 'financiamento' as TabType, label: 'Financiamento', icon: CreditCard },
    { id: 'servicos' as TabType, label: 'Proposta de Serviços', icon: Wrench },
    { id: 'historico' as TabType, label: 'Histórico', icon: History },
    ...(isAdminOrCeo ? [{ id: 'kits' as TabType, label: 'Kits Solares', icon: Database }] : []),
  ];


  const currentStepIndex = tabs.findIndex(t => t.id === activeTab);
  const isReady = !!formData.clientName && !!formData.kitCost && (isAdminOrCeo || !!selectedKitId);

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

      {editingProposalId && activeTab !== 'historico' && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="font-bold flex items-center gap-2"><Edit size={18} /> Modo de Edição Ativo</h2>
            <p className="text-sm">Você está editando uma proposta existente do histórico. Caso salve, os dados originais serão atualizados.</p>
          </div>
          <button 
            onClick={() => { setEditingProposalId(null); setFormData(prev => ({...prev})); }}
            className="bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap transition-colors"
          >
            Cancelar Edição
          </button>
        </div>
      )}

      {/* Banner de aviso de salvamento no histórico (sucesso / warning / erro crítico) */}
      {historyNotice && (
        <div
          className={`p-4 rounded-xl shadow-sm border-l-4 flex items-start justify-between gap-4 ${
            historyNotice.type === 'success'
              ? 'bg-green-50 border-green-500 text-green-800'
              : historyNotice.type === 'warning'
              ? 'bg-amber-50 border-amber-500 text-amber-800'
              : 'bg-red-50 border-red-600 text-red-800'
          }`}
        >
          <p className="text-sm font-medium flex-1">{historyNotice.message}</p>
          <button
            onClick={() => setHistoryNotice(null)}
            className="text-current opacity-60 hover:opacity-100 shrink-0 transition-opacity"
            title="Fechar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
                  <div className="grid grid-cols-1 gap-3">
                    {AVAILABLE_SERVICES.map(service => {
                      const isSelected = serviceFormData.selectedServices.includes(service.id);
                      const eqData = serviceEquipmentData[service.id] || {
                        qtdModulos: '', potenciaModuloWp: '', potenciaTotalKwp: '',
                        marcaModulo: '', modeloModulo: '', potenciaInversorKw: '',
                        marcaInversor: '', modeloInversor: ''
                      };
                      return (
                        <div key={service.id}>
                          {/* Card de seleção do serviço */}
                          <div
                            onClick={() => toggleService(service.id)}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-100 bg-white hover:border-blue-200'
                            }`}
                          >
                            <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-gray-800">{service.name}</p>
                              <p className="text-[11px] text-gray-500 mt-1">{service.description}</p>
                            </div>
                          </div>

                          {/* Textarea de observações para serviço de remoção */}
                          {isSelected && (service as any).hasRemovalObservation && (
                            <div className="mt-2 ml-4 p-4 bg-amber-50 border border-amber-200 rounded-xl" onClick={e => e.stopPropagation()}>
                              <label className="text-sm font-semibold text-amber-900 block mb-1">
                                Observações sobre a remoção <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                rows={3}
                                value={serviceObservations[service.id] || ''}
                                onChange={e => setServiceObservations(prev => ({ ...prev, [service.id]: e.target.value }))}
                                onClick={e => e.stopPropagation()}
                                className="border border-amber-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm resize-none bg-white"
                                placeholder="Descreva situações específicas da remoção (quantidade de equipamentos, estado de conservação, destino dos materiais, etc.)"
                              />
                            </div>
                          )}

                          {/* Detalhamento técnico para serviços com equipamentos fotovoltaicos */}
                          {isSelected && service.hasEquipment && (
                            <div className="mt-2 ml-4 p-4 bg-blue-50 border border-blue-200 rounded-xl" onClick={e => e.stopPropagation()}>
                              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Zap size={14} />
                                Detalhamento Técnico dos Equipamentos
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                {/* Qtd módulos */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Qtd. de Módulos</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={eqData.qtdModulos}
                                    onChange={e => updateServiceEquipment(service.id, 'qtdModulos', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ex: 10"
                                  />
                                </div>
                                {/* Potência do módulo */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Potência Módulo (Wp)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={eqData.potenciaModuloWp}
                                    onChange={e => updateServiceEquipment(service.id, 'potenciaModuloWp', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ex: 555"
                                  />
                                </div>
                                {/* Potência total (calculada) */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Potência Total (kWp)</label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={eqData.potenciaTotalKwp || '—'}
                                    onClick={e => e.stopPropagation()}
                                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-full text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                                  />
                                </div>
                                {/* Potência do inversor */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Potência Inversor (kW)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={eqData.potenciaInversorKw}
                                    onChange={e => updateServiceEquipment(service.id, 'potenciaInversorKw', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ex: 5"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Marca do módulo */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Marca do Módulo</label>
                                  <input
                                    type="text"
                                    value={eqData.marcaModulo}
                                    onChange={e => updateServiceEquipment(service.id, 'marcaModulo', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ex: Risen"
                                  />
                                </div>
                                {/* Modelo do módulo */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Modelo do Módulo</label>
                                  <input
                                    type="text"
                                    value={eqData.modeloModulo}
                                    onChange={e => updateServiceEquipment(service.id, 'modeloModulo', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ex: RSM144-7-555M"
                                  />
                                </div>
                                {/* Marca do inversor */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Marca do Inversor</label>
                                  <input
                                    type="text"
                                    value={eqData.marcaInversor}
                                    onChange={e => updateServiceEquipment(service.id, 'marcaInversor', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ex: Growatt"
                                  />
                                </div>
                                {/* Modelo do inversor */}
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-gray-700">Modelo do Inversor</label>
                                  <input
                                    type="text"
                                    value={eqData.modeloInversor}
                                    onChange={e => updateServiceEquipment(service.id, 'modeloInversor', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ex: MIN 5000TL-X"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <label className="text-sm font-bold text-gray-800 uppercase tracking-wider">Forma de Pagamento e Prazos</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Forma de Pagamento</label>
                      <select
                        value={serviceFormData.paymentMethod}
                        onChange={(e) => setServiceFormData({...serviceFormData, paymentMethod: e.target.value})}
                        className={inputStyle}
                      >
                        <option value="À Vista">À Vista</option>
                        <option value="Parcelado no Cartão">Parcelado no Cartão</option>
                        <option value="Transferência/PIX">Transferência/PIX</option>
                        <option value="Financiamento">Financiamento</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Condições / Observações</label>
                      <input 
                        type="text" 
                        value={serviceFormData.paymentConditions}
                        onChange={(e) => setServiceFormData({...serviceFormData, paymentConditions: e.target.value})}
                        className={inputStyle}
                        placeholder="Ex: 50% entrada + 50% na conclusão"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Valor Total do Serviço (R$)</label>
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

            {/* Seletor de Kit Pré-cadastrado — ADM/CEO veem como atalho opcional no topo */}
            {isAdminOrCeo && solarKits.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <label className="text-sm font-bold text-blue-900 block mb-2">⚡ Preencher a partir de Kit Cadastrado (opcional)</label>
                <select
                  value={selectedKitId}
                  onChange={(e) => applySelectedKit(e.target.value)}
                  className="border border-blue-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Selecione um kit para preencher automaticamente —</option>
                  {solarKits.map(kit => (
                    <option key={kit.id} value={kit.id}>
                      {kit.consumo_referencia_kwh
                        ? `${kit.potencia_kwp} kWp (≈${kit.consumo_referencia_kwh} kWh/mês) · ${kit.marca_modulo} · ${kit.marca_inversor} · R$ ${(kit.valor_total * (1 + kit.margem_venda / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : `${kit.potencia_kwp} kWp · ${kit.marca_modulo} · ${kit.marca_inversor} · R$ ${(kit.valor_total * (1 + kit.margem_venda / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-600 mt-1">Ao selecionar, os campos abaixo serão preenchidos automaticamente. Você pode editar livremente depois.</p>
              </div>
            )}

            {isAdminOrCeo ? (
              <>
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
              </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Margem de Venda (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.margemVenda ?? (selectedKitId ? solarKits.find(k => k.id === selectedKitId)?.margem_venda : 30)}
                    onChange={(e) => {
                      const novaMargemm = parseFloat(e.target.value) || 0;
                      const selectedKit = solarKits.find(k => k.id === selectedKitId);
                      const novoValorFinal = selectedKit
                        ? selectedKit.valor_total * (1 + novaMargemm / 100)
                        : formData.valorFinalVenda || 0;

                      setFormData(prev => ({
                        ...prev,
                        margemVenda: novaMargemm,
                        valorFinalVenda: novoValorFinal,
                        kitCost: novoValorFinal.toFixed(2)
                      }));

                      setResults(prev => ({
                        ...prev,
                        salePrice: novoValorFinal,
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              /* VENDEDOR: seleção obrigatória de kit cadastrado — sem exibir custos ou valores */
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <label className="text-sm font-bold text-blue-900 block mb-2">
                  ⚡ Selecionar Kit Cadastrado *
                </label>
                {loadingKits ? (
                  <p className="text-sm text-blue-600 italic">Carregando kits disponíveis...</p>
                ) : solarKits.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 font-medium">Nenhum kit disponível no momento.</p>
                    <p className="text-xs text-yellow-700 mt-1">Entre em contato com o ADM ou CEO para cadastrar os kits solares.</p>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedKitId}
                      onChange={(e) => applySelectedKit(e.target.value)}
                      className={`border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                        !selectedKitId ? 'border-red-400 ring-1 ring-red-300' : 'border-blue-300'
                      }`}
                    >
                      <option value="">— Selecione um kit —</option>
                      {solarKits.map(kit => (
                        <option key={kit.id} value={kit.id}>
                          {kit.consumo_referencia_kwh
                            ? `Kit ${kit.potencia_kwp} kWp — ≈${kit.consumo_referencia_kwh} kWh/mês`
                            : `Kit ${kit.potencia_kwp} kWp`
                          }
                        </option>
                      ))}
                    </select>
                    {!selectedKitId && (
                      <p className="text-xs text-red-500 mt-1 font-medium">⚠️ Obrigatório. Selecione um kit para gerar a proposta.</p>
                    )}
                    {selectedKitId && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-blue-600 block">Potência</span>
                          <span className="text-sm font-bold text-blue-900">{formData.kitPower ? `${formData.kitPower} kWp` : '—'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-blue-600 block">Módulo</span>
                          <span className="text-sm font-bold text-blue-900">{formData.moduleModel || '—'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-blue-600 block">Inversor</span>
                          <span className="text-sm font-bold text-blue-900">{formData.inverterBrand || '—'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-blue-600 block">Qtd. Módulos</span>
                          <span className="text-sm font-bold text-blue-900">{formData.moduleQty || '—'}</span>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-blue-600 mt-2">Ao selecionar, os dados técnicos da proposta são preenchidos automaticamente.</p>
                  </>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">

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
                <div className="flex justify-between items-end mb-1">
                  <label className="text-sm font-medium text-gray-700">Fornecedor do Kit</label>
                  {isAdminOrCeo && (
                    <button
                      type="button"
                      onClick={openNewSupplierModal}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} /> Gerenciar Distribuidores
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={formData.kitSupplier}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const sup = suppliers.find(s => (s.nome_fantasia || s.razao_social) === selectedName);
                      setFormData(prev => ({
                        ...prev,
                        kitSupplier: selectedName,
                        selectedSupplierData: sup || null
                      }));
                    }}
                    className={inputStyle}
                  >
                    <option value="">— Selecione (Opcional) —</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.nome_fantasia || sup.razao_social}>
                        {sup.nome_fantasia || sup.razao_social}
                      </option>
                    ))}
                  </select>
                  {isAdminOrCeo && formData.kitSupplier && suppliers.find(s => (s.nome_fantasia || s.razao_social) === formData.kitSupplier) && (
                    <button
                      type="button"
                      onClick={() => {
                        const sup = suppliers.find(s => (s.nome_fantasia || s.razao_social) === formData.kitSupplier);
                        if(sup) openEditSupplierModal(sup);
                      }}
                      className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-600"
                      title="Editar Distribuidor"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">Opcional - se preenchido, aparece na proposta</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tipo de Estrutura do Sistema *</label>
                <select
                  value={formData.tipoEstrutura}
                  onChange={(e) => updateForm('tipoEstrutura', e.target.value)}
                  className={inputStyle}
                >
                  <option value="telhado_ceramico">Telhado Cerâmico</option>
                  <option value="telhado_metalico">Telhado Metálico</option>
                  <option value="telhado_fibrocimento">Telhado Fibrocimento</option>
                  <option value="telhado_shingle">Telhado Shingle</option>
                  <option value="solo">Solo</option>
                  <option value="outro">Outro</option>
                </select>
                <p className="text-[10px] text-gray-400">Define o tipo de fixação na proposta</p>
              </div>
            </div>

            {/* Preview Card */}
            {isAdminOrCeo && (
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
                  {parseFloat(formData.discountValue || '0') > 0 && (
                    <div>
                      <p className="text-xs text-red-600 uppercase font-bold">Desconto ({formData.discountType === 'percent' ? formData.discountValue + '%' : 'R$'})</p>
                      <p className="text-lg font-semibold text-red-600">
                        - R$ {(formData.discountType === 'percent' 
                          ? (parseFloat(formData.kitCost || '0') * (1 + parseFloat(formData.marginPercent || '0') / 100)) * (parseFloat(formData.discountValue || '0') / 100)
                          : parseFloat(formData.discountValue || '0')
                        ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  <div className="bg-white p-4 rounded-xl border-2 border-blue-200 shadow-sm transform hover:scale-105 transition-transform">
                    <p className="text-xs text-blue-700 uppercase font-bold">Valor Final de Venda</p>
                    <p className="text-3xl font-black text-blue-900">
                      R$ {(formData.valorFinalVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Info size={16} className="text-blue-600" />
                Desconto / Observação
              </label>
              <textarea
                value={formData.discountObservation}
                onChange={(e) => updateForm('discountObservation', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] text-sm"
                placeholder="Ex: 5% de desconto para pagamento à vista"
              />
              <p className="text-[10px] text-gray-400 italic">Este texto aparecerá em destaque logo abaixo do valor total na proposta.</p>
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

              {/* Inversor Ampliação (Apenas se o kit tiver) */}
              {formData.inversorAmpliacao && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h4 className="text-sm font-bold text-amber-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Inversor para Ampliação
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-amber-900">Modelo/Marca do Inversor Ampliação</label>
                      <input 
                        type="text" 
                        value={formData.inverterAmpBrand}
                        onChange={(e) => updateForm('inverterAmpBrand', e.target.value)}
                        className={`${inputStyle} bg-white border-amber-300 focus:ring-amber-500`}
                        readOnly={!isAdminOrCeo}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-amber-900">Potência (W)</label>
                      <input 
                        type="number" 
                        value={formData.inverterAmpPower}
                        onChange={(e) => updateForm('inverterAmpPower', e.target.value)}
                        className={`${inputStyle} bg-white border-amber-300 focus:ring-amber-500`}
                        readOnly={!isAdminOrCeo}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Materiais da Estrutura de Fixação */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-lg font-bold text-blue-900 mb-1 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Materiais da Estrutura de Fixação
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  Digite os materiais utilizados conforme exigência bancária. Cada item pode ter sua própria garantia. Deixe em branco para exibir apenas 'Estrutura de Fixação' na proposta.
                </p>

                <div className="space-y-3">
                  {formData.structureItems.map((item, index) => (
                    <div key={item.id} className="flex gap-3 items-end mb-2 bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative group">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-500 font-bold">Material {index + 1}</label>
                        <input 
                          type="text" 
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...formData.structureItems];
                            newItems[index].name = e.target.value;
                            setFormData(prev => ({ ...prev, structureItems: newItems }));
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Ex: Trilho de Alumínio 40x40"
                        />
                      </div>
                      <div className="w-20 space-y-1">
                        <label className="text-xs text-gray-500 font-bold">Qtd</label>
                        <input 
                          type="number" 
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const newItems = [...formData.structureItems];
                            newItems[index].quantity = Math.max(0, val);
                            setFormData(prev => ({ ...prev, structureItems: newItems }));
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-center"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <label className="text-xs text-gray-500 font-bold">Garantia (anos)</label>
                        <input 
                          type="number" 
                          min="0"
                          max="50"
                          value={item.warranty}
                          onChange={(e) => {
                            const newItems = [...formData.structureItems];
                            newItems[index].warranty = e.target.value;
                            setFormData(prev => ({ ...prev, structureItems: newItems }));
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Ex: 10"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = formData.structureItems.filter((_, i) => i !== index);
                          setFormData(prev => ({ ...prev, structureItems: newItems }));
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                        title="Remover Item"
                      >
                        <Plus size={18} className="rotate-45" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newItem: StructureItem = {
                      id: Date.now().toString(),
                      name: '',
                      quantity: 1,
                      warranty: ''
                    };
                    setFormData(prev => ({ 
                      ...prev, 
                      structureItems: [...prev.structureItems, newItem] 
                    }));
                  }}
                  className="mt-4 flex items-center gap-2 text-blue-900 font-bold text-sm hover:bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 transition-all"
                >
                  <Plus size={18} />
                  Adicionar Item
                </button>

                {(formData.structureItems.some(item => item.name && item.quantity > 0)) && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-bold text-blue-900 mb-2">Materiais que aparecerão na proposta:</p>
                    <div className="space-y-1">
                      {formData.structureItems.map((item, idx) => {
                        if (!item.name || item.quantity <= 0) return null;
                        return (
                          <div key={idx} className="text-sm text-gray-700">
                            • {item.name} — Qtd: {item.quantity} — Garantia: {item.warranty || 'padrão'} {item.warranty ? 'anos' : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Garantias do Sistema */}
              <div className="mt-6 pt-6 border-t border-gray-100">
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
                    <p className="text-xs text-gray-400">Ex: Leapton = 10 anos</p>
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
                    <p className="text-xs text-gray-400">Ex: Leapton = 25 anos</p>
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
                    <p className="text-xs text-gray-400">Ex: Goodwe = 10 anos | Growatt = 5 anos</p>
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
                    <p className="text-xs text-gray-400">Varia conforme material (alumínio, aço galvanizado)</p>
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
                    <p className="text-xs text-gray-400">Garantia de mão de obra</p>
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

            {/* Painel de Taxas de Financiamento */}
            <div className="p-4 bg-white rounded-xl border border-gray-200 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🧮</span>
                <h3 className="font-semibold text-gray-800">Tabela de Taxas — Financiamento Solar</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {TABELA_FINANCIAMENTO.map((item) => (
                  <div 
                    key={item.prazo} 
                    onClick={() => {
                      updateForm('financeRate', item.taxa.toString());
                      updateForm('financeTerm', item.prazo.toString());
                      updateForm('financeGracePeriod', item.carencia.toString());
                      updateForm('financeBanco', 'BV');
                    }}
                    className={`border rounded-lg p-4 text-center cursor-pointer hover:shadow-md transition-all ${
                      formData.financeTerm === item.prazo.toString()
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <p className="text-sm text-gray-500 mb-1">Carência: {item.carencia} m</p>
                    <p className="text-base font-semibold text-gray-700">{item.prazo} meses</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{item.taxa.toFixed(1)}% <span className="text-sm font-normal text-gray-500">a.m.</span></p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Valor de Entrada (R$)</label>
                <input 
                  type="number" 
                  value={formData.financeDownPayment}
                  onChange={(e) => {
                    const entry = e.target.value;
                    const saleP = results.salePrice;
                    updateForm('financeDownPayment', entry);
                    updateForm('financeValue', (saleP - parseFloat(entry || '0')).toFixed(2));
                  }}
                  className={inputStyle}
                  placeholder="0.00"
                />
              </div>

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
              <p className="text-sm opacity-80 mb-2">{formData.financeTerm}x de R$ {results.monthlyInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              
              {formData.financeBanco && (
                <p className="text-xs font-medium bg-blue-800/50 inline-block px-3 py-1 rounded-full text-amber-200">
                  Banco: {formData.financeBanco} • Taxa: {formData.financeRate}% a.m. • Carência: {formData.financeGracePeriod} meses
                </p>
              )}
              
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

            {/* Paginação e scroll do histórico de propostas */}
            {(() => {
              return (
                <div>
                  {/* Tabela com scroll vertical */}
                  <div className="overflow-y-auto max-h-[500px] border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr className="text-gray-600 uppercase text-[10px] font-bold tracking-wider">
                          <th className="px-6 py-4 border-b">Data</th>
                          <th className="px-6 py-4 border-b">Cliente</th>
                          {isAdminOrCeo && <th className="px-6 py-4 border-b text-center">Margem</th>}
                          {isAdminOrCeo && <th className="px-6 py-4 border-b text-right">Custo do Kit</th>}
                          <th className="px-6 py-4 border-b text-center">Nº Proposta</th>
                          <th className="px-6 py-4 border-b text-center">Expira em</th>
                          <th className="px-6 py-4 border-b text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {history.length === 0 ? (
                          <tr>
                            <td colSpan={isAdminOrCeo ? 7 : 5} className="px-6 py-12 text-center text-gray-400 italic">
                              Nenhuma proposta gerada no histórico ainda.
                            </td>
                          </tr>
                        ) : (
                          history.map((item) => {
                            const expDate = new Date(item.data_expiracao);
                            const today = new Date();
                            const diffTime = expDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const isExpired = diffDays <= 0;

                            return (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                  <span className="text-[10px] ml-2 opacity-50">{new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-800">{item.client_name}</td>
                                {isAdminOrCeo && (
                                  <>
                                    <td className="px-6 py-4 text-center">
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-bold">
                                        {item.margin}%
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-blue-900">
                                      R$ {Number(item.kit_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                  </>
                                )}
                                <td className="px-6 py-4 text-center font-mono text-xs">{item.proposal_number || '—'}</td>
                                <td className="px-6 py-4 text-center">
                                  {isExpired ? (
                                    <span className="text-red-500 font-bold">Expirado</span>
                                  ) : (
                                    <span className="text-amber-600 font-bold">{diffDays} dias</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center flex justify-center gap-2">
                                  {item.url_arquivo && !isExpired ? (
                                    <a
                                      href={item.url_arquivo}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                                      title="Baixar PDF"
                                    >
                                      <FileDown size={16} />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">PDF não disponível</span>
                                  )}
                                  <button
                                    onClick={() => loadForEdit(item.id)}
                                    className="text-amber-500 hover:text-amber-700 p-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors"
                                    title="Editar Proposta"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => deleteHistory(item.id)}
                                    className="text-red-500 hover:text-red-700 p-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                                    title="Excluir registro"
                                  >
                                    <Plus size={16} className="rotate-45" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Controles de paginação — só exibe se houver mais de 1 página */}
                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-3 px-1">
                      <span className="text-xs text-gray-500">
                        Página {historyPage} de {historyTotalPages} — {historyTotal} proposta(s) no total
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchHistory(historyPage - 1)}
                          disabled={historyPage === 1}
                          className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                        >
                          ← Anterior
                        </button>
                        <button
                          onClick={() => fetchHistory(historyPage + 1)}
                          disabled={historyPage === historyTotalPages}
                          className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                        >
                          Próxima →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
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

      {/* Aba: Kits Solares - Apenas ADM/CEO */}
        {activeTab === 'kits' && isAdminOrCeo && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="text-blue-900 w-6 h-6" />
                <h2 className="text-xl font-bold text-gray-800">Kits Solares Cadastrados</h2>
              </div>
              <button onClick={openNewKitModal}
                className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 font-medium">
                <Plus size={16} /> Adicionar Kit
              </button>
            </div>
            {loadingKits ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : solarKits.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Database size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum kit cadastrado ainda.</p>
                <p className="text-sm">Clique em "Adicionar Kit" para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="px-4 py-3 text-left">Potência (kWp)</th>
                      <th className="px-4 py-3 text-left">Ref. Consumo</th>
                      <th className="px-4 py-3 text-left">Módulos</th>
                      <th className="px-4 py-3 text-left">Marca Módulo</th>
                      <th className="px-4 py-3 text-left">Inversores</th>
                      <th className="px-4 py-3 text-left">Marca Inversor</th>
                      <th className="px-4 py-3 text-center">Margem</th>
                      <th className="px-4 py-3 text-right">Custo</th>
                      <th className="px-4 py-3 text-right">Venda</th>
                      <th className="px-4 py-3 text-center">Ampliação</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {solarKits.map(kit => (
                      <tr key={kit.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-blue-900">{kit.potencia_kwp} kWp</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{kit.consumo_referencia_kwh ? `${kit.consumo_referencia_kwh} kWh/mês` : '—'}</td>
                        <td className="px-4 py-3">{kit.quantidade_modulos}×{kit.potencia_modulo_w}W</td>
                        <td className="px-4 py-3">{kit.marca_modulo}</td>
                        <td className="px-4 py-3">{kit.quantidade_inversores}×{kit.potencia_inversor_kw}kW</td>
                        <td className="px-4 py-3">{kit.marca_inversor}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-xs">{kit.margem_venda}%</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">R$ {kit.valor_total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">R$ {(kit.valor_total*(1+kit.margem_venda/100)).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                        <td className="px-4 py-3 text-center">
                          {kit.inversor_ampliacao ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-semibold">Sim</span> : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditKitModal(kit)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Editar"><Edit size={14} /></button>
                            <button onClick={() => deactivateKit(kit.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50" title="Desativar"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal de Cadastro/Edição de Kit Solar */}
      {showKitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-900 rounded-t-2xl p-5 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Database size={20} className="text-amber-400" />
                {editingKit ? 'Editar Kit Solar' : 'Novo Kit Solar'}
              </h3>
              <button onClick={() => setShowKitModal(false)} className="text-white/70 hover:text-white"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Potência do Sistema (kWp) *</label>
                  <input type="number" min="0" step="0.1" value={kitForm.potencia_kwp} onChange={e => setKitForm(p => ({...p, potencia_kwp: parseFloat(e.target.value)||0}))} className={inputStyle} placeholder="Ex: 5.5" /></div>
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-700">Consumo de Referência (kWh/mês)</label>
                  <input type="number" min="0" step="1" value={kitForm.consumo_referencia_kwh ?? ''} onChange={e => setKitForm(p => ({...p, consumo_referencia_kwh: e.target.value !== '' ? parseFloat(e.target.value) : null}))} className={inputStyle} placeholder="Ex: 500 — consumo mensal que este kit atende" />
                  <p className="text-xs text-gray-400 mt-1">Indica a faixa de consumo mensal para a qual este kit é dimensionado</p>
                </div>
                <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Custo Real (R$) *</label>
                  <input type="number" min="0" value={kitForm.valor_total} onChange={e => setKitForm(p => ({...p, valor_total: parseFloat(e.target.value)||0}))} className={inputStyle} placeholder="Ex: 12000" /></div>
                <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Margem de Venda (%) *</label>
                  <input type="number" min="0" max="100" value={kitForm.margem_venda} onChange={e => setKitForm(p => ({...p, margem_venda: parseFloat(e.target.value)||0}))} className={inputStyle} placeholder="Ex: 30" /></div>
                <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Preço de Venda (calculado)</label>
                  <input type="text" readOnly value={`R$ ${(kitForm.valor_total*(1+kitForm.margem_venda/100)).toLocaleString('pt-BR',{minimumFractionDigits:2})}`} className={`${inputStyle} bg-green-50 text-green-800 font-bold cursor-default`} /></div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Módulos Fotovoltaicos</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Quantidade *</label>
                    <input type="number" min="1" value={kitForm.quantidade_modulos} onChange={e => setKitForm(p => ({...p, quantidade_modulos: parseInt(e.target.value)||0}))} className={inputStyle} placeholder="10" /></div>
                  <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Potência (W) *</label>
                    <input type="number" min="0" value={kitForm.potencia_modulo_w} onChange={e => setKitForm(p => ({...p, potencia_modulo_w: parseFloat(e.target.value)||0}))} className={inputStyle} placeholder="550" /></div>
                  <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Marca *</label>
                    <input type="text" value={kitForm.marca_modulo} onChange={e => setKitForm(p => ({...p, marca_modulo: e.target.value}))} className={inputStyle} placeholder="Ex: Risen" /></div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Inversores</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Quantidade *</label>
                    <input type="number" min="1" value={kitForm.quantidade_inversores} onChange={e => setKitForm(p => ({...p, quantidade_inversores: parseInt(e.target.value)||1}))} className={inputStyle} placeholder="1" /></div>
                  <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Potência (kW) *</label>
                    <input type="number" min="0" step="0.1" value={kitForm.potencia_inversor_kw} onChange={e => setKitForm(p => ({...p, potencia_inversor_kw: parseFloat(e.target.value)||0}))} className={inputStyle} placeholder="5" /></div>
                  <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Marca *</label>
                    <input type="text" value={kitForm.marca_inversor} onChange={e => setKitForm(p => ({...p, marca_inversor: e.target.value}))} className={inputStyle} placeholder="Ex: Growatt" /></div>
                </div>
              </div>
              <div className="border-t pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={kitForm.inversor_ampliacao} onChange={e => setKitForm(p => ({...p, inversor_ampliacao: e.target.checked}))} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Incluir inversor para ampliação futura?</span>
                </label>
                {kitForm.inversor_ampliacao && (
                  <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Potência Ampliação (kW)</label>
                      <input type="number" min="0" step="0.1" value={kitForm.potencia_inversor_ampliacao_kw ?? ''} onChange={e => setKitForm(p => ({...p, potencia_inversor_ampliacao_kw: parseFloat(e.target.value)||null}))} className={inputStyle} placeholder="Ex: 3" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium text-gray-700">Marca Ampliação</label>
                      <input type="text" value={kitForm.marca_inversor_ampliacao ?? ''} onChange={e => setKitForm(p => ({...p, marca_inversor_ampliacao: e.target.value}))} className={inputStyle} placeholder="Ex: Growatt" /></div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowKitModal(false)} className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
                <button onClick={saveKit} disabled={savingKit} className={`px-6 py-2 rounded-lg font-bold text-white shadow flex items-center gap-2 transition-all ${savingKit?'bg-gray-400 cursor-not-allowed':'bg-blue-900 hover:bg-blue-800 hover:scale-105'}`}>
                  {savingKit ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</> : <><Check size={16} />{editingKit ? 'Salvar Alterações' : 'Criar Kit'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição de Fornecedor (Supplier) */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-900 rounded-t-2xl p-5 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Package size={20} className="text-amber-400" />
                {editingSupplier ? 'Editar Distribuidor' : 'Novo Distribuidor'}
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-white/70 hover:text-white"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-700">Razão Social *</label>
                  <input type="text" value={supplierForm.razao_social} onChange={e => setSupplierForm(p => ({...p, razao_social: e.target.value}))} className={inputStyle} placeholder="Ex: Aldo Componentes Eletrônicos S/A" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nome Fantasia</label>
                  <input type="text" value={supplierForm.nome_fantasia} onChange={e => setSupplierForm(p => ({...p, nome_fantasia: e.target.value}))} className={inputStyle} placeholder="Ex: Aldo Solar" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">CNPJ</label>
                  <input type="text" value={supplierForm.cnpj} onChange={e => setSupplierForm(p => ({...p, cnpj: e.target.value}))} className={inputStyle} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-700">Endereço</label>
                  <input type="text" value={supplierForm.endereco} onChange={e => setSupplierForm(p => ({...p, endereco: e.target.value}))} className={inputStyle} placeholder="Endereço completo" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Telefone</label>
                  <input type="text" value={supplierForm.telefone} onChange={e => setSupplierForm(p => ({...p, telefone: e.target.value}))} className={inputStyle} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">E-mail</label>
                  <input type="email" value={supplierForm.email} onChange={e => setSupplierForm(p => ({...p, email: e.target.value}))} className={inputStyle} placeholder="contato@empresa.com" />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 mt-4">
                {editingSupplier ? (
                  <button onClick={() => deactivateSupplier(editingSupplier.id)} className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1">
                    <Trash2 size={16} /> Excluir Distribuidor
                  </button>
                ) : <div></div>}
                <div className="flex gap-3">
                  <button onClick={() => setShowSupplierModal(false)} className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
                  <button onClick={saveSupplier} disabled={savingSupplier || !supplierForm.razao_social} className={`px-6 py-2 rounded-lg font-bold text-white shadow flex items-center gap-2 transition-all ${savingSupplier || !supplierForm.razao_social ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800 hover:scale-105'}`}>
                    {savingSupplier ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</> : <><Check size={16} />{editingSupplier ? 'Salvar Alterações' : 'Cadastrar'}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Action */}
      {activeTab !== 'historico' && activeTab !== 'kits' && (

        <div className="flex justify-end pt-4 gap-4">
          {editingProposalId ? (
            <>
              <button
                onClick={() => {
                  if (!isReady) return;
                  setEditingProposalId(null);
                  setTimeout(() => generatePDF(), 100);
                }}
                title={!isReady ? "Preencha os dados obrigatórios" : ""}
                className="flex items-center gap-2 px-6 py-4 font-bold rounded-lg transition-all bg-white border-2 border-amber-400 text-amber-600 hover:bg-amber-50"
              >
                Salvar como Nova
              </button>
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
                Atualizar Proposta
              </button>
            </>
          ) : (
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
          )}
        </div>
      )}

    </div>
  );
}
