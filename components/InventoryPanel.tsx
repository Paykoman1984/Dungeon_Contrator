
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { Item, ItemType, Rarity } from '../types';
import { formatNumber } from '../utils/gameMath';
import { Trash2, X, CheckSquare, Layers, Box, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { RARITY_COLORS, RARITY_BG_COLORS, INVENTORY_SIZE, MATERIALS } from '../constants';
import { ItemIcon } from './ItemIcon';
import { ItemDetailsModal } from './ItemDetailsModal';

export const InventoryPanel: React.FC = () => {
  const { state, salvageManyItems } = useGame();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<'EQUIPMENT' | 'MATERIALS'>('EQUIPMENT');
  
  // Bulk Mode States (Equipment Only)
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);

  const toggleBulkMode = () => {
      setIsBulkMode(!isBulkMode);
      setSelectedItem(null);
      setSelectedBulkIds([]);
      setIsConfirmingBulk(false);
  };

  const handleBulkClick = (id: string) => {
      if (selectedBulkIds.includes(id)) {
          setSelectedBulkIds(selectedBulkIds.filter(i => i !== id));
      } else {
          setSelectedBulkIds([...selectedBulkIds, id]);
      }
      setIsConfirmingBulk(false); 
  };

  const handleSelectAll = () => {
      if (selectedBulkIds.length === state.inventory.length && state.inventory.length > 0) {
          setSelectedBulkIds([]);
      } else {
          setSelectedBulkIds(state.inventory.map(i => i.id));
      }
      setIsConfirmingBulk(false);
  };

  const executeBulkSalvage = () => {
      if (selectedBulkIds.length > 0) {
          salvageManyItems(selectedBulkIds);
          setSelectedBulkIds([]);
          setIsConfirmingBulk(false);
      }
  };

  const bulkTotalValue = state.inventory
    .filter(i => selectedBulkIds.includes(i.id))
    .reduce((sum, i) => sum + i.value, 0);

  // Cast Object.entries to ensure value is typed as number
  const materialsList = (Object.entries(state.materials) as [string, number][]).filter(([_, count]) => count > 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-20">
      
      {selectedItem && (
          <ItemDetailsModal 
             item={selectedItem} 
             onClose={() => setSelectedItem(null)} 
          />
      )}

      {/* Header & Tabs */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-6">Inventory</h1>
        
        <div className="flex border-b border-slate-800">
            <button 
                onClick={() => { setActiveTab('EQUIPMENT'); setIsBulkMode(false); }}
                className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'EQUIPMENT' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                <Package size={18} /> Equipment
            </button>
            <button 
                onClick={() => { setActiveTab('MATERIALS'); setIsBulkMode(false); }}
                className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'MATERIALS' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                <Layers size={18} /> Materials
            </button>
        </div>
      </div>

      {/* 1. EQUIPMENT TAB */}
      {activeTab === 'EQUIPMENT' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
            <div className={`p-4 rounded-xl border transition-colors ${isBulkMode ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-900/30 border-slate-800/50'}`}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                         <div className={`text-xs font-mono font-bold px-2 py-1 rounded border flex items-center gap-2 ${state.inventory.length >= INVENTORY_SIZE ? 'bg-red-900/50 text-red-400 border-red-800' : 'bg-slate-900 text-slate-300 border-slate-800'}`}>
                            <Package size={14} />
                            {state.inventory.length} / {INVENTORY_SIZE} Slots
                         </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isBulkMode && (
                            <button
                                onClick={handleSelectAll}
                                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all border bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white"
                            >
                                <CheckCircle size={14} />
                                {selectedBulkIds.length === state.inventory.length && state.inventory.length > 0 ? 'Deselect All' : 'Select All'}
                            </button>
                        )}

                        <button 
                            onClick={toggleBulkMode}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all border
                                ${isBulkMode 
                                    ? 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700' 
                                    : 'bg-red-900/20 text-red-300 border-red-900/30 hover:bg-red-900/30'
                                }
                            `}
                        >
                            {isBulkMode ? <X size={14} /> : <Trash2 size={14} />}
                            {isBulkMode ? 'Cancel' : 'Bulk Salvage'}
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {Array.from({ length: INVENTORY_SIZE }).map((_, idx) => {
                        const item = state.inventory[idx];
                        const isSelectedBulk = item && selectedBulkIds.includes(item.id);
                        
                        return (
                            <div 
                                key={item ? item.id : `empty-${idx}`}
                                onClick={() => {
                                    if (!item) return;
                                    if (isBulkMode) handleBulkClick(item.id);
                                    else {
                                        setSelectedItem(item);
                                    }
                                }}
                                className={`
                                    aspect-square rounded-lg border flex items-center justify-center cursor-pointer transition-all relative group overflow-hidden
                                    ${item 
                                        ? `${RARITY_BG_COLORS[item.rarity]} 
                                        ${isBulkMode 
                                            ? isSelectedBulk 
                                                ? 'border-red-500 ring-2 ring-red-500/50 opacity-100' 
                                                : 'border-slate-700 hover:border-red-400 opacity-60 hover:opacity-100'
                                            : 'border-slate-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20'
                                        }` 
                                        : 'bg-slate-900/50 border-slate-800/50'
                                    }
                                `}
                            >
                                {item && (
                                    <>
                                    <ItemIcon item={item} size={24} />
                                    
                                    <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-slate-400 opacity-60 group-hover:opacity-100">
                                        {item.level}
                                    </span>

                                    {/* Bulk Selection Indicator */}
                                    {isBulkMode && isSelectedBulk && (
                                        <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center backdrop-blur-[1px]">
                                            <CheckSquare size={24} className="text-red-400 drop-shadow-lg" />
                                        </div>
                                    )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bulk Action Panel (Only in Equipment Tab) */}
            {isBulkMode && (
                <div className="bg-slate-900 border border-red-900/30 rounded-xl p-5 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-red-100 flex items-center gap-2">
                                <Trash2 size={20} className="text-red-500"/>
                                Bulk Salvage
                            </h3>
                            <p className="text-slate-400 text-sm">Select items above to destroy them for gold.</p>
                        </div>
                        
                        <div className="flex items-center gap-6 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                            <div className="text-center">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Selected</div>
                                <div className="font-mono text-xl text-white font-bold leading-none">{selectedBulkIds.length}</div>
                            </div>
                            <div className="w-px h-8 bg-slate-800"></div>
                            <div className="text-center">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Value</div>
                                <div className="font-mono text-xl text-yellow-500 font-bold leading-none">{formatNumber(bulkTotalValue)}g</div>
                            </div>
                        </div>

                        {isConfirmingBulk ? (
                            <div className="flex flex-col items-center sm:items-end gap-2 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wide">
                                    <AlertTriangle size={14} />
                                    Confirm destroy {selectedBulkIds.length} items?
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsConfirmingBulk(false)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs uppercase tracking-wide transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={executeBulkSalvage}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold shadow-lg shadow-red-900/20 text-xs uppercase tracking-wide flex items-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={14} /> Confirm
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsConfirmingBulk(true)}
                                disabled={selectedBulkIds.length === 0}
                                className={`
                                    px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2
                                    ${selectedBulkIds.length > 0 
                                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20 active:scale-95' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }
                                `}
                            >
                                <Trash2 size={18} />
                                <span>Salvage Selected</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* 2. MATERIALS TAB */}
      {activeTab === 'MATERIALS' && (
          <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800/50 animate-in fade-in slide-in-from-right-4 duration-300 min-h-[400px]">
              
              {materialsList.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
                      <Layers size={48} className="mb-4 opacity-50" />
                      <p className="text-sm italic">No materials collected.</p>
                      <p className="text-xs mt-1">Complete Gathering or Fishing contracts to find resources.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {materialsList.map(([matId, count]) => {
                          const mat = MATERIALS[matId];
                          if (!mat) return null;
                          return (
                              <div key={matId} className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex flex-col gap-3 shadow-lg hover:border-slate-500 transition-colors group">
                                   <div className="flex justify-between items-start">
                                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800 border border-slate-700 ${RARITY_COLORS[mat.rarity]}`}>
                                           <Box size={20} />
                                       </div>
                                       <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                            x{formatNumber(count)}
                                       </span>
                                   </div>
                                   <div>
                                       <div className={`font-bold ${RARITY_COLORS[mat.rarity]}`}>{mat.name}</div>
                                       <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{mat.description}</div>
                                   </div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}

    </div>
  );
};
