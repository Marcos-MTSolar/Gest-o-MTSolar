import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { StockItem, StockWithdrawal, WithdrawalFormData } from '../types/stock';

export function useStock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<StockWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .order('category', { ascending: true })
      .order('specification', { ascending: true });
    if (error) { setError(error.message); return; }
    setItems(data || []);
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    const { data, error } = await supabase
      .from('stock_withdrawals')
      .select('*, stock_items(category, specification, unit)')
      .order('withdrawal_date', { ascending: false })
      .limit(100);
    if (error) { setError(error.message); return; }
    setWithdrawals(data || []);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchItems(), fetchWithdrawals()]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('stock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, fetchItems)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_withdrawals' }, fetchWithdrawals)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchItems, fetchWithdrawals]);

  const registerWithdrawal = async (form: WithdrawalFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('stock_withdrawals')
      .insert({ ...form, created_by: user?.id });
    if (error) throw new Error(error.message);
    await fetchItems();
    await fetchWithdrawals();
  };

  const updateIdealQuantity = async (id: string, ideal_quantity: number) => {
    const { error } = await supabase
      .from('stock_items')
      .update({ ideal_quantity })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await fetchItems();
  };

  const updateCurrentQuantity = async (id: string, current_quantity: number) => {
    const { error } = await supabase
      .from('stock_items')
      .update({ current_quantity })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await fetchItems();
  };

  const addItem = async (item: Omit<StockItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('stock_items')
      .insert(item)
      .select();
    if (error) throw new Error(error.message);
    
    if (data && data[0]) {
      setItems(prev => [...prev, data[0]].sort((a, b) => a.category.localeCompare(b.category)));
    }
    await fetchItems();
  };

  const deleteItem = async (id: string | number) => {
    console.log('[StockHook] Iniciando deleteItem para ID:', id);
    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', id);
      
      console.log('[StockHook] Resposta do Supabase - Erro:', error);
      
      if (error) {
        console.error('[StockHook] Erro retornado pelo Supabase:', error.message);
        throw new Error(error.message);
      }
      
      console.log('[StockHook] Exclusão bem-sucedida no banco. Atualizando estado local...');
      
      // Atualização imediata do estado local
      setItems(prev => {
        const filtered = prev.filter(item => String(item.id) !== String(id));
        console.log(`[StockHook] Estado filtrado: de ${prev.length} para ${filtered.length} itens`);
        return filtered;
      });

      // Recarregar em background para garantir sincronia
      fetchItems();
      return true;
    } catch (err: any) {
      console.error('[StockHook] Exceção capturada no deleteItem:', err);
      throw err;
    }
  };

  const lowStockItems = items.filter(item =>
    item.ideal_quantity > 0 &&
    (item.current_quantity / item.ideal_quantity) * 100 <= item.low_stock_threshold
  );

  return {
    items,
    withdrawals,
    loading,
    error,
    lowStockItems,
    registerWithdrawal,
    updateIdealQuantity,
    updateCurrentQuantity,
    addItem,
    deleteItem,
    refetch: () => Promise.all([fetchItems(), fetchWithdrawals()]),
  };
}
