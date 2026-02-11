
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
    GameState, Adventurer, Item, ItemType, Rarity, ActiveRun, 
    DungeonReport, LootFilterSettings, ContractType, RunSnapshot, AdventurerRole
} from '../types';
import { 
    INITIAL_GOLD, INVENTORY_SIZE, LOOT_FILTER_UNLOCK_COST, RARITY_ORDER, 
    UPGRADES, PRESTIGE_UPGRADES, DUNGEONS, ENEMIES, MATERIALS 
} from '../constants';
import { 
    generateAdventurer, generateItem, calculateRunSnapshot, 
    calculateDungeonDuration, calculateItemUpgradeCost, 
    calculateAdventurerPower, getStatBudget, generateRandomAffix, rollStatTier, generateSkillTree
} from '../utils/gameMath';

const INITIAL_STATE: GameState = {
  gold: INITIAL_GOLD,
  prestigeCurrency: 0,
  adventurers: [],
  inventory: [],
  materials: {},
  activeRuns: [],
  unlockedDungeons: ['rat_cellar', 'whispering_woods'],
  upgrades: {},
  prestigeUpgrades: {},
  lootFilter: {
      unlocked: false,
      enabled: false,
      minRarity: Rarity.COMMON,
      keepTypes: [ItemType.WEAPON, ItemType.ARMOR, ItemType.TRINKET],
      matchAnyStat: []
  },
  lastParties: {},
  recentReports: [],
  lastSaveTime: Date.now(),
  statistics: {
    totalGoldEarned: 0,
    monstersKilled: 0,
    dungeonsCleared: 0
  }
};

interface GameContextType {
  state: GameState;
  recruitAdventurer: () => void;
  renameAdventurer: (id: string, name: string) => void;
  startDungeon: (dungeonId: string, adventurerIds: string[], autoRepeat: boolean) => void;
  cancelDungeon: (runId: string) => void;
  stopRepeat: (runId: string) => void;
  salvageItem: (itemId: string) => void;
  salvageManyItems: (ids: string[]) => void;
  equipItem: (adventurerId: string, item: Item) => void;
  unequipItem: (adventurerId: string, slot: ItemType) => void;
  buyUpgrade: (id: string) => void;
  buyPrestigeUpgrade: (id: string) => void;
  doPrestige: () => void;
  unlockLootFilter: () => void;
  updateLootFilter: (settings: Partial<LootFilterSettings>) => void;
  enchantItem: (itemId: string) => void;
  rerollStat: (itemId: string, statIndex: number) => void;
  dismissReport: (reportId: string) => void;
  importSave: (json: string) => boolean;
  unlockSkill: (adventurerId: string, nodeId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('dungeon-contractor-save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_STATE, ...parsed };
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
    return INITIAL_STATE;
  });

  // Persist Save
  useEffect(() => {
    const timer = setInterval(() => {
        setState(prev => {
            const next = { ...prev, lastSaveTime: Date.now() };
            localStorage.setItem('dungeon-contractor-save', JSON.stringify(next));
            return next;
        });
    }, 10000); // Auto-save every 10s
    return () => clearInterval(timer);
  }, []);

  // Initialize with at least one adventurer if empty
  useEffect(() => {
      if (state.adventurers.length === 0) {
          // Hardcoded Starter to ensure Power = 25 (Warrior Base Stats)
          const { tree, archetype } = generateSkillTree(AdventurerRole.WARRIOR);
          const starter: Adventurer = {
              id: crypto.randomUUID(),
              name: "Eldric",
              title: "Squire",
              role: AdventurerRole.WARRIOR,
              rarity: Rarity.COMMON,
              level: 1,
              xp: 0,
              xpToNextLevel: 100,
              gatheringXp: 0,
              fishingXp: 0,
              traitId: 'scholar', // XP Bonus does not affect Power calculation
              skillPoints: 0,
              unlockedSkills: [],
              skillTree: tree,
              archetype: archetype,
              slots: { [ItemType.WEAPON]: null, [ItemType.ARMOR]: null, [ItemType.TRINKET]: null },
              baseStats: {
                  damage: 4,
                  health: 120,
                  speed: 0.9,
                  critChance: 0.05
              }
          };

          setState(prev => ({
              ...prev,
              adventurers: [starter]
          }));
      }
  }, []);

