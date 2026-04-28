export interface StockItem {
  id: string;
  category: string;
  specification: string;
  unit: string;
  current_quantity: number;
  ideal_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface StockWithdrawal {
  id: string;
  stock_item_id: string;
  quantity: number;
  withdrawal_date: string;
  installation_id?: string;
  installation_name: string;
  technician_name?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  stock_items?: StockItem;
}

export interface WithdrawalFormData {
  stock_item_id: string;
  quantity: number;
  withdrawal_date: string;
  installation_name: string;
  technician_name: string;
  notes?: string;
}

export type StockStatus = 'ok' | 'low' | 'critical' | 'empty';

export function getStockStatus(item: StockItem): StockStatus {
  if (item.current_quantity === 0) return 'empty';
  const pct = (item.current_quantity / item.ideal_quantity) * 100;
  if (pct <= item.low_stock_threshold) return 'low';
  if (pct <= 10) return 'critical';
  return 'ok';
}
