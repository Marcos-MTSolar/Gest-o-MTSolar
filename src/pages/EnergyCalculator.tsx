import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Calculator, 
  List, 
  ArrowRight, 
  TrendingUp, 
  Sun,
  X,
  Smartphone,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Equipment {
  id: string;
  name: string;
  quantity: number;
  power: number; // In Watts
  powerMode: 'W' | 'BTU' | 'CV';
  btuValue?: string;
  cvValue?: string;
  hoursPerDay: number;
  daysPerWeek: number;
}

const PREDEFINED_EQUIPMENT = [
  { name: 'Geladeira frost-free', power: 150, category: 'Eletrodomésticos' },
  { name: 'Freezer', power: 200, category: 'Eletrodomésticos' },
  { name: 'Televisão 42"', power: 100, category: 'Entretenimento' },
  { name: 'Chuveiro elétrico', power: 5500, category: 'Banheiro' },
  { name: 'Ferro de passar', power: 1000, category: 'Eletrodomésticos' },
  { name: 'Máquina de lavar', power: 500, category: 'Lavanderia' },
  { name: 'Micro-ondas', power: 1200, category: 'Cozinha' },
  { name: 'Computador desktop', power: 300, category: 'Escritório' },
  { name: 'Notebook', power: 65, category: 'Escritório' },
  { name: 'Lâmpada LED', power: 10, category: 'Iluminação' },
  { name: "Bomba d'água 1 CV", power: 735.5, category: 'Diversos' },
  { name: "Bomba d'água 2 CV", power: 1471, category: 'Diversos' },
  { name: "Bomba d'água 3 CV", power: 2206.5, category: 'Diversos' },
  { name: "Motor elétrico 1 CV", power: 735.5, category: 'Diversos' },
  { name: 'Ar-condicionado', power: 0, category: 'Climatização', isBTU: true }
];

const BTU_OPTIONS = [
  { label: '7.000 BTU', value: '7000', kw: 0.65 },
  { label: '9.000 BTU', value: '9000', kw: 0.85 },
  { label: '12.000 BTU', value: '12000', kw: 1.10 },
  { label: '18.000 BTU', value: '18000', kw: 1.70 },
  { label: '24.000 BTU', value: '24000', kw: 2.20 },
  { label: '30.000 BTU', value: '30000', kw: 2.80 },
  { label: '36.000 BTU', value: '36000', kw: 3.30 },
  { label: '60.000 BTU', value: '60000', kw: 5.50 }
];

