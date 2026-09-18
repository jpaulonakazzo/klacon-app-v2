import React from "react";
import { useState } from 'react';
import { Status } from '../types';
import { X } from 'lucide-react';

export function AddServiceModal({ onClose, onAdd }: { onClose: () => void, onAdd: (name: string, status: Status) => void }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('pending');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), status);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900">Novo Serviço Global</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 p-1 rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Nome do Serviço</label>
            <input 
              type="text" 
              required
              autoFocus
              placeholder="Ex: Instalação de Rodapés"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status Inicial Padrão</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Status)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all"
            >
              <option value="pending">Pendente / Não Iniciado</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluído</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-neutral-900 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
