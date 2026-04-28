import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { StockItem } from '../../types/stock';

interface Props { items: StockItem[]; }

export default function LowStockAlert({ items }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <span className="font-semibold text-yellow-800">
            {items.length} {items.length === 1 ? 'item precisa' : 'itens precisam'} ser comprado{items.length > 1 ? 's' : ''}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-yellow-600" /> : <ChevronDown className="w-4 h-4 text-yellow-600" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map(item => {
            const pct = Math.round((item.current_quantity / item.ideal_quantity) * 100);
            return (
              <div key={item.id} className="bg-white rounded-lg px-3 py-2 border border-yellow-100">
                <div className="font-medium text-sm text-gray-800">{item.category}</div>
                <div className="text-xs text-gray-500">{item.specification}</div>
                <div className="text-xs text-yellow-700 mt-1">
                  {item.current_quantity} / {item.ideal_quantity} {item.unit} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
