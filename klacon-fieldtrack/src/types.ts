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
}

export interface NotificationSettings {
  statusChanges: boolean;
  newTasks: boolean;
  updates: boolean;
}

export const SERVICES_LIST = [
  'Prumadas Hidrossanitárias', 'Marcação de Alvenaria', 'Alvenaria', 'Aperto', 
  'Chapisco de rolo estuque', 'Furação dos passantes', 'Ponto de emboço', 
  'Ponto de estuque', 'Contramarco', 'Infra seca elétrica', 'Instalação hidráulica', 
  'Instalação gás', 'Esgoto', 'Emboço', 'Estuque teto', 'Estuque parede', 
  'Contrapiso', 'Guarda corpo ferro', 'Impermeabilização', 'Testes de instalações', 
  'Infra ar condicionado', 'Caixa polar', 'Pressurização escada', 'Exaustão banheiro', 
  'Enfiação', 'Rebaixo da plaquinha', 'Revestimento cerâmico', 'Granitos', 'Rejunte', 
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
