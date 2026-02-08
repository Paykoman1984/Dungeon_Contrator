
import { Adventurer, Item, ItemType, Rarity, ItemStat, GameState, AdventurerRole, WeaponType, RunSnapshot } from '../types';
import { UPGRADES, CLASS_SKILLS, ROLE_CONFIG, ADVENTURER_RARITY_MULTIPLIERS, CLASS_WEAPONS, PRESTIGE_UPGRADES, MAX_STATS_BY_RARITY, TIER_WEIGHTS, TIER_MULTIPLIERS, CRAFTING_RARITY_MULTIPLIERS, ENCHANT_COST_BASE, REROLL_COST_BASE } from '../constants';

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

interface EffectiveStats {
    damage: number;
    health: number;
    speed: number;
    critChance: number;
}

export const getAdventurerStats = (adventurer: Adventurer, state: GameState): EffectiveStats => {
    let stats: EffectiveStats = { ...adventurer.baseStats };

    // 1. Global Upgrades
    const trainingLevel = state.upgrades['recruit_training'] || 0;
    const trainingBonus = UPGRADES.find(u => u.id === 'recruit_training')?.effect(trainingLevel) || 0;
    stats.damage += trainingBonus;

    // 2. Class Skills
    const skills = CLASS_SKILLS[adventurer.role] || [];
    skills.forEach(skill => {
        if (adventurer.level >= skill.unlockLevel) {
            // Hardcoded skill effects
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

    // 3. Gear Stats
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
          });
        }
      });

    return {
        damage: Math.floor(stats.damage),
        health: Math.floor(stats.health),
        speed: parseFloat(stats.speed.toFixed(2)),
        critChance: parseFloat(stats.critChance.toFixed(2))
    };
};

export const calculateAdventurerPower = (adventurer: Adventurer, state: GameState): number => {
  const stats = getAdventurerStats(adventurer, state);
  let power = stats.damage * (1 + stats.critChance) + (stats.health / 5);
  power *= stats.speed;
  return Math.floor(power);
};

// Calculates power treating "Pending" (modified) slots as empty to prevent power exploitation during runs
export const calculateConservativePower = (adventurer: Adventurer, state: GameState): number => {
    const run = state.activeRuns.find(r => r.adventurerIds.includes(adventurer.id));
    
    // Create a shallow copy of the adventurer to modify slots for calculation
    const effectiveAdv = { ...adventurer, slots: { ...adventurer.slots } };

    if (run) {
        // If busy, check for modifications
        const mods = run.modifiedSlots?.[adventurer.id] || [];
        
        ([ItemType.WEAPON, ItemType.ARMOR, ItemType.TRINKET] as ItemType[]).forEach(type => {
            if (mods.includes(type)) {
                // If modified/dirty, it contributes 0 power (Pending state) until run finishes
                effectiveAdv.slots[type] = null;
            }
            // If not modified, we trust the live slot (as it matches snapshot)
        });
    }

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

    // 3. Bonuses (Global Upgrades + Gear Stats)
    // Economy
    const ecoLevel = state.upgrades['marketplace_connections'] || 0;
    const ecoBonus = UPGRADES.find(u => u.id === 'marketplace_connections')?.effect(ecoLevel) || 0;
    const legacyLevel = state.prestigeUpgrades['legacy_wealth'] || 0;
    const legacyBonus = PRESTIGE_UPGRADES.find(u => u.id === 'legacy_wealth')?.effect(legacyLevel) || 0;
    const gearGoldBonus = calculatePartyStat(adventurerIds, state, 'Gold Gain') / 100;
    const totalGoldBonus = ecoBonus + legacyBonus + gearGoldBonus;

    // XP
    const renownLevel = state.prestigeUpgrades['renowned_guild'] || 0;
    const renownBonus = PRESTIGE_UPGRADES.find(u => u.id === 'renowned_guild')?.effect(renownLevel) || 0;
    const totalXpBonus = renownBonus; 

    // Loot
    const lootLevel = state.upgrades['loot_logic'] || 0;
    const lootBonus = UPGRADES.find(u => u.id === 'loot_logic')?.effect(lootLevel) || 0;
    const gearLootBonus = calculatePartyStat(adventurerIds, state, 'Loot Luck') / 100;
    const totalLootBonus = lootBonus + gearLootBonus;

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

    return {
        id,
        name,
        role,
        rarity,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
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
