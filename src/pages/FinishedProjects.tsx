import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { Archive, CheckCircle, Search, Download, AlertCircle, Loader2, X } from 'lucide-react';
import JSZip from 'jszip';

export default function FinishedProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      if (Array.isArray(res.data)) {
        setProjects(res.data.filter((p: any) => 
          p.current_stage === 'completed' || p.current_stage === 'conclusion'
        ));
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const PHOTO_FIELDS = [
    'photo_modules', 'photo_inverter', 'photo_inverter_label', 'photo_roof_sealing',
    'photo_grounding', 'photo_ac_voltage', 'photo_dc_voltage', 'photo_generation_plate',
    'photo_ac_stringbox', 'photo_connection_point'
  ];

  const getPhotosFromProject = (p: any) => {
    return PHOTO_FIELDS.map(field => p[field]).filter(url => !!url);
  };

  const openFinalizeModal = (p: any) => {
    setSelectedProject(p);
    const photos = getPhotosFromProject(p);
    setProjectPhotos(photos);
    setIsModalOpen(true);
  };

  const downloadPhotos = async (p: any, photos: string[]) => {
    const zip = new JSZip();
    const folder = zip.folder(`obras-${p.client_name.replace(/\s+/g, '_')}`);
    
    if (!folder) return;

    for (let i = 0; i < photos.length; i++) {
      try {
        const response = await fetch(photos[i]);
        const blob = await response.blob();
        const extension = photos[i].split('.').pop()?.split('?')[0] || 'jpg';
        folder.file(`foto-${i + 1}.${extension}`, blob);
      } catch (err) {
        console.error('Erro ao baixar foto para o ZIP:', err);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `obras-${p.client_name.replace(/\s+/g, '_')}.zip`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFinalize = async (withDownload: boolean) => {
    if (!selectedProject) return;
    setIsProcessing(true);

    try {
      if (withDownload && projectPhotos.length > 0) {
        await downloadPhotos(selectedProject, projectPhotos);
      }

      await api.put(`/api/projects/${selectedProject.id}/homologation`, { 
        homologation_status: 'connection_point_approved' 
      });

      alert('Projeto finalizado com sucesso! Os dados sensíveis e fotos foram removidos.');
      setIsModalOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      alert('Erro ao finalizar projeto. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Projetos Finalizados</h1>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Buscar por nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th className="p-4">Cliente</th>
              <th className="p-4">Projeto</th>
              <th className="p-4">Data Conclusão</th>
              <th className="p-4 text-center">Status / Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  {searchTerm ? 'Nenhum projeto encontrado para a busca.' : 'Nenhum projeto finalizado.'}
                </td>
              </tr>
            )}
            {filteredProjects.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium">{p.client_name}</td>
                <td className="p-4">{p.title}</td>
                <td className="p-4 text-sm text-gray-500">{new Date(p.updated_at).toLocaleDateString()}</td>
                <td className="p-4">
                  <div className="flex justify-center items-center gap-2">
                    {p.current_stage === 'completed' ? (
                      <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-bold w-fit">
                        <CheckCircle size={14} /> Concluído
                      </span>
                    ) : (
                      <button
                        onClick={() => openFinalizeModal(p)}
                        className="flex items-center gap-1 text-white bg-blue-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-800 shadow-sm transition-all active:scale-95"
                      >
                        <Archive size={14} /> Finalizar Projeto
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-900">
                  <AlertCircle size={28} />
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h2 className="text-xl font-bold text-gray-800 mb-2">Finalizar Projeto</h2>
              <p className="text-gray-600 text-sm mb-6">
                Este projeto de <strong>{selectedProject.client_name}</strong> será marcado como finalizado. 
                {projectPhotos.length > 0 ? (
                  <>
                    <br /><br />
                    <span className="text-amber-700 font-medium">
                      Atenção: Existem {projectPhotos.length} fotos de obra vinculadas. 
                      Deseja baixá-las em um arquivo ZIP antes que sejam excluídas permanentemente?
                    </span>
                  </>
                ) : (
                  <> Todas as fotos e dados sensíveis serão removidos do sistema.</>
                )}
              </p>

              <div className="space-y-3">
                {projectPhotos.length > 0 && (
                  <button
                    onClick={() => handleFinalize(true)}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    Baixar Fotos e Finalizar
                  </button>
                )}
                
                <button
                  onClick={() => handleFinalize(false)}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-md disabled:opacity-50"
                >
                  {isProcessing && projectPhotos.length === 0 ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {projectPhotos.length > 0 ? 'Finalizar sem Baixar' : 'Confirmar Finalização'}
                </button>

                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isProcessing}
                  className="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 border-t text-[10px] text-gray-400 text-center uppercase tracking-widest">
              Ação irreversível • MT Solar Gestão
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