  // --- Actions ---

  const recruitAdventurer = useCallback(() => {
      setState(prev => {
          const cost = 100 * Math.pow(5, prev.adventurers.length - 1);
          if (prev.gold < cost) return prev;
          
          const newAdv = generateAdventurer(crypto.randomUUID());
          return {
              ...prev,
              gold: prev.gold - cost,
              adventurers: [...prev.adventurers, newAdv]
          };
      });
  }, []);

  const renameAdventurer = useCallback((id: string, name: string) => {
      setState(prev => ({
          ...prev,
          adventurers: prev.adventurers.map(a => a.id === id ? { ...a, name: name.slice(0, 20) } : a)
      }));
  }, []);

  const startDungeon = useCallback((dungeonId: string, adventurerIds: string[], autoRepeat: boolean) => {
      setState(prev => {
          const dungeon = DUNGEONS.find(d => d.id === dungeonId);
          if (!dungeon) return prev;

          // Snapshot calculations
          const snapshot = calculateRunSnapshot(adventurerIds, prev);
          const duration = calculateDungeonDuration(dungeon.durationSeconds * 1000, prev, adventurerIds);

          // Deep copy adventurer state for the snapshot
          const adventurerState: Record<string, Adventurer> = {};
          adventurerIds.forEach(id => {
              const adv = prev.adventurers.find(a => a.id === id);
              if (adv) adventurerState[id] = JSON.parse(JSON.stringify(adv));
          });

          const newRun: ActiveRun = {
              id: crypto.randomUUID(),
              dungeonId,
              adventurerIds,
              startTime: Date.now(),
              duration,
              runsRemaining: autoRepeat ? -1 : 1,
              totalRuns: 0,
              autoRepeat,
              snapshot,
              adventurerState,
              modifiedSlots: {} // Track changes
          };

          return {
              ...prev,
              activeRuns: [...prev.activeRuns, newRun],
              lastParties: {
                  ...prev.lastParties,
                  [dungeonId]: adventurerIds
              }
          };
      });
  }, []);

  const cancelDungeon = useCallback((runId: string) => {
      setState(prev => ({
          ...prev,
          activeRuns: prev.activeRuns.filter(r => r.id !== runId)
      }));
  }, []);

  const stopRepeat = useCallback((runId: string) => {
      setState(prev => ({
          ...prev,
          activeRuns: prev.activeRuns.map(r => r.id === runId ? { ...r, autoRepeat: false, runsRemaining: 1 } : r)
      }));
  }, []);

  const unlockLootFilter = useCallback(() => {
      setState(prev => {
          if (prev.gold < LOOT_FILTER_UNLOCK_COST) return prev;
          return {
              ...prev,
              gold: prev.gold - LOOT_FILTER_UNLOCK_COST,
              lootFilter: { ...prev.lootFilter, unlocked: true, enabled: true }
          };
      });
  }, []);

  const updateLootFilter = useCallback((settings: Partial<LootFilterSettings>) => {
      setState(prev => ({
          ...prev,
          lootFilter: { ...prev.lootFilter, ...settings }
      }));
  }, []);

  const salvageItem = useCallback((itemId: string) => {
      setState(prev => {
          const item = prev.inventory.find(i => i.id === itemId);
          if (!item) return prev;
          return {
              ...prev,
              gold: prev.gold + item.value,
              inventory: prev.inventory.filter(i => i.id !== itemId)
          };
      });
  }, []);

