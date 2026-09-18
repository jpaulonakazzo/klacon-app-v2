import { AppNotification, NotificationSettings } from '../types';
import { Bell, Check, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export function NotificationsScreen({ 
  notifications, 
  settings, 
  onMarkRead, 
  onUpdateSettings 
}: { 
  notifications: AppNotification[], 
  settings: NotificationSettings, 
  onMarkRead: (id: string) => void,
  onUpdateSettings: (settings: Partial<NotificationSettings>) => void
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="p-4 bg-white border-b border-neutral-200 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-600" /> Avisos e Notificações
        </h2>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "p-2 rounded-full transition-colors",
            showSettings ? "bg-teal-50 text-teal-700" : "text-neutral-500 hover:bg-neutral-100"
          )}
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="p-4 bg-neutral-900 text-white flex flex-col gap-4 border-b border-neutral-800 shadow-inner">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Configurações de Notificação</h3>
          
          <div className="flex flex-col gap-3">
            <ToggleOption 
              label="Mudanças de Status de Serviços" 
              checked={settings.statusChanges} 
              onChange={v => onUpdateSettings({ statusChanges: v })} 
            />
            <ToggleOption 
              label="Novas Tarefas e Empreiteiras" 
              checked={settings.newTasks} 
              onChange={v => onUpdateSettings({ newTasks: v })} 
            />
            <ToggleOption 
              label="Atualizações Importantes (Sistema)" 
              checked={settings.updates} 
              onChange={v => onUpdateSettings({ updates: v })} 
            />
          </div>
        </div>
      )}

      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center text-neutral-500 py-10 flex flex-col items-center gap-3">
            <Bell className="w-12 h-12 text-neutral-300" />
            <p>Nenhuma notificação no momento.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              className={cn(
                "p-4 rounded-xl border flex gap-3 transition-colors",
                notif.read ? "bg-white border-neutral-200" : "bg-teal-50/50 border-teal-200"
              )}
              onClick={() => !notif.read && onMarkRead(notif.id)}
            >
              <div className="mt-1 shrink-0">
                {!notif.read ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-600 mt-1" />
                ) : (
                  <Check className="w-4 h-4 text-neutral-300 mt-0.5" />
                )}
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <p className={cn("text-sm", notif.read ? "text-neutral-600" : "text-neutral-900 font-medium")}>
                  {notif.message}
                </p>
                <span className="text-[10px] text-neutral-400 font-medium">
                  {new Date(notif.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ToggleOption({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm font-medium text-neutral-200">{label}</span>
      <div className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
      </div>
    </label>
  );
}
