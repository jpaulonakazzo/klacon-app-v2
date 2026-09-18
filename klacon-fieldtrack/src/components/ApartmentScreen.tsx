import React from "react";
import { useState, useRef, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Clock, Camera, Image as ImageIcon, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceState, LocationData, Status } from '../types';
import { cn } from '../lib/utils';

interface ApartmentScreenProps {
  locationId: string;
  onBack: () => void;
  locationData: LocationData;
  updateService: (serviceName: string, updates: Partial<ServiceState>) => void;
  servicesList: string[];
  contractorsList: string[];
}

export function ApartmentScreen({ locationId, onBack, locationData, updateService, servicesList, contractorsList }: ApartmentScreenProps) {
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [contractorFilter, setContractorFilter] = useState<string | 'all' | 'unassigned'>('all');

  const getStatusColor = (status?: Status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500 text-white border-emerald-600';
      case 'in_progress': return 'bg-amber-400 text-neutral-900 border-amber-500';
      default: return 'bg-neutral-100 text-neutral-500 border-neutral-300';
    }
  };

  const getStatusIcon = (status?: Status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5" />;
      case 'in_progress': return <Clock className="w-5 h-5" />;
      default: return <Circle className="w-5 h-5" />;
    }
  };

  const uniqueContractors = useMemo(() => {
    const contractors = new Set<string>();
    Object.values(locationData.services).forEach(svc => {
      if (svc.contractor && svc.contractor.trim() !== '') {
        contractors.add(svc.contractor.trim());
      }
    });
    return Array.from(contractors).sort();
  }, [locationData.services]);

  const filteredServices = useMemo(() => {
    if (contractorFilter === 'all') return servicesList;
    if (contractorFilter === 'unassigned') {
      return servicesList.filter(svc => !locationData.services[svc]?.contractor?.trim());
    }
    return servicesList.filter(svc => {
      return locationData.services[svc]?.contractor?.trim() === contractorFilter;
    });
  }, [servicesList, locationData.services, contractorFilter]);

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      {/* Sticky Sub-header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10 flex flex-col shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-neutral-900">Local: {locationId}</h2>
        </div>
        
        {/* Contractor Filter */}
        <div className="px-4 pb-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            <Filter className="w-3 h-3" /> Filtrar por Empreiteira
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 snap-x">
            <FilterPill active={contractorFilter === 'all'} onClick={() => setContractorFilter('all')}>
              Mostrar Todos
            </FilterPill>
            {uniqueContractors.map(c => (
              <FilterPill key={c} active={contractorFilter === c} onClick={() => setContractorFilter(c)}>
                {c}
              </FilterPill>
            ))}
            <FilterPill active={contractorFilter === 'unassigned'} onClick={() => setContractorFilter('unassigned')}>
              Sem Empreiteira
            </FilterPill>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {filteredServices.map(serviceName => {
            const svcData = locationData.services[serviceName] || { status: 'pending', contractor: '', notes: '', updatedAt: new Date().toISOString() } as ServiceState;
            const isExpanded = expandedService === serviceName;

            return (
              <motion.div 
                key={serviceName}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer active:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedService(isExpanded ? null : serviceName)}
                >
                  <span className="font-medium text-neutral-800 text-sm leading-tight flex-1 pr-4">{serviceName}</span>
                  <div className="flex gap-1">
                    <StatusButton 
                      active={svcData.status === 'pending' || !svcData.status} 
                      color="bg-neutral-200 text-neutral-600" 
                      onClick={(e) => { e.stopPropagation(); updateService(serviceName, { status: 'pending' }); }}
                    >
                      Pendente
                    </StatusButton>
                    <StatusButton 
                      active={svcData.status === 'in_progress'} 
                      color="bg-amber-400 text-neutral-900" 
                      onClick={(e) => { e.stopPropagation(); updateService(serviceName, { status: 'in_progress' }); }}
                    >
                      Em And.
                    </StatusButton>
                    <StatusButton 
                      active={svcData.status === 'completed'} 
                      color="bg-emerald-500 text-white" 
                      onClick={(e) => { e.stopPropagation(); updateService(serviceName, { status: 'completed' }); }}
                    >
                      Concluído
                    </StatusButton>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-neutral-100 bg-neutral-50 flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Empreiteira Responsável</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              list={`contractors-${locationId}-${serviceName}`}
                              placeholder="Nome da empreiteira..."
                              value={svcData.contractor}
                              onChange={(e) => updateService(serviceName, { contractor: e.target.value })}
                              className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/50 focus:border-teal-600"
                            />
                            <datalist id={`contractors-${locationId}-${serviceName}`}>
                              {contractorsList.map(c => (
                                <option key={c} value={c} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Observações</label>
                          <textarea 
                            placeholder="Adicione notas sobre a vistoria..."
                            value={svcData.notes}
                            onChange={(e) => updateService(serviceName, { notes: e.target.value })}
                            className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-teal-600/50 focus:border-teal-600"
                          />
                        </div>

                        <PhotoCapture 
                          photo={svcData.photo} 
                          onPhotoCapture={(photo) => updateService(serviceName, { photo })} 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
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

function StatusButton({ active, color, onClick, children }: { active: boolean, color: string, onClick: (e: React.MouseEvent) => void, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide rounded-md transition-all whitespace-nowrap",
        active ? color : "bg-neutral-100 text-neutral-400 border border-neutral-200"
      )}
    >
      {children}
    </button>
  );
}

const FilterPill: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "snap-start shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors border",
        active 
          ? "bg-neutral-900 text-white border-neutral-900" 
          : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
      )}
    >
      {children}
    </button>
  );
}

function PhotoCapture({ photo, onPhotoCapture }: { photo?: string | null, onPhotoCapture: (p: string | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPhotoCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 mt-2">
       <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Evidência Fotográfica</label>
       {photo ? (
         <div className="relative rounded-lg overflow-hidden border border-neutral-200 bg-black aspect-video flex items-center justify-center">
           <img src={photo} alt="Evidência" className="max-w-full max-h-full object-contain" />
           <button 
             onClick={() => onPhotoCapture(null)}
             className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 backdrop-blur-sm"
           >
             <X className="w-4 h-4" />
           </button>
         </div>
       ) : (
         <div className="flex gap-2">
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="flex-1 bg-white border border-neutral-300 border-dashed rounded-lg py-4 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
           >
             <Camera className="w-6 h-6" />
             <span className="text-xs font-medium">Tirar Foto / Galeria</span>
           </button>
           <input 
             type="file" 
             accept="image/*" 
             capture="environment"
             className="hidden" 
             ref={fileInputRef}
             onChange={handleFileChange}
           />
         </div>
       )}
    </div>
  );
}
