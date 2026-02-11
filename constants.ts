
import { Dungeon, Rarity, Upgrade, AdventurerRole, Skill, Enemy, WeaponType, PrestigeUpgrade, ContractType, Material, AdventurerTrait, SkillNode, SkillTemplate, Trait, RealmModifier } from './types';

export const INITIAL_GOLD = 0;
export const INVENTORY_SIZE = 50;
export const LOOT_FILTER_UNLOCK_COST = 2500;

export const TAVERN_CONFIG = {
    baseRefreshCost: 100,
    poolSize: 3
};

// --- REALM & LEVELING CONFIG ---

export const REALM_CONFIG = {
    baseXp: 100,
    scalingFactor: 1.8,
    baseEnemyScaling: 0.15, // 15% per rank
    baseLootQuantity: 0.02, // 2% chance for double loot per rank
    baseRarityShift: 1.0, // +1 shift score per rank
};

export const XP_CURVE_CONFIG = {
    adventurer: {
        base: 100,
        exponent: 1.5
    },
    mastery: {
        base: 500,
        exponent: 1.8 // Slower than adventurer
    }
};

export const MASTERY_BONUSES = {
    combat: {
        powerPerLevel: 0.05, // +5% Power per level
        damagePerLevel: 0.02 // +2% Base Damage per level
    },
    gathering: {
        yieldPerLevel: 0.05, // +5% Yield per level
        efficiencyPerLevel: 0.02 // +2% Speed/Efficiency per level
    },
    fishing: {
        rareChancePerLevel: 0.01, // +1% Rare chance
        speedPerLevel: 0.03 // +3% Speed
    }
};

export const REALM_MODIFIERS: RealmModifier[] = [
    {
        id: 'elite_enemies',
        name: 'Elite Enemies',
        description: 'Enemies are 50% stronger, but drop 50% more gold.',
        unlockRank: 5,
        enemyPowerMult: 1.5,
        lootYieldMult: 1.5,
        rarityShiftBonus: 0
    },
    {
        id: 'treasure_hoard',
        name: 'Treasure Hoard',
        description: 'Enemies are 2x stronger. High chance for better loot.',
        unlockRank: 10,
        enemyPowerMult: 2.0,
        lootYieldMult: 1.2,
        rarityShiftBonus: 5.0
    },
    {
        id: 'corrupted_land',
        name: 'Corrupted Land',
        description: 'Extremely dangerous (3x Power). Massive rewards.',
        unlockRank: 20,
        enemyPowerMult: 3.0,
        lootYieldMult: 3.0,
        rarityShiftBonus: 10.0
    }
];

// --- LOOT SYSTEM CONFIGURATION ---
export const BASE_DROP_CHANCE = 0.30;
export const MAX_DROP_CHANCE = 0.75;

export const BASE_RARITY_WEIGHTS = {
    [Rarity.COMMON]: 70,
    [Rarity.UNCOMMON]: 20,
    [Rarity.RARE]: 7,
    [Rarity.EPIC]: 2.5,
    [Rarity.LEGENDARY]: 0.5
};

export const RARITY_CONFIG = {
    [Rarity.COMMON]: { statMult: 1.0, bonusStats: 0 },
    [Rarity.UNCOMMON]: { statMult: 1.15, bonusStats: 1 },
    [Rarity.RARE]: { statMult: 1.35, bonusStats: 2 },
    [Rarity.EPIC]: { statMult: 1.7, bonusStats: 3 },
    [Rarity.LEGENDARY]: { statMult: 2.2, bonusStats: 4 }
};

export const RARITY_COLORS: Record<string, string> = {
  [Rarity.COMMON]: 'text-slate-400',
  [Rarity.UNCOMMON]: 'text-green-400',
  [Rarity.RARE]: 'text-blue-400',
  [Rarity.EPIC]: 'text-purple-400',
  [Rarity.LEGENDARY]: 'text-orange-400',
};

export const RARITY_BG_COLORS: Record<Rarity, string> = {
  [Rarity.COMMON]: 'bg-slate-800',
  [Rarity.UNCOMMON]: 'bg-green-900/30',
  [Rarity.RARE]: 'bg-blue-900/30',
  [Rarity.EPIC]: 'bg-purple-900/30',
  [Rarity.LEGENDARY]: 'bg-orange-900/30',
};

