
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

export interface Adventurer {
  id: string;
  name: string;
  role: AdventurerRole;
  rarity: Rarity;
  level: number;
  xp: number;
  xpToNextLevel: number;
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
  level: number;
  description: string;
  durationSeconds: number;
  enemyId: string; 
  dropChance: number;
  recommendedPower: number;
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
  timestamp: number;
}

export interface GameState {
  gold: number;
  prestigeCurrency: number;
  adventurers: Adventurer[];
  inventory: Item[];
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
