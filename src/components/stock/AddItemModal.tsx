import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import type { StockItem } from '../../types/stock';

interface Props {
  onClose: () => void;
  onSubmit: (item: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export default function AddItemModal({ onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    category: '',
    specification: '',
    unit: 'un',
    current_quantity: 0,
    ideal_quantity: 0,
    low_stock_threshold: 20
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!form.category || !form.specification) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3 text-orange-600">
            <PackagePlus className="w-6 h-6" />
            <h2 className="text-xl font-bold text-gray-900">Novo Material</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria *</label>
            <input
              type="text"
              placeholder="Ex: Cabos, Painéis, Inversores..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Especificação / Descrição *</label>
            <input
              type="text"
              placeholder="Ex: Cabo de Cobre 10mm Preto"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              value={form.specification}
              onChange={e => setForm({...form, specification: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Unidade *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                value={form.unit}
                onChange={e => setForm({...form, unit: e.target.value})}
              >
                <option value="un">Unidade (un)</option>
                <option value="m">Metros (m)</option>
                <option value="kg">Quilos (kg)</option>
                <option value="cx">Caixa (cx)</option>
                <option value="par">Par (par)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Limite de Alerta (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                value={form.low_stock_threshold}
                onChange={e => setForm({...form, low_stock_threshold: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Qtd. Inicial</label>
              <input
                type="number"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                value={form.current_quantity}
                onChange={e => setForm({...form, current_quantity: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Qtd. Ideal</label>
              <input
                type="number"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                value={form.ideal_quantity}
                onChange={e => setForm({...form, ideal_quantity: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          {error && <div className="text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-sm font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-orange-500/20 transition-all"
            >
              {loading ? 'Adicionando...' : 'Criar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
