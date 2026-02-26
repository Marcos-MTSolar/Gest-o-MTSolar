// Documents page
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Trash2, Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [newDoc, setNewDoc] = useState<{ project_id: string, title: string, type?: string }>({ project_id: '', title: '', type: '' });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocumentsAndProjects(); // Call the combined function
  }, []);

  const fetchDocumentsAndProjects = async () => {
    try {
      const res = await axios.get('/api/documents');
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDocuments([]);
    }

    try {
      const res = await axios.get('/api/projects');
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProjects([]);
    }
  };

  // The original fetchDocuments and fetchProjects are now combined into fetchDocumentsAndProjects
  // We will keep the original names for clarity if they are called elsewhere, but update their implementation
  const fetchDocuments = async () => {
    try {
      const res = await axios.get('/api/documents');
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDocuments([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProjects([]);
    }
  };

  const typeLabels: Record<string, string> = {
    'rg_cnh': 'RG ou CNH',
    'art': 'ART',
    'bill_generator': 'Conta Geradora',
    'bill_beneficiary': 'Conta Beneficiária',
    'other': 'Outros'
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !newDoc.project_id) return;

    const formData = new FormData();
    formData.append('project_id', newDoc.project_id);

    // Auto-set title based on type
    const title = typeLabels[newDoc.type || 'other'] || 'Documento';
    formData.append('title', title);

    formData.append('type', newDoc.type || 'other');
    formData.append('file', file);

    try {
      await axios.post('/api/documents', formData);

      alert('Documento enviado com sucesso!');

      setNewDoc(prev => ({ ...prev, title: '', type: '' }));
      setFile(null);
      fetchDocuments();
      fetchProjects();
    } catch (error) {
      alert('Erro ao enviar documento');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza?')) {
      try {
        await axios.delete(`/api/documents/${id}`);
        fetchDocuments();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Erro ao excluir documento');
      }
    }
  };

  const handleConfirmDocs = async () => {
    if (!newDoc.project_id) return;
    try {
      await axios.put(`/api/projects/${newDoc.project_id}/homologation`, {
        homologation_status: 'technical_analysis'
      });
      alert('Documentação confirmada! Homologação ativada.');
      fetchProjects(); // Refresh to update status if needed
    } catch (error) {
      alert('Erro ao ativar homologação.');
    }
  };

  // Check required docs for selected project
  const selectedProjectDocs = newDoc.project_id
    ? documents.filter(d => d.project_id === parseInt(newDoc.project_id))
    : [];

  const requiredTypes = ['rg_cnh', 'art', 'bill_generator'];
  const missingDocs = requiredTypes.filter(type => !selectedProjectDocs.some(d => d.type === type));
  const isComplete = missingDocs.length === 0 && newDoc.project_id !== '';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Documentação</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">Adicionar Documento</h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Projeto</label>
            <select
              className="w-full border p-2 rounded"
              value={newDoc.project_id}
              onChange={e => setNewDoc({ ...newDoc, project_id: e.target.value })}
              required
            >
              <option value="">Selecione...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.client_name} - {p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
            <select
              className="w-full border p-2 rounded"
              value={newDoc.type || ''}
              onChange={e => setNewDoc({ ...newDoc, type: e.target.value })}
              required
            >
              <option value="">Selecione...</option>
              <option value="rg_cnh">RG ou CNH</option>
              <option value="art">ART</option>
              <option value="bill_generator">Conta Geradora</option>
              <option value="bill_beneficiary">Conta Beneficiária</option>
              <option value="other">Outros</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo</label>
            <input
              type="file"
              className="w-full border p-2 rounded"
              onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
              required
            />
          </div>
          <button className="bg-blue-900 text-white p-2 rounded hover:bg-blue-800 flex items-center justify-center gap-2">
            <Upload size={18} /> Enviar
          </button>
        </form>

        {newDoc.project_id && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Status da Documentação (Projeto Selecionado)</h3>
            <div className="flex flex-wrap gap-4 mb-4">
              {requiredTypes.map(type => {
                const isPresent = selectedProjectDocs.some(d => d.type === type);
                return (
                  <div key={type} className={`flex items-center gap-2 text-sm ${isPresent ? 'text-green-700' : 'text-red-700'}`}>
                    {isPresent ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    <span>{typeLabels[type]}</span>
                  </div>
                );
              })}
            </div>

            {isComplete && (
              <button
                onClick={handleConfirmDocs}
                className="px-4 py-2 mt-4 rounded font-bold text-sm flex items-center gap-2 transition-colors bg-green-600 text-white hover:bg-green-700 shadow-sm"
              >
                <CheckCircle size={18} />
                Confirmar Envios e Ativar Homologação
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th className="p-4">Projeto</th>
              <th className="p-4">Título</th>
              <th className="p-4">Enviado Por</th>
              <th className="p-4">Data</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">Nenhum documento encontrado.</td>
              </tr>
            )}
            {documents.map(doc => (
              <tr key={doc.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium">{doc.project_title}</td>
                <td className="p-4">{doc.title}</td>
                <td className="p-4 text-sm text-gray-500">{doc.uploader_name}</td>
                <td className="p-4 text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                <td className="p-4 flex gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Baixar"
                  >
                    <Download size={18} />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
