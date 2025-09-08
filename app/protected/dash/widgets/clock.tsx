"use client";
import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

function getUnitValue(unit: string): number {
    // Get IST time (UTC +5:30)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (5.5 * 3600000)); // IST is UTC +5:30
    
    if (unit === "hour" || unit === "hours") return istTime.getHours() % 12 || 12; // 12-hour format
    if (unit === "minute" || unit === "minutes") return istTime.getMinutes();
    if (unit === "second" || unit === "seconds") return istTime.getSeconds();
    return 0;
}

function Flipper({ unit }: { unit: string }) {
    const [current, setCurrent] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { theme, resolvedTheme } = useTheme();
    
    // Determine if we're in light mode
    const isLight = theme === 'light' || resolvedTheme === 'light';

    useEffect(() => {
        setIsHydrated(true);
        setCurrent(getUnitValue(unit));
        
        const interval = setInterval(() => {
            const currentValue = getUnitValue(unit);
            setCurrent((current) => {
                if (currentValue !== current) {
                    setShuffle(true);
                    timeoutRef.current = setTimeout(() => {
                        setShuffle(false);
                    }, 900);
                }
                return currentValue;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [unit]);

    const currentDisplay = current.toString().padStart(2, "0");
    
    // Theme-based styles
    const bgMain = isLight ? 'bg-gray-100' : 'bg-black';
    const bgUpper = isLight ? 'bg-gray-200' : 'bg-neutral-800';
    const bgLower = isLight ? 'bg-gray-300' : 'bg-neutral-700';
    const textColor = isLight ? 'text-gray-800' : 'text-white';
    const shadowColor = isLight ? 'shadow-2xl shadow-gray-500/60 drop-shadow-lg' : 'shadow-2xl shadow-black/50 drop-shadow-lg';
    const dividerColor = isLight ? 'bg-gray-400' : 'bg-black';
    const sideNotchColor = isLight ? 'bg-gray-400' : 'bg-black';
    
    // Show placeholder until hydrated to prevent mismatch
    if (!isHydrated) {
        return (
            <div className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-lg ${textColor} ${bgMain} ${shadowColor} text-4xl md:text-5xl lg:text-6xl`}>
                <div className={`flex relative justify-between w-full h-1/2 overflow-hidden ${bgUpper} items-end rounded-t-lg`}>
                    <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-r-full translate-y-1/2`}></div>
                    <span className="translate-y-1/2">--</span>
                    <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-l-full translate-y-1/2`}></div>
                </div>
                <div className={`flex relative justify-between w-full h-1/2 overflow-hidden ${bgLower} items-start rounded-b-lg ${textColor}`}>
                    <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-r-full -translate-y-1/2`}></div>
                    <span className="-translate-y-1/2">--</span>
                    <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-l-full -translate-y-1/2`}></div>
                </div>
                <div className={`absolute top-1/2 h-px ${dividerColor} left-0 right-0 z-10`}></div>
            </div>
        );
    }
    
    return (
        <div className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-lg ${textColor} ${bgMain} ${shadowColor} text-4xl md:text-5xl lg:text-6xl`} style={{ perspective: '300px', perspectiveOrigin: '50% 50%' }}>
            {/* static */}
            {/* upper */}
            <div className={`flex relative justify-between w-full h-1/2 overflow-hidden ${bgUpper} items-end rounded-t-lg -z-10`}>
                <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-r-full translate-y-1/2`}></div>
                <span className="translate-y-1/2">{currentDisplay}</span>
                <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-l-full translate-y-1/2`}></div>
            </div>
            {/* lower */}
            <div className={`flex relative justify-between w-full h-1/2 overflow-hidden ${bgLower} items-start rounded-b-lg -z-10 ${textColor}`}>
                <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-r-full -translate-y-1/2`}></div>
                <span className="-translate-y-1/2">{currentDisplay}</span>
                <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-l-full -translate-y-1/2`}></div>
            </div>
            {/* divider */}
            <div className={`absolute top-1/2 h-px ${dividerColor} left-0 right-0 z-10`}></div>
            {/* animated */}
            <div
                className={`absolute flex left-0 w-full h-1/2 top-0 justify-between overflow-hidden items-end ${bgUpper} rounded-t-lg ${
                    shuffle ? "animate-fold" : ""
                }`}
                style={{ 
                    backfaceVisibility: 'hidden',
                    transformOrigin: '50% 100%',
                    transformStyle: 'preserve-3d'
                }}
            >
                <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-r-full translate-y-1/2`}></div>
                <span className="translate-y-1/2">{currentDisplay}</span>
                <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-l-full translate-y-1/2`}></div>
            </div>
            <div
                className={`absolute flex left-0 w-full h-1/2 top-1/2 justify-between overflow-hidden items-start ${bgLower} rounded-b-lg ${textColor} ${
                    shuffle ? "animate-unfold" : ""
                }`}
                style={{ 
                    backfaceVisibility: 'hidden',
                    transformOrigin: '50% 0%',
                    transform: 'rotateX(180deg)',
                    transformStyle: 'preserve-3d'
                }}
            >
                <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-r-full -translate-y-1/2`}></div>
                <span className="-translate-y-1/2">{currentDisplay}</span>
                <div className={`${sideNotchColor} h-4 w-2 md:h-6 md:w-3 rounded-l-full -translate-y-1/2`}></div>
            </div>
        </div>
    );
}

function Clock({ unit }: { unit: string }) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const labelColor = isLight ? 'text-gray-600' : 'text-gray-400';
    
    return (
        <div className="flex flex-col items-center justify-center gap-5">
            <Flipper unit={unit} />
            <div className={`uppercase ${labelColor} tracking-[3px] sm:text-lg sm:tracking-[4px] md:tracking-[6px] text-[8px]`}>
                {unit}
            </div>
        </div>
    );
}
export default Clock;