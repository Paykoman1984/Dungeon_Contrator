
import React, { useEffect, useState } from 'react';
import { useGame } from '../services/GameContext';
import { DUNGEONS, ENEMIES, ROLE_CONFIG } from '../constants';
import { Skull, ShieldAlert, Sparkles, Crosshair, Sword } from 'lucide-react';

interface CombatStageProps {
    dungeonId: string;
    adventurerIds: string[];
}

export const CombatStage: React.FC<CombatStageProps> = ({ dungeonId, adventurerIds }) => {
    const { state } = useGame();
    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    const enemy = dungeon ? ENEMIES[dungeon.enemyId] : null;

    // Local state to trigger CSS animations
    const [heroAttacking, setHeroAttacking] = useState<number | null>(null); // Index of hero attacking
    const [enemyAttacking, setEnemyAttacking] = useState(false);

    // Get actual adventurer objects
    const party = adventurerIds.map(id => state.adventurers.find(a => a.id === id)).filter(Boolean);

    // Animation Loop
    useEffect(() => {
        // Hero Attacks
        const heroInterval = setInterval(() => {
            const randomHeroIndex = Math.floor(Math.random() * party.length);
            setHeroAttacking(randomHeroIndex);
            setTimeout(() => setHeroAttacking(null), 400); // Reset after animation
        }, 1200); // Frequent hero attacks

        // Enemy Attacks
        const enemyInterval = setInterval(() => {
            setEnemyAttacking(true);
            setTimeout(() => setEnemyAttacking(false), 500);
        }, 3000); // Slower enemy attacks

        return () => {
            clearInterval(heroInterval);
            clearInterval(enemyInterval);
        };
    }, [party.length]);

    if (!dungeon || !enemy) return null;

    // Dynamic Backgrounds based on dungeon ID (simple gradients)
    const getBgStyle = () => {
        switch(dungeon.id) {
            case 'rat_cellar': return 'from-slate-900 to-slate-800';
            case 'goblin_camp': return 'from-emerald-950 to-slate-900';
            case 'wolf_den': return 'from-slate-900 to-stone-900';
            case 'skeleton_crypt': return 'from-indigo-950 to-slate-900';
            case 'dragon_peak': return 'from-red-950 to-orange-950';
            default: return 'from-slate-900 to-slate-800';
        }
    };

    return (
        <div className={`w-full h-32 rounded-lg mb-3 bg-gradient-to-r ${getBgStyle()} relative overflow-hidden border border-white/5 flex items-center justify-between px-8 shadow-inner`}>
            
            {/* Environment Particles (Static for now, could be animated clouds/dust) */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

            {/* --- LEFT SIDE: HEROES --- */}
            <div className="flex gap-4 z-10">
                {party.map((hero, idx) => {
                    if (!hero) return null;
                    const isAttacking = heroAttacking === idx;
                    const isHit = enemyAttacking; // Simplification: When enemy attacks, all heroes "shake"

                    return (
                        <div 
                            key={hero.id} 
                            className={`
                                flex flex-col items-center justify-center transition-all duration-75
                                ${!isAttacking ? `animate-float delay-${idx * 100}` : 'animate-attack-hero'}
                                ${isHit ? 'animate-hit' : ''}
                            `}
                        >
                            {/* Hero Icon */}
                            <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center shadow-lg border-2
                                ${hero.role === 'Warrior' ? 'bg-red-900/80 border-red-500/50 text-red-200' : ''}
                                ${hero.role === 'Rogue' ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-200' : ''}
                                ${hero.role === 'Mage' ? 'bg-blue-900/80 border-blue-500/50 text-blue-200' : ''}
                            `}
                            >
                                {hero.role === 'Warrior' && <ShieldAlert size={20} />}
                                {hero.role === 'Rogue' && <Crosshair size={20} />}
                                {hero.role === 'Mage' && <Sparkles size={20} />}
                            </div>
                            {/* Health Bar (Fake Visual) */}
                            <div className="w-8 h-1 bg-black/50 mt-1 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-3/4"></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* VS Effect (Subtle) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 font-black text-6xl italic pointer-events-none">
                VS
            </div>

            {/* --- RIGHT SIDE: ENEMY --- */}
            <div className={`
                flex flex-col items-center justify-center z-10
                ${!enemyAttacking ? 'animate-float' : 'animate-attack-enemy'}
                ${heroAttacking !== null ? 'animate-hit' : ''}
            `}>
                <div className="w-16 h-16 rounded-xl bg-slate-950/80 border-2 border-red-900/50 flex items-center justify-center shadow-2xl relative">
                    {/* Enemy Icon based on ID */}
                    <EnemyIcon id={dungeon.enemyId} />
                    
                    {/* Level Badge */}
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-red-800">
                        {dungeon.level}
                    </div>
                </div>
                 {/* Enemy Health Bar (Fake Visual) */}
                 <div className="w-14 h-1.5 bg-black/50 mt-2 rounded-full overflow-hidden border border-black/30">
                    <div className="h-full bg-red-600 w-full animate-pulse"></div>
                </div>
                <span className="text-[10px] font-bold text-red-400 mt-1 bg-black/40 px-2 py-0.5 rounded uppercase tracking-wider">
                    {enemy.name}
                </span>
            </div>

        </div>
    );
};

const EnemyIcon: React.FC<{ id: string }> = ({ id }) => {
    // Simple icon mapping
    if (id.includes('rat')) return <span className="text-2xl">🐀</span>;
    if (id.includes('goblin')) return <span className="text-2xl">👺</span>;
    if (id.includes('wolf')) return <span className="text-2xl">🐺</span>;
    if (id.includes('skeleton')) return <Skull size={32} className="text-slate-300" />;
    if (id.includes('dragon')) return <span className="text-2xl">🐲</span>;
    return <Skull size={32} className="text-red-500" />;
};
