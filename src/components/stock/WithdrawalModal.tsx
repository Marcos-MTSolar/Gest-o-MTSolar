import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import type { StockItem, WithdrawalFormData } from '../../types/stock';

interface Props {
  items: StockItem[];
  selectedItem: StockItem | null;
  onClose: () => void;
  onSubmit: (data: WithdrawalFormData) => Promise<void>;
}

export default function WithdrawalModal({ items, selectedItem, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<WithdrawalFormData>({
    stock_item_id: selectedItem?.id || '',
    quantity: 1,
    withdrawal_date: new Date().toISOString().split('T')[0],
    installation_name: '',
    technician_name: '',
    notes: '',
  });

  const selectedStockItem = items.find(i => i.id === form.stock_item_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.stock_item_id) { setError('Selecione um item'); return; }
    if (!form.installation_name.trim()) { setError('Informe a instalação'); return; }
    if (selectedStockItem && form.quantity > selectedStockItem.current_quantity) {
      setError(`Quantidade máxima disponível: ${selectedStockItem.current_quantity}`);
      return;
    }
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Registrar Retirada</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item do Estoque *</label>
            <select
              value={form.stock_item_id}
              onChange={e => setForm(f => ({ ...f, stock_item_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Selecione um item...</option>
              {[...new Set(items.map(i => i.category))].sort().map(cat => (
                <optgroup key={cat} label={cat}>
                  {items.filter(i => i.category === cat).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.specification} — {item.current_quantity} {item.unit} disponíveis
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
              <input
                type="number" min={1} max={selectedStockItem?.current_quantity || 9999}
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Retirada *</label>
              <input
                type="date" value={form.withdrawal_date}
                onChange={e => setForm(f => ({ ...f, withdrawal_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instalação / Projeto de Destino *</label>
            <input
              type="text" placeholder="ex: Residência João Silva — Rua das Flores, 123"
              value={form.installation_name}
              onChange={e => setForm(f => ({ ...f, installation_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Responsável</label>
            <input
              type="text" placeholder="Nome do técnico"
              value={form.technician_name}
              onChange={e => setForm(f => ({ ...f, technician_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              rows={2} placeholder="Informações adicionais..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {loading ? 'Registrando...' : 'Confirmar Retirada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
