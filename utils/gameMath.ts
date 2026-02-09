
import { Adventurer, Item, ItemType, Rarity, ItemStat, GameState, AdventurerRole, WeaponType, RunSnapshot, SkillNode } from '../types';
import { UPGRADES, CLASS_SKILLS, ROLE_CONFIG, ADVENTURER_RARITY_MULTIPLIERS, CLASS_WEAPONS, PRESTIGE_UPGRADES, MAX_STATS_BY_RARITY, TIER_WEIGHTS, TIER_MULTIPLIERS, CRAFTING_RARITY_MULTIPLIERS, ENCHANT_COST_BASE, REROLL_COST_BASE, ADVENTURER_TRAITS, SKILL_TEMPLATES } from '../constants';

export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return Math.floor(num).toString();
};

export const areItemsEqual = (itemA: Item | null, itemB: Item | null): boolean => {
    if (itemA === null && itemB === null) return true;
    if (itemA === null || itemB === null) return false;
    // Strict comparison of ID and Stats structure
    return itemA.id === itemB.id && JSON.stringify(itemA.stats) === JSON.stringify(itemB.stats);
};

// Helper to calculate total skill points available based on level
export const calculateTotalSkillPoints = (level: number): number => {
    if (level < 5) return 0;
    // Unlock at 5 (1 point), then 1 point every 3 levels (8, 11, 14, 17, 20...)
    return 1 + Math.floor((level - 5) / 3);
};

// --- UNIQUE SKILL TREE GENERATION ---
export const generateSkillTree = (role: AdventurerRole): SkillNode[] => {
    const templates = SKILL_TEMPLATES[role];
    const tree: SkillNode[] = [];
    
    // Helper to pick random from array
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    
    // 1. Root Node (Center, Tier 1, y=0) - Cost 1
    const rootTpl = pick(templates.tier1);
    const rootId = 'root';
    tree.push({
        ...rootTpl,
        id: rootId,
        x: 1, y: 0,
        requires: [],
        maxLevel: 1,
        cost: 1,
    } as SkillNode);

    // 2. Left Branch (Tier 1, y=1) - Cost 1
    const l1Tpl = pick(templates.tier1);
    const l1Id = 'l1';
    tree.push({
        ...l1Tpl,
        id: l1Id,
        x: 0, y: 1,
        requires: [rootId],
        maxLevel: 1,
        cost: 1,
    } as SkillNode);

    // 3. Right Branch (Tier 1, y=1) - Cost 1
    const r1Tpl = pick(templates.tier1);
    const r1Id = 'r1';
    tree.push({
        ...r1Tpl,
        id: r1Id,
        x: 2, y: 1,
        requires: [rootId],
        maxLevel: 1,
        cost: 1,
    } as SkillNode);

    // 4. Left Mid (Tier 2, y=2) - Cost 2
    const l2Tpl = pick(templates.tier2);
    const l2Id = 'l2';
    tree.push({
        ...l2Tpl,
        id: l2Id,
        x: 0, y: 2,
        requires: [l1Id],
        maxLevel: 1,
        cost: 2,
    } as SkillNode);

    // 5. Right Mid (Tier 2, y=2) - Cost 2
    const r2Tpl = pick(templates.tier2);
    const r2Id = 'r2';
    tree.push({
        ...r2Tpl,
        id: r2Id,
        x: 2, y: 2,
        requires: [r1Id],
        maxLevel: 1,
        cost: 2,
    } as SkillNode);

    // 6. Capstone (Top, y=3) - Cost 3
    const capTpl = pick(templates.tier3);
    const capId = 'cap';
    tree.push({
        ...capTpl,
        id: capId,
        x: 1, y: 3,
        requires: [l2Id, r2Id],
        maxLevel: 1,
        cost: 3,
    } as SkillNode);

    return tree;
};

interface EffectiveStats {
    damage: number;
    health: number;
    speed: number;
    critChance: number;
    // Helper fields for calculation only
    goldGain: number;
    xpGain: number;
    lootLuck: number;
}