export const RARITY_ORDER: Record<Rarity, number> = {
    [Rarity.COMMON]: 0,
    [Rarity.UNCOMMON]: 1,
    [Rarity.RARE]: 2,
    [Rarity.EPIC]: 3,
    [Rarity.LEGENDARY]: 4,
};

// Common=2 (1 Main + 1), Uncommon=3, Rare=4, Epic=5, Legendary=6
export const MAX_STATS_BY_RARITY: Record<Rarity, number> = {
    [Rarity.COMMON]: 2,
    [Rarity.UNCOMMON]: 3,
    [Rarity.RARE]: 4,
    [Rarity.EPIC]: 5,
    [Rarity.LEGENDARY]: 6,
};

// --- TIER CONFIGURATION ---

export const STAT_TIER_COLORS: Record<number, string> = {
    0: 'text-orange-400 font-extrabold shadow-orange-500/50 drop-shadow-sm', // Unique/Bonus
    1: 'text-red-500 font-bold shadow-red-500/50 drop-shadow-sm', // Divine / Mythic
    2: 'text-orange-400 font-bold', // Legendary tier
    3: 'text-purple-400', // Epic tier
    4: 'text-blue-400', // Rare tier
    5: 'text-green-400', // Uncommon tier
    6: 'text-slate-300', // Common tier
    7: 'text-slate-500', // Poor tier
};

export const TIER_WEIGHTS = [
    { tier: 1, weight: 1 },   // 0.5% (approx 1/200)
    { tier: 2, weight: 5 },   // 2.5%
    { tier: 3, weight: 14 },  // 7%
    { tier: 4, weight: 30 },  // 15%
    { tier: 5, weight: 50 },  // 25%
    { tier: 6, weight: 60 },  // 30%
    { tier: 7, weight: 40 },  // 20%
];

export const TIER_MULTIPLIERS: Record<number, number> = {
    0: 2.50, // Unique/Special
    1: 2.00, // +100% stats
    2: 1.60, // +60% stats
    3: 1.35, // +35% stats
    4: 1.15, // +15% stats
    5: 1.00, // Baseline
    6: 0.85, // -15% stats
    7: 0.65, // -35% stats
};

export const ENCHANT_COST_BASE = 100;
export const REROLL_COST_BASE = 50;

export const ADVENTURER_RARITY_MULTIPLIERS: Record<Rarity, number> = {
  [Rarity.COMMON]: 1.0,
  [Rarity.UNCOMMON]: 1.25,
  [Rarity.RARE]: 1.50,
  [Rarity.EPIC]: 1.80,
  [Rarity.LEGENDARY]: 2.50,
};

export const CRAFTING_RARITY_MULTIPLIERS: Record<Rarity, number> = {
  [Rarity.COMMON]: 1.0,
  [Rarity.UNCOMMON]: 2.0,
  [Rarity.RARE]: 5.0,
  [Rarity.EPIC]: 12.0,
  [Rarity.LEGENDARY]: 30.0,
};

export const ROLE_CONFIG: Record<AdventurerRole, { description: string, color: string, baseHp: number, baseDmg: number, baseSpeed: number, baseCrit: number }> = {
    [AdventurerRole.WARRIOR]: { 
        description: 'Tough frontline fighter.', 
        color: 'text-red-400',
        baseHp: 120, baseDmg: 4, baseSpeed: 0.9, baseCrit: 0.05 
    },
    [AdventurerRole.ROGUE]: { 
        description: 'Fast and deadly.', 
        color: 'text-emerald-400',
        baseHp: 60, baseDmg: 8, baseSpeed: 1.2, baseCrit: 0.20 
    },
    [AdventurerRole.MAGE]: { 
        description: 'High burst damage.', 
        color: 'text-blue-400',
        baseHp: 50, baseDmg: 12, baseSpeed: 1.0, baseCrit: 0.10 
    },
};

export const CLASS_WEAPONS: Record<AdventurerRole, WeaponType[]> = {
    [AdventurerRole.WARRIOR]: [WeaponType.SWORD, WeaponType.BLUNT],
    [AdventurerRole.ROGUE]: [WeaponType.DAGGER, WeaponType.BOW],
    [AdventurerRole.MAGE]: [WeaponType.STAFF, WeaponType.BOOK],
};

