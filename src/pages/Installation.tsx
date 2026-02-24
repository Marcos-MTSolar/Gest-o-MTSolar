import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, AlertTriangle, Camera } from 'lucide-react';

export default function Installation() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'photos' | 'pendencies'>('photos');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await axios.get('/api/projects');
    // Filter projects that are in installation stage
    setProjects(res.data.filter((p: any) => 
      ['installation', 'homologation', 'conclusion'].includes(p.current_stage) || 
      (p.current_stage === 'inspection' && p.technical_status === 'approved') // Fallback if stage transition hasn't happened yet
    ));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const requiredPhotos = [
      'photo_modules', 'photo_inverter', 'photo_inverter_label', 'photo_roof_sealing', 
      'photo_grounding', 'photo_ac_voltage', 'photo_dc_voltage', 'photo_generation_plate', 
      'photo_ac_stringbox', 'photo_connection_point'
    ];

    // Check if any photo is missing (neither uploaded nor existing)
    const hasMissingPhoto = requiredPhotos.some(field => {
      const file = formData.get(field) as File;
      const hasNewFile = file && file.size > 0;
      const hasExistingUrl = selectedProject[field];
      return !hasNewFile && !hasExistingUrl;
    });
    
    const pendencies = formData.get('pendencies') as string;
    
    if (hasMissingPhoto && !pendencies?.trim()) {
      alert('Existem fotos obrigatórias não enviadas. Por favor, preencha a aba de "Pendências / Observações" justificando a falta.');
      setActiveTab('pendencies');
      return;
    }

    // Append status
    formData.append('status', 'approved');

    try {
      await axios.put(`/api/projects/${selectedProject.id}/installation`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedProject(null);
      fetchProjects();
      alert('Obra finalizada registrada com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar obra finalizada');
    }
  };

  const PhotoUpload = ({ label, name, currentUrl }: { label: string, name: string, currentUrl?: string }) => (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center text-center bg-gray-50 hover:bg-white transition-colors">
      <p className="text-xs font-bold text-gray-700 mb-2 h-8 flex items-center justify-center">{label}</p>
      <div className="w-full aspect-video bg-gray-200 rounded mb-3 flex items-center justify-center overflow-hidden border border-gray-300 relative group">
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <Camera className="text-gray-400 w-8 h-8" />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
      </div>
      <input type="file" name={name} accept="image/*" className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Obra Finalizada</h1>

      {selectedProject ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Obra: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-gray-700 font-medium">Voltar</button>
          </div>

          <form onSubmit={handleUpdate}>
            {/* Tabs Header */}
            <div className="flex border-b">
              <button 
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'photos' ? 'border-blue-900 text-blue-900 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                1. Fotos da Obra
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('pendencies')}
                className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'pendencies' ? 'border-blue-900 text-blue-900 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                2. Pendências / Obs
              </button>
            </div>

            <div className="p-6">
              {/* Section 1: Photos */}
              <div className={activeTab === 'photos' ? 'block' : 'hidden'}>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
                  <p className="font-bold flex items-center gap-2"><Camera size={16} /> Fotos Obrigatórias</p>
                  <p>Certifique-se de que todas as fotos estejam nítidas e mostrem claramente os detalhes solicitados.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <PhotoUpload label="Módulos" name="photo_modules" currentUrl={selectedProject.photo_modules} />
                  <PhotoUpload label="Inversor" name="photo_inverter" currentUrl={selectedProject.photo_inverter} />
                  <PhotoUpload label="Etiqueta Inversor (Legível)" name="photo_inverter_label" currentUrl={selectedProject.photo_inverter_label} />
                  <PhotoUpload label="Vedação (Antes dos Módulos)" name="photo_roof_sealing" currentUrl={selectedProject.photo_roof_sealing} />
                  <PhotoUpload label="Aterramento" name="photo_grounding" currentUrl={selectedProject.photo_grounding} />
                  <PhotoUpload label="Tensão CA" name="photo_ac_voltage" currentUrl={selectedProject.photo_ac_voltage} />
                  <PhotoUpload label="Tensão CC" name="photo_dc_voltage" currentUrl={selectedProject.photo_dc_voltage} />
                  <PhotoUpload label="Placa Geração (Padrão Entrada)" name="photo_generation_plate" currentUrl={selectedProject.photo_generation_plate} />
                  <PhotoUpload label="String Box CA" name="photo_ac_stringbox" currentUrl={selectedProject.photo_ac_stringbox} />
                  <PhotoUpload label="Ponto Conexão" name="photo_connection_point" currentUrl={selectedProject.photo_connection_point} />
                </div>
              </div>

              {/* Section 2: Pendencies */}
              <div className={activeTab === 'pendencies' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Pendências / Observações</label>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-xs text-red-600 mb-2 font-bold uppercase">Obrigatório caso falte alguma foto</p>
                      <textarea name="pendencies" defaultValue={selectedProject.pendencies} className="w-full border border-red-200 bg-white p-2 rounded focus:ring-2 focus:ring-red-500 outline-none" rows={6} placeholder="Descreva as pendências encontradas ou justifique a falta de fotos..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {activeTab === 'photos' && 'Passo 1 de 2'}
                {activeTab === 'pendencies' && 'Passo 2 de 2'}
              </div>
              <div className="flex gap-3">
                {activeTab === 'pendencies' && (
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('photos')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
                  >
                    Anterior
                  </button>
                )}
                {activeTab === 'photos' ? (
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('pendencies')}
                    className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
                  >
                    Próximo
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-sm flex items-center gap-2"
                  >
                    <CheckCircle size={18} /> Finalizar Obra
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {projects.length === 0 && (
            <p className="text-gray-500">Nenhum projeto pendente de finalização de obra.</p>
          )}
          {projects.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                <p className="text-sm text-gray-500">{p.title}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${p.installation_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {p.installation_status === 'approved' ? 'Obra Concluída' : 'Obra Pendente'}
                  </span>
                </div>
              </div>
              <button 
                onClick={async () => {
                  const res = await axios.get(`/api/projects/${p.id}`);
                  setSelectedProject(res.data);
                }}
                className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
              >
                {p.installation_status === 'approved' ? 'Ver Detalhes' : 'Registrar Obra'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
