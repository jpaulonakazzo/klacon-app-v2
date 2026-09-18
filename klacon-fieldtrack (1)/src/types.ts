export type Status = 'pending' | 'in_progress' | 'completed';

export interface ServiceState {
  status: Status;
  contractor: string;
  notes: string;
  photo?: string | null;
  updatedAt: string;
}

export interface LocationData {
  services: Record<string, ServiceState>;
}

export interface AppState {
  locations: Record<string, LocationData>;
  notifications: AppNotification[];
  notificationSettings: NotificationSettings;
  servicesList: string[];
  contractors: string[];
}

export interface AppNotification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'status' | 'task' | 'update';
  locationId?: string;
  serviceName?: string;
}

export interface NotificationSettings {
  statusChanges: boolean;
  newTasks: boolean;
  updates: boolean;
}

export const GRANITOS_CATEGORY_NAME = 'Granitos';

export const GRANITOS_SUBSERVICES = [
  'Bancada Cozinha',
  'Bancada Varanda',
  'Bancadas Banheiros (Suíte)',
  'Bancadas Circulação',
  'Soleira Entrada',
  'Soleira Sala',
  'Soleira Suíte',
  'Peitoris',
  'Tentos',
  'Filetes',
  'Portais',
  'Aduelas'
] as const;

export type GranitoSubService = typeof GRANITOS_SUBSERVICES[number];

export interface ServiceCategory {
  id: string;
  name: string;
  subServices: string[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'granitos',
    name: 'Granitos',
    subServices: [...GRANITOS_SUBSERVICES]
  }
];

export function getServiceCategory(serviceName: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find(cat => cat.subServices.includes(serviceName));
}

export type GroupedServiceItem = 
  | { type: 'standalone'; name: string }
  | { type: 'category'; category: ServiceCategory; services: string[] };

export function groupServices(servicesList: string[]): GroupedServiceItem[] {
  const result: GroupedServiceItem[] = [];
  const processedSubServices = new Set<string>();

  servicesList.forEach(serviceName => {
    // If it's the old 'Granitos' entry, expand into category
    if (serviceName === 'Granitos' || serviceName === '🪨 Granitos') {
      const granitosCat = SERVICE_CATEGORIES.find(c => c.id === 'granitos');
      if (granitosCat && !result.some(r => r.type === 'category' && r.category.id === 'granitos')) {
        result.push({
          type: 'category',
          category: granitosCat,
          services: granitosCat.subServices
        });
        granitosCat.subServices.forEach(s => processedSubServices.add(s));
      }
      return;
    }

    const cat = getServiceCategory(serviceName);
    if (cat) {
      if (!processedSubServices.has(serviceName)) {
        let catGroup = result.find(r => r.type === 'category' && r.category.id === cat.id) as 
          | { type: 'category'; category: ServiceCategory; services: string[] } 
          | undefined;
        if (!catGroup) {
          catGroup = {
            type: 'category',
            category: cat,
            services: []
          };
          result.push(catGroup);
        }
        if (!catGroup.services.includes(serviceName)) {
          catGroup.services.push(serviceName);
        }
        processedSubServices.add(serviceName);
      }
    } else {
      result.push({
        type: 'standalone',
        name: serviceName
      });
    }
  });

  // Ensure Granitos category exists if subservices are defined
  const granitosCat = SERVICE_CATEGORIES.find(c => c.id === 'granitos');
  if (granitosCat && !result.some(r => r.type === 'category' && r.category.id === 'granitos')) {
    const ceramicIndex = result.findIndex(r => r.type === 'standalone' && r.name === 'Revestimento cerâmico');
    const catItem: GroupedServiceItem = {
      type: 'category',
      category: granitosCat,
      services: granitosCat.subServices
    };
    if (ceramicIndex !== -1) {
      result.splice(ceramicIndex + 1, 0, catItem);
    } else {
      result.push(catItem);
    }
  }

  return result;
}

export const SERVICES_LIST = [
  'Prumadas Hidrossanitárias', 'Marcação de Alvenaria', 'Alvenaria', 'Aperto', 
  'Chapisco de rolo estuque', 'Furação dos passantes', 'Ponto de emboço', 
  'Ponto de estuque', 'Contramarco', 'Infra seca elétrica', 'Instalação hidráulica', 
  'Instalação gás', 'Esgoto', 'Emboço', 'Estuque teto', 'Estuque parede', 
  'Contrapiso', 'Guarda corpo ferro', 'Impermeabilização', 'Testes de instalações', 
  'Infra ar condicionado', 'Caixa polar', 'Pressurização escada', 'Exaustão banheiro', 
  'Enfiação', 'Rebaixo da plaquinha', 'Revestimento cerâmico', 
  ...GRANITOS_SUBSERVICES, 
  'Rejunte', 
  'Janelas de alumínio', 'Fachada', 'Emassamento', '1ª demão pintura', 'Portas prontas', 
  'Louças e metais', 'Tomadas e interruptores', '2ª demão pintura', 'Limpeza'
];

export const FLOORS = [
  { id: 'terreo', name: 'Térreo', locations: ['Portaria'] },
  { id: '1', name: '1º Pavimento', locations: ['101', '102', '103', '104', '105', '106', '107', '108'] },
  { id: '2', name: '2º Pavimento', locations: ['201', '202', '203', '204', '205', '206', '207', '208'] },
  { id: '3', name: '3º Pavimento', locations: ['301', '302', '303', '304', '305', '306', '307', '308'] },
  { id: '4', name: '4º Pavimento', locations: ['401', '402', '403', '404', '405', '406', '407', '408'] },
  { id: '5', name: '5º Pavimento', locations: ['501', '502', '503', '504', '505', '506', '507', '508'] },
  { id: '6', name: '6º Pavimento', locations: ['601', '602', '603', '604', '605', '606', '607', '608'] },
  { id: '7', name: '7º Pavimento', locations: ['701', '702', '703', '704', '705', '706', '707', '708'] },
  { id: '8', name: '8º Pavimento', locations: ['801', '802', '803', '804', '805', '806', '807', '808'] },
  { id: 'puc', name: 'PUC Social', locations: ['PUC'] }
];

export const ALL_LOCATIONS = FLOORS.flatMap(f => f.locations);