export const ADVENTURER_NAMES = [
    "Eldric", "Mara", "Thorne", "Silas", "Vesper", "Lyra", "Kael", "Aria", "Grom", "Elara",
    "Bram", "Caelum", "Darius", "Elowen", "Fiora", "Garrick", "Hestia", "Isolde", "Jarek", "Kaelen",
    "Liora", "Magnus", "Neria", "Orin", "Pael", "Quinn", "Rolan", "Seren", "Talia", "Ulric",
    "Vane", "Wren", "Xander", "Yara", "Zephyr", "Ash", "Beryl", "Corin", "Dax", "Elian",
    "Fen", "Gideon", "Hale", "Ira", "Joss", "Knox", "Lark", "Milo", "Nash", "Ode",
    "Pyke", "Ren", "Sol", "Tor", "Ursa", "Val", "Wyatt", "Xen", "Yuri", "Zane"
];

export const TITLES_BY_ROLE: Record<AdventurerRole, string[]> = {
    [AdventurerRole.WARRIOR]: [
        "Squire", "Footman", "Guard", "Veteran", "Shieldbearer", 
        "Knight", "Vanguard", "Commander", "Warlord", "Champion"
    ],
    [AdventurerRole.ROGUE]: [
        "Pickpocket", "Scout", "Bandit", "Prowler", "Shadow", 
        "Assassin", "Phantom", "Nightblade", "Whisper", "Deathstalker"
    ],
    [AdventurerRole.MAGE]: [
        "Apprentice", "Novice", "Scholar", "Adept", "Weaver", 
        "Sorcerer", "Arcanist", "Magus", "Archmage", "Grandmaster"
    ]
};

// --- NEW TRAIT POOL ---
export const TRAIT_POOL: Omit<Trait, 'id'>[] = [
    // COMBAT (Common)
    { name: 'Strong Arm', description: '+5% Damage', rarity: 'Common', type: 'COMBAT', effect: (s) => s.damage *= 1.05 },
    { name: 'Healthy', description: '+10% Health', rarity: 'Common', type: 'COMBAT', effect: (s) => s.health *= 1.10 },
    { name: 'Quick Reflexes', description: '+5% Speed', rarity: 'Common', type: 'COMBAT', effect: (s) => s.speed *= 1.05 },
    { name: 'Sharp Eye', description: '+5% Crit Chance', rarity: 'Common', type: 'COMBAT', effect: (s) => s.critChance += 0.05 },
    
    // GATHERING (Common)
    { name: 'Pack Mule', description: '+10% Loot Luck (Materials)', rarity: 'Common', type: 'GATHERING', effect: (s) => s.lootLuck += 0.10 },
    { name: 'Green Thumb', description: '+5% Speed (Gathering Focus)', rarity: 'Common', type: 'GATHERING', effect: (s) => s.speed *= 1.05 },
    { name: 'Scavenger', description: '+10% Gold Gain', rarity: 'Common', type: 'GATHERING', effect: (s) => s.goldGain += 0.10 },

    // FISHING (Common)
    { name: 'Patient', description: '+10% Loot Luck (Fishing)', rarity: 'Common', type: 'FISHING', effect: (s) => s.lootLuck += 0.10 },
    { name: 'Angler', description: '+5% Speed (Fishing Focus)', rarity: 'Common', type: 'FISHING', effect: (s) => s.speed *= 1.05 },

    // RARE (25%)
    { name: 'Giant Slayer', description: '+15% Damage', rarity: 'Rare', type: 'COMBAT', effect: (s) => s.damage *= 1.15 },
    { name: 'Iron Skin', description: '+20% Health', rarity: 'Rare', type: 'COMBAT', effect: (s) => s.health *= 1.20 },
    { name: 'Prospector', description: '+20% Gold Gain', rarity: 'Rare', type: 'GATHERING', effect: (s) => s.goldGain += 0.20 },
    { name: 'Master Angler', description: '+20% Fishing Yield', rarity: 'Rare', type: 'FISHING', effect: (s) => s.lootLuck += 0.20 },
    { name: 'Tactician', description: '+10% XP Gain', rarity: 'Rare', type: 'HYBRID', effect: (s) => s.xpGain += 0.10 },

    // EPIC (5%)
    { name: 'Legendary Strength', description: '+30% Damage', rarity: 'Epic', type: 'COMBAT', effect: (s) => s.damage *= 1.30 },
    { name: 'Immortal', description: '+40% Health', rarity: 'Epic', type: 'COMBAT', effect: (s) => s.health *= 1.40 },
    { name: 'Midas Touch', description: '+50% Gold Gain', rarity: 'Epic', type: 'GATHERING', effect: (s) => s.goldGain += 0.50 },
    { name: 'Jack of All Trades', description: '+10% All Stats', rarity: 'Epic', type: 'HYBRID', effect: (s) => { s.damage *= 1.1; s.health *= 1.1; s.speed *= 1.1; s.lootLuck += 0.1; } },
];

