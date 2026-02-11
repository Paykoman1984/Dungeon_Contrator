
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
    GameState, Adventurer, Item, ItemType, Rarity, ActiveRun, 
    DungeonReport, LootFilterSettings, ContractType, RunSnapshot, AdventurerRole
} from '../types';
import { 
    INITIAL_GOLD, INVENTORY_SIZE, LOOT_FILTER_UNLOCK_COST, RARITY_ORDER, 
    UPGRADES, PRESTIGE_UPGRADES, DUNGEONS, ENEMIES, MATERIALS, TAVERN_CONFIG, REALM_MODIFIERS
} from '../constants';
import { 
    generateCandidate, generateItem, calculateRunSnapshot, 
    calculateDungeonDuration, calculateItemUpgradeCost, 
    calculateAdventurerPower, getStatBudget, generateRandomAffix, rollStatTier, generateSkillTree, calculateTotalSkillPoints,
    calculateDropChance, calculateRarityWeights, rollRarity, checkDungeonUnlock, getRealmBonuses, calculateRealmXpRequired, calculateEffectiveDungeonStats, processXpGain, calculateXpRequired
} from '../utils/gameMath';

const INITIAL_STATE: GameState = {
  gold: INITIAL_GOLD,
  prestigeCurrency: 0,
  ascensionCount: 0,
  adventurers: [],
  recruitmentPool: [], 
  refreshCost: TAVERN_CONFIG.baseRefreshCost,
  inventory: [],
  materials: {},
  activeRuns: [],
  unlockedDungeons: ['rat_cellar', 'whispering_woods'],
  upgrades: {},
  prestigeUpgrades: {},
  guildMastery: {
      combat: { level: 1, xp: 0 },
      gathering: { level: 1, xp: 0 },
      fishing: { level: 1, xp: 0 }
  },
  // --- REALM STATE INIT ---
  realm: {
      realmRank: 0,
      realmExperience: 0,
      activeModifiers: {}
  },
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
    dungeonsCleared: 0,
    dungeonClears: {}
  },
  legendaryPityCounter: 0
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
  respecAdventurer: (adventurerId: string) => void;
  refreshTavern: () => void;
  hireAdventurer: (candidateId: string) => void;
  toggleDungeonModifier: (dungeonId: string, modifierId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('dungeon-contractor-save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
            ...INITIAL_STATE, 
            ...parsed, 
            statistics: { ...INITIAL_STATE.statistics, ...parsed.statistics },
            legendaryPityCounter: parsed.legendaryPityCounter || 0,
            ascensionCount: parsed.ascensionCount || 0,
            unlockedDungeons: parsed.unlockedDungeons || INITIAL_STATE.unlockedDungeons,
            recruitmentPool: parsed.recruitmentPool || [],
            refreshCost: parsed.refreshCost || TAVERN_CONFIG.baseRefreshCost,
            // Ensure realm state exists for old saves
            realm: parsed.realm || INITIAL_STATE.realm,
            // Ensure mastery state exists for old saves
            guildMastery: parsed.guildMastery || INITIAL_STATE.guildMastery
        };
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
    }, 10000); 
    return () => clearInterval(timer);
  }, []);

  // Initialize checks
  useEffect(() => {
      setState(prev => {
          let updates: Partial<GameState> = {};
          
          if (prev.recruitmentPool.length === 0) {
              const pool = [];
              for(let i=0; i<TAVERN_CONFIG.poolSize; i++) {
                  pool.push(generateCandidate());
              }
              updates.recruitmentPool = pool;
          }

          if (prev.adventurers.length === 0) {
              const starter = generateCandidate(AdventurerRole.WARRIOR);
              starter.rarity = Rarity.UNCOMMON; 
              starter.baseStats.health += 50; 
              updates.adventurers = [starter];
          }

          if (Object.keys(updates).length > 0) {
              return { ...prev, ...updates };
          }
          return prev;
      });
  }, []);

  // --- Actions ---

  const recruitAdventurer = useCallback(() => {
      console.warn("Direct recruit deprecated. Use hireAdventurer.");
  }, []);

  const refreshTavern = useCallback(() => {
      setState(prev => {
          if (prev.gold < prev.refreshCost) return prev;
          
          const newPool = [];
          for(let i=0; i<TAVERN_CONFIG.poolSize; i++) {
              newPool.push(generateCandidate());
          }

          return {
              ...prev,
              gold: prev.gold - prev.refreshCost,
              refreshCost: Math.floor(prev.refreshCost * 1.5),
              recruitmentPool: newPool
          };
      });
  }, []);

  const hireAdventurer = useCallback((candidateId: string) => {
      setState(prev => {
          const candidate = prev.recruitmentPool.find(c => c.id === candidateId);
          if (!candidate) return prev;

          const hireCost = 100 * Math.pow(5, prev.adventurers.length);
          if (prev.gold < hireCost) return prev;

          const newAdventurers = [...prev.adventurers, candidate];
          
          const newPool: Adventurer[] = []; 
          for(let i=0; i<TAVERN_CONFIG.poolSize; i++) {
              newPool.push(generateCandidate());
          }

          return {
              ...prev,
              gold: prev.gold - hireCost,
              adventurers: newAdventurers,
              recruitmentPool: newPool,
              refreshCost: TAVERN_CONFIG.baseRefreshCost
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

          const snapshot = calculateRunSnapshot(adventurerIds, prev);
          const duration = calculateDungeonDuration(dungeon.durationSeconds * 1000, prev, adventurerIds);

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
              modifiedSlots: {} 
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
          
          let newInventory = prev.inventory.filter(i => i.id !== item.id);
          
          if (oldItem) {
              newInventory.push(oldItem);
          }

          adv.slots = { ...adv.slots, [item.type]: item };
          const newAdventurers = [...prev.adventurers];
          newAdventurers[advIndex] = adv;

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

          if (prev.inventory.length >= INVENTORY_SIZE) return prev;

          adv.slots = { ...adv.slots, [slot]: null };
          const newAdventurers = [...prev.adventurers];
          newAdventurers[advIndex] = adv;

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
          const gain = Math.floor(Math.sqrt(prev.statistics.totalGoldEarned / 10000));
          if (gain <= 0) return prev;

          const retainedGold = Math.floor(prev.gold * 0.10);

          // Meta State (Persists)
          const nextMetaState = {
              prestigeCurrency: prev.prestigeCurrency + gain,
              ascensionCount: (prev.ascensionCount || 0) + 1,
              unlockedDungeons: prev.unlockedDungeons, 
              prestigeUpgrades: prev.prestigeUpgrades, 
              // Realm State persists through ascension
              realm: prev.realm,
              // Mastery State persists through ascension (NEW)
              guildMastery: prev.guildMastery,
              statistics: {
                  ...prev.statistics,
                  dungeonClears: prev.statistics.dungeonClears
              }
          };

          return {
              ...INITIAL_STATE, // Reset Run State
              ...nextMetaState, // Apply Meta State
              gold: retainedGold + INITIAL_GOLD,
              lootFilter: prev.lootFilter,
              recruitmentPool: [],
              refreshCost: TAVERN_CONFIG.baseRefreshCost
          };
      });
  }, []);

  const enchantItem = useCallback((itemId: string) => {
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
          if (!item) return prev;

          const cost = calculateItemUpgradeCost(item, 'ENCHANT');
          if (prev.gold < cost) return prev;

          const newItem = { ...item, stats: [...item.stats] };
          const existingNames = newItem.stats.map(s => s.name);
          const newStat = generateRandomAffix(newItem.level, newItem.rarity, existingNames);
          newItem.stats.push(newStat);

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

          const newItem = { ...item, stats: [...item.stats] };
          const oldStat = newItem.stats[statIndex];
          
          const budget = getStatBudget(newItem.level, newItem.rarity, prev.prestigeUpgrades);
          const newTier = rollStatTier();
          
          let newVal = 0;
          if (statIndex === 0) {
               const tierMult = {1:2.0, 2:1.6, 3:1.35, 4:1.15, 5:1.0, 6:0.85, 7:0.65}[newTier] || 1.0;
               newVal = Math.round(budget * tierMult);
               if (newItem.type === ItemType.ARMOR) newVal *= 5; 
               
               newItem.stats[statIndex] = { ...oldStat, value: Math.max(1, newVal), tier: newTier };
          } else {
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

          if (node.requires.length > 0) {
              const meetsReqs = node.requires.some(req => adv.unlockedSkills.includes(req));
              if (!meetsReqs) return prev;
          }

          if (node.exclusiveGroup) {
              const groupLocked = adv.unlockedSkills.some(id => {
                  const s = adv.skillTree.find(n => n.id === id);
                  return s && s.exclusiveGroup === node.exclusiveGroup;
              });
              if (groupLocked) return prev; 
          }

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

  const respecAdventurer = useCallback((adventurerId: string) => {
      setState(prev => {
          const advIndex = prev.adventurers.findIndex(a => a.id === adventurerId);
          if (advIndex === -1) return prev;
          
          const adv = prev.adventurers[advIndex];
          const respecCost = adv.level * 100;

          if (prev.gold < respecCost) return prev;

          const totalPoints = calculateTotalSkillPoints(adv.level);

          const newAdv = {
              ...adv,
              unlockedSkills: [],
              skillPoints: totalPoints
          };

          const newAdventurers = [...prev.adventurers];
          newAdventurers[advIndex] = newAdv;

          return {
              ...prev,
              gold: prev.gold - respecCost,
              adventurers: newAdventurers
          };
      });
  }, []);

  const toggleDungeonModifier = useCallback((dungeonId: string, modifierId: string) => {
      setState(prev => {
          const currentMods = prev.realm.activeModifiers[dungeonId] || [];
          const exists = currentMods.includes(modifierId);
          
          let newMods;
          if (exists) {
              newMods = currentMods.filter(id => id !== modifierId);
          } else {
              // Validate unlock rank
              const mod = REALM_MODIFIERS.find(m => m.id === modifierId);
              if (!mod || prev.realm.realmRank < mod.unlockRank) return prev;
              newMods = [...currentMods, modifierId];
          }

          return {
              ...prev,
              realm: {
                  ...prev.realm,
                  activeModifiers: {
                      ...prev.realm.activeModifiers,
                      [dungeonId]: newMods
                  }
              }
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
            
            // 0. Unlock Checks
            const newlyUnlocked: string[] = [];
            DUNGEONS.forEach(d => {
                if (!prev.unlockedDungeons.includes(d.id)) {
                    if (checkDungeonUnlock(d, prev)) {
                        newlyUnlocked.push(d.id);
                    }
                }
            });

            if (newlyUnlocked.length > 0) {
                hasChanges = true;
                nextState.unlockedDungeons = [...prev.unlockedDungeons, ...newlyUnlocked];
            }

            // 1. Process Finished Runs
            const finishedRuns = prev.activeRuns.filter(r => now >= r.startTime + r.duration);
            
            if (finishedRuns.length > 0) {
                hasChanges = true;
                const newReports: DungeonReport[] = [];
                let goldGained = 0;
                let itemsToAdd: Item[] = [];
                const materialsToAdd: Record<string, number> = {};
                let pityCounter = prev.legendaryPityCounter || 0;
                const newClears = { ...prev.statistics.dungeonClears };
                
                // Mastery XP Buffer
                const earnedMasteryXp = { combat: 0, gathering: 0, fishing: 0 };
                
                // Realm XP Accumulation
                let realmXpGained = 0;

                finishedRuns.forEach(run => {
                    const dungeon = DUNGEONS.find(d => d.id === run.dungeonId);
                    if (!dungeon) return;

                    const enemy = ENEMIES[dungeon.enemyId];
                    const snapshot = run.snapshot;
                    const contractType = dungeon.type;

                    // Realm Logic: Calculate Effective Difficulty for Rewards
                    const realmStats = calculateEffectiveDungeonStats(dungeon, prev.realm, prev);
                    const realmBonuses = getRealmBonuses(prev.realm, dungeon.id);

                    // Update Clear Counts
                    newClears[dungeon.id] = (newClears[dungeon.id] || 0) + 1;

                    // Rewards
                    const isOverpowered = snapshot.power > (realmStats.recommendedPower * 3);
                    let finalGold = 0;
                    let finalXp = 0;
                    let runItems: Item[] = [];
                    const runMaterials: Record<string, number> = {};
                    let kills = 0;

                    if (contractType === ContractType.DUNGEON) {
                        kills = Math.floor((snapshot.dps * (dungeon.durationSeconds)) / enemy.hp);
                        kills = Math.max(1, kills);

                        const rawXp = (enemy.xpMin + Math.random() * (enemy.xpMax - enemy.xpMin)) * kills;
                        const rawGold = (enemy.goldMin + Math.random() * (enemy.goldMax - enemy.goldMin)) * kills;

                        // Apply Realm Multipliers
                        finalXp = rawXp * (1 + snapshot.xpBonus) * realmStats.lootMultiplier;
                        finalGold = rawGold * (1 + snapshot.goldBonus) * realmStats.lootMultiplier;

                        if (isOverpowered) {
                            finalXp *= 0.10;
                            finalGold = (enemy.goldMin * kills) * (1 + snapshot.goldBonus) * realmStats.lootMultiplier; 
                        }
                        finalXp = Math.max(kills, Math.floor(finalXp));

                        // Loot System with Extra Rolls
                        const guildLootBonus = snapshot.lootBonus; 
                        const efficiency = snapshot.dps;
                        const dropChance = calculateDropChance(guildLootBonus, efficiency);
                        
                        // Realm Extra Rolls
                        const totalRolls = 1 + Math.floor(realmBonuses.additionalDropRollChance);
                        const remainderChance = realmBonuses.additionalDropRollChance % 1;
                        const actualRolls = totalRolls + (Math.random() < remainderChance ? 1 : 0);

                        for(let r=0; r<actualRolls; r++) {
                            if (Math.random() < dropChance) {
                                 const rarityWeights = calculateRarityWeights(
                                     dungeon.level, 
                                     snapshot.lootBonus, 
                                     pityCounter,
                                     prev.ascensionCount || 0,
                                     prev.realm,
                                     dungeon.id
                                 );
                                 
                                 const rarity = rollRarity(rarityWeights);

                                 if (rarity === Rarity.LEGENDARY) {
                                     pityCounter = 0;
                                 } else {
                                     pityCounter++;
                                 }

                                 runItems.push(generateItem(dungeon.level, rarity, prev.prestigeUpgrades));
                            }
                        }

                        // Award Realm XP (Simulated based on dungeon tier)
                        realmXpGained += dungeon.tier * 5;
                        earnedMasteryXp.combat += Math.floor(finalXp * 0.1); // 10% of Adv XP goes to Mastery

                    } else {
                        // GATHERING / FISHING
                        const rolls = Math.floor(dungeon.durationSeconds / 5);
                        kills = Math.max(1, rolls);
                        
                        const rawXp = (enemy.xpMin + Math.random() * (enemy.xpMax - enemy.xpMin)) * rolls;
                        finalXp = Math.floor(rawXp * (1 + snapshot.xpBonus) * realmStats.lootMultiplier);

                        const lootBonus = snapshot.lootBonus;

                        for (let i = 0; i < rolls; i++) {
                            const roll = Math.random();
                            const chance = dungeon.dropChance * (1 + lootBonus);
                            
                            if (roll < chance) {
                                if (dungeon.lootTable) {
                                    const matId = dungeon.lootTable[Math.floor(Math.random() * dungeon.lootTable.length)];
                                    runMaterials[matId] = (runMaterials[matId] || 0) + 1;
                                }
                            }
                        }
                        
                        realmXpGained += dungeon.tier * 2; // Less XP for gathering
                        
                        if (contractType === ContractType.GATHERING) earnedMasteryXp.gathering += Math.floor(finalXp * 0.1);
                        if (contractType === ContractType.FISHING) earnedMasteryXp.fishing += Math.floor(finalXp * 0.1);
                    }

                    goldGained += Math.floor(finalGold);

                    // Distribute XP to Adventurers (Multi-Layer)
                    nextState.adventurers = nextState.adventurers.map(a => {
                        if (run.adventurerIds.includes(a.id)) {
                            const share = finalXp / run.adventurerIds.length;
                            const shareAmount = share > 0 && share < 1 ? 1 : Math.floor(share);

                            // Branch based on contract type
                            if (contractType === ContractType.DUNGEON) {
                                const result = processXpGain(a.level, a.xp, shareAmount, 'ADVENTURER');
                                let newPoints = a.skillPoints;
                                
                                // Grant skill points for levels gained (simplified logic for now)
                                for(let i = 0; i < result.levelsGained; i++) {
                                    const reachedLevel = a.level + i + 1;
                                    if (reachedLevel >= 5 && (reachedLevel - 5) % 3 === 0) newPoints++;
                                    else if (reachedLevel === 5) newPoints++;
                                }

                                return { 
                                    ...a, 
                                    xp: result.newXp, 
                                    level: result.newLevel, 
                                    xpToNextLevel: result.nextRequired,
                                    skillPoints: newPoints
                                };
                            } else if (contractType === ContractType.GATHERING) {
                                const result = processXpGain(a.gatheringLevel || 1, a.gatheringXp || 0, shareAmount, 'ADVENTURER');
                                return {
                                    ...a,
                                    gatheringLevel: result.newLevel,
                                    gatheringXp: result.newXp
                                };
                            } else if (contractType === ContractType.FISHING) {
                                const result = processXpGain(a.fishingLevel || 1, a.fishingXp || 0, shareAmount, 'ADVENTURER');
                                return {
                                    ...a,
                                    fishingLevel: result.newLevel,
                                    fishingXp: result.newXp
                                };
                            }
                        }
                        return a;
                    });

                    // Filter Logic
                    const filter = prev.lootFilter; 
                    const isFilterActive = filter.unlocked && filter.enabled;
                    const thresholdValue = RARITY_ORDER[filter.minRarity];

                    const checkFilter = (item: Item): boolean => {
                        if (!isFilterActive) return true;
                        if (filter.matchAnyStat && filter.matchAnyStat.length > 0) {
                            const hasMatchedStat = item.stats.some(s => filter.matchAnyStat.includes(s.name));
                            if (hasMatchedStat) return true;
                        }
                        const itemRarityValue = RARITY_ORDER[item.rarity];
                        if (itemRarityValue <= thresholdValue) return false;
                        if (!filter.keepTypes.includes(item.type)) return false;
                        return true;
                    };

                    let autoSalvagedCount = 0;
                    let autoSalvagedGold = 0;
                    let keptItems: Item[] = [];

                    runItems.forEach(item => {
                        if (checkFilter(item)) {
                            keptItems.push(item);
                        } else {
                            autoSalvagedCount++;
                            autoSalvagedGold += item.value;
                        }
                    });

                    itemsToAdd = [...itemsToAdd, ...keptItems];
                    goldGained += autoSalvagedGold;
                    
                    Object.entries(runMaterials).forEach(([k, v]) => {
                        materialsToAdd[k] = (materialsToAdd[k] || 0) + v;
                    });

                    newReports.push({
                        id: crypto.randomUUID(),
                        dungeonName: dungeon.name,
                        success: true,
                        kills: kills,
                        goldEarned: Math.floor(finalGold),
                        xpEarned: Math.floor(finalXp),
                        itemsFound: keptItems,
                        materialsFound: runMaterials,
                        autoSalvagedCount,
                        autoSalvagedGold,
                        timestamp: now,
                        realmXpEarned: contractType === ContractType.DUNGEON ? dungeon.tier * 5 : 0
                    });
                });

                // Update Statistics & Inventory
                nextState.statistics.totalGoldEarned += goldGained;
                nextState.statistics.dungeonsCleared += finishedRuns.length;
                nextState.statistics.dungeonClears = newClears;
                nextState.legendaryPityCounter = pityCounter;
                
                const space = INVENTORY_SIZE - prev.inventory.length;
                if (itemsToAdd.length > space) {
                    itemsToAdd = itemsToAdd.slice(0, space);
                }
                nextState.inventory = [...prev.inventory, ...itemsToAdd];
                nextState.gold += goldGained;

                Object.entries(materialsToAdd).forEach(([k, v]) => {
                    nextState.materials[k] = (nextState.materials[k] || 0) + v;
                });

                nextState.recentReports = [...newReports, ...prev.recentReports].slice(0, 5);

                // PROCESS MASTERY LEVEL UP (Permanent)
                const currentMastery = { ...nextState.guildMastery };
                if (earnedMasteryXp.combat > 0) {
                    const res = processXpGain(currentMastery.combat.level, currentMastery.combat.xp, earnedMasteryXp.combat, 'MASTERY');
                    currentMastery.combat = { level: res.newLevel, xp: res.newXp };
                }
                if (earnedMasteryXp.gathering > 0) {
                    const res = processXpGain(currentMastery.gathering.level, currentMastery.gathering.xp, earnedMasteryXp.gathering, 'MASTERY');
                    currentMastery.gathering = { level: res.newLevel, xp: res.newXp };
                }
                if (earnedMasteryXp.fishing > 0) {
                    const res = processXpGain(currentMastery.fishing.level, currentMastery.fishing.xp, earnedMasteryXp.fishing, 'MASTERY');
                    currentMastery.fishing = { level: res.newLevel, xp: res.newXp };
                }
                nextState.guildMastery = currentMastery;

                // PROCESS REALM LEVEL UP
                let newRealmRank = nextState.realm.realmRank;
                let newRealmXp = nextState.realm.realmExperience + realmXpGained;
                
                let req = calculateRealmXpRequired(newRealmRank + 1);
                while (newRealmXp >= req) {
                    newRealmXp -= req;
                    newRealmRank++;
                    req = calculateRealmXpRequired(newRealmRank + 1);
                }
                
                nextState.realm = {
                    ...nextState.realm,
                    realmRank: newRealmRank,
                    realmExperience: newRealmXp
                };

                // Handle Repeats
                const ongoingRuns: ActiveRun[] = [];
                prev.activeRuns.forEach(r => {
                    if (finishedRuns.find(fr => fr.id === r.id)) {
                        if (r.autoRepeat) {
                             const dungeon = DUNGEONS.find(d => d.id === r.dungeonId);
                             if (dungeon) {
                                 const snapshot = calculateRunSnapshot(r.adventurerIds, nextState);
                                 const adventurerState: Record<string, Adventurer> = {};
                                 r.adventurerIds.forEach(id => {
                                     const adv = nextState.adventurers.find(a => a.id === id);
                                     if (adv) adventurerState[id] = JSON.parse(JSON.stringify(adv));
                                 });
                                 const duration = calculateDungeonDuration(dungeon.durationSeconds * 1000, nextState, r.adventurerIds);

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
                                    modifiedSlots: {} 
                                };
                                ongoingRuns.push(newRun);
                             } else {
                                 ongoingRuns.push(r);
                             }
                        }
                    } else {
                        ongoingRuns.push(r);
                    }
                });
                
                nextState.activeRuns = ongoingRuns;
            }

            return hasChanges ? nextState : prev;
        });
    }, 1000); 

    return () => clearInterval(loop);
  }, []);

  const value = useMemo(() => ({
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
      unlockSkill,
      respecAdventurer,
      refreshTavern,
      hireAdventurer,
      toggleDungeonModifier
  }), [state, recruitAdventurer, renameAdventurer, startDungeon, cancelDungeon, stopRepeat, salvageItem, salvageManyItems, equipItem, unequipItem, buyUpgrade, buyPrestigeUpgrade, doPrestige, unlockLootFilter, updateLootFilter, enchantItem, rerollStat, dismissReport, importSave, unlockSkill, respecAdventurer, refreshTavern, hireAdventurer, toggleDungeonModifier]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