export default function EnergyCalculator() {
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState<Equipment[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      quantity: 1,
      power: 0,
      powerMode: 'W',
      hoursPerDay: 8,
      daysPerWeek: 7
    }
  ]);
  const [tariff, setTariff] = useState(0.75);
  const [showPredefinedModal, setShowPredefinedModal] = useState(false);
  const [results, setResults] = useState<{
    items: { id: string; consumption: number; percentage: number }[];
    totalMonthly: number;
    totalAnnual: number;
    totalCost: number;
    estimatedKWp: number;
  } | null>(null);

  const addEquipment = () => {
    setEquipments([
      ...equipments,
      {
        id: crypto.randomUUID(),
        name: '',
        quantity: 1,
        power: 0,
        powerMode: 'W',
        hoursPerDay: 1,
        daysPerWeek: 7
      }
    ]);
  };

  const removeEquipment = (id: string) => {
    if (equipments.length === 1) return;
    setEquipments(equipments.filter(e => e.id !== id));
  };

  const updateEquipment = (id: string, updates: Partial<Equipment>) => {
    setEquipments(equipments.map(e => (e.id === id ? { ...e, ...updates } : e)));
  };

  const addFromPredefined = (item: typeof PREDEFINED_EQUIPMENT[0]) => {
    const newEquip: Equipment = {
      id: crypto.randomUUID(),
      name: item.name,
      quantity: 1,
      power: item.power,
      powerMode: item.isBTU ? 'BTU' : 'W',
      btuValue: item.isBTU ? '9000' : undefined,
      hoursPerDay: item.isBTU ? 8 : 1,
      daysPerWeek: 7
    };
    
    if (item.isBTU) {
      newEquip.power = 850; // 9000 BTU default
    }

    // Replace first empty item if it exists, otherwise add
    if (equipments.length === 1 && equipments[0].name === '' && equipments[0].power === 0) {
      setEquipments([newEquip]);
    } else {
      setEquipments([...equipments, newEquip]);
    }
    setShowPredefinedModal(false);
  };

  const calculate = () => {
    let hasError = false;
    equipments.forEach(e => {
      if (!e.name || e.quantity < 1 || e.power <= 0 || e.hoursPerDay < 0 || e.daysPerWeek < 1) {
        hasError = true;
      }
    });

    if (hasError) {
      alert('Por favor, preencha todos os campos corretamente.');
      return;
    }

    const itemsResults = equipments.map(e => {
      // (W / 1000) * Qty * Hours * (Days * 4.33)
      const monthlyKWh = (e.power / 1000) * e.quantity * e.hoursPerDay * (e.daysPerWeek * 4.33);
      return { id: e.id, consumption: monthlyKWh };
    });

    const totalMonthly = itemsResults.reduce((acc, curr) => acc + curr.consumption, 0);
    const totalAnnual = totalMonthly * 12;
    const totalCost = totalMonthly * tariff;
    const estimatedKWp = totalMonthly / (4.5 * 30);

    setResults({
      items: itemsResults.map(item => ({
        ...item,
        percentage: totalMonthly > 0 ? (item.consumption / totalMonthly) * 100 : 0
      })),
      totalMonthly,
      totalAnnual,
      totalCost,
      estimatedKWp
    });

    // Scroll to results
    setTimeout(() => {
      const el = document.getElementById('results-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleBTUChange = (id: string, btuValue: string) => {
    const option = BTU_OPTIONS.find(o => o.value === btuValue);
    if (option) {
      updateEquipment(id, { 
        btuValue, 
        power: option.kw * 1000 
      });
    }
  };

  const handleCVChange = (id: string, cvValue: string) => {
    const value = parseFloat(cvValue) || 0;
    updateEquipment(id, { 
      cvValue, 
      power: value * 735.499 
    });
  };

  const goToProposal = () => {
    if (!results) return;
    navigate('/proposal-generator', {
      state: {
        consumoMensal: results.totalMonthly,
        consumoAnual: results.totalAnnual,
        kWpEstimado: results.estimatedKWp,
        custoMensal: results.totalCost,
        equipamentos: equipments.map(e => ({
          nome: e.name,
          qtd: e.quantity,
          potencia: e.power,
          consumo: results.items.find(ri => ri.id === e.id)?.consumption || 0
        }))
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
            <Zap className="text-amber-500" />
            Calculadora de Consumo
          </h1>
          <p className="text-gray-600">Estime o consumo mensal de qualquer equipamento elétrico</p>
        </div>
        <button
          onClick={() => setShowPredefinedModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-100 text-blue-900 rounded-xl font-bold hover:bg-blue-200 transition-colors border-2 border-blue-200"
        >
          <List size={20} />
          Adicionar da Lista
        </button>
      </div>

      {/* Equipment List */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {equipments.map((equip, index) => (
            <motion.div
              key={equip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Nome e Qtd */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Equipamento</label>
                    <input
                      type="text"
                      value={equip.name}
                      onChange={(e) => updateEquipment(equip.id, { name: e.target.value })}
                      placeholder="Ex: Geladeira, Ar-condicionado..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      value={equip.quantity}
                      onChange={(e) => updateEquipment(equip.id, { quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Potência com Toggle */}
                <div className="w-full lg:w-72">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-semibold text-gray-700">Potência</label>
                    <div className="flex bg-gray-100 p-1 rounded-lg text-[10px] font-bold">
                      <button
                        onClick={() => updateEquipment(equip.id, { powerMode: 'W' })}
                        className={cn(
                          "px-2 py-1 rounded-md transition-all",
                          equip.powerMode === 'W' ? "bg-white shadow-sm text-blue-900" : "text-gray-500"
                        )}
                      >
                        Watts
                      </button>
                      <button
                        onClick={() => updateEquipment(equip.id, { powerMode: 'BTU' })}
                        className={cn(
                          "px-2 py-1 rounded-md transition-all",
                          equip.powerMode === 'BTU' ? "bg-white shadow-sm text-blue-900" : "text-gray-500"
                        )}
                      >
                        BTU
                      </button>
                      <button
                        onClick={() => updateEquipment(equip.id, { powerMode: 'CV' })}
                        className={cn(
                          "px-2 py-1 rounded-md transition-all",
                          equip.powerMode === 'CV' ? "bg-white shadow-sm text-blue-900" : "text-gray-500"
                        )}
                      >
                        CV
                      </button>
                    </div>
                  </div>
                  
                  {equip.powerMode === 'W' && (
                    <div className="relative">
                      <input
                        type="number"
                        value={equip.power || ''}
                        onChange={(e) => updateEquipment(equip.id, { power: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">W</span>
                    </div>
                  )}
                  
                  {equip.powerMode === 'BTU' && (
                    <select
                      value={equip.btuValue || ''}
                      onChange={(e) => handleBTUChange(equip.id, e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Selecione BTU</option>
                      {BTU_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {equip.powerMode === 'CV' && (
                    <div className="space-y-1">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={equip.cvValue || ''}
                          onChange={(e) => handleCVChange(equip.id, e.target.value)}
                          placeholder="0.0"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">CV</span>
                      </div>
                      <p className="text-[10px] text-gray-400 pl-1">1 CV ≈ 735,5 W</p>
                    </div>
                  )}
                </div>

                {/* Uso Temporário */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 text-nowrap">Horas/Dia</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={equip.hoursPerDay}
                      onChange={(e) => updateEquipment(equip.id, { hoursPerDay: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 text-nowrap">Dias/Semana</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={equip.daysPerWeek}
                      onChange={(e) => updateEquipment(equip.id, { daysPerWeek: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-end pb-1">
                  <button
                    onClick={() => removeEquipment(equip.id)}
                    disabled={equipments.length === 1}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={addEquipment}
          className="w-full py-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Adicionar Equipamento
        </button>
      </div>

      {/* Main Actions */}
      <div className="bg-blue-900 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-900/20">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label className="text-blue-200 text-sm font-medium">Tarifa de Energia (R$/kWh)</label>
          <div className="relative w-full md:w-48">
            <input
              type="number"
              step="0.01"
              value={tariff}
              onChange={(e) => setTariff(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-blue-800/50 border border-blue-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-400 font-bold pl-12"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-bold">R$</span>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full md:w-auto px-12 py-4 bg-amber-400 text-blue-900 rounded-2xl font-black text-lg hover:bg-amber-300 transition-all flex items-center justify-center gap-3 shadow-lg shadow-amber-400/20"
        >
          <Calculator size={24} />
          CALCULAR CONSUMO
        </button>
      </div>

      {/* Results Section */}
      {results && (
        <motion.div
          id="results-section"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm font-medium mb-1">Consumo Mensal</p>
              <h3 className="text-2xl font-black text-blue-900">{results.totalMonthly.toFixed(2)} <span className="text-sm font-normal text-gray-500">kWh</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm font-medium mb-1">Consumo Anual</p>
              <h3 className="text-2xl font-black text-blue-900">{results.totalAnnual.toFixed(2)} <span className="text-sm font-normal text-gray-500">kWh</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-500 text-sm font-medium mb-1">Custo Estimado</p>
              <h3 className="text-2xl font-black text-blue-900">R$ {results.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
              <p className="text-blue-600 text-sm font-medium mb-1">Potência Solar Nec.</p>
              <h3 className="text-2xl font-black text-blue-900">{results.estimatedKWp.toFixed(2)} <span className="text-sm font-normal text-blue-600">kWp</span></h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <Smartphone className="text-blue-500" size={20} />
                Detalhamento por Equipamento
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Equipamento</th>
                    <th className="px-6 py-4">Consumo Mensal</th>
                    <th className="px-6 py-4 text-right">% do Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {equipments.map(e => {
                    const res = results.items.find(ri => ri.id === e.id);
                    if (!res) return null;
                    return (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-700">{e.name}</td>
                        <td className="px-6 py-4 text-blue-900 font-bold">{res.consumption.toFixed(2)} kWh</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden hidden md:block">
                              <div 
                                className="bg-blue-500 h-full rounded-full" 
                                style={{ width: `${res.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-500">{res.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-6 border-2 border-amber-200 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center text-blue-900 shrink-0">
              <Sun size={32} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-xl font-black text-blue-900 mb-1">Oportunidade Solar!</h4>
              <p className="text-blue-900/70">
                Para suprir este consumo, você precisaria de aproximadamente <strong>{results.estimatedKWp.toFixed(2)} kWp</strong> de energia solar.
              </p>
            </div>
            <button
              onClick={goToProposal}
              className="w-full md:w-auto px-8 py-4 bg-blue-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all group"
            >
              Gerar Proposta
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Predefined Modal */}
      {showPredefinedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm"
            onClick={() => setShowPredefinedModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                <List className="text-blue-500" />
                Equipamentos Comuns
              </h2>
              <button onClick={() => setShowPredefinedModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PREDEFINED_EQUIPMENT.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => addFromPredefined(item)}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div>
                      <p className="font-bold text-gray-800 group-hover:text-blue-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-blue-600">
                        {item.isBTU ? 'BTU' : `${item.power}W`}
                      </p>
                      <Plus size={16} className="ml-auto mt-1 text-blue-400 group-hover:text-blue-600" />
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-8 bg-blue-50 p-4 rounded-xl flex gap-3 items-start">
                <Info size={20} className="text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Os valores acima são médias de mercado. Para um cálculo mais preciso, verifique a etiqueta de consumo ou manual do seu equipamento específico.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
