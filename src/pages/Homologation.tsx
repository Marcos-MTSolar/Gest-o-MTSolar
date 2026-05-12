import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  FileCheck, 
  FileText, 
  Upload, 
  Eye, 
  Download, 
  Save, 
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Clipboard,
  User,
  MapPin
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Project {
  id: number;
  client_name: string;
  address: string;
  city: string;
  state: string;
  status: string;
  current_stage: string;
  homologation_status: string;
  homologation_protocol?: string;
  homologation_entry_date?: string;
  homologation_expected_date?: string;
  homologation_notes?: string;
  cpf_cnpj?: string;
}

interface Document {
  id: number;
  title: string;
  url: string;
  type: string;
  created_at: string;
}

const statusMap: Record<string, { label: string, color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800' },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Reprovado', color: 'bg-red-100 text-red-800' },
};

const docTypes = [
  { id: 'rg_cnh', label: 'RG/CNH' },
  { id: 'residence_proof', label: 'Comprovante de Residência' },
  { id: 'energy_bill', label: 'Conta de Energia' },
  { id: 'power_of_attorney', label: 'Procuração' },
];

export default function Homologation() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formStatus, setFormStatus] = useState('');
  const [formProtocol, setFormProtocol] = useState('');
  const [formEntryDate, setFormEntryDate] = useState('');
  const [formExpectedDate, setFormExpectedDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/projects');
      // Filtrar apenas projetos que estão em fase de homologação ou já passaram por ela
      const homologationProjects = res.data.filter((p: Project) => 
        p.current_stage === 'homologation' || p.current_stage === 'completed' || p.homologation_status !== 'pending'
      );
      setProjects(homologationProjects);
    } catch (error) {
      toast.error('Erro ao buscar projetos');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (projectId: number) => {
    try {
      setLoadingDocs(true);
      const res = await api.get(`/api/projects/${projectId}/homologation/documents`);
      setDocuments(res.data);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setFormStatus(project.homologation_status || 'pending');
    setFormProtocol(project.homologation_protocol || '');
    setFormEntryDate(project.homologation_entry_date || '');
    setFormExpectedDate(project.homologation_expected_date || '');
    setFormNotes(project.homologation_notes || '');
    fetchDocuments(project.id);
  };

  const handleSave = async () => {
    if (!selectedProject) return;

    try {
      setSaving(true);
      await api.put(`/api/projects/${selectedProject.id}/homologation`, {
        homologation_status: formStatus,
        homologation_protocol: formProtocol,
        homologation_entry_date: formEntryDate,
        homologation_expected_date: formExpectedDate,
        homologation_notes: formNotes
      });
      
      toast.success('Alterações salvas com sucesso');
      fetchProjects();
      setSelectedProject(prev => prev ? { 
        ...prev, 
        homologation_status: formStatus,
        homologation_protocol: formProtocol,
        homologation_entry_date: formEntryDate,
        homologation_expected_date: formExpectedDate,
        homologation_notes: formNotes
      } : null);
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', docTypes.find(t => t.id === docType)?.label || file.name);

      await api.post(`/api/projects/${selectedProject.id}/homologation/documents`, formData);
      toast.success('Documento enviado com sucesso');
      fetchDocuments(selectedProject.id);
    } catch (error) {
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.homologation_protocol?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.homologation_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="text-blue-600" />
            Homologação
          </h1>
          <p className="text-gray-500">Gerenciamento de protocolos e documentos junto à concessionária</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente ou protocolo..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-5 h-5" />
          <select
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Andamento</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Reprovado</option>
          </select>
        </div>
      </div>

      {/* Lista de Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div 
            key={project.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleSelectProject(project)}
          >
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMap[project.homologation_status || 'pending'].color}`}>
                  {statusMap[project.homologation_status || 'pending'].label}
                </span>
                <span className="text-xs text-gray-400">ID: #{project.id}</span>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{project.client_name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={14} />
                  {project.city}, {project.state}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">Protocolo</p>
                  <p className="text-sm font-medium text-gray-700">{project.homologation_protocol || '---'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">Entrada</p>
                  <p className="text-sm font-medium text-gray-700">
                    {project.homologation_entry_date ? format(new Date(project.homologation_entry_date), 'dd/MM/yyyy') : '---'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
              <span className="text-blue-600 text-sm font-medium flex items-center gap-1">
                Ver detalhes <Eye size={16} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhum projeto encontrado nesta fase.</p>
        </div>
      )}

      {/* Modal de Detalhes */}
      {selectedProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header do Modal */}
            <div className="px-6 py-4 bg-blue-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selectedProject.client_name}</h2>
                <p className="text-blue-200 text-sm">Gerenciamento de Homologação</p>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="p-2 hover:bg-blue-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              
              {/* Informações do Cliente */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">Cliente</p>
                    <p className="font-medium">{selectedProject.client_name}</p>
                    <p className="text-sm text-gray-500">{selectedProject.cpf_cnpj || 'CPF/CNPJ não informado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">Endereço</p>
                    <p className="font-medium line-clamp-1">{selectedProject.address}</p>
                    <p className="text-sm text-gray-500">{selectedProject.city} - {selectedProject.state}</p>
                  </div>
                </div>
              </section>

              {/* Status e Datas */}
              <section className="space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="text-blue-600 w-5 h-5" />
                  Status e Cronograma
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Status da Homologação</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                    >
                      <option value="pending">Pendente</option>
                      <option value="in_progress">Em Andamento</option>
                      <option value="approved">Aprovado</option>
                      <option value="rejected">Reprovado</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Número do Protocolo</label>
                    <div className="relative">
                      <Clipboard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text"
                        className="w-full border border-gray-300 rounded-lg pl-10 p-2.5 focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 2024/123456"
                        value={formProtocol}
                        onChange={(e) => setFormProtocol(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Data de Entrada</label>
                    <input 
                      type="date"
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                      value={formEntryDate}
                      onChange={(e) => setFormEntryDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Previsão de Aprovação</label>
                    <input 
                      type="date"
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                      value={formExpectedDate}
                      onChange={(e) => setFormExpectedDate(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Observações</label>
                    <textarea 
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 h-[108px]"
                      placeholder="Adicione anotações sobre o processo..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Documentos */}
              <section className="space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="text-blue-600 w-5 h-5" />
                  Documentação do Cliente
                </h3>
                
                {/* Uploads Rápidos */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {docTypes.map((type) => (
                    <label 
                      key={type.id}
                      className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                    >
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, type.id)}
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      ) : (
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                      )}
                      <span className="text-[10px] font-bold text-gray-500 text-center mt-2 uppercase">{type.label}</span>
                    </label>
                  ))}
                </div>

                {/* Lista de Documentos Enviados */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-4">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Documento</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingDocs ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : documents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                            Nenhum documento anexado.
                          </td>
                        </tr>
                      ) : (
                        documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{doc.title}</td>
                            <td className="px-4 py-3 text-gray-500 uppercase text-[10px] font-bold">{doc.type}</td>
                            <td className="px-4 py-3 text-gray-500">{format(new Date(doc.created_at), 'dd/MM/yy HH:mm')}</td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Visualizar"
                              >
                                <Eye size={18} />
                              </a>
                              <a 
                                href={doc.url} 
                                download
                                className="inline-flex p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Baixar"
                              >
                                <Download size={18} />
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedProject(null)}
                className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