export const getAdventurerStats = (adventurer: Adventurer, state: GameState): EffectiveStats => {
    let stats: EffectiveStats = { 
        ...adventurer.baseStats,
        goldGain: 0,
        xpGain: 0,
        lootLuck: 0
    };

    // 1. Global Upgrades
    const trainingLevel = state.upgrades['recruit_training'] || 0;
    const trainingBonus = UPGRADES.find(u => u.id === 'recruit_training')?.effect(trainingLevel) || 0;
    stats.damage += trainingBonus;

    // 2. Class Skills (Legacy - Keep for compatibility or remove if fully replacing)
    // We keep them as base mechanics for now.
    const skills = CLASS_SKILLS[adventurer.role] || [];
    skills.forEach(skill => {
        if (adventurer.level >= skill.unlockLevel) {
            if (skill.id === 'war_1') stats.health += 30;
            if (skill.id === 'war_2') stats.damage *= 1.15;
            if (skill.id === 'war_3') { stats.health += 50; stats.damage *= 1.10; }
            
            if (skill.id === 'rog_1') stats.speed *= 1.10;
            if (skill.id === 'rog_2') stats.critChance += 0.10;
            if (skill.id === 'rog_3') { stats.damage *= 1.30; }

            if (skill.id === 'mag_1') stats.damage += 5;
            if (skill.id === 'mag_2') { stats.damage *= 1.20; stats.health *= 0.90; }
            if (skill.id === 'mag_3') stats.damage *= 1.40;
        }
    });

    // 3. Traits (Archetypes)
    if (adventurer.traitId) {
        const trait = ADVENTURER_TRAITS.find(t => t.id === adventurer.traitId);
        if (trait) {
            trait.effect(stats, state);
        }
    }

    // 4. Skill Tree (Now uses the Adventurer's unique tree)
    if (adventurer.unlockedSkills && adventurer.skillTree) {
        const tree = adventurer.skillTree;
        adventurer.unlockedSkills.forEach(skillId => {
            const node = tree.find(n => n.id === skillId);
            if (node) {
                // Apply node effects
                if (node.effectType === 'STAT') {
                    if (node.statTarget === 'damage' || node.statTarget === 'all') stats.damage *= (1 + node.effectValue);
                    if (node.statTarget === 'health' || node.statTarget === 'all') stats.health *= (1 + node.effectValue);
                    if (node.statTarget === 'speed' || node.statTarget === 'speed_crit') stats.speed *= (1 + node.effectValue);
                    if (node.statTarget === 'crit' || node.statTarget === 'speed_crit') stats.critChance += node.effectValue;
                }
                if (node.effectType === 'ECONOMY') {
                    if (node.statTarget === 'gold') stats.goldGain += node.effectValue;
                    if (node.statTarget === 'xp') stats.xpGain += node.effectValue;
                    if (node.statTarget === 'loot') stats.lootLuck += node.effectValue;
                }
            }
        });
    }

    // 5. Gear Stats
    Object.values(adventurer.slots).forEach((item) => {
        if (item) {
          item.stats.forEach((stat) => {
            if (stat.name === 'Damage') {
                if (stat.isPercentage) stats.damage *= (1 + stat.value / 100);
                else stats.damage += stat.value;
            }
            if (stat.name === 'Health') {
                if (stat.isPercentage) stats.health *= (1 + stat.value / 100);
                else stats.health += stat.value;
            }
            if (stat.name === 'Crit Chance') {
                stats.critChance += stat.value / 100;
            }
            if (stat.name === 'Speed') {
                stats.speed += stat.value / 100;
            }
            if (stat.name === 'Gold Gain') stats.goldGain += stat.value / 100;
            if (stat.name === 'Loot Luck') stats.lootLuck += stat.value / 100;
          });
        }
      });

    return {
        damage: Math.floor(stats.damage),
        health: Math.floor(stats.health),
        speed: parseFloat(stats.speed.toFixed(2)),
        critChance: parseFloat(stats.critChance.toFixed(2)),
        goldGain: parseFloat(stats.goldGain.toFixed(2)),
        xpGain: parseFloat(stats.xpGain.toFixed(2)),
        lootLuck: parseFloat(stats.lootLuck.toFixed(2))
    };
};

