import React, { useState, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  Search, 
  Settings, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  Layers, 
  CheckCircle2, 
  FolderPlus,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AppState, 
  ServiceCategory, 
  isCustomService, 
  isCustomCategory,
  getServiceCategory 
} from '../types';
import { cn } from '../lib/utils';
import { DeleteServiceConfirmModal } from './DeleteServiceConfirmModal';

interface SettingsServicesModalProps {
  state: AppState;
  onClose: () => void;
  onDeleteService: (serviceName: string) => Promise<void>;
  onOpenAddService: () => void;
  onAddCategory?: (name: string, initialSubServices?: string[]) => Promise<void>;
  onAddSubService?: (categoryId: string, subServiceName: string) => Promise<void>;
  onDeleteSubService?: (categoryId: string, subServiceName: string) => Promise<void>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
  onEditSubService?: (categoryId: string, oldSubServiceName: string, newSubServiceName: string) => Promise<void>;
  onConvertServiceToCategory?: (serviceName: string, initialSubServices: string[]) => Promise<void>;
  onEditCategoryName?: (categoryId: string, newName: string) => Promise<void>;
}

export function SettingsServicesModal({
  state,
  onClose,
  onDeleteService,
  onOpenAddService,
  onAddCategory,
  onAddSubService,
  onDeleteSubService,
  onDeleteCategory,
  onEditSubService,
  onConvertServiceToCategory,
  onEditCategoryName
}: SettingsServicesModalProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'custom' | 'all'>('categories');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Deletion modals state
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ServiceCategory | null>(null);
  const [subItemToDelete, setSubItemToDelete] = useState<{ categoryId: string; subServiceName: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatInitialSubs, setNewCatInitialSubs] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // New Subitem per category form state: map of categoryId -> input text
  const [subItemInputs, setSubItemInputs] = useState<Record<string, string>>({});
  const [expandedCatCards, setExpandedCatCards] = useState<Record<string, boolean>>({
    granitos: true,
    revestimento_ceramico: true
  });

  // Editing Subitem state
  const [editingSubItem, setEditingSubItem] = useState<{ categoryId: string; oldName: string; currentName: string } | null>(null);

  // Editing Category Name state
  const [editingCategory, setEditingCategory] = useState<{ id: string; currentName: string } | null>(null);

  // Conversion of simple service to category state
  const [serviceToConvert, setServiceToConvert] = useState<string | null>(null);
  const [convertSubItemsInput, setConvertSubItemsInput] = useState('');
  const [convertSubItemsTags, setConvertSubItemsTags] = useState<string[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  // Toast feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Toggle category card in settings
  const toggleCatCard = (catId: string) => {
    setExpandedCatCards(prev => ({
      ...prev,
      [catId]: prev[catId] === undefined ? false : !prev[catId]
    }));
  };

  // Compute usage statistics for each service across all locations
  const serviceStats = useMemo(() => {
    const stats: Record<string, { totalActive: number; completed: number }> = {};
    
    state.servicesList.forEach(svcName => {
      stats[svcName] = { totalActive: 0, completed: 0 };
    });

    Object.values(state.locations).forEach(loc => {
      Object.entries(loc.services || {}).forEach(([svcName, svcData]) => {
        if (!stats[svcName]) {
          stats[svcName] = { totalActive: 0, completed: 0 };
        }
        if (svcData.status === 'completed') {
          stats[svcName].completed++;
          stats[svcName].totalActive++;
        } else if (svcData.status === 'in_progress') {
          stats[svcName].totalActive++;
        }
      });
    });

    return stats;
  }, [state.servicesList, state.locations]);

  // Identify custom services (standalone or custom subitems)
  const customServices = useMemo(() => {
    return state.servicesList.filter(s => isCustomService(s));
  }, [state.servicesList]);

  // Filtered list based on active tab and search
  const displayedServices = useMemo(() => {
    const baseList = activeTab === 'custom' ? customServices : state.servicesList;
    const query = searchTerm.trim().toLowerCase();

    if (!query) return baseList;

    return baseList.filter(s => s.toLowerCase().includes(query));
  }, [activeTab, customServices, state.servicesList, searchTerm]);

  // Handle Create Category
  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !onAddCategory) return;

    const trimmed = newCatName.trim();
    if (state.categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError('Já existe uma categoria com este nome.');
      return;
    }

    setCategoryError(null);
    setIsCreatingCategory(true);

    const initialSubs = newCatInitialSubs
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      await onAddCategory(trimmed, initialSubs);
      setNewCatName('');
      setNewCatInitialSubs('');
      // auto-expand the new category
      const newId = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-');
      setExpandedCatCards(prev => ({ ...prev, [newId]: true }));
      showToast(`Categoria "${trimmed}" criada com sucesso!`);
    } catch (err) {
      console.error("Failed to create category:", err);
      setCategoryError('Erro ao criar categoria.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Handle Add Subitem to Category
  const handleAddSubItem = async (categoryId: string) => {
    const text = (subItemInputs[categoryId] || '').trim();
    if (!text || !onAddSubService) return;

    try {
      await onAddSubService(categoryId, text);
      setSubItemInputs(prev => ({ ...prev, [categoryId]: '' }));
      showToast(`Subitem "${text}" adicionado com sucesso!`);
    } catch (err) {
      console.error("Failed to add subitem:", err);
    }
  };

  // Handle Save Edit Subitem Name
  const handleSaveEditSubItem = async () => {
    if (!editingSubItem || !onEditSubService) return;
    const trimmed = editingSubItem.currentName.trim();
    if (!trimmed || trimmed === editingSubItem.oldName) {
      setEditingSubItem(null);
      return;
    }

    try {
      await onEditSubService(editingSubItem.categoryId, editingSubItem.oldName, trimmed);
      showToast(`Subitem renomeado para "${trimmed}"!`);
      setEditingSubItem(null);
    } catch (err) {
      console.error("Failed to edit subitem:", err);
    }
  };

  // Handle Save Edit Category Name
  const handleSaveEditCategory = async () => {
    if (!editingCategory || !onEditCategoryName) return;
    const trimmed = editingCategory.currentName.trim();
    if (!trimmed) {
      setEditingCategory(null);
      return;
    }

    try {
      await onEditCategoryName(editingCategory.id, trimmed);
      showToast(`Categoria renomeada para "${trimmed}"!`);
      setEditingCategory(null);
    } catch (err) {
      console.error("Failed to edit category name:", err);
    }
  };

  // Add Tag in Convert Modal
  const handleAddConvertTag = () => {
    const raw = convertSubItemsInput.trim();
    if (!raw) return;

    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
    setConvertSubItemsTags(prev => Array.from(new Set([...prev, ...parts])));
    setConvertSubItemsInput('');
  };

  // Confirm Convert Service to Category
  const handleConfirmConvert = async () => {
    if (!serviceToConvert || !onConvertServiceToCategory) return;

    let allSubs = [...convertSubItemsTags];
    if (convertSubItemsInput.trim()) {
      const parts = convertSubItemsInput.split(',').map(p => p.trim()).filter(Boolean);
      allSubs = Array.from(new Set([...allSubs, ...parts]));
    }

    if (allSubs.length === 0) return;

    try {
      setIsConverting(true);
      await onConvertServiceToCategory(serviceToConvert, allSubs);
      showToast(`Serviço "${serviceToConvert}" transformado em categoria com ${allSubs.length} subitens!`);
      setServiceToConvert(null);
      setConvertSubItemsInput('');
      setConvertSubItemsTags([]);
      setActiveTab('categories');
      const catId = serviceToConvert.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
      setExpandedCatCards(prev => ({ ...prev, [catId]: true }));
    } catch (err) {
      console.error("Failed to convert service to category:", err);
    } finally {
      setIsConverting(false);
    }
  };

  // Confirm Deletion Handlers
  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteService(serviceToDelete);
      setServiceToDelete(null);
      showToast(`Serviço "${serviceToDelete}" excluído.`);
    } catch (err) {
      console.error("Failed to delete service:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteSubItem = async () => {
    if (!subItemToDelete || !onDeleteSubService) return;
    try {
      setIsDeleting(true);
      await onDeleteSubService(subItemToDelete.categoryId, subItemToDelete.subServiceName);
      setSubItemToDelete(null);
      showToast(`Subitem "${subItemToDelete.subServiceName}" excluído.`);
    } catch (err) {
      console.error("Failed to delete subservice:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete || !onDeleteCategory) return;
    try {
      setIsDeleting(true);
      await onDeleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      showToast(`Categoria "${categoryToDelete.name}" excluída.`);
    } catch (err) {
      console.error("Failed to delete category:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Main Modal Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-neutral-900 dark:text-neutral-100 transition-colors"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                Configurações & Gerenciamento
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Categorias expansíveis, edição de subitens e conversão de serviços
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-neutral-100/60 dark:bg-neutral-950/40 border-b border-neutral-200/80 dark:border-neutral-800 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 flex flex-col">
            <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Categorias
            </span>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5">
              {state.categories.length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 flex flex-col">
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Personalizados
            </span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {customServices.length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 flex flex-col">
            <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Total Itens
            </span>
            <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {state.servicesList.length}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 flex bg-neutral-50/80 dark:bg-neutral-900/60">
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-full">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === 'categories'
                  ? "bg-white dark:bg-neutral-700 text-teal-700 dark:text-teal-300 shadow-xs"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categorias & Subitens</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-extrabold">
                {state.categories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === 'all'
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              <span>Todos Serviços</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300">
                {state.servicesList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === 'custom'
                  ? "bg-white dark:bg-neutral-700 text-amber-700 dark:text-amber-300 shadow-xs"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              <span>Personalizados</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                {customServices.length}
              </span>
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-teal-600 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-teal-200 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Categories & Subitems Content */}
        {activeTab === 'categories' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            
            {/* Form: Nova Categoria */}
            <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Criar Nova Categoria Expansível
                </h3>
              </div>

              <form onSubmit={handleCreateCategorySubmit} className="flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text"
                    required
                    placeholder="Nome da categoria (ex: Pintura, Esquadrias...)"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <input 
                    type="text"
                    placeholder="Subitens separados por vírgula (opcional)"
                    value={newCatInitialSubs}
                    onChange={e => setNewCatInitialSubs(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingCategory || !newCatName.trim()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCreatingCategory ? 'Criando...' : 'Criar Categoria'}</span>
                  </button>
                </div>
                {categoryError && (
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {categoryError}
                  </span>
                )}
              </form>
            </div>

            {/* Categories List */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Categorias Ativas ({state.categories.length})
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Adicione, renomeie ou remova subitens
                </span>
              </div>

              {state.categories.map((category) => {
                const isCustom = isCustomCategory(category.id);
                const isExpanded = expandedCatCards[category.id] !== false;
                const subItemInputVal = subItemInputs[category.id] || '';
                const isEditingCatName = editingCategory?.id === category.id;

                return (
                  <div
                    key={category.id}
                    className={cn(
                      "rounded-2xl border transition-all overflow-hidden shadow-xs",
                      isCustom
                        ? "bg-white dark:bg-neutral-900 border-teal-200/90 dark:border-teal-900/60"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                    )}
                  >
                    {/* Category Card Header */}
                    <div className="p-3.5 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-200/70 dark:border-neutral-800">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div 
                          onClick={() => toggleCatCard(category.id)}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border cursor-pointer",
                            isCustom
                              ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800/60"
                              : "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                          )}
                        >
                          <Layers className="w-4 h-4" />
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          {isEditingCatName ? (
                            <div className="flex items-center gap-1.5 py-0.5">
                              <input
                                type="text"
                                autoFocus
                                value={editingCategory.currentName}
                                onChange={e => setEditingCategory({ ...editingCategory, currentName: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEditCategory();
                                  } else if (e.key === 'Escape') {
                                    setEditingCategory(null);
                                  }
                                }}
                                className="bg-white dark:bg-neutral-800 border border-teal-500 rounded-lg px-2 py-0.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleSaveEditCategory}
                                className="p-1 rounded-lg bg-teal-600 text-white hover:bg-teal-500"
                                title="Salvar nome"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 
                                onClick={() => toggleCatCard(category.id)}
                                className="font-bold text-sm text-neutral-900 dark:text-neutral-100 leading-tight cursor-pointer hover:text-teal-600 transition-colors"
                              >
                                {category.name}
                              </h4>
                              
                              {onEditCategoryName && (
                                <button
                                  type="button"
                                  onClick={() => setEditingCategory({ id: category.id, currentName: category.name })}
                                  className="text-neutral-400 hover:text-teal-600 dark:hover:text-teal-400 p-0.5 rounded transition-colors"
                                  title="Renomear categoria"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}

                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                                {category.subServices.length} {category.subServices.length === 1 ? 'subitem' : 'subitens'}
                              </span>

                              {isCustom ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                                  Personalizada
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                  Padrão
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Delete entire category button */}
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(category)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 rounded-lg border border-red-200 dark:border-red-900/60 hover:border-red-600 transition-colors shadow-xs"
                          title={`Excluir categoria "${category.name}" e seus subitens`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Collapse Chevron */}
                        <button
                          type="button"
                          onClick={() => toggleCatCard(category.id)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Category Card Body: Subitems List & Add Subitem */}
                    {isExpanded && (
                      <div className="p-3.5 flex flex-col gap-3">
                        {/* Quick Add Subitem Input */}
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder={`Adicionar novo subitem em ${category.name}...`}
                            value={subItemInputVal}
                            onChange={e => setSubItemInputs({ ...subItemInputs, [category.id]: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubItem(category.id);
                              }
                            }}
                            className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubItem(category.id)}
                            disabled={!subItemInputVal.trim()}
                            className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </button>
                        </div>

                        {/* Subitems List */}
                        {category.subServices.length === 0 ? (
                          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700 text-center">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              Nenhum subitem cadastrado nesta categoria. Adicione o primeiro subitem acima!
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {category.subServices.map((subName) => {
                              const stats = serviceStats[subName] || { totalActive: 0, completed: 0 };
                              const isEditingThis = editingSubItem?.categoryId === category.id && editingSubItem?.oldName === subName;

                              return (
                                <div 
                                  key={subName}
                                  className="p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between gap-2"
                                >
                                  {isEditingThis ? (
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                      <input
                                        type="text"
                                        autoFocus
                                        value={editingSubItem.currentName}
                                        onChange={e => setEditingSubItem({ ...editingSubItem, currentName: e.target.value })}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSaveEditSubItem();
                                          } else if (e.key === 'Escape') {
                                            setEditingSubItem(null);
                                          }
                                        }}
                                        className="flex-1 bg-white dark:bg-neutral-800 border border-teal-500 rounded-lg px-2 py-1 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleSaveEditSubItem}
                                        className="p-1 rounded-lg bg-teal-600 text-white hover:bg-teal-500"
                                        title="Salvar alteração"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSubItem(null)}
                                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                        title="Cancelar"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-col min-w-0 flex-1 pr-2">
                                        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 whitespace-normal break-words leading-snug">
                                          {subName}
                                        </span>
                                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                          {stats.completed > 0 ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                              {stats.completed} aptos concluídos
                                            </span>
                                          ) : stats.totalActive > 0 ? (
                                            <span className="text-amber-600 dark:text-amber-400">
                                              Em andamento em {stats.totalActive} aptos
                                            </span>
                                          ) : (
                                            "Pendente"
                                          )}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        {/* Edit Subitem Button */}
                                        {onEditSubService && (
                                          <button
                                            type="button"
                                            onClick={() => setEditingSubItem({ categoryId: category.id, oldName: subName, currentName: subName })}
                                            className="p-1 text-neutral-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg transition-colors"
                                            title={`Editar nome do subitem "${subName}"`}
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                        )}

                                        {/* Delete Subitem Button */}
                                        <button
                                          type="button"
                                          onClick={() => setSubItemToDelete({ categoryId: category.id, subServiceName: subName })}
                                          className="p-1 text-red-500 hover:text-white hover:bg-red-600 rounded-lg border border-transparent hover:border-red-600 transition-colors shrink-0"
                                          title={`Excluir subitem "${subName}"`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2 & 3: Standalone / Custom / All Services Content */}
        {activeTab !== 'categories' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Box */}
            <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text"
                  placeholder="Buscar serviço por nome..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {displayedServices.length === 0 ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    {activeTab === 'custom' 
                      ? 'Nenhum serviço personalizado avulso encontrado' 
                      : 'Nenhum serviço corresponde à busca'}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mt-1">
                    {activeTab === 'custom' 
                      ? 'Os serviços da obra estão cadastrados nas categorias ou não há duplicatas avulsas adicionadas.' 
                      : 'Tente refazer a busca ou clique na aba de categorias.'}
                  </p>
                </div>
              ) : (
                displayedServices.map((serviceName) => {
                  const isCustom = isCustomService(serviceName);
                  const stats = serviceStats[serviceName] || { totalActive: 0, completed: 0 };
                  const category = getServiceCategory(serviceName, state.categories);

                  return (
                    <div 
                      key={serviceName}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors",
                        isCustom 
                          ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/50 hover:border-amber-300" 
                          : "bg-white dark:bg-neutral-800/70 border-neutral-200 dark:border-neutral-700/80 hover:border-neutral-300"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                          isCustom
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                        )}>
                          {category ? (
                            <Layers className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 leading-snug break-words">
                              {serviceName}
                            </span>
                            {isCustom ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                                Personalizado
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                Padrão
                              </span>
                            )}
                            {category && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                Categoria: {category.name}
                              </span>
                            )}
                          </div>
                          
                          <span className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {stats.completed > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                {stats.completed} aptos concluídos
                              </span>
                            ) : stats.totalActive > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Em andamento em {stats.totalActive} aptos
                              </span>
                            ) : (
                              "Pendente"
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Convert to Category Button (only for standalone simple services) */}
                        {!category && onConvertServiceToCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              setServiceToConvert(serviceName);
                              setConvertSubItemsInput('');
                              setConvertSubItemsTags([]);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/70 dark:hover:bg-teal-900/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold transition-all shadow-xs"
                            title={`Adicionar subitens e converter "${serviceName}" em categoria expansível`}
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Adicionar Subitens</span>
                            <span className="sm:hidden">+ Subitens</span>
                          </button>
                        )}

                        {/* Red Trash Delete Button */}
                        <button
                          type="button"
                          onClick={() => setServiceToDelete(serviceName)}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 rounded-xl transition-all border border-red-200 dark:border-red-900/60 hover:border-red-600 shadow-xs"
                          title={`Excluir serviço "${serviceName}"`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            Alterações refletem instantaneamente no estado e no Firebase.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl font-bold transition-colors self-end sm:self-auto"
          >
            Concluir
          </button>
        </div>
      </motion.div>

      {/* Modal: Converter Serviço em Categoria */}
      {serviceToConvert && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 text-neutral-900 dark:text-neutral-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 leading-tight">
                    Transformar em Categoria Expansível
                  </h3>
                  <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                    {serviceToConvert}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setServiceToConvert(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                O serviço simples <strong>"{serviceToConvert}"</strong> passará a ser uma categoria com subitens (como <em>Granitos</em> e <em>Revestimento Cerâmico</em>).
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Digite os subitens que pertencerão a ela (separe por vírgula ou clique em Adicionar):
              </p>
            </div>

            {/* Input to add subitems */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Sala Piso, Quarto Piso, Cozinha..."
                  value={convertSubItemsInput}
                  onChange={e => setConvertSubItemsInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddConvertTag();
                    }
                  }}
                  className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <button
                  type="button"
                  onClick={handleAddConvertTag}
                  disabled={!convertSubItemsInput.trim()}
                  className="px-3.5 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              {/* Tags list */}
              {convertSubItemsTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 max-h-36 overflow-y-auto">
                  {convertSubItemsTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => setConvertSubItemsTags(tags => tags.filter((_, i) => i !== idx))}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setServiceToConvert(null)}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isConverting || (convertSubItemsTags.length === 0 && !convertSubItemsInput.trim())}
                onClick={handleConfirmConvert}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-teal-600/20 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isConverting ? 'Convertendo...' : 'Confirmar & Criar Categoria'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Service Confirmation Modal */}
      {serviceToDelete && (
        <DeleteServiceConfirmModal
          isOpen={true}
          serviceName={serviceToDelete}
          title="Excluir Serviço?"
          itemLabel="Serviço"
          warningMessage={`Tem certeza que deseja apagar o serviço "${serviceToDelete}"? Esta ação removerá o item permanentemente da lista e de todos os apartamentos.`}
          onConfirm={handleConfirmDeleteService}
          onClose={() => setServiceToDelete(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Delete Subitem Confirmation Modal */}
      {subItemToDelete && (
        <DeleteServiceConfirmModal
          isOpen={true}
          serviceName={subItemToDelete.subServiceName}
          title="Excluir Subitem?"
          itemLabel="Subitem da Categoria"
          warningMessage={`Tem certeza que deseja apagar o subitem "${subItemToDelete.subServiceName}" desta categoria?`}
          onConfirm={handleConfirmDeleteSubItem}
          onClose={() => setSubItemToDelete(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <DeleteServiceConfirmModal
          isOpen={true}
          serviceName={categoryToDelete.name}
          title="Excluir Categoria e Subitens?"
          itemLabel={`Categoria com ${categoryToDelete.subServices.length} subitens`}
          warningMessage={`Tem certeza que deseja apagar a categoria "${categoryToDelete.name}" e todos os seus ${categoryToDelete.subServices.length} subitens? Esta ação removerá todos os subitens atrelados de todos os apartamentos.`}
          onConfirm={handleConfirmDeleteCategory}
          onClose={() => setCategoryToDelete(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
