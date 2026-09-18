import React from "react";
import { useState, useMemo } from 'react';
import { AppState, ALL_LOCATIONS, Status } from '../types';
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
    const matches: { locId: string, svcName: string, status: Status, contractor: string }[] = [];
    const searchLower = searchTerm.toLowerCase();

    ALL_LOCATIONS.forEach(locId => {
      // If we are searching for a specific location exactly, we could boost it, 
      // but let's just search locations and services together.
      const locData = state.locations[locId] || { services: {} };
      
      const locationMatches = locId.toLowerCase().includes(searchLower);

      state.servicesList.forEach(svcName => {
        const svcData = locData.services[svcName] || { status: 'pending', contractor: '' };
        
        const serviceMatches = svcName.toLowerCase().includes(searchLower);
        const matchesSearch = searchTerm === '' || locationMatches || serviceMatches;
        const matchesStatus = statusFilter === 'all' || svcData.status === statusFilter || (!svcData.status && statusFilter === 'pending');
        const matchesContractor = contractorFilter === '' || svcData.contractor?.toLowerCase().includes(contractorFilter.toLowerCase());

        if (matchesSearch && matchesStatus && matchesContractor) {
          matches.push({
            locId,
            svcName,
            status: svcData.status || 'pending',
            contractor: svcData.contractor || 'Não atribuída'
          });
        }
      });
    });

    // Limit results for performance if it's too big, but 64 * 38 = 2432 items. 
    // We should group by location for better UX.
    const grouped = matches.reduce((acc, curr) => {
      if (!acc[curr.locId]) acc[curr.locId] = [];
      acc[curr.locId].push(curr);
      return acc;
    }, {} as Record<string, typeof matches>);

    return grouped;
  }, [state.locations, searchTerm, statusFilter, contractorFilter]);

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="p-4 bg-white border-b border-neutral-200 flex flex-col gap-4 sticky top-0 z-10 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Buscar por local ou serviço..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-100 border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
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
             <label className="text-xs font-semibold text-neutral-500 uppercase">Empreiteira</label>
             <select 
               value={contractorFilter} 
               onChange={e => setContractorFilter(e.target.value)}
               className="bg-neutral-100 border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
             >
               <option value="">Todas as empreiteiras</option>
               {allContractors.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        {Object.keys(results).length === 0 ? (
          <div className="text-center text-neutral-500 py-10">
            Nenhum resultado encontrado para os filtros atuais.
          </div>
        ) : (
          Object.entries(results).map(([locId, svcs]: [string, any[]]) => (
            <div key={locId} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
              <div 
                className="p-3 bg-neutral-900 text-white flex justify-between items-center cursor-pointer"
                onClick={() => onSelectLocation(locId)}
              >
                <span className="font-bold">Local: {locId}</span>
                <span className="flex items-center text-xs text-neutral-300 hover:text-white transition-colors">
                  Acessar Local <ChevronRight className="w-4 h-4 ml-1" />
                </span>
              </div>
              <div className="divide-y divide-neutral-100 max-h-[300px] overflow-y-auto">
                {svcs.map((svc, idx) => (
                  <div key={idx} className="p-3 flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-neutral-800">{svc.svcName}</span>
                      <span className="text-xs text-neutral-500">Empreiteira: {svc.contractor}</span>
                    </div>
                    <span className={cn(
                      "px-2 py-1 text-[10px] font-bold uppercase rounded flex-shrink-0",
                      svc.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      svc.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      'bg-neutral-100 text-neutral-600'
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
          ? "bg-neutral-900 text-white border-neutral-900" 
          : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
      )}
    >
      {children}
    </button>
  );
}