export const calculateAdventurerPower = (adventurer: Adventurer, state: GameState): number => {
  const stats = getAdventurerStats(adventurer, state);
  let power = stats.damage * (1 + stats.critChance) + (stats.health / 5);
  power *= stats.speed;
  return Math.floor(power);
};

// Generates an adventurer object that reflects the "Conservative" state.
// - If equipping/swapping while busy: Returns EMPTY slot (Loss of power)
// - If unequipping while busy: Returns EMPTY slot (Instant update)
export const getEffectiveAdventurer = (adventurer: Adventurer, state: GameState): Adventurer => {
    const run = state.activeRuns.find(r => r.adventurerIds.includes(adventurer.id));
    
    // Start with live adventurer clone
    const effectiveAdv = { ...adventurer, slots: { ...adventurer.slots } };

    if (run && run.adventurerState) {
        // Access snapshot state if available
        const snapshotAdv = run.adventurerState[adventurer.id];

        if (snapshotAdv) {
             ([ItemType.WEAPON, ItemType.ARMOR, ItemType.TRINKET] as ItemType[]).forEach(type => {
                const liveItem = effectiveAdv.slots[type];
                const snapshotItem = snapshotAdv.slots[type];
                
                // 1. Check Modified List (Strongest Check)
                // If a slot has been touched (Equip/Unequip) during the run, it is "Pending".
                // Pending slots provide 0 stats (acting as Null) until the run finishes.
                const isModified = run.modifiedSlots?.[adventurer.id]?.includes(type);

                // 2. Check Equality (Fallback)
                // Even if not tracked in modifiedSlots, if items differ, it's pending.
                const isDifferent = !areItemsEqual(liveItem, snapshotItem);
                
                if (isModified || isDifferent) {
                    effectiveAdv.slots[type] = null;
                }
            });
        }
    }

    return effectiveAdv;
};

// Calculates power treating "Pending" (modified) slots by falling back to the Snapshot item
// This ensures that modifying gear during a run doesn't instantly change the displayed power 
// or stats until the run is complete.
export const calculateConservativePower = (adventurer: Adventurer, state: GameState): number => {
    const effectiveAdv = getEffectiveAdventurer(adventurer, state);
    return calculateAdventurerPower(effectiveAdv, state);
};

// Calculates an "Item Score" for comparison purposes
export const calculateItemRating = (item: Item): number => {
    let score = 0;
    item.stats.forEach(stat => {
        // Weights calibrated to reflect approximate contribution to power
        if (stat.name === 'Damage') score += stat.value * 5; 
        else if (stat.name === 'Health') score += stat.value * 1; 
        else if (stat.name === 'Speed') score += stat.value * 10;
        else if (stat.name === 'Crit Chance') score += stat.value * 8;
        else if (stat.name === 'Gold Gain') score += stat.value * 3;
        else if (stat.name === 'Loot Luck') score += stat.value * 3;
        else score += stat.value;
    });
    return Math.floor(score);
};

export const calculateAdventurerDps = (adventurer: Adventurer, state: GameState): number => {
    const stats = getAdventurerStats(adventurer, state);
    return (stats.damage * (1 + stats.critChance)) * stats.speed;
};

export const calculatePartyDps = (adventurerIds: string[], state: GameState): number => {
    let totalDps = 0;
    adventurerIds.forEach(id => {
        const adv = state.adventurers.find(a => a.id === id);
        if (adv) {
            totalDps += calculateAdventurerDps(adv, state);
        }
    });
    return totalDps;
};

// Calculate generic stats from item affixes across the party (e.g. Gold Gain, Magic Find)
export const calculatePartyStat = (adventurerIds: string[], state: GameState, statName: string): number => {
    let totalValue = 0;
    adventurerIds.forEach(id => {
        const adv = state.adventurers.find(a => a.id === id);
        if (adv) {
            Object.values(adv.slots).forEach(item => {
                if (item) {
                    item.stats.forEach(stat => {
                        if (stat.name === statName) {
                            totalValue += stat.value;
                        }
                    });
                }
            });
        }
    });
    return totalValue;
};

export const calculateDungeonDuration = (baseDuration: number, state: GameState): number => {
  const speedLevel = state.upgrades['logistics_network'] || 0;
  const reduction = UPGRADES.find(u => u.id === 'logistics_network')?.effect(speedLevel) || 0;
  const effectiveReduction = Math.min(reduction, 0.5);
  return Math.max(1, baseDuration * (1 - effectiveReduction));
};

