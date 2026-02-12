
import React, { useEffect, useState } from 'react';
import { useGame } from '../services/GameContext';
import { RewardEvent, RewardSeverity, RewardEventType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, ArrowUpCircle, AlertOctagon, Star, Box, Swords, Leaf, Anchor } from 'lucide-react';

export const RewardOverlay: React.FC = () => {
    const { state, consumeRewardEvents } = useGame();
    const [alerts, setAlerts] = useState<RewardEvent[]>([]);
    const [epicAlert, setEpicAlert] = useState<RewardEvent | null>(null);

    // Poll for events
    useEffect(() => {
        if (state.rewardEventQueue.length > 0) {
            const newEvents = consumeRewardEvents();
            
            // Separate Epic events (Modal style) from others (Toast style)
            const epics = newEvents.filter(e => e.severity === RewardSeverity.EPIC);
            const others = newEvents.filter(e => e.severity !== RewardSeverity.EPIC);

            if (epics.length > 0) {
                // Show the most recent epic event immediately
                setEpicAlert(epics[epics.length - 1]);
            }

            if (others.length > 0) {
                setAlerts(prev => [...prev, ...others]);
            }
        }
    }, [state.rewardEventQueue, consumeRewardEvents]);

    // Auto-dismiss toasts
    useEffect(() => {
        if (alerts.length > 0) {
            const timer = setTimeout(() => {
                setAlerts(prev => prev.slice(1));
            }, 3000); // 3 seconds per toast
            return () => clearTimeout(timer);
        }
    }, [alerts]);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col items-center justify-start pt-24 gap-2">
            
            {/* TOASTS (Minor/Major) */}
            <AnimatePresence>
                {alerts.slice(0, 3).map((alert) => (
                    <RewardToast key={alert.id} event={alert} />
                ))}
            </AnimatePresence>

            {/* EPIC MODAL (Overlay) */}
            <AnimatePresence>
                {epicAlert && (
                    <EpicOverlay 
                        event={epicAlert} 
                        onDismiss={() => setEpicAlert(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const RewardToast: React.FC<{ event: RewardEvent }> = ({ event }) => {
    let bg = "bg-slate-900/90 border-slate-700";
    let icon = <Star size={20} className="text-yellow-400" />;
    
    if (event.severity === RewardSeverity.MAJOR) {
        bg = "bg-indigo-900/90 border-indigo-500 shadow-indigo-500/20";
    }

    if (event.type === RewardEventType.ITEM_DROP) {
        icon = <Box size={20} className="text-purple-400" />;
    } else if (event.type === RewardEventType.ADVENTURER_LEVEL_UP) {
        icon = <ArrowUpCircle size={20} className="text-green-400" />;
    } else if (event.type === RewardEventType.DUNGEON_UNLOCK) {
        icon = <AlertOctagon size={20} className="text-red-400" />;
    } else if (event.type === RewardEventType.MASTERY_LEVEL_UP) {
        icon = <Crown size={20} className="text-yellow-400" />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`
                flex items-center gap-4 px-6 py-3 rounded-full border shadow-2xl backdrop-blur-md min-w-[300px]
                ${bg}
            `}
        >
            <div className="p-2 bg-black/30 rounded-full">
                {icon}
            </div>
            <div>
                <div className="text-sm font-bold text-white">{event.message}</div>
                {event.severity === RewardSeverity.MAJOR && (
                    <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Major Event</div>
                )}
            </div>
        </motion.div>
    );
};

const EpicOverlay: React.FC<{ event: RewardEvent; onDismiss: () => void }> = ({ event, onDismiss }) => {
    // Auto dismiss epic after 4 seconds if user doesn't click
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-[200]"
            onClick={onDismiss}
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
            >
                {/* Sunburst FX */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-purple-600 blur-[100px] opacity-50 animate-pulse"></div>
                
                <div className="relative bg-slate-900 border-2 border-yellow-500/50 p-10 rounded-2xl shadow-[0_0_100px_rgba(234,179,8,0.3)] text-center max-w-lg mx-4">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                        <div className="bg-slate-900 p-4 rounded-full border-4 border-yellow-500 shadow-xl">
                            <Crown size={48} className="text-yellow-400 animate-bounce" />
                        </div>
                    </div>
                    
                    <div className="mt-8 space-y-4">
                        <motion.h2 
                            className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 uppercase tracking-tighter"
                            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            style={{ backgroundSize: "200% 200%" }}
                        >
                            {event.type.replace(/_/g, ' ')}
                        </motion.h2>
                        
                        <p className="text-xl text-white font-bold">{event.message}</p>
                        
                        {event.metadata && (
                            <div className="text-sm text-slate-400 bg-black/40 p-4 rounded-lg border border-white/10">
                                {Object.entries(event.metadata).map(([k, v]) => (
                                    <div key={k} className="flex justify-between">
                                        <span className="capitalize text-slate-500">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <span className="font-mono text-yellow-400 font-bold">{String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-xs text-slate-500 mt-6 uppercase tracking-widest animate-pulse">
                            Click to Continue
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
