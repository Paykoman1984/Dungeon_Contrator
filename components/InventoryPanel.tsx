
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { Item, ItemType, Rarity, ConsumableType } from '../types';
import { formatNumber, checkResourceCost } from '../utils/gameMath';
import { Trash2, X, CheckSquare, Layers, Box, CheckCircle, AlertTriangle, Package, Filter, Lock, Hammer, FlaskConical, Swords, Timer, Zap, Coins, Star } from 'lucide-react';
import { RARITY_COLORS, RARITY_BG_COLORS, INVENTORY_SIZE, MATERIALS, LOOT_FILTER_UNLOCK_COST, CONSUMABLES, CRAFTING_RECIPES } from '../constants';
import { ItemIcon } from './ItemIcon';
import { ItemDetailsModal } from './ItemDetailsModal';
import { LootFilterModal } from './LootFilterModal';

export const InventoryPanel: React.FC = () => {
  const { state, salvageManyItems, unlockLootFilter, craftConsumable, craftEquipment, sellResource } = useGame();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<'EQUIPMENT' | 'MATERIALS' | 'WORKSHOP'>('EQUIPMENT');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Bulk Mode States (Equipment Only)
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);

  // Workshop Sub-tab
  const [workshopTab, setWorkshopTab] = useState<'ALCHEMY' | 'SMITHING'>('ALCHEMY');

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

  // --- Render Helpers for Workshop ---
  const renderCost = (costs: { resourceId: string, amount: number }[]) => (
      <div className="flex flex-wrap gap-2 text-[10px] mt-2">
          {costs.map((cost, i) => {
              const mat = MATERIALS[cost.resourceId];
              const owned = state.materials[cost.resourceId] || 0;
              const hasEnough = owned >= cost.amount;
              return (
                  <div key={i} className={`px-2 py-1 rounded border flex items-center gap-1 ${hasEnough ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-950 border-slate-800 text-slate-600 opacity-70'}`}>
                      <span className={hasEnough ? RARITY_COLORS[mat.rarity] : ''}>{mat.name}</span>
                      <span className="font-mono">{owned}/{cost.amount}</span>
                  </div>
              )
          })}
      </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-20">
      
      {selectedItem && (
          <ItemDetailsModal 
             item={selectedItem} 
             onClose={() => setSelectedItem(null)} 
          />
      )}

      {isFilterModalOpen && (
          <LootFilterModal onClose={() => setIsFilterModalOpen(false)} />
      )}

      {/* Header & Tabs */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 mb-6">Inventory & Crafting</h1>
        
        <div className="flex border-b border-slate-800 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => { setActiveTab('EQUIPMENT'); setIsBulkMode(false); }}
                className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'EQUIPMENT' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                <Package size={18} /> Equipment
            </button>
            <button 
                onClick={() => { setActiveTab('MATERIALS'); setIsBulkMode(false); }}
                className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'MATERIALS' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                <Layers size={18} /> Materials
            </button>
            <button 
                onClick={() => { setActiveTab('WORKSHOP'); setIsBulkMode(false); }}
                className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'WORKSHOP' ? 'border-orange-500 text-orange-400 bg-orange-500/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                <Hammer size={18} /> Workshop
            </button>
        </div>
      </div>

      {/* 1. EQUIPMENT TAB */}
      {activeTab === 'EQUIPMENT' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
            <div className={`p-4 rounded-xl border transition-colors ${isBulkMode ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-900/30 border-slate-800/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div className="flex items-center gap-3">
                         <div className={`text-xs font-mono font-bold px-2 py-1 rounded border flex items-center gap-2 ${state.inventory.length >= INVENTORY_SIZE ? 'bg-red-900/50 text-red-400 border-red-800' : 'bg-slate-900 text-slate-300 border-slate-800'}`}>
                            <Package size={14} />
                            {state.inventory.length} / {INVENTORY_SIZE} Slots
                         </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Loot Filter Button */}
                        {state.lootFilter.unlocked ? (
                            <button
                                onClick={() => setIsFilterModalOpen(true)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all border ${state.lootFilter.enabled ? 'bg-indigo-900/30 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/50' : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700'}`}
                            >
                                <Filter size={14} /> Filter {state.lootFilter.enabled ? 'On' : 'Off'}
                            </button>
                        ) : (
                            <button
                                onClick={unlockLootFilter}
                                disabled={state.gold < LOOT_FILTER_UNLOCK_COST}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all border ${state.gold >= LOOT_FILTER_UNLOCK_COST ? 'bg-yellow-900/20 text-yellow-500 border-yellow-700/50 hover:bg-yellow-900/40' : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'}`}
                                title={`Unlock Auto-Salvage Filter for ${formatNumber(LOOT_FILTER_UNLOCK_COST)}g`}
                            >
                                <Lock size={12} /> Unlock Filter ({formatNumber(LOOT_FILTER_UNLOCK_COST)}g)
                            </button>
                        )}

                        <div className="h-4 w-px bg-slate-700 mx-2"></div>

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
                          const sellValue = mat.value * 5; // Sell in batches
                          
                          return (
                              <div key={matId} className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex flex-col gap-3 shadow-lg hover:border-slate-500 transition-colors group relative">
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
                                   
                                   {/* Simple Sell Button */}
                                   {count >= 5 && (
                                       <button 
                                            onClick={() => sellResource(matId, 5)}
                                            className="mt-2 text-[10px] w-full py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-400 flex items-center justify-center gap-1"
                                       >
                                           Sell 5 ({sellValue}g)
                                       </button>
                                   )}
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}

      {/* 3. WORKSHOP TAB */}
      {activeTab === 'WORKSHOP' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Sub-Tabs */}
              <div className="flex gap-4 mb-4">
                  <button 
                      onClick={() => setWorkshopTab('ALCHEMY')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${workshopTab === 'ALCHEMY' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                      <FlaskConical size={16} /> Alchemy
                  </button>
                  <button 
                      onClick={() => setWorkshopTab('SMITHING')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${workshopTab === 'SMITHING' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                      <Hammer size={16} /> Smithing
                  </button>
              </div>

              {workshopTab === 'ALCHEMY' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {CONSUMABLES.map(recipe => {
                          const canAfford = state.gold >= recipe.goldCost && checkResourceCost(state, recipe.cost);
                          
                          return (
                              <div key={recipe.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col justify-between">
                                  <div>
                                      <div className="flex justify-between items-start mb-2">
                                          <h4 className="font-bold text-slate-200">{recipe.name}</h4>
                                          <span className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                                              {(recipe.duration / 60000).toFixed(0)}m
                                          </span>
                                      </div>
                                      <p className="text-xs text-slate-400 mb-3 min-h-[32px]">{recipe.description}</p>
                                      
                                      <div className="bg-slate-900/50 p-2 rounded mb-3">
                                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Required</div>
                                          <div className={`flex items-center gap-2 text-xs font-mono mb-1 ${state.gold >= recipe.goldCost ? 'text-yellow-500' : 'text-slate-500'}`}>
                                              <Coins size={10} /> {formatNumber(recipe.goldCost)}g
                                          </div>
                                          {renderCost(recipe.cost)}
                                      </div>
                                  </div>
                                  
                                  <button
                                      onClick={() => craftConsumable(recipe.id)}
                                      disabled={!canAfford}
                                      className={`w-full py-2 rounded font-bold text-sm transition-all flex items-center justify-center gap-2
                                          ${canAfford 
                                              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20' 
                                              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                          }
                                      `}
                                  >
                                      <FlaskConical size={14} /> Brew
                                  </button>
                              </div>
                          )
                      })}
                  </div>
              )}

              {workshopTab === 'SMITHING' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {CRAFTING_RECIPES.map(recipe => {
                          const canAfford = state.gold >= recipe.goldCost && checkResourceCost(state, recipe.cost);
                          
                          return (
                              <div key={recipe.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col justify-between">
                                  <div>
                                      <div className="flex justify-between items-start mb-2">
                                          <h4 className={`font-bold ${RARITY_COLORS[recipe.targetRarity]}`}>{recipe.name}</h4>
                                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                                              Lvl {recipe.targetLevel}
                                          </span>
                                      </div>
                                      <p className="text-xs text-slate-400 mb-3 min-h-[32px]">{recipe.description}</p>
                                      
                                      <div className="bg-slate-900/50 p-2 rounded mb-3">
                                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Required</div>
                                          <div className={`flex items-center gap-2 text-xs font-mono mb-1 ${state.gold >= recipe.goldCost ? 'text-yellow-500' : 'text-slate-500'}`}>
                                              <Coins size={10} /> {formatNumber(recipe.goldCost)}g
                                          </div>
                                          {renderCost(recipe.cost)}
                                      </div>
                                  </div>
                                  
                                  <button
                                      onClick={() => craftEquipment(recipe.id)}
                                      disabled={!canAfford}
                                      className={`w-full py-2 rounded font-bold text-sm transition-all flex items-center justify-center gap-2
                                          ${canAfford 
                                              ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20' 
                                              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                          }
                                      `}
                                  >
                                      <Hammer size={14} /> Forge
                                  </button>
                              </div>
                          )
                      })}
                  </div>
              )}
          </div>
      )}

    </div>
  );
};
