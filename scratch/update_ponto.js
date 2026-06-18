const fs = require('fs');
const path = 'C:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/Ponto.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add states
const statesBlock = "const [deletingRecords, setDeletingRecords] = useState(false);";
const newStates = const [deletingRecords, setDeletingRecords] = useState(false);
  const [fotoUserId, setFotoUserId] = useState('');
  const [fotoData, setFotoData] = useState('');
  const [fotoRecords, setFotoRecords] = useState<any[]>([]);
  const [fotoLoading, setFotoLoading] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);;
content = content.replace(statesBlock, newStates);

// 2. Add fetch function
const fetchHistoryStart = "async function fetchHistory() {";
const newFetch = const fetchFotosVerificacao = async () => {
    if (!fotoUserId || !fotoData) return;
    setFotoLoading(true);
    try {
      const res = await api.get(\/api/ponto/fotos-verificacao?userId=\&data=\\);
      setFotoRecords(res.data ?? []);
    } catch {
      setFotoRecords([]);
    } finally {
      setFotoLoading(false);
    }
  };

  async function fetchHistory() {;
content = content.replace(fetchHistoryStart, newFetch);

// 3. Add tab
const tabsRegex = /\[\{ key: 'gestor', label: 'Relat[^\']+rios' \}, \{ key: 'ajustes', label: 'Ajustes Pendentes' \}\]/s;
const newTabs = [{ key: 'gestor', label: 'Relat\\u00f3rios' }, { key: 'ajustes', label: 'Ajustes Pendentes' }, { key: 'fotos', label: 'Verificar Fotos' }];
content = content.replace(tabsRegex, newTabs);

// Update activeTab type to include 'fotos'
const typeRegex = /const \[activeTab, setActiveTab\] = useState<'ponto' \| 'historico' \| 'gestor' \| 'ajustes'>/g;
const newType = const [activeTab, setActiveTab] = useState<'ponto' | 'historico' | 'gestor' | 'ajustes' | 'fotos'>;
content = content.replace(typeRegex, newType);

// 4. Add new panel before showDeleteModal
const modalStart = "{showDeleteModal && (";
const newPanel = 
        {/* TAB: VERIFICAR FOTOS (GESTOR) */}
        {activeTab === 'fotos' && isManager && (
          <div className="space-y-6">
            {/* Filtros */}
            <div className="bg-white rounded-xl shadow p-4">
              <p className="font-semibold text-gray-700 mb-4">Verificar Registros de Ponto com Foto</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={fotoUserId}
                  onChange={e => setFotoUserId(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecione o colaborador</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={fotoData}
                  onChange={e => setFotoData(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={fetchFotosVerificacao}
                  disabled={!fotoUserId || !fotoData || fotoLoading}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                >
                  {fotoLoading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {/* Linha do tempo */}
            {fotoRecords.length === 0 && !fotoLoading && (
              <p className="text-center text-gray-400 italic text-sm py-8">
                Nenhum registro encontrado para o filtro selecionado.
              </p>
            )}

            {fotoRecords.length > 0 && (
              <div className="bg-white rounded-xl shadow p-4 space-y-4">
                {fotoRecords.map((rec) => {
                  const tipoLabel: Record<string, string> = {
                    entry: '🟢 Entrada',
                    lunch_start: '🟡 Início Almoço',
                    lunch_end: '🔵 Fim Almoço',
                    exit: '🔴 Saída',
                  };
                  const horario = new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const temLocalizacao = rec.latitude && rec.longitude;
                  const mapsUrl = \https://www.google.com/maps?q=\,\\;

                  return (
                    <div key={rec.id} className="flex gap-4 items-start border-b border-gray-100 pb-4 last:border-0">
                      {/* Linha do tempo — indicador */}
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                        <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-800 text-sm">
                            {tipoLabel[rec.type] || rec.type}
                          </span>
                          <span className="text-gray-500 text-sm">{horario}</span>
                          <span className={\	ext-xs px-2 py-0.5 rounded-full \\}>
                            {rec.status === 'approved' ? 'Aprovado' : rec.status === 'adjustment_requested' ? 'Ajuste solicitado' : 'Pendente'}
                          </span>
                          {temLocalizacao ? (
                            <a href={mapsUrl} target="_blank" rel="noreferrer" title="Ver no mapa" className="text-green-600 hover:text-green-800">
                              📍
                            </a>
                          ) : (
                            <span className="text-gray-300" title="Sem localização">📍</span>
                          )}
                        </div>

                        {/* Foto */}
                        {rec.selfie_url ? (
                          <img
                            src={rec.selfie_url}
                            alt="Selfie do ponto"
                            className="w-28 h-28 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setFotoModalUrl(rec.selfie_url)}
                          />
                        ) : (
                          <p className="text-xs text-gray-400 italic">Foto não disponível</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal de foto ampliada */}
        {fotoModalUrl && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setFotoModalUrl(null)}
          >
            <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <img src={fotoModalUrl} alt="Selfie ampliada" className="w-full rounded-xl shadow-2xl" />
              <button
                onClick={() => setFotoModalUrl(null)}
                className="absolute top-2 right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {showDeleteModal && (;
content = content.replace(modalStart, newPanel);

fs.writeFileSync(path, content);
console.log('Update Ponto.tsx successfully');
