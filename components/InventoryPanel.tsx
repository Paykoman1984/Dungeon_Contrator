
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { Item, ItemType, Rarity } from '../types';
import { formatNumber } from '../utils/gameMath';
import { Trash2, X, CheckSquare } from 'lucide-react';
import { RARITY_COLORS, RARITY_BG_COLORS, INVENTORY_SIZE } from '../constants';
import { ItemIcon } from './ItemIcon';
import { ItemDetailsModal } from './ItemDetailsModal';

export const InventoryPanel: React.FC = () => {
  const { state, salvageManyItems } = useGame();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  // If item was salvaged (not found), clear selection (handled by modal onClose mostly, but safety check)
  const currentSelectedItem = state.inventory.find(i => i.id === selectedItem?.id);
  
  const toggleBulkMode = () => {
      setIsBulkMode(!isBulkMode);
      setSelectedItem(null);
      setSelectedBulkIds([]);
  };

  const handleBulkClick = (id: string) => {
      if (selectedBulkIds.includes(id)) {
          setSelectedBulkIds(selectedBulkIds.filter(i => i !== id));
      } else {
          setSelectedBulkIds([...selectedBulkIds, id]);
      }
  };

  const executeBulkSalvage = () => {
      if (selectedBulkIds.length > 0) {
          salvageManyItems(selectedBulkIds);
          setSelectedBulkIds([]);
      }
  };

  const bulkTotalValue = state.inventory
    .filter(i => selectedBulkIds.includes(i.id))
    .reduce((sum, i) => sum + i.value, 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-20">
      
      {selectedItem && (
          <ItemDetailsModal 
             item={selectedItem} 
             onClose={() => setSelectedItem(null)} 
          />
      )}

      {/* 1. Inventory Grid Section */}
      <div className={`p-4 rounded-xl border transition-colors ${isBulkMode ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-900/30 border-slate-800/50'}`}>
         <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                 Inventory 
                 <span className="text-xs font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                    {state.inventory.length} / {INVENTORY_SIZE}
                 </span>
             </h2>

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
                 {isBulkMode ? 'Cancel Bulk' : 'Bulk Salvage'}
             </button>
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

      {/* 2. Bulk Action Panel */}
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

                 <button
                    onClick={executeBulkSalvage}
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
             </div>
         </div>
      )}
    </div>
  );
};