export const calculateRunSnapshot = (adventurerIds: string[], state: GameState): RunSnapshot => {
    // 1. DPS
    const dps = calculatePartyDps(adventurerIds, state);

    // 2. Power (For overpowered calculation)
    const power = adventurerIds.reduce((sum, id) => {
        const adv = state.adventurers.find(a => a.id === id);
        return sum + (adv ? calculateAdventurerPower(adv, state) : 0);
    }, 0);

    // 3. Bonuses (Global Upgrades + Gear Stats + Skills)
    // We iterate adventurers to sum up their individual bonuses from stats/skills
    let partyGoldBonus = 0;
    let partyXpBonus = 0;
    let partyLootBonus = 0;

    adventurerIds.forEach(id => {
        const adv = state.adventurers.find(a => a.id === id);
        if (adv) {
            const stats = getAdventurerStats(adv, state);
            partyGoldBonus += stats.goldGain;
            partyXpBonus += stats.xpGain;
            partyLootBonus += stats.lootLuck;
        }
    });

    // Economy Global
    const ecoLevel = state.upgrades['marketplace_connections'] || 0;
    const ecoBonus = UPGRADES.find(u => u.id === 'marketplace_connections')?.effect(ecoLevel) || 0;
    const legacyLevel = state.prestigeUpgrades['legacy_wealth'] || 0;
    const legacyBonus = PRESTIGE_UPGRADES.find(u => u.id === 'legacy_wealth')?.effect(legacyLevel) || 0;
    
    const totalGoldBonus = ecoBonus + legacyBonus + partyGoldBonus;

    // XP Global
    const renownLevel = state.prestigeUpgrades['renowned_guild'] || 0;
    const renownBonus = PRESTIGE_UPGRADES.find(u => u.id === 'renowned_guild')?.effect(renownLevel) || 0;
    const totalXpBonus = renownBonus + partyXpBonus; 

    // Loot Global
    const lootLevel = state.upgrades['loot_logic'] || 0;
    const lootBonus = UPGRADES.find(u => u.id === 'loot_logic')?.effect(lootLevel) || 0;
    const totalLootBonus = lootBonus + partyLootBonus;

    return {
        dps,
        power,
        goldBonus: totalGoldBonus,
        xpBonus: totalXpBonus,
        lootBonus: totalLootBonus
    };
};

export const generateAdventurer = (id: string, name: string): Adventurer => {
    const roles = Object.values(AdventurerRole);
    const role = roles[Math.floor(Math.random() * roles.length)];
    const config = ROLE_CONFIG[role];

    const rand = Math.random();
    let rarity = Rarity.COMMON;
    if (rand > 0.98) rarity = Rarity.LEGENDARY;
    else if (rand > 0.90) rarity = Rarity.EPIC;
    else if (rand > 0.75) rarity = Rarity.RARE;
    else if (rand > 0.50) rarity = Rarity.UNCOMMON;

    const multiplier = ADVENTURER_RARITY_MULTIPLIERS[rarity];

    // Assign Random Trait
    const trait = ADVENTURER_TRAITS[Math.floor(Math.random() * ADVENTURER_TRAITS.length)];

    return {
        id,
        name,
        role,
        rarity,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        gatheringXp: 0,
        fishingXp: 0,
        traitId: trait.id,
        skillPoints: 0,
        unlockedSkills: [],
        skillTree: generateSkillTree(role), // Generate Unique Tree
        slots: { [ItemType.WEAPON]: null, [ItemType.ARMOR]: null, [ItemType.TRINKET]: null },
        baseStats: {
            damage: Math.ceil(config.baseDmg * multiplier),
            health: Math.ceil(config.baseHp * multiplier),
            speed: parseFloat((config.baseSpeed * (1 + (multiplier - 1) * 0.1)).toFixed(2)),
            critChance: parseFloat((config.baseCrit * multiplier).toFixed(2))
        }
    };
}

// === Item Generation & Crafting ===

