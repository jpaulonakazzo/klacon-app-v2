import React from "react";
import { useState, useMemo } from 'react';
import { AppState, FLOORS } from '../types';
import { cn } from '../lib/utils';
import { Layers } from 'lucide-react';

export function FloorPlanScreen({ state, onSelectLocation }: { state: AppState, onSelectLocation: (id: string) => void }) {
  const [selectedFloor, setSelectedFloor] = useState<string>(FLOORS[1].id);

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

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="p-4 bg-white border-b border-neutral-200 flex flex-col gap-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-neutral-700" />
          <h2 className="text-lg font-bold text-neutral-900">Visão da Planta</h2>
        </div>
        
        <select 
          value={selectedFloor}
          onChange={e => setSelectedFloor(e.target.value)}
          className="bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-600 w-full"
        >
          {FLOORS.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        {/* Conceptual Floor Plan Visualization */}
        <div className="w-full max-w-sm aspect-[4/5] bg-white border-4 border-neutral-300 rounded-lg p-2 flex flex-col gap-2 relative shadow-sm">
          
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-24 bg-neutral-200 border-2 border-neutral-400 flex items-center justify-center text-[10px] font-bold text-neutral-500 rounded opacity-80 pointer-events-none shadow-inner">
              HALL
            </div>
          )}
        </div>
        
        <div className="mt-8 w-full max-w-sm">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 text-center">Legenda de Progresso</h3>
          <div className="flex gap-2 h-3 rounded-full overflow-hidden">
             <div className="flex-1 bg-neutral-100" title="0%" />
             <div className="flex-1 bg-amber-200" title="1-25%" />
             <div className="flex-1 bg-amber-400" title="26-50%" />
             <div className="flex-1 bg-emerald-300" title="51-75%" />
             <div className="flex-1 bg-emerald-500" title="76-100%" />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-400 font-bold mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const PlanBlock: React.FC<{ locId: string, onSelect: (id: string) => void, completion: number, className?: string }> = ({ locId, onSelect, completion, className }) => {
  // Determine color based on completion percentage
  let bgColor = 'bg-neutral-50';
  if (completion === 0) bgColor = 'bg-neutral-100 border-neutral-200 text-neutral-500';
  else if (completion <= 0.25) bgColor = 'bg-amber-100 border-amber-200 text-amber-800';
  else if (completion <= 0.50) bgColor = 'bg-amber-300 border-amber-400 text-amber-900';
  else if (completion <= 0.75) bgColor = 'bg-emerald-300 border-emerald-400 text-emerald-900';
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
