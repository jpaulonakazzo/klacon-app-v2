import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FLOORS, AppState, isCustomService } from '../types';
import { cn } from '../lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, SlidersHorizontal, Settings, ClipboardList } from 'lucide-react';

export function HomeScreen({ 
  state, 
  onSelectLocation,
  onOpenSettings,
  onOpenMultiFill,
  selectedFloor: propSelectedFloor,
  onSelectFloor
}: { 
  state: AppState, 
  onSelectLocation: (id: string) => void,
  onOpenSettings?: () => void,
  onOpenMultiFill?: () => void,
  selectedFloor?: string,
  onSelectFloor?: (floorId: string) => void
}) {
  const [localFloor, setLocalFloor] = useState<string>(FLOORS[1].id);
  const selectedFloor = propSelectedFloor !== undefined ? propSelectedFloor : localFloor;
  const floorBarRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected floor pill into view
  useEffect(() => {
    if (floorBarRef.current) {
      const activeBtn = floorBarRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedFloor]);

  const handleFloorChange = (floorId: string) => {
    if (onSelectFloor) {
      onSelectFloor(floorId);
    } else {
      setLocalFloor(floorId);
    }
  };

  const customServicesCount = useMemo(() => {
    return state.servicesList.filter(s => isCustomService(s)).length;
  }, [state.servicesList]);

  const getLocationCompletion = (locId: string) => {
    const loc = state.locations[locId];
    if (!loc || state.servicesList.length === 0) return 0;
    
    let completed = 0;
    state.servicesList.forEach(svc => {
      if (loc.services[svc]?.status === 'completed') {
        completed++;
      }
    });
    
    return completed / state.servicesList.length;
  };

  const dashboardData = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    
    Object.values(state.locations).forEach(loc => {
      state.servicesList.forEach(svcName => {
        const status = loc.services?.[svcName]?.status;
        if (status === 'completed') completed++;
        else if (status === 'in_progress') inProgress++;
        else pending++;
      });
    });

    const total = completed + inProgress + pending;
    if (total === 0) return []; // Empty state

    return [
      { name: 'Concluído', value: completed, color: '#10b981' }, // emerald-500
      { name: 'Em Andamento', value: inProgress, color: '#fbbf24' }, // amber-400
      { name: 'Pendente', value: pending, color: '#e5e5e5' } // neutral-200
    ].filter(item => item.value > 0);
  }, [state]);

  const totalServices = dashboardData.reduce((acc, curr) => acc + curr.value, 0);
  const completedServices = dashboardData.find(d => d.name === 'Concluído')?.value || 0;
  const overallProgress = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

  return (
    <div className="p-4 flex flex-col gap-6">
      
      {/* Dashboard Panel */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm transition-colors">
        <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-4">Progresso Geral da Obra</h2>
        
        {dashboardData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full max-w-[200px] aspect-square relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {dashboardData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value} serviços`, name]}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      backgroundColor: 'var(--tooltip-bg, #ffffff)', 
                      borderColor: 'var(--tooltip-border, #e5e5e5)',
                      color: 'var(--tooltip-text, #171717)',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">{overallProgress}%</span>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Concluído</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 flex-1 w-full">
              {dashboardData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.value}</span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 w-8 text-right">{Math.round((item.value / totalServices) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum serviço cadastrado ainda.
          </div>
        )}
      </div>

      {/* Notice if custom services exist (manage / delete duplicates) */}
      {customServicesCount > 0 && onOpenSettings && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold block leading-tight">
                {customServicesCount} {customServicesCount === 1 ? 'serviço personalizado na obra' : 'serviços personalizados na obra'}
              </span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                Gerencie itens ou remova duplicidades adicionadas pela equipe.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 transition-colors shadow-xs"
          >
            Gerenciar
          </button>
        </div>
      )}

      {/* Preenchimento Múltiplo Banner */}
      {onOpenMultiFill && (
        <div className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 block leading-tight">
                Preenchimento Múltiplo
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Atualize serviços específicos em múltiplos apartamentos de uma só vez.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenMultiFill}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shrink-0 transition-colors shadow-xs"
          >
            Abrir
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Selecione o Local</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Escolha o pavimento e em seguida o apartamento ou área para vistoria.</p>
      </div>

      {/* Floor Selector (Horizontal Scroll) */}
      <div ref={floorBarRef} className="flex overflow-x-auto pb-2 -mx-4 px-4 snap-x hide-scrollbar gap-2">
        {FLOORS.map(floor => (
          <button
            key={floor.id}
            data-active={selectedFloor === floor.id}
            onClick={() => handleFloorChange(floor.id)}
            className={cn(
              "snap-start shrink-0 px-5 py-2.5 rounded-full font-medium text-sm transition-all whitespace-nowrap",
              selectedFloor === floor.id 
                ? "bg-neutral-900 dark:bg-teal-600 text-white shadow-md" 
                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            {floor.name}
          </button>
        ))}
      </div>

      {/* Locations Grid with smooth animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedFloor}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        >
          {FLOORS.find(f => f.id === selectedFloor)?.locations.map(loc => {
            const completion = getLocationCompletion(loc);
            const percent = Math.round(completion * 100);
            
            let barColor = 'bg-red-500';
            if (completion > 0.75) barColor = 'bg-emerald-500';
            else if (completion > 0.5) barColor = 'bg-emerald-400';
            else if (completion > 0.25) barColor = 'bg-amber-400';
            else if (completion > 0) barColor = 'bg-orange-500';

            return (
              <button
                key={loc}
                onClick={() => onSelectLocation(loc)}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 aspect-square active:scale-95 transition-all hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{loc}</span>
                <div className="w-full flex flex-col gap-1 mt-1">
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", barColor)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium tracking-wider uppercase text-center">{percent}% Concluído</span>
                </div>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
      
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
