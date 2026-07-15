import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Search, FileText, CheckCircle, Clock, Camera, Package } from 'lucide-react';
import { sendUpdateNotification } from '../lib/notifications';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

const ORIGENS_VENDA = [
  'Lead (Tráfego Pago)',
  'Prospecção Porta a Porta',
  'Ação Comercial (Rua)',
  'Indicação de Cliente',
  'Parceiro/Franquia',
  'Redes Sociais (Orgânico)',
  'Site/Google',
  'Evento/Feira',
  'Outro'
];

export default function Commercial() {
  const [projectsPendentes, setProjectsPendentes] = useState<any[]>([]);
  const [showNewClient, setShowNewClient] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [newClient, setNewClient] = useState({ 
    name: '', phone: '', email: '', address: '', city: '', state: '', zip_code: '', cpf_cnpj: '', origem_venda: '',
    proposal_value: '', payment_method: 'cash', kit_supplier: '', pendencies: '', notes: '', finance_grace_period: 0,
    inversor_marca: '', inversor_modelo: '', inversor_potencia: '', 
    modulo_potencia: '', modulo_modelo: '', estrutura_tipo: ''
  });
  const [homologacaoDocs, setHomologacaoDocs] = useState<{
    rg_cnh: File | null;
    conta_energia: File | null;
    contas_beneficiarias: File | null;
    contrato_social: File | null;
  }>({ rg_cnh: null, conta_energia: null, contas_beneficiarias: null, contrato_social: null });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [showEditClient, setShowEditClient] = useState(false);
  const [editClientData, setEditClientData] = useState<any>({});
  const [includeInspectionPhotos, setIncludeInspectionPhotos] = useState(false);
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'projectsPendentes' | 'activeProposals' | 'installation'>('projectsPendentes');
  const [activeProposals, setActiveProposals] = useState<any[]>([]);
  const [installationProjects, setInstallationProjects] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'CEO' || user?.role === 'ADMIN') {
      api.get('/api/users/vendedores')
        .then(res => setVendedores(res.data))
        .catch(err => console.error('Erro ao buscar vendedores', err));
    }
  }, [user]);

  useEffect(() => {
    fetchProjectsPendentes();
    fetchActiveProposals();
  }, []);

  const validateForm = (data: any) => {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors.name = 'Nome completo é obrigatório';
    if (!data.cpf_cnpj?.trim()) errors.cpf_cnpj = 'CPF/CNPJ é obrigatório';
    if (!data.phone?.trim()) errors.phone = 'Telefone é obrigatório';
    if (!data.address?.trim()) errors.address = 'Rua e número são obrigatórios';
    if (!data.city?.trim()) errors.city = 'Cidade é obrigatória';
    if (!data.state?.trim()) errors.state = 'UF é obrigatória';
    if (!data.zip_code?.trim()) errors.zip_code = 'CEP é obrigatório';
    
    // Kit Negociado validation
    if (!data.inversor_marca?.trim()) errors.inversor_marca = 'Marca do inversor é obrigatória';
    if (!data.inversor_modelo?.trim()) errors.inversor_modelo = 'Modelo do inversor é obrigatório';
    if (!data.inversor_potencia) errors.inversor_potencia = 'Potência do inversor é obrigatória';
    if (!data.modulo_potencia) errors.modulo_potencia = 'Potência do módulo é obrigatória';
    if (!data.modulo_modelo?.trim()) errors.modulo_modelo = 'Modelo do módulo é obrigatório';
    if (!data.estrutura_tipo?.trim()) errors.estrutura_tipo = 'Tipo de estrutura é obrigatório';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchActiveProposals = async () => {
    try {
      const res = await api.get('/api/proposals-active');
      setActiveProposals(res.data);
    } catch (err) {
      console.error('Erro ao buscar propostas ativas:', err);
    }
  };

  const fillFromProposal = async (proposal: any) => {
    try {
      // Buscar dados completos da proposta no histórico (que contém o raw_data com o kit negociado)
      const res = await api.get(`/api/proposal-history/by-number/${proposal.proposal_number}`);
      const history = res.data;
      
      const raw = history?.raw_data || {};
      
      setNewClient(prev => ({
        ...prev,
        name: proposal.client_name,
        phone: raw.clientPhone || proposal.phone || '',
        email: raw.clientEmail || proposal.email || '',
        address: raw.clientAddress || proposal.address || '',
        proposal_value: raw.valorFinalVenda || proposal.kit_value || '',
        inversor_marca: raw.inverterBrand || '',
        inversor_modelo: raw.inverterModel || '',
        inversor_potencia: raw.inverterPower || '',
        modulo_modelo: raw.moduleModel || '',
        modulo_potencia: raw.modulePower || '',
        estrutura_tipo: raw.tipoEstrutura || ''
      }));
      
      setSelectedProposal(proposal);
      alert('Dados completos da proposta preenchidos no formulário!');
    } catch (err) {
      console.error('Erro ao buscar detalhes da proposta no histórico:', err);
      // Fallback em caso de erro na busca do histórico
      setNewClient(prev => ({
        ...prev,
        name: proposal.client_name,
        phone: proposal.phone,
        email: proposal.email,
        address: proposal.address
      }));
      setSelectedProposal(proposal);
      alert('Dados básicos da proposta preenchidos (detalhes técnicos não encontrados).');
    }
  };

  const fetchProjectsPendentes = async () => {
    try {
      const res = await api.get('/api/projects');
      if (Array.isArray(res.data)) {
        // Show only projects that are still in the commercial stage (pending/not approved) 
        // AND have NOT advanced beyond the commercial stage (current_stage is still 'pending')
        const ADVANCED_STAGES = ['inspection', 'installation', 'homologation', 'conclusion', 'completed'];
        setProjectsPendentes(res.data.filter((p: any) =>
          !ADVANCED_STAGES.includes(p.current_stage) &&
          p.commercial_status !== 'approved' &&
          p.commercial_status !== 'proposta_enviada'
        ));

        // Filter projects for Installation tab
        // Aguardando Instalação, Executando, Finalizada — Excluir projetos já concluídos (soft-delete)
        setInstallationProjects(res.data.filter((p: any) => 
          ['installation', 'homologation'].includes(p.current_stage) &&
          p.current_stage !== 'completed'
        ));
      } else {
        setProjectsPendentes([]);
        setInstallationProjects([]);
      }
    } catch (err) {
      setProjectsPendentes([]);
      setInstallationProjects([]);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(newClient)) {
      alert('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }
    setIsSavingProject(true);
    try {
      const clientPayload = {
        ...newClient,
        ...(selectedProposal ? {
          proposal_inverter_model: selectedProposal.inverter_model,
          proposal_inverter_power: selectedProposal.inverter_power,
          proposal_module_model: selectedProposal.module_model,
          proposal_module_power: selectedProposal.module_power,
          proposal_value: selectedProposal.total_value?.toString() || newClient.proposal_value
        } : {})
      };
      const createdClient = await api.post('/api/clients', clientPayload);
      const clientId = createdClient.data.id;
      const projectId = createdClient.data.project_id;

      // NOVO — upload direto ao R2 via presigned URL (sem limite de tamanho)
      const docEntries = Object.entries(homologacaoDocs).filter(([_, file]) => file !== null);
      if (docEntries.length > 0) {
        const uploadErrors: string[] = [];

        if (!projectId || String(projectId).trim() === '' || String(projectId) === 'null' || String(projectId) === 'undefined') {
          console.error("project_id ausente após criação do cliente — uploads de documentos abortados");
          docEntries.forEach(([docType]) => uploadErrors.push(`${docType} (project_id ausente)`));
        } else {
          for (const [docType, file] of docEntries) {
            try {
              const f = file as File;

              // 1. Solicita URL pré-assinada ao backend (payload < 1KB, sem limite Vercel)
              const { data: presignData } = await api.get('/api/r2/presigned-url', {
                params: {
                  fileName: f.name,
                  contentType: f.type || 'application/octet-stream',
                  clientId: String(clientId),
                  documentType: docType,
                },
              });

              // 2. Faz upload DIRETO ao R2 (sem passar pelo Vercel)
              const uploadRes = await fetch(presignData.presignedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': f.type || 'application/octet-stream' },
                body: f,
              });

              if (!uploadRes.ok) {
                throw new Error(`Upload ao R2 falhou: ${uploadRes.status}`);
              }

              // 3. Registra no banco apenas a URL pública (payload < 1KB)
              await api.post('/api/homologation-documents/register', {
                document_type: docType,
                client_id: String(clientId),
                project_id: String(projectId),
                file_name: f.name,
                file_url: presignData.publicUrl,
                file_path: presignData.filePath,
              });

            } catch (err: any) {
              console.error(`Erro ao enviar documento ${docType}:`, err);
              const reason = err?.message || err?.response?.data?.error || 'erro desconhecido';
              uploadErrors.push(`${docType} (${reason})`);
            }
          }
        }

        if (uploadErrors.length > 0) {
          alert(
            `Cliente cadastrado com sucesso, mas os seguintes documentos não foram enviados: ${uploadErrors.join(', ')}.\n` +
            `Você pode adicioná-los na página de Homologação.`
          );
        }
      }
      
      // Resetar estado de docs após uso
      setHomologacaoDocs({ rg_cnh: null, conta_energia: null, contas_beneficiarias: null, contrato_social: null });

      setShowNewClient(false);
      setNewClient({ 
        name: '', phone: '', email: '', address: '', city: '', state: '', zip_code: '', cpf_cnpj: '',
        proposal_value: '', payment_method: 'cash', kit_supplier: '', pendencies: '', notes: '', finance_grace_period: 0,
        inversor_marca: '', inversor_modelo: '', inversor_potencia: '', 
        modulo_potencia: '', modulo_modelo: '', estrutura_tipo: '', assigned_seller_id: ''
      });
      setFormErrors({});
      setSelectedProposalId('');
      setSelectedProposal(null);
      fetchProjectsPendentes();
      setActiveTab('projectsPendentes');
      alert('Cliente cadastrado com sucesso!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      if (error?.response?.status === 409 && error?.response?.data?.error === 'CLIENTE_DUPLICADO') {
        alert(`⚠️ ${error.response.data.message}\n\nCliente: ${error.response.data.client_name}`);
        return; // não fecha o modal, deixa o vendedor corrigir
      }
      alert('Erro ao cadastrar cliente: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleSaveCommercialChanges = async (action: 'pendente_comercial' | 'proposta_enviada') => {
    if (!selectedProject) return;

    try {
      const commercialData = {
        proposal_value: selectedProject.proposal_value,
        payment_method: selectedProject.payment_method,
        notes: selectedProject.commercial_notes,
        pendencies: selectedProject.commercial_pendencies,
        status: action,
        include_inspection_photos: includeInspectionPhotos,
        inspection_photos: inspectionPhotos,
        kit_supplier: selectedProject.kit_supplier,
        finance_grace_period: selectedProject.finance_grace_period || 0
      };

      await api.put(`/api/commercial-data/${selectedProject.id}`, commercialData);
      await sendUpdateNotification('commercial', selectedProject.client_name);
      
      if (action === 'proposta_enviada') {
        // Dispara animação de comemoração de forma não-bloqueante
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#1e3a5f', '#f5a623', '#4CAF50'] // Cores da marca: Azul escuro, Dourado/Laranja e Verde sucesso
        });
        
        // Pequeno atraso para a animação começar antes do alert bloquear a UI
        setTimeout(() => {
          alert("Proposta Comercial Aprovada! O projeto seguiu para Vistoria.");
        }, 100);
      } else {
        alert("Preferências salvas com sucesso.");
      }
      
      await fetchProjectsPendentes();
      setSelectedProject(null);
    } catch (error) {
      alert('Erro ao atualizar projeto');
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(editClientData)) {
      alert('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }
    try {
      if (!selectedProject) return;
      await api.put(`/api/clients/${selectedProject.client_id}`, editClientData);
      setShowEditClient(false);
      alert('Cadastro de cliente atualizado com sucesso!');
      await fetchProjectsPendentes();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const res = await api.get(`/api/projects/${selectedProject.id}`);
      setSelectedProject(res.data);
    } catch (error) {
      alert('Erro ao atualizar cadastro do cliente');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const confirmDelete = window.confirm(`Tem certeza que deseja remover o projeto e cadastro comercial deste cliente? Esta ação é irreversível.`);
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/projects/${selectedProject.id}`);
      alert('Projeto removido com sucesso.');
      setSelectedProject(null);
      await fetchProjectsPendentes();
    } catch (error) {
      alert('Erro ao remover projeto');
    }
  };

  const translateStage = (stage: string) => {
    const stages: { [key: string]: string } = {
      'registration': 'Cadastro',
      'pending': 'Comercial',
      'inspection': 'Vistoria',
      'installation': 'Instalação',
      'homologation': 'Homologação',
      'conclusion': 'Conclusão',
      'completed': 'Concluído',
      'vistoria_concluida': 'Vistoria Concluída'
    };
    return stages[stage] || stage;
  };

  const translateTechnicalStatus = (status: string) => {
    const statuses: { [key: string]: string } = {
      'pending': 'Pendente',
      'approved': 'Aprovado',
      'rejected': 'Reprovada',
      'in_progress': 'Em Andamento',
      'connection_point_approved': 'Ponto de Conexão Aprovado',
      'vistoria_concluida': 'Aprovada'
    };
    return statuses[status] || 'Aguardando';
  };

  return (
    <div className="min-h-screen overflow-y-auto pb-24">
      {!selectedProject ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Área Comercial</h1>
            <button
              onClick={() => setShowNewClient(true)}
              className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
            >
              <Plus size={20} /> Novo Cliente
            </button>
          </div>

          {showNewClient && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Cadastro de Cliente</h2>
                <form onSubmit={handleCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 mb-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <label className="block text-sm font-bold text-blue-900 mb-2">Vincular a uma Proposta Ativa (opcional)</label>
                    <select
                      className="w-full border p-2 rounded bg-white text-sm"
                      value={selectedProposalId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedProposalId(id);
                        if (id) {
                          const proposta = activeProposals.find(p => String(p.id) === id);
                          if (proposta) fillFromProposal(proposta);
                        }
                      }}
                    >
                      <option value="">— Nenhuma (preencher manualmente) —</option>
                      {activeProposals.map(prop => (
                        <option key={prop.id} value={prop.id}>{prop.client_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">NOME COMPLETO *</label>
                    <input placeholder="Nome Completo" className={`w-full border p-2 rounded ${formErrors.name ? 'border-red-500' : ''}`} value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                    {formErrors.name && <p className="text-red-500 text-[10px] mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">CPF/CNPJ *</label>
                    <input placeholder="CPF/CNPJ" className={`w-full border p-2 rounded ${formErrors.cpf_cnpj ? 'border-red-500' : ''}`} value={newClient.cpf_cnpj} onChange={e => setNewClient({ ...newClient, cpf_cnpj: e.target.value })} />
                    {formErrors.cpf_cnpj && <p className="text-red-500 text-[10px] mt-1">{formErrors.cpf_cnpj}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">TELEFONE *</label>
                    <input placeholder="Telefone" className={`w-full border p-2 rounded ${formErrors.phone ? 'border-red-500' : ''}`} value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                    {formErrors.phone && <p className="text-red-500 text-[10px] mt-1">{formErrors.phone}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">EMAIL (OPCIONAL)</label>
                    <input placeholder="Email" className="w-full border p-2 rounded" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">ENDEREÇO (RUA, Nº, BAIRRO) *</label>
                    <input placeholder="Rua, Número, Bairro" className={`w-full border p-2 rounded ${formErrors.address ? 'border-red-500' : ''}`} value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} />
                    {formErrors.address && <p className="text-red-500 text-[10px] mt-1">{formErrors.address}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Origem da Venda
                    </label>
                    <select
                      value={newClient.origem_venda || ''}
                      onChange={(e) => setNewClient({ ...newClient, origem_venda: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione a origem...</option>
                      {ORIGENS_VENDA.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  
                  {(user?.role === 'CEO' || user?.role === 'ADMIN') && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">VENDEDOR RESPONSÁVEL</label>
                      <select
                        className="w-full border p-2 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500"
                        value={newClient.assigned_seller_id || ''}
                        onChange={(e) => setNewClient({ ...newClient, assigned_seller_id: e.target.value })}
                      >
                        <option value="">Selecione o vendedor (opcional)</option>
                        {vendedores.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">CIDADE *</label>
                    <input placeholder="Cidade" className={`w-full border p-2 rounded ${formErrors.city ? 'border-red-500' : ''}`} value={newClient.city} onChange={e => setNewClient({ ...newClient, city: e.target.value })} />
                    {formErrors.city && <p className="text-red-500 text-[10px] mt-1">{formErrors.city}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">UF *</label>
                      <input placeholder="UF" className={`w-full border p-2 rounded ${formErrors.state ? 'border-red-500' : ''}`} value={newClient.state} onChange={e => setNewClient({ ...newClient, state: e.target.value })} />
                      {formErrors.state && <p className="text-red-500 text-[10px] mt-1">{formErrors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">CEP *</label>
                      <input placeholder="CEP" className={`w-full border p-2 rounded ${formErrors.zip_code ? 'border-red-500' : ''}`} value={newClient.zip_code} onChange={e => setNewClient({ ...newClient, zip_code: e.target.value })} />
                      {formErrors.zip_code && <p className="text-red-500 text-[10px] mt-1">{formErrors.zip_code}</p>}
                    </div>
                  </div>

                  <div className="md:col-span-2 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <h3 className="md:col-span-2 lg:col-span-3 font-bold text-amber-900 flex items-center gap-2 mb-2">
                      <Package size={18} /> Kit Negociado
                    </h3>
                    
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                      <p className="md:col-span-3 text-[10px] font-black text-amber-800 uppercase tracking-widest">Inversor</p>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">MARCA *</label>
                        <input placeholder="Ex: Growatt" className={`w-full border p-2 rounded bg-white ${formErrors.inversor_marca ? 'border-red-500' : ''}`} value={newClient.inversor_marca} onChange={e => setNewClient({ ...newClient, inversor_marca: e.target.value })} />
                        {formErrors.inversor_marca && <p className="text-red-500 text-[10px] mt-1">{formErrors.inversor_marca}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">MODELO *</label>
                        <input placeholder="Modelo" className={`w-full border p-2 rounded bg-white ${formErrors.inversor_modelo ? 'border-red-500' : ''}`} value={newClient.inversor_modelo} onChange={e => setNewClient({ ...newClient, inversor_modelo: e.target.value })} />
                        {formErrors.inversor_modelo && <p className="text-red-500 text-[10px] mt-1">{formErrors.inversor_modelo}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">POTÊNCIA (kW) *</label>
                        <input type="number" step="0.01" placeholder="0.00" className={`w-full border p-2 rounded bg-white ${formErrors.inversor_potencia ? 'border-red-500' : ''}`} value={newClient.inversor_potencia} onChange={e => setNewClient({ ...newClient, inversor_potencia: e.target.value })} />
                        {formErrors.inversor_potencia && <p className="text-red-500 text-[10px] mt-1">{formErrors.inversor_potencia}</p>}
                      </div>
                    </div>

                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                      <p className="md:col-span-2 text-[10px] font-black text-amber-800 uppercase tracking-widest">Módulo Fotovoltaico</p>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">POTÊNCIA (Wp) *</label>
                        <input type="number" placeholder="Ex: 585" className={`w-full border p-2 rounded bg-white ${formErrors.modulo_potencia ? 'border-red-500' : ''}`} value={newClient.modulo_potencia} onChange={e => setNewClient({ ...newClient, modulo_potencia: e.target.value })} />
                        {formErrors.modulo_potencia && <p className="text-red-500 text-[10px] mt-1">{formErrors.modulo_potencia}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">MODELO *</label>
                        <input placeholder="Ex: Jinko Bifacial" className={`w-full border p-2 rounded bg-white ${formErrors.modulo_modelo ? 'border-red-500' : ''}`} value={newClient.modulo_modelo} onChange={e => setNewClient({ ...newClient, modulo_modelo: e.target.value })} />
                        {formErrors.modulo_modelo && <p className="text-red-500 text-[10px] mt-1">{formErrors.modulo_modelo}</p>}
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Estrutura</p>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">TIPO DE ESTRUTURA *</label>
                      <select 
                        className={`w-full border p-2 rounded bg-white ${formErrors.estrutura_tipo ? 'border-red-500' : ''}`} 
                        value={newClient.estrutura_tipo} 
                        onChange={e => setNewClient({ ...newClient, estrutura_tipo: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        <option value="Fibrocimento">Fibrocimento</option>
                        <option value="Cerâmico">Cerâmico</option>
                        <option value="Metálico">Metálico</option>
                        <option value="Solo">Solo</option>
                        <option value="Laje">Laje</option>
                      </select>
                      {formErrors.estrutura_tipo && <p className="text-red-500 text-[10px] mt-1">{formErrors.estrutura_tipo}</p>}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <h3 className="md:col-span-2 font-bold text-gray-800 flex items-center gap-2 mb-2">
                      <FileText size={18} className="text-blue-900" /> Dados Comerciais do Fechamento
                    </h3>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">VALOR DA PROPOSTA (R$)</label>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        className="w-full border p-2 rounded" 
                        value={newClient.proposal_value} 
                        onChange={e => setNewClient({ ...newClient, proposal_value: e.target.value })} 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">FORMA DE PAGAMENTO</label>
                      <select 
                        className="w-full border p-2 rounded bg-white" 
                        value={newClient.payment_method} 
                        onChange={e => setNewClient({ ...newClient, payment_method: e.target.value })}
                      >
                        <option value="cash">À Vista</option>
                        <option value="financing">Financiamento</option>
                        <option value="card">Cartão de Crédito</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">FORNECEDOR DO KIT</label>
                      <input 
                        placeholder="Ex: Aldo, WEG..." 
                        className="w-full border p-2 rounded" 
                        value={newClient.kit_supplier} 
                        onChange={e => setNewClient({ ...newClient, kit_supplier: e.target.value })} 
                      />
                    </div>

                    {newClient.payment_method === 'financing' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">CARÊNCIA (MESES)</label>
                        <input 
                          type="number" 
                          className="w-full border p-2 rounded" 
                          value={newClient.finance_grace_period} 
                          onChange={e => setNewClient({ ...newClient, finance_grace_period: parseInt(e.target.value) || 0 })} 
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1 text-amber-700">PENDÊNCIAS / RESTRIÇÕES PARA FECHAR VENDA</label>
                      <input 
                        placeholder="O que falta para concluir o fechamento?" 
                        className="w-full border p-2 rounded bg-amber-50 border-amber-200" 
                        value={newClient.pendencies} 
                        onChange={e => setNewClient({ ...newClient, pendencies: e.target.value })} 
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">OBSERVAÇÕES ADICIONAIS</label>
                      <textarea 
                        placeholder="Notas internas..." 
                        className="w-full border p-2 rounded h-20" 
                        value={newClient.notes} 
                        onChange={e => setNewClient({ ...newClient, notes: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* Documentos para Homologação */}
                  <div className="md:col-span-2 mt-4 grid grid-cols-1 gap-4 border-t pt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-1">
                      <FileText size={18} className="text-blue-900" /> Documentos para Homologação (opcional)
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">Estes documentos ficarão disponíveis na página de Homologação por 2 meses.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">RG ou CNH</label>
                        <input type="file" accept="image/*,.pdf" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setHomologacaoDocs(prev => ({ ...prev, rg_cnh: e.target.files?.[0] || null }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Conta de energia (local de instalação)</label>
                        <input type="file" accept="image/*,.pdf" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setHomologacaoDocs(prev => ({ ...prev, conta_energia: e.target.files?.[0] || null }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Contas beneficiárias (se houver)</label>
                        <input type="file" accept="image/*,.pdf" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setHomologacaoDocs(prev => ({ ...prev, contas_beneficiarias: e.target.files?.[0] || null }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Contrato Social (somente PJ)</label>
                        <input type="file" accept="image/*,.pdf" className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setHomologacaoDocs(prev => ({ ...prev, contrato_social: e.target.files?.[0] || null }))} />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-2 mt-6">
                    <button type="button" onClick={() => { setShowNewClient(false); setSelectedProposalId(''); setSelectedProposal(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancelar</button>
                    <button type="submit" disabled={isSavingProject} className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 font-bold shadow-md">
                      {isSavingProject ? 'Salvando...' : 'Finalizar Cadastro'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveTab('projectsPendentes')}
              className={`px-6 py-3 font-bold transition-colors ${activeTab === 'projectsPendentes' ? 'border-b-2 border-blue-900 text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Projetos Pendentes
            </button>
            <button
              onClick={() => setActiveTab('installation')}
              className={`px-6 py-3 font-bold transition-colors ${activeTab === 'installation' ? 'border-b-2 border-blue-900 text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Instalação
            </button>
            <button
              onClick={() => setActiveTab('activeProposals')}
              className={`px-6 py-3 font-bold transition-colors ${activeTab === 'activeProposals' ? 'border-b-2 border-blue-900 text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Propostas Ativas (30 dias)
            </button>
          </div>

          {activeTab === 'projectsPendentes' ? (
            <div className="grid grid-cols-1 gap-6">
              {projectsPendentes.length === 0 && (
                <p className="text-gray-500">Nenhum projeto comercial encontrado.</p>
              )}
              {projectsPendentes.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:shadow-md">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                    <p className="text-sm text-gray-500">{p.title}</p>
                    {(user?.role === 'CEO' || user?.role === 'ADMIN') && p.assigned_seller_id && (
                      <p className="text-xs text-blue-700 mt-1 font-medium bg-blue-50 inline-block px-2 py-1 rounded">
                        Vendedor: {vendedores.find(v => v.id === p.assigned_seller_id)?.name || 'ID ' + p.assigned_seller_id}
                      </p>
                    )}
                    {p.commercial_status === 'pending' && p.commercial_pendencies && (
                      <p className="text-xs text-amber-700 mt-1 bg-amber-50 p-1 rounded inline-block border border-amber-200">
                        <strong>Pendência:</strong> {p.commercial_pendencies}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${['approved', 'proposta_enviada'].includes(p.commercial_status) ? 'bg-green-100 text-green-800' :
                        ['pending', 'pendente_comercial'].includes(p.commercial_status) ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {['approved', 'proposta_enviada'].includes(p.commercial_status) ? 'Concluído' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await api.get(`/api/projects/${p.id}`);
                      const data = res.data;
                      setSelectedProject(data);
                      setIncludeInspectionPhotos(!!data.include_inspection_photos);
                      let photos = [];
                      if (data.inspection_photos) {
                        try {
                          photos = typeof data.inspection_photos === 'string'
                            ? JSON.parse(data.inspection_photos)
                            : data.inspection_photos;
                        } catch (e) { photos = []; }
                      }
                      setInspectionPhotos(Array.isArray(photos) ? photos : []);
                    }}
                    className={`px-4 py-2 rounded text-white font-medium ${['approved', 'proposta_enviada'].includes(p.commercial_status) ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-900 hover:bg-blue-800'}`}
                  >
                    Ver Detalhes
                  </button>
                </div>
              ))}
            </div>
          ) : activeTab === 'installation' ? (
            <div className="grid grid-cols-1 gap-6">
              {installationProjects.length === 0 && (
                <p className="text-gray-500">Nenhum projeto em fase de instalação.</p>
              )}
              {installationProjects.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:shadow-md">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                    <p className="text-sm text-gray-500">{p.title}</p>
                    
                    <div className="flex gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.installation_status === 'approved' || p.current_stage === 'completed'
                          ? 'bg-green-100 text-green-700' 
                          : p.installation_status === 'executing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.installation_status === 'approved' || p.current_stage === 'completed'
                          ? 'Obra Concluída' 
                          : p.installation_status === 'executing'
                          ? 'Executando'
                          : 'Aguardando Instalação'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                        {translateStage(p.current_stage)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await api.get(`/api/projects/${p.id}`);
                      const data = res.data;
                      setSelectedProject(data);
                    }}
                    className="px-4 py-2 rounded bg-blue-900 hover:bg-blue-800 text-white font-medium"
                  >
                    Ver Detalhes
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeProposals.length === 0 && (
                <p className="text-gray-500">Nenhuma proposta gerada nos últimos 7 dias.</p>
              )}
              {activeProposals.map(prop => (
                <div key={prop.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-blue-300 transition-all">
                  <div>
                    <h3 className="font-bold text-gray-800">{prop.client_name}</h3>
                    <p className="text-sm text-gray-500">Proposta: <span className="font-mono">{prop.proposal_number}</span></p>
                    <p className="text-xs text-gray-400 mt-1">Gerada em: {new Date(prop.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <button
                    onClick={() => {
                      fillFromProposal(prop);
                      setShowNewClient(true);
                    }}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold transition-all"
                  >
                    <Plus size={16} /> Cadastrar Cliente
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Detalhes: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditClientData({
                    name: selectedProject.client_name || '',
                    cpf_cnpj: selectedProject.cpf_cnpj || '',
                    phone: selectedProject.phone || '',
                    email: selectedProject.email || '',
                    address: selectedProject.address || '',
                    city: selectedProject.city || '',
                    state: selectedProject.state || '',
                    zip_code: selectedProject.zip_code || '',
                    inversor_marca: selectedProject.inversor_marca || '',
                    inversor_modelo: selectedProject.inversor_modelo || '',
                    inversor_potencia: selectedProject.inversor_potencia || '',
                    modulo_potencia: selectedProject.modulo_potencia || '',
                    modulo_modelo: selectedProject.modulo_modelo || '',
                    estrutura_tipo: selectedProject.estrutura_tipo || '',
                    assigned_seller_id: selectedProject.assigned_seller_id || ''
                  });
                  setShowEditClient(true);
                }}
                className="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded border border-transparent hover:bg-blue-50"
              >
                Editar Cliente
              </button>
              <button
                onClick={handleDeleteProject}
                className="text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded border border-transparent hover:bg-red-50"
              >
                Remover Desistência
              </button>
              <button onClick={() => setSelectedProject(null)} className="ml-2 bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 font-medium font-bold">Voltar</button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-xs text-gray-500 uppercase font-bold">Status Geral</p>
                <p className="text-lg font-semibold text-blue-900">{translateStage(selectedProject.current_stage)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-xs text-gray-500 uppercase font-bold">Vistoria Técnica</p>
                <p className="text-lg font-semibold">{translateTechnicalStatus(selectedProject.technical_status)}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border rounded-xl p-6">
                <h3 className="md:col-span-2 font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                  <FileText size={18} className="text-blue-900" /> Informações Comerciais do Fechamento
                </h3>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">VALOR DA PROPOSTA (R$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full border p-2 rounded" 
                    value={selectedProject.proposal_value || ''} 
                    onChange={e => setSelectedProject({ ...selectedProject, proposal_value: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">FORMA DE PAGAMENTO</label>
                  <select 
                    className="w-full border p-2 rounded bg-white" 
                    value={selectedProject.payment_method || 'cash'} 
                    onChange={e => setSelectedProject({ ...selectedProject, payment_method: e.target.value })}
                  >
                    <option value="cash">À Vista</option>
                    <option value="financing">Financiamento</option>
                    <option value="card">Cartão de Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">FORNECEDOR DO KIT</label>
                  <input 
                    placeholder="Ex: Aldo, WEG..." 
                    className="w-full border p-2 rounded" 
                    value={selectedProject.kit_supplier || ''} 
                    onChange={e => setSelectedProject({ ...selectedProject, kit_supplier: e.target.value })} 
                  />
                </div>

                {selectedProject.payment_method === 'financing' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">CARÊNCIA (MESES)</label>
                    <input 
                      type="number" 
                      className="w-full border p-2 rounded" 
                      value={selectedProject.finance_grace_period || 0} 
                      onChange={e => setSelectedProject({ ...selectedProject, finance_grace_period: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-amber-700 mb-1">PENDÊNCIAS / RESTRIÇÕES PARA FECHAR VENDA</label>
                  <input 
                    placeholder="O que falta para concluir o fechamento?" 
                    className="w-full border p-2 rounded bg-amber-50 border-amber-200" 
                    value={selectedProject.commercial_pendencies || ''} 
                    onChange={e => setSelectedProject({ ...selectedProject, commercial_pendencies: e.target.value })} 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">OBSERVAÇÕES COMERCIAIS</label>
                  <textarea 
                    placeholder="Notas internas..." 
                    className="w-full border p-2 rounded h-20" 
                    value={selectedProject.commercial_notes || ''} 
                    onChange={e => setSelectedProject({ ...selectedProject, commercial_notes: e.target.value })} 
                  />
                </div>

                <h3 className="md:col-span-2 font-bold text-amber-900 flex items-center gap-2 border-b pb-2 mt-4 bg-amber-50/50 p-2 rounded">
                  <Package size={18} /> Kit Negociado
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Inversor</p>
                    <p className="text-xs font-bold text-gray-500 uppercase">Marca / Modelo</p>
                    <p className="text-base font-bold text-gray-800">{selectedProject.inversor_marca} / {selectedProject.inversor_modelo}</p>
                    <p className="text-xs font-bold text-gray-500 uppercase mt-2">Potência</p>
                    <p className="text-base font-bold text-gray-800">{selectedProject.inversor_potencia} kW</p>
                  </div>
                  
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Módulo</p>
                    <p className="text-xs font-bold text-gray-500 uppercase">Potência</p>
                    <p className="text-base font-bold text-gray-800">{selectedProject.modulo_potencia} Wp</p>
                    <p className="text-xs font-bold text-gray-500 uppercase mt-2">Modelo</p>
                    <p className="text-base font-bold text-gray-800">{selectedProject.modulo_modelo}</p>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Estrutura</p>
                    <p className="text-xs font-bold text-gray-500 uppercase">Tipo</p>
                    <p className="text-lg font-black text-amber-900">{selectedProject.estrutura_tipo}</p>
                  </div>
                </div>
              </div>

                {/* SEÇÃO FOTOS DE VISTORIA */}
                <div className="md:col-span-2 border-t pt-6 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Camera size={20} className="text-blue-900" />
                      <h3 className="font-bold text-gray-800">Fotos de Vistoria na Proposta</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={includeInspectionPhotos}
                        onChange={(e) => setIncludeInspectionPhotos(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700">Incluir fotos na proposta gerada</span>
                    </label>
                  </div>

                  {includeInspectionPhotos && (
                    <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        {inspectionPhotos.map((url, index) => (
                          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-white shadow-sm">
                            <img src={url} alt={`Vistoria ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setInspectionPhotos(prev => prev.filter((_, i) => i !== index))}
                              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Plus size={14} className="rotate-45" />
                            </button>
                          </div>
                        ))}
                        
                        {inspectionPhotos.length < 5 && (
                          <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                            isUploadingPhoto ? 'bg-gray-100 border-gray-300' : 'bg-white border-blue-300 hover:bg-blue-50 hover:border-blue-400'
                          }`}>
                            {isUploadingPhoto ? (
                              <span className="animate-spin text-blue-900">...</span>
                            ) : (
                              <>
                                <Plus size={24} className="text-blue-500 mb-1" />
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Adicionar Foto</span>
                                <span className="text-[9px] text-gray-400 mt-1">{inspectionPhotos.length} / 5 fotos</span>
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
                                  const filename = `${Date.now()}-${file.name}`;
                                  const { data, error } = await supabase.storage
                                    .from('uploads')
                                    .upload(filename, file);
                                    
                                  if (error) throw error;
                                  
                                  const { data: { publicUrl } } = supabase.storage
                                    .from('uploads')
                                    .getPublicUrl(filename);
                                    
                                  setInspectionPhotos(prev => [...prev, publicUrl]);
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
                      <p className="text-xs text-gray-500 italic">
                        Tipos permitidos: JPG, PNG, WEBP. Máximo de 5 fotos.
                      </p>
                    </div>
                  )}
                </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button 
                  onClick={() => handleSaveCommercialChanges('pendente_comercial')} 
                  className="bg-white text-gray-700 border px-6 py-3 rounded-xl hover:bg-gray-50 font-bold shadow-sm transition-all"
                >
                  Salvar Alterações
                </button>
                {selectedProject.commercial_status !== 'proposta_enviada' && selectedProject.commercial_status !== 'approved' && (
                  <button 
                    onClick={() => handleSaveCommercialChanges('proposta_enviada')} 
                    className="px-8 py-3 rounded-xl font-bold shadow-md flex items-center gap-2 transform transition-all bg-green-600 text-white hover:bg-green-700 active:scale-95"
                  >
                    <CheckCircle size={20} /> 
                    Aprovar Proposta Comercial
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditClient && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Editar Cliente</h2>
            <form onSubmit={handleEditClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">NOME COMPLETO *</label>
                <input placeholder="Nome Completo" className={`w-full border p-2 rounded ${formErrors.name ? 'border-red-500' : ''}`} required value={editClientData.name} onChange={e => setEditClientData({ ...editClientData, name: e.target.value })} />
                {formErrors.name && <p className="text-red-500 text-[10px] mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">CPF/CNPJ *</label>
                <input placeholder="CPF/CNPJ" className={`w-full border p-2 rounded ${formErrors.cpf_cnpj ? 'border-red-500' : ''}`} value={editClientData.cpf_cnpj} onChange={e => setEditClientData({ ...editClientData, cpf_cnpj: e.target.value })} />
                {formErrors.cpf_cnpj && <p className="text-red-500 text-[10px] mt-1">{formErrors.cpf_cnpj}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">TELEFONE *</label>
                <input placeholder="Telefone" className={`w-full border p-2 rounded ${formErrors.phone ? 'border-red-500' : ''}`} value={editClientData.phone} onChange={e => setEditClientData({ ...editClientData, phone: e.target.value })} />
                {formErrors.phone && <p className="text-red-500 text-[10px] mt-1">{formErrors.phone}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">EMAIL (OPCIONAL)</label>
                <input placeholder="Email" className="w-full border p-2 rounded" value={editClientData.email} onChange={e => setEditClientData({ ...editClientData, email: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">ENDEREÇO (RUA, Nº, BAIRRO) *</label>
                <input placeholder="Rua, Número, Bairro" className={`w-full border p-2 rounded ${formErrors.address ? 'border-red-500' : ''}`} value={editClientData.address} onChange={e => setEditClientData({ ...editClientData, address: e.target.value })} />
                {formErrors.address && <p className="text-red-500 text-[10px] mt-1">{formErrors.address}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Origem da Venda
                </label>
                <select
                  value={editClientData.origem_venda || ''}
                  onChange={(e) => setEditClientData({ ...editClientData, origem_venda: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a origem...</option>
                  {ORIGENS_VENDA.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {(user?.role === 'CEO' || user?.role === 'ADMIN') && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">VENDEDOR RESPONSÁVEL</label>
                  <select
                    className="w-full border p-2 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500"
                    value={editClientData.assigned_seller_id || ''}
                    onChange={(e) => setEditClientData({ ...editClientData, assigned_seller_id: e.target.value })}
                  >
                    <option value="">Selecione o vendedor (opcional)</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">CIDADE *</label>
                <input placeholder="Cidade" className={`w-full border p-2 rounded ${formErrors.city ? 'border-red-500' : ''}`} value={editClientData.city} onChange={e => setEditClientData({ ...editClientData, city: e.target.value })} />
                {formErrors.city && <p className="text-red-500 text-[10px] mt-1">{formErrors.city}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">UF *</label>
                  <input placeholder="UF" className={`w-full border p-2 rounded ${formErrors.state ? 'border-red-500' : ''}`} value={editClientData.state} onChange={e => setEditClientData({ ...editClientData, state: e.target.value })} />
                  {formErrors.state && <p className="text-red-500 text-[10px] mt-1">{formErrors.state}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">CEP *</label>
                  <input placeholder="CEP" className={`w-full border p-2 rounded ${formErrors.zip_code ? 'border-red-500' : ''}`} value={editClientData.zip_code} onChange={e => setEditClientData({ ...editClientData, zip_code: e.target.value })} />
                  {formErrors.zip_code && <p className="text-red-500 text-[10px] mt-1">{formErrors.zip_code}</p>}
                </div>
              </div>

              <div className="md:col-span-2 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <h3 className="md:col-span-2 lg:col-span-3 font-bold text-amber-900 flex items-center gap-2 mb-2">
                  <Package size={18} /> Kit Negociado
                </h3>
                
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                  <p className="md:col-span-3 text-[10px] font-black text-amber-800 uppercase tracking-widest">Inversor</p>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">MARCA *</label>
                    <input placeholder="Ex: Growatt" className={`w-full border p-2 rounded bg-white ${formErrors.inversor_marca ? 'border-red-500' : ''}`} value={editClientData.inversor_marca} onChange={e => setEditClientData({ ...editClientData, inversor_marca: e.target.value })} />
                    {formErrors.inversor_marca && <p className="text-red-500 text-[10px] mt-1">{formErrors.inversor_marca}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">MODELO *</label>
                    <input placeholder="Modelo" className={`w-full border p-2 rounded bg-white ${formErrors.inversor_modelo ? 'border-red-500' : ''}`} value={editClientData.inversor_modelo} onChange={e => setEditClientData({ ...editClientData, inversor_modelo: e.target.value })} />
                    {formErrors.inversor_modelo && <p className="text-red-500 text-[10px] mt-1">{formErrors.inversor_modelo}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">POTÊNCIA (kW) *</label>
                    <input type="number" step="0.01" placeholder="0.00" className={`w-full border p-2 rounded bg-white ${formErrors.inversor_potencia ? 'border-red-500' : ''}`} value={editClientData.inversor_potencia} onChange={e => setEditClientData({ ...editClientData, inversor_potencia: e.target.value })} />
                    {formErrors.inversor_potencia && <p className="text-red-500 text-[10px] mt-1">{formErrors.inversor_potencia}</p>}
                  </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <p className="md:col-span-2 text-[10px] font-black text-amber-800 uppercase tracking-widest">Módulo Fotovoltaico</p>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">POTÊNCIA (Wp) *</label>
                    <input type="number" placeholder="Ex: 585" className={`w-full border p-2 rounded bg-white ${formErrors.modulo_potencia ? 'border-red-500' : ''}`} value={editClientData.modulo_potencia} onChange={e => setEditClientData({ ...editClientData, modulo_potencia: e.target.value })} />
                    {formErrors.modulo_potencia && <p className="text-red-500 text-[10px] mt-1">{formErrors.modulo_potencia}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">MODELO *</label>
                    <input placeholder="Ex: Jinko Bifacial" className={`w-full border p-2 rounded bg-white ${formErrors.modulo_modelo ? 'border-red-500' : ''}`} value={editClientData.modulo_modelo} onChange={e => setEditClientData({ ...editClientData, modulo_modelo: e.target.value })} />
                    {formErrors.modulo_modelo && <p className="text-red-500 text-[10px] mt-1">{formErrors.modulo_modelo}</p>}
                  </div>
                </div>

                <div className="md:col-span-3">
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Estrutura</p>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">TIPO DE ESTRUTURA *</label>
                  <select 
                    className={`w-full border p-2 rounded bg-white ${formErrors.estrutura_tipo ? 'border-red-500' : ''}`} 
                    value={editClientData.estrutura_tipo} 
                    onChange={e => setEditClientData({ ...editClientData, estrutura_tipo: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    <option value="Fibrocimento">Fibrocimento</option>
                    <option value="Cerâmico">Cerâmico</option>
                    <option value="Metálico">Metálico</option>
                    <option value="Solo">Solo</option>
                    <option value="Laje">Laje</option>
                  </select>
                  {formErrors.estrutura_tipo && <p className="text-red-500 text-[10px] mt-1">{formErrors.estrutura_tipo}</p>}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowEditClient(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