// Unified Item Rarity Multipliers (Cleaner Scaling)
export const ITEM_RARITY_MULTIPLIERS: Record<Rarity, number> = {
    [Rarity.COMMON]: 1.0,
    [Rarity.UNCOMMON]: 1.3,
    [Rarity.RARE]: 1.7,
    [Rarity.EPIC]: 2.2,
    [Rarity.LEGENDARY]: 3.0,
};

// Returns the raw stat budget for a Main Stat based on level and rarity.
export const getStatBudget = (level: number, rarity: Rarity, prestigeUpgrades: { [id: string]: number }) => {
    const rarityMultiplier = ITEM_RARITY_MULTIPLIERS[rarity];

    const crafterLevel = prestigeUpgrades['master_crafters'] || 0;
    const crafterBonus = 1 + (PRESTIGE_UPGRADES.find(u => u.id === 'master_crafters')?.effect(crafterLevel) || 0);
    
    // Base budget per level * Rarity * Crafting Bonus
    const baseBudget = 3 * level * rarityMultiplier * crafterBonus; 
    
    return baseBudget;
};

// Generate a tier from 1 (Best) to 7 (Worst) based on weights
export const rollStatTier = (): number => {
    const totalWeight = TIER_WEIGHTS.reduce((sum, t) => sum + t.weight, 0);
    let r = Math.random() * totalWeight;
    
    for (const tier of TIER_WEIGHTS) {
        if (r < tier.weight) return tier.tier;
        r -= tier.weight;
    }
    return 7; // Fallback
};

// Definition of possible affixes
const POSSIBLE_AFFIXES = [
    { name: 'Crit Chance', basePower: 1.5, weight: 1 },
    { name: 'Speed', basePower: 1.5, weight: 1 },
    { name: 'Damage', basePower: 2.0, weight: 1 }, // % Dmg
    { name: 'Health', basePower: 2.0, weight: 1 }, // % Health
    { name: 'Gold Gain', basePower: 2.0, weight: 0.5 }, // % Gold
    { name: 'Loot Luck', basePower: 1.0, weight: 0.3 }, // % Drop Rate
];

export const generateRandomAffix = (level: number, rarity: Rarity, excludeNames: string[] = []): ItemStat => {
    const available = POSSIBLE_AFFIXES.filter(a => !excludeNames.includes(a.name));
    const choice = available.length > 0 
        ? available[Math.floor(Math.random() * available.length)] 
        : POSSIBLE_AFFIXES[Math.floor(Math.random() * POSSIBLE_AFFIXES.length)];

    const rarityMultiplier = ITEM_RARITY_MULTIPLIERS[rarity];
    
    // TIER LOGIC
    const tier = rollStatTier();
    const tierMultiplier = TIER_MULTIPLIERS[tier];

    // Scaling: Linearly increases with level. 
    const levelScaling = 1 + (level * 0.1); 

    const rawVal = choice.basePower * levelScaling * rarityMultiplier * tierMultiplier;
    
    const finalVal = Math.max(1, Math.round(rawVal));

    return {
        name: choice.name,
        value: finalVal,
        isPercentage: true,
        tier: tier
    };
};

