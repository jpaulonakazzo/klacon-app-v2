import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteServiceConfirmModalProps {
  isOpen: boolean;
  serviceName: string | null;
  title?: string;
  itemLabel?: string;
  warningMessage?: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteServiceConfirmModal({
  isOpen,
  serviceName,
  title = "Excluir Serviço?",
  itemLabel = "Serviço selecionado",
  warningMessage = "Atenção: Tem certeza que deseja apagar este item? Esta ação removerá o item permanentemente da lista e de todos os apartamentos para todos os usuários.",
  onClose,
  onConfirm,
  isDeleting = false
}: DeleteServiceConfirmModalProps) {
  if (!isOpen || !serviceName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={!isDeleting ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4 text-neutral-900 dark:text-neutral-100"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/70 border border-red-200 dark:border-red-900/60 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
              {title}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Confirmação de exclusão permanente
            </p>
          </div>
          {!isDeleting && (
            <button 
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            {itemLabel}
          </span>
          <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 break-words">
            "{serviceName}"
          </span>
        </div>

        <div className="flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200/60 dark:border-red-900/40">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {warningMessage}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-red-500/20 transition-colors"
          >
            {isDeleting ? (
              <span>Excluindo...</span>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
