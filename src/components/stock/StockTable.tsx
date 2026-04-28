import React, { useState } from 'react';
import { Minus, Edit2, Check, X, Trash2 } from 'lucide-react';
import type { StockItem } from '../../types/stock';
import { getStockStatus } from '../../types/stock';

const statusConfig = {
  ok:       { label: 'OK',      className: 'bg-green-100 text-green-800' },
  low:      { label: 'Comprar', className: 'bg-yellow-100 text-yellow-800' },
  critical: { label: 'Crítico', className: 'bg-red-100 text-red-800' },
  empty:    { label: 'Zerado',  className: 'bg-gray-100 text-gray-800' },
};

interface Props {
  items: StockItem[];
  onWithdraw: (item: StockItem) => void;
  onUpdateIdeal: (id: string, value: number) => Promise<void>;
  onUpdateCurrent: (id: string, value: number) => Promise<void>;
  onDelete: (id: string | number) => Promise<void>;
}

export default function StockTable({ items, onWithdraw, onUpdateIdeal, onUpdateCurrent, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editField, setEditField] = useState<'ideal' | 'current'>('ideal');

  const startEdit = (item: StockItem, field: 'ideal' | 'current') => {
    setEditingId(item.id);
    setEditField(field);
    setEditValue(String(field === 'ideal' ? item.ideal_quantity : item.current_quantity));
  };

  const saveEdit = async (item: StockItem) => {
    const val = parseInt(editValue, 10);
    if (isNaN(val) || val < 0) return;
    if (editField === 'ideal') await onUpdateIdeal(item.id, val);
    else await onUpdateCurrent(item.id, val);
    setEditingId(null);
  };

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, StockItem[]>);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Categoria / Especificação</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-700">Und.</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-700">Qtd. Atual</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-700">Qtd. Ideal</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-700">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Object.entries(grouped).map(([category, catItems]) => (
            <React.Fragment key={category}>
              <tr className="bg-orange-50">
                <td colSpan={6} className="px-4 py-2 font-semibold text-orange-700 text-xs uppercase tracking-wider">
                  {category}
                </td>
              </tr>
              {catItems.map(item => {
                const status = getStockStatus(item);
                const pct = item.ideal_quantity > 0
                  ? Math.round((item.current_quantity / item.ideal_quantity) * 100)
                  : 0;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 pl-8 text-gray-800">{item.specification}</td>
                    <td className="text-center px-4 py-3 text-gray-500">{item.unit}</td>
                    <td className="text-center px-4 py-3">
                      {editingId === item.id && editField === 'current' ? (
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-16 text-center border rounded px-1 py-0.5 text-sm" autoFocus />
                          <button onClick={() => saveEdit(item)} className="text-green-600"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-semibold ${status === 'empty' ? 'text-gray-400' : status === 'low' ? 'text-yellow-700' : status === 'critical' ? 'text-red-700' : 'text-gray-900'}`}>
                            {item.current_quantity}
                          </span>
                          <button onClick={() => startEdit(item, 'current')} className="text-gray-400 hover:text-gray-600">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      {editingId === item.id && editField === 'ideal' ? (
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-16 text-center border rounded px-1 py-0.5 text-sm" autoFocus />
                          <button onClick={() => saveEdit(item)} className="text-green-600"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-gray-600">{item.ideal_quantity}</span>
                          <button onClick={() => startEdit(item, 'ideal')} className="text-gray-400 hover:text-gray-600">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[status].className}`}>
                          {statusConfig[status].label}
                        </span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${status === 'ok' ? 'bg-green-500' : status === 'low' ? 'bg-yellow-500' : status === 'critical' ? 'bg-red-500' : 'bg-gray-300'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onWithdraw(item)}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          <Minus className="w-3 h-3" /> Retirar
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Botão excluir clicado para ID:', item.id);
                            if (window.confirm('Confirmar exclusão de: ' + item.specification + '?')) {
                              try {
                                console.log('Chamando onDelete para ID:', item.id);
                                await onDelete(item.id);
                                console.log('onDelete concluído');
                                alert('Sucesso: Item removido!');
                              } catch (err: any) {
                                console.error('Erro na exclusão:', err);
                                alert('FALHA na exclusão: ' + (err.message || JSON.stringify(err)));
                              }
                            }
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-100 hover:border-red-300 shadow-sm"
                          title="Excluir Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