export const ADVENTURER_TRAITS: AdventurerTrait[] = [
    { id: 'legacy_trait', name: 'Legacy Trait', description: 'Migrated', effect: (s) => {} },
];

// --- SKILL POOLS (Expanded for Gathering/Fishing) ---

const STAT_POOLS: Record<AdventurerRole, { root: SkillTemplate[], offense: SkillTemplate[], defense: SkillTemplate[], hybrid: SkillTemplate[] }> = {
    [AdventurerRole.WARRIOR]: {
        root: [
            { name: "Warrior's Heart", description: "+10% Health", icon: "Heart", effectType: "STAT", effectValue: 0.10, statTarget: "health", poolType: 'COMBAT' },
            { name: "Strength", description: "+5% Damage", icon: "Sword", effectType: "STAT", effectValue: 0.05, statTarget: "damage", poolType: 'COMBAT' },
            { name: "Field Training", description: "+10% Loot Luck", icon: "Box", effectType: "ECONOMY", effectValue: 0.10, statTarget: "loot", poolType: 'GATHERING' }
        ],
        offense: [
            { name: "Heavy Blows", description: "+10% Damage", icon: "Sword", effectType: "STAT", effectValue: 0.10, statTarget: "damage", poolType: 'COMBAT' },
            { name: "Sundering", description: "+10% Crit Chance", icon: "Crosshair", effectType: "STAT", effectValue: 0.10, statTarget: "crit", poolType: 'COMBAT' }
        ],
        defense: [
            { name: "Thick Hide", description: "+15% Health", icon: "Shield", effectType: "STAT", effectValue: 0.15, statTarget: "health", poolType: 'COMBAT' },
            { name: "Conditioning", description: "+5% Speed", icon: "Zap", effectType: "STAT", effectValue: 0.05, statTarget: "speed", poolType: 'HYBRID' }
        ],
        hybrid: [
            { name: "Battle Hardened", description: "+10% Dmg & Health", icon: "Crown", effectType: "STAT", effectValue: 0.10, statTarget: "all", poolType: 'COMBAT' },
            { name: "Commander", description: "+20% Gold Gain", icon: "Coins", effectType: "ECONOMY", effectValue: 0.20, statTarget: "gold", poolType: 'HYBRID' },
            { name: "Lumberjack", description: "+15% Gathering Yield", icon: "Tree", effectType: "ECONOMY", effectValue: 0.15, statTarget: "loot", poolType: 'GATHERING' }
        ]
    },
    [AdventurerRole.ROGUE]: {
        root: [
            { name: "Agility", description: "+5% Speed", icon: "Zap", effectType: "STAT", effectValue: 0.05, statTarget: "speed", poolType: 'COMBAT' },
            { name: "Keen Eye", description: "+5% Crit Chance", icon: "Eye", effectType: "STAT", effectValue: 0.05, statTarget: "crit", poolType: 'COMBAT' },
            { name: "Scout", description: "+10% Gold Gain", icon: "Coins", effectType: "ECONOMY", effectValue: 0.10, statTarget: "gold", poolType: 'GATHERING' }
        ],
        offense: [
            { name: "Backstab", description: "+15% Damage", icon: "Sword", effectType: "STAT", effectValue: 0.15, statTarget: "damage", poolType: 'COMBAT' },
            { name: "Precision", description: "+15% Crit Chance", icon: "Crosshair", effectType: "STAT", effectValue: 0.15, statTarget: "crit", poolType: 'COMBAT' }
        ],
        defense: [
            { name: "Evasion", description: "+10% Speed", icon: "Zap", effectType: "STAT", effectValue: 0.10, statTarget: "speed", poolType: 'COMBAT' },
            { name: "Loot Sense", description: "+10% Loot Luck", icon: "Box", effectType: "ECONOMY", effectValue: 0.10, statTarget: "loot", poolType: 'GATHERING' }
        ],
        hybrid: [
            { name: "Shadow Arts", description: "+10% Speed & Crit", icon: "Eye", effectType: "STAT", effectValue: 0.10, statTarget: "speed_crit", poolType: 'COMBAT' },
            { name: "Merchant", description: "+25% Gold Gain", icon: "Coins", effectType: "ECONOMY", effectValue: 0.25, statTarget: "gold", poolType: 'HYBRID' },
            { name: "Master Angler", description: "+20% Fishing Yield", icon: "Anchor", effectType: "ECONOMY", effectValue: 0.20, statTarget: "loot", poolType: 'FISHING' }
        ]
    },
    [AdventurerRole.MAGE]: {
        root: [
            { name: "Intellect", description: "+10% Damage", icon: "Sparkles", effectType: "STAT", effectValue: 0.10, statTarget: "damage", poolType: 'COMBAT' },
            { name: "Focus", description: "+5% XP Gain", icon: "Book", effectType: "ECONOMY", effectValue: 0.05, statTarget: "xp", poolType: 'HYBRID' },
            { name: "Divination", description: "+10% Loot Luck", icon: "Eye", effectType: "ECONOMY", effectValue: 0.10, statTarget: "loot", poolType: 'GATHERING' }
        ],
        offense: [
            { name: "Fireball", description: "+20% Damage", icon: "Flame", effectType: "STAT", effectValue: 0.20, statTarget: "damage", poolType: 'COMBAT' },
            { name: "Arcane Flux", description: "+10% Speed", icon: "Zap", effectType: "STAT", effectValue: 0.10, statTarget: "speed", poolType: 'COMBAT' }
        ],
        defense: [
            { name: "Mana Shield", description: "+15% Health", icon: "Shield", effectType: "STAT", effectValue: 0.15, statTarget: "health", poolType: 'COMBAT' },
            { name: "Wisdom", description: "+15% XP Gain", icon: "Book", effectType: "ECONOMY", effectValue: 0.15, statTarget: "xp", poolType: 'HYBRID' }
        ],
        hybrid: [
            { name: "Power Infusion", description: "+15% Dmg & Health", icon: "Crown", effectType: "STAT", effectValue: 0.15, statTarget: "all", poolType: 'COMBAT' },
            { name: "Transmute", description: "+30% Gold Gain", icon: "Beaker", effectType: "ECONOMY", effectValue: 0.30, statTarget: "gold", poolType: 'HYBRID' },
            { name: "Nature's Call", description: "+20% Gathering Yield", icon: "Leaf", effectType: "ECONOMY", effectValue: 0.20, statTarget: "loot", poolType: 'GATHERING' }
        ]
    }
}

