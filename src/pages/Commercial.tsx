import React, { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { Plus, Search, FileText, CheckCircle, Clock, Upload, FileCheck, AlertCircle, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DOCS_OBRIGATORIOS, DOCS_OPCIONAIS, uploadIndividualDocs } from '../hooks/useHomologacaoDocs';
import { Capacitor } from '@capacitor/core';
import { capturarDocumento } from '../lib/documentCapture';

export default function Commercial() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', cpf_cnpj: '' });
  const { user } = useAuth();
  const [docFiles, setDocFiles] = useState<{ [docId: string]: File }>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [showEditClient, setShowEditClient] = useState(false);
  const [editClientData, setEditClientData] = useState<any>({});
  const [includeInspectionPhotos, setIncludeInspectionPhotos] = useState(false);
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const submitAction = useRef('pending');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      if (Array.isArray(res.data)) {
        // Show only projects that are still in the commercial stage (pending/not approved) 
        // AND have NOT advanced beyond the commercial stage (current_stage is still 'pending')
        const ADVANCED_STAGES = ['inspection', 'installation', 'homologation', 'conclusion', 'completed'];
        setProjects(res.data.filter((p: any) =>
          !ADVANCED_STAGES.includes(p.current_stage) &&
          p.commercial_status !== 'approved' &&
          p.commercial_status !== 'proposta_enviada'
        ));
      } else {
        setProjects([]);
      }
    } catch (err) {
      setProjects([]);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valida documentos obrigatÃ³rios
    const docsAusentes = DOCS_OBRIGATORIOS.filter(d => !docFiles[d.id]);
    if (docsAusentes.length > 0) {
      alert(`Documentos obrigatÃ³rios ausentes:\n${docsAusentes.map(d => `â€¢ ${d.label}`).join('\n')}`);
      return;
    }

    setUploadingDocs(true);
    try {
      // 1. Cria o cliente
      const res = await api.post('/api/clients', newClient);
      const projectId = res.data?.project_id || res.data?.id;

      // 2. Faz upload dos arquivos individualmente no Supabase
      await uploadIndividualDocs(projectId, user?.id || '', docFiles);

      // 3. Salva no projeto que os docs foram enviados (opcional agora que temos individual)
      await supabase
        .from('projects')
        .update({
          homologacao_docs_uploaded_at: new Date().toISOString()
        })
        .eq('id', projectId);

      setShowNewClient(false);
      setDocFiles({});
      setNewClient({ name: '', phone: '', email: '', address: '', city: '', state: '', cpf_cnpj: '' });
      fetchProjects();
      alert('Cliente cadastrado e documentos enviados com sucesso!');
    } catch (error: any) {
      alert('Erro ao cadastrar cliente: ' + error.message);
    } finally {
      setUploadingDocs(false);
    }
  };

  const updateCommercial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const proposal_value = formData.get('proposal_value') as string;
    const payment_method = formData.get('payment_method') as string;

    const action = submitAction.current || 'pendente_comercial';

    if (!proposal_value || !payment_method) {
      alert("Por favor, preencha o Valor da Proposta e a Forma de Pagamento antes de salvar.");
      return;
    }

    try {
      const commercialData = {
        proposal_value,
        payment_method,
        notes: formData.get('notes'),
        pendencies: formData.get('pendencies'),
        status: action,
        include_inspection_photos: includeInspectionPhotos,
        inspection_photos: inspectionPhotos,
        kit_supplier: formData.get('kit_supplier'),
        finance_grace_period: parseInt(formData.get('finance_grace_period') as string) || 0
      };

      await api.put(`/api/projects/${selectedProject.id}/commercial`, commercialData);
      alert(action === 'proposta_enviada' ? "Proposta Comercial Aprovada!" : "Dados comerciais salvos como pendente.");
      await fetchProjects();
      setSelectedProject(null);
    } catch (error) {
      alert('Erro ao atualizar projeto');
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedProject) return;
      await api.put(`/api/clients/${selectedProject.client_id}`, editClientData);
      setShowEditClient(false);
      alert('Cadastro de cliente atualizado com sucesso!');
      await fetchProjects();
      // Refetch current project to update headers
      const res = await api.get(`/api/projects/${selectedProject.id}`);
      setSelectedProject(res.data);
    } catch (error) {
      alert('Erro ao atualizar cadastro do cliente');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const confirmDelete = window.confirm(`Tem certeza que deseja remover o projeto e cadastro comercial deste cliente? Esta aÃ§Ã£o Ã© irreversÃ­vel.`);
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/projects/${selectedProject.id}`);
      alert('Projeto removido com sucesso.');
      setSelectedProject(null);
      await fetchProjects();
    } catch (error) {
      alert('Erro ao remover projeto');
    }
  };

  const translateStage = (stage: string) => {
    const stages: { [key: string]: string } = {
      'pending': 'Pendente',
      'inspection': 'Vistoria',
      'homologation': 'HomologaÃ§Ã£o',
      'conclusion': 'ConclusÃ£o',
      'completed': 'Finalizado'
    };
    return stages[stage] || stage;
  };

  const translateTechnicalStatus = (status: string) => {
    const statuses: { [key: string]: string } = {
      'pending': 'Pendente',
      'approved': 'Aprovada',
      'rejected': 'Reprovada',
      'in_progress': 'Em Andamento'
    };
    return statuses[status] || 'NÃ£o iniciada';
  };

  return (
    <div className="p-6">
      {!selectedProject ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Ãrea Comercial</h1>
            <button
              onClick={() => setShowNewClient(true)}
              className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
            >
              <Plus size={20} /> Novo Cliente
            </button>
          </div>

          {showNewClient && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-4">Cadastro de Cliente</h2>
                <form onSubmit={handleCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Nome Completo" className="border p-2 rounded" required value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                  <input placeholder="CPF/CNPJ" className="border p-2 rounded" value={newClient.cpf_cnpj} onChange={e => setNewClient({ ...newClient, cpf_cnpj: e.target.value })} />
                  <input placeholder="Telefone" className="border p-2 rounded" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                  <input placeholder="Email" className="border p-2 rounded" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                  <input placeholder="EndereÃ§o" className="border p-2 rounded md:col-span-2" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} />
                  <input placeholder="Cidade" className="border p-2 rounded" value={newClient.city} onChange={e => setNewClient({ ...newClient, city: e.target.value })} />
                  <input placeholder="Estado" className="border p-2 rounded" value={newClient.state} onChange={e => setNewClient({ ...newClient, state: e.target.value })} />

                  {/* SEÃ‡ÃƒO DOCUMENTOS */}
                  <div className="md:col-span-2 mt-4">
                    {/* Grupo 1 - ObrigatÃ³rios */}
                    <div className="flex items-center gap-2 mb-3">
                      <FileCheck size={18} className="text-blue-900" />
                      <h3 className="font-bold text-gray-800 text-sm">
                        Documentos ObrigatÃ³rios <span className="text-red-500">*</span>
                      </h3>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">
                        Estes documentos sÃ£o obrigatÃ³rios para iniciar o processo de homologaÃ§Ã£o.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mb-6">
                      {DOCS_OBRIGATORIOS.map(doc => (
                        <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          docFiles[doc.id] ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2 flex-1">
                            {docFiles[doc.id]
                              ? <FileCheck size={16} className="text-green-600" />
                              : <Upload size={16} className="text-gray-400" />
                            }
                            <div>
                              <p className="text-sm font-medium text-gray-700">{doc.label}</p>
                              {docFiles[doc.id] && (
                                <p className="text-xs text-green-600">{docFiles[doc.id].name}</p>
                              )}
                            </div>
                          </div>
                          <label className="cursor-pointer">
                            {Capacitor.isNativePlatform() && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const file = await capturarDocumento();
                                  if (file) setDocFiles(prev => ({ ...prev, [doc.id]: file }));
                                }}
                                className="mr-2 text-xs px-3 py-1.5 rounded-lg font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1"
                              >
                                <Camera size={14} /> CÃ¢mera
                              </button>
                            )}
                            <span className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              docFiles[doc.id]
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-blue-900 text-white hover:bg-blue-800'
                            }`}>
                              {docFiles[doc.id] ? 'Trocar' : 'Anexar'}
                            </span>
                            <input
                              type="file"
                              accept="*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setDocFiles(prev => ({ ...prev, [doc.id]: file }));
                              }}
                            />
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Grupo 2 - Opcionais */}
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={18} className="text-blue-900" />
                      <h3 className="font-bold text-gray-800 text-sm">
                        Documentos Opcionais
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Envie se disponÃ­vel. Podem ser adicionados posteriormente.
                    </p>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                      {DOCS_OPCIONAIS.map(doc => (
                        <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          docFiles[doc.id] ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2 flex-1">
                            {docFiles[doc.id]
                              ? <FileCheck size={16} className="text-green-600" />
                              : <Upload size={16} className="text-gray-400" />
                            }
                            <div>
                              <p className="text-sm font-medium text-gray-700">{doc.label}</p>
                              {docFiles[doc.id] && (
                                <p className="text-xs text-green-600">{docFiles[doc.id].name}</p>
                              )}
                            </div>
                          </div>
                          <label className="cursor-pointer">
                            {Capacitor.isNativePlatform() && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const file = await capturarDocumento();
                                  if (file) setDocFiles(prev => ({ ...prev, [doc.id]: file }));
                                }}
                                className="mr-2 text-xs px-3 py-1.5 rounded-lg font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1"
                              >
                                <Camera size={14} /> CÃ¢mera
                              </button>
                            )}
                            <span className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              docFiles[doc.id]
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-blue-900 text-white hover:bg-blue-800'
                            }`}>
                              {docFiles[doc.id] ? 'Trocar' : 'Anexar'}
                            </span>
                            <input
                              type="file"
                              accept="*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setDocFiles(prev => ({ ...prev, [doc.id]: file }));
                              }}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowNewClient(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" disabled={uploadingDocs} className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2">
                      {uploadingDocs ? (
                        <><span className="animate-spin">â³</span> Enviando...</>
                      ) : 'Salvar e Enviar Documentos'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {projects.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                  <p className="text-sm text-gray-500">{p.title}</p>

                  {p.commercial_status === 'pending' && p.commercial_pendencies && (
                    <p className="text-xs text-amber-700 mt-1 bg-amber-50 p-1 rounded inline-block border border-amber-200">
                      <strong>PendÃªncia:</strong> {p.commercial_pendencies}
                    </p>
                  )}

                  <div className="flex gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${['approved', 'proposta_enviada'].includes(p.commercial_status) ? 'bg-green-100 text-green-800' :
                      ['pending', 'pendente_comercial'].includes(p.commercial_status) ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {['approved', 'proposta_enviada'].includes(p.commercial_status) ? 'Finalizado' : 'Pendente'}
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
                      } catch (e) {
                        photos = [];
                      }
                    }
                    setInspectionPhotos(Array.isArray(photos) ? photos : []);
                  }}
                  className={`px-4 py-2 rounded text-white ${['approved', 'proposta_enviada'].includes(p.commercial_status) ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-900 hover:bg-blue-800'}`}
                >
                  {['approved', 'proposta_enviada'].includes(p.commercial_status) ? 'Ver Detalhes' : 'Gerenciar'}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Comercial: {selectedProject.client_name}</h2>
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
                    state: selectedProject.state || ''
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
                Remover DesistÃªncia
              </button>
              <button onClick={() => setSelectedProject(null)} className="ml-2 bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 font-medium">Voltar</button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-xs text-gray-500 uppercase font-bold">Status Geral</p>
                <p className="text-lg font-semibold text-blue-900">{translateStage(selectedProject.current_stage)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-xs text-gray-500 uppercase font-bold">Vistoria TÃ©cnica</p>
                <p className="text-lg font-semibold">{translateTechnicalStatus(selectedProject.technical_status)}</p>
              </div>
            </div>

            <form onSubmit={updateCommercial} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Proposta (R$)</label>
                  <input name="proposal_value" defaultValue={selectedProject.proposal_value} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select name="payment_method" defaultValue={selectedProject.payment_method} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="cash">Ã€ Vista</option>
                    <option value="financing">Financiamento</option>
                    <option value="card">CartÃ£o de CrÃ©dito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor do Kit</label>
                  <input 
                    name="kit_supplier" 
                    defaultValue={selectedProject.kit_supplier} 
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Ex: Aldo Solar, WEG, etc."
                  />
                </div>

                {selectedProject.payment_method === 'financing' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CarÃªncia do Financiamento (meses)</label>
                    <input 
                      name="finance_grace_period" 
                      type="number"
                      min="0"
                      max="24"
                      defaultValue={selectedProject.finance_grace_period || 0} 
                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">PendÃªncias (RestriÃ§Ãµes para fechar a venda)</label>
                  <input name="pendencies" defaultValue={selectedProject.commercial_pendencies} placeholder="Ex: Cliente aguardando aprovaÃ§Ã£o de crÃ©dito num banco" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none border-amber-200 bg-amber-50" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ObservaÃ§Ãµes Comerciais</label>
                  <textarea name="notes" defaultValue={selectedProject.commercial_notes} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={4}></textarea>
                </div>

                {/* SEÃ‡ÃƒO FOTOS DE VISTORIA */}
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
                              <span className="animate-spin text-blue-900">â³</span>
                            ) : (
                              <>
                                <Plus size={24} className="text-blue-500 mb-1" />
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Adicionar Foto</span>
                                <span className="text-[9px] text-gray-400 mt-1">{inspectionPhotos.length}/5 fotos</span>
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
                        Tipos permitidos: JPG, PNG, WEBP. MÃ¡ximo de 5 fotos.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="submit" onClick={() => { submitAction.current = 'pendente_comercial'; }} className="bg-amber-100 text-amber-800 border border-amber-300 px-6 py-3 rounded-lg hover:bg-amber-200 font-bold shadow-sm flex items-center gap-2">
                  Salvar como Pendente
                </button>
                <button type="submit" onClick={() => { submitAction.current = 'proposta_enviada'; }} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2">
                  <CheckCircle size={20} /> Salvar e Aprovar Proposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditClient && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Editar Cliente</h2>
            <form onSubmit={handleEditClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Nome Completo" className="border p-2 rounded" required value={editClientData.name} onChange={e => setEditClientData({ ...editClientData, name: e.target.value })} />
              <input placeholder="CPF/CNPJ" className="border p-2 rounded" value={editClientData.cpf_cnpj} onChange={e => setEditClientData({ ...editClientData, cpf_cnpj: e.target.value })} />
              <input placeholder="Telefone" className="border p-2 rounded" value={editClientData.phone} onChange={e => setEditClientData({ ...editClientData, phone: e.target.value })} />
              <input placeholder="Email" className="border p-2 rounded" value={editClientData.email} onChange={e => setEditClientData({ ...editClientData, email: e.target.value })} />
              <input placeholder="EndereÃ§o" className="border p-2 rounded md:col-span-2" value={editClientData.address} onChange={e => setEditClientData({ ...editClientData, address: e.target.value })} />
              <input placeholder="Cidade" className="border p-2 rounded" value={editClientData.city} onChange={e => setEditClientData({ ...editClientData, city: e.target.value })} />
              <input placeholder="Estado" className="border p-2 rounded" value={editClientData.state} onChange={e => setEditClientData({ ...editClientData, state: e.target.value })} />

              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowEditClient(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">Salvar AlteraÃ§Ãµes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
