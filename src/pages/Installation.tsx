import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, AlertTriangle, Camera, X } from 'lucide-react';

const PHOTO_FIELDS = [
  { name: 'photo_modules', label: 'Módulos' },
  { name: 'photo_inverter', label: 'Inversor' },
  { name: 'photo_inverter_label', label: 'Etiqueta Inversor (Legível)' },
  { name: 'photo_roof_sealing', label: 'Vedação (Antes dos Módulos)' },
  { name: 'photo_grounding', label: 'Aterramento' },
  { name: 'photo_ac_voltage', label: 'Tensão CA' },
  { name: 'photo_dc_voltage', label: 'Tensão CC' },
  { name: 'photo_generation_plate', label: 'Placa Geração (Padrão Entrada)' },
  { name: 'photo_ac_stringbox', label: 'String Box CA' },
  { name: 'photo_connection_point', label: 'Ponto Conexão' },
];

type PhotoFieldName =
  | 'photo_modules'
  | 'photo_inverter'
  | 'photo_inverter_label'
  | 'photo_roof_sealing'
  | 'photo_grounding'
  | 'photo_ac_voltage'
  | 'photo_dc_voltage'
  | 'photo_generation_plate'
  | 'photo_ac_stringbox'
  | 'photo_connection_point';

export default function Installation() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'photos' | 'pendencies'>('photos');
  const [pendencies, setPendencies] = useState('');
  const [error, setError] = useState('');

  // Track selected files per photo field in state
  const [photoFiles, setPhotoFiles] = useState<Record<PhotoFieldName, File | null>>(
    {} as Record<PhotoFieldName, File | null>
  );
  // Track object URLs for preview
  const [photoPreviews, setPhotoPreviews] = useState<Record<PhotoFieldName, string | null>>(
    {} as Record<PhotoFieldName, string | null>
  );

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (Array.isArray(res.data)) {
        setProjects(res.data.filter((p: any) =>
          ['installation', 'homologation', 'conclusion', 'completed'].includes(p.current_stage)
        ));
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    }
  };

  const openProject = async (p: any) => {
    const res = await axios.get(`/api/projects/${p.id}`);
    setSelectedProject(res.data);
    setActiveTab('photos');
    setPendencies(res.data.pendencies || '');
    setError('');
    // Reset file selections
    setPhotoFiles({} as Record<PhotoFieldName, File | null>);
    setPhotoPreviews({} as Record<PhotoFieldName, string | null>);
  };

  const handleFileChange = (fieldName: PhotoFieldName, file: File | null) => {
    setPhotoFiles(prev => ({ ...prev, [fieldName]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreviews(prev => ({ ...prev, [fieldName]: url }));
    } else {
      setPhotoPreviews(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setError('');

    // Check which required photos are missing (no new file selected and no existing URL)
    const missingPhotos = PHOTO_FIELDS.filter(({ name }) => {
      const hasNewFile = !!photoFiles[name];
      const hasExistingUrl = !!selectedProject[name];
      return !hasNewFile && !hasExistingUrl;
    });

    if (missingPhotos.length > 0 && !pendencies.trim()) {
      setError(
        `Faltam ${missingPhotos.length} foto(s) obrigatória(s). Vá para "Pendências / Obs" e justifique a falta.`
      );
      setActiveTab('pendencies');
      return;
    }

    // Build FormData manually with state-tracked files
    const formData = new FormData();
    formData.append('status', 'approved');
    formData.append('pendencies', pendencies);

    for (const { name } of PHOTO_FIELDS) {
      const file = photoFiles[name];
      if (file) {
        formData.append(name, file);
      }
    }

    try {
      await axios.put(`/api/projects/${selectedProject.id}/installation`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedProject(null);
      setPhotoFiles({} as Record<PhotoFieldName, File | null>);
      setPhotoPreviews({} as Record<PhotoFieldName, string | null>);
      fetchProjects();
      alert('Obra finalizada registrada com sucesso!');
    } catch {
      setError('Erro ao atualizar obra finalizada. Tente novamente.');
    }
  };

  const PhotoUpload = ({ name, label }: { name: PhotoFieldName; label: string }) => {
    const existingUrl = selectedProject?.[name];
    const previewUrl = photoPreviews[name];
    const displayUrl = previewUrl || existingUrl;
    const hasFile = !!photoFiles[name];

    return (
      <div className={`border rounded-lg p-3 flex flex-col items-center text-center transition-colors ${hasFile ? 'border-green-400 bg-green-50' : existingUrl ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}>
        <p className="text-xs font-bold text-gray-700 mb-2 h-8 flex items-center justify-center">{label}</p>
        <div className="w-full aspect-video bg-gray-200 rounded mb-2 flex items-center justify-center overflow-hidden border border-gray-300 relative group">
          {displayUrl ? (
            <>
              <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
              {hasFile && (
                <div className="absolute top-1 right-1">
                  <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">Nova</span>
                </div>
              )}
            </>
          ) : (
            <Camera className="text-gray-400 w-8 h-8" />
          )}
        </div>

        {existingUrl && !hasFile && (
          <span className="text-xs text-blue-600 font-semibold mb-1 flex items-center gap-1">
            <CheckCircle size={12} /> Foto já enviada
          </span>
        )}

        <label className="cursor-pointer w-full">
          <span className="block w-full text-center text-xs py-1.5 px-2 rounded border border-dashed border-gray-400 text-gray-600 hover:bg-gray-100 transition-colors">
            {displayUrl ? 'Substituir foto' : 'Selecionar foto'}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFileChange(name, e.target.files?.[0] ?? null)}
          />
        </label>

        {hasFile && (
          <button
            type="button"
            onClick={() => handleFileChange(name, null)}
            className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X size={10} /> Remover
          </button>
        )}
      </div>
    );
  };

  // Count photos status
  const totalPhotos = PHOTO_FIELDS.length;
  const donePhotos = PHOTO_FIELDS.filter(({ name }) => photoFiles[name] || selectedProject?.[name]).length;

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

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleUpdate}>
            {/* Tabs Header */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'photos' ? 'border-blue-900 text-blue-900 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <span>1. Fotos da Obra</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${donePhotos === totalPhotos ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {donePhotos}/{totalPhotos}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pendencies')}
                className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'pendencies' ? 'border-blue-900 text-blue-900 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <span>2. Pendências / Obs</span>
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
                  {PHOTO_FIELDS.map(({ name, label }) => (
                    <div key={name}>
                      <PhotoUpload name={name as PhotoFieldName} label={label} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Pendencies */}
              <div className={activeTab === 'pendencies' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Pendências / Observações</label>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-xs text-red-600 mb-2 font-bold uppercase">Obrigatório caso falte alguma foto</p>
                      <textarea
                        value={pendencies}
                        onChange={e => setPendencies(e.target.value)}
                        className="w-full border border-red-200 bg-white p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                        rows={6}
                        placeholder="Descreva as pendências encontradas ou justifique a falta de fotos..."
                      />
                    </div>
                  </div>

                  {/* Summary of photo status */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Camera size={16} /> Resumo das Fotos ({donePhotos}/{totalPhotos} enviadas)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {PHOTO_FIELDS.map(({ name, label }) => {
                        const done = !!(photoFiles[name] || selectedProject?.[name]);
                        return (
                          <div key={name} className={`flex items-center gap-2 text-xs p-2 rounded ${done ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            {done ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                            <span className="truncate">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {activeTab === 'photos' && <span>Passo 1 de 2</span>}
                {activeTab === 'pendencies' && <span>Passo 2 de 2</span>}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className={`px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 ${activeTab === 'pendencies' ? 'block' : 'hidden'}`}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={() => { setError(''); setActiveTab('pendencies'); }}
                  className={`px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 ${activeTab === 'photos' ? 'block' : 'hidden'}`}
                >
                  Próximo
                </button>

                <button
                  type="submit"
                  className={`px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-sm flex items-center gap-2 ${activeTab === 'pendencies' ? 'flex' : 'hidden'}`}
                >
                  <CheckCircle size={18} /> Finalizar Obra
                </button>
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
                onClick={() => openProject(p)}
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