export const CAPSTONE_POOL: Record<AdventurerRole, SkillTemplate[]> = {
    [AdventurerRole.WARRIOR]: [
        { name: "Weapon Master", description: "Weapon Stats 2x, No Trinket", icon: "Sword", effectType: "MODIFIER", modifier: "WEAPON_MASTER", effectValue: 0 },
        { name: "Titan Grip", description: "+20% Dmg/HP, -10% Speed", icon: "Shield", effectType: "MODIFIER", modifier: "TITAN_GRIP", effectValue: 0 },
        { name: "Methodical", description: "+50% Rewards, +20% Time", icon: "Clock", effectType: "MODIFIER", modifier: "METHODICAL", effectValue: 0 }
    ],
    [AdventurerRole.ROGUE]: [
        { name: "Gambler", description: "+2 Loot Rolls, -50% Gold", icon: "Dice", effectType: "MODIFIER", modifier: "GAMBLER", effectValue: 0 },
        { name: "Speed Demon", description: "+15% Speed, -10% Loot", icon: "Zap", effectType: "MODIFIER", modifier: "SPEED_DEMON", effectValue: 0 },
        { name: "Resourceful", description: "Drops Mats instead of Items", icon: "Gem", effectType: "MODIFIER", modifier: "RESOURCE_SCAVENGER", effectValue: 0 }
    ],
    [AdventurerRole.MAGE]: [
        { name: "Glass Cannon", description: "+40% Dmg, -20% Health", icon: "Skull", effectType: "MODIFIER", modifier: "GLASS_CANNON", effectValue: 0 },
        { name: "Golden Touch", description: "+50% Gold, -10% Dmg", icon: "Crown", effectType: "MODIFIER", modifier: "GOLDEN_TOUCH", effectValue: 0 },
        { name: "Logistician", description: "-10% Duration, -10% XP", icon: "Box", effectType: "MODIFIER", modifier: "LOGISTICIAN", effectValue: 0 }
    ]
};

