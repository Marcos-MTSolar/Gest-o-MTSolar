const fs = require('fs');
const path = 'C:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/ProposalGenerator.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add pagination states
content = content.replace(
  /const \[history, setHistory\] = useState<any\[\]>\(\[\]\);/g,
  const [history, setHistory] = useState<any[]>([]);\n  const [historyPage, setHistoryPage] = useState(1);\n  const [historyTotalPages, setHistoryTotalPages] = useState(1);\n  const [historyTotal, setHistoryTotal] = useState(0);
);

// 2. Replace fetchHistory
const oldFetch = const fetchHistory = async () => {
    try {
      const res = await api.get('/api/proposal-history');
      setHistory(res.data);
    } catch (error) {
      console.error('Erro ao buscar hist\u00f3rico:', error);
    }
  };;

const newFetch = const fetchHistory = async (page = 1) => {
    try {
      const res = await api.get(\/api/proposal-history?page=\&limit=10\);
      setHistory(res.data.data ?? []);
      setHistoryPage(res.data.page ?? 1);
      setHistoryTotalPages(res.data.totalPages ?? 1);
      setHistoryTotal(res.data.total ?? 0);
    } catch (error) {
      console.error('Erro ao buscar hist\u00f3rico:', error);
      setHistory([]);
    }
  };;
content = content.replace(oldFetch, newFetch);

// Also handle the edge case where encoding might have messed up 'hist\u00f3rico' in the file
const oldFetchAlt = /const fetchHistory = async \(\) => \{\s+try \{\s+const res = await api\.get\('\/api\/proposal-history'\);\s+setHistory\(res\.data\);\s+\} catch \(error\) \{\s+console\.error\('Erro ao buscar hist[^:]+:', error\);\s+\}\s+\};/s;
content = content.replace(oldFetchAlt, newFetch);

// 3. Add overflow to container and pagination controls
const oldTableStart = <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">;
const newTableStart = <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-y-auto max-h-[480px]">
                  <table className="w-full text-left border-collapse">;

const oldTableEnd = </table>
              </div>
            </div>;
const newTableEnd = </table>
                </div>
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
                    <span className="text-sm text-gray-500">
                      {historyTotal} proposta{historyTotal !== 1 ? 's' : ''} no total
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { const p = historyPage - 1; setHistoryPage(p); fetchHistory(p); }}
                        disabled={historyPage === 1}
                        className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        ← Anterior
                      </button>
                      <span className="text-sm text-gray-600">
                        Página {historyPage} de {historyTotalPages}
                      </span>
                      <button
                        onClick={() => { const p = historyPage + 1; setHistoryPage(p); fetchHistory(p); }}
                        disabled={historyPage === historyTotalPages}
                        className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        Próxima →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>;

content = content.replace(oldTableStart, newTableStart);
content = content.replace(oldTableEnd, newTableEnd);

// 4. Update the useEffect to call fetchHistory(1) and activeTab check
content = content.replace(
  /fetchHistory\(\);/g,
  etchHistory(1);
);

fs.writeFileSync(path, content);
console.log('Done!');
