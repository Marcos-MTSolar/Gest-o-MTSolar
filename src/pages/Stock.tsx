import React, { useState, useMemo } from 'react';
import { Package, Plus, History, Search, RefreshCw } from 'lucide-react';
import { useStock } from '../hooks/useStock';
import type { StockItem } from '../types/stock';
import StockTable from '../components/stock/StockTable';
import WithdrawalModal from '../components/stock/WithdrawalModal';
import AddItemModal from '../components/stock/AddItemModal';
import WithdrawalsHistory from '../components/stock/WithdrawalsHistory';
import LowStockAlert from '../components/stock/LowStockAlert';

type Tab = 'inventory' | 'history';

export default function Stock() {
  const { items, withdrawals, loading, lowStockItems, registerWithdrawal, updateIdealQuantity, updateCurrentQuantity, addItem, deleteItem, refetch } = useStock();
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const categories = useMemo(() =>
    [...new Set(items.map(i => i.category))].sort(), [items]);

  const filteredItems = useMemo(() =>
    items.filter(item => {
      const matchSearch = `${item.category} ${item.specification}`.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || item.category === categoryFilter;
      return matchSearch && matchCategory;
    }), [items, search, categoryFilter]);

  const handleWithdraw = (item: StockItem) => {
    setSelectedItem(item);
    setShowWithdrawalModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
            <p className="text-sm text-gray-500">{items.length} itens cadastrados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddItemModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Material
          </button>
          <button
            onClick={() => { setSelectedItem(null); setShowWithdrawalModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar Retirada
          </button>
        </div>
      </div>

      {lowStockItems.length > 0 && <LowStockAlert items={lowStockItems} />}

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'inventory' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <Package className="w-4 h-4" /> Inventário
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <History className="w-4 h-4" /> Histórico
          {withdrawals.length > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{withdrawals.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'inventory' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <StockTable 
            items={filteredItems} 
            onWithdraw={handleWithdraw} 
            onUpdateIdeal={updateIdealQuantity} 
            onUpdateCurrent={updateCurrentQuantity}
            onDelete={deleteItem}
          />
        </>
      )}

      {activeTab === 'history' && <WithdrawalsHistory withdrawals={withdrawals} />}

      {showWithdrawalModal && (
        <WithdrawalModal
          items={items}
          selectedItem={selectedItem}
          onClose={() => { setShowWithdrawalModal(false); setSelectedItem(null); }}
          onSubmit={async (data) => {
            await registerWithdrawal(data);
            setShowWithdrawalModal(false);
            setSelectedItem(null);
          }}
        />
      )}

      {showAddItemModal && (
        <AddItemModal
          onClose={() => setShowAddItemModal(false)}
          onSubmit={addItem}
        />
      )}
    </div>
  );
}