export const getRandomFromPool = (pool: SkillTemplate[]) => pool[Math.floor(Math.random() * pool.length)];

// ... Keep existing ENEMIES, MATERIALS, DUNGEONS ...

export const CLASS_SKILLS: Record<AdventurerRole, Skill[]> = {
    [AdventurerRole.WARRIOR]: [
        { id: 'war_1', name: 'Ironclad', description: '+30 Base Health', unlockLevel: 3 },
        { id: 'war_2', name: 'Heavy Swing', description: '+15% Damage', unlockLevel: 8 },
        { id: 'war_3', name: 'Juggernaut', description: '+50 Health & +10% Damage', unlockLevel: 15 },
    ],
    [AdventurerRole.ROGUE]: [
        { id: 'rog_1', name: 'Quick Step', description: '+10% Speed', unlockLevel: 3 },
        { id: 'rog_2', name: 'Precision', description: '+10% Crit Chance', unlockLevel: 8 },
        { id: 'rog_3', name: 'Assassinate', description: '+30% Crit Damage', unlockLevel: 15 },
    ],
    [AdventurerRole.MAGE]: [
        { id: 'mag_1', name: 'Focus', description: '+5 Base Damage', unlockLevel: 3 },
        { id: 'mag_2', name: 'Glass Cannon', description: '+20% Damage, -10% Health', unlockLevel: 8 },
        { id: 'mag_3', name: 'Meteor', description: '+40% Damage', unlockLevel: 15 },
    ],
};

export const ENEMIES: Record<string, Enemy> = {
    'giant_rat': { id: 'giant_rat', name: 'Giant Rat', hp: 30, xpMin: 4, xpMax: 6, goldMin: 1, goldMax: 3 },
    'scavenger_goblin': { id: 'scavenger_goblin', name: 'Scavenger Goblin', hp: 150, xpMin: 12, xpMax: 18, goldMin: 6, goldMax: 10 },
    'dire_wolf': { id: 'dire_wolf', name: 'Dire Wolf', hp: 500, xpMin: 35, xpMax: 50, goldMin: 15, goldMax: 25 },
    'skeleton_warrior': { id: 'skeleton_warrior', name: 'Skeleton Warrior', hp: 2000, xpMin: 100, xpMax: 140, goldMin: 40, goldMax: 60 },
    'young_dragon': { id: 'young_dragon', name: 'Young Dragon', hp: 10000, xpMin: 700, xpMax: 900, goldMin: 250, goldMax: 400 },
    'void_sentinel': { id: 'void_sentinel', name: 'Void Sentinel', hp: 30000, xpMin: 1500, xpMax: 2500, goldMin: 1000, goldMax: 1500 },
    // Virtual Enemies for Non-Combat Contracts
    'forest_spirit': { id: 'forest_spirit', name: 'Forest Spirit', hp: 100, xpMin: 0, xpMax: 0, goldMin: 0, goldMax: 0 },
    'rock_golem': { id: 'rock_golem', name: 'Rock Golem', hp: 500, xpMin: 0, xpMax: 0, goldMin: 0, goldMax: 0 },
    'river_guardian': { id: 'river_guardian', name: 'River Guardian', hp: 100, xpMin: 0, xpMax: 0, goldMin: 0, goldMax: 0 },
    'deep_lurker': { id: 'deep_lurker', name: 'Deep Lurker', hp: 800, xpMin: 0, xpMax: 0, goldMin: 0, goldMax: 0 },
};

