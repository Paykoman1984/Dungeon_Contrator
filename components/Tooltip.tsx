import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Item, Skill } from '../types';
import { RARITY_COLORS } from '../constants';

// --- Generic Tooltip Logic ---

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = "" }) => {
  const [state, setState] = useState<{ top: number; left: number; position: 'top' | 'bottom' } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      
      // Determine if we should show above or below
      // If we have less than 200px above, show below to prevent clipping
      const showBelow = rect.top < 200;

      setState({
        top: showBelow ? rect.bottom + 8 : rect.top - 8,
        left: rect.left + rect.width / 2,
        position: showBelow ? 'bottom' : 'top'
      });
    }
  };

  const handleMouseLeave = () => {
    setState(null);
  };

  return (
    <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        className={className}
    >
      {children}
      {state && createPortal(
        <TooltipPortal top={state.top} left={state.left} position={state.position}>
            {content}
        </TooltipPortal>,
        document.body
      )}
    </div>
  );
};

const TooltipPortal: React.FC<{ top: number; left: number; position: 'top' | 'bottom'; children: React.ReactNode }> = ({ top, left, position, children }) => {
    // If top: we translate -100% Y to sit above the point.
    // If bottom: we don't translate Y, it hangs down from the point.
    const transformClass = position === 'top' 
        ? '-translate-x-1/2 -translate-y-full' 
        : '-translate-x-1/2';

    return (
        <div 
            className={`fixed z-[100] pointer-events-none transform ${transformClass} px-3`}
            style={{ top, left }}
        >
            <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-lg p-3 text-xs w-max max-w-[250px] animate-in fade-in zoom-in-95 duration-150 relative">
                {children}
                
                {/* Arrow */}
                {position === 'top' ? (
                     <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700"></div>
                ) : (
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-4 border-transparent border-b-slate-700"></div>
                )}
            </div>
        </div>
    );
};

// --- Specific Content Layouts ---

export const ItemTooltipContent: React.FC<{ item: Item }> = ({ item }) => {
    return (
        <div className="space-y-2">
            <div>
                <div className={`font-bold text-sm ${RARITY_COLORS[item.rarity]}`}>{item.name}</div>
                <div className="text-slate-400 text-[10px]">{item.rarity} {item.type} • Lvl {item.level}</div>
            </div>
            
            <div className="space-y-1 pt-1 border-t border-slate-800">
                {item.stats.map((stat, i) => (
                    <div key={i} className="flex justify-between gap-4">
                        <span className="text-slate-300">{stat.name}</span>
                        <span className="font-mono text-indigo-300">+{stat.value}{stat.isPercentage ? '%' : ''}</span>
                    </div>
                ))}
            </div>
            
            <div className="pt-1 border-t border-slate-800 text-yellow-500 font-mono text-right">
                {item.value}g
            </div>
        </div>
    );
};

export const SkillTooltipContent: React.FC<{ skill: Skill; unlocked: boolean }> = ({ skill, unlocked }) => {
    return (
        <div>
            <div className={`font-bold mb-1 ${unlocked ? 'text-indigo-300' : 'text-slate-500'}`}>
                {skill.name}
            </div>
            <div className="text-slate-300 mb-1 leading-relaxed">
                {skill.description}
            </div>
            {!unlocked && (
                <div className="text-[10px] text-red-400 font-bold bg-red-900/20 px-1 py-0.5 rounded inline-block mt-1">
                    Unlocks at Level {skill.unlockLevel}
                </div>
            )}
        </div>
    );
};