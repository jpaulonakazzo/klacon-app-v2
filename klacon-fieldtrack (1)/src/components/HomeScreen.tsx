import React, { useState, useMemo } from 'react';
import { FLOORS, AppState } from '../types';
import { cn } from '../lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

export function HomeScreen({ state, onSelectLocation }: { state: AppState, onSelectLocation: (id: string) => void }) {
  const [selectedFloor, setSelectedFloor] = useState<string>(FLOORS[1].id); // Default to 1st floor

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

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Selecione o Local</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Escolha o pavimento e em seguida o apartamento ou área para vistoria.</p>
      </div>

      {/* Floor Selector (Horizontal Scroll) */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 snap-x hide-scrollbar gap-2">
        {FLOORS.map(floor => (
          <button
            key={floor.id}
            onClick={() => setSelectedFloor(floor.id)}
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
