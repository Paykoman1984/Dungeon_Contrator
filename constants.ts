
import { Dungeon, Rarity, Upgrade, AdventurerRole, Skill, Enemy, WeaponType, PrestigeUpgrade, ContractType, Material, AdventurerTrait, SkillNode } from './types';

export const INITIAL_GOLD = 0;
export const INVENTORY_SIZE = 50;

export const RARITY_COLORS: Record<Rarity, string> = {
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
    1: 'text-red-500 font-bold shadow-red-500/50 drop-shadow-sm', // Divine / Mythic
    2: 'text-orange-400 font-bold', // Legendary tier
    3: 'text-purple-400', // Epic tier
    4: 'text-blue-400', // Rare tier
    5: 'text-green-400', // Uncommon tier
    6: 'text-slate-300', // Common tier
    7: 'text-slate-500', // Poor tier
};

// Lower weight = RARE. High weight = COMMON.
export const TIER_WEIGHTS = [
    { tier: 1, weight: 1 },   // 0.5% (approx 1/200)
    { tier: 2, weight: 5 },   // 2.5%
    { tier: 3, weight: 14 },  // 7%
    { tier: 4, weight: 30 },  // 15%
    { tier: 5, weight: 50 },  // 25%
    { tier: 6, weight: 60 },  // 30%
    { tier: 7, weight: 40 },  // 20%
];

