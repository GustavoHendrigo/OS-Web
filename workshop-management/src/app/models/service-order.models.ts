export type ServiceOrderStatus =
  | 'aguardando_aprovacao'
  | 'aprovada'
  | 'em_andamento'
  | 'aguardando_pecas'
  | 'pronta'
  | 'entregue'
  | 'cancelada';

export interface ServiceOrderSummary {
  id: number;
  code: string;
  clientName: string;
  vehicle: string;
  status: ServiceOrderStatus;
  createdAt: string;
  updatedAt: string;
  totalCost: number;
}

export interface LaborItem {
  id?: number;
  description: string;
  hours: number;
  rate: number;
}

export interface PartItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  inventoryId?: number | null;
}

export interface ServiceOrderDetails extends ServiceOrderSummary {
  clientId: number;
  description: string;
  mechanicNotes: string;
  scheduledDate?: string | null;
  approved: boolean;
  laborCost: number;
  partsCost: number;
  labor: LaborItem[];
  parts: PartItem[];
}

export interface CreateServiceOrderRequest {
  clientId: number;
  vehicle: string;
  description: string;
  status?: ServiceOrderStatus;
  mechanicNotes?: string;
  scheduledDate?: string | null;
  labor?: LaborItem[];
  parts?: PartItem[];
}

export interface UpdateServiceOrderRequest extends Partial<CreateServiceOrderRequest> {
  id: number;
  approved?: boolean;
}

export interface DashboardSummary {
  statusCards: Array<{
    status: ServiceOrderStatus;
    label: string;
    count: number;
    total: number;
  }>;
  recentOrders: ServiceOrderSummary[];
  pendingApprovals: ServiceOrderSummary[];
}