export const MATERIALS: Record<string, Material> = {
    'iron_ore': { id: 'iron_ore', name: 'Iron Ore', rarity: Rarity.COMMON, description: 'Basic metal for forging.', value: 2 },
    'hardwood': { id: 'hardwood', name: 'Hardwood', rarity: Rarity.COMMON, description: 'Sturdy wood for handles.', value: 2 },
    'mystic_herb': { id: 'mystic_herb', name: 'Mystic Herb', rarity: Rarity.UNCOMMON, description: 'Used in magical infusions.', value: 5 },
    'raw_fish': { id: 'raw_fish', name: 'Raw Fish', rarity: Rarity.COMMON, description: 'Provisions for the guild.', value: 1 },
    'prism_pearl': { id: 'prism_pearl', name: 'Prism Pearl', rarity: Rarity.RARE, description: 'Shiny gem found in waters.', value: 25 },
    'ancient_relic': { id: 'ancient_relic', name: 'Ancient Relic', rarity: Rarity.EPIC, description: 'A piece of lost history.', value: 100 },
};

export const DUNGEONS: Dungeon[] = [
  // --- COMBAT CONTRACTS ---
  {
    id: 'rat_cellar',
    name: 'Rat Cellar',
    type: ContractType.DUNGEON,
    tier: 1,
    level: 1,
    description: 'A damp cellar infested with vermin.',
    durationSeconds: 10,
    enemyId: 'giant_rat',
    dropChance: 0.20,
    recommendedPower: 25,
    unlockReq: {} // Always unlocked
  },
  {
    id: 'goblin_camp',
    name: 'Goblin Camp',
    type: ContractType.DUNGEON,
    tier: 2,
    level: 5,
    description: 'A noisy camp of scavengers.',
    durationSeconds: 30,
    enemyId: 'scavenger_goblin',
    dropChance: 0.25,
    recommendedPower: 100,
    unlockReq: {
        minPower: 80,
        previousDungeonId: 'rat_cellar',
        previousDungeonClears: 10
    }
  },
  {
    id: 'wolf_den',
    name: 'Wolf Den',
    type: ContractType.DUNGEON,
    tier: 3,
    level: 10,
    description: 'Howls echo from this dark cave.',
    durationSeconds: 60,
    enemyId: 'dire_wolf',
    dropChance: 0.30,
    recommendedPower: 300,
    unlockReq: {
        minPower: 250,
        previousDungeonId: 'goblin_camp',
        previousDungeonClears: 25
    }
  },
  {
    id: 'skeleton_crypt',
    name: 'Skeleton Crypt',
    type: ContractType.DUNGEON,
    tier: 4,
    level: 20,
    description: 'The dead do not rest easy here.',
    durationSeconds: 120,
    enemyId: 'skeleton_warrior',
    dropChance: 0.35,
    recommendedPower: 900,
    unlockReq: {
        minPower: 800,
        minGuildLevel: 3
    }
  },
  {
    id: 'dragon_peak',
    name: 'Dragon Peak',
    type: ContractType.DUNGEON,
    tier: 5,
    level: 50,
    description: 'A fiery challenge for the brave.',
    durationSeconds: 300,
    enemyId: 'young_dragon',
    dropChance: 0.40,
    recommendedPower: 2500,
    unlockReq: {
        minPower: 2000,
        minAscension: 1
    }
  },
  {
    id: 'void_depths',
    name: 'Void Depths',
    type: ContractType.DUNGEON,
    tier: 6,
    level: 75,
    description: 'Reality warps in this abyss.',
    durationSeconds: 600,
    enemyId: 'void_sentinel',
    dropChance: 0.50,
    recommendedPower: 6000,
    unlockReq: {
        minPower: 5000,
        minAscension: 3
    }
  },
  
  // --- GATHERING CONTRACTS (Simplified Curve for Non-Combat) ---
  {
    id: 'whispering_woods',
    name: 'Whispering Woods',
    type: ContractType.GATHERING,
    tier: 1,
    level: 1,
    description: 'Gather sturdy wood and herbs.',
    durationSeconds: 15,
    enemyId: 'forest_spirit',
    dropChance: 0.80, // Base chance to get ANY material per cycle
    recommendedPower: 30,
    lootTable: ['hardwood', 'mystic_herb'],
    unlockReq: {}
  },
  {
    id: 'iron_vein',
    name: 'Old Iron Mine',
    type: ContractType.GATHERING,
    tier: 2,
    level: 10,
    description: 'Extract ore from the depths.',
    durationSeconds: 45,
    enemyId: 'rock_golem',
    dropChance: 0.70,
    recommendedPower: 200,
    lootTable: ['iron_ore', 'ancient_relic'],
    unlockReq: { minPower: 150 }
  },

  // --- FISHING CONTRACTS ---
  {
    id: 'crystal_lake',
    name: 'Crystal Lake',
    type: ContractType.FISHING,
    tier: 1,
    level: 5,
    description: 'Peaceful waters with rare finds.',
    durationSeconds: 20,
    enemyId: 'river_guardian',
    dropChance: 0.60, // Lower chance but potentially higher value
    recommendedPower: 50,
    lootTable: ['raw_fish', 'prism_pearl'],
    unlockReq: { minPower: 40 }
  },
  {
    id: 'abyssal_trench',
    name: 'Abyssal Trench',
    type: ContractType.FISHING,
    tier: 3,
    level: 25,
    description: 'Dangerous fishing in deep waters.',
    durationSeconds: 90,
    enemyId: 'deep_lurker',
    dropChance: 0.50,
    recommendedPower: 1000,
    lootTable: ['raw_fish', 'prism_pearl', 'ancient_relic'],
    unlockReq: { minPower: 800 }
  }
];

