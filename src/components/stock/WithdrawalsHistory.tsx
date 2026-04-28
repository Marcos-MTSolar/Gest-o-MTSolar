import React from 'react';
import { Calendar, MapPin, User } from 'lucide-react';
import type { StockWithdrawal } from '../../types/stock';

interface Props { withdrawals: StockWithdrawal[]; }

export default function WithdrawalsHistory({ withdrawals }: Props) {
  if (withdrawals.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">Nenhuma retirada registrada</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Data</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Item</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-700">Qtd.</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Instalação</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Técnico</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700">Obs.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {withdrawals.map(w => (
            <tr key={w.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-3 h-3" />
                  {new Date(w.withdrawal_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{w.stock_items?.category}</div>
                <div className="text-xs text-gray-500">{w.stock_items?.specification}</div>
              </td>
              <td className="text-center px-4 py-3 font-semibold text-gray-800">
                -{w.quantity} {w.stock_items?.unit}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{w.installation_name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {w.technician_name && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <User className="w-3 h-3" />
                    {w.technician_name}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{w.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