  const salvageManyItems = useCallback((ids: string[]) => {
      setState(prev => {
          const itemsToSalvage = prev.inventory.filter(i => ids.includes(i.id));
          const totalValue = itemsToSalvage.reduce((sum, i) => sum + i.value, 0);
          return {
              ...prev,
              gold: prev.gold + totalValue,
              inventory: prev.inventory.filter(i => !ids.includes(i.id))
          };
      });
  }, []);

  const equipItem = useCallback((adventurerId: string, item: Item) => {
      setState(prev => {
          const advIndex = prev.adventurers.findIndex(a => a.id === adventurerId);
          if (advIndex === -1) return prev;
          
          const adv = { ...prev.adventurers[advIndex] };
          const oldItem = adv.slots[item.type];
          
          // Remove from inventory
          let newInventory = prev.inventory.filter(i => i.id !== item.id);
          
          // Return old item to inventory
          if (oldItem) {
              newInventory.push(oldItem);
          }

          // Update Adventurer
          adv.slots = { ...adv.slots, [item.type]: item };
          const newAdventurers = [...prev.adventurers];
          newAdventurers[advIndex] = adv;

          // Track modification if adventurer is busy
          const activeRuns = prev.activeRuns.map(run => {
              if (run.adventurerIds.includes(adventurerId)) {
                  const currentMods = run.modifiedSlots?.[adventurerId] || [];
                  if (!currentMods.includes(item.type)) {
                      return {
                          ...run,
                          modifiedSlots: {
                              ...run.modifiedSlots,
                              [adventurerId]: [...currentMods, item.type]
                          }
                      };
                  }
              }
              return run;
          });

          return {
              ...prev,
              adventurers: newAdventurers,
              inventory: newInventory,
              activeRuns
          };
      });
  }, []);

  const unequipItem = useCallback((adventurerId: string, slot: ItemType) => {
      setState(prev => {
          const advIndex = prev.adventurers.findIndex(a => a.id === adventurerId);
          if (advIndex === -1) return prev;
          
          const adv = { ...prev.adventurers[advIndex] };
          const item = adv.slots[slot];
          if (!item) return prev;

          // Check inventory space
          if (prev.inventory.length >= INVENTORY_SIZE) return prev;

          adv.slots = { ...adv.slots, [slot]: null };
          const newAdventurers = [...prev.adventurers];
          newAdventurers[advIndex] = adv;

          // Track modification
          const activeRuns = prev.activeRuns.map(run => {
              if (run.adventurerIds.includes(adventurerId)) {
                  const currentMods = run.modifiedSlots?.[adventurerId] || [];
                  if (!currentMods.includes(slot)) {
                      return {
                          ...run,
                          modifiedSlots: {
                              ...run.modifiedSlots,
                              [adventurerId]: [...currentMods, slot]
                          }
                      };
                  }
              }
              return run;
          });

          return {
              ...prev,
              adventurers: newAdventurers,
              inventory: [...prev.inventory, item],
              activeRuns
          };
      });
  }, []);

