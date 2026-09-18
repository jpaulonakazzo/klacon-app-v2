import React, { useState } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Settings2, 
  Trash2, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  ShieldCheck, 
  HardHat, 
  Layers, 
  Info,
  X
} from 'lucide-react';
import { AppNotification, NotificationSettings } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type FilterType = 'all' | 'unread' | 'status' | 'task';

export function NotificationsScreen({ 
  notifications, 
  settings, 
  onMarkRead, 
  onMarkAllRead,
  onClearAll,
  onRemoveNotification,
  onAddTestNotification,
  onUpdateSettings,
  onSelectLocation
}: { 
  notifications: AppNotification[]; 
  settings: NotificationSettings; 
  onMarkRead: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  onRemoveNotification?: (id: string) => void;
  onAddTestNotification?: (type?: 'status' | 'task' | 'update') => void;
  onUpdateSettings: (settings: Partial<NotificationSettings>) => void;
  onSelectLocation?: (locationId: string) => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [saveFeedback, setSaveFeedback] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const statusCount = notifications.filter(n => n.type === 'status').length;
  const taskCount = notifications.filter(n => n.type === 'task').length;

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    onUpdateSettings({ [key]: value });
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleResetDefaults = () => {
    onUpdateSettings({
      statusChanges: true,
      newTasks: true,
      updates: true
    });
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'status') return n.type === 'status';
    if (activeFilter === 'task') return n.type === 'task';
    return true;
  });

  return (
    <div className="flex flex-col min-h-full bg-neutral-50 dark:bg-neutral-950 pb-10 transition-colors">
      
      {/* Top Header */}
      <div className="p-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center sticky top-0 z-10 shadow-xs transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/50 dark:border-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
              Avisos e Notificações
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}` : 'Todas lidas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
              showSettings 
                ? "bg-teal-500 text-neutral-950 border-teal-500 shadow-sm" 
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            )}
            title="Configurar preferências de notificação"
          >
            <Settings2 className="w-4 h-4" />
            <span>Opções</span>
          </button>
        </div>
      </div>

      {/* Expandable Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/90 backdrop-blur-sm"
          >
            <div className="p-4 max-w-2xl mx-auto flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Preferências Salvas Automaticamente
                  </span>
                  {saveFeedback && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full animate-pulse">
                      Salvo!
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar Padrão
                </button>
              </div>

              {/* Toggles Container */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden shadow-xs">
                
                {/* 1. Status Changes */}
                <SettingRow
                  icon={<Layers className="w-4 h-4 text-blue-500" />}
                  title="Mudanças de Status de Serviços"
                  description="Notificar quando um serviço for alterado para Pendente, Em Andamento ou Concluído."
                  checked={settings.statusChanges}
                  onChange={v => handleToggle('statusChanges', v)}
                />

                {/* 2. New Tasks / Contractors */}
                <SettingRow
                  icon={<HardHat className="w-4 h-4 text-amber-500" />}
                  title="Novas Tarefas e Empreiteiras"
                  description="Notificar quando uma empreiteira for designada a um serviço em qualquer local."
                  checked={settings.newTasks}
                  onChange={v => handleToggle('newTasks', v)}
                />

                {/* 3. System Updates */}
                <SettingRow
                  icon={<Info className="w-4 h-4 text-purple-500" />}
                  title="Atualizações Importantes do Sistema"
                  description="Avisos gerais de conectividade, sincronização e alertas globais."
                  checked={settings.updates}
                  onChange={v => handleToggle('updates', v)}
                />
              </div>

              {/* Test Notification Action */}
              {onAddTestNotification && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Deseja testar se o sistema está gerando avisos?
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddTestNotification('status')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Simular Aviso de Teste
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Actions Bar */}
      <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <FilterButton 
            active={activeFilter === 'all'} 
            onClick={() => setActiveFilter('all')} 
            label="Todas" 
            count={notifications.length} 
          />
          <FilterButton 
            active={activeFilter === 'unread'} 
            onClick={() => setActiveFilter('unread')} 
            label="Não Lidas" 
            count={unreadCount} 
            highlight={unreadCount > 0}
          />
          <FilterButton 
            active={activeFilter === 'status'} 
            onClick={() => setActiveFilter('status')} 
            label="Status" 
            count={statusCount} 
          />
          <FilterButton 
            active={activeFilter === 'task'} 
            onClick={() => setActiveFilter('task')} 
            label="Tarefas" 
            count={taskCount} 
          />
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {unreadCount > 0 && onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              title="Marcar todas as notificações como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar lidas</span>
            </button>
          )}

          {notifications.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              title="Limpar todos os avisos"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-4 flex flex-col gap-2.5 flex-1 max-w-2xl w-full mx-auto">
        {filteredNotifications.length === 0 ? (
          <div className="text-center text-neutral-500 dark:text-neutral-400 py-16 flex flex-col items-center gap-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500">
              <Bell className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                {activeFilter === 'unread' ? 'Nenhum aviso pendente!' : 'Nenhuma notificação no momento'}
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 max-w-xs">
                {activeFilter === 'unread' 
                  ? 'Você já visualizou todas as notificações recentes da obra.' 
                  : 'Atualizações de status e atribuições de empreiteiras aparecerão aqui.'}
              </p>
            </div>
            {onAddTestNotification && (
              <button
                type="button"
                onClick={() => onAddTestNotification('status')}
                className="mt-2 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
              >
                Gerar aviso de teste
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map(notif => {
            const isStatus = notif.type === 'status';
            const isTask = notif.type === 'task';

            return (
              <motion.div 
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group relative p-4 rounded-xl border flex gap-3 transition-all cursor-pointer shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700",
                  notif.read 
                    ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" 
                    : "bg-teal-50/40 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/60"
                )}
                onClick={() => !notif.read && onMarkRead(notif.id)}
              >
                {/* Category Icon */}
                <div className="mt-0.5 shrink-0">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isStatus && "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50",
                    isTask && "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50",
                    !isStatus && !isTask && "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                  )}>
                    {isStatus ? <Layers className="w-4 h-4" /> : isTask ? <HardHat className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm leading-snug", 
                      notif.read ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-900 dark:text-neutral-100 font-semibold"
                    )}>
                      {notif.message}
                    </p>

                    {!notif.read ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 mt-1" title="Não lida" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600 shrink-0 mt-1" title="Lida" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500 flex-wrap">
                    <span>{formatTimestamp(notif.timestamp)}</span>

                    {notif.locationId && onSelectLocation && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLocation(notif.locationId!);
                        }}
                        className="flex items-center gap-1 font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline"
                      >
                        <span>Acessar local ({notif.locationId})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Dismiss Button */}
                {onRemoveNotification && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveNotification(notif.id);
                    }}
                    className="opacity-60 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 rounded-lg transition-opacity"
                    title="Excluir aviso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  checked,
  onChange
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="p-3.5 flex items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-normal">{description}</p>
        </div>
      </div>

      <div className="shrink-0">
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={checked} 
            onChange={e => onChange(e.target.checked)} 
          />
          <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
        </label>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
  highlight = false
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap",
        active 
          ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs" 
          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700",
        highlight && !active && "text-teal-700 dark:text-teal-400 font-bold"
      )}
    >
      <span>{label}</span>
      <span className={cn(
        "px-1.5 py-0.2 rounded-full text-[10px]",
        active 
          ? "bg-neutral-700 dark:bg-neutral-200 text-white dark:text-neutral-900" 
          : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
      )}>
        {count}
      </span>
    </button>
  );
}

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return isoString;
  }
}
