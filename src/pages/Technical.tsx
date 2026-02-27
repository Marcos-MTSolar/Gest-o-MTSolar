import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { CheckCircle, AlertTriangle, Camera, Video, X } from 'lucide-react';

export default function Technical() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isReinforcementNeeded, setIsReinforcementNeeded] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const submitAction = useRef('pending');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (Array.isArray(res.data)) {
        // Show projects that:
        // 1. Are in inspection or installation stage (have passed commercial approval)
        // 2. Have not yet completed technical inspection
        const TECHNICAL_STAGES = ['inspection', 'installation'];
        setProjects(res.data.filter((p: any) =>
          p.technical_status !== 'approved' && p.technical_status !== 'vistoria_concluida' &&
          (
            TECHNICAL_STAGES.includes(p.current_stage) ||
            p.commercial_status === 'approved' ||
            p.commercial_status === 'proposta_enviada'
          )
        ));
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.target as HTMLFormElement);

    // Append manually selected files
    selectedFiles.forEach(file => {
      formData.append('inspection_media', file);
    });

    const action = submitAction.current || 'pending';
    const isApproving = action === 'approved' || action === 'vistoria_concluida';

    setSaveError('');

    if (isApproving) {
      const requiredFields = [
        'entrance_pattern', 'grounding', 'roof_structure', 'roof_overview', 'breaker_box',
        'structure_type', 'module_quantity'
      ];

      const emptyFields = requiredFields.filter(field => !formData.get(field));

      if (emptyFields.length > 0) {
        setSaveError('Preencha todos os campos obrigatórios para finalizar a vistoria: ' + emptyFields.join(', '));
        return;
      }

      const observations = formData.get('observations') as string;
      if (isReinforcementNeeded && !observations?.trim()) {
        setSaveError('Preencha as Observações Gerais justificando o Reforço Estrutural.');
        return;
      }
    }

    formData.set('reinforcement_needed', isReinforcementNeeded ? 'true' : 'false');
    formData.set('status', action);

    try {
      await axios.put(`/api/projects/${selectedProject.id}/technical`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Close form immediately for responsive UX
      setSelectedProject(null);
      setSelectedFiles([]);
      submitAction.current = 'pending'; // reset for next use

      // Refresh list after a short delay to allow DB to propagate
      setTimeout(() => { fetchProjects(); }, 400);
    } catch (error: any) {
      setSaveError(error?.response?.data?.error || 'Erro ao salvar vistoria. Tente novamente.');
    }
  };

  const handleIniciarVistoria = async (p: any) => {
    try {
      // Fetch full project detail so form fields have all previously saved values
      const res = await axios.get(`/api/projects/${p.id}`);
      const full = res.data;
      // Merge list-level data with full detail
      setSelectedProject({ ...p, ...full });
      setIsReinforcementNeeded(full.reinforcement_needed || false);
      setSaveError('');
    } catch {
      // Fallback: use list-level data
      setSelectedProject(p);
      setSaveError('');
    }
  };


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Vistoria Técnica</h1>

      {selectedProject ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Vistoria: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-gray-700 font-medium">Voltar</button>
          </div>

          {saveError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {saveError}
            </div>
          )}
          <form onSubmit={handleUpdate}>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
                <p className="font-bold">Dados Iniciais</p>
                <p>Preencha as informações técnicas preliminares do local de instalação.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Padrão de Entrada</label>
                  <input name="entrance_pattern" defaultValue={selectedProject.entrance_pattern} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aterramento</label>
                  <input name="grounding" defaultValue={selectedProject.grounding} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estrutura do Telhado</label>
                  <input name="roof_structure" defaultValue={selectedProject.roof_structure} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visão Geral do Telhado</label>
                  <input name="roof_overview" defaultValue={selectedProject.roof_overview} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quadro de Disjuntor</label>
                  <input name="breaker_box" defaultValue={selectedProject.breaker_box} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Estrutura</label>
                  <select name="structure_type" defaultValue={selectedProject.structure_type} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Selecione...</option>
                    <option value="ceramico">Telhado Cerâmico</option>
                    <option value="fibrocimento">Telhado Fibrocimento</option>
                    <option value="metalico">Telhado Metálico</option>
                    <option value="laje">Laje</option>
                    <option value="solo">Solo</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. Módulos</label>
                  <input name="module_quantity" type="number" defaultValue={selectedProject.module_quantity} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex items-center mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <input
                    type="checkbox"
                    name="reinforcement_needed"
                    checked={isReinforcementNeeded}
                    onChange={(e) => setIsReinforcementNeeded(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-800 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    Necessita Reforço Estrutural?
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações Gerais {isReinforcementNeeded && <span className="text-red-500">* (Obrigatório devido ao reforço)</span>}
                  </label>
                  <textarea name="observations" defaultValue={selectedProject.observations} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" rows={4} placeholder="Observações adicionais sobre a vistoria..."></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fotos e Vídeos da Vistoria</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      id="inspection-media-upload"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="inspection-media-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="flex gap-2 text-gray-400 mb-2">
                        <Camera size={32} />
                        <Video size={32} />
                      </div>
                      <span className="text-sm text-gray-600 font-medium">Clique para adicionar fotos e vídeos</span>
                      <span className="text-xs text-gray-400 mt-1">Suporta múltiplos arquivos</span>
                    </label>
                  </div>

                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Arquivos Selecionados ({selectedFiles.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="relative w-20 h-20 rounded overflow-hidden border group">
                            {file.type.startsWith('video/') ? (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white"><Video size={24} /></div>
                            ) : (
                              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProject.inspection_media && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Arquivos Já Enviados:</p>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(selectedProject.inspection_media).map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded overflow-hidden border hover:opacity-80">
                            {url.match(/\.(mp4|webm)$/i) ? (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white"><Video size={24} /></div>
                            ) : (
                              <img src={url} alt="Media" className="w-full h-full object-cover" />
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 items-center">
              {['approved', 'vistoria_concluida'].includes(selectedProject.technical_status) && (
                <div className="flex items-center text-green-600 font-bold gap-2 mr-auto">
                  <CheckCircle size={24} />
                  <span>Vistoria Concluída</span>
                </div>
              )}
              <button
                type="submit"
                onClick={() => { submitAction.current = 'pending'; }}
                className="px-6 py-2 bg-amber-100 text-amber-800 border border-amber-300 rounded hover:bg-amber-200 font-bold shadow-sm flex items-center gap-2"
              >
                Salvar como Pendente
              </button>
              <button
                type="submit"
                onClick={() => { submitAction.current = 'vistoria_concluida'; }}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-sm flex items-center gap-2"
              >
                <CheckCircle size={18} /> {['approved', 'vistoria_concluida'].includes(selectedProject.technical_status) ? 'Atualizar Vistoria' : 'Finalizar Vistoria'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {projects.length === 0 && (
            <p className="text-gray-500">Nenhum projeto pendente de vistoria.</p>
          )}
          {projects.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                <p className="text-sm text-gray-500">{p.title}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${['approved', 'vistoria_concluida'].includes(p.technical_status) ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {['approved', 'vistoria_concluida'].includes(p.technical_status) ? 'Vistoria Concluída' : 'Vistoria Pendente'}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  // Fetch full details before editing
                  const res = await axios.get(`/api/projects/${p.id}`);
                  setSelectedProject(res.data);
                  setIsReinforcementNeeded(res.data.reinforcement_needed === 1 || res.data.reinforcement_needed === true);
                }}
                className={`px-4 py-2 rounded text-white ${['approved', 'vistoria_concluida'].includes(p.technical_status) ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-900 hover:bg-blue-800'}`}
              >
                {['approved', 'vistoria_concluida'].includes(p.technical_status) ? 'Ver Detalhes' : 'Iniciar Vistoria'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
