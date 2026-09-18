import React from "react";
import { useState, useMemo } from 'react';
import { AppState, ALL_LOCATIONS, Status, getServiceCategory } from '../types';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function SearchFilterScreen({ state, onSelectLocation }: { state: AppState, onSelectLocation: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [contractorFilter, setContractorFilter] = useState('');

  // Extract unique contractors
  const allContractors = useMemo(() => {
    const contractors = new Set<string>();
    Object.values(state.locations).forEach(loc => {
      Object.values(loc.services).forEach(svc => {
        if (svc.contractor?.trim()) contractors.add(svc.contractor.trim());
      });
    });
    return Array.from(contractors).sort();
  }, [state.locations]);

  // Perform search & filter
  const results = useMemo(() => {
    const matches: { locId: string, svcName: string, status: Status, contractor: string, category?: string }[] = [];
    const searchLower = searchTerm.toLowerCase();
    const isGranitoQuery = searchLower.includes('granit');

    ALL_LOCATIONS.forEach(locId => {
      const locData = state.locations[locId] || { services: {} };
      const locationMatches = locId.toLowerCase().includes(searchLower);

      state.servicesList.forEach(svcName => {
        const svcData = locData.services[svcName] || { status: 'pending', contractor: '' };
        const categoryObj = getServiceCategory(svcName);
        
        const serviceMatches = 
          svcName.toLowerCase().includes(searchLower) || 
          (isGranitoQuery && !!categoryObj);

        const matchesSearch = searchTerm === '' || locationMatches || serviceMatches;
        const matchesStatus = statusFilter === 'all' || svcData.status === statusFilter || (!svcData.status && statusFilter === 'pending');
        const matchesContractor = contractorFilter === '' || svcData.contractor?.toLowerCase().includes(contractorFilter.toLowerCase());

        if (matchesSearch && matchesStatus && matchesContractor) {
          matches.push({
            locId,
            svcName,
            status: svcData.status || 'pending',
            contractor: svcData.contractor || 'Não atribuída',
            category: categoryObj?.name
          });
        }
      });
    });

    const grouped = matches.reduce((acc, curr) => {
      if (!acc[curr.locId]) acc[curr.locId] = [];
      acc[curr.locId].push(curr);
      return acc;
    }, {} as Record<string, typeof matches>);

    return grouped;
  }, [state.locations, state.servicesList, searchTerm, statusFilter, contractorFilter]);

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="p-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-4 sticky top-0 z-10 shadow-sm transition-colors">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          <input 
            type="text" 
            placeholder="Buscar por local ou serviço..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todos</FilterPill>
          <FilterPill active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>Pendentes</FilterPill>
          <FilterPill active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')}>Em Andamento</FilterPill>
          <FilterPill active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>Concluídos</FilterPill>
        </div>

        {allContractors.length > 0 && (
          <div className="flex flex-col gap-1">
             <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">Empreiteira</label>
             <select 
               value={contractorFilter} 
               onChange={e => setContractorFilter(e.target.value)}
               className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
             >
               <option value="">Todas as empreiteiras</option>
               {allContractors.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        {Object.keys(results).length === 0 ? (
          <div className="text-center text-neutral-500 dark:text-neutral-400 py-10">
            Nenhum resultado encontrado para os filtros atuais.
          </div>
        ) : (
          Object.entries(results).map(([locId, svcs]: [string, any[]]) => (
            <div key={locId} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm transition-colors">
              <div 
                className="p-3 bg-neutral-900 dark:bg-neutral-800 text-white flex justify-between items-center cursor-pointer"
                onClick={() => onSelectLocation(locId)}
              >
                <span className="font-bold">Local: {locId}</span>
                <span className="flex items-center text-xs text-neutral-300 hover:text-white transition-colors">
                  Acessar Local <ChevronRight className="w-4 h-4 ml-1" />
                </span>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[300px] overflow-y-auto">
                {svcs.map((svc, idx) => (
                  <div key={idx} className="p-3 flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{svc.svcName}</span>
                        {svc.category && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40">
                            {svc.category}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Empreiteira: {svc.contractor}</span>
                    </div>
                    <span className={cn(
                      "px-2 py-1 text-[10px] font-bold uppercase rounded flex-shrink-0",
                      svc.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
                      svc.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' :
                      'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    )}>
                      {svc.status === 'completed' ? 'Concluído' : svc.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
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

function FilterPill({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border",
        active 
          ? "bg-neutral-900 dark:bg-teal-600 text-white border-neutral-900 dark:border-teal-600" 
          : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
      )}
    >
      {children}
    </button>
  );
}
