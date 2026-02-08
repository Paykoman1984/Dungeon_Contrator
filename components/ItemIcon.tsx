
import React from 'react';
import { Item, ItemType, WeaponType } from '../types';
import { RARITY_COLORS } from '../constants';

interface ItemIconProps {
    item: Item;
    size?: number;
    className?: string;
    showRarityColor?: boolean;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ item, size = 20, className = "", showRarityColor = true }) => {
    const colorClass = showRarityColor ? RARITY_COLORS[item.rarity] : "text-slate-400";
    const finalClass = `${colorClass} ${className}`;

    const renderSprite = () => {
        if (item.type === ItemType.ARMOR) return <ArmorSprite />;
        if (item.type === ItemType.TRINKET) return <RingSprite />;

        switch (item.subtype) {
            case WeaponType.SWORD: return <SwordSprite />;
            case WeaponType.BLUNT: return <MaceSprite />;
            case WeaponType.DAGGER: return <DaggerSprite />;
            case WeaponType.BOW: return <BowSprite />;
            case WeaponType.STAFF: return <StaffSprite />;
            case WeaponType.BOOK: return <BookSprite />;
            default: return <SwordSprite />;
        }
    };

    return (
        <div style={{ width: size, height: size }} className={`flex items-center justify-center ${finalClass}`}>
            {renderSprite()}
        </div>
    );
};

// --- Custom SVG Sprites ---

const SwordSprite = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
        {/* Blade */}
        <path d="M18.5 5.5L14 10L10 14L8 16L6 14L14 6L16 4L18.5 5.5Z" opacity="0.9" />
        {/* Hilt */}
        <path d="M8 16L6 18L4 16L6 14L8 16Z" opacity="0.6" />
        {/* Handle */}
        <path d="M6 18L3 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Crossguard */}
        <path d="M9 13L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </svg>
);

const MaceSprite = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
        {/* Handle */}
        <path d="M4 20L10 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Head */}
        <rect x="9" y="5" width="10" height="10" rx="1" transform="rotate(-45 14 10)" opacity="0.9" />
        {/* Spikes */}
        <path d="M17 3L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 7L23 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M11 9L13 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/> 
    </svg>
);

const DaggerSprite = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
        {/* Blade */}
        <path d="M16 6L12 10L10 12L11 13L13 11L17 7L18 6L16 6Z" opacity="0.9" />
        {/* Handle */}
        <path d="M10 12L8 14L7 13L9 11L10 12Z" opacity="0.6" />
        <path d="M8 14L6 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const BowSprite = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full drop-shadow-sm">
        {/* Wood */}
        <path d="M19 5C19 5 12 4 8 8C4 12 3 19 3 19" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M19 5L21 21L3 19" strokeWidth="1" strokeOpacity="0.5" />
        {/* Arrow (Hint) */}
        <path d="M18 18L6 6" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
        <path d="M6 6L8 5" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
        <path d="M6 6L5 8" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
    </svg>
);

const StaffSprite = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
        {/* Shaft */}
        <path d="M5 19L15 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Head Gem */}
        <circle cx="17" cy="7" r="3.5" opacity="0.9" />
        {/* Orbitals */}
        <path d="M17 2V4" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <path d="M22 7H20" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <path d="M17 12V10" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <path d="M12 7H14" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    </svg>
);

const BookSprite = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
        {/* Cover */}
        <rect x="5" y="4" width="14" height="16" rx="1" opacity="0.8" />
        {/* Pages */}
        <path d="M17 4H7V20H17C17 20 19 20 19 18V6C19 4 17 4 17 4Z" fill="white" fillOpacity="0.2" />
        {/* Symbol */}
        <circle cx="12" cy="11" r="2" fill="white" fillOpacity="0.4" />
        <path d="M12 14V16" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
);

const ArmorSprite = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
        {/* Shoulders */}
        <path d="M5 6L9 4L15 4L19 6V10C19 15 16 19 12 21C8 19 5 15 5 10V6Z" opacity="0.9" />
        {/* Core Detail */}
        <path d="M9 8H15" stroke="black" strokeOpacity="0.3" strokeWidth="1.5" />
        <path d="M12 8V16" stroke="black" strokeOpacity="0.3" strokeWidth="1.5" />
    </svg>
);

const RingSprite = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
        {/* Band */}
        <circle cx="12" cy="14" r="7" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Gem */}
        <path d="M12 3L15 6L12 9L9 6L12 3Z" opacity="1" />
        {/* Shine */}
        <path d="M12 3L13.5 4.5" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
);
