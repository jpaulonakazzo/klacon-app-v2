import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, 
  ClipboardList, 
  Check, 
  CheckCircle2, 
  RotateCcw, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Building2,
  AlertCircle,
  Users,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AppState, 
  FLOORS, 
  Status, 
  groupServices, 
  ServiceCategory 
} from '../types';
import { cn } from '../lib/utils';

interface MultiFillModalProps {
  state: AppState;
  onClose: () => void;
  onBatchUpdate: (
    locationIds: string[], 
    serviceNames: string[], 
    status: Status, 
    contractor?: string
  ) => Promise<void>;
  onAddContractor?: (name: string) => Promise<void>;
}

export function MultiFillModal({
  state,
  onClose,
  onBatchUpdate,
  onAddContractor
}: MultiFillModalProps) {
  // Manual selection sets - NO buttons to select all / complete all
  const [selectedServices, setSelectedServices] = useState<Set<string>>(() => new Set<string>());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(() => new Set<string>());

  // Mobile active tab ('services' | 'units')
  const [mobileTab, setMobileTab] = useState<'services' | 'units'>('services');

  // Search filter for services
  const [serviceSearch, setServiceSearch] = useState('');

  // Accordion state for expandable categories in the modal
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    granitos: true,
    revestimento_ceramico: true
  });

  // Keep selected locations after applying so user can mark other services in sequence
  const [keepLocationsSelected, setKeepLocationsSelected] = useState(true);

  // Contractor state conforming with the Klacon-Obras design system
  const [contractor, setContractor] = useState<string>('KEEP');
  const [isNewContractor, setIsNewContractor] = useState(false);
  const [newContractorName, setNewContractorName] = useState('');

  // Loading state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Group services dynamically
  const groupedStructure = useMemo(() => {
    return groupServices(state.servicesList, state.categories);
  }, [state.servicesList, state.categories]);

  // Toggle individual service selection
  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceName)) {
        next.delete(serviceName);
      } else {
        next.add(serviceName);
      }
      return next;
    });
  };

  // Toggle individual location/unit selection
  const toggleLocation = (locationId: string) => {
    setSelectedLocations(prev => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  // Toggle category accordion expansion
  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: prev[catId] === undefined ? true : !prev[catId]
    }));
  };

  // Handle Action (Marcar como Concluído / Marcar como Pendente)
  const handleApplyStatus = async (status: Status) => {
    if (selectedServices.size === 0 || selectedLocations.size === 0) return;

    try {
      setIsSaving(true);
      const locList: string[] = Array.from(selectedLocations);
      const svcList: string[] = Array.from(selectedServices);

      // Determine final contractor
      let finalContractor: string | undefined = undefined;
      if (isNewContractor && newContractorName.trim()) {
        finalContractor = newContractorName.trim();
        if (onAddContractor) {
          await onAddContractor(finalContractor);
        }
      } else if (contractor !== 'KEEP') {
        finalContractor = contractor;
      }

      await onBatchUpdate(locList, svcList, status, finalContractor);

      const statusText = status === 'completed' ? 'concluídos' : 'pendentes';
      setSaveSuccessMessage(`${svcList.length} ${svcList.length === 1 ? 'serviço marcado' : 'serviços marcados'} como ${statusText} em ${locList.length} ${locList.length === 1 ? 'apartamento' : 'apartamentos'}! ${keepLocationsSelected ? 'Apartamentos mantidos selecionados para você marcar outros serviços direto.' : 'Selecione os próximos itens.'}`);

      // Clear only services selection so user can immediately mark next services for the same apartments!
      setSelectedServices(new Set<string>());
      if (!keepLocationsSelected) {
        setSelectedLocations(new Set<string>());
      }

      if (isNewContractor && newContractorName.trim()) {
        setContractor(newContractorName.trim());
        setIsNewContractor(false);
        setNewContractorName('');
      }

      // If user was on mobile units tab, switch to services tab so they can immediately pick the next services
      if (mobileTab === 'units') {
        setMobileTab('services');
      }

      // Hide success message automatically after 5 seconds
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("Failed multi-fill update:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasSelections = selectedServices.size > 0 && selectedLocations.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={!isSaving ? onClose : undefined}
      />

      {/* Main Modal Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 transition-colors"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                  Preenchimento Múltiplo
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Seleção Específica
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Escolha os serviços e os apartamentos individualmente para atualização pontual
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            disabled={isSaving}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contractor Selection Bar (Klacon-Obras Conforming Design) */}
        <div className="px-4 py-3 bg-neutral-50/90 dark:bg-neutral-900/90 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block leading-tight">
                Empreiteira Responsável
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isNewContractor 
                  ? 'Cadastrando nova equipe para estes serviços' 
                  : contractor === 'KEEP' 
                    ? 'Manterá os responsáveis já atribuídos aos apartamentos' 
                    : `Atribuirá "${contractor}" aos itens selecionados`}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-80">
            {!isNewContractor ? (
              <CustomSelect
                value={contractor}
                onChange={(val) => {
                  if (val === 'NEW') {
                    setIsNewContractor(true);
                  } else {
                    setContractor(val);
                  }
                }}
                options={['KEEP', ...state.contractors, 'NEW']}
                placeholder="Selecione a empreiteira..."
                renderOption={(opt) => {
                  if (opt === 'KEEP') {
                    return (
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                        Manter empreiteira atual
                      </span>
                    );
                  }
                  if (opt === 'NEW') {
                    return (
                      <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold">
                        <Plus className="w-3.5 h-3.5" /> Nova Empreiteira...
                      </span>
                    );
                  }
                  return opt;
                }}
              />
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex gap-1.5 items-center"
              >
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="Nome da nova empreiteira..."
                  value={newContractorName}
                  onChange={e => setNewContractorName(e.target.value)}
                  className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsNewContractor(false);
                    setNewContractorName('');
                    setContractor('KEEP');
                  }}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Cancelar nova empreiteira"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="sm:hidden flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-800/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setMobileTab('services')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              mobileTab === 'services'
                ? "bg-white dark:bg-neutral-900 text-teal-700 dark:text-teal-300 shadow-xs"
                : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Serviços</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
              selectedServices.size > 0 
                ? "bg-teal-600 text-white" 
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
            )}>
              {selectedServices.size}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('units')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
              mobileTab === 'units'
                ? "bg-white dark:bg-neutral-900 text-teal-700 dark:text-teal-300 shadow-xs"
                : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>2. Apartamentos</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
              selectedLocations.size > 0 
                ? "bg-teal-600 text-white" 
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
            )}>
              {selectedLocations.size}
            </span>
          </button>
        </div>

        {/* Modal Body: Split 2-Column Layout on Tablet/Desktop, Tabbed on Mobile */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800">
          
          {/* COLUMN 1: Specific Services Selection */}
          <div className={cn(
            "flex flex-col h-full overflow-hidden",
            mobileTab !== 'services' ? "hidden sm:flex" : "flex"
          )}>
            {/* Column Header */}
            <div className="p-3.5 sm:p-4 border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                    Serviços & Subitens
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full border transition-colors",
                  selectedServices.size > 0
                    ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800"
                    : "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                )}>
                  {selectedServices.size} {selectedServices.size === 1 ? 'selecionado' : 'selecionados'}
                </span>
              </div>

              {/* Search input for services */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text"
                  placeholder="Filtrar serviço ou subitem..."
                  value={serviceSearch}
                  onChange={e => setServiceSearch(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            {/* Services List with Individual Checkboxes */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-2.5">
              {groupedStructure.map(item => {
                if (item.type === 'standalone') {
                  const serviceName = item.name;
                  const matches = !serviceSearch.trim() || serviceName.toLowerCase().includes(serviceSearch.toLowerCase());
                  if (!matches) return null;

                  const isChecked = selectedServices.has(serviceName);

                  return (
                    <label 
                      key={serviceName}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-colors",
                        isChecked
                          ? "bg-teal-50/70 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800"
                          : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleService(serviceName)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-neutral-300 dark:border-neutral-700 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {serviceName}
                        </span>
                      </div>
                    </label>
                  );
                }

                // Category Accordion Group
                const category = item.category;
                const isExpanded = expandedCategories[category.id] !== false;
                const subServices = item.services;

                // Filter subservices by search term
                const filteredSubs = subServices.filter(sub => 
                  !serviceSearch.trim() || 
                  sub.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                  category.name.toLowerCase().includes(serviceSearch.toLowerCase())
                );

                if (filteredSubs.length === 0 && serviceSearch.trim()) return null;

                // Count how many subitems in this category are selected
                const selectedInCat = subServices.filter(s => selectedServices.has(s)).length;

                return (
                  <div 
                    key={category.id}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-800 shadow-xs"
                  >
                    {/* Category Header Accordion */}
                    <div 
                      onClick={() => toggleCategoryExpand(category.id)}
                      className="p-3 bg-neutral-50/80 dark:bg-neutral-800/50 flex items-center justify-between cursor-pointer select-none border-b border-neutral-200/60 dark:border-neutral-800"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {category.name}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-neutral-200/80 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                          {subServices.length} subitens
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedInCat > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            {selectedInCat} marcados
                          </span>
                        )}
                        <span className="text-neutral-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {/* Subitems with Individual Checkboxes */}
                    {isExpanded && (
                      <div className="p-2.5 flex flex-col gap-1.5 bg-neutral-50/30 dark:bg-neutral-900/30">
                        {filteredSubs.map(subName => {
                          const isSubChecked = selectedServices.has(subName);

                          return (
                            <label 
                              key={subName}
                              className={cn(
                                "p-2 rounded-lg border flex items-center justify-between gap-2.5 cursor-pointer select-none transition-colors",
                                isSubChecked
                                  ? "bg-teal-50/70 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-200 font-semibold"
                                  : "bg-white dark:bg-neutral-800/80 border-neutral-200/70 dark:border-neutral-700/60 hover:border-neutral-300 text-neutral-800 dark:text-neutral-200 text-xs"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input 
                                  type="checkbox"
                                  checked={isSubChecked}
                                  onChange={() => toggleService(subName)}
                                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-neutral-300 dark:border-neutral-700 cursor-pointer"
                                />
                                <span className="text-xs truncate">{subName}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: Specific Units / Apartments Selection (Grade por Pavimento) */}
          <div className={cn(
            "flex flex-col h-full overflow-hidden",
            mobileTab !== 'units' ? "hidden sm:flex" : "flex"
          )}>
            {/* Column Header */}
            <div className="p-3.5 sm:p-4 border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Apartamentos por Pavimento
                </span>
              </div>
              <span className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full border transition-colors",
                selectedLocations.size > 0
                  ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800"
                  : "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
              )}>
                {selectedLocations.size} {selectedLocations.size === 1 ? 'selecionado' : 'selecionados'}
              </span>
            </div>

            {/* Units Organized Floor by Floor (No "select all" buttons) */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-4">
              {FLOORS.map(floor => {
                const countSelectedOnFloor = floor.locations.filter(loc => selectedLocations.has(loc)).length;

                return (
                  <div 
                    key={floor.id}
                    className="p-3.5 rounded-xl border border-neutral-200/90 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xs flex flex-col gap-2.5"
                  >
                    {/* Floor Label */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-800 dark:text-neutral-100">
                        {floor.name}
                      </span>
                      {countSelectedOnFloor > 0 && (
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                          {countSelectedOnFloor} de {floor.locations.length} marcados
                        </span>
                      )}
                    </div>

                    {/* Compact Interactive Unit Cards */}
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                      {floor.locations.map(locId => {
                        const isSelected = selectedLocations.has(locId);

                        return (
                          <button
                            key={locId}
                            type="button"
                            onClick={() => toggleLocation(locId)}
                            className={cn(
                              "py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 border",
                              isSelected
                                ? "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-500/20"
                                : "bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            <span>{locId}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Success feedback toast inside modal */}
        {saveSuccessMessage && (
          <div className="p-3.5 bg-emerald-600 text-white text-xs font-bold text-center animate-fade-in flex items-center justify-between px-4 gap-2 shadow-inner">
            <div className="flex items-center gap-2 mx-auto">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer: Live Summary & Action Buttons */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Summary Display */}
          <div className="flex flex-col min-w-0 gap-1">
            {hasSelections ? (
              <div className="text-xs text-neutral-800 dark:text-neutral-200">
                <span>Atualizando </span>
                <strong className="text-teal-600 dark:text-teal-400">
                  {selectedServices.size} {selectedServices.size === 1 ? 'serviço' : 'serviços'}
                </strong>
                <span> em </span>
                <strong className="text-teal-600 dark:text-teal-400">
                  {selectedLocations.size} {selectedLocations.size === 1 ? 'apartamento selecionado' : 'apartamentos selecionados'}
                </strong>
              </div>
            ) : selectedLocations.size > 0 ? (
              <div className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>
                  <strong>{selectedLocations.size}</strong> {selectedLocations.size === 1 ? 'apartamento selecionado' : 'apartamentos selecionados'}. Agora marque os serviços ao lado.
                </span>
              </div>
            ) : (
              <div className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Selecione os serviços e os apartamentos desejados para aplicar a ação.</span>
              </div>
            )}
            
            {/* Options bar: Contractor indicator & Keep Locations toggle */}
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>
                  Empreiteira:{' '}
                  <strong className="text-neutral-700 dark:text-neutral-300">
                    {isNewContractor 
                      ? (newContractorName.trim() || 'Nova empreiteira') 
                      : contractor === 'KEEP' 
                        ? 'Manter atual das unidades' 
                        : contractor}
                  </strong>
                </span>
              </div>

              {/* Checkbox: Manter apartamentos selecionados */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-neutral-700 dark:text-neutral-300 font-medium">
                <input 
                  type="checkbox"
                  checked={keepLocationsSelected}
                  onChange={e => setKeepLocationsSelected(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-neutral-300 dark:border-neutral-600 cursor-pointer"
                />
                <span>Manter apartamentos selecionados ao concluir</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {(selectedServices.size > 0 || selectedLocations.size > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedServices(new Set());
                  setSelectedLocations(new Set());
                }}
                disabled={isSaving}
                className="px-2.5 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
                title="Desmarcar todos os itens selecionados"
              >
                Limpar
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              title="Fechar janela de preenchimento múltiplo"
            >
              Fechar
            </button>

            {/* Action 1: Marcar como Pendente */}
            <button
              type="button"
              disabled={!hasSelections || isSaving}
              onClick={() => handleApplyStatus('pending')}
              className="px-3.5 py-2.5 bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-700 dark:hover:bg-neutral-600 disabled:opacity-40 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              title="Marcar serviços selecionados como Pendente nos apartamentos escolhidos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Marcar Pendente</span>
            </button>

            {/* Action 2: Marcar como Concluído */}
            <button
              type="button"
              disabled={!hasSelections || isSaving}
              onClick={() => handleApplyStatus('completed')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-emerald-600/20"
              title="Marcar serviços selecionados como Concluído nos apartamentos escolhidos"
            >
              {isSaving ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Marcar como Concluído</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Custom Select Component matching BulkAssignModal
function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder,
  renderOption 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
  placeholder: string;
  renderOption?: (val: string) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border rounded-xl px-3 py-2 text-xs transition-all shadow-xs",
          isOpen ? "border-teal-600 ring-2 ring-teal-600/20" : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600",
          !value && "text-neutral-400 dark:text-neutral-500"
        )}
      >
        <span className="truncate pr-2">
          {value ? (renderOption ? renderOption(value) : value) : placeholder}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-56 overflow-y-auto p-1 flex flex-col gap-0.5">
              {options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors",
                    value === opt 
                      ? "bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-medium" 
                      : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
                  )}
                >
                  <span className="truncate">{renderOption ? renderOption(opt) : opt}</span>
                  {value === opt && opt !== 'NEW' && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
