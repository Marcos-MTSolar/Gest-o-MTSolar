import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { CheckCircle, AlertTriangle, Camera, Video, X } from 'lucide-react';

export default function Technical() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isReinforcementNeeded, setIsReinforcementNeeded] = useState(false);
  const submitAction = useRef('pending');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await axios.get('/api/projects');
    // Filter projects that are ready for inspection or already in inspection
    // Exclude projects where technical inspection is already approved
    setProjects(res.data.filter((p: any) =>
      p.technical_status !== 'approved' &&
      (['inspection', 'installation', 'homologation', 'conclusion'].includes(p.current_stage) || p.commercial_status === 'approved')
    ));
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
    const isApproving = action === 'approved';

    if (isApproving) {
      // Validation: Check if any required field is empty
      const requiredFields = [
        'entrance_pattern', 'grounding', 'roof_structure', 'roof_overview', 'breaker_box',
        'structure_type', 'module_quantity'
      ];

      // Check if any text field is empty
      let hasEmptyField = requiredFields.some(field => !formData.get(field));

      if (hasEmptyField) {
        alert('Por favor, preencha todos os campos obrigatórios para finalizar a vistoria.');
        return;
      }

      const observations = formData.get('observations') as string;
      if (isReinforcementNeeded && !observations.trim()) {
        alert('Obrigatório preencher as Observações Gerais justificando o Reforço Estrutural.');
        return;
      }
    }

    // Append status and reinforcement boolean mapping correctly
    formData.set('reinforcement_needed', isReinforcementNeeded ? 'true' : 'false');
    formData.set('status', action);

    try {
      await axios.put(`/api/projects/${selectedProject.id}/technical`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Vistoria técnica concluída com sucesso!');
      await fetchProjects();
      setSelectedProject(null);
      setSelectedFiles([]); // Clear files after upload
    } catch (error) {
      alert('Erro ao atualizar vistoria');
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
              {selectedProject.technical_status === 'approved' && (
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
                onClick={() => { submitAction.current = 'approved'; }}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-sm flex items-center gap-2"
              >
                <CheckCircle size={18} /> {selectedProject.technical_status === 'approved' ? 'Atualizar Vistoria' : 'Finalizar Vistoria'}
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
                  <span className={`text-xs px-2 py-1 rounded ${p.technical_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {p.technical_status === 'approved' ? 'Vistoria Concluída' : 'Vistoria Pendente'}
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
                className={`px-4 py-2 rounded text-white ${p.technical_status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-900 hover:bg-blue-800'}`}
              >
                {p.technical_status === 'approved' ? 'Ver Detalhes' : 'Iniciar Vistoria'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
