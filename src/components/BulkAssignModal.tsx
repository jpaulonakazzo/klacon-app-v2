import React from "react";
import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check, Plus } from 'lucide-react';
import { AppState } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function BulkAssignModal({ 
  state, 
  onClose, 
  onAssign 
}: { 
  state: AppState, 
  onClose: () => void, 
  onAssign: (service: string, contractor: string) => void 
}) {
  const serviceOptions = React.useMemo(() => {
    const list = state.servicesList.filter(s => s !== 'Granitos' && s !== '🪨 Granitos');
    return ['Granitos (Todos os subitens)', ...list];
  }, [state.servicesList]);

  const [service, setService] = useState(serviceOptions[0] || '');
  const [contractor, setContractor] = useState(state.contractors[0] || '');
  const [isNewContractor, setIsNewContractor] = useState(false);
  const [newContractorName, setNewContractorName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalContractor = isNewContractor ? newContractorName.trim() : contractor;
    if (service && finalContractor) {
      onAssign(service, finalContractor);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} // Spring-like ease out
        className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col transition-colors"
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Atribuir em Massa</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Serviço</label>
            <CustomSelect
              value={service}
              onChange={setService}
              options={serviceOptions}
              placeholder="Selecione um serviço..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Empreiteira</label>
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
                options={[...state.contractors, 'NEW']}
                placeholder="Selecione uma empreiteira..."
                renderOption={(opt) => 
                  opt === 'NEW' ? (
                    <span className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold">
                      <Plus className="w-4 h-4" /> Nova Empreiteira...
                    </span>
                  ) : opt
                }
              />
            ) : (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="Nome da nova empreiteira..."
                  value={newContractorName}
                  onChange={e => setNewContractorName(e.target.value)}
                  className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all shadow-sm"
                />
                <button 
                  type="button"
                  onClick={() => setIsNewContractor(false)}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-2 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
            <strong>Atenção:</strong> Esta ação atribuirá a empreiteira a este serviço em <strong>todos os locais</strong> do edifício, sobrescrevendo atribuições anteriores para este serviço específico.
          </p>

          <div className="flex gap-3 pt-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={(!isNewContractor && !contractor) || (isNewContractor && !newContractorName.trim()) || !service}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-neutral-900 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Aplicar a Todos
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Custom Select Component for a more modern, less "square" look
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
          "w-full flex items-center justify-between bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border rounded-xl px-4 py-3 text-sm transition-all shadow-sm",
          isOpen ? "border-teal-600 ring-2 ring-teal-600/20" : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600",
          !value && "text-neutral-400 dark:text-neutral-500"
        )}
      >
        <span className="truncate pr-4">
          {value ? (renderOption ? renderOption(value) : value) : placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-neutral-400 dark:text-neutral-500 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto p-1 flex flex-col gap-0.5 custom-scrollbar">
              {options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                    value === opt 
                      ? "bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-medium" 
                      : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  )}
                >
                  <span className="truncate">{renderOption ? renderOption(opt) : opt}</span>
                  {value === opt && opt !== 'NEW' && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e5e5;
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #404040;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d4;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #525252;
        }
      `}} />
    </div>
  );
}
