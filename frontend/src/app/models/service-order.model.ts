import { Client } from './client.model';

export type ServiceOrderStatus =
  | 'aguardando_aprovacao'
  | 'em_andamento'
  | 'finalizada'
  | 'entregue';

export interface ServiceEntry {
  description: string;
  hours: number;
  rate: number;
  total: number;
}

export interface PartEntry {
  inventoryItemId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ServiceOrderSummary {
  labor: number;
  parts: number;
  discount: number;
  total: number;
}

export interface ServiceOrder {
  id: number;
  code: string;
  clientId: number;
  client?: Client;
  vehicle: {
    make: string;
    model: string;
    year: number;
    plate: string;
  };
  reportedIssue: string;
  notes: string;
  status: ServiceOrderStatus;
  statusLabel: string;
  discount?: number;
  services: ServiceEntry[];
  parts: PartEntry[];
  summary: ServiceOrderSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrderPayload {
  clientId: number;
  vehicle: ServiceOrder['vehicle'];
  reportedIssue: string;
  notes?: string;
  status: ServiceOrderStatus;
  discount?: number;
  services: Array<Omit<ServiceEntry, 'total'>>;
  parts: Array<Omit<PartEntry, 'total'>>;
}
