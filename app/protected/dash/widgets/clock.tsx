"use client";
import React, { useEffect, useState, useRef } from "react";

function getUnitValue(unit: string): number {
    const now = new Date();
    if (unit === "hours") return now.getHours() % 12 || 12;
    if (unit === "minutes") return now.getMinutes();
    if (unit === "seconds") return now.getSeconds();
    return 0;
}

function Flipper({ unit }: { unit: string }) {
    const [current, setCurrent] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Show placeholder until hydrated to prevent mismatch
    if (!isHydrated) {
        return (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-lg text-white bg-black shadow-lg text-4xl md:text-5xl lg:text-6xl">
                <div className="flex relative justify-between w-full h-1/2 overflow-hidden bg-neutral-800 items-end rounded-t-lg">
                    <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-r-full translate-y-1/2"></div>
                    <span className="translate-y-1/2">--</span>
                    <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-l-full translate-y-1/2"></div>
                </div>
                <div className="flex relative justify-between w-full h-1/2 overflow-hidden bg-neutral-700 items-start rounded-b-lg text-white">
                    <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-r-full -translate-y-1/2"></div>
                    <span className="-translate-y-1/2">--</span>
                    <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-l-full -translate-y-1/2"></div>
                </div>
                <div className="absolute top-1/2 h-px bg-black left-0 right-0 z-10"></div>
            </div>
        );
    }
    
    return (
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-lg text-white bg-black shadow-lg text-4xl md:text-5xl lg:text-6xl" style={{ perspective: '300px', perspectiveOrigin: '50% 50%' }}>
            {/* static */}
            {/* upper */}
            <div className="flex relative justify-between w-full h-1/2 overflow-hidden bg-neutral-800 items-end rounded-t-lg -z-10">
                <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-r-full translate-y-1/2"></div>
                <span className="translate-y-1/2">{currentDisplay}</span>
                <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-l-full translate-y-1/2"></div>
            </div>
            {/* lower */}
            <div className="flex relative justify-between w-full h-1/2 overflow-hidden bg-neutral-700 items-start rounded-b-lg -z-10 text-white">
                <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-r-full -translate-y-1/2"></div>
                <span className="-translate-y-1/2">{currentDisplay}</span>
                <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-l-full -translate-y-1/2"></div>
            </div>
            {/* divider */}
            <div className="absolute top-1/2 h-px bg-black left-0 right-0 z-10"></div>
            {/* animated */}
            <div
                className={`absolute flex left-0 w-full h-1/2 top-0 justify-between overflow-hidden items-end bg-neutral-800 rounded-t-lg ${
                    shuffle ? "animate-fold" : ""
                }`}
                style={{ 
                    backfaceVisibility: 'hidden',
                    transformOrigin: '50% 100%',
                    transformStyle: 'preserve-3d'
                }}
            >
                <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-r-full translate-y-1/2"></div>
                <span className="translate-y-1/2">{currentDisplay}</span>
                <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-l-full translate-y-1/2"></div>
            </div>
            <div
                className={`absolute flex left-0 w-full h-1/2 top-1/2 justify-between overflow-hidden items-start bg-neutral-700 rounded-b-lg text-white ${
                    shuffle ? "animate-unfold" : ""
                }`}
                style={{ 
                    backfaceVisibility: 'hidden',
                    transformOrigin: '50% 0%',
                    transform: 'rotateX(180deg)',
                    transformStyle: 'preserve-3d'
                }}
            >
                <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-r-full -translate-y-1/2"></div>
                <span className="-translate-y-1/2">{currentDisplay}</span>
                <div className="bg-black h-4 w-2 md:h-6 md:w-3 rounded-l-full -translate-y-1/2"></div>
            </div>
        </div>
    );
}

function Clock({ unit }: { unit: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-5">
            <Flipper unit={unit} />
            <div className="uppercase text-gray-400 tracking-[3px] sm:text-lg sm:tracking-[4px] md:tracking-[6px] text-[8px]">
                {unit}
            </div>
        </div>
    );
}
export default Clock;