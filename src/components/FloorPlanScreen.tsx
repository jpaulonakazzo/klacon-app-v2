import React, { useState } from "react";
import { AppState, FLOORS } from '../types';
import { cn } from '../lib/utils';
import { Layers, ChevronDown, Check, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function FloorPlanScreen({ state, onSelectLocation }: { state: AppState, onSelectLocation: (id: string) => void }) {
  const [selectedFloor, setSelectedFloor] = useState<string>(FLOORS[1].id);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const floorData = FLOORS.find(f => f.id === selectedFloor);
  
  // Calculate aggregate completion status for a location
  const getLocationCompletion = (locId: string) => {
    const loc = state.locations[locId];
    if (!loc) return 0;
    
    let completed = 0;
    state.servicesList.forEach(svc => {
      if (loc.services[svc]?.status === 'completed') {
        completed++;
      }
    });
    
    return completed / state.servicesList.length;
  };

  const getFloorCompletion = (floor: typeof FLOORS[0]) => {
    if (!floor.locations.length || state.servicesList.length === 0) return 0;
    let totalServices = floor.locations.length * state.servicesList.length;
    let completed = 0;
    floor.locations.forEach(locId => {
      const loc = state.locations[locId];
      if (loc) {
        state.servicesList.forEach(svc => {
          if (loc.services?.[svc]?.status === 'completed') {
            completed++;
          }
        });
      }
    });
    return totalServices > 0 ? completed / totalServices : 0;
  };

  const selectedFloorCompletion = floorData ? Math.round(getFloorCompletion(floorData) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="p-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-3 sticky top-0 z-10 shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Visão da Planta</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            {selectedFloorCompletion}% Concluído
          </span>
        </div>
        
        {/* Custom Animated Floor Selector Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-900 dark:text-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/50"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{floorData?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {floorData?.locations.length} {floorData?.locations.length === 1 ? 'área' : 'unidades'}
              </span>
              <motion.div
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              </motion.div>
            </div>
          </button>

          {/* Smooth Dropdown Options with AnimatePresence */}
          <AnimatePresence initial={false}>
            {isDropdownOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto shadow-inner">
                  {FLOORS.map(f => {
                    const isSelected = f.id === selectedFloor;
                    const comp = Math.round(getFloorCompletion(f) * 100);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFloor(f.id);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all",
                          isSelected 
                            ? "bg-teal-700 text-white shadow-sm" 
                            : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200/70 dark:border-neutral-700"
                        )}
                      >
                        <div className="flex items-center gap-1.5 truncate mr-1">
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{f.name}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                          isSelected ? "bg-teal-800 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                        )}>
                          {comp}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Horizontal Floor Carousel */}
        <div className="flex overflow-x-auto pb-1 -mx-4 px-4 gap-1.5 hide-scrollbar">
          {FLOORS.map(f => {
            const isSelected = f.id === selectedFloor;
            return (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedFloor(f.id);
                  setIsDropdownOpen(false);
                }}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
                  isSelected 
                    ? "bg-neutral-900 dark:bg-teal-600 text-white shadow-sm" 
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700"
                )}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        {/* Conceptual Floor Plan Visualization with smooth fade & scale transition */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedFloor}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full max-w-sm aspect-[4/5] bg-white dark:bg-neutral-900 border-4 border-neutral-300 dark:border-neutral-700 rounded-lg p-2 flex flex-col gap-2 relative shadow-sm"
          >
            {floorData?.id === 'terreo' ? (
              <PlanBlock locId="Portaria" onSelect={onSelectLocation} completion={getLocationCompletion("Portaria")} className="h-full" />
            ) : floorData?.id === 'puc' ? (
              <PlanBlock locId="PUC" onSelect={onSelectLocation} completion={getLocationCompletion("PUC")} className="h-full" />
            ) : (
              // 8 apartments per floor - typical layout
              <div className="grid grid-cols-2 grid-rows-4 gap-2 h-full">
                {floorData?.locations.map(loc => (
                  <PlanBlock 
                    key={loc} 
                    locId={loc} 
                    onSelect={onSelectLocation} 
                    completion={getLocationCompletion(loc)} 
                  />
                ))}
              </div>
            )}

            {/* Elevator Core / Stairs representation (conceptual) */}
            {floorData?.id !== 'terreo' && floorData?.id !== 'puc' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-24 bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-400 dark:border-neutral-600 flex items-center justify-center text-[10px] font-bold text-neutral-500 dark:text-neutral-400 rounded opacity-80 pointer-events-none shadow-inner">
                HALL
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        <div className="mt-8 w-full max-w-sm">
          <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 text-center">Legenda de Progresso</h3>
          <div className="flex gap-2 h-3 rounded-full overflow-hidden">
             <div className="flex-1 bg-neutral-100 dark:bg-neutral-800" title="0%" />
             <div className="flex-1 bg-amber-200 dark:bg-amber-900/60" title="1-25%" />
             <div className="flex-1 bg-amber-400 dark:bg-amber-600" title="26-50%" />
             <div className="flex-1 bg-emerald-300 dark:bg-emerald-600" title="51-75%" />
             <div className="flex-1 bg-emerald-500" title="76-100%" />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-400 dark:text-neutral-500 font-bold mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

const PlanBlock: React.FC<{ locId: string, onSelect: (id: string) => void, completion: number, className?: string }> = ({ locId, onSelect, completion, className }) => {
  // Determine color based on completion percentage
  let bgColor = 'bg-neutral-50';
  if (completion === 0) bgColor = 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400';
  else if (completion <= 0.25) bgColor = 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
  else if (completion <= 0.50) bgColor = 'bg-amber-300 dark:bg-amber-700/60 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100';
  else if (completion <= 0.75) bgColor = 'bg-emerald-300 dark:bg-emerald-700/60 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100';
  else bgColor = 'bg-emerald-500 border-emerald-600 text-white';

  return (
    <div 
      onClick={() => onSelect(locId)}
      className={cn(
        "border-2 rounded flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm",
        bgColor,
        className
      )}
    >
      <span className="font-bold text-sm sm:text-base">{locId}</span>
      <span className="text-[10px] opacity-80 font-medium">{Math.round(completion * 100)}%</span>
    </div>
  );
}
