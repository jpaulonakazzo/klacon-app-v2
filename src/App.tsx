import React from "react";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Home, Search, Bell, Map, Download, Wifi, WifiOff, Save, Plus, Users, Sun, Moon } from 'lucide-react';
import { useAppStore } from './store';
import { HomeScreen } from './components/HomeScreen';
import { ApartmentScreen } from './components/ApartmentScreen';
import { SearchFilterScreen } from './components/SearchFilterScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { FloorPlanScreen } from './components/FloorPlanScreen';
import { AddServiceModal } from './components/AddServiceModal';
import { BulkAssignModal } from './components/BulkAssignModal';
import { cn } from './lib/utils';

type Screen = 'home' | 'search' | 'notifications' | 'floorplan' | 'apartment';

export default function App() {
  const { 
    state, 
    updateService, 
    markNotificationRead, 
    markAllNotificationsRead,
    clearAllNotifications,
    removeNotification,
    addTestNotification,
    updateNotificationSettings, 
    exportCSV, 
    addGlobalService, 
    assignContractorBulk,
    batchUpdateLocationServices 
  } = useAppStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('klacon_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('klacon_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navigateToApartment = (locationId: string) => {
    setSelectedLocation(locationId);
    setCurrentScreen('apartment');
  };

  const unreadCount = state.notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors duration-200">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center mr-1">
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 12 L12 24 L28 36 L36 36 L20 24 L36 12 Z" fill="#84b0b2" />
                <path d="M38 12 L22 24 L38 36 L46 36 L30 24 L46 12 Z" fill="#7a7c80" />
              </svg>
            </div>
            <h1 className="text-2xl tracking-tight text-neutral-800 dark:text-neutral-100 leading-none flex items-center gap-1.5 -ml-1">
              <span className="font-light lowercase">klacon</span>
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest mt-1.5">Fieldtrack</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {isOnline ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <Wifi className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
              <Save className="w-3 h-3" /> Salvo Localmente
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark / Light Theme Toggle */}
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            title={theme === 'dark' ? "Ativar modo claro" : "Ativar modo escuro"}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <button 
            onClick={() => setShowBulkAssignModal(true)}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            title="Atribuir Empreiteira em Massa"
          >
            <Users className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowAddServiceModal(true)}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            title="Criar Novo Serviço Global"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={exportCSV}
            className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            title="Exportar CSV"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {currentScreen === 'home' && <HomeScreen state={state} onSelectLocation={navigateToApartment} />}
        {currentScreen === 'apartment' && selectedLocation && (
          <ApartmentScreen 
            locationId={selectedLocation} 
            onBack={() => setCurrentScreen('home')}
            locationData={state.locations[selectedLocation] || {services: {}}}
            updateService={(svc, updates) => updateService(selectedLocation, svc, updates)}
            batchUpdateServices={(svcs, updates) => batchUpdateLocationServices(selectedLocation, svcs, updates)}
            servicesList={state.servicesList}
            contractorsList={state.contractors}
          />
        )}
        {currentScreen === 'search' && (
          <SearchFilterScreen 
            state={state} 
            onSelectLocation={navigateToApartment} 
          />
        )}
        {currentScreen === 'notifications' && (
          <NotificationsScreen 
            notifications={state.notifications}
            settings={state.notificationSettings}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
            onClearAll={clearAllNotifications}
            onRemoveNotification={removeNotification}
            onAddTestNotification={addTestNotification}
            onUpdateSettings={updateNotificationSettings}
            onSelectLocation={navigateToApartment}
          />
        )}
        {currentScreen === 'floorplan' && (
          <FloorPlanScreen 
            state={state}
            onSelectLocation={navigateToApartment}
          />
        )}
      </main>

      {showAddServiceModal && (
        <AddServiceModal 
          onClose={() => setShowAddServiceModal(false)}
          onAdd={(name, status) => {
            addGlobalService(name, status);
            setShowAddServiceModal(false);
          }}
        />
      )}

      {showBulkAssignModal && (
        <BulkAssignModal 
          state={state}
          onClose={() => setShowBulkAssignModal(false)}
          onAssign={(service, contractor) => {
            assignContractorBulk(service, contractor);
            setShowBulkAssignModal(false);
          }}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 fixed bottom-0 w-full flex justify-around items-center h-16 px-2 z-10 pb-safe transition-colors duration-200">
        <NavButton 
          active={currentScreen === 'home' || currentScreen === 'apartment'} 
          onClick={() => { setCurrentScreen('home'); setSelectedLocation(null); }}
          icon={<Home className="w-6 h-6" />} 
          label="Início" 
        />
        <NavButton 
          active={currentScreen === 'floorplan'} 
          onClick={() => setCurrentScreen('floorplan')}
          icon={<Map className="w-6 h-6" />} 
          label="Planta" 
        />
        <NavButton 
          active={currentScreen === 'search'} 
          onClick={() => setCurrentScreen('search')}
          icon={<Search className="w-6 h-6" />} 
          label="Busca" 
        />
        <NavButton 
          active={currentScreen === 'notifications'} 
          onClick={() => setCurrentScreen('notifications')}
          icon={
            <div className="relative">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          } 
          label="Avisos" 
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
        active ? "text-teal-600 dark:text-teal-400 font-semibold" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

