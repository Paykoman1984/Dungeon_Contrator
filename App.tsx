
import React, { useState } from 'react';
import { GameProvider, useGame } from './services/GameContext';
import { VisualProvider } from './services/VisualContext'; // New Provider
import { DungeonList } from './components/DungeonList';
import { AdventurerList } from './components/AdventurerList';
import { InventoryPanel } from './components/InventoryPanel';
import { GuildPanel } from './components/GuildPanel';
import { PrestigePanel } from './components/PrestigePanel';
import { RealmPanel } from './components/RealmPanel';
import { DungeonResultModal } from './components/DungeonResultModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { RealmLevelUpModal } from './components/RealmLevelUpModal';
import { RewardOverlay } from './components/RewardOverlay'; 
import { formatNumber, calculateConservativePower } from './utils/gameMath';
import { INVENTORY_SIZE } from './constants';
import { LayoutDashboard, Users, Swords, Package, Landmark, Crown, Globe } from 'lucide-react';

const AppContent: React.FC = () => {
  const { state } = useGame();
  const [view, setView] = useState<'DASHBOARD' | 'ADVENTURERS' | 'INVENTORY' | 'GUILD' | 'PRESTIGE' | 'REALM'>('DASHBOARD');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Calculate Total Power using CONSERVATIVE stats via helper
  const totalGuildPower = state.adventurers.reduce((sum, adv) => {
      return sum + calculateConservativePower(adv, state);
  }, 0);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <RewardOverlay /> 
      <DungeonResultModal />
      <RealmLevelUpModal />
      <SaveLoadModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 transition-all z-10">
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-center md:justify-start gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Swords size={18} className="text-white" />
          </div>
          <h1 className="hidden md:block font-bold text-lg tracking-tight">Dungeon<br/><span className="text-indigo-400">Contractor</span></h1>
        </div>

        <nav className="flex-1 p-2 md:p-4 space-y-2">
          <SidebarItem 
            active={view === 'DASHBOARD'} 
            onClick={() => setView('DASHBOARD')} 
            icon={<LayoutDashboard size={20} />} 
            label="Contracts" 
          />
          <SidebarItem 
            active={view === 'ADVENTURERS'} 
            onClick={() => setView('ADVENTURERS')} 
            icon={<Users size={20} />} 
            label="Contractors" 
            badge={state.adventurers.some(a => a.xp >= a.xpToNextLevel) ? '!' : undefined}
          />
          <SidebarItem 
            active={view === 'INVENTORY'} 
            onClick={() => setView('INVENTORY')} 
            icon={<Package size={20} />} 
            label="Inventory/Craft" 
            badge={state.inventory.length >= INVENTORY_SIZE ? 'FULL' : undefined}
          />
          <SidebarItem 
            active={view === 'GUILD'} 
            onClick={() => setView('GUILD')} 
            icon={<Landmark size={20} />} 
            label="Guild Ops" 
          />
          <SidebarItem 
            active={view === 'REALM'} 
            onClick={() => setView('REALM')} 
            icon={<Globe size={20} />} 
            label="Realm" 
            badge={state.realm.realmRank > 0 ? `R${state.realm.realmRank}` : undefined}
          />
          
          <div className="h-px bg-slate-800 my-2"></div>
          
          <SidebarItem 
            active={view === 'PRESTIGE'} 
            onClick={() => setView('PRESTIGE')} 
            icon={<Crown size={20} />} 
            label="Ascension" 
            badge={state.prestigeCurrency > 0 ? formatNumber(state.prestigeCurrency) : undefined}
          />
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-4">
            {/* Treasury */}
            <div>
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider text-center md:text-left">Treasury</div>
                <div className="text-center md:text-left font-mono text-xl text-yellow-400 font-bold drop-shadow-sm">
                    {formatNumber(state.gold)} <span className="text-sm text-yellow-600">g</span>
                </div>
            </div>

            {/* Guild Power */}
            <div className="pt-4 border-t border-slate-800/50">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider text-center md:text-left">Total Power</div>
                <div className="text-center md:text-left font-mono text-xl text-red-400 font-bold drop-shadow-sm">
                    {formatNumber(totalGuildPower)} <span className="text-sm text-red-600">PWR</span>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-950 relative">
          <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
             {view === 'DASHBOARD' && (
                 <div className="space-y-6">
                    <header className="mb-6">
                        <h2 className="text-2xl font-bold text-white">Active Contracts</h2>
                        <p className="text-slate-400">Select a dungeon and assign a contractor to begin.</p>
                    </header>
                    <DungeonList />
                 </div>
             )}
             {view === 'ADVENTURERS' && <AdventurerList />}
             {view === 'INVENTORY' && <InventoryPanel />}
             {view === 'GUILD' && <GuildPanel />}
             {view === 'PRESTIGE' && <PrestigePanel />}
             {view === 'REALM' && <RealmPanel />}
          </div>
      </main>
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: string }> = ({ active, onClick, icon, label, badge }) => (
    <button
        onClick={onClick}
        className={`
            w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-lg transition-all relative
            ${active ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
        `}
    >
        {icon}
        <span className="hidden md:block font-medium">{label}</span>
        {badge && (
            <span className="absolute top-2 right-2 md:top-auto md:bottom-auto md:right-3 w-auto min-w-[1.25rem] h-5 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full md:rounded font-bold flex items-center justify-center shadow-lg">
                {badge === '!' ? '' : badge}
            </span>
        )}
    </button>
);

const App: React.FC = () => {
  return (
    <GameProvider>
        <VisualProvider>
            <AppContent />
        </VisualProvider>
    </GameProvider>
  );
};

export default App;