export const generateItem = (dungeonLevel: number, prestigeUpgrades: { [id: string]: number } = {}): Item => {
  const rand = Math.random();
  let rarity = Rarity.COMMON;
  
  // Prestige Boost to Rarity
  const divineFavorLevel = prestigeUpgrades['divine_favor'] || 0;
  const rarityBoost = PRESTIGE_UPGRADES.find(u => u.id === 'divine_favor')?.effect(divineFavorLevel) || 0;

  if (rand > (0.98 - rarityBoost)) rarity = Rarity.LEGENDARY;
  else if (rand > (0.90 - rarityBoost * 0.8)) rarity = Rarity.EPIC;
  else if (rand > (0.75 - rarityBoost * 0.6)) rarity = Rarity.RARE;
  else if (rand > 0.50) rarity = Rarity.UNCOMMON;

  // Determine Type
  const typeRoll = Math.random();
  const type = typeRoll < 0.33 ? ItemType.WEAPON : typeRoll < 0.66 ? ItemType.ARMOR : ItemType.TRINKET;

  let subtype = WeaponType.NONE;
  let classRestriction: AdventurerRole[] = [];
  let nameSuffix = "";

  if (type === ItemType.WEAPON) {
      const weaponTypes = [WeaponType.SWORD, WeaponType.BLUNT, WeaponType.DAGGER, WeaponType.BOW, WeaponType.STAFF, WeaponType.BOOK];
      subtype = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      classRestriction = Object.keys(CLASS_WEAPONS).filter(role => 
          CLASS_WEAPONS[role as AdventurerRole].includes(subtype)
      ) as AdventurerRole[];
      nameSuffix = subtype;
  } else {
      classRestriction = Object.values(AdventurerRole);
      nameSuffix = type;
  }

  const stats: ItemStat[] = [];
  const statBudget = getStatBudget(dungeonLevel, rarity, prestigeUpgrades);

  // 1. Generate Main Stat (Always Slot 1)
  const mainStatTier = rollStatTier();
  const mainStatTierMult = TIER_MULTIPLIERS[mainStatTier];
  
  const effectiveBudget = statBudget * mainStatTierMult;

  if (type === ItemType.WEAPON) {
      stats.push({ name: 'Damage', value: Math.max(1, Math.round(effectiveBudget)), isPercentage: false, tier: mainStatTier });
  } else if (type === ItemType.ARMOR) {
      stats.push({ name: 'Health', value: Math.max(5, Math.round(effectiveBudget * 5)), isPercentage: false, tier: mainStatTier });
  } else {
      // Trinkets
      if (Math.random() > 0.5) stats.push({ name: 'Damage', value: Math.max(1, Math.round(effectiveBudget * 0.5)), isPercentage: false, tier: mainStatTier });
      else stats.push({ name: 'Health', value: Math.max(5, Math.round(effectiveBudget * 2.5)), isPercentage: false, tier: mainStatTier });
  }

  // 2. Generate Affixes
  const maxStats = MAX_STATS_BY_RARITY[rarity];
  const maxAffixes = maxStats - 1;
  let affixesGenerated = 0;

  for (let i = 0; i < maxAffixes; i++) {
      const mustFill = (i === 0); 
      if (mustFill || Math.random() < 0.8) {
         const existingNames = stats.map(s => s.name);
         stats.push(generateRandomAffix(dungeonLevel, rarity, existingNames));
         affixesGenerated++;
      }
  }

  // Calculate Value
  const goldValue = Math.ceil(statBudget * 3 * (1 + affixesGenerated * 0.2));

  return {
    id: crypto.randomUUID(),
    name: `${rarity} ${nameSuffix}`, 
    type,
    subtype,
    classRestriction,
    rarity,
    level: dungeonLevel,
    stats,
    value: goldValue,
  };
};

export const calculateGuildLevel = (totalGold: number) => {
    const level = Math.floor(Math.sqrt(totalGold / 1000)) + 1;
    const currentLevelStart = 1000 * Math.pow(level - 1, 2);
    const nextLevelStart = 1000 * Math.pow(level, 2);
    const progress = (totalGold - currentLevelStart) / (nextLevelStart - currentLevelStart);
    
    return {
        level,
        progress: Math.min(100, Math.max(0, progress * 100)),
        nextLevelStart,
        remaining: nextLevelStart - totalGold
    };
};

export const calculatePrestigeGain = (totalLifetimeGold: number): number => {
    if (totalLifetimeGold < 100000) return 0;
    return Math.floor(Math.sqrt(totalLifetimeGold / 10000));
};

// Calculate upgrade cost based on item rarity, level, and type of upgrade
// Reroll = Base * Level * RarityMult
// Enchant = Base * Level * RarityMult * (StatsCount)
export const calculateItemUpgradeCost = (item: Item, type: 'ENCHANT' | 'REROLL'): number => {
    const rarityMult = CRAFTING_RARITY_MULTIPLIERS[item.rarity];
    
    if (type === 'ENCHANT') {
        const statsCount = item.stats.length;
        // The more stats you have, the harder it is to add another.
        // Base * Level * Rarity * (Current Stats)
        return Math.floor(ENCHANT_COST_BASE * item.level * rarityMult * statsCount);
    } else {
        return Math.floor(REROLL_COST_BASE * item.level * rarityMult);
    }
};