// Multiplier applied to the base stat budget
export const TIER_MULTIPLIERS: Record<number, number> = {
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

// Cost multipliers for crafting actions (Enchant/Reroll)
// Scaling is steeper than stats to make high-end crafting an endgame gold sink
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

// Define compatible weapons for each class
export const CLASS_WEAPONS: Record<AdventurerRole, WeaponType[]> = {
    [AdventurerRole.WARRIOR]: [WeaponType.SWORD, WeaponType.BLUNT],
    [AdventurerRole.ROGUE]: [WeaponType.DAGGER, WeaponType.BOW],
    [AdventurerRole.MAGE]: [WeaponType.STAFF, WeaponType.BOOK],
};

// --- ADVENTURER NAMES & TITLES ---

export const ADVENTURER_NAMES = [
    "Eldric", "Mara", "Thorne", "Silas", "Vesper", "Lyra", "Kael", "Aria", "Grom", "Elara",
    "Bram", "Caelum", "Darius", "Elowen", "Fiora", "Garrick", "Hestia", "Isolde", "Jarek", "Kaelen",
    "Liora", "Magnus", "Neria", "Orin", "Pael", "Quinn", "Rolan", "Seren", "Talia", "Ulric",
    "Vane", "Wren", "Xander", "Yara", "Zephyr", "Ash", "Beryl", "Corin", "Dax", "Elian",
    "Fen", "Gideon", "Hale", "Ira", "Joss", "Knox", "Lark", "Milo", "Nash", "Ode",
    "Pyke", "Ren", "Sol", "Tor", "Ursa", "Val", "Wyatt", "Xen", "Yuri", "Zane"
];

// Titles based on Role and Rarity
// Index 0: Common, 1: Uncommon, 2: Rare, 3: Epic, 4: Legendary
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

// --- NEW SYSTEM: TRAITS (ARCHETYPES) ---
export const ADVENTURER_TRAITS: AdventurerTrait[] = [
    { id: 'giant_slayer', name: 'Giant Slayer', description: '+10% Damage', effect: (s) => s.damage *= 1.10 },
    { id: 'hoarder', name: 'Hoarder', description: '+10% Gold Gain', effect: (s) => s.goldGain += 0.10 },
    { id: 'scout', name: 'Scout', description: '+10% Movement Speed', effect: (s) => s.speed *= 1.10 },
    { id: 'tank', name: 'Iron Skin', description: '+15% Health', effect: (s) => s.health *= 1.15 },
    { id: 'lucky', name: 'Lucky', description: '+5% Crit Chance', effect: (s) => s.critChance += 0.05 },
    { id: 'scholar', name: 'Scholar', description: '+10% XP Gain', effect: (s) => s.xpGain += 0.10 },
    { id: 'miner', name: 'Miner', description: '+10% Material Yield (simulated)', effect: (s) => s.lootLuck += 0.10 },
];

// --- ARCHETYPE DEFINITIONS (Predefined Tree Templates) ---

export interface ArchetypeDefinition {
    name: string; // e.g. "Juggernaut"
    role: AdventurerRole;
    nodes: Partial<SkillNode>[]; 
}

/*
    NEW NODE STRUCTURE MAPPING FOR VISUALIZER:
    'root': Bottom Center
    'branch_l': Middle Left Choice (Exclusive A)
    'branch_r': Middle Right Choice (Exclusive A)
    'star_l': Far Left Dead End (Req branch_l)
    'star_r': Far Right Dead End (Req branch_r)
    'core': Top Center Merge (Req branch_l OR branch_r)
    'cap': Top Tip (Req core)
*/

export const ARCHETYPES: Record<AdventurerRole, ArchetypeDefinition[]> = {
    [AdventurerRole.WARRIOR]: [
        {
            name: "Berserker",
            role: AdventurerRole.WARRIOR,
            nodes: [
                { id: 'root', name: 'Battle Rage', description: '+10% Damage', icon: 'Sword', effectType: 'STAT', effectValue: 0.10, statTarget: 'damage', cost: 1 },
                
                // LEFT PATH (Offense)
                { id: 'branch_l', name: 'Reckless Swing', description: '+20% Damage, -10% HP', icon: 'Skull', effectType: 'STAT', effectValue: 0.20, statTarget: 'damage', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_l', name: 'Decapitate', description: '+40% Crit Damage', icon: 'Crosshair', effectType: 'STAT', effectValue: 0.40, statTarget: 'damage', cost: 2, requires: ['branch_l'] }, // Dead End
                
                // RIGHT PATH (Speed)
                { id: 'branch_r', name: 'Bloodlust', description: '+25% Speed', icon: 'Zap', effectType: 'STAT', effectValue: 0.25, statTarget: 'speed', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_r', name: 'Adrenaline', description: '+15% Crit Chance', icon: 'Eye', effectType: 'STAT', effectValue: 0.15, statTarget: 'crit', cost: 2, requires: ['branch_r'] }, // Dead End

                // MERGE
                { id: 'core', name: 'Pain Tolerance', description: '+20% Health', icon: 'Heart', effectType: 'STAT', effectValue: 0.20, statTarget: 'health', cost: 2, requires: ['branch_l', 'branch_r'] },
                
                // CAPSTONE
                { id: 'cap', name: 'Weapon Master', description: 'Weapon Stats 2x, No Trinket', icon: 'Sword', effectType: 'MODIFIER', modifier: 'WEAPON_MASTER', effectValue: 0, cost: 3, requires: ['core'] }
            ]
        },
        {
            name: "Juggernaut",
            role: AdventurerRole.WARRIOR,
            nodes: [
                { id: 'root', name: 'Iron Skin', description: '+15% Health', icon: 'Shield', effectType: 'STAT', effectValue: 0.15, statTarget: 'health', cost: 1 },
                
                // LEFT PATH (Pure Tank)
                { id: 'branch_l', name: 'Heavy Plating', description: '+30% Health', icon: 'Heart', effectType: 'STAT', effectValue: 0.30, statTarget: 'health', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_l', name: 'Unbreakable', description: '+20% Health, -10% Speed', icon: 'Shield', effectType: 'STAT', effectValue: 0.20, statTarget: 'health', cost: 2, requires: ['branch_l'] },

                // RIGHT PATH (Utility Tank)
                { id: 'branch_r', name: 'Vanguard', description: '+20% XP Gain', icon: 'Book', effectType: 'ECONOMY', effectValue: 0.20, statTarget: 'xp', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_r', name: 'Commander', description: '+15% Gold Gain', icon: 'Crown', effectType: 'ECONOMY', effectValue: 0.15, statTarget: 'gold', cost: 2, requires: ['branch_r'] },

                // MERGE
                { id: 'core', name: 'Fortress', description: '+10% Dmg & Health', icon: 'Crown', effectType: 'STAT', effectValue: 0.10, statTarget: 'all', cost: 2, requires: ['branch_l', 'branch_r'] },
                
                // CAPSTONE
                { id: 'cap', name: 'Methodical', description: '+50% Rewards, +20% Time', icon: 'Clock', effectType: 'MODIFIER', modifier: 'METHODICAL', effectValue: 0, cost: 3, requires: ['core'] }
            ]
        }
    ],
    [AdventurerRole.ROGUE]: [
        {
            name: "Assassin",
            role: AdventurerRole.ROGUE,
            nodes: [
                { id: 'root', name: 'Lethality', description: '+10% Crit Chance', icon: 'Crosshair', effectType: 'STAT', effectValue: 0.10, statTarget: 'crit', cost: 1 },
                
                { id: 'branch_l', name: 'Vital Points', description: '+25% Crit Damage', icon: 'Skull', effectType: 'STAT', effectValue: 0.25, statTarget: 'damage', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_l', name: 'Cold Blood', description: '+20% Damage', icon: 'Sword', effectType: 'STAT', effectValue: 0.20, statTarget: 'damage', cost: 2, requires: ['branch_l'] },

                { id: 'branch_r', name: 'Ambush', description: '+25% Speed', icon: 'Zap', effectType: 'STAT', effectValue: 0.25, statTarget: 'speed', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_r', name: 'Shadow Step', description: '+15% Crit Chance', icon: 'Eye', effectType: 'STAT', effectValue: 0.15, statTarget: 'crit', cost: 2, requires: ['branch_r'] },

                { id: 'core', name: 'Executioner', description: '+15% Damage', icon: 'Sword', effectType: 'STAT', effectValue: 0.15, statTarget: 'damage', cost: 2, requires: ['branch_l', 'branch_r'] },
                { id: 'cap', name: 'Gambler', description: 'Extra Loot, -50% Gold', icon: 'Dice', effectType: 'MODIFIER', modifier: 'GAMBLER', effectValue: 0, cost: 3, requires: ['core'] }
            ]
        },
        {
            name: "Scavenger",
            role: AdventurerRole.ROGUE,
            nodes: [
                { id: 'root', name: 'Quick Fingers', description: '+15% Loot Luck', icon: 'Box', effectType: 'ECONOMY', effectValue: 0.15, statTarget: 'loot', cost: 1 },
                
                { id: 'branch_l', name: 'Appraiser', description: '+30% Gold Gain', icon: 'Coins', effectType: 'ECONOMY', effectValue: 0.30, statTarget: 'gold', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_l', name: 'Merchant', description: '+20% Gold Gain', icon: 'Coins', effectType: 'ECONOMY', effectValue: 0.20, statTarget: 'gold', cost: 2, requires: ['branch_l'] },

                { id: 'branch_r', name: 'Surveyor', description: '+30% Material Yield', icon: 'Map', effectType: 'ECONOMY', effectValue: 0.30, statTarget: 'loot', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_r', name: 'Dungeoneer', description: '+20% XP Gain', icon: 'Book', effectType: 'ECONOMY', effectValue: 0.20, statTarget: 'xp', cost: 2, requires: ['branch_r'] },

                { id: 'core', name: 'Escape Artist', description: '+15% Speed', icon: 'Zap', effectType: 'STAT', effectValue: 0.15, statTarget: 'speed', cost: 2, requires: ['branch_l', 'branch_r'] },
                { id: 'cap', name: 'Resourceful', description: 'Drops Mats instead of Items', icon: 'Gem', effectType: 'MODIFIER', modifier: 'RESOURCE_SCAVENGER', effectValue: 0, cost: 3, requires: ['core'] }
            ]
        }
    ],
    [AdventurerRole.MAGE]: [
        {
            name: "Archmage",
            role: AdventurerRole.MAGE,
            nodes: [
                { id: 'root', name: 'Arcane Power', description: '+15% Damage', icon: 'Sparkles', effectType: 'STAT', effectValue: 0.15, statTarget: 'damage', cost: 1 },
                
                { id: 'branch_l', name: 'Overload', description: '+30% Dmg, -10% HP', icon: 'Flame', effectType: 'STAT', effectValue: 0.30, statTarget: 'damage', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_l', name: 'Cataclysm', description: '+40% Damage, -10% Speed', icon: 'Skull', effectType: 'STAT', effectValue: 0.40, statTarget: 'damage', cost: 2, requires: ['branch_l'] },

                { id: 'branch_r', name: 'Time Warp', description: '+25% Speed', icon: 'Zap', effectType: 'STAT', effectValue: 0.25, statTarget: 'speed', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_r', name: 'Flow State', description: '+15% Crit Chance', icon: 'Eye', effectType: 'STAT', effectValue: 0.15, statTarget: 'crit', cost: 2, requires: ['branch_r'] },

                { id: 'core', name: 'Focus', description: '+15% Crit Chance', icon: 'Eye', effectType: 'STAT', effectValue: 0.15, statTarget: 'crit', cost: 2, requires: ['branch_l', 'branch_r'] },
                { id: 'cap', name: 'Glass Cannon', description: '+50% Dmg, -30% HP', icon: 'Skull', effectType: 'MODIFIER', modifier: 'GLASS_CANNON', effectValue: 0, cost: 3, requires: ['core'] }
            ]
        },
        {
            name: "Alchemist",
            role: AdventurerRole.MAGE,
            nodes: [
                { id: 'root', name: 'Transmute', description: '+15% Gold Gain', icon: 'Beaker', effectType: 'ECONOMY', effectValue: 0.15, statTarget: 'gold', cost: 1 },
                
                { id: 'branch_l', name: 'Midas Touch', description: '+35% Gold Gain', icon: 'Coins', effectType: 'ECONOMY', effectValue: 0.35, statTarget: 'gold', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_l', name: 'Greed', description: '+10% Loot Luck', icon: 'Box', effectType: 'ECONOMY', effectValue: 0.10, statTarget: 'loot', cost: 2, requires: ['branch_l'] },

                { id: 'branch_r', name: 'Philosopher', description: '+35% XP Gain', icon: 'Book', effectType: 'ECONOMY', effectValue: 0.35, statTarget: 'xp', cost: 1, exclusiveGroup: 't2' },
                { id: 'star_r', name: 'Wisdom', description: '+20% XP Gain', icon: 'Book', effectType: 'ECONOMY', effectValue: 0.20, statTarget: 'xp', cost: 2, requires: ['branch_r'] },

                { id: 'core', name: 'Potion Master', description: '+20% Health', icon: 'Heart', effectType: 'STAT', effectValue: 0.20, statTarget: 'health', cost: 2, requires: ['branch_l', 'branch_r'] },
                { id: 'cap', name: 'Golden Touch', description: '+100% Gold, -20% Dmg', icon: 'Crown', effectType: 'MODIFIER', modifier: 'GOLDEN_TOUCH', effectValue: 0, cost: 3, requires: ['core'] }
            ]
        }
    ]
};

// Legacy Skills (Kept for compatibility)
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
    level: 1,
    description: 'A damp cellar infested with vermin.',
    durationSeconds: 10,
    enemyId: 'giant_rat',
    dropChance: 0.20,
    recommendedPower: 25
  },
  {
    id: 'goblin_camp',
    name: 'Goblin Camp',
    type: ContractType.DUNGEON,
    level: 5,
    description: 'A noisy camp of scavengers.',
    durationSeconds: 30,
    enemyId: 'scavenger_goblin',
    dropChance: 0.25,
    recommendedPower: 120
  },
  {
    id: 'wolf_den',
    name: 'Wolf Den',
    type: ContractType.DUNGEON,
    level: 10,
    description: 'Howls echo from this dark cave.',
    durationSeconds: 60,
    enemyId: 'dire_wolf',
    dropChance: 0.30,
    recommendedPower: 350
  },
  {
    id: 'skeleton_crypt',
    name: 'Skeleton Crypt',
    type: ContractType.DUNGEON,
    level: 20,
    description: 'The dead do not rest easy here.',
    durationSeconds: 120,
    enemyId: 'skeleton_warrior',
    dropChance: 0.35,
    recommendedPower: 1200
  },
  {
    id: 'dragon_peak',
    name: 'Dragon Peak',
    type: ContractType.DUNGEON,
    level: 50,
    description: 'A fiery challenge for the brave.',
    durationSeconds: 300,
    enemyId: 'young_dragon',
    dropChance: 0.40,
    recommendedPower: 5000
  },
  
  // --- GATHERING CONTRACTS ---
  {
    id: 'whispering_woods',
    name: 'Whispering Woods',
    type: ContractType.GATHERING,
    level: 1,
    description: 'Gather sturdy wood and herbs.',
    durationSeconds: 15,
    enemyId: 'forest_spirit',
    dropChance: 0.80, // Base chance to get ANY material per cycle
    recommendedPower: 30,
    lootTable: ['hardwood', 'mystic_herb']
  },
  {
    id: 'iron_vein',
    name: 'Old Iron Mine',
    type: ContractType.GATHERING,
    level: 10,
    description: 'Extract ore from the depths.',
    durationSeconds: 45,
    enemyId: 'rock_golem',
    dropChance: 0.70,
    recommendedPower: 200,
    lootTable: ['iron_ore', 'ancient_relic']
  },

  // --- FISHING CONTRACTS ---
  {
    id: 'crystal_lake',
    name: 'Crystal Lake',
    type: ContractType.FISHING,
    level: 5,
    description: 'Peaceful waters with rare finds.',
    durationSeconds: 20,
    enemyId: 'river_guardian',
    dropChance: 0.60, // Lower chance but potentially higher value
    recommendedPower: 50,
    lootTable: ['raw_fish', 'prism_pearl']
  },
  {
    id: 'abyssal_trench',
    name: 'Abyssal Trench',
    type: ContractType.FISHING,
    level: 25,
    description: 'Dangerous fishing in deep waters.',
    durationSeconds: 90,
    enemyId: 'deep_lurker',
    dropChance: 0.50,
    recommendedPower: 1000,
    lootTable: ['raw_fish', 'prism_pearl', 'ancient_relic']
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
