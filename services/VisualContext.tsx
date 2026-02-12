
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { FeedbackEvent } from '../types';

// Lightweight Event Bus to avoid React Context re-render spam for damage numbers
class VisualEventManager {
    private listeners: ((event: FeedbackEvent) => void)[] = [];

    subscribe(listener: (event: FeedbackEvent) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    emit(event: Omit<FeedbackEvent, 'id'>) {
        const fullEvent: FeedbackEvent = {
            id: crypto.randomUUID(),
            ...event
        };
        this.listeners.forEach(l => l(fullEvent));
    }
}

export const visualBus = new VisualEventManager();

interface VisualContextType {
    emitFeedback: (event: Omit<FeedbackEvent, 'id'>) => void;
}

const VisualContext = createContext<VisualContextType | undefined>(undefined);

export const VisualProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    
    const emitFeedback = (event: Omit<FeedbackEvent, 'id'>) => {
        visualBus.emit(event);
    };

    return (
        <VisualContext.Provider value={{ emitFeedback }}>
            {children}
        </VisualContext.Provider>
    );
};

export const useVisuals = () => {
    const context = useContext(VisualContext);
    if (!context) throw new Error("useVisuals must be used within VisualProvider");
    return context;
};
