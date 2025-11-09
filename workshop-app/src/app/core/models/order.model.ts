export type OrderStatus = 'aberta' | 'em_andamento' | 'aguardando_aprovacao' | 'aguardando_pecas' | 'concluida' | 'entregue';

export interface OrderLaborItem {
  id: number;
  description: string;
  hours: number;
  rate: number;
}

export interface OrderPartItem {
  id: number;
  inventoryId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderSummary {
  laborTotal: number;
  partsTotal: number;
  discounts: number;
  additionalFees: number;
  total: number;
}

export interface Order {
  id: number;
  code: string;
  clientId: number;
  clientName?: string;
  vehicle: string;
  description: string;
  status: OrderStatus;
  createdAt: string;
  promisedDate: string | null;
  labor: OrderLaborItem[];
  parts: OrderPartItem[];
  summary: OrderSummary;
  notes?: string | null;
  approvedByClient: boolean;
}

export interface OrderSummaryPayload {
  laborTotal: number;
  partsTotal: number;
  discounts: number;
  additionalFees: number;
  total: number;
}

export interface OrderLaborInput {
  description: string;
  hours: number;
  rate: number;
}

export interface OrderPartInput {
  inventoryId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface SaveOrderPayload {
  code: string;
  clientId: number;
  vehicle: string;
  description: string;
  status: OrderStatus;
  promisedDate: string | null;
  notes?: string | null;
  approvedByClient: boolean;
  summary: OrderSummaryPayload;
  labor?: OrderLaborInput[];
  parts?: OrderPartInput[];
}

export type CreateOrderPayload = SaveOrderPayload;
export type UpdateOrderPayload = SaveOrderPayload;