  const buyUpgrade = useCallback((id: string) => {
      setState(prev => {
          const upgrade = UPGRADES.find(u => u.id === id);
          if (!upgrade) return prev;
          
          const currentLevel = prev.upgrades[id] || 0;
          if (currentLevel >= upgrade.maxLevel) return prev;

          const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, currentLevel));
          if (prev.gold < cost) return prev;

          return {
              ...prev,
              gold: prev.gold - cost,
              upgrades: { ...prev.upgrades, [id]: currentLevel + 1 }
          };
      });
  }, []);

  const buyPrestigeUpgrade = useCallback((id: string) => {
      setState(prev => {
          const upgrade = PRESTIGE_UPGRADES.find(u => u.id === id);
          if (!upgrade) return prev;
          
          const currentLevel = prev.prestigeUpgrades[id] || 0;
          if (currentLevel >= upgrade.maxLevel) return prev;

          const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, currentLevel));
          if (prev.prestigeCurrency < cost) return prev;

          return {
              ...prev,
              prestigeCurrency: prev.prestigeCurrency - cost,
              prestigeUpgrades: { ...prev.prestigeUpgrades, [id]: currentLevel + 1 }
          };
      });
  }, []);

  const doPrestige = useCallback(() => {
      setState(prev => {
          // Calculate currency gain
          const gain = Math.floor(Math.sqrt(prev.statistics.totalGoldEarned / 10000));
          if (gain <= 0) return prev;

          return {
              ...INITIAL_STATE,
              prestigeCurrency: prev.prestigeCurrency + gain,
              prestigeUpgrades: prev.prestigeUpgrades, // Keep prestige upgrades
              statistics: {
                  ...INITIAL_STATE.statistics,
                  totalGoldEarned: 0 // Reset for next run
              }
          };
      });
  }, []);

  const enchantItem = useCallback((itemId: string) => {
      setState(prev => {
          // Find item in inventory or adventurers
          let item = prev.inventory.find(i => i.id === itemId);
          let location: 'INVENTORY' | 'ADVENTURER' = 'INVENTORY';
          let holderId = '';
          
          if (!item) {
              for (const adv of prev.adventurers) {
                  const found = Object.values(adv.slots).find((s: Item | null) => s && s.id === itemId);
                  if (found) {
                      item = found;
                      location = 'ADVENTURER';
                      holderId = adv.id;
                      break;
                  }
              }
          }
          if (!item) return prev;

          const cost = calculateItemUpgradeCost(item, 'ENCHANT');
          if (prev.gold < cost) return prev;

          // Logic to add random stat
          const newItem = { ...item, stats: [...item.stats] };
          const existingNames = newItem.stats.map(s => s.name);
          const newStat = generateRandomAffix(newItem.level, newItem.rarity, existingNames);
          newItem.stats.push(newStat);

          // Update State
          const nextState = { ...prev, gold: prev.gold - cost };
          if (location === 'INVENTORY') {
              nextState.inventory = prev.inventory.map(i => i.id === itemId ? newItem : i);
          } else {
              nextState.adventurers = prev.adventurers.map(a => {
                  if (a.id === holderId) {
                      const newSlots = { ...a.slots };
                      (Object.keys(newSlots) as ItemType[]).forEach(k => {
                          if (newSlots[k]?.id === itemId) newSlots[k] = newItem;
                      });
                      return { ...a, slots: newSlots };
                  }
                  return a;
              });
          }
          return nextState;
      });
  }, []);

  const rerollStat = useCallback((itemId: string, statIndex: number) => {
      setState(prev => {
          let item = prev.inventory.find(i => i.id === itemId);
          let location: 'INVENTORY' | 'ADVENTURER' = 'INVENTORY';
          let holderId = '';
          
          if (!item) {
              for (const adv of prev.adventurers) {
                  const found = Object.values(adv.slots).find((s: Item | null) => s && s.id === itemId);
                  if (found) {
                      item = found;
                      location = 'ADVENTURER';
                      holderId = adv.id;
                      break;
                  }
              }
          }
          if (!item || !item.stats[statIndex]) return prev;

          const cost = calculateItemUpgradeCost(item, 'REROLL');
          if (prev.gold < cost) return prev;

          // Reroll Logic
          const newItem = { ...item, stats: [...item.stats] };
          const oldStat = newItem.stats[statIndex];
          
          // Generate new budget/tier
          const budget = getStatBudget(newItem.level, newItem.rarity, prev.prestigeUpgrades);
          const newTier = rollStatTier();
          
          // Re-calculate value based on tier
          
          let newVal = 0;
          if (statIndex === 0) {
               // Main stat logic from generateItem
               const budget = getStatBudget(newItem.level, newItem.rarity, prev.prestigeUpgrades);
               const tierMult = {1:2.0, 2:1.6, 3:1.35, 4:1.15, 5:1.0, 6:0.85, 7:0.65}[newTier] || 1.0;
               newVal = Math.round(budget * tierMult);
               if (newItem.type === ItemType.ARMOR) newVal *= 5; // Health scaling
               
               newItem.stats[statIndex] = { ...oldStat, value: Math.max(1, newVal), tier: newTier };
          } else {
               // Affix
               const newAffix = generateRandomAffix(newItem.level, newItem.rarity, []);
               newItem.stats[statIndex] = newAffix; 
          }

          const nextState = { ...prev, gold: prev.gold - cost };
          if (location === 'INVENTORY') {
              nextState.inventory = prev.inventory.map(i => i.id === itemId ? newItem : i);
          } else {
              nextState.adventurers = prev.adventurers.map(a => {
                  if (a.id === holderId) {
                      const newSlots = { ...a.slots };
                      (Object.keys(newSlots) as ItemType[]).forEach(k => {
                          if (newSlots[k]?.id === itemId) newSlots[k] = newItem;
                      });
                      return { ...a, slots: newSlots };
                  }
                  return a;
              });
          }
          return nextState;
      });
  }, []);

  const dismissReport = useCallback((id: string) => {
      setState(prev => ({
          ...prev,
          recentReports: prev.recentReports.filter(r => r.id !== id)
      }));
  }, []);

  const importSave = useCallback((json: string) => {
      try {
          const parsed = JSON.parse(json);
          // Basic validation could go here
          if (!parsed.gold || !parsed.adventurers) return false;
          setState({ ...INITIAL_STATE, ...parsed });
          return true;
      } catch (e) {
          return false;
      }
  }, []);

  const unlockSkill = useCallback((adventurerId: string, nodeId: string) => {
      setState(prev => {
          const advIndex = prev.adventurers.findIndex(a => a.id === adventurerId);
          if (advIndex === -1) return prev;
          
          const adv = prev.adventurers[advIndex];
          const node = adv.skillTree?.find(n => n.id === nodeId);
          if (!node) return prev;

          if (adv.skillPoints < node.cost) return prev;
          if (adv.unlockedSkills.includes(nodeId)) return prev;

          const newAdv = {
              ...adv,
              skillPoints: adv.skillPoints - node.cost,
              unlockedSkills: [...adv.unlockedSkills, nodeId]
          };

          const newAdventurers = [...prev.adventurers];
          newAdventurers[advIndex] = newAdv;
          
          return {
              ...prev,
              adventurers: newAdventurers
          };
      });
  }, []);

  // --- Game Loop ---
  useEffect(() => {
    const loop = setInterval(() => {
        setState(prev => {
            const now = Date.now();
            let hasChanges = false;
            let nextState = { ...prev };
            
            // 1. Process Finished Runs
            const finishedRuns = prev.activeRuns.filter(r => now >= r.startTime + r.duration);
            
            if (finishedRuns.length > 0) {
                hasChanges = true;
                const newReports: DungeonReport[] = [];
                let goldGained = 0;
                let itemsToAdd: Item[] = [];
                const materialsToAdd: Record<string, number> = {};

                // Process each finished run
                finishedRuns.forEach(run => {
                    const dungeon = DUNGEONS.find(d => d.id === run.dungeonId);
                    if (!dungeon) return;

                    const enemy = ENEMIES[dungeon.enemyId];
                    const snapshot = run.snapshot;
                    
                    // Rewards
                    const baseGold = Math.floor(enemy.goldMin + Math.random() * (enemy.goldMax - enemy.goldMin));
                    const baseXp = Math.floor(enemy.xpMin + Math.random() * (enemy.xpMax - enemy.xpMin));
                    
                    // Modifiers (e.g. Overpowered penalty)
                    const isOverpowered = snapshot.power > (dungeon.recommendedPower * 3);
                    
                    let finalGold = baseGold * (1 + snapshot.goldBonus);
                    let finalXp = baseXp * (1 + snapshot.xpBonus);

                    if (isOverpowered && dungeon.type === ContractType.DUNGEON) {
                        finalGold = enemy.goldMin * (1 + snapshot.goldBonus);
                        finalXp = finalXp * 0.10;
                    }

                    goldGained += finalGold;

                    // Distribute XP
                    nextState.adventurers = nextState.adventurers.map(a => {
                        if (run.adventurerIds.includes(a.id)) {
                            let newXp = a.xp + Math.floor(finalXp / run.adventurerIds.length);
                            let newLevel = a.level;
                            let newPoints = a.skillPoints;
                            
                            // Level Up Logic
                            while (newXp >= a.xpToNextLevel) {
                                newXp -= a.xpToNextLevel;
                                newLevel++;
                                // Skill Point Logic: +1 every 3 levels starting at 5
                                if (newLevel >= 5 && (newLevel - 5) % 3 === 0) {
                                    newPoints++; 
                                } else if (newLevel === 5) {
                                    newPoints++;
                                }
                                // Update XP Req (Simple curve)
                                // a.xpToNextLevel = Math.floor(100 * Math.pow(1.1, newLevel - 1));
                            }
                            // Recalculate req for next frame/render
                            const nextReq = Math.floor(100 * Math.pow(1.15, newLevel - 1));

                            return { 
                                ...a, 
                                xp: newXp, 
                                level: newLevel, 
                                xpToNextLevel: nextReq,
                                skillPoints: newPoints
                            };
                        }
                        return a;
                    });

                    // Item/Material Generation
                    let runItems: Item[] = [];
                    const runMaterials: Record<string, number> = {};

                    // Number of "Rolls" or "Kills"
                    let rolls = 1;
                    if (dungeon.type === ContractType.DUNGEON) {
                         const kills = Math.floor((snapshot.dps * (dungeon.durationSeconds)) / enemy.hp);
                         rolls = Math.max(1, kills);
                    } else {
                         rolls = Math.floor(dungeon.durationSeconds / 5); 
                    }
                    
                    // Modifiers affecting rolls
                    const lootBonus = snapshot.lootBonus; 
                    const adjustedTotalRolls = Math.max(1, Math.floor(rolls)); 
                    
                    // Filter Logic Helpers
                    const filter = prev.lootFilter; 
                    const isFilterActive = filter.unlocked && filter.enabled;
                    const thresholdValue = RARITY_ORDER[filter.minRarity];

                    const checkFilter = (item: Item): boolean => {
                        if (!isFilterActive) return true;
                        
                        // 1. Stat Whitelist (Rescue)
                        if (filter.matchAnyStat && filter.matchAnyStat.length > 0) {
                            const hasMatchedStat = item.stats.some(s => filter.matchAnyStat.includes(s.name));
                            if (hasMatchedStat) return true;
                        }

                        // 2. Check Rarity
                        const itemRarityValue = RARITY_ORDER[item.rarity];
                        if (itemRarityValue <= thresholdValue) return false;

                        // 3. Check Type
                        if (!filter.keepTypes.includes(item.type)) return false;

                        return true;
                    };

                    let autoSalvagedCount = 0;
                    let autoSalvagedGold = 0;

                    for (let i = 0; i < adjustedTotalRolls; i++) {
                        // Drop Check
                        const roll = Math.random();
                        const chance = dungeon.dropChance * (1 + lootBonus);
                        
                        if (roll < chance) {
                            if (dungeon.type === ContractType.DUNGEON) {
                                const newItem = generateItem(dungeon.level, prev.prestigeUpgrades);
                                if (checkFilter(newItem)) {
                                    runItems.push(newItem);
                                } else {
                                    autoSalvagedCount++;
                                    autoSalvagedGold += newItem.value;
                                }
                            } else {
                                if (dungeon.lootTable) {
                                    const matId = dungeon.lootTable[Math.floor(Math.random() * dungeon.lootTable.length)];
                                    runMaterials[matId] = (runMaterials[matId] || 0) + 1;
                                }
                            }
                        }
                    }

                    // Add to aggregated lists
                    itemsToAdd = [...itemsToAdd, ...runItems];
                    goldGained += autoSalvagedGold; // Add salvage gold
                    Object.entries(runMaterials).forEach(([k, v]) => {
                        materialsToAdd[k] = (materialsToAdd[k] || 0) + v;
                    });

                    newReports.push({
                        id: crypto.randomUUID(),
                        dungeonName: dungeon.name,
                        success: true,
                        kills: rolls, // approx
                        goldEarned: Math.floor(finalGold),
                        xpEarned: Math.floor(finalXp),
                        itemsFound: runItems,
                        materialsFound: runMaterials,
                        autoSalvagedCount,
                        autoSalvagedGold,
                        timestamp: now
                    });
                });

                // Update Statistics
                nextState.statistics.totalGoldEarned += goldGained;
                nextState.statistics.dungeonsCleared += finishedRuns.length;
                
                // Update Inventory
                const space = INVENTORY_SIZE - prev.inventory.length;
                if (itemsToAdd.length > space) {
                    itemsToAdd = itemsToAdd.slice(0, space);
                }
                nextState.inventory = [...prev.inventory, ...itemsToAdd];
                nextState.gold += goldGained;

                // Update Materials
                Object.entries(materialsToAdd).forEach(([k, v]) => {
                    nextState.materials[k] = (nextState.materials[k] || 0) + v;
                });

                // Update Reports (Keep last 5)
                nextState.recentReports = [...newReports, ...prev.recentReports].slice(0, 5);

                // Handle Repeats
                const ongoingRuns: ActiveRun[] = [];
                prev.activeRuns.forEach(r => {
                    if (finishedRuns.find(fr => fr.id === r.id)) {
                        // This run finished
                        if (r.autoRepeat) {
                             const dungeon = DUNGEONS.find(d => d.id === r.dungeonId);
                             
                             if (dungeon) {
                                 // Regenerate Snapshot using nextState (updated levels/stats)
                                 const snapshot = calculateRunSnapshot(r.adventurerIds, nextState);
                                 
                                 // Regenerate Adventurer State (Snapshot) with updated gear/levels
                                 const adventurerState: Record<string, Adventurer> = {};
                                 r.adventurerIds.forEach(id => {
                                     const adv = nextState.adventurers.find(a => a.id === id);
                                     if (adv) adventurerState[id] = JSON.parse(JSON.stringify(adv));
                                 });

                                 // Recalculate Duration (if skills/speed changed)
                                 const duration = calculateDungeonDuration(dungeon.durationSeconds * 1000, nextState, r.adventurerIds);

                                // Restart with FRESH snapshot and empty modifiedSlots
                                const newRun: ActiveRun = {
                                    id: crypto.randomUUID(),
                                    dungeonId: r.dungeonId,
                                    adventurerIds: r.adventurerIds,
                                    startTime: now,
                                    duration: duration,
                                    runsRemaining: -1,
                                    totalRuns: r.totalRuns + 1,
                                    autoRepeat: true,
                                    snapshot: snapshot,
                                    adventurerState: adventurerState,
                                    modifiedSlots: {} // Reset pending modifications
                                };
                                ongoingRuns.push(newRun);
                             } else {
                                 // Fail-safe if dungeon somehow missing
                                 ongoingRuns.push(r);
                             }
                        }
                    } else {
                        // Still running
                        ongoingRuns.push(r);
                    }
                });
                
                nextState.activeRuns = ongoingRuns;
            }

            return hasChanges ? nextState : prev;
        });
    }, 1000); // 1s Tick

    return () => clearInterval(loop);
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      recruitAdventurer,
      renameAdventurer,
      startDungeon,
      cancelDungeon,
      stopRepeat,
      salvageItem,
      salvageManyItems,
      equipItem,
      unequipItem,
      buyUpgrade,
      buyPrestigeUpgrade,
      doPrestige,
      unlockLootFilter,
      updateLootFilter,
      enchantItem,
      rerollStat,
      dismissReport,
      importSave,
      unlockSkill
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
