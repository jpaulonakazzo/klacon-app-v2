import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Camera, 
  Image as ImageIcon, 
  X, 
  Filter, 
  ChevronDown, 
  Layers, 
  CheckCheck, 
  FileText,
  Sparkles,
  Trash2,
  Edit3,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ServiceState, 
  LocationData, 
  Status, 
  groupServices, 
  getServiceCategory, 
  GRANITOS_CATEGORY_NAME,
  GroupedServiceItem,
  ServiceCategory,
  DEFAULT_CATEGORIES,
  isCustomService
} from '../types';
import { cn } from '../lib/utils';
import { DeleteServiceConfirmModal } from './DeleteServiceConfirmModal';

interface ApartmentScreenProps {
  locationId: string;
  onBack: () => void;
  locationData: LocationData;
  updateService: (serviceName: string, updates: Partial<ServiceState>) => void;
  servicesList: string[];
  contractorsList: string[];
  categories?: ServiceCategory[];
  batchUpdateServices?: (serviceNames: string[], updates: Partial<ServiceState>) => void;
  onDeleteService?: (serviceName: string) => Promise<void>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
  onOpenSettings?: () => void;
}

export function ApartmentScreen({ 
  locationId, 
  onBack, 
  locationData, 
  updateService, 
  servicesList, 
  contractorsList,
  categories = DEFAULT_CATEGORIES,
  batchUpdateServices,
  onDeleteService,
  onDeleteCategory,
  onOpenSettings
}: ApartmentScreenProps) {
  // Expanded state for single service details panel (contractor/notes/photo)
  const [expandedService, setExpandedService] = useState<string | null>(null);
  
  // Expanded state for accordion categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    granitos: false,
    revestimento_ceramico: false
  });

  const [contractorFilter, setContractorFilter] = useState<string | 'all' | 'unassigned'>('all');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ServiceCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete || !onDeleteService) return;
    try {
      setIsDeleting(true);
      await onDeleteService(serviceToDelete);
      setServiceToDelete(null);
    } catch (err) {
      console.error("Failed to delete service:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete || !onDeleteCategory) return;
    try {
      setIsDeleting(true);
      await onDeleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (err) {
      console.error("Failed to delete category:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
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

  // Group services into standalone and categories dynamically
  const groupedStructure = useMemo(() => {
    return groupServices(servicesList, categories);
  }, [servicesList, categories]);

  // Apply contractor filter to grouped items
  const filteredGroupedItems = useMemo(() => {
    return groupedStructure.map(item => {
      if (item.type === 'standalone') {
        const svcData = locationData.services[item.name];
        const hasContractor = !!svcData?.contractor?.trim();
        const matches = 
          contractorFilter === 'all' ||
          (contractorFilter === 'unassigned' && !hasContractor) ||
          (svcData?.contractor?.trim() === contractorFilter);

        return matches ? item : null;
      } else {
        // Category: filter its subservices
        const matchingSubServices = item.services.filter(subName => {
          const svcData = locationData.services[subName];
          const hasContractor = !!svcData?.contractor?.trim();
          if (contractorFilter === 'all') return true;
          if (contractorFilter === 'unassigned') return !hasContractor;
          return svcData?.contractor?.trim() === contractorFilter;
        });

        if (matchingSubServices.length === 0) return null;

        return {
          ...item,
          services: matchingSubServices
        } as GroupedServiceItem;
      }
    }).filter(Boolean) as GroupedServiceItem[];
  }, [groupedStructure, locationData.services, contractorFilter]);

  // If contractor filter is applied, auto-expand categories that have matches
  React.useEffect(() => {
    if (contractorFilter !== 'all') {
      setExpandedCategories(prev => ({
        ...prev,
        granitos: true
      }));
    }
  }, [contractorFilter]);

  const handleBatchCategoryStatus = (categoryServices: string[], status: Status) => {
    if (batchUpdateServices) {
      batchUpdateServices(categoryServices, { status });
    } else {
      categoryServices.forEach(svcName => {
        updateService(svcName, { status });
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
      {/* Sticky Sub-header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10 flex flex-col shadow-xs transition-colors">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="p-1 -ml-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                Local: {locationId}
              </h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Vistoria técnica detalhada
              </span>
            </div>
          </div>

          {/* Actions: Settings and Edit Mode Toggle */}
          <div className="flex items-center gap-2">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Configurações de Serviços"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEditMode(prev => !prev)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border",
                isEditMode
                  ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800 shadow-xs"
                  : "bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-700"
              )}
              title={isEditMode ? "Desativar modo de edição" : "Ativar modo de edição para excluir serviços"}
            >
              {isEditMode ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Sair da Edição</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>Modo de Edição</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Edit Mode Alert Banner */}
        {isEditMode && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Trash2 className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span className="text-[11px] sm:text-xs">
                <strong>Modo de Edição:</strong> Clique na lixeira vermelha para excluir serviços duplicados ou personalizados permanentemente.
              </span>
            </div>
            <button 
              onClick={() => setIsEditMode(false)}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 hover:bg-red-200 text-red-800 dark:text-red-200 shrink-0"
            >
              Concluir
            </button>
          </div>
        )}
        
        {/* Contractor Filter */}
        <div className="px-4 pb-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
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

      {/* Services and Accordion Categories List */}
      <div className="p-4 flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {filteredGroupedItems.map(item => {
            if (item.type === 'standalone') {
              const serviceName = item.name;
              const svcData = locationData.services[serviceName] || { 
                status: 'pending', 
                contractor: '', 
                notes: '', 
                updatedAt: new Date().toISOString() 
              } as ServiceState;
              const isExpanded = expandedService === serviceName;

              return (
                <ServiceRowCard
                  key={serviceName}
                  serviceName={serviceName}
                  svcData={svcData}
                  isExpanded={isExpanded}
                  isEditMode={isEditMode}
                  onToggleExpand={() => setExpandedService(isExpanded ? null : serviceName)}
                  onStatusChange={(status) => updateService(serviceName, { status })}
                  onContractorChange={(contractor) => updateService(serviceName, { contractor })}
                  onNotesChange={(notes) => updateService(serviceName, { notes })}
                  onPhotoCapture={(photo) => updateService(serviceName, { photo })}
                  onDeleteClick={() => setServiceToDelete(serviceName)}
                  contractorsList={contractorsList}
                  locationId={locationId}
                />
              );
            }

            // Category item (e.g. 'Granitos')
            const category = item.category;
            const subServices = item.services;
            const isCategoryExpanded = !!expandedCategories[category.id];

            // Compute category statistics
            let completedCount = 0;
            let inProgressCount = 0;
            subServices.forEach(subName => {
              const status = locationData.services[subName]?.status;
              if (status === 'completed') completedCount++;
              else if (status === 'in_progress') inProgressCount++;
            });

            const totalCount = subServices.length;
            const percentCompleted = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const allCompleted = totalCount > 0 && completedCount === totalCount;

            return (
              <motion.div
                key={`cat-${category.id}`}
                layout
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "border rounded-2xl overflow-hidden shadow-xs transition-colors",
                  isCategoryExpanded
                    ? "bg-white dark:bg-neutral-900 border-teal-300/80 dark:border-teal-800 ring-1 ring-teal-500/20 dark:ring-teal-500/30"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                )}
              >
                {/* Category Accordion Header */}
                <div 
                  className={cn(
                    "p-4 flex items-center justify-between cursor-pointer select-none transition-colors",
                    isCategoryExpanded 
                      ? "bg-teal-50/40 dark:bg-teal-950/20 border-b border-neutral-200/80 dark:border-neutral-800" 
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  )}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors border shadow-xs",
                      allCompleted
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60"
                        : isCategoryExpanded
                          ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800/60"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                    )}>
                      <Layers className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base leading-tight">
                          {category.name}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700">
                          {totalCount} {totalCount === 1 ? 'subitem' : 'subitens'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {completedCount} de {totalCount} concluídos ({percentCompleted}%)
                      </p>
                    </div>
                  </div>

                  {/* Right side status badge, delete button in edit mode, and chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors border",
                      allCompleted 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/60"
                        : completedCount > 0 || inProgressCount > 0
                          ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/60"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                    )}>
                      {allCompleted 
                        ? '100% Concluído' 
                        : completedCount > 0 
                          ? `${completedCount}/${totalCount} Concluído` 
                          : inProgressCount > 0 
                            ? 'Em Andamento' 
                            : 'Pendente'}
                    </span>

                    {/* Delete Category Button in Edit Mode */}
                    {isEditMode && onDeleteCategory && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete(category);
                        }}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 border border-red-200 dark:border-red-900/60 transition-colors shadow-xs"
                        title={`Excluir categoria "${category.name}" e todos os subitens`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <motion.div
                      animate={{ rotate: isCategoryExpanded ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="text-neutral-400 dark:text-neutral-500"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </motion.div>
                  </div>
                </div>

                {/* Expanded Subitems Container */}
                <AnimatePresence initial={false}>
                  {isCategoryExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-3.5 bg-neutral-50/70 dark:bg-neutral-950/50 flex flex-col gap-3">
                        
                        {/* Category Progress Bar & Quick Actions */}
                        <div className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex flex-col gap-1.5 flex-1 max-w-sm">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                Progresso de {category.name}
                              </span>
                              <span className="font-bold text-teal-600 dark:text-teal-400">
                                {completedCount} de {totalCount} ({percentCompleted}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-teal-500 dark:bg-teal-400 transition-all duration-300 rounded-full"
                                style={{ width: `${percentCompleted}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick Batch Actions for this category */}
                          {totalCount > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBatchCategoryStatus(subServices, 'completed');
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/60 transition-colors"
                                title={`Marcar todos os subitens de ${category.name} como concluídos`}
                              >
                                Concluir Todos
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBatchCategoryStatus(subServices, 'pending');
                                }}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-700 transition-colors"
                                title={`Resetar status de todos os subitens de ${category.name} para pendente`}
                              >
                                Resetar
                              </button>
                            </div>
                          )}
                        </div>

                        {/* List of Subitems or Empty Notice */}
                        {subServices.length === 0 ? (
                          <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Nenhum subitem cadastrado na categoria "{category.name}".
                            </p>
                            {onOpenSettings && (
                              <button
                                type="button"
                                onClick={onOpenSettings}
                                className="mt-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                              >
                                Abrir Ajustes para adicionar subitens
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {subServices.map((subName) => {
                              const subData = locationData.services[subName] || { 
                                status: 'pending', 
                                contractor: '', 
                                notes: '', 
                                updatedAt: new Date().toISOString() 
                              } as ServiceState;
                              const isSubExpanded = expandedService === subName;

                              return (
                                <ServiceRowCard
                                  key={subName}
                                  serviceName={subName}
                                  svcData={subData}
                                  isSubItem={true}
                                  isExpanded={isSubExpanded}
                                  isEditMode={isEditMode}
                                  onToggleExpand={() => setExpandedService(isSubExpanded ? null : subName)}
                                  onStatusChange={(status) => updateService(subName, { status })}
                                  onContractorChange={(contractor) => updateService(subName, { contractor })}
                                  onNotesChange={(notes) => updateService(subName, { notes })}
                                  onPhotoCapture={(photo) => updateService(subName, { photo })}
                                  onDeleteClick={() => setServiceToDelete(subName)}
                                  contractorsList={contractorsList}
                                  locationId={locationId}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete Service Confirmation Modal */}
      <DeleteServiceConfirmModal 
        isOpen={!!serviceToDelete}
        serviceName={serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Delete Entire Category Confirmation Modal */}
      <DeleteServiceConfirmModal 
        isOpen={!!categoryToDelete}
        serviceName={categoryToDelete?.name || null}
        title="Excluir Categoria Inteira?"
        itemLabel="Categoria selecionada"
        warningMessage={`Tem certeza que deseja apagar a categoria "${categoryToDelete?.name}" e todos os seus ${categoryToDelete?.subServices.length || 0} subitens? Esta ação removerá permanentemente a categoria e os subitens de todos os apartamentos.`}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteCategoryConfirm}
        isDeleting={isDeleting}
      />
      
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

interface ServiceRowCardProps {
  serviceName: string;
  svcData: ServiceState;
  isSubItem?: boolean;
  isExpanded: boolean;
  isEditMode?: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: Status) => void;
  onContractorChange: (contractor: string) => void;
  onNotesChange: (notes: string) => void;
  onPhotoCapture: (photo: string | null) => void;
  onDeleteClick?: () => void;
  contractorsList: string[];
  locationId: string;
}

const ServiceRowCard: React.FC<ServiceRowCardProps> = ({
  serviceName,
  svcData,
  isSubItem = false,
  isExpanded,
  isEditMode = false,
  onToggleExpand,
  onStatusChange,
  onContractorChange,
  onNotesChange,
  onPhotoCapture,
  onDeleteClick,
  contractorsList,
  locationId
}) => {
  const hasPhoto = !!svcData.photo;
  const hasNotes = !!svcData.notes?.trim();
  const hasContractor = !!svcData.contractor?.trim();
  const isCustom = isCustomService(serviceName);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -6 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl overflow-hidden transition-all border",
        isEditMode && isCustom
          ? "bg-amber-50/20 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs"
          : isSubItem 
            ? "bg-white dark:bg-neutral-800/90 border-neutral-200/90 dark:border-neutral-700/80 shadow-xs" 
            : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xs"
      )}
    >
      <div 
        className={cn(
          "p-3.5 flex items-center justify-between cursor-pointer transition-colors",
          isExpanded 
            ? "bg-neutral-50/80 dark:bg-neutral-700/50" 
            : isSubItem
              ? "hover:bg-neutral-50/80 dark:hover:bg-neutral-700/30"
              : "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
        )}
        onClick={onToggleExpand}
      >
        <div className="flex flex-col flex-1 pr-3 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-medium leading-tight truncate",
              isSubItem 
                ? "text-sm text-neutral-800 dark:text-neutral-200" 
                : "text-sm text-neutral-900 dark:text-neutral-100 font-semibold"
            )}>
              {serviceName}
            </span>

            {isCustom && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 shrink-0">
                Personalizado
              </span>
            )}

            {/* Badges for evidence */}
            <div className="flex items-center gap-1 shrink-0">
              {hasPhoto && (
                <span className="p-0.5 rounded text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60" title="Foto anexada">
                  <Camera className="w-3 h-3" />
                </span>
              )}
              {hasNotes && (
                <span className="p-0.5 rounded text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60" title="Observações adicionadas">
                  <FileText className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>

          {hasContractor && (
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              Emp: <strong className="text-neutral-700 dark:text-neutral-200 font-semibold">{svcData.contractor}</strong>
            </span>
          )}
        </div>

        {/* Action Controls: Status Buttons & Red Trash in Edit Mode */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Individual Status Buttons */}
          <div className="flex gap-1">
            <StatusButton 
              active={svcData.status === 'pending' || !svcData.status} 
              color="bg-neutral-200 text-neutral-800 dark:bg-neutral-600 dark:text-white font-bold" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onStatusChange('pending'); 
              }}
            >
              Pendente
            </StatusButton>
            <StatusButton 
              active={svcData.status === 'in_progress'} 
              color="bg-amber-400 text-neutral-950 font-bold dark:bg-amber-400 dark:text-neutral-950" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onStatusChange('in_progress'); 
              }}
            >
              Em And.
            </StatusButton>
            <StatusButton 
              active={svcData.status === 'completed'} 
              color="bg-emerald-600 text-white font-bold dark:bg-emerald-600 dark:text-white" 
              onClick={(e) => { 
                e.stopPropagation(); 
                onStatusChange('completed'); 
              }}
            >
              Concluído
            </StatusButton>
          </div>

          {/* Delete Button (visible when edit mode is toggled) */}
          {isEditMode && onDeleteClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick();
              }}
              className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 border border-red-200 dark:border-red-900/60 hover:border-red-600 transition-colors shadow-xs"
              title={`Excluir serviço "${serviceName}"`}
              aria-label={`Excluir serviço ${serviceName}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
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
            <div className="px-4 pb-4 pt-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Empreiteira Responsável
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    list={`contractors-${locationId}-${serviceName}`}
                    placeholder="Nome da empreiteira..."
                    value={svcData.contractor}
                    onChange={(e) => onContractorChange(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-600/50 focus:border-teal-600"
                  />
                  <datalist id={`contractors-${locationId}-${serviceName}`}>
                    {contractorsList.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Observações
                </label>
                <textarea 
                  placeholder="Adicione notas sobre a vistoria deste item..."
                  value={svcData.notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-teal-600/50 focus:border-teal-600"
                />
              </div>

              <PhotoCapture 
                photo={svcData.photo} 
                onPhotoCapture={onPhotoCapture} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatusButton({ active, color, onClick, children }: { active: boolean, color: string, onClick: (e: React.MouseEvent) => void, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide rounded-md transition-all whitespace-nowrap",
        active ? color : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
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
          ? "bg-neutral-900 dark:bg-teal-600 text-white border-neutral-900 dark:border-teal-600 shadow-xs" 
          : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
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
       <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
         Evidência Fotográfica
       </label>
       {photo ? (
         <div className="relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-black aspect-video flex items-center justify-center">
           <img src={photo} alt="Evidência" className="max-w-full max-h-full object-contain" />
           <button 
             onClick={() => onPhotoCapture(null)}
             className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 backdrop-blur-sm"
             title="Remover foto"
           >
             <X className="w-4 h-4" />
           </button>
         </div>
       ) : (
         <div className="flex gap-2">
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 border-dashed rounded-lg py-4 flex flex-col items-center justify-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
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
