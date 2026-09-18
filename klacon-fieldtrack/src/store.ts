import { useState, useEffect } from 'react';
import { AppState, AppNotification, NotificationSettings, ServiceState, ALL_LOCATIONS, SERVICES_LIST, Status } from './types';
import { db } from './firebase';
import { doc, collection, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';

const defaultState: AppState = {
  locations: {},
  notifications: [],
  notificationSettings: {
    statusChanges: true,
    newTasks: true,
    updates: true,
  },
  servicesList: [...SERVICES_LIST],
  contractors: ['Klacon']
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Subscribe to Global Configuration (Services list and Contractors)
    const configRef = doc(db, 'config', 'appState');
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setState(prev => ({
          ...prev,
          servicesList: data.servicesList || [...SERVICES_LIST],
          contractors: data.contractors || ['Klacon']
        }));
      } else {
        // Initialize config document on first use
        setDoc(configRef, {
          servicesList: [...SERVICES_LIST],
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
          type: 'status'
        }, ...newNotifications];
      }

      if (updates.contractor !== undefined && updates.contractor !== currentSvc.contractor && currentSvc.contractor === '' && prev.notificationSettings.newTasks) {
        if (updates.contractor.trim() !== '') {
           newNotifications = [{
            id: Math.random().toString(36).substr(2, 9),
            message: `Nova tarefa "${serviceName}" em ${locationId} atribuída à empreiteira ${updates.contractor}.`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'task'
          }, ...newNotifications];
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
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  };

  const updateNotificationSettings = (settings: Partial<NotificationSettings>) => {
    setState(prev => ({
      ...prev,
      notificationSettings: { ...prev.notificationSettings, ...settings }
    }));
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
      
      Object.keys(state.locations).forEach(locId => {
        const existingSvc = state.locations[locId].services[serviceName] || {};
        const locRef = doc(db, 'locations', locId);
        batch.set(locRef, {
          services: {
            [serviceName]: {
              ...existingSvc,
              contractor: contractorName,
              status: existingSvc.status || 'pending',
              notes: existingSvc.notes || '',
              updatedAt: new Date().toISOString()
            }
          }
        }, { merge: true });
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
    updateNotificationSettings,
    exportCSV,
    addGlobalService,
    assignContractorBulk,
    addContractor
  };
}
