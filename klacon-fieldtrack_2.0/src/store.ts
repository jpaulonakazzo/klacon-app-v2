import { useState, useEffect } from 'react';
import { 
  AppState, 
  AppNotification, 
  NotificationSettings, 
  ServiceState, 
  ALL_LOCATIONS, 
  SERVICES_LIST, 
  GRANITOS_SUBSERVICES,
  REVESTIMENTO_CERAMICO_SUBSERVICES,
  DEFAULT_CATEGORIES,
  ServiceCategory,
  Status 
} from './types';
import { db } from './firebase';
import { doc, collection, onSnapshot, setDoc, writeBatch, deleteField } from 'firebase/firestore';

const SETTINGS_STORAGE_KEY = 'klacon_notification_settings';
const NOTIFICATIONS_STORAGE_KEY = 'klacon_notifications';

function normalizeServicesList(rawList?: string[]): string[] {
  if (rawList && rawList.length > 0) {
    let base = [...rawList];
    const granitosIdx = base.findIndex(s => s === 'Granitos' || s === '🪨 Granitos');
    if (granitosIdx !== -1) {
      base.splice(granitosIdx, 1, ...GRANITOS_SUBSERVICES);
    }
    const revestimentoIdx = base.findIndex(s => 
      s.toLowerCase() === 'revestimento cerâmico' || 
      s.toLowerCase() === 'revestimento ceramico' ||
      s.toLowerCase() === '🧱 revestimento cerâmico'
    );
    if (revestimentoIdx !== -1) {
      base.splice(revestimentoIdx, 1, ...REVESTIMENTO_CERAMICO_SUBSERVICES);
    }

    // Ensure all Revestimento subservices are included in servicesList
    REVESTIMENTO_CERAMICO_SUBSERVICES.forEach(sub => {
      if (!base.includes(sub)) {
        base.push(sub);
      }
    });

    return Array.from(new Set(base));
  }
  return [...SERVICES_LIST];
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
    contractors: ['Klacon'],
    categories: [...DEFAULT_CATEGORIES]
  }));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Subscribe to Global Configuration (Services list, Categories and Contractors)
    const configRef = doc(db, 'config', 'appState');
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const normalized = normalizeServicesList(data.servicesList);
        let categories: ServiceCategory[] = Array.isArray(data.categories) && data.categories.length > 0
          ? [...data.categories]
          : [...DEFAULT_CATEGORIES];
        
        // Ensure Revestimento Cerâmico category is present with all 10 subservices
        const hasRevestimento = categories.some(c => 
          c.id === 'revestimento_ceramico' || 
          c.name.toLowerCase() === 'revestimento cerâmico' ||
          c.name.toLowerCase() === 'revestimento ceramico'
        );

        if (!hasRevestimento) {
          categories.push({
            id: 'revestimento_ceramico',
            name: 'Revestimento Cerâmico',
            subServices: [...REVESTIMENTO_CERAMICO_SUBSERVICES]
          });
        } else {
          categories = categories.map(c => {
            if (c.id === 'revestimento_ceramico' || c.name.toLowerCase() === 'revestimento cerâmico' || c.name.toLowerCase() === 'revestimento ceramico') {
              const currentSubs = c.subServices || [];
              const merged = Array.from(new Set([...currentSubs, ...REVESTIMENTO_CERAMICO_SUBSERVICES]));
              return {
                ...c,
                id: 'revestimento_ceramico',
                name: 'Revestimento Cerâmico',
                subServices: merged
              };
            }
            return c;
          });
        }
        
        setState(prev => ({
          ...prev,
          servicesList: normalized,
          categories,
          contractors: data.contractors || ['Klacon']
        }));

        // If categories or normalized list not yet saved in config, update it
        if (!data.categories || !data.servicesList || JSON.stringify(data.categories) !== JSON.stringify(categories) || JSON.stringify(data.servicesList) !== JSON.stringify(normalized)) {
          setDoc(configRef, {
            servicesList: normalized,
            categories
          }, { merge: true }).catch(err => console.error("Error updating config with normalized services/categories:", err));
        }
      } else {
        // Initialize config document on first use
        const normalized = normalizeServicesList([...SERVICES_LIST]);
        setDoc(configRef, {
          servicesList: normalized,
          categories: [...DEFAULT_CATEGORIES],
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

  const deleteGlobalService = async (serviceName: string) => {
    // 1. Optimistic state update
    const newServicesList = state.servicesList.filter(s => s !== serviceName);

    setState(prev => {
      const updatedLocations = { ...prev.locations };
      Object.keys(updatedLocations).forEach(locId => {
        if (updatedLocations[locId]?.services?.[serviceName]) {
          const updatedServices = { ...updatedLocations[locId].services };
          delete updatedServices[serviceName];
          updatedLocations[locId] = {
            ...updatedLocations[locId],
            services: updatedServices
          };
        }
      });

      const newNotifications: AppNotification[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `Serviço "${serviceName}" foi excluído permanentemente da lista da obra.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'update'
        },
        ...prev.notifications
      ];

      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
      } catch (e) {
        console.error("Failed to save notification to localStorage:", e);
      }

      return {
        ...prev,
        servicesList: newServicesList,
        locations: updatedLocations,
        notifications: newNotifications
      };
    });

    // 2. Persist removal to Firestore
    try {
      // Update global configuration services list
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, { servicesList: newServicesList }, { merge: true });

      // Clean up service entry across all location documents
      const locationIds = Object.keys(state.locations);
      const CHUNK_SIZE = 400;

      for (let i = 0; i < locationIds.length; i += CHUNK_SIZE) {
        const chunk = locationIds.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        let hasOps = false;

        chunk.forEach(locId => {
          const loc = state.locations[locId];
          if (loc?.services?.[serviceName]) {
            const locRef = doc(db, 'locations', locId);
            batch.update(locRef, {
              [`services.${serviceName}`]: deleteField()
            });
            hasOps = true;
          }
        });

        if (hasOps) {
          await batch.commit();
        }
      }
    } catch (error) {
      console.error(`Error deleting global service "${serviceName}":`, error);
    }
  };

  const addCategory = async (name: string, initialSubServices: string[] = []) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (state.categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      return;
    }

    const id = trimmedName.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `cat-${Date.now()}`;

    const cleanedSubServices = Array.from(new Set(
      initialSubServices.map(s => s.trim()).filter(Boolean)
    ));

    const newCat: ServiceCategory = {
      id,
      name: trimmedName,
      subServices: cleanedSubServices
    };

    const newCategories = [...state.categories, newCat];
    const newSubItems = cleanedSubServices.filter(s => !state.servicesList.includes(s));
    const newServicesList = [...state.servicesList, ...newSubItems];

    // Optimistic UI
    setState(prev => {
      const newNotifications: AppNotification[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `Nova categoria "${trimmedName}" criada com sucesso.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'update'
        },
        ...prev.notifications
      ];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
      } catch (e) {
        console.error("Failed to save notifications:", e);
      }
      return {
        ...prev,
        categories: newCategories,
        servicesList: newServicesList,
        notifications: newNotifications
      };
    });

    try {
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, {
        categories: newCategories,
        servicesList: newServicesList
      }, { merge: true });

      if (newSubItems.length > 0) {
        const batch = writeBatch(db);
        Object.keys(state.locations).forEach(locId => {
          const locRef = doc(db, 'locations', locId);
          const initialMap: Record<string, any> = {};
          newSubItems.forEach(subName => {
            initialMap[subName] = {
              status: 'pending',
              contractor: '',
              notes: '',
              updatedAt: new Date().toISOString()
            };
          });
          batch.set(locRef, { services: initialMap }, { merge: true });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const addSubServiceToCategory = async (categoryId: string, subServiceName: string) => {
    const trimmed = subServiceName.trim();
    if (!trimmed) return;

    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) return;
    if (cat.subServices.includes(trimmed)) return;

    const updatedCategories = state.categories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subServices: [...c.subServices, trimmed]
        };
      }
      return c;
    });

    const isNewGlobal = !state.servicesList.includes(trimmed);
    const newServicesList = isNewGlobal ? [...state.servicesList, trimmed] : state.servicesList;

    // Optimistic UI
    setState(prev => {
      const newNotifications: AppNotification[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `Subitem "${trimmed}" adicionado à categoria "${cat.name}".`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'update'
        },
        ...prev.notifications
      ];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
      } catch (e) {
        console.error("Failed to save notifications:", e);
      }
      return {
        ...prev,
        categories: updatedCategories,
        servicesList: newServicesList,
        notifications: newNotifications
      };
    });

    try {
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, {
        categories: updatedCategories,
        servicesList: newServicesList
      }, { merge: true });

      if (isNewGlobal) {
        const batch = writeBatch(db);
        Object.keys(state.locations).forEach(locId => {
          const locRef = doc(db, 'locations', locId);
          batch.set(locRef, {
            services: {
              [trimmed]: {
                status: 'pending',
                contractor: '',
                notes: '',
                updatedAt: new Date().toISOString()
              }
            }
          }, { merge: true });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Error adding subservice to category:", error);
    }
  };

  const deleteSubServiceFromCategory = async (categoryId: string, subServiceName: string) => {
    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) return;

    const updatedCategories = state.categories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subServices: c.subServices.filter(s => s !== subServiceName)
        };
      }
      return c;
    });

    const otherUses = updatedCategories.some(c => c.subServices.includes(subServiceName));
    const newServicesList = otherUses ? state.servicesList : state.servicesList.filter(s => s !== subServiceName);

    // Optimistic UI
    setState(prev => {
      const updatedLocations = { ...prev.locations };
      if (!otherUses) {
        Object.keys(updatedLocations).forEach(locId => {
          if (updatedLocations[locId]?.services?.[subServiceName]) {
            const updatedServices = { ...updatedLocations[locId].services };
            delete updatedServices[subServiceName];
            updatedLocations[locId] = {
              ...updatedLocations[locId],
              services: updatedServices
            };
          }
        });
      }

      const newNotifications: AppNotification[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `Subitem "${subServiceName}" excluído da categoria "${cat.name}".`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'update'
        },
        ...prev.notifications
      ];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
      } catch (e) {
        console.error("Failed to save notifications:", e);
      }

      return {
        ...prev,
        categories: updatedCategories,
        servicesList: newServicesList,
        locations: updatedLocations,
        notifications: newNotifications
      };
    });

    try {
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, {
        categories: updatedCategories,
        servicesList: newServicesList
      }, { merge: true });

      if (!otherUses) {
        const locationIds = Object.keys(state.locations);
        const CHUNK_SIZE = 400;

        for (let i = 0; i < locationIds.length; i += CHUNK_SIZE) {
          const chunk = locationIds.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          let hasOps = false;

          chunk.forEach(locId => {
            const loc = state.locations[locId];
            if (loc?.services?.[subServiceName]) {
              const locRef = doc(db, 'locations', locId);
              batch.update(locRef, {
                [`services.${subServiceName}`]: deleteField()
              });
              hasOps = true;
            }
          });

          if (hasOps) {
            await batch.commit();
          }
        }
      }
    } catch (error) {
      console.error("Error deleting subservice from category:", error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) return;

    const subServicesToDelete = [...cat.subServices];
    const updatedCategories = state.categories.filter(c => c.id !== categoryId);
    
    // Check which subservices are not used by any other remaining category
    const remainingSubServices = new Set<string>();
    updatedCategories.forEach(c => c.subServices.forEach(s => remainingSubServices.add(s)));
    
    const uniqueSubsToDelete = subServicesToDelete.filter(s => !remainingSubServices.has(s));
    const newServicesList = state.servicesList.filter(s => !uniqueSubsToDelete.includes(s) && s !== cat.name);

    // Optimistic UI
    setState(prev => {
      const updatedLocations = { ...prev.locations };
      Object.keys(updatedLocations).forEach(locId => {
        let changed = false;
        const updatedServices = { ...updatedLocations[locId]?.services };
        uniqueSubsToDelete.forEach(sub => {
          if (updatedServices[sub]) {
            delete updatedServices[sub];
            changed = true;
          }
        });
        if (changed) {
          updatedLocations[locId] = {
            ...updatedLocations[locId],
            services: updatedServices
          };
        }
      });

      const newNotifications: AppNotification[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `Categoria "${cat.name}" e seus ${uniqueSubsToDelete.length} subitens foram excluídos.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'update'
        },
        ...prev.notifications
      ];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
      } catch (e) {
        console.error("Failed to save notifications:", e);
      }

      return {
        ...prev,
        categories: updatedCategories,
        servicesList: newServicesList,
        locations: updatedLocations,
        notifications: newNotifications
      };
    });

    try {
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, {
        categories: updatedCategories,
        servicesList: newServicesList
      }, { merge: true });

      // Clean up Firestore location entries
      if (uniqueSubsToDelete.length > 0) {
        const locationIds = Object.keys(state.locations);
        const CHUNK_SIZE = 400;

        for (let i = 0; i < locationIds.length; i += CHUNK_SIZE) {
          const chunk = locationIds.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          let hasOps = false;

          chunk.forEach(locId => {
            const loc = state.locations[locId];
            const updates: Record<string, any> = {};
            uniqueSubsToDelete.forEach(sub => {
              if (loc?.services?.[sub]) {
                updates[`services.${sub}`] = deleteField();
              }
            });

            if (Object.keys(updates).length > 0) {
              const locRef = doc(db, 'locations', locId);
              batch.update(locRef, updates);
              hasOps = true;
            }
          });

          if (hasOps) {
            await batch.commit();
          }
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const editSubServiceInCategory = async (categoryId: string, oldSubServiceName: string, newSubServiceName: string) => {
    const trimmedNew = newSubServiceName.trim();
    if (!trimmedNew || trimmedNew === oldSubServiceName) return;

    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) return;

    const updatedCategories = state.categories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subServices: c.subServices.map(s => s === oldSubServiceName ? trimmedNew : s)
        };
      }
      return c;
    });

    const newServicesList = state.servicesList.map(s => s === oldSubServiceName ? trimmedNew : s);
    if (!newServicesList.includes(trimmedNew)) {
      newServicesList.push(trimmedNew);
    }

    const now = new Date().toISOString();

    // Optimistic UI
    setState(prev => {
      const updatedLocations = { ...prev.locations };
      Object.keys(updatedLocations).forEach(locId => {
        const loc = updatedLocations[locId];
        if (loc?.services?.[oldSubServiceName]) {
          const oldData = loc.services[oldSubServiceName];
          const updatedServices = { ...loc.services };
          delete updatedServices[oldSubServiceName];
          updatedServices[trimmedNew] = {
            ...oldData,
            updatedAt: now
          };
          updatedLocations[locId] = {
            ...loc,
            services: updatedServices
          };
        }
      });

      const newNotifications: AppNotification[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `Subitem "${oldSubServiceName}" renomeado para "${trimmedNew}".`,
          timestamp: now,
          read: false,
          type: 'update'
        },
        ...prev.notifications
      ];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
      } catch (e) {
        console.error("Failed to save notifications:", e);
      }

      return {
        ...prev,
        categories: updatedCategories,
        servicesList: newServicesList,
        locations: updatedLocations,
        notifications: newNotifications
      };
    });

    try {
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, {
        categories: updatedCategories,
        servicesList: newServicesList
      }, { merge: true });

      const locationIds = Object.keys(state.locations);
      const CHUNK_SIZE = 400;

      for (let i = 0; i < locationIds.length; i += CHUNK_SIZE) {
        const chunk = locationIds.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        let hasOps = false;

        chunk.forEach(locId => {
          const loc = state.locations[locId];
          const oldData = loc?.services?.[oldSubServiceName];
          const locRef = doc(db, 'locations', locId);
          if (oldData) {
            batch.set(locRef, {
              services: {
                [trimmedNew]: {
                  ...oldData,
                  updatedAt: now
                },
                [oldSubServiceName]: deleteField()
              }
            }, { merge: true });
            hasOps = true;
          }
        });

        if (hasOps) {
          await batch.commit();
        }
      }
    } catch (error) {
      console.error("Error editing subservice name:", error);
    }
  };

  const convertServiceToCategory = async (serviceName: string, initialSubServices: string[]) => {
    const trimmedName = serviceName.trim();
    if (!trimmedName) return;

    const cleanedSubServices = Array.from(new Set(
      initialSubServices.map(s => s.trim()).filter(Boolean)
    ));
    if (cleanedSubServices.length === 0) return;

    // Check if category with this name already exists
    const existingCat = state.categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    const id = existingCat 
      ? existingCat.id 
      : (trimmedName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || ('cat_' + Date.now()));

    let updatedCategories: ServiceCategory[];
    if (existingCat) {
      updatedCategories = state.categories.map(c => {
        if (c.id === existingCat.id) {
          return {
            ...c,
            subServices: Array.from(new Set([...c.subServices, ...cleanedSubServices]))
          };
        }
        return c;
      });
    } else {
      updatedCategories = [
        ...state.categories,
        {
          id,
          name: trimmedName,
          subServices: cleanedSubServices
        }
      ];
    }

    // Replace the standalone serviceName in servicesList with the new subservices
    let newServicesList = state.servicesList.filter(s => s !== trimmedName);
    cleanedSubServices.forEach(sub => {
      if (!newServicesList.includes(sub)) {
        newServicesList.push(sub);
      }
    });

    const now = new Date().toISOString();

    // Optimistic UI
    setState(prev => {
      const updatedLocations = { ...prev.locations };
      Object.keys(updatedLocations).forEach(locId => {
        const loc = updatedLocations[locId];
        const prevServiceData = loc?.services?.[trimmedName];
        const updatedServices = { ...loc.services };

        cleanedSubServices.forEach(sub => {
          if (!updatedServices[sub]) {
            updatedServices[sub] = {
              status: prevServiceData?.status || 'pending',
              contractor: prevServiceData?.contractor || '',
              notes: '',
              updatedAt: now
            };
          }
        });

        // Remove the simple service from locations since it's now an accordion category
        delete updatedServices[trimmedName];

        updatedLocations[locId] = {
          ...loc,
          services: updatedServices
        };
      });

      const newNotifications: AppNotification[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `Serviço "${trimmedName}" convertido em categoria expansível com ${cleanedSubServices.length} subitens.`,
          timestamp: now,
          read: false,
          type: 'update'
        },
        ...prev.notifications
      ];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
      } catch (e) {
        console.error("Failed to save notifications:", e);
      }

      return {
        ...prev,
        categories: updatedCategories,
        servicesList: newServicesList,
        locations: updatedLocations,
        notifications: newNotifications
      };
    });

    try {
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, {
        categories: updatedCategories,
        servicesList: newServicesList
      }, { merge: true });

      const locationIds = Object.keys(state.locations);
      const CHUNK_SIZE = 400;

      for (let i = 0; i < locationIds.length; i += CHUNK_SIZE) {
        const chunk = locationIds.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(locId => {
          const locRef = doc(db, 'locations', locId);
          const loc = state.locations[locId];
          const prevServiceData = loc?.services?.[trimmedName];

          const updates: Record<string, any> = {
            [trimmedName]: deleteField()
          };

          cleanedSubServices.forEach(sub => {
            updates[sub] = {
              status: prevServiceData?.status || 'pending',
              contractor: prevServiceData?.contractor || '',
              notes: '',
              updatedAt: now
            };
          });

          batch.set(locRef, { services: updates }, { merge: true });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error("Error converting service to category:", error);
    }
  };

  const editCategoryName = async (categoryId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat || cat.name === trimmed) return;

    const updatedCategories = state.categories.map(c => {
      if (c.id === categoryId) {
        return { ...c, name: trimmed };
      }
      return c;
    });

    setState(prev => ({
      ...prev,
      categories: updatedCategories
    }));

    try {
      const configRef = doc(db, 'config', 'appState');
      await setDoc(configRef, { categories: updatedCategories }, { merge: true });
    } catch (error) {
      console.error("Error editing category name:", error);
    }
  };

  const assignContractorBulk = async (serviceName: string, contractorName: string) => {
    try {
      const batch = writeBatch(db);
      const matchedCategory = state.categories.find(c => 
        serviceName === c.name || 
        serviceName === `${c.name} (Todos os subitens)` ||
        (c.id === 'granitos' && (
          serviceName === 'Granitos' || 
          serviceName === '🪨 Granitos' || 
          serviceName === 'Granitos (Todos os subitens)' ||
          serviceName === '🪨 Granitos (Todos os subitens)'
        ))
      );
      const targetServices = matchedCategory && matchedCategory.subServices.length > 0 
        ? [...matchedCategory.subServices] 
        : [serviceName];
      
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

  const batchUpdateMultiUnitsAndServices = async (
    locationIds: string[], 
    serviceNames: string[], 
    status: Status, 
    contractor?: string
  ) => {
    if (locationIds.length === 0 || serviceNames.length === 0) return;

    const now = new Date().toISOString();

    // 1. Optimistic UI update
    setState(prev => {
      const nextLocations = { ...prev.locations };

      locationIds.forEach(locId => {
        const currentLoc = nextLocations[locId] || { services: {} };
        const updatedServices = { ...currentLoc.services };

        serviceNames.forEach(svc => {
          const prevSvc = updatedServices[svc] || {
            status: 'pending',
            contractor: '',
            notes: '',
            updatedAt: now
          };

          updatedServices[svc] = {
            ...prevSvc,
            status,
            contractor: (contractor !== undefined && contractor !== 'keep' && contractor !== 'KEEP') ? contractor : prevSvc.contractor,
            updatedAt: now
          };
        });

        nextLocations[locId] = {
          ...currentLoc,
          services: updatedServices
        };
      });

      const statusLabel = status === 'completed' ? 'Concluído' : status === 'in_progress' ? 'Em Andamento' : 'Pendente';
      const newNotification: AppNotification = {
        id: Math.random().toString(36).substr(2, 9),
        message: `Preenchimento Múltiplo: ${serviceNames.length} serviços marcados como "${statusLabel}" em ${locationIds.length} apartamentos.`,
        timestamp: now,
        read: false,
        type: 'update'
      };

      const newNotifications = [newNotification, ...prev.notifications];
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications.slice(0, 100)));
      } catch (e) {
        console.error("Failed to save notifications:", e);
      }

      return {
        ...prev,
        locations: nextLocations,
        notifications: newNotifications
      };
    });

    // 2. Persist to Firestore using chunked batch writes
    try {
      // If a new contractor was provided, persist to global contractors list
      if (contractor && contractor !== 'keep' && contractor !== 'KEEP' && !state.contractors.includes(contractor)) {
        const configRef = doc(db, 'config', 'appState');
        await setDoc(configRef, {
          contractors: [...state.contractors, contractor].sort()
        }, { merge: true });
      }

      const CHUNK_SIZE = 400;
      for (let i = 0; i < locationIds.length; i += CHUNK_SIZE) {
        const chunk = locationIds.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(locId => {
          const locRef = doc(db, 'locations', locId);
          const servicesUpdate: Record<string, any> = {};

          serviceNames.forEach(svc => {
            const currentSvc = state.locations[locId]?.services?.[svc] || {};
            servicesUpdate[svc] = {
              ...currentSvc,
              status,
              contractor: (contractor !== undefined && contractor !== 'keep' && contractor !== 'KEEP') ? contractor : (currentSvc.contractor || ''),
              notes: currentSvc.notes || '',
              updatedAt: now
            };
          });

          batch.set(locRef, { services: servicesUpdate }, { merge: true });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error("Error in batchUpdateMultiUnitsAndServices:", error);
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
  };
}