export const UPGRADES: Upgrade[] = [
  {
    id: 'recruit_training',
    name: 'Recruit Training',
    description: 'Increases adventurer base damage.',
    type: 'COMBAT',
    cost: 50,
    costMultiplier: 1.5,
    level: 0,
    maxLevel: 50,
    effect: (lvl) => lvl * 2, 
  },
  {
    id: 'marketplace_connections',
    name: 'Market Connections',
    description: 'Increases gold gained from dungeons.',
    type: 'ECONOMY',
    cost: 100,
    costMultiplier: 1.4,
    level: 0,
    maxLevel: 20,
    effect: (lvl) => lvl * 0.1, 
  },
  {
    id: 'logistics_network',
    name: 'Logistics Network',
    description: 'Reduces dungeon travel time (duration).',
    type: 'SPEED',
    cost: 500,
    costMultiplier: 1.6,
    level: 0,
    maxLevel: 10,
    effect: (lvl) => lvl * 0.05, 
  },
  {
    id: 'loot_logic',
    name: 'Loot Logic',
    description: 'Increases chance to find items.',
    type: 'LOOT',
    cost: 250,
    costMultiplier: 1.5,
    level: 0,
    maxLevel: 20,
    effect: (lvl) => lvl * 0.02, 
  },
];

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
    {
        id: 'legacy_wealth',
        name: 'Legacy Wealth',
        description: 'Permanent Gold Gain multiplier.',
        cost: 1,
        costMultiplier: 2,
        level: 0,
        maxLevel: 10,
        effect: (lvl) => lvl * 0.25, // +25% per level
    },
    {
        id: 'renowned_guild',
        name: 'Renowned Guild',
        description: 'Permanent XP Gain multiplier.',
        cost: 2,
        costMultiplier: 1.5,
        level: 0,
        maxLevel: 10,
        effect: (lvl) => lvl * 0.25, // +25% per level
    },
    {
        id: 'divine_favor',
        name: 'Divine Favor',
        description: 'Increases chance for Epic/Legendary items.',
        cost: 5,
        costMultiplier: 2.5,
        level: 0,
        maxLevel: 5,
        effect: (lvl) => lvl * 0.1, // +10% higher tier chance
    },
    {
        id: 'master_crafters',
        name: 'Master Crafters',
        description: 'Items spawn with higher base stats.',
        cost: 10,
        costMultiplier: 3,
        level: 0,
        maxLevel: 5,
        effect: (lvl) => lvl * 0.1, // +10% stats
    }
];

export { STAT_POOLS };
