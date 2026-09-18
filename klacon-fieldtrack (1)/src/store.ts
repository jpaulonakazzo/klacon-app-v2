import { useState, useEffect } from 'react';
import { 
  AppState, 
  AppNotification, 
  NotificationSettings, 
  ServiceState, 
  ALL_LOCATIONS, 
  SERVICES_LIST, 
  GRANITOS_SUBSERVICES,
  Status 
} from './types';
import { db } from './firebase';
import { doc, collection, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';

const SETTINGS_STORAGE_KEY = 'klacon_notification_settings';
const NOTIFICATIONS_STORAGE_KEY = 'klacon_notifications';

function normalizeServicesList(rawList?: string[]): string[] {
  const base = rawList && rawList.length > 0 ? [...rawList] : [...SERVICES_LIST];
  const set = new Set(base);

  // If old 'Granitos' entry is present, replace it with all subservices
  const granitosIdx = base.indexOf('Granitos');
  if (granitosIdx !== -1) {
    base.splice(granitosIdx, 1, ...GRANITOS_SUBSERVICES);
  } else {
    // Check if any subservices are missing
    const missing = GRANITOS_SUBSERVICES.filter(s => !set.has(s));
    if (missing.length > 0) {
      const ceramicIdx = base.indexOf('Revestimento cerâmico');
      if (ceramicIdx !== -1) {
        base.splice(ceramicIdx + 1, 0, ...missing);
      } else {
        base.push(...missing);
      }
    }
  }

  return Array.from(new Set(base));
}

function getInitialNotificationSettings(): NotificationSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        statusChanges: typeof parsed.statusChanges === 'boolean' ? parsed.statusChanges : true,
        newTasks: typeof parsed.newTasks === 'boolean' ? parsed.newTasks : true,
        updates: typeof parsed.updates === 'boolean' ? parsed.updates : true,
      };
    }
  } catch (e) {
    console.error("Error loading notification settings from localStorage:", e);
  }
  return {
    statusChanges: true,
    newTasks: true,
    updates: true,
  };
}

