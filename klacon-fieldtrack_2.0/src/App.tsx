import React from "react";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Home, Search, Bell, Map, Download, Wifi, WifiOff, Save, Plus, Users, Sun, Moon, Settings, BarChart3, ClipboardList, MoreVertical } from 'lucide-react';
import { useAppStore } from './store';
import { HomeScreen } from './components/HomeScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { ApartmentScreen } from './components/ApartmentScreen';
import { SearchFilterScreen } from './components/SearchFilterScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { FloorPlanScreen } from './components/FloorPlanScreen';
import { AddServiceModal } from './components/AddServiceModal';
import { BulkAssignModal } from './components/BulkAssignModal';
import { SettingsServicesModal } from './components/SettingsServicesModal';
import { MultiFillModal } from './components/MultiFillModal';
import { cn } from './lib/utils';
import { FLOORS } from './types';

type Screen = 'home' | 'dashboard' | 'search' | 'notifications' | 'floorplan' | 'apartment';

export default function App() {
  const { 
    state, 
    isLoaded,
    updateService, 
    markNotificationRead, 
    markAllNotificationsRead,
    clearAllNotifications,
    removeNotification,
    addTestNotification,
    updateNotificationSettings, 
    exportCSV, 
    addGlobalService, 
    deleteGlobalService,
    addCategory,
    addSubServiceToCategory,
    deleteSubServiceFromCategory,
    deleteCategory,
    editSubServiceInCategory,
    convertServiceToCategory,
    editCategoryName,
    assignContractorBulk,
    batchUpdateLocationServices,
    batchUpdateMultiUnitsAndServices,
    addContractor 
  } = useAppStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>(() => {
    try {
      return localStorage.getItem('klacon_selected_floor') || FLOORS[1].id;
    } catch {
      return FLOORS[1].id;
    }
  });

  const handleSelectFloor = (floorId: string) => {
    setSelectedFloor(floorId);
    try {
      localStorage.setItem('klacon_selected_floor', floorId);
    } catch {}
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMultiFillModal, setShowMultiFillModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('klacon_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

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
    const foundFloor = FLOORS.find(f => f.locations.includes(locationId));
    if (foundFloor) {
      handleSelectFloor(foundFloor.id);
    }
    setSelectedLocation(locationId);
  };

  const handleBackFromApartment = () => {
    setSelectedLocation(null);
  };

  const unreadCount = state.notifications.filter(n => !n.read).length;

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center mr-1 shrink-0">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M28 12 L12 24 L28 36 L36 36 L20 24 L36 12 Z" fill="#84b0b2" />
              <path d="M38 12 L22 24 L38 36 L46 36 L30 24 L46 12 Z" fill="#7a7c80" />
            </svg>
          </div>
          <h1 className="text-2xl tracking-tight text-neutral-800 dark:text-neutral-100 leading-none flex items-center gap-1.5 -ml-1">
            <span className="font-light lowercase">klacon</span>
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest mt-1">Fieldtrack</span>
          </h1>
        </div>
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Sincronizando serviços e categorias da obra...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors duration-200">
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center mr-1 shrink-0">
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 12 L12 24 L28 36 L36 36 L20 24 L36 12 Z" fill="#84b0b2" />
                <path d="M38 12 L22 24 L38 36 L46 36 L30 24 L46 12 Z" fill="#7a7c80" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl tracking-tight text-neutral-800 dark:text-neutral-100 leading-none flex items-center gap-1.5 -ml-1">
              <span className="font-light lowercase">klacon</span>
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] sm:text-[10px] tracking-widest mt-1">Fieldtrack</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
            {isOnline ? (
              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Offline
              </span>
            )}
            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
              <Save className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Salvo Localmente
            </span>
          </div>
        </div>

        {/* Header Right Actions: Clean & Minimal */}
        <div className="flex items-center gap-2">
          {/* Main Action: Preenchimento Múltiplo (Clean Lucide SVG, no emoji, compact on mobile) */}
          <button 
            type="button"
            onClick={() => setShowMultiFillModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all shrink-0"
            title="Preenchimento Múltiplo de Serviços"
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Preenchimento Múltiplo</span>
            <span className="sm:hidden">Em Lote</span>
          </button>

          {/* Unified Dropdown Menu Button */}
          <div ref={menuRef} className="relative">
            <button 
              type="button"
              onClick={() => setIsMenuOpen(prev => !prev)}
              className={cn(
                "p-2 rounded-xl border transition-all flex items-center justify-center",
                isMenuOpen
                  ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-600"
                  : "bg-neutral-50 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              )}
              title="Menu de opções"
              aria-label="Menu de opções"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu Popup */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-1.5 z-50 animate-fade-in flex flex-col gap-0.5">
                {/* 1. Gerenciar Serviços e Categorias */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowSettingsModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="leading-tight">Gerenciar Serviços & Categorias</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Criar, editar e excluir itens</span>
                  </div>
                </button>

                {/* 2. Equipe / Atribuir Empreiteira */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowBulkAssignModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="leading-tight">Atribuir Empreiteira (Equipe)</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Atribuição de serviços em massa</span>
                  </div>
                </button>

                {/* 3. Exportar Relatório (CSV) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    exportCSV();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="leading-tight">Exportar Dados (CSV)</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Baixar planilha de vistorias</span>
                  </div>
                </button>

                {/* Separator */}
                <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                {/* 4. Alternar Tema */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-amber-500 shrink-0">
                      {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                    </div>
                    <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-normal">
                    {theme === 'dark' ? 'Escuro' : 'Claro'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {selectedLocation ? (
          <ApartmentScreen 
            locationId={selectedLocation} 
            onBack={handleBackFromApartment}
            locationData={state.locations[selectedLocation] || {services: {}}}
            updateService={(svc, updates) => updateService(selectedLocation, svc, updates)}
            batchUpdateServices={(svcs, updates) => batchUpdateLocationServices(selectedLocation, svcs, updates)}
            servicesList={state.servicesList}
            contractorsList={state.contractors}
            categories={state.categories}
            onDeleteService={deleteGlobalService}
            onDeleteCategory={deleteCategory}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        ) : (
          <>
            {currentScreen === 'home' && (
              <HomeScreen 
                state={state} 
                onSelectLocation={navigateToApartment} 
                onOpenSettings={() => setShowSettingsModal(true)} 
                onOpenMultiFill={() => setShowMultiFillModal(true)}
                selectedFloor={selectedFloor}
                onSelectFloor={handleSelectFloor}
              />
            )}
            {currentScreen === 'dashboard' && (
              <DashboardScreen 
                state={state}
                onSelectLocation={navigateToApartment}
                onOpenSettings={() => setShowSettingsModal(true)}
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
                selectedFloor={selectedFloor}
                onSelectFloor={handleSelectFloor}
              />
            )}
          </>
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

      {showSettingsModal && (
        <SettingsServicesModal 
          state={state}
          onClose={() => setShowSettingsModal(false)}
          onDeleteService={deleteGlobalService}
          onOpenAddService={() => {
            setShowSettingsModal(false);
            setShowAddServiceModal(true);
          }}
          onAddCategory={addCategory}
          onAddSubService={addSubServiceToCategory}
          onDeleteSubService={deleteSubServiceFromCategory}
          onDeleteCategory={deleteCategory}
          onEditSubService={editSubServiceInCategory}
          onConvertServiceToCategory={convertServiceToCategory}
          onEditCategoryName={editCategoryName}
        />
      )}

      {showMultiFillModal && (
        <MultiFillModal 
          state={state}
          onClose={() => setShowMultiFillModal(false)}
          onBatchUpdate={batchUpdateMultiUnitsAndServices}
          onAddContractor={addContractor}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 fixed bottom-0 w-full flex justify-around items-center h-16 px-1 sm:px-2 z-10 pb-safe transition-colors duration-200">
        <NavButton 
          active={(currentScreen === 'home' || selectedLocation !== null) && !showSettingsModal} 
          onClick={() => { setCurrentScreen('home'); setSelectedLocation(null); setShowSettingsModal(false); }}
          icon={<Home className="w-5 h-5 sm:w-6 sm:h-6" />} 
          label="Início" 
        />
        <NavButton 
          active={currentScreen === 'dashboard' && selectedLocation === null && !showSettingsModal} 
          onClick={() => { setCurrentScreen('dashboard'); setSelectedLocation(null); setShowSettingsModal(false); }}
          icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />} 
          label="Dashboard" 
        />
        <NavButton 
          active={currentScreen === 'floorplan' && selectedLocation === null && !showSettingsModal} 
          onClick={() => { setCurrentScreen('floorplan'); setSelectedLocation(null); setShowSettingsModal(false); }}
          icon={<Map className="w-5 h-5 sm:w-6 sm:h-6" />} 
          label="Planta" 
        />
        <NavButton 
          active={currentScreen === 'search' && selectedLocation === null && !showSettingsModal} 
          onClick={() => { setCurrentScreen('search'); setSelectedLocation(null); setShowSettingsModal(false); }}
          icon={<Search className="w-5 h-5 sm:w-6 sm:h-6" />} 
          label="Busca" 
        />
        <NavButton 
          active={currentScreen === 'notifications' && selectedLocation === null && !showSettingsModal} 
          onClick={() => { setCurrentScreen('notifications'); setSelectedLocation(null); setShowSettingsModal(false); }}
          icon={
            <div className="relative">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          } 
          label="Avisos" 
        />
        <NavButton 
          active={showSettingsModal} 
          onClick={() => setShowSettingsModal(true)}
          icon={<Settings className="w-5 h-5 sm:w-6 sm:h-6" />} 
          label="Ajustes" 
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

