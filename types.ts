
export enum Rarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
}

export enum ItemType {
  WEAPON = 'Weapon',
  ARMOR = 'Armor',
  TRINKET = 'Trinket',
}

export enum ContractType {
    DUNGEON = 'Dungeon',
    GATHERING = 'Gathering',
    FISHING = 'Fishing'
}

export enum WeaponType {
  SWORD = 'Sword',
  BLUNT = 'Blunt', // Mace, Hammer
  DAGGER = 'Dagger',
  BOW = 'Bow',
  STAFF = 'Staff',
  BOOK = 'Book',
  NONE = 'None' // For Armor/Trinkets
}

export enum AdventurerRole {
  WARRIOR = 'Warrior',
  ROGUE = 'Rogue',
  MAGE = 'Mage',
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
}

// --- NEW HYBRID SYSTEM TYPES ---

export interface AdventurerTrait {
    id: string;
    name: string;
    description: string;
    effect: (stats: any, state: any) => void; // Mutates stats object
}

export interface SkillNode {
    id: string;
    name: string;
    description: string;
    icon: string; // Icon name for Lucide
    x: number; // For visual layout (grid col)
    y: number; // For visual layout (grid row)
    requires: string[]; // IDs of prerequisite nodes
    maxLevel: number; // Usually 1 for small trees
    cost: number;
    effectType: 'STAT' | 'ECONOMY' | 'SPEED';
    effectValue: number; // e.g., 0.10 for 10%
    statTarget?: string; // 'damage', 'health', 'gold', etc.
}

// -------------------------------

export interface ItemStat {
  name: string;
  value: number;
  isPercentage: boolean;
  tier: number; // 1 (Best) to 7 (Worst)
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  subtype: WeaponType; // New field
  classRestriction: AdventurerRole[]; // New field: Which classes can use this
  rarity: Rarity;
  level: number;
  stats: ItemStat[];
  value: number; 
}

export interface Material {
    id: string;
    name: string;
    rarity: Rarity;
    description: string;
    value: number;
}

export interface Adventurer {
  id: string;
  name: string;
  role: AdventurerRole;
  rarity: Rarity;
  level: number;
  xp: number;
  xpToNextLevel: number;
  
  // Proficiency XP
  gatheringXp: number;
  fishingXp: number;

  // Hybrid System Fields
  traitId: string; // The permanent archetype
  skillPoints: number; // Available points
  unlockedSkills: string[]; // IDs of unlocked nodes from their Role tree
  skillTree: SkillNode[]; // New: Unique tree for this adventurer

  slots: {
    [ItemType.WEAPON]: Item | null;
    [ItemType.ARMOR]: Item | null;
    [ItemType.TRINKET]: Item | null;
  };
  baseStats: {
    damage: number;
    health: number;
    speed: number;
    critChance: number;
  };
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  xpMin: number;
  xpMax: number;
  goldMin: number;
  goldMax: number;
}

export interface Dungeon {
  id: string;
  name: string;
  type: ContractType; // New Field
  level: number;
  description: string;
  durationSeconds: number;
  enemyId: string; // Used for visuals/difficulty scaling even in gathering
  dropChance: number; // For gathering: Material yield chance/multiplier
  recommendedPower: number;
  lootTable?: string[]; // IDs of materials that can drop
}

export interface RunSnapshot {
    dps: number;
    power: number;
    goldBonus: number;
    xpBonus: number;
    lootBonus: number;
}

export interface ActiveRun {
  id: string; 
  dungeonId: string;
  adventurerIds: string[]; 
  startTime: number;
  duration: number; 
  runsRemaining: number;
  totalRuns: number;
  autoRepeat: boolean; 
  snapshot: RunSnapshot;
  // Snapshot of the specific adventurers (stats/gear) at the start of the run
  adventurerState: Record<string, Adventurer>;
  // Tracks slots that have been changed during the run (to force Pending state)
  modifiedSlots?: Record<string, ItemType[]>;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  costMultiplier: number;
  level: number;
  maxLevel: number;
  effect: (level: number) => number;
  type: 'ECONOMY' | 'COMBAT' | 'SPEED' | 'LOOT';
}

export interface PrestigeUpgrade {
    id: string;
    name: string;
    description: string;
    cost: number; // In Prestige Currency
    costMultiplier: number;
    level: number;
    maxLevel: number;
    effect: (level: number) => number;
}

export interface DungeonReport {
  id: string;
  dungeonName: string;
  success: boolean;
  kills: number; 
  goldEarned: number;
  xpEarned: number;
  itemsFound: Item[];
  materialsFound: Record<string, number>; // New field for mats
  timestamp: number;
}

export interface GameState {
  gold: number;
  prestigeCurrency: number;
  adventurers: Adventurer[];
  inventory: Item[];
  materials: Record<string, number>; // New field: Material ID -> Quantity
  activeRuns: ActiveRun[];
  unlockedDungeons: string[]; 
  upgrades: { [id: string]: number }; 
  prestigeUpgrades: { [id: string]: number }; // New field
  lastParties: Record<string, string[]>; 
  recentReports: DungeonReport[]; 
  lastSaveTime: number;
  statistics: {
    totalGoldEarned: number;
    monstersKilled: number;
    dungeonsCleared: number;
  };
}