function getInitialNotifications(): AppNotification[] {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error loading notifications from localStorage:", e);
  }
  return [
    {
      id: 'welcome-init',
      message: 'Bem-vindo ao Klacon Fieldtrack. As notificações de status e tarefas de obras serão listadas aqui.',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'update'
    }
  ];
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => ({
    locations: {},
    notifications: getInitialNotifications(),
    notificationSettings: getInitialNotificationSettings(),
    servicesList: [...SERVICES_LIST],
    contractors: ['Klacon']
  }));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Subscribe to Global Configuration (Services list and Contractors)
    const configRef = doc(db, 'config', 'appState');
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const normalized = normalizeServicesList(data.servicesList);
        
        setState(prev => ({
          ...prev,
          servicesList: normalized,
          contractors: data.contractors || ['Klacon']
        }));

        // If normalized list has new subservices not yet saved in config, update it
        if (!data.servicesList || JSON.stringify(data.servicesList) !== JSON.stringify(normalized)) {
          setDoc(configRef, {
            servicesList: normalized
          }, { merge: true }).catch(err => console.error("Error updating config with normalized services:", err));
        }
      } else {
        // Initialize config document on first use
        const normalized = normalizeServicesList([...SERVICES_LIST]);
        setDoc(configRef, {
          servicesList: normalized,
          contractors: ['Klacon']
        });
      }
    });

    // 2. Subscribe to Locations
    const locationsRef = collection(db, 'locations');
    const unsubscribeLocations = onSnapshot(locationsRef, (snapshot) => {
      setState(prev => {
        const newLocations = { ...prev.locations };
        snapshot.forEach(docSnap => {
          newLocations[docSnap.id] = { services: {}, ...docSnap.data() } as any;
        });

        // Make sure all locations from our ALL_LOCATIONS exist locally
        ALL_LOCATIONS.forEach(locId => {
          if (!newLocations[locId]) {
            newLocations[locId] = { services: {} };
          }
        });

        return { ...prev, locations: newLocations };
      });
      setIsLoaded(true);
    }, (error) => {
      console.error("Error fetching locations:", error);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeLocations();
    };
  }, []);

  // Initialize empty locations directly in Firestore if they are missing
  useEffect(() => {
    if (isLoaded) {
      const initializeLocations = async () => {
        const batch = writeBatch(db);
        let hasChanges = false;
        
        ALL_LOCATIONS.forEach(locId => {
          if (Object.keys(state.locations[locId]?.services || {}).length === 0) {
            // We just ensure the document is created.
            // But we don't necessarily need to blast the DB if it's empty.
            // It will be created when a service is updated.
          }
        });
      };
      initializeLocations();
    }
  }, [isLoaded]);

  const updateService = async (locationId: string, serviceName: string, updates: Partial<ServiceState>) => {
    const loc = state.locations[locationId] || { services: {} };
    const currentSvc = loc.services[serviceName] || {
      status: 'pending',
      contractor: '',
      notes: '',
      updatedAt: new Date().toISOString()
    };

    const newSvc = { ...currentSvc, ...updates, updatedAt: new Date().toISOString() };
    
    // 1. Optimistic UI and Notifications
    setState(prev => {
      let newNotifications = prev.notifications;
      if (updates.status && updates.status !== currentSvc.status && prev.notificationSettings.statusChanges) {
        const statusMap = { 'pending': 'Pendente', 'in_progress': 'Em Andamento', 'completed': 'Concluído' };
        newNotifications = [{
          id: Math.random().toString(36).substr(2, 9),
          message: `Status de "${serviceName}" em ${locationId} mudou para ${statusMap[updates.status as keyof typeof statusMap]}.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'status',
          locationId,
          serviceName
        }, ...newNotifications];
      }

      if (updates.contractor !== undefined && updates.contractor !== currentSvc.contractor && currentSvc.contractor === '' && prev.notificationSettings.newTasks) {
        if (updates.contractor.trim() !== '') {
           newNotifications = [{
            id: Math.random().toString(36).substr(2, 9),
            message: `Nova tarefa "${serviceName}" em ${locationId} atribuída à empreiteira ${updates.contractor}.`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'task',
            locationId,
            serviceName
          }, ...newNotifications];
        }
      }

      if (newNotifications !== prev.notifications) {
        try {
          localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
        } catch (e) {
          console.error("Failed to save notifications to localStorage:", e);
        }
      }

      return {
        ...prev,
        notifications: newNotifications
      };
    });

    // 2. Persist to Firestore
    try {
      const locRef = doc(db, 'locations', locationId);
      await setDoc(locRef, {
        services: {
          [serviceName]: newSvc
        }
      }, { merge: true });
    } catch (e) {
      console.error("Error updating service:", e);
    }
  };

  const markNotificationRead = (id: string) => {
    setState(prev => {
      const updated = prev.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save notifications to localStorage:", e);
      }
      return {
        ...prev,
        notifications: updated
      };
    });
  };

  const markAllNotificationsRead = () => {
    setState(prev => {
      const updated = prev.notifications.map(n => ({ ...n, read: true }));
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save notifications to localStorage:", e);
      }
      return {
        ...prev,
        notifications: updated
      };
    });
  };

  const clearAllNotifications = () => {
    setState(prev => {
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
      } catch (e) {
        console.error("Failed to clear notifications in localStorage:", e);
      }
      return {
        ...prev,
        notifications: []
      };
    });
  };

  const removeNotification = (id: string) => {
    setState(prev => {
      const updated = prev.notifications.filter(n => n.id !== id);
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to remove notification from localStorage:", e);
      }
      return {
        ...prev,
        notifications: updated
      };
    });
  };

  const addTestNotification = (type: 'status' | 'task' | 'update' = 'status') => {
    setState(prev => {
      let message = 'Teste de notificação do sistema.';
      if (type === 'status') {
        message = 'Status de "Pintura Fachada" no 3º Pavimento mudou para Concluído.';
      } else if (type === 'task') {
        message = 'Nova tarefa "Instalação Elétrica" em 402 atribuída à Klacon.';
      }

      const newNotification: AppNotification = {
        id: Math.random().toString(36).substr(2, 9),
        message,
        timestamp: new Date().toISOString(),
        read: false,
        type,
        locationId: type === 'task' ? '402' : '301'
      };

      const updated = [newNotification, ...prev.notifications];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save test notification to localStorage:", e);
      }

      return {
        ...prev,
        notifications: updated
      };
    });
  };

  const updateNotificationSettings = (settings: Partial<NotificationSettings>) => {
    setState(prev => {
      const updated = { ...prev.notificationSettings, ...settings };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save notification settings to localStorage:", e);
      }
      return {
        ...prev,
        notificationSettings: updated
      };
    });
  };

  const addGlobalService = async (serviceName: string, initialStatus: Status) => {
    if (state.servicesList.includes(serviceName)) return;

    try {
      const newServicesList = [...state.servicesList, serviceName];
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, { servicesList: newServicesList }, { merge: true });

      const batch = writeBatch(db);
      Object.keys(state.locations).forEach(locId => {
        const locRef = doc(db, 'locations', locId);
        batch.set(locRef, {
          services: {
            [serviceName]: {
              status: initialStatus,
              contractor: '',
              notes: '',
              updatedAt: new Date().toISOString()
            }
          }
        }, { merge: true });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error adding global service", error);
    }
  };

  const assignContractorBulk = async (serviceName: string, contractorName: string) => {
    try {
      const batch = writeBatch(db);
      const isGranitosCategory = 
        serviceName === 'Granitos' || 
        serviceName === '🪨 Granitos' || 
        serviceName === 'Granitos (Todos os subitens)' ||
        serviceName === '🪨 Granitos (Todos os subitens)';
      const targetServices = isGranitosCategory ? [...GRANITOS_SUBSERVICES] : [serviceName];
      
      Object.keys(state.locations).forEach(locId => {
        const locRef = doc(db, 'locations', locId);
        const updates: Record<string, any> = {};
        
        targetServices.forEach(svc => {
          const existingSvc = state.locations[locId]?.services?.[svc] || {};
          updates[svc] = {
            ...existingSvc,
            contractor: contractorName,
            status: existingSvc.status || 'pending',
            notes: existingSvc.notes || '',
            updatedAt: new Date().toISOString()
          };
        });

        batch.set(locRef, { services: updates }, { merge: true });
      });

      if (contractorName && !state.contractors.includes(contractorName)) {
        const configRef = doc(db, 'config', 'appState');
        await setDoc(configRef, {
          contractors: [...state.contractors, contractorName].sort()
        }, { merge: true });
      }

      await batch.commit();
    } catch (error) {
      console.error("Error bulk assigning:", error);
    }
  };

  const batchUpdateLocationServices = async (locationId: string, serviceNames: string[], updates: Partial<ServiceState>) => {
    try {
      const loc = state.locations[locationId] || { services: {} };
      const batchUpdates: Record<string, any> = {};

      serviceNames.forEach(svcName => {
        const current = loc.services[svcName] || {
          status: 'pending',
          contractor: '',
          notes: '',
          updatedAt: new Date().toISOString()
        };
        batchUpdates[svcName] = {
          ...current,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      });

      // Optimistic update
      setState(prev => {
        const prevLoc = prev.locations[locationId] || { services: {} };
        return {
          ...prev,
          locations: {
            ...prev.locations,
            [locationId]: {
              ...prevLoc,
              services: {
                ...prevLoc.services,
                ...batchUpdates
              }
            }
          }
        };
      });

      // Persist to Firestore
      const locRef = doc(db, 'locations', locationId);
      await setDoc(locRef, { services: batchUpdates }, { merge: true });
    } catch (error) {
      console.error("Error batch updating location services:", error);
    }
  };

  const addContractor = async (contractorName: string) => {
    if (!contractorName.trim() || state.contractors.includes(contractorName.trim())) return;
    try {
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, {
        contractors: [...state.contractors, contractorName.trim()].sort()
      }, { merge: true });
    } catch (error) {
      console.error("Error adding contractor", error);
    }
  };

  const exportCSV = () => {
    let csv = 'Local,Servico,Status,Empreiteira,Observacoes,Atualizado Em\n';
    
    Object.entries(state.locations).forEach(([locId, locData]: [string, any]) => {
      Object.entries(locData.services || {}).forEach(([svcName, svcData]: [string, any]) => {
        const safeNotes = svcData.notes.replace(/"/g, '""');
        const statusMap = { 'pending': 'Pendente', 'in_progress': 'Em Andamento', 'completed': 'Concluido' };
        csv += `"${locId}","${svcName}","${statusMap[svcData.status as keyof typeof statusMap] || 'Pendente'}","${svcData.contractor}","${safeNotes}","${svcData.updatedAt}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `klacon_status_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
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
    batchUpdateLocationServices,
    addContractor
  };
}
